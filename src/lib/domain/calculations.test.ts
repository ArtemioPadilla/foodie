import { describe, expect, it } from 'vitest';
import type { DayMeals, RecipeIngredient } from '@/schemas';
import {
  makeIngredient,
  makeNutrition,
  makePlan,
  makeRecipe,
} from '@/tests/fixtures/foodie-domain';
import {
  calculateDailyNutrition,
  calculateMealPlanCost,
  calculateRecipeCost,
  scaleRecipe,
  scaleRecipeIngredient,
} from './calculations';

const mockIngredient: RecipeIngredient = {
  ingredientId: 'ing-1',
  quantity: 2,
  unit: 'cup',
  notes: { en: 'n', es: 'n', fr: 'n' },
  optional: false,
};

const mockPriceIngredient = makeIngredient({
  id: 'ing-1',
  category: 'vegetables',
  avgPrice: 3,
  unit: 'cup',
});

const mockRecipe = makeRecipe({
  id: 'recipe-1',
  servings: 4,
  prepTime: 15,
  cookTime: 30,
  totalTime: 45,
  ingredients: [mockIngredient],
  nutrition: makeNutrition({
    calories: 200,
    protein: 10,
    carbs: 30,
    fat: 5,
    fiber: 3,
    sugar: 2,
    sodium: 100,
  }),
});

/** A one-day plan with the given meals (legacy tests used `null` for empty slots; the schema omits them). */
function planWithDay(meals: DayMeals) {
  return makePlan({ days: [{ dayNumber: 1, dayName: 'monday', meals }] });
}

describe('scaleRecipeIngredient', () => {
  it('doubles ingredient quantity when doubling servings', () => {
    expect(scaleRecipeIngredient(mockIngredient, 8, 4).quantity).toBe(4);
  });

  it('halves ingredient quantity when halving servings', () => {
    expect(scaleRecipeIngredient(mockIngredient, 2, 4).quantity).toBe(1);
  });

  it('maintains same quantity when servings unchanged', () => {
    expect(scaleRecipeIngredient(mockIngredient, 4, 4).quantity).toBe(2);
  });

  it('rounds to useful fractions', () => {
    expect(scaleRecipeIngredient(mockIngredient, 3, 4).quantity).toBe(1.5);
  });

  it('preserves other ingredient properties', () => {
    const scaled = scaleRecipeIngredient(mockIngredient, 8, 4);
    expect(scaled.ingredientId).toBe(mockIngredient.ingredientId);
    expect(scaled.unit).toBe(mockIngredient.unit);
    expect(scaled.optional).toBe(mockIngredient.optional);
  });
});

describe('scaleRecipe', () => {
  it('scales all ingredients when doubling recipe', () => {
    const scaled = scaleRecipe(mockRecipe, 8);
    expect(scaled.servings).toBe(8);
    expect(scaled.ingredients[0]!.quantity).toBe(4);
  });

  it('scales all ingredients when halving recipe', () => {
    const scaled = scaleRecipe(mockRecipe, 2);
    expect(scaled.servings).toBe(2);
    expect(scaled.ingredients[0]!.quantity).toBe(1);
  });

  it('handles recipes with multiple ingredients', () => {
    const multi = {
      ...mockRecipe,
      ingredients: [
        mockIngredient,
        { ...mockIngredient, ingredientId: 'ing-2', quantity: 3 },
        { ...mockIngredient, ingredientId: 'ing-3', quantity: 1 },
      ],
    };
    const scaled = scaleRecipe(multi, 8);
    expect(scaled.ingredients).toHaveLength(3);
    expect(scaled.ingredients.map((i) => i.quantity)).toEqual([4, 6, 2]);
  });

  it('preserves other recipe properties', () => {
    const scaled = scaleRecipe(mockRecipe, 8);
    expect(scaled.id).toBe(mockRecipe.id);
    expect(scaled.name).toEqual(mockRecipe.name);
    expect(scaled.prepTime).toBe(mockRecipe.prepTime);
    expect(scaled.cookTime).toBe(mockRecipe.cookTime);
  });
});

