/**
 * Meal-plan summary (roadmap Issue 025, port of legacy `PlanSummary`'s
 * `useMemo`). Pure: takes the catalog arrays explicitly and reuses the
 * `calculations` roll-ups instead of re-deriving them.
 *
 * - `mealCount` counts filled slots (snacks individually); `uniqueRecipes`
 *   and `uniqueIngredients` only count recipes found in the catalog.
 * - `estimatedCost` is `calculateMealPlanCost` (each slot scaled to its
 *   servings) — legacy showed the never-computed `plan.estimatedCost`.
 * - `dailyAverage` is what **one person** eats on an average planned day:
 *   one portion of every planned meal (`calculateDailyNutrition` with each
 *   slot at one serving — the same convention the food diary uses through
 *   `calculateRecipeNutrition(recipe, 1)`), averaged over the days that have
 *   at least one meal, so an unplanned day never drags the average down.
 *   That makes it comparable with the per-person `$goals`.
 */
import type { DayMeals, Ingredient, MealPlan, MealSlot, Recipe } from '@/schemas';
import { calculateDailyNutrition, calculateMealPlanCost, type DailyMacros } from './calculations';

export interface MealPlanSummary {
  mealCount: number;
  uniqueRecipes: number;
  uniqueIngredients: number;
  /** Days with at least one meal. */
  plannedDays: number;
  totalDays: number;
  estimatedCost: number;
  /** Per-person average over the planned days (all zeros when nothing is planned). */
  dailyAverage: DailyMacros;
}

const EMPTY_MACROS: DailyMacros = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
export const MACRO_KEYS = Object.keys(EMPTY_MACROS) as ReadonlyArray<keyof DailyMacros>;

function slotsOf(meals: DayMeals): MealSlot[] {
  return [meals.breakfast, meals.lunch, meals.dinner, ...(meals.snacks ?? [])].filter(
    (slot): slot is MealSlot => slot !== undefined,
  );
}

/**
 * One portion of every meal of the day (what a single diner eats):
 * `calculateDailyNutrition` scales by `servings / recipe.servings`, so a
 * portion is `servings: 1`.
 */
function onePortionEach(meals: DayMeals): DayMeals {
  const portion = (slot: MealSlot): MealSlot => ({ recipeId: slot.recipeId, servings: 1 });
  return {
    breakfast: meals.breakfast && portion(meals.breakfast),
    lunch: meals.lunch && portion(meals.lunch),
    dinner: meals.dinner && portion(meals.dinner),
    snacks: meals.snacks?.map(portion),
  };
}

export function summarizeMealPlan(
  plan: MealPlan,
  recipes: ReadonlyArray<Recipe>,
  ingredients: ReadonlyArray<Ingredient>,
): MealPlanSummary {
  const recipeById = new Map(recipes.map((r) => [r.id, r] as const));
  const recipeIds = new Set<string>();
  const ingredientIds = new Set<string>();
  const sum: DailyMacros = { ...EMPTY_MACROS };
  let mealCount = 0;
  let plannedDays = 0;

  for (const day of plan.days) {
    const slots = slotsOf(day.meals);
    if (slots.length === 0) continue;
    plannedDays += 1;
    mealCount += slots.length;
    for (const slot of slots) {
      const recipe = recipeById.get(slot.recipeId);
      if (!recipe) continue;
      recipeIds.add(recipe.id);
      for (const line of recipe.ingredients) ingredientIds.add(line.ingredientId);
    }
    const perPerson = calculateDailyNutrition(recipes, onePortionEach(day.meals));
    for (const key of MACRO_KEYS) sum[key] += perPerson[key];
  }

  const dailyAverage = { ...EMPTY_MACROS };
  if (plannedDays > 0) {
    for (const key of MACRO_KEYS) {
      dailyAverage[key] = Math.round(sum[key] / plannedDays);
    }
  }

  return {
    mealCount,
    uniqueRecipes: recipeIds.size,
    uniqueIngredients: ingredientIds.size,
    plannedDays,
    totalDays: plan.days.length,
    estimatedCost: calculateMealPlanCost(plan, recipes, ingredients),
    dailyAverage,
  };
}
