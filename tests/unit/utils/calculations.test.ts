import { describe, it, expect } from 'vitest';
import {
  scaleRecipeIngredient,
  scaleRecipe,
  calculateRecipeCost,
  calculateMealPlanCost,
  calculateDailyNutrition,
} from '@utils/calculations';
import type { Recipe, RecipeIngredient, Ingredient, MealPlan } from '@types';

describe('calculations', () => {
  const mockIngredient: RecipeIngredient = {
    ingredientId: 'ing-1',
    quantity: 2,
    unit: 'cup',
    notes: { en: '', es: '', fr: '' },
    optional: false,
  };

  const mockPriceIngredient: Ingredient = {
    id: 'ing-1',
    name: { en: 'Test Ingredient', es: 'Ingrediente de prueba', fr: 'Ingrédient de test' },
    category: 'vegetables',
    avgPrice: 3.0,
    unitType: 'cup',
    storageInfo: { en: 'Store cool', es: 'Guardar fresco', fr: 'Stocker au frais' },
    shelfLife: { refrigerated: 7, frozen: 90 },
  };

  const mockRecipe: Recipe = {
    id: 'recipe-1',
    name: { en: 'Test Recipe', es: 'Receta de prueba', fr: 'Recette de test' },
    description: { en: 'Description', es: 'Descripción', fr: 'Description' },
    cuisine: 'american',
    category: 'dinner',
    difficulty: 'easy',
    prepTime: 15,
    cookTime: 30,
    totalTime: 45,
    servings: 4,
    imageUrl: '',
    videoUrl: '',
    ingredients: [mockIngredient],
    instructions: [
      {
        step: 1,
        text: { en: 'Step 1', es: 'Paso 1', fr: 'Étape 1' },
        imageUrl: '',
        timerMinutes: 0,
      },
    ],
    nutrition: {
      calories: 200,
      protein: 10,
      carbs: 30,
      fat: 5,
      fiber: 3,
      sugar: 2,
      sodium: 100,
    },
    tags: [],
    dietaryLabels: {
      vegetarian: false,
      vegan: false,
      glutenFree: false,
      dairyFree: false,
      nutFree: false,
      lowCarb: false,
      keto: false,
      paleo: false,
    },
    equipmentNeeded: [],
    skillLevel: 'beginner',
    cost: 'budget',
    rating: 4.5,
    reviewCount: 10,
    dateAdded: '2024-01-01',
    author: 'Test Author',
    source: '',
  };

  describe('scaleRecipeIngredient', () => {
    it('doubles ingredient quantity when doubling servings', () => {
      const scaled = scaleRecipeIngredient(mockIngredient, 8, 4);
      expect(scaled.quantity).toBe(4);
    });

    it('halves ingredient quantity when halving servings', () => {
      const scaled = scaleRecipeIngredient(mockIngredient, 2, 4);
      expect(scaled.quantity).toBe(1);
    });

    it('maintains same quantity when servings unchanged', () => {
      const scaled = scaleRecipeIngredient(mockIngredient, 4, 4);
      expect(scaled.quantity).toBe(2);
    });

    it('rounds to useful fractions', () => {
      const scaled = scaleRecipeIngredient(mockIngredient, 3, 4);
      // 2 * (3/4) = 1.5, which should round to 1.5
      expect(scaled.quantity).toBe(1.5);
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
      expect(scaled.ingredients[0].quantity).toBe(4);
    });

    it('scales all ingredients when halving recipe', () => {
      const scaled = scaleRecipe(mockRecipe, 2);
      expect(scaled.servings).toBe(2);
      expect(scaled.ingredients[0].quantity).toBe(1);
    });

    it('handles recipes with multiple ingredients', () => {
      const multiIngredientRecipe = {
        ...mockRecipe,
        ingredients: [
          mockIngredient,
          { ...mockIngredient, ingredientId: 'ing-2', quantity: 3 },
          { ...mockIngredient, ingredientId: 'ing-3', quantity: 1 },
        ],
      };

      const scaled = scaleRecipe(multiIngredientRecipe, 8);
      expect(scaled.ingredients).toHaveLength(3);
      expect(scaled.ingredients[0].quantity).toBe(4);
      expect(scaled.ingredients[1].quantity).toBe(6);
      expect(scaled.ingredients[2].quantity).toBe(2);
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
      const cost = calculateRecipeCost(mockRecipe, [mockPriceIngredient]);
      // 2 cups * $3.00/cup = $6.00
      expect(cost).toBe(6.0);
    });

    it('returns 0 when no matching ingredients found', () => {
      const cost = calculateRecipeCost(mockRecipe, []);
      expect(cost).toBe(0);
    });

    it('calculates cost for multiple ingredients', () => {
      const multiIngredientRecipe = {
        ...mockRecipe,
        ingredients: [
          mockIngredient,
          { ...mockIngredient, ingredientId: 'ing-2', quantity: 1 },
        ],
      };

      const ingredients = [
        mockPriceIngredient,
        { ...mockPriceIngredient, id: 'ing-2', avgPrice: 2.5 },
      ];

      const cost = calculateRecipeCost(multiIngredientRecipe, ingredients);
      // (2 * $3.00) + (1 * $2.50) = $8.50
      expect(cost).toBe(8.5);
    });

    it('ignores ingredients not in database', () => {
      const multiIngredientRecipe = {
        ...mockRecipe,
        ingredients: [
          mockIngredient,
          { ...mockIngredient, ingredientId: 'unknown', quantity: 100 },
        ],
      };

      const cost = calculateRecipeCost(multiIngredientRecipe, [mockPriceIngredient]);
      // Should only count the known ingredient
      expect(cost).toBe(6.0);
    });
  });

  describe('calculateMealPlanCost', () => {
    const mockMealPlan: MealPlan = {
      id: 'plan-1',
      name: 'Test Plan',
      startDate: '2024-01-01',
      endDate: '2024-01-07',
      days: [
        {
          date: '2024-01-01',
          meals: {
            breakfast: { recipeId: 'recipe-1', servings: 4 },
            lunch: null,
            dinner: null,
            snacks: [],
          },
        },
      ],
      totalCost: 0,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    };

    it('calculates cost for single meal', () => {
      const cost = calculateMealPlanCost(mockMealPlan, [mockRecipe], [mockPriceIngredient]);
      expect(cost).toBe(6.0);
    });

    it('scales recipe cost based on servings', () => {
      const doublePlan = {
        ...mockMealPlan,
        days: [
          {
            date: '2024-01-01',
            meals: {
              breakfast: { recipeId: 'recipe-1', servings: 8 },
              lunch: null,
              dinner: null,
              snacks: [],
            },
          },
        ],
      };

      const cost = calculateMealPlanCost(doublePlan, [mockRecipe], [mockPriceIngredient]);
      // Double servings = double cost
      expect(cost).toBe(12.0);
    });

    it('sums costs for multiple meals', () => {
      const multiMealPlan = {
        ...mockMealPlan,
        days: [
          {
            date: '2024-01-01',
            meals: {
              breakfast: { recipeId: 'recipe-1', servings: 4 },
              lunch: { recipeId: 'recipe-1', servings: 4 },
              dinner: { recipeId: 'recipe-1', servings: 4 },
              snacks: [],
            },
          },
        ],
      };

      const cost = calculateMealPlanCost(multiMealPlan, [mockRecipe], [mockPriceIngredient]);
      // 3 meals * $6.00 = $18.00
      expect(cost).toBe(18.0);
    });

    it('handles snacks array', () => {
      const planWithSnacks = {
        ...mockMealPlan,
        days: [
          {
            date: '2024-01-01',
            meals: {
              breakfast: null,
              lunch: null,
              dinner: null,
              snacks: [
                { recipeId: 'recipe-1', servings: 2 },
                { recipeId: 'recipe-1', servings: 2 },
              ],
            },
          },
        ],
      };

      const cost = calculateMealPlanCost(planWithSnacks, [mockRecipe], [mockPriceIngredient]);
      // 2 snacks * 2 servings each * (2 cups * $3/cup / 4 servings) = $6.00
      expect(cost).toBe(6.0);
    });

    it('rounds to 2 decimal places', () => {
      const ingredient = { ...mockPriceIngredient, avgPrice: 1.33333 };
      const cost = calculateMealPlanCost(mockMealPlan, [mockRecipe], [ingredient]);
      // Should be rounded to 2 decimal places
      expect(cost).toBe(Math.round((2 * 1.33333) * 100) / 100);
    });

    it('returns 0 for empty meal plan', () => {
      const emptyPlan = { ...mockMealPlan, days: [] };
      const cost = calculateMealPlanCost(emptyPlan, [mockRecipe], [mockPriceIngredient]);
      expect(cost).toBe(0);
    });
  });

  describe('calculateDailyNutrition', () => {
    const dayMeals = {
      breakfast: { recipeId: 'recipe-1', servings: 4 },
      lunch: null,
      dinner: null,
      snacks: [],
    };

    it('calculates nutrition for single meal', () => {
      const nutrition = calculateDailyNutrition([mockRecipe], dayMeals);
      expect(nutrition.calories).toBe(200);
      expect(nutrition.protein).toBe(10);
      expect(nutrition.carbs).toBe(30);
      expect(nutrition.fat).toBe(5);
      expect(nutrition.fiber).toBe(3);
    });

    it('scales nutrition based on servings', () => {
      const doubleServingsMeals = {
        breakfast: { recipeId: 'recipe-1', servings: 8 },
        lunch: null,
        dinner: null,
        snacks: [],
      };

      const nutrition = calculateDailyNutrition([mockRecipe], doubleServingsMeals);
      expect(nutrition.calories).toBe(400);
      expect(nutrition.protein).toBe(20);
      expect(nutrition.carbs).toBe(60);
    });

    it('sums nutrition for multiple meals', () => {
      const multipleMeals = {
        breakfast: { recipeId: 'recipe-1', servings: 4 },
        lunch: { recipeId: 'recipe-1', servings: 4 },
        dinner: { recipeId: 'recipe-1', servings: 4 },
        snacks: [],
      };

      const nutrition = calculateDailyNutrition([mockRecipe], multipleMeals);
      expect(nutrition.calories).toBe(600);
      expect(nutrition.protein).toBe(30);
      expect(nutrition.carbs).toBe(90);
    });

    it('handles snacks array', () => {
      const mealsWithSnacks = {
        breakfast: null,
        lunch: null,
        dinner: null,
        snacks: [
          { recipeId: 'recipe-1', servings: 2 },
          { recipeId: 'recipe-1', servings: 2 },
        ],
      };

      const nutrition = calculateDailyNutrition([mockRecipe], mealsWithSnacks);
      // 2 snacks at half servings each = 1x full nutrition
      expect(nutrition.calories).toBe(200);
    });

    it('rounds all values to integers', () => {
      const halfServingsMeals = {
        breakfast: { recipeId: 'recipe-1', servings: 3 },
        lunch: null,
        dinner: null,
        snacks: [],
      };

      const nutrition = calculateDailyNutrition([mockRecipe], halfServingsMeals);
      // 200 * (3/4) = 150
      expect(nutrition.calories).toBe(150);
      expect(Number.isInteger(nutrition.calories)).toBe(true);
    });

    it('ignores null meals', () => {
      const nullMeals = {
        breakfast: null,
        lunch: null,
        dinner: null,
        snacks: [],
      };

      const nutrition = calculateDailyNutrition([mockRecipe], nullMeals);
      expect(nutrition.calories).toBe(0);
      expect(nutrition.protein).toBe(0);
    });

    it('ignores recipes not found', () => {
      const unknownMeals = {
        breakfast: { recipeId: 'unknown', servings: 4 },
        lunch: null,
        dinner: null,
        snacks: [],
      };

      const nutrition = calculateDailyNutrition([mockRecipe], unknownMeals);
      expect(nutrition.calories).toBe(0);
    });
  });
});
