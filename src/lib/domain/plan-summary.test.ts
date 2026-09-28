import { describe, expect, it } from 'vitest';
import type { DayMeals, MealPlan } from '@/schemas';
import { makeIngredient, makeNutrition, makePlan, makeRecipe } from '@/tests/fixtures/foodie-domain';
import { calculateMealPlanCost } from './calculations';
import { buildPriceBook } from './cost';
import { summarizeMealPlan } from './plan-summary';

// rec_001: 2 servings, 500 kcal / 25 g protein "per recipe yield" (domain convention) → 250 kcal a portion.
const eggs = makeRecipe();
// rec_002: 4 servings, 800 kcal → 200 kcal a portion; shares ing_001 with eggs.
const tacos = makeRecipe({
  id: 'rec_002',
  servings: 4,
  nutrition: makeNutrition({ calories: 800, protein: 40, carbs: 80, fat: 32, fiber: 12 }),
  ingredients: [
    { ingredientId: 'ing_001', quantity: 2, unit: 'piece', optional: false },
    { ingredientId: 'ing_003', quantity: 1, unit: 'piece', optional: false },
  ],
});
const recipes = [eggs, tacos];
const ingredients = [
  makeIngredient({ id: 'ing_001', avgPrice: 3 }),
  // Recipe lines use `ml` for ing_002: costs are unit-aware since Issue 041.
  makeIngredient({ id: 'ing_002', unit: 'ml', avgPrice: 0.1 }),
  makeIngredient({ id: 'ing_003', avgPrice: 5 }),
];

function planWith(days: DayMeals[]): MealPlan {
  const base = makePlan();
  return { ...base, days: base.days.map((day, i) => ({ ...day, meals: days[i] ?? {} })) };
}

describe('summarizeMealPlan (roadmap #025)', () => {
  it('is all zeros for an empty plan', () => {
    expect(summarizeMealPlan(makePlan(), recipes, ingredients)).toEqual({
      mealCount: 0,
      uniqueRecipes: 0,
      uniqueIngredients: 0,
      plannedDays: 0,
      totalDays: 7,
      estimatedCost: 0,
      dailyAverage: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
    });
  });

  it('counts meals (snacks individually), unique recipes and ingredients, and planned days', () => {
    const plan = planWith([
      { breakfast: { recipeId: 'rec_001', servings: 2 }, snacks: [{ recipeId: 'rec_002', servings: 1 }, { recipeId: 'rec_002', servings: 1 }] },
      {},
      { dinner: { recipeId: 'rec_002', servings: 4 }, lunch: { recipeId: 'rec_missing', servings: 2 } },
    ]);
    const summary = summarizeMealPlan(plan, recipes, ingredients);
    expect(summary.mealCount).toBe(5);
    expect(summary.uniqueRecipes).toBe(2);
    expect(summary.uniqueIngredients).toBe(3);
    expect(summary.plannedDays).toBe(2);
  });

  it('prices the plan with catalog prices by default (same total as calculateMealPlanCost)', () => {
    const plan = planWith([{ breakfast: { recipeId: 'rec_001', servings: 4 } }, { dinner: { recipeId: 'rec_002', servings: 2 } }]);
    const summary = summarizeMealPlan(plan, recipes, ingredients);
    expect(summary.estimatedCost).toBe(calculateMealPlanCost(plan, recipes, ingredients));
    // eggs ×2 → 8 × 3 + 60 × 0.1 = 30; tacos ×0.5 → 1 × 3 + 0.5 × 5 = 5.5
    expect(summary.estimatedCost).toBe(35.5);
  });

  it('uses the given price lookup — custom prices beat the catalog (roadmap #041)', () => {
    const plan = planWith([{ breakfast: { recipeId: 'rec_001', servings: 4 } }, { dinner: { recipeId: 'rec_002', servings: 2 } }]);
    const book = buildPriceBook({ ingredients, custom: { ing_003: { price: 1, currency: 'USD' } }, currency: 'USD' });
    // tacos ×0.5 → 1 × 3 + 0.5 × 1 = 3.5
    expect(summarizeMealPlan(plan, recipes, ingredients, book.priceOf).estimatedCost).toBe(33.5);
  });

  it('averages one portion per meal over the planned days only, whatever the cooked servings', () => {
    const plan = planWith([
      // 250 + 200 = 450 kcal for one diner, even though 6 portions are cooked
      { breakfast: { recipeId: 'rec_001', servings: 2 }, dinner: { recipeId: 'rec_002', servings: 4 } },
      {},
      // 250 kcal
      { lunch: { recipeId: 'rec_001', servings: 8 } },
    ]);
    const { dailyAverage } = summarizeMealPlan(plan, recipes, ingredients);
    expect(dailyAverage.calories).toBe(350);
    // protein: each day is rounded first (22.5 → 23, 12.5 → 13), then averaged: (23 + 13) / 2 = 18
    expect(dailyAverage.protein).toBe(18);
  });
});
