/**
 * Schema-valid fixtures for store / domain tests (port of legacy
 * `tests/mocks/mockData.ts`, trimmed to what the Phase 1 tests need).
 */
import {
  BeverageSchema,
  MealPlanSchema,
  NutritionInfoSchema,
  RecipeSchema,
  TrackingEntrySchema,
  type Beverage,
  type MealPlan,
  type NutritionInfo,
  type Recipe,
  type TrackingEntry,
} from '@/schemas';

export const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export function makeNutrition(overrides: Partial<NutritionInfo> = {}): NutritionInfo {
  return NutritionInfoSchema.parse({
    servingSize: '1 serving',
    calories: 500,
    protein: 25,
    carbs: 60,
    fat: 15,
    fiber: 8,
    sugar: 5,
    sodium: 400,
    cholesterol: 0,
    ...overrides,
  });
}

export function makeRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return RecipeSchema.parse({
    id: 'rec_001',
    name: { en: 'Scrambled Eggs', es: 'Huevos Revueltos', fr: 'Œufs Brouillés' },
    description: { en: 'Fluffy eggs', es: 'Huevos esponjosos', fr: 'Œufs moelleux' },
    type: 'breakfast',
    cuisine: ['american'],
    prepTime: 5,
    cookTime: 5,
    totalTime: 10,
    servings: 2,
    difficulty: 'easy',
    tags: ['vegetarian'],
    dietaryLabels: {
      glutenFree: true,
      vegetarian: true,
      vegan: false,
      dairyFree: false,
      lowCarb: true,
      keto: false,
      paleo: false,
    },
    nutrition: makeNutrition(),
    ingredients: [
      { ingredientId: 'ing_001', quantity: 4, unit: 'piece', optional: false },
      { ingredientId: 'ing_002', quantity: 30, unit: 'ml', optional: false },
    ],
    instructions: [{ step: 1, text: { en: 'Whisk', es: 'Batir', fr: 'Fouetter' } }],
    equipment: ['pan'],
    dateAdded: '2025-01-01',
    rating: 4.5,
    reviewCount: 10,
    ...overrides,
  });
}

export function makePlan(overrides: Partial<MealPlan> = {}): MealPlan {
  return MealPlanSchema.parse({
    id: 'plan_fixture',
    name: { en: 'Fixture Plan', es: 'Plan de prueba', fr: 'Plan de test' },
    description: { en: '', es: '', fr: '' },
    servings: 2,
    dietaryRestrictions: [],
    difficulty: 'easy',
    estimatedCost: 0,
    currency: 'USD',
    days: WEEKDAYS.map((dayName, i) => ({ dayNumber: i + 1, dayName, meals: {} })),
    tags: [],
    isPublic: false,
    ...overrides,
  });
}

export function makeEntry(overrides: Partial<TrackingEntry> = {}): TrackingEntry {
  return TrackingEntrySchema.parse({
    id: 'entry-1',
    date: '2025-01-25',
    time: '12:00:00',
    mealType: 'lunch',
    recipeId: 'recipe-1',
    quantity: 2,
    unit: 'servings',
    servings: 2,
    nutrition: makeNutrition(),
    loggedAt: '2025-01-25T12:00:00.000Z',
    ...overrides,
  });
}

export const mockBeverage: Beverage = BeverageSchema.parse({
  id: 'bev_water',
  name: { en: 'Water', es: 'Agua', fr: 'Eau' },
  category: 'water',
  nutrition: makeNutrition({
    servingSize: '250ml',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
  }),
  defaultUnit: 'ml',
  defaultQuantity: 250,
  isAlcoholic: false,
});

export const mockBeverages: Beverage[] = [
  mockBeverage,
  BeverageSchema.parse({
    ...mockBeverage,
    id: 'bev_coffee',
    name: { en: 'Coffee', es: 'Café', fr: 'Café' },
    category: 'coffee',
    nutrition: makeNutrition({
      servingSize: '240ml',
      calories: 2,
      protein: 0.3,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 5,
    }),
    caffeine: 95,
  }),
];
