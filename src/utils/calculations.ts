import type { Recipe, RecipeIngredient, Ingredient, MealPlan } from '@/types';
import { roundToUsefulFraction } from './unitConversions';

export function scaleRecipeIngredient(
  ingredient: RecipeIngredient,
  targetServings: number,
  baseServings: number
): RecipeIngredient {
  const scaleFactor = targetServings / baseServings;
  const scaledQuantity = roundToUsefulFraction(ingredient.quantity * scaleFactor);

  return {
    ...ingredient,
    quantity: scaledQuantity,
  };
}

export function scaleRecipe(recipe: Recipe, targetServings: number): Recipe {
  return {
    ...recipe,
    servings: targetServings,
    ingredients: recipe.ingredients.map(ing =>
      scaleRecipeIngredient(ing, targetServings, recipe.servings)
    ),
  };
}

export function calculateRecipeCost(
  recipe: Recipe,
  ingredients: Ingredient[]
): number {
  return recipe.ingredients.reduce((total, recipeIng) => {
    const ingredient = ingredients.find(ing => ing.id === recipeIng.ingredientId);
    if (!ingredient) return total;

    // Convert to common unit if needed and calculate cost
    const cost = ingredient.avgPrice * recipeIng.quantity;
    return total + cost;
  }, 0);
}

export function calculateMealPlanCost(
  mealPlan: MealPlan,
  recipes: Recipe[],
  ingredients: Ingredient[]
): number {
  let totalCost = 0;

  mealPlan.days.forEach(day => {
    Object.values(day.meals).forEach(meal => {
      if (Array.isArray(meal)) {
        // Handle snacks array
        meal.forEach(snack => {
          const recipe = recipes.find(r => r.id === snack.recipeId);
          if (recipe) {
            const scaledRecipe = scaleRecipe(recipe, snack.servings);
            totalCost += calculateRecipeCost(scaledRecipe, ingredients);
          }
        });
      } else if (meal) {
        // Handle single meal
        const recipe = recipes.find(r => r.id === meal.recipeId);
        if (recipe) {
          const scaledRecipe = scaleRecipe(recipe, meal.servings);
          totalCost += calculateRecipeCost(scaledRecipe, ingredients);
        }
      }
    });
  });

  return Math.round(totalCost * 100) / 100;
}

export function calculateDailyNutrition(
  recipes: Recipe[],
  dayMeals: any
): {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
} {
  const totals = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
  };

  Object.values(dayMeals).forEach((meal: any) => {
    if (Array.isArray(meal)) {
      // Handle snacks
      meal.forEach(snack => {
        const recipe = recipes.find(r => r.id === snack.recipeId);
        if (recipe) {
          const scaleFactor = snack.servings / recipe.servings;
          totals.calories += recipe.nutrition.calories * scaleFactor;
          totals.protein += recipe.nutrition.protein * scaleFactor;
          totals.carbs += recipe.nutrition.carbs * scaleFactor;
          totals.fat += recipe.nutrition.fat * scaleFactor;
          totals.fiber += recipe.nutrition.fiber * scaleFactor;
        }
      });
    } else if (meal) {
      const recipe = recipes.find(r => r.id === meal.recipeId);
      if (recipe) {
        const scaleFactor = meal.servings / recipe.servings;
        totals.calories += recipe.nutrition.calories * scaleFactor;
        totals.protein += recipe.nutrition.protein * scaleFactor;
        totals.carbs += recipe.nutrition.carbs * scaleFactor;
        totals.fat += recipe.nutrition.fat * scaleFactor;
        totals.fiber += recipe.nutrition.fiber * scaleFactor;
      }
    }
  });

  return {
    calories: Math.round(totals.calories),
    protein: Math.round(totals.protein),
    carbs: Math.round(totals.carbs),
    fat: Math.round(totals.fat),
    fiber: Math.round(totals.fiber),
  };
}
