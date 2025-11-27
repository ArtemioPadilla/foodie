import type { Recipe, MealPlan, MealSlot } from '@/types';

/**
 * Calculate the cost of a recipe for a specific number of servings
 * @param recipe - The recipe to calculate cost for
 * @param servings - Number of servings to calculate for
 * @param getIngredientPrice - Function to get ingredient price by ID
 * @returns Estimated cost in dollars, or 0 if insufficient data
 */
export function calculateRecipeCost(
  recipe: Recipe,
  servings: number,
  getIngredientPrice: (ingredientId: string) => number | undefined
): number {
  // Guard against invalid inputs
  if (!recipe || servings <= 0 || !Number.isFinite(servings)) return 0;
  if (recipe.servings <= 0 || !Number.isFinite(recipe.servings)) return 0;

  const scaleFactor = servings / recipe.servings;

  const totalCost = recipe.ingredients.reduce((total, ingredient) => {
    const pricePerUnit = getIngredientPrice(ingredient.ingredientId);

    // Guard against invalid price or quantity
    if (!pricePerUnit || pricePerUnit <= 0 || !Number.isFinite(pricePerUnit)) {
      return total;
    }
    if (ingredient.quantity < 0 || !Number.isFinite(ingredient.quantity)) {
      return total;
    }

    const scaledQuantity = ingredient.quantity * scaleFactor;
    const ingredientCost = pricePerUnit * scaledQuantity;

    // Guard against NaN propagation
    if (!Number.isFinite(ingredientCost)) {
      return total;
    }

    return total + ingredientCost;
  }, 0);

  // Final guard against NaN
  if (!Number.isFinite(totalCost)) return 0;

  return Math.round(totalCost * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate the total cost of a meal plan
 * @param plan - The meal plan to calculate cost for
 * @param getRecipeById - Function to get recipe by ID
 * @param getIngredientPrice - Function to get ingredient price by ID
 * @returns Estimated total cost in dollars
 */
export function calculatePlanCost(
  plan: MealPlan,
  getRecipeById: (id: string) => Recipe | undefined,
  getIngredientPrice: (ingredientId: string) => number | undefined
): number {
  if (!plan || !plan.days) return 0;

  let totalCost = 0;

  plan.days.forEach(day => {
    const { meals } = day;

    // Helper to process a meal slot
    const processMeal = (mealSlot: MealSlot | undefined) => {
      if (!mealSlot) return;

      const recipe = getRecipeById(mealSlot.recipeId);
      if (!recipe) return;

      const mealCost = calculateRecipeCost(
        recipe,
        mealSlot.servings,
        getIngredientPrice
      );

      // Guard against NaN propagation
      if (Number.isFinite(mealCost)) {
        totalCost += mealCost;
      }
    };

    // Process breakfast, lunch, dinner
    processMeal(meals.breakfast);
    processMeal(meals.lunch);
    processMeal(meals.dinner);

    // Process snacks (array)
    meals.snacks?.forEach(snack => processMeal(snack));
  });

  // Final guard against NaN
  if (!Number.isFinite(totalCost)) return 0;

  return Math.round(totalCost * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate cost per serving for a recipe
 * @param recipe - The recipe
 * @param getIngredientPrice - Function to get ingredient price by ID
 * @returns Cost per serving in dollars, or 0 if servings is invalid
 */
export function calculateCostPerServing(
  recipe: Recipe,
  getIngredientPrice: (ingredientId: string) => number | undefined
): number {
  // Guard against invalid inputs
  if (!recipe || recipe.servings <= 0 || !Number.isFinite(recipe.servings)) return 0;

  const totalCost = calculateRecipeCost(recipe, recipe.servings, getIngredientPrice);

  // Guard against NaN
  if (!Number.isFinite(totalCost)) return 0;

  const costPerServing = totalCost / recipe.servings;

  // Final guard against NaN
  if (!Number.isFinite(costPerServing)) return 0;

  return Math.round(costPerServing * 100) / 100;
}
