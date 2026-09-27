/**
 * Foodie domain schemas — behaviour tests (roadmap Issue 010).
 *
 * The full-catalog parse lives in `src/tests/catalog-schema.test.ts`; this file
 * pins the contracts the rest of the app relies on: trilingual text, the
 * browse-state enums, tracking defaults and the "schemas, not interfaces" rule.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_GOALS,
  DEFAULT_PREFERENCES,
  MealPlanSchema,
  MultiLangTextSchema,
  NutritionGoalsSchema,
  RecipeFiltersSchema,
  RecipeSchema,
  SORT_OPTIONS,
  SortOptionSchema,
} from './index';

const schemasDir = resolve(__dirname);

describe('MultiLangTextSchema', () => {
  it('requires en, es and fr', () => {
    expect(MultiLangTextSchema.safeParse({ en: 'a', es: 'b', fr: 'c' }).success).toBe(true);
    expect(MultiLangTextSchema.safeParse({ en: 'a', es: 'b' }).success).toBe(false);
    expect(MultiLangTextSchema.safeParse({ en: 'a', fr: 'c' }).success).toBe(false);
  });

  it('rejects blank translations (validateTranslations.js semantics)', () => {
    expect(MultiLangTextSchema.safeParse({ en: 'a', es: '   ', fr: 'c' }).success).toBe(false);
    expect(MultiLangTextSchema.safeParse({ en: 'a', es: '', fr: 'c' }).success).toBe(false);
  });
});

describe('RecipeSchema', () => {
  const valid = {
    id: 'rec_test',
    name: { en: 'Toast', es: 'Tostada', fr: 'Toast' },
    description: { en: 'Bread', es: 'Pan', fr: 'Pain' },
    type: 'breakfast',
    cuisine: ['international'],
    prepTime: 1,
    cookTime: 2,
    totalTime: 3,
    servings: 1,
    difficulty: 'easy',
    tags: [],
    dietaryLabels: {
      glutenFree: false,
      vegetarian: true,
      vegan: true,
      dairyFree: true,
      lowCarb: false,
      keto: false,
      paleo: false,
    },
    nutrition: {
      servingSize: '1 slice',
      calories: 80,
      protein: 3,
      carbs: 15,
      fat: 1,
      fiber: 1,
      sugar: 1,
      sodium: 150,
      cholesterol: 0,
    },
    ingredients: [{ ingredientId: 'ing_001', quantity: 1, unit: 'slice', optional: false }],
    instructions: [{ step: 1, text: { en: 'Toast it', es: 'Tuéstalo', fr: 'Griller' } }],
    equipment: ['toaster'],
    dateAdded: '2025-01-01',
    rating: 4.5,
    reviewCount: 10,
  };

  it('accepts a minimal recipe without the optional fields', () => {
    expect(RecipeSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects unknown meal types, out-of-range ratings and malformed dates', () => {
    expect(RecipeSchema.safeParse({ ...valid, type: 'brunch' }).success).toBe(false);
    expect(RecipeSchema.safeParse({ ...valid, rating: 6 }).success).toBe(false);
    expect(RecipeSchema.safeParse({ ...valid, dateAdded: '01/15/2025' }).success).toBe(false);
  });

  it('accepts variations and tips when present', () => {
    const withExtras = {
      ...valid,
      tips: { en: 'Butter', es: 'Mantequilla', fr: 'Beurre' },
      variations: [
        {
          name: { en: 'Garlic', es: 'Ajo', fr: 'Ail' },
          changedIngredients: [
            { ingredientId: 'ing_002', quantity: 1, unit: 'clove', optional: true },
          ],
        },
      ],
    };
    expect(RecipeSchema.safeParse(withExtras).success).toBe(true);
  });
});

describe('browse state', () => {
  it('SortOptionSchema is a z.enum covering the new and legacy options', () => {
    for (const opt of SORT_OPTIONS) expect(SortOptionSchema.safeParse(opt).success).toBe(true);
    expect(SortOptionSchema.safeParse('rating-desc').success).toBe(true);
    expect(SortOptionSchema.safeParse('newest').success).toBe(true);
    expect(SortOptionSchema.safeParse('random').success).toBe(false);
  });

  it('RecipeFiltersSchema is a z.object with every field optional', () => {
    expect(RecipeFiltersSchema.safeParse({}).success).toBe(true);
    expect(
      RecipeFiltersSchema.safeParse({ search: 'egg', types: ['breakfast'], maxTime: 30 }).success,
    ).toBe(true);
    expect(RecipeFiltersSchema.safeParse({ maxTime: 'fast' }).success).toBe(false);
  });
});

describe('goals + preferences defaults', () => {
  it('DEFAULT_GOALS matches the legacy TrackingContext defaults', () => {
    expect(DEFAULT_GOALS).toEqual({
      calories: 2000,
      protein: 50,
      carbs: 250,
      fat: 70,
      fiber: 25,
      sodium: 2300,
      sugar: 50,
      water: 2000,
    });
    expect(NutritionGoalsSchema.safeParse(DEFAULT_GOALS).success).toBe(true);
  });

  it('NutritionGoalsSchema keeps sodium/sugar/water optional', () => {
    expect(
      NutritionGoalsSchema.safeParse({
        calories: 1800,
        protein: 60,
        carbs: 200,
        fat: 60,
        fiber: 30,
      }).success,
    ).toBe(true);
  });

  it('DEFAULT_PREFERENCES is valid', () => {
    expect(DEFAULT_PREFERENCES.defaultServings).toBe(2);
    expect(DEFAULT_PREFERENCES.unitSystem).toBe('auto');
  });
});

describe('MealPlanSchema', () => {
  it('accepts the shape legacy createPlan() wrote to localStorage', () => {
    const legacyPlan = {
      id: 'plan_1736899200000',
      name: { en: 'New Plan', es: 'Nuevo Plan', fr: 'Nouveau Plan' },
      description: { en: '', es: '', fr: '' },
      servings: 2,
      dietaryRestrictions: [],
      difficulty: 'easy',
      estimatedCost: 0,
      currency: 'USD',
      days: Array.from({ length: 7 }, (_, i) => ({
        dayNumber: i + 1,
        dayName: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][i],
        meals: i === 0 ? { breakfast: { recipeId: 'rec_001', servings: 2 } } : {},
      })),
      tags: [],
      isPublic: false,
    };
    expect(MealPlanSchema.safeParse(legacyPlan).success).toBe(true);
  });
});

describe('Spec-DD rule: schemas, not interfaces', () => {
  const schemaFiles = readdirSync(schemasDir).filter(
    (f) => f.endsWith('.ts') && !f.endsWith('.test.ts'),
  );

  it('no `interface` declarations in src/schemas', () => {
    for (const file of schemaFiles) {
      const src = readFileSync(resolve(schemasDir, file), 'utf8');
      expect(src, file).not.toMatch(/^\s*(export\s+)?interface\s/m);
    }
  });

  it('src/types/index.ts only re-exports z.infer types from @/schemas', () => {
    const src = readFileSync(resolve(schemasDir, '../types/index.ts'), 'utf8');
    expect(src).not.toMatch(/^\s*(export\s+)?interface\s/m);
    expect(src).not.toMatch(/^\s*(export\s+)?type\s+\w+\s*=/m);
    expect(src).toMatch(/export type \{[\s\S]*\} from '@\/schemas'/);
  });
});
