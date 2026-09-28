import { describe, expect, it } from 'vitest';
import { DEFAULT_GOALS, type Beverage, type NutritionInfo } from '@/schemas';
import { makeEntry, makeIngredient, makeNutrition, makeRecipe, mockBeverages } from '@/tests/fixtures/foodie-domain';
import {
  aggregateNutrition,
  calculateBeverageNutrition,
  calculateEntryNutrition,
  calculateGoalProgress,
  calculateRecipeNutrition,
  createEmptyNutrition,
  estimateIngredientNutrition,
  scaleNutrition,
} from './nutrition';

describe('createEmptyNutrition', () => {
  it('is all zeros with a 0g serving size', () => {
    expect(createEmptyNutrition()).toEqual({
      servingSize: '0g',
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
      cholesterol: 0,
    });
  });
});

describe('scaleNutrition', () => {
  it('multiplies every macro, rounding kcal/mg to integers and grams to 0.1', () => {
    const scaled = scaleNutrition(makeNutrition({ calories: 333, protein: 10.55, sodium: 101 }), 0.5);
    expect(scaled.calories).toBe(167);
    expect(scaled.protein).toBe(5.3);
    expect(scaled.sodium).toBe(51);
    expect(scaled.servingSize).toBe('1 serving');
  });
});

describe('aggregateNutrition', () => {
  it('returns empty nutrition for an empty list', () => {
    expect(aggregateNutrition([])).toEqual(createEmptyNutrition());
  });

  it('sums every field and labels the serving size "Total"', () => {
    const total = aggregateNutrition([
      makeNutrition({ calories: 500, protein: 25 }),
      makeNutrition({ calories: 300, protein: 20 }),
    ]);
    expect(total.calories).toBe(800);
    expect(total.protein).toBe(45);
    expect(total.sodium).toBe(800);
    expect(total.servingSize).toBe('Total');
  });

  it('keeps grams at one decimal', () => {
    const total = aggregateNutrition([makeNutrition({ fat: 0.1 }), makeNutrition({ fat: 0.2 })]);
    expect(total.fat).toBe(0.3);
  });
});

describe('calculateGoalProgress', () => {
  it('computes consumed / goal / remaining / percentage per metric', () => {
    const progress = calculateGoalProgress(makeNutrition({ calories: 1000, protein: 50 }), DEFAULT_GOALS);
    expect(progress.calories).toEqual({ consumed: 1000, goal: 2000, remaining: 1000, percentage: 50 });
    expect(progress.protein.percentage).toBe(100);
  });

  it('clamps remaining at 0 when over the goal', () => {
    const progress = calculateGoalProgress(makeNutrition({ calories: 2500 }), DEFAULT_GOALS);
    expect(progress.calories.remaining).toBe(0);
    expect(progress.calories.percentage).toBe(125);
  });

  it('reports water only when a water goal exists, using the logged millilitres', () => {
    expect(calculateGoalProgress(makeNutrition(), { ...DEFAULT_GOALS, water: undefined }).water).toBeUndefined();
    expect(calculateGoalProgress(makeNutrition(), DEFAULT_GOALS, 500).water).toEqual({
      consumed: 500,
      goal: 2000,
      remaining: 1500,
      percentage: 25,
    });
  });

  it('yields 0 % when the goal is 0', () => {
    expect(calculateGoalProgress(makeNutrition(), { ...DEFAULT_GOALS, fiber: 0 }).fiber.percentage).toBe(0);
  });
});

// ── Issue 014: port of legacy `tests/unit/utils/nutritionCalculator.test.ts` ──