describe('calculateRecipeCost', () => {
  it('calculates cost for single ingredient', () => {
    expect(calculateRecipeCost(mockRecipe, [mockPriceIngredient])).toBe(6); // 2 cups × $3
  });

  it('returns 0 when no matching ingredients found', () => {
    expect(calculateRecipeCost(mockRecipe, [])).toBe(0);
  });

  it('calculates cost for multiple ingredients', () => {
    const multi = {
      ...mockRecipe,
      ingredients: [mockIngredient, { ...mockIngredient, ingredientId: 'ing-2', quantity: 1 }],
    };
    const ingredients = [mockPriceIngredient, makeIngredient({ id: 'ing-2', avgPrice: 2.5 })];
    expect(calculateRecipeCost(multi, ingredients)).toBe(8.5);
  });

  it('ignores ingredients not in database', () => {
    const multi = {
      ...mockRecipe,
      ingredients: [mockIngredient, { ...mockIngredient, ingredientId: 'unknown', quantity: 100 }],
    };
    expect(calculateRecipeCost(multi, [mockPriceIngredient])).toBe(6);
  });
});

describe('calculateMealPlanCost', () => {
  const single = planWithDay({ breakfast: { recipeId: 'recipe-1', servings: 4 } });

  it('calculates cost for single meal', () => {
    expect(calculateMealPlanCost(single, [mockRecipe], [mockPriceIngredient])).toBe(6);
  });

  it('scales recipe cost based on servings', () => {
    const plan = planWithDay({ breakfast: { recipeId: 'recipe-1', servings: 8 } });
    expect(calculateMealPlanCost(plan, [mockRecipe], [mockPriceIngredient])).toBe(12);
  });

  it('sums costs for multiple meals', () => {
    const slot = { recipeId: 'recipe-1', servings: 4 };
    const plan = planWithDay({ breakfast: slot, lunch: slot, dinner: slot });
    expect(calculateMealPlanCost(plan, [mockRecipe], [mockPriceIngredient])).toBe(18);
  });

  it('handles snacks array', () => {
    const plan = planWithDay({
      snacks: [
        { recipeId: 'recipe-1', servings: 2 },
        { recipeId: 'recipe-1', servings: 2 },
      ],
    });
    expect(calculateMealPlanCost(plan, [mockRecipe], [mockPriceIngredient])).toBe(6);
  });

  it('rounds to 2 decimal places', () => {
    const ingredient = makeIngredient({ id: 'ing-1', avgPrice: 1.33333 });
    expect(calculateMealPlanCost(single, [mockRecipe], [ingredient])).toBe(
      Math.round(2 * 1.33333 * 100) / 100,
    );
  });

  it('returns 0 for empty meal plan', () => {
    expect(calculateMealPlanCost(makePlan({ days: [] }), [mockRecipe], [mockPriceIngredient])).toBe(
      0,
    );
  });
});

describe('calculateDailyNutrition', () => {
  it('calculates nutrition for single meal', () => {
    const n = calculateDailyNutrition([mockRecipe], {
      breakfast: { recipeId: 'recipe-1', servings: 4 },
    });
    expect(n).toEqual({ calories: 200, protein: 10, carbs: 30, fat: 5, fiber: 3 });
  });

  it('scales nutrition based on servings', () => {
    const n = calculateDailyNutrition([mockRecipe], {
      breakfast: { recipeId: 'recipe-1', servings: 8 },
    });
    expect(n.calories).toBe(400);
    expect(n.protein).toBe(20);
    expect(n.carbs).toBe(60);
  });

  it('sums nutrition for multiple meals', () => {
    const slot = { recipeId: 'recipe-1', servings: 4 };
    const n = calculateDailyNutrition([mockRecipe], { breakfast: slot, lunch: slot, dinner: slot });
    expect(n.calories).toBe(600);
    expect(n.protein).toBe(30);
    expect(n.carbs).toBe(90);
  });

  it('handles snacks array', () => {
    const n = calculateDailyNutrition([mockRecipe], {
      snacks: [
        { recipeId: 'recipe-1', servings: 2 },
        { recipeId: 'recipe-1', servings: 2 },
      ],
    });
    expect(n.calories).toBe(200);
  });

  it('rounds all values to integers', () => {
    const n = calculateDailyNutrition([mockRecipe], {
      breakfast: { recipeId: 'recipe-1', servings: 3 },
    });
    expect(n.calories).toBe(150);
    expect(Number.isInteger(n.calories)).toBe(true);
  });

  it('ignores empty meals', () => {
    const n = calculateDailyNutrition([mockRecipe], { snacks: [] });
    expect(n.calories).toBe(0);
    expect(n.protein).toBe(0);
  });

  it('ignores recipes not found', () => {
    const n = calculateDailyNutrition([mockRecipe], {
      breakfast: { recipeId: 'unknown', servings: 4 },
    });
    expect(n.calories).toBe(0);
  });
});
