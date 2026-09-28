// @vitest-environment jsdom
import * as React from 'react';
import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_GOALS, type MealPlan } from '@/schemas';
import { $goals } from '@/stores/goals';
import { makeIngredient, makeNutrition, makePlan, makeRecipe } from '@/tests/fixtures/foodie-domain';
import { PlanSummary } from './PlanSummary';

/**
 * jsdom tests of the planner KPI strip (roadmap Issue 025): recipes, cost
 * (`calculateMealPlanCost`), ingredients, planned days, and one `meter` per
 * macro comparing the per-person average day with `$goals`.
 */

// 2-serving recipe, 1000 kcal / 50 g protein for the yield → 500 kcal a portion.
const eggs = makeRecipe({ nutrition: makeNutrition({ calories: 1000, protein: 50, carbs: 100, fat: 40, fiber: 10 }) });
const tacos = makeRecipe({ id: 'rec_002', name: { en: 'Beef Tacos', es: 'Tacos de Res', fr: 'Tacos au Bœuf' } });
const recipes = [eggs, tacos];
const ingredients = [makeIngredient({ id: 'ing_001', avgPrice: 3 }), makeIngredient({ id: 'ing_002', avgPrice: 0.1 })];

function planWithMeals(): MealPlan {
  const plan = makePlan();
  plan.days[0]!.meals = { breakfast: { recipeId: 'rec_001', servings: 2 }, snacks: [{ recipeId: 'rec_002', servings: 2 }] };
  plan.days[3]!.meals = { dinner: { recipeId: 'rec_001', servings: 4 } };
  return plan;
}

beforeEach(() => {
  localStorage.clear();
  $goals.set(DEFAULT_GOALS);
});

describe('PlanSummary', () => {
  it('shows recipes, estimated cost, ingredients and planned days', () => {
    render(<PlanSummary lang="en" plan={planWithMeals()} recipes={recipes} ingredients={ingredients} />);
    expect(screen.getByTestId('summary-recipes')).toHaveTextContent('3');
    expect(screen.getByTestId('summary-recipes')).toHaveTextContent('2 different recipes');
    // Each 2-serving batch costs 4 × $3 + 30 × $0.10 = $15 → 2 + 2 + 4 servings = 4 batches = $60.
    expect(screen.getByTestId('summary-cost')).toHaveTextContent('$60.00');
    expect(screen.getByTestId('summary-ingredients')).toHaveTextContent('2');
    expect(screen.getByTestId('summary-days')).toHaveTextContent('2 / 7');
  });

  it('compares the per-person average day with $goals on meters', () => {
    // Day 1: 500 + 250 = 750 kcal; day 4: 500 kcal → average 625 kcal of 2000 (31 %).
    render(<PlanSummary lang="en" plan={planWithMeals()} recipes={recipes} ingredients={ingredients} />);
    const nutrition = screen.getByTestId('summary-nutrition');
    expect(nutrition).toHaveTextContent('averaged over 2 planned days');
    const calories = screen.getByTestId('summary-meter-calories');
    expect(calories).toHaveAttribute('data-percent', '31');
    expect(calories).toHaveTextContent('625 / 2,000 kcal');
    const meter = within(calories).getByRole('meter', { name: 'Calories' });
    expect(meter).toHaveAttribute('aria-valuenow', '625');
    expect(meter).toHaveAttribute('aria-valuemax', '2000');
    expect(meter).toHaveAttribute('aria-valuetext', '625 of 2,000 kcal (31%)');
    expect(within(nutrition).getAllByRole('meter')).toHaveLength(5);
  });

  it('caps the meter at the goal but reports the real percentage', () => {
    $goals.set({ ...DEFAULT_GOALS, protein: 10 });
    render(<PlanSummary lang="en" plan={planWithMeals()} recipes={recipes} ingredients={ingredients} />);
    const protein = screen.getByTestId('summary-meter-protein');
    // (25 + 12.5 → 38) and 25 → average 32 g vs 10 g.
    expect(protein).toHaveAttribute('data-percent', '320');
    expect(within(protein).getByRole('meter')).toHaveAttribute('aria-valuenow', '10');
    expect(protein).toHaveTextContent('320%');
  });

  it('invites to add meals when the plan is empty and follows the page language', () => {
    render(<PlanSummary lang="es" plan={makePlan()} recipes={recipes} ingredients={ingredients} />);
    expect(screen.getByTestId('summary-nutrition')).toHaveTextContent('Añade comidas para comparar');
    expect(screen.getByTestId('summary-days')).toHaveTextContent('0 / 7');
    expect(screen.getByTestId('summary-cost')).toHaveTextContent('0,00');
    expect(screen.getByRole('heading', { name: 'Resumen del plan' })).toBeInTheDocument();
  });
});