describe('nutritionCalculator (legacy suite)', () => {
  const mockRecipe = makeRecipe({ id: 'recipe-1' });
  const mockIngredient = makeIngredient({ id: 'ingredient-1', category: 'protein' });
  const [water, coffee] = mockBeverages as [Beverage, Beverage];
  const base = (over: Partial<NutritionInfo> = {}): NutritionInfo => ({
    servingSize: '100g',
    calories: 200,
    protein: 10,
    carbs: 20,
    fat: 5,
    fiber: 3,
    sugar: 2,
    sodium: 100,
    cholesterol: 10,
    ...over,
  });

  describe('createEmptyNutrition', () => {
    it('creates nutrition object with all zeros', () => {
      const empty = createEmptyNutrition();
      for (const key of ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium', 'cholesterol'] as const) {
        expect(empty[key]).toBe(0);
      }
    });

    it('has correct serving size', () => {
      expect(createEmptyNutrition().servingSize).toBe('0g');
    });
  });

  describe('scaleNutrition', () => {
    it('doubles nutrition values when multiplier is 2', () => {
      expect(scaleNutrition(base(), 2)).toEqual(base({ calories: 400, protein: 20, carbs: 40, fat: 10, fiber: 6, sugar: 4, sodium: 200, cholesterol: 20 }));
    });

    it('halves nutrition values when multiplier is 0.5', () => {
      expect(scaleNutrition(base(), 0.5)).toEqual(base({ calories: 100, protein: 5, carbs: 10, fat: 2.5, fiber: 1.5, sugar: 1, sodium: 50, cholesterol: 5 }));
    });

    it('rounds macros to 1 decimal place', () => {
      const scaled = scaleNutrition(base({ calories: 100, protein: 10.25, carbs: 20.67, fat: 5.99, fiber: 3.14, sugar: 2.01 }), 1.33);
      expect(scaled.protein).toBe(13.6);
      expect(scaled.carbs).toBe(27.5);
      expect(scaled.fat).toBe(8);
    });

    it('preserves serving size', () => {
      expect(scaleNutrition(base({ servingSize: '1 cup' }), 2).servingSize).toBe('1 cup');
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
      // 500 ml is 2× the 250 ml default
      expect(calculateBeverageNutrition(coffee, 500, 'ml').calories).toBe(coffee.nutrition.calories * 2);
      expect(calculateBeverageNutrition(coffee, 500, 'ml').sodium).toBe(coffee.nutrition.sodium * 2);
    });

    it('converts oz to ml correctly', () => {
      // 8 oz = 236.6 ml ≈ 1× the default
      expect(calculateBeverageNutrition(coffee, 8, 'oz').calories).toBeCloseTo(coffee.nutrition.calories, 0);
      expect(calculateBeverageNutrition(water, 8, 'oz').calories).toBe(0);
    });

    it('converts cup to ml correctly', () => {
      expect(calculateBeverageNutrition(coffee, 1, 'cup').calories).toBeCloseTo(coffee.nutrition.calories, 0);
    });

    it('converts L to ml correctly', () => {
      expect(calculateBeverageNutrition(coffee, 1, 'l').calories).toBe(coffee.nutrition.calories * 4);
    });
  });

  describe('estimateIngredientNutrition', () => {
    it('estimates nutrition for protein category', () => {
      const result = estimateIngredientNutrition({ category: 'protein' }, 100, 'g');
      expect(result.calories).toBe(150);
      expect(result.protein).toBe(25);
    });

    it('converts kg to grams', () => {
      expect(estimateIngredientNutrition(mockIngredient, 1, 'kg').calories).toBe(1500);
    });

    it('converts lb to grams', () => {
      expect(estimateIngredientNutrition(mockIngredient, 1, 'lb').calories).toBe(Math.round(1.5 * 453.592));
    });

    it('converts oz to grams', () => {
      expect(estimateIngredientNutrition(mockIngredient, 4, 'oz').calories).toBe(Math.round(1.5 * 4 * 28.3495));
    });

    it('converts cup to grams', () => {
      expect(estimateIngredientNutrition(mockIngredient, 1, 'cup').calories).toBe(180); // 120 g
    });

    it('converts tbsp to grams', () => {
      expect(estimateIngredientNutrition(mockIngredient, 2, 'tbsp').calories).toBe(45); // 30 g
    });

    it('converts tsp to grams', () => {
      expect(estimateIngredientNutrition(mockIngredient, 3, 'tsp').calories).toBe(23); // 15 g → 22.5
    });

    it('handles piece unit', () => {
      expect(estimateIngredientNutrition(mockIngredient, 1, 'piece').calories).toBe(225); // 150 g
    });

    it('defaults to vegetables category for unknown category', () => {
      expect(estimateIngredientNutrition({ category: 'unknown-category' }, 100, 'g').calories).toBe(25);
    });
  });

  describe('aggregateNutrition', () => {
    it('returns empty nutrition for empty array', () => {
      const result = aggregateNutrition([]);
      expect(result.calories).toBe(0);
      expect(result.protein).toBe(0);
    });

    it('sums multiple nutrition objects', () => {
      const result = aggregateNutrition([
        base({ servingSize: '1 serving' }),
        base({ servingSize: '1 serving', calories: 300, protein: 15, carbs: 30, fat: 10, fiber: 5, sugar: 3, sodium: 150, cholesterol: 20 }),
      ]);
      expect(result).toEqual({ servingSize: 'Total', calories: 500, protein: 25, carbs: 50, fat: 15, fiber: 8, sugar: 5, sodium: 250, cholesterol: 30 });
    });

    it('rounds macros to 1 decimal place (at each reduce step, as legacy did)', () => {
      const result = aggregateNutrition([
        base({ calories: 100, protein: 10.25, carbs: 20.33, fat: 5.67, fiber: 3.11, sugar: 2.49 }),
        base({ calories: 100, protein: 10.26, carbs: 20.34, fat: 5.68, fiber: 3.12, sugar: 2.51 }),
      ]);
      expect(result.protein).toBe(20.6);
      expect(result.carbs).toBe(40.6);
      expect(result.fat).toBe(11.4);
      expect(result.fiber).toBe(6.2);
      expect(result.sugar).toBe(5);
    });

    it('sets serving size to "Total"', () => {
      expect(aggregateNutrition([base(), base()]).servingSize).toBe('Total');
    });
  });

  describe('calculateEntryNutrition', () => {
    const catalog = [[mockRecipe], [mockIngredient], mockBeverages] as const;

    it('calculates nutrition for recipe entry', () => {
      const result = calculateEntryNutrition({ recipeId: 'recipe-1', quantity: 2, unit: 'servings', servings: 8 }, ...catalog);
      expect(result.calories).toBe(mockRecipe.nutrition.calories * 4);
    });

    it('calculates nutrition for ingredient entry', () => {
      const result = calculateEntryNutrition({ ingredientId: 'ingredient-1', quantity: 100, unit: 'g' }, ...catalog);
      expect(result.calories).toBe(150);
    });

    it('calculates nutrition for beverage entry', () => {
      expect(calculateEntryNutrition({ beverageId: 'bev_water', quantity: 250, unit: 'ml' }, ...catalog).calories).toBe(0);
      expect(calculateEntryNutrition({ beverageId: 'bev_coffee', quantity: 500, unit: 'ml' }, ...catalog).calories).toBe(4);
    });

    it('returns empty nutrition for unknown entry', () => {
      const result = calculateEntryNutrition({ recipeId: 'non-existent', quantity: 2, unit: 'servings', servings: 2 }, ...catalog);
      expect(result).toEqual(createEmptyNutrition());
    });

    it('returns empty nutrition for recipe without servings', () => {
      const result = calculateEntryNutrition({ recipeId: 'recipe-1', quantity: 2, unit: 'servings' }, ...catalog);
      expect(result.calories).toBe(0);
    });

    it('accepts a full TrackingEntry', () => {
      const entry = makeEntry({ recipeId: 'recipe-1', servings: 2 });
      expect(calculateEntryNutrition(entry, ...catalog).calories).toBe(mockRecipe.nutrition.calories);
    });
  });

  describe('edge cases and validation', () => {
    it('handles zero multiplier in scaleNutrition', () => {
      const scaled = scaleNutrition(base(), 0);
      expect(scaled.calories).toBe(0);
      expect(scaled.protein).toBe(0);
    });

    it('handles negative values gracefully', () => {
      expect(scaleNutrition(base(), -1).calories).toBe(-200);
    });

    it('handles very small quantities', () => {
      expect(estimateIngredientNutrition(mockIngredient, 0.1, 'g').calories).toBeGreaterThanOrEqual(0);
    });

    it('handles very large quantities', () => {
      expect(estimateIngredientNutrition(mockIngredient, 10000, 'g').calories).toBe(15000);
    });
  });
});
