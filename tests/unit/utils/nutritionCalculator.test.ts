import { describe, it, expect } from 'vitest';
import {
  createEmptyNutrition,
  scaleNutrition,
  calculateRecipeNutrition,
  calculateBeverageNutrition,
  estimateIngredientNutrition,
  aggregateNutrition,
  calculateEntryNutrition,
} from '@utils/nutritionCalculator';
import { mockRecipe, mockBeverage, mockIngredient } from '../../mocks/mockData';

describe('nutritionCalculator', () => {
  describe('createEmptyNutrition', () => {
    it('creates nutrition object with all zeros', () => {
      const empty = createEmptyNutrition();
      expect(empty.calories).toBe(0);
      expect(empty.protein).toBe(0);
      expect(empty.carbs).toBe(0);
      expect(empty.fat).toBe(0);
      expect(empty.fiber).toBe(0);
      expect(empty.sugar).toBe(0);
      expect(empty.sodium).toBe(0);
      expect(empty.cholesterol).toBe(0);
    });

    it('has correct serving size', () => {
      const empty = createEmptyNutrition();
      expect(empty.servingSize).toBe('0g');
    });
  });

  describe('scaleNutrition', () => {
    it('doubles nutrition values when multiplier is 2', () => {
      const nutrition = {
        servingSize: '100g',
        calories: 200,
        protein: 10,
        carbs: 20,
        fat: 5,
        fiber: 3,
        sugar: 2,
        sodium: 100,
        cholesterol: 10,
      };

      const scaled = scaleNutrition(nutrition, 2);
      expect(scaled.calories).toBe(400);
      expect(scaled.protein).toBe(20);
      expect(scaled.carbs).toBe(40);
      expect(scaled.fat).toBe(10);
      expect(scaled.fiber).toBe(6);
      expect(scaled.sugar).toBe(4);
      expect(scaled.sodium).toBe(200);
      expect(scaled.cholesterol).toBe(20);
    });

    it('halves nutrition values when multiplier is 0.5', () => {
      const nutrition = {
        servingSize: '100g',
        calories: 200,
        protein: 10,
        carbs: 20,
        fat: 5,
        fiber: 3,
        sugar: 2,
        sodium: 100,
        cholesterol: 10,
      };

      const scaled = scaleNutrition(nutrition, 0.5);
      expect(scaled.calories).toBe(100);
      expect(scaled.protein).toBe(5);
      expect(scaled.carbs).toBe(10);
      expect(scaled.fat).toBe(2.5);
      expect(scaled.fiber).toBe(1.5);
      expect(scaled.sugar).toBe(1);
      expect(scaled.sodium).toBe(50);
      expect(scaled.cholesterol).toBe(5);
    });

    it('rounds macros to 1 decimal place', () => {
      const nutrition = {
        servingSize: '100g',
        calories: 100,
        protein: 10.25,
        carbs: 20.67,
        fat: 5.99,
        fiber: 3.14,
        sugar: 2.01,
        sodium: 100,
        cholesterol: 10,
      };

      const scaled = scaleNutrition(nutrition, 1.33);
      expect(scaled.protein).toBe(13.6); // Rounded to 1 decimal
      expect(scaled.carbs).toBe(27.5);
      expect(scaled.fat).toBe(8);
    });

    it('preserves serving size', () => {
      const nutrition = {
        servingSize: '1 cup',
        calories: 200,
        protein: 10,
        carbs: 20,
        fat: 5,
        fiber: 3,
        sugar: 2,
        sodium: 100,
        cholesterol: 10,
      };

      const scaled = scaleNutrition(nutrition, 2);
      expect(scaled.servingSize).toBe('1 cup');
    });
  });

  describe('calculateRecipeNutrition', () => {
    it('calculates nutrition for double servings', () => {
      const result = calculateRecipeNutrition(mockRecipe, mockRecipe.servings * 2);
      expect(result.calories).toBe(mockRecipe.nutrition.calories * 2);
      expect(result.protein).toBe(mockRecipe.nutrition.protein * 2);
    });

    it('calculates nutrition for half servings', () => {
      const result = calculateRecipeNutrition(mockRecipe, mockRecipe.servings / 2);
      expect(result.calories).toBe(Math.round(mockRecipe.nutrition.calories / 2));
    });

    it('returns same nutrition for same servings', () => {
      const result = calculateRecipeNutrition(mockRecipe, mockRecipe.servings);
      expect(result.calories).toBe(mockRecipe.nutrition.calories);
      expect(result.protein).toBe(mockRecipe.nutrition.protein);
    });
  });

  describe('calculateBeverageNutrition', () => {
    it('calculates nutrition for ml unit', () => {
      const result = calculateBeverageNutrition(mockBeverage, 500, 'ml');
      // 500ml is 2x the default 250ml
      expect(result.calories).toBe(mockBeverage.nutrition.calories * 2);
    });

    it('converts oz to ml correctly', () => {
      const result = calculateBeverageNutrition(mockBeverage, 8, 'oz');
      // 8 oz = 236.588 ml, roughly 1x default 250ml
      expect(result.calories).toBeCloseTo(mockBeverage.nutrition.calories, 0);
    });

    it('converts cup to ml correctly', () => {
      const result = calculateBeverageNutrition(mockBeverage, 1, 'cup');
      // 1 cup = 240ml, roughly equal to default 250ml
      expect(result.calories).toBeCloseTo(mockBeverage.nutrition.calories, 0);
    });

    it('converts L to ml correctly', () => {
      const result = calculateBeverageNutrition(mockBeverage, 1, 'l');
      // 1 L = 1000ml = 4x default 250ml
      expect(result.calories).toBe(mockBeverage.nutrition.calories * 4);
    });
  });

  describe('estimateIngredientNutrition', () => {
    it('estimates nutrition for protein category', () => {
      const proteinIngredient = { ...mockIngredient, category: 'protein' };
      const result = estimateIngredientNutrition(proteinIngredient, 100, 'g');

      // Base protein category: 150 cal, 25g protein per 100g
      expect(result.calories).toBe(150);
      expect(result.protein).toBe(25);
    });

    it('converts kg to grams', () => {
      const result = estimateIngredientNutrition(mockIngredient, 1, 'kg');
      // 1 kg = 1000g = 10x multiplier for 100g base
      expect(result.calories).toBeGreaterThan(0);
    });

    it('converts lb to grams', () => {
      const result = estimateIngredientNutrition(mockIngredient, 1, 'lb');
      // 1 lb = 453.592g = ~4.5x multiplier
      expect(result.calories).toBeGreaterThan(0);
    });

    it('converts oz to grams', () => {
      const result = estimateIngredientNutrition(mockIngredient, 4, 'oz');
      // 4 oz = ~113g = ~1.1x multiplier
      expect(result.calories).toBeGreaterThan(0);
    });

    it('converts cup to grams', () => {
      const result = estimateIngredientNutrition(mockIngredient, 1, 'cup');
      // 1 cup = 120g estimate
      expect(result.calories).toBeGreaterThan(0);
    });

    it('converts tbsp to grams', () => {
      const result = estimateIngredientNutrition(mockIngredient, 2, 'tbsp');
      // 2 tbsp = 30g
      expect(result.calories).toBeGreaterThan(0);
    });

    it('converts tsp to grams', () => {
      const result = estimateIngredientNutrition(mockIngredient, 3, 'tsp');
      // 3 tsp = 15g
      expect(result.calories).toBeGreaterThan(0);
    });

    it('handles piece unit', () => {
      const result = estimateIngredientNutrition(mockIngredient, 1, 'piece');
      // 1 piece = 150g estimate
      expect(result.calories).toBeGreaterThan(0);
    });

    it('defaults to vegetables category for unknown category', () => {
      const unknownIngredient = { ...mockIngredient, category: 'unknown-category' };
      const result = estimateIngredientNutrition(unknownIngredient, 100, 'g');

      // Should use vegetables default: 25 cal per 100g
      expect(result.calories).toBe(25);
    });
  });

  describe('aggregateNutrition', () => {
    it('returns empty nutrition for empty array', () => {
      const result = aggregateNutrition([]);
      expect(result.calories).toBe(0);
      expect(result.protein).toBe(0);
    });

    it('sums multiple nutrition objects', () => {
      const nutrition1 = {
        servingSize: '1 serving',
        calories: 200,
        protein: 10,
        carbs: 20,
        fat: 5,
        fiber: 3,
        sugar: 2,
        sodium: 100,
        cholesterol: 10,
      };

      const nutrition2 = {
        servingSize: '1 serving',
        calories: 300,
        protein: 15,
        carbs: 30,
        fat: 10,
        fiber: 5,
        sugar: 3,
        sodium: 150,
        cholesterol: 20,
      };

      const result = aggregateNutrition([nutrition1, nutrition2]);
      expect(result.calories).toBe(500);
      expect(result.protein).toBe(25);
      expect(result.carbs).toBe(50);
      expect(result.fat).toBe(15);
      expect(result.fiber).toBe(8);
      expect(result.sugar).toBe(5);
      expect(result.sodium).toBe(250);
      expect(result.cholesterol).toBe(30);
    });

    it('rounds macros to 1 decimal place', () => {
      const nutrition1 = {
        servingSize: '1 serving',
        calories: 100,
        protein: 10.25,
        carbs: 20.33,
        fat: 5.67,
        fiber: 3.11,
        sugar: 2.49,
        sodium: 100,
        cholesterol: 10,
      };

      const nutrition2 = {
        servingSize: '1 serving',
        calories: 100,
        protein: 10.26,
        carbs: 20.34,
        fat: 5.68,
        fiber: 3.12,
        sugar: 2.51,
        sodium: 100,
        cholesterol: 10,
      };

      const result = aggregateNutrition([nutrition1, nutrition2]);
      // Note: Function rounds at each reduce step, causing cumulative rounding
      expect(result.protein).toBe(20.6); // 10.3 + 10.3 (rounded at each step)
      expect(result.carbs).toBe(40.6); // 20.3 + 20.3 (rounded at each step)
      expect(result.fat).toBe(11.4); // 5.7 + 5.7
      expect(result.fiber).toBe(6.2); // 3.1 + 3.1
      expect(result.sugar).toBe(5); // 2.5 + 2.5
    });

    it('sets serving size to "Total"', () => {
      const nutrition = {
        servingSize: '1 serving',
        calories: 200,
        protein: 10,
        carbs: 20,
        fat: 5,
        fiber: 3,
        sugar: 2,
        sodium: 100,
        cholesterol: 10,
      };

      const result = aggregateNutrition([nutrition, nutrition]);
      expect(result.servingSize).toBe('Total');
    });
  });

  describe('calculateEntryNutrition', () => {
    it('calculates nutrition for recipe entry', () => {
      const entry = {
        recipeId: 'recipe-1',
        quantity: 2,
        unit: 'servings',
        servings: 8,
      };

      const result = calculateEntryNutrition(
        entry,
        [mockRecipe],
        [mockIngredient],
        [mockBeverage]
      );

      expect(result.calories).toBeGreaterThan(0);
    });

    it('calculates nutrition for ingredient entry', () => {
      const entry = {
        ingredientId: 'ingredient-1',
        quantity: 100,
        unit: 'g',
      };

      const result = calculateEntryNutrition(
        entry,
        [mockRecipe],
        [mockIngredient],
        [mockBeverage]
      );

      expect(result.calories).toBeGreaterThan(0);
    });

    it('calculates nutrition for beverage entry', () => {
      const entry = {
        beverageId: 'bev_water',
        quantity: 250,
        unit: 'ml',
      };

      const result = calculateEntryNutrition(
        entry,
        [mockRecipe],
        [mockIngredient],
        [mockBeverage]
      );

      expect(result.calories).toBe(0); // Water has 0 calories
    });

    it('returns empty nutrition for unknown entry', () => {
      const entry = {
        recipeId: 'non-existent',
        quantity: 2,
        unit: 'servings',
        servings: 2,
      };

      const result = calculateEntryNutrition(
        entry,
        [mockRecipe],
        [mockIngredient],
        [mockBeverage]
      );

      expect(result.calories).toBe(0);
    });

    it('returns empty nutrition for recipe without servings', () => {
      const entry = {
        recipeId: 'recipe-1',
        quantity: 2,
        unit: 'servings',
        // servings is undefined
      };

      const result = calculateEntryNutrition(
        entry,
        [mockRecipe],
        [mockIngredient],
        [mockBeverage]
      );

      expect(result.calories).toBe(0);
    });
  });

  describe('edge cases and validation', () => {
    it('handles zero multiplier in scaleNutrition', () => {
      const nutrition = {
        servingSize: '100g',
        calories: 200,
        protein: 10,
        carbs: 20,
        fat: 5,
        fiber: 3,
        sugar: 2,
        sodium: 100,
        cholesterol: 10,
      };

      const scaled = scaleNutrition(nutrition, 0);
      expect(scaled.calories).toBe(0);
      expect(scaled.protein).toBe(0);
    });

    it('handles negative values gracefully', () => {
      const nutrition = {
        servingSize: '100g',
        calories: 200,
        protein: 10,
        carbs: 20,
        fat: 5,
        fiber: 3,
        sugar: 2,
        sodium: 100,
        cholesterol: 10,
      };

      // Negative multiplier shouldn't happen in practice, but test it anyway
      const scaled = scaleNutrition(nutrition, -1);
      expect(scaled.calories).toBe(-200);
    });

    it('handles very small quantities', () => {
      const result = estimateIngredientNutrition(mockIngredient, 0.1, 'g');
      expect(result.calories).toBeGreaterThanOrEqual(0);
    });

    it('handles very large quantities', () => {
      const result = estimateIngredientNutrition(mockIngredient, 10000, 'g');
      expect(result.calories).toBeGreaterThan(0);
    });
  });
});
