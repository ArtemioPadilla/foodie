import { describe, expect, it } from 'vitest';
import { RecipeSubmissionSchema } from '@/schemas';
import { makeRecipe, makeRecipeSubmission } from '@/tests/fixtures/foodie-domain';
import {
  getValidationSummary,
  issuePathToField,
  validateRecipe,
  validateRecipeFormData,
  validateUniqueRecipeId,
} from './validation';

const validFormData = makeRecipeSubmission();

// ── Port of legacy `tests/unit/services/validationService.test.ts` (7) ────────

describe('validateRecipeFormData', () => {
  it('validates a correct recipe', () => {
    const result = validateRecipeFormData(validFormData);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('requires recipe name in English', () => {
    const result = validateRecipeFormData({ ...validFormData, nameEn: '' });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]!.field).toBe('nameEn');
    expect(result.errors[0]!.message).toBe('Recipe name (English) is required');
  });

  it('requires at least one ingredient', () => {
    const result = validateRecipeFormData({ ...validFormData, ingredients: [] });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'ingredients')).toBe(true);
  });

  it('requires at least one instruction', () => {
    const result = validateRecipeFormData({ ...validFormData, instructions: [] });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'instructions')).toBe(true);
  });

  it('warns for unusual calorie values', () => {
    const result = validateRecipeFormData({ ...validFormData, calories: 3000 });
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]!.severity).toBe('warning');
  });

  it('validates prep time is positive', () => {
    expect(validateRecipeFormData({ ...validFormData, prepTime: -5 }).valid).toBe(false);
  });

  it('validates servings is positive', () => {
    expect(validateRecipeFormData({ ...validFormData, servings: 0 }).valid).toBe(false);
  });
});

// ── Thin-layer behaviour over the Zod schema ─────────────────────────────────

describe('validateRecipeFormData (schema mapping)', () => {
  it('is RecipeSubmissionSchema.safeParse: valid ⇔ success', () => {
    const bad = { ...validFormData, cuisine: '' };
    expect(RecipeSubmissionSchema.safeParse(bad).success).toBe(false);
    expect(validateRecipeFormData(bad).valid).toBe(false);
    expect(RecipeSubmissionSchema.safeParse(validFormData).success).toBe(true);
  });

  it('indexes per-item errors and prefixes them like legacy', () => {
    const result = validateRecipeFormData({
      ...validFormData,
      ingredients: [{ ingredientId: '', quantity: 0, unit: 'cup', optional: false }],
      instructions: ['too short'],
    });
    expect(result.errors).toEqual(
      expect.arrayContaining([
        {
          field: 'ingredients[0].ingredientId',
          message: 'Ingredient #1: Name is required',
          severity: 'error',
        },
        {
          field: 'ingredients[0].quantity',
          message: 'Ingredient #1: Quantity must be greater than 0',
          severity: 'error',
        },
        {
          field: 'instructions[0]',
          message: 'Step #1: Instruction must be at least 10 characters',
          severity: 'error',
        },
      ]),
    );
  });

  it('accepts an empty imageUrl but rejects a malformed one', () => {
    expect(validateRecipeFormData({ ...validFormData, imageUrl: '' }).valid).toBe(true);
    expect(
      validateRecipeFormData({ ...validFormData, imageUrl: 'https://example.com/a.jpg' }).valid,
    ).toBe(true);
    const bad = validateRecipeFormData({ ...validFormData, imageUrl: 'not a url' });
    expect(bad.valid).toBe(false);
    expect(bad.errors[0]!.field).toBe('imageUrl');
  });

  it('collects the soft warnings (long name, >12 h, protein, sodium)', () => {
    const result = validateRecipeFormData({
      ...validFormData,
      nameEn: 'x'.repeat(101),
      prepTime: 500,
      cookTime: 300,
      protein: 150,
      sodium: 3000,
    });
    expect(result.valid).toBe(true);
    expect(result.warnings.map((w) => w.field)).toEqual(['nameEn', 'timings', 'protein', 'sodium']);
  });

  it('tolerates garbage input', () => {
    expect(validateRecipeFormData(null).valid).toBe(false);
    expect(validateRecipeFormData(undefined).valid).toBe(false);
  });
});

describe('validateRecipe', () => {
  it('passes a catalog-valid recipe with no warnings', () => {
    expect(validateRecipe(makeRecipe())).toEqual({ valid: true, errors: [], warnings: [] });
  });

  it('maps schema failures to errors', () => {
    const result = validateRecipe({
      ...makeRecipe(),
      ingredients: [],
      name: { en: '', es: '', fr: '' },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.map((e) => e.field)).toEqual(
      expect.arrayContaining(['name.en', 'ingredients']),
    );
  });

  it('warns on unusual timings/servings', () => {
    const result = validateRecipe(makeRecipe({ prepTime: 2000, servings: 150 }));
    expect(result.valid).toBe(true);
    expect(result.warnings.map((w) => w.field)).toEqual(['timings', 'servings']);
  });
});

describe('helpers', () => {
  it('issuePathToField renders indices in brackets', () => {
    expect(issuePathToField(['ingredients', 2, 'unit'])).toBe('ingredients[2].unit');
    expect(issuePathToField(['nameEn'])).toBe('nameEn');
    expect(issuePathToField([])).toBe('');
  });

  it('validateUniqueRecipeId', () => {
    expect(validateUniqueRecipeId('a', ['b'])).toBe(true);
    expect(validateUniqueRecipeId('a', ['a'])).toBe(false);
  });

  it('getValidationSummary', () => {
    expect(getValidationSummary({ valid: true, errors: [], warnings: [] })).toBe(
      'All checks passed',
    );
    const w = { field: 'x', message: 'm', severity: 'warning' as const };
    const e = { field: 'x', message: 'm', severity: 'error' as const };
    expect(getValidationSummary({ valid: true, errors: [], warnings: [w] })).toBe('1 warning(s)');
    expect(getValidationSummary({ valid: false, errors: [e, e], warnings: [w] })).toBe(
      '2 error(s), 1 warning(s)',
    );
  });
});
