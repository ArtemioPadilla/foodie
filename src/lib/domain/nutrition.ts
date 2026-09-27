/**
 * Nutrition arithmetic shared by tracking, planner and recipe views
 * (roadmap Issue 013 + Issue 014: the full port of legacy
 * `utils/nutritionCalculator.ts` — recipe/beverage/ingredient estimation).
 */
import type {
  Beverage,
  GoalProgress,
  Ingredient,
  NutritionGoals,
  NutritionInfo,
  Recipe,
} from '@/schemas';

/** All-zero `NutritionInfo` (legacy `createEmptyNutrition`). */
export function createEmptyNutrition(): NutritionInfo {
  return {
    servingSize: '0g',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
    cholesterol: 0,
  };
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

/** Multiply every macro by `multiplier` (kcal/mg rounded to integers, grams to 0.1). */
export function scaleNutrition(nutrition: NutritionInfo, multiplier: number): NutritionInfo {
  return {
    servingSize: nutrition.servingSize,
    calories: Math.round(nutrition.calories * multiplier),
    protein: round1(nutrition.protein * multiplier),
    carbs: round1(nutrition.carbs * multiplier),
    fat: round1(nutrition.fat * multiplier),
    fiber: round1(nutrition.fiber * multiplier),
    sugar: round1(nutrition.sugar * multiplier),
    sodium: Math.round(nutrition.sodium * multiplier),
    cholesterol: Math.round(nutrition.cholesterol * multiplier),
  };
}

/** Sum a list of `NutritionInfo` (grams rounded to 0.1 at each step, as legacy did). */
export function aggregateNutrition(items: ReadonlyArray<NutritionInfo>): NutritionInfo {
  if (items.length === 0) return createEmptyNutrition();
  return items.reduce<NutritionInfo>(
    (acc, n) => ({
      servingSize: 'Total',
      calories: acc.calories + n.calories,
      protein: round1(acc.protein + n.protein),
      carbs: round1(acc.carbs + n.carbs),
      fat: round1(acc.fat + n.fat),
      fiber: round1(acc.fiber + n.fiber),
      sugar: round1(acc.sugar + n.sugar),
      sodium: acc.sodium + n.sodium,
      cholesterol: acc.cholesterol + n.cholesterol,
    }),
    createEmptyNutrition(),
  );
}

/** A recipe's per-recipe nutrition scaled to `servings`. */
export function calculateRecipeNutrition(recipe: Recipe, servings: number): NutritionInfo {
  return scaleNutrition(recipe.nutrition, servings / recipe.servings);
}

/** Millilitres in one unit of a beverage measure (unknown units are taken as ml). */
const ML_PER_UNIT: Record<string, number> = { ml: 1, oz: 29.5735, cup: 240, l: 1000 };

/** Beverage nutrition for `quantity unit`, relative to its `defaultQuantity` (ml). */
export function calculateBeverageNutrition(
  beverage: Beverage,
  quantity: number,
  unit: string,
): NutritionInfo {
  const quantityInMl = quantity * (ML_PER_UNIT[unit] ?? 1);
  return scaleNutrition(beverage.nutrition, quantityInMl / beverage.defaultQuantity);
}

/**
 * Rough per-100 g profile by `ingredient.category` (ids from
 * `categories.json → ingredientCategories`, plus the legacy `fats`/`nuts`).
 * A full USDA lookup is out of scope; unknown categories read as vegetables.
 */
export const NUTRITION_BY_CATEGORY: Record<string, NutritionInfo> = {
  protein: { servingSize: '100g', calories: 150, protein: 25, carbs: 0, fat: 5, fiber: 0, sugar: 0, sodium: 60, cholesterol: 70 },
  vegetables: { servingSize: '100g', calories: 25, protein: 2, carbs: 5, fat: 0.3, fiber: 2, sugar: 3, sodium: 10, cholesterol: 0 },
  fruits: { servingSize: '100g', calories: 50, protein: 0.5, carbs: 13, fat: 0.2, fiber: 2.5, sugar: 10, sodium: 1, cholesterol: 0 },
  grains: { servingSize: '100g', calories: 350, protein: 10, carbs: 75, fat: 2, fiber: 3, sugar: 1, sodium: 5, cholesterol: 0 },
  dairy: { servingSize: '100g', calories: 60, protein: 3.5, carbs: 5, fat: 3, fiber: 0, sugar: 5, sodium: 50, cholesterol: 15 },
  fats: { servingSize: '100g', calories: 880, protein: 0, carbs: 0, fat: 100, fiber: 0, sugar: 0, sodium: 0, cholesterol: 0 },
  nuts: { servingSize: '100g', calories: 580, protein: 20, carbs: 20, fat: 50, fiber: 8, sugar: 5, sodium: 5, cholesterol: 0 },
  spices: { servingSize: '100g', calories: 10, protein: 0.5, carbs: 2, fat: 0.1, fiber: 0.5, sugar: 0, sodium: 5, cholesterol: 0 },
};

/** Grams in one unit of an ingredient measure (volume/piece values are rough kitchen estimates). */
const GRAMS_PER_UNIT: Record<string, number> = {
  g: 1,
  kg: 1000,
  lb: 453.592,
  oz: 28.3495,
  cup: 120,
  tbsp: 15,
  tsp: 5,
  piece: 150,
};

/** Estimate an ingredient's nutrition for `quantity unit` from its category profile. */
export function estimateIngredientNutrition(
  ingredient: Pick<Ingredient, 'category'>,
  quantity: number,
  unit: string,
): NutritionInfo {
  const base = NUTRITION_BY_CATEGORY[ingredient.category] ?? NUTRITION_BY_CATEGORY['vegetables']!;
  const quantityInGrams = quantity * (GRAMS_PER_UNIT[unit] ?? 1);
  return scaleNutrition(base, quantityInGrams / 100);
}

/** The minimal shape `calculateEntryNutrition` needs (a `TrackingEntry` satisfies it). */
export type NutritionEntryLike = {
  recipeId?: string;
  ingredientId?: string;
  beverageId?: string;
  quantity: number;
  unit: string;
  servings?: number;
};

/**
 * Nutrition of one diary entry, resolved against the catalog: recipe (needs
 * `servings`), then ingredient, then beverage; empty when nothing matches.
 */
export function calculateEntryNutrition(
  entry: NutritionEntryLike,
  recipes: ReadonlyArray<Recipe>,
  ingredients: ReadonlyArray<Ingredient>,
  beverages: ReadonlyArray<Beverage>,
): NutritionInfo {
  if (entry.recipeId) {
    const recipe = recipes.find((r) => r.id === entry.recipeId);
    if (recipe && entry.servings) return calculateRecipeNutrition(recipe, entry.servings);
  }
  if (entry.ingredientId) {
    const ingredient = ingredients.find((i) => i.id === entry.ingredientId);
    if (ingredient) return estimateIngredientNutrition(ingredient, entry.quantity, entry.unit);
  }
  if (entry.beverageId) {
    const beverage = beverages.find((b) => b.id === entry.beverageId);
    if (beverage) return calculateBeverageNutrition(beverage, entry.quantity, entry.unit);
  }
  return createEmptyNutrition();
}

function metricProgress(consumed: number, goal: number): GoalProgress['calories'] {
  return {
    consumed,
    goal,
    remaining: Math.max(0, goal - consumed),
    percentage: goal > 0 ? Math.round((consumed / goal) * 100) : 0,
  };
}

/**
 * Compare a day's totals against the goals. `water` is only present when a
 * water goal exists; `waterMl` is the logged water (tracking passes the sum of
 * `bev_water` entries — legacy always reported 0 here).
 */
export function calculateGoalProgress(
  totals: NutritionInfo,
  goals: NutritionGoals,
  waterMl = 0,
): GoalProgress {
  return {
    calories: metricProgress(totals.calories, goals.calories),
    protein: metricProgress(totals.protein, goals.protein),
    carbs: metricProgress(totals.carbs, goals.carbs),
    fat: metricProgress(totals.fat, goals.fat),
    fiber: metricProgress(totals.fiber, goals.fiber),
    water: goals.water ? metricProgress(waterMl, goals.water) : undefined,
  };
}
