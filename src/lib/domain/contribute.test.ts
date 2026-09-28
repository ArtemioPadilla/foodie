import { describe, expect, it } from 'vitest';
import { t } from '@/i18n';
import {
  CONTRIBUTE_STEPS,
  EMPTY_RECIPE_SUBMISSION,
  RecipeSubmissionSchema,
  SUBMISSION_STEP_FIELDS,
  SUBMISSION_STEP_SCHEMAS,
  RecipeSubmissionPayloadSchema,
} from '@/schemas';
import { makeIngredient, makeRecipeSubmission } from '@/tests/fixtures/foodie-domain';
import {
  CONTRIBUTE_UNITS,
  SUBMISSION_MESSAGE_KEYS,
  buildSubmissionPayload,
  buildSubmissionPreview,
  cuisineOptions,
  estimateSubmissionNutrition,
  ingredientOptions,
  mealTypeOptions,
  resumeStep,
  stepOfField,
  translateSubmissionMessage,
  translateValidationError,
  validationSummaryWording,
} from './contribute';
import { unitLabel } from './recipe-detail';
import { getRecipeSubmissionWarnings, getValidationSummary, validateRecipeFormData } from './validation';

const chicken = makeIngredient(); // ing_001 · protein · not vegetarian
const spinach = makeIngredient({
  id: 'ing_002',
  name: { en: 'Spinach', es: 'Espinaca', fr: 'Épinard' },
  category: 'vegetables',
  tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true },
});
const catalogIngredients = [chicken, spinach];
const categories = {
  cuisines: [
    { id: 'mexican', name: { en: 'Mexican', es: 'Mexicana', fr: 'Mexicaine' } },
    { id: 'american', name: { en: 'American', es: 'Americana', fr: 'Américaine' } },
  ],
  mealTypes: [{ id: 'dinner', name: { en: 'Dinner', es: 'Cena', fr: 'Dîner' } }],
};

describe('per-step schemas', () => {
  it('pick exactly the fields of each editing step, and together cover the whole submission', () => {
    const covered = Object.values(SUBMISSION_STEP_FIELDS).flat().sort();
    expect(covered).toEqual(Object.keys(RecipeSubmissionSchema.shape).sort());
    for (const [step, fields] of Object.entries(SUBMISSION_STEP_FIELDS)) {
      const schema = SUBMISSION_STEP_SCHEMAS[step as keyof typeof SUBMISSION_STEP_FIELDS];
      expect(Object.keys(schema.shape).sort()).toEqual([...fields].sort());
    }
  });

  it('the empty form fails only the steps that have required fields', () => {
    const failing = CONTRIBUTE_STEPS.filter((step) => !SUBMISSION_STEP_SCHEMAS[step].safeParse(EMPTY_RECIPE_SUBMISSION).success);
    expect(failing).toEqual(['basic', 'timings', 'ingredients', 'instructions', 'preview', 'submit']);
  });

  it('every schema message has a dictionary key in every locale', () => {
    for (const key of Object.values(SUBMISSION_MESSAGE_KEYS)) {
      for (const lang of ['en', 'es', 'fr'] as const) expect(t(lang, key), `${lang}:${key}`).not.toBe(key);
    }
    const messages = RecipeSubmissionSchema.safeParse({
      ...EMPTY_RECIPE_SUBMISSION,
      difficulty: 'x',
      mealType: 'y',
      imageUrl: 'nope',
      restTime: -1,
      calories: -5,
      ingredients: [{ ingredientId: '', quantity: 0, unit: '', optional: false }],
      instructions: ['short'],
    }).error!.issues.map((issue) => issue.message);
    for (const message of messages) expect(SUBMISSION_MESSAGE_KEYS, message).toHaveProperty([message]);
  });
});

describe('translation', () => {
  it('maps schema messages and warnings to the locale, unknown ones to a generic message', () => {
    expect(translateSubmissionMessage('es', 'Cuisine is required')).toBe(t('es', 'contribute.cuisineRequired'));
    expect(translateSubmissionMessage('fr', 'Calories per serving seems high. Please verify.')).toBe(
      t('fr', 'contribute.warningHighCalories'),
    );
    expect(translateSubmissionMessage('en', 'Something else')).toBe('Please enter a valid value');
  });

  it('keeps the item number of list errors', () => {
    const [error] = validateRecipeFormData({
      ...makeRecipeSubmission(),
      ingredients: [
        { ingredientId: 'ing_001', quantity: 1, unit: 'cup', optional: false },
        { ingredientId: 'ing_002', quantity: 1, unit: '', optional: false },
      ],
    }).errors;
    expect(translateValidationError('es', error!)).toBe(`Ingrediente n.º 2: ${t('es', 'contribute.ingredientUnitRequired')}`);
    expect(translateValidationError('en', { field: 'instructions[0]', message: 'Step #1: Instruction must be at least 10 characters' })).toBe(
      'Step #1: Instruction must be at least 10 characters',
    );
  });

  it('summarises with getValidationSummary in the locale', () => {
    const clean = validateRecipeFormData(makeRecipeSubmission());
    expect(getValidationSummary(clean, validationSummaryWording('fr'))).toBe(t('fr', 'contribute.validationSuccess'));
    const mixed = validateRecipeFormData({ ...makeRecipeSubmission({ calories: 2500 }), nameEn: '' });
    expect(getValidationSummary(mixed, validationSummaryWording('en'))).toBe('1 Error(s) · 1 Warning(s)');
    expect(getValidationSummary(mixed)).toBe('1 error(s), 1 warning(s)');
    expect(getRecipeSubmissionWarnings({ calories: 2500 })).toHaveLength(1);
  });
});

