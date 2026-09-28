/**
 * Recipe scaling and cost/nutrition roll-ups (roadmap Issue 014, port of
 * legacy `utils/calculations.ts`). Pure: takes the catalog arrays explicitly.
 */
import type { DayMeals, Ingredient, MealPlan, MealSlot, Recipe, RecipeIngredient } from '@/schemas';
import { roundToUsefulFraction } from './units';

/** Scale one ingredient line from `baseServings` to `targetServings`, snapping to cook-friendly fractions. */
export function scaleRecipeIngredient(
  ingredient: RecipeIngredient,
  targetServings: number,
  baseServings: number,
): RecipeIngredient {
  const scaleFactor = targetServings / baseServings;
  return { ...ingredient, quantity: roundToUsefulFraction(ingredient.quantity * scaleFactor) };
}

/** A copy of `recipe` for `targetServings` (only `servings` and ingredient quantities change). */
export function scaleRecipe(recipe: Recipe, targetServings: number): Recipe {
  return {
    ...recipe,
    servings: targetServings,
    ingredients: recipe.ingredients.map((ing) =>
      scaleRecipeIngredient(ing, targetServings, recipe.servings),
    ),
  };
}

/** Sum of `avgPrice × quantity` over the ingredients found in the catalog (unknown ids are skipped). */
export function calculateRecipeCost(
  recipe: Recipe,
  ingredients: ReadonlyArray<Ingredient>,
): number {
  const priceById = new Map(ingredients.map((i) => [i.id, i.avgPrice] as const));
  return recipe.ingredients.reduce((total, line) => {
    const price = priceById.get(line.ingredientId);
    return price === undefined ? total : total + price * line.quantity;
  }, 0);
}

/** Every slot of every day, snacks flattened. */
function slotsOf(meals: DayMeals): MealSlot[] {
  const slots: MealSlot[] = [];
  if (meals.breakfast) slots.push(meals.breakfast);
  if (meals.lunch) slots.push(meals.lunch);
  if (meals.dinner) slots.push(meals.dinner);
  if (meals.snacks) slots.push(...meals.snacks);
  return slots;
}

/** Cost of the whole plan, each slot scaled to its servings, rounded to cents. */
export function calculateMealPlanCost(
  mealPlan: MealPlan,
  recipes: ReadonlyArray<Recipe>,
  ingredients: ReadonlyArray<Ingredient>,
): number {
  const recipeById = new Map(recipes.map((r) => [r.id, r] as const));
  let total = 0;
  for (const day of mealPlan.days) {
    for (const slot of slotsOf(day.meals)) {
      const recipe = recipeById.get(slot.recipeId);
      if (recipe) total += calculateRecipeCost(scaleRecipe(recipe, slot.servings), ingredients);
    }
  }
  return Math.round(total * 100) / 100;
}

export type DailyMacros = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
};

/** Integer-rounded macro totals of one day's slots (unknown recipes are ignored). */
export function calculateDailyNutrition(
  recipes: ReadonlyArray<Recipe>,
  dayMeals: DayMeals,
): DailyMacros {
  const recipeById = new Map(recipes.map((r) => [r.id, r] as const));
  const totals: DailyMacros = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  for (const slot of slotsOf(dayMeals)) {
    const recipe = recipeById.get(slot.recipeId);
    if (!recipe) continue;
    const factor = slot.servings / recipe.servings;
    totals.calories += recipe.nutrition.calories * factor;
    totals.protein += recipe.nutrition.protein * factor;
    totals.carbs += recipe.nutrition.carbs * factor;
    totals.fat += recipe.nutrition.fat * factor;
    totals.fiber += recipe.nutrition.fiber * factor;
  }
  return {
    calories: Math.round(totals.calories),
    protein: Math.round(totals.protein),
    carbs: Math.round(totals.carbs),
    fat: Math.round(totals.fat),
    fiber: Math.round(totals.fiber),
  };
}
