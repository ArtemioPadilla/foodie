import type { NutritionInfo, Recipe, Ingredient, Beverage } from '@/types';

/**
 * Create an empty nutrition object
 */
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

/**
 * Scale nutrition by a multiplier
 */
export function scaleNutrition(nutrition: NutritionInfo, multiplier: number): NutritionInfo {
  return {
    servingSize: nutrition.servingSize,
    calories: Math.round(nutrition.calories * multiplier),
    protein: Math.round(nutrition.protein * multiplier * 10) / 10,
    carbs: Math.round(nutrition.carbs * multiplier * 10) / 10,
    fat: Math.round(nutrition.fat * multiplier * 10) / 10,
    fiber: Math.round(nutrition.fiber * multiplier * 10) / 10,
    sugar: Math.round(nutrition.sugar * multiplier * 10) / 10,
    sodium: Math.round(nutrition.sodium * multiplier),
    cholesterol: Math.round(nutrition.cholesterol * multiplier),
  };
}

/**
 * Calculate nutrition for a recipe based on servings
 */
export function calculateRecipeNutrition(recipe: Recipe, servings: number): NutritionInfo {
  const multiplier = servings / recipe.servings;
  return scaleNutrition(recipe.nutrition, multiplier);
}

/**
 * Calculate nutrition for a beverage based on quantity
 */
export function calculateBeverageNutrition(
  beverage: Beverage,
  quantity: number,
  unit: string
): NutritionInfo {
  // Convert to ml if needed
  let quantityInMl = quantity;
  if (unit === 'oz') {
    quantityInMl = quantity * 29.5735; // 1 oz = 29.5735 ml
  } else if (unit === 'cup') {
    quantityInMl = quantity * 240; // 1 cup = 240 ml
  } else if (unit === 'l') {
    quantityInMl = quantity * 1000; // 1 L = 1000 ml
  }

  // Calculate multiplier based on default quantity
  const multiplier = quantityInMl / beverage.defaultQuantity;
  return scaleNutrition(beverage.nutrition, multiplier);
}

/**
 * Estimate nutrition for an ingredient
 * This is a simplified estimation - in a real app you'd have a full USDA database
 */
export function estimateIngredientNutrition(
  ingredient: Ingredient,
  quantity: number,
  unit: string
): NutritionInfo {
  // Base nutrition per 100g (rough estimates by category)
  const nutritionByCategory: Record<string, NutritionInfo> = {
    protein: {
      servingSize: '100g',
      calories: 150,
      protein: 25,
      carbs: 0,
      fat: 5,
      fiber: 0,
      sugar: 0,
      sodium: 60,
      cholesterol: 70,
    },
    vegetables: {
      servingSize: '100g',
      calories: 25,
      protein: 2,
      carbs: 5,
      fat: 0.3,
      fiber: 2,
      sugar: 3,
      sodium: 10,
      cholesterol: 0,
    },
    fruits: {
      servingSize: '100g',
      calories: 50,
      protein: 0.5,
      carbs: 13,
      fat: 0.2,
      fiber: 2.5,
      sugar: 10,
      sodium: 1,
      cholesterol: 0,
    },
    grains: {
      servingSize: '100g',
      calories: 350,
      protein: 10,
      carbs: 75,
      fat: 2,
      fiber: 3,
      sugar: 1,
      sodium: 5,
      cholesterol: 0,
    },
    dairy: {
      servingSize: '100g',
      calories: 60,
      protein: 3.5,
      carbs: 5,
      fat: 3,
      fiber: 0,
      sugar: 5,
      sodium: 50,
      cholesterol: 15,
    },
    fats: {
      servingSize: '100g',
      calories: 880,
      protein: 0,
      carbs: 0,
      fat: 100,
      fiber: 0,
      sugar: 0,
      sodium: 0,
      cholesterol: 0,
    },
    nuts: {
      servingSize: '100g',
      calories: 580,
      protein: 20,
      carbs: 20,
      fat: 50,
      fiber: 8,
      sugar: 5,
      sodium: 5,
      cholesterol: 0,
    },
    spices: {
      servingSize: '100g',
      calories: 10,
      protein: 0.5,
      carbs: 2,
      fat: 0.1,
      fiber: 0.5,
      sugar: 0,
      sodium: 5,
      cholesterol: 0,
    },
  };

  // Get base nutrition for ingredient category
  const baseNutrition =
    nutritionByCategory[ingredient.category] || nutritionByCategory['vegetables'];

  // Convert quantity to grams
  let quantityInGrams = quantity;
  if (unit === 'kg') {
    quantityInGrams = quantity * 1000;
  } else if (unit === 'lb') {
    quantityInGrams = quantity * 453.592;
  } else if (unit === 'oz') {
    quantityInGrams = quantity * 28.3495;
  } else if (unit === 'cup') {
    quantityInGrams = quantity * 120; // Rough estimate
  } else if (unit === 'tbsp') {
    quantityInGrams = quantity * 15;
  } else if (unit === 'tsp') {
    quantityInGrams = quantity * 5;
  } else if (unit === 'piece') {
    quantityInGrams = quantity * 150; // Rough estimate for 1 piece
  }

  // Calculate multiplier based on 100g base
  const multiplier = quantityInGrams / 100;
  return scaleNutrition(baseNutrition, multiplier);
}

/**
 * Aggregate multiple nutrition objects into one total
 */
export function aggregateNutrition(nutritionArray: NutritionInfo[]): NutritionInfo {
  if (nutritionArray.length === 0) {
    return createEmptyNutrition();
  }

  return nutritionArray.reduce(
    (acc, nutrition) => ({
      servingSize: 'Total',
      calories: acc.calories + nutrition.calories,
      protein: Math.round((acc.protein + nutrition.protein) * 10) / 10,
      carbs: Math.round((acc.carbs + nutrition.carbs) * 10) / 10,
      fat: Math.round((acc.fat + nutrition.fat) * 10) / 10,
      fiber: Math.round((acc.fiber + nutrition.fiber) * 10) / 10,
      sugar: Math.round((acc.sugar + nutrition.sugar) * 10) / 10,
      sodium: acc.sodium + nutrition.sodium,
      cholesterol: acc.cholesterol + nutrition.cholesterol,
    }),
    createEmptyNutrition()
  );
}

/**
 * Calculate nutrition for a tracking entry
 */
export function calculateEntryNutrition(
  entry: {
    recipeId?: string;
    ingredientId?: string;
    beverageId?: string;
    quantity: number;
    unit: string;
    servings?: number;
  },
  recipes: Recipe[],
  ingredients: Ingredient[],
  beverages: Beverage[]
): NutritionInfo {
  // Recipe
  if (entry.recipeId) {
    const recipe = recipes.find(r => r.id === entry.recipeId);
    if (recipe && entry.servings) {
      return calculateRecipeNutrition(recipe, entry.servings);
    }
  }

  // Ingredient
  if (entry.ingredientId) {
    const ingredient = ingredients.find(i => i.id === entry.ingredientId);
    if (ingredient) {
      return estimateIngredientNutrition(ingredient, entry.quantity, entry.unit);
    }
  }

  // Beverage
  if (entry.beverageId) {
    const beverage = beverages.find(b => b.id === entry.beverageId);
    if (beverage) {
      return calculateBeverageNutrition(beverage, entry.quantity, entry.unit);
    }
  }

  return createEmptyNutrition();
}