describe('steps', () => {
  it('maps a field to the step that edits it', () => {
    expect(stepOfField('nameEn')).toBe('basic');
    expect(stepOfField('ingredients[1].unit')).toBe('ingredients');
    expect(stepOfField('instructions[0]')).toBe('instructions');
    expect(stepOfField('timings')).toBe('timings');
    expect(stepOfField('sodium')).toBe('nutrition');
    expect(stepOfField('nope')).toBeUndefined();
  });

  it('resumes a draft at its step unless an earlier step no longer validates', () => {
    const valid = makeRecipeSubmission();
    expect(resumeStep(valid, 5)).toBe(5);
    expect(resumeStep({ ...valid, instructions: [] }, 5)).toBe(3);
    expect(resumeStep(EMPTY_RECIPE_SUBMISSION, 4)).toBe(0);
    expect(resumeStep(valid, 99)).toBe(CONTRIBUTE_STEPS.length - 1);
    expect(resumeStep(valid, -2)).toBe(0);
  });
});

describe('pickers', () => {
  it('sorts catalog cuisines by localised label, with a fallback list', () => {
    expect(cuisineOptions(categories, 'es').map((o) => o.label)).toEqual(['Americana', 'Mexicana']);
    const fallback = cuisineOptions({ cuisines: [] }, 'en');
    expect(fallback.find((o) => o.value === 'middle-eastern')?.label).toBe('Middle eastern');
  });

  it('labels meal types from the catalog, humanising unknown ids', () => {
    expect(mealTypeOptions(categories, 'fr', ['dinner', 'snack'])).toEqual([
      { value: 'dinner', label: 'Dîner' },
      { value: 'snack', label: 'snack' },
    ]);
  });

  it('gives every ingredient a unique label', () => {
    const twin = makeIngredient({ id: 'ing_900', name: spinach.name });
    const options = ingredientOptions([spinach, chicken, twin], 'en');
    expect(options.map((o) => o.label)).toEqual(['Chicken Breast', 'Spinach (ing_002)', 'Spinach (ing_900)']);
  });

  it('offers only units the dictionary knows', () => {
    for (const unit of CONTRIBUTE_UNITS) expect(unitLabel('es', unit)).not.toBe(`units.${unit}`);
  });
});

describe('estimateSubmissionNutrition', () => {
  it('sums the category profiles and divides by servings', () => {
    // 200 g protein profile (150 kcal/100 g) + 1 cup vegetables (120 g × 25 kcal/100 g) = 330 kcal.
    const estimate = estimateSubmissionNutrition(
      [
        { ingredientId: 'ing_001', quantity: 200, unit: 'g' },
        { ingredientId: 'ing_002', quantity: 1, unit: 'cup' },
        { ingredientId: 'unknown', quantity: 5, unit: 'g' },
      ],
      catalogIngredients,
      2,
    );
    expect(estimate).toMatchObject({ calories: 165, protein: 26.2, carbohydrates: 3, sodium: 66 });
  });

  it('is null when nothing resolves', () => {
    expect(estimateSubmissionNutrition([{ ingredientId: 'x', quantity: 1, unit: 'g' }], catalogIngredients, 4)).toBeNull();
    expect(estimateSubmissionNutrition([{ ingredientId: 'ing_001', quantity: 0, unit: 'g' }], catalogIngredients, 4)).toBeNull();
  });
});

describe('payload + preview', () => {
  const submission = makeRecipeSubmission({
    cuisine: 'mexican',
    imageUrl: 'https://example.com/dish.jpg',
    equipment: ['Dutch oven'],
    ingredients: [
      { ingredientId: 'ing_001', quantity: 2, unit: 'piece', optional: false },
      { ingredientId: 'ing_002', quantity: 1, unit: 'cup', optional: true },
    ],
    instructions: ['Sear the chicken in a skillet until golden.', 'Wilt the spinach in the same pan.'],
  });
  const now = new Date('2026-09-28T12:00:00Z');

  it('builds the catalog recipe with catalog dietary tags and merged equipment', () => {
    const payload = buildSubmissionPayload(submission, { ingredients: catalogIngredients }, now);
    expect(payload.recipeId).toBe(`test-recipe-${now.getTime().toString(36)}`);
    expect(payload.recipe.dietaryLabels).toMatchObject({ vegetarian: false, vegan: false, glutenFree: true, dairyFree: true });
    expect(payload.recipe.equipment).toEqual(['Dutch oven', 'skillet', 'pan']);
    expect(JSON.parse(payload.recipeJson)).toEqual(JSON.parse(JSON.stringify(payload.recipe)));
    // The payload crosses the wizard → issue boundary: it matches its schema.
    expect(RecipeSubmissionPayloadSchema.safeParse(payload).success).toBe(true);
    expect(RecipeSubmissionPayloadSchema.safeParse({ ...payload, recipeId: '' }).success).toBe(false);
  });

  it('resolves names for the page and swaps an off-site image for the placeholder', () => {
    const payload = buildSubmissionPayload(submission, { ingredients: catalogIngredients }, now);
    const preview = buildSubmissionPreview(payload, { ingredients: catalogIngredients, categories }, 'es');
    expect(preview.cuisineNames).toEqual(['Mexicana']);
    expect(preview.mealTypeName).toBe('Cena');
    expect(preview.ingredientMeta['ing_002']).toEqual({ name: 'Espinaca', category: 'vegetables' });
    expect(preview.externalImageUrl).toBe('https://example.com/dish.jpg');
    expect(preview.recipe.imageUrl).toBeUndefined();
    expect(payload.recipe.imageUrl).toBe('https://example.com/dish.jpg');
  });
});
