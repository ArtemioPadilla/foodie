import { describe, expect, it } from 'vitest';
import { RecipeSchema } from '@/schemas';
import { makeRecipeSubmission } from '@/tests/fixtures/foodie-domain';
import {
  createMultiLangText,
  determineDietaryLabels,
  extractEquipment,
  generateRecipeId,
  generateTags,
  recipeToJson,
  transformAndSerializeRecipe,
  transformRecipeFormDataToRecipe,
} from './recipe-transform';

const now = new Date(2025, 0, 25, 10, 0, 0);
const form = makeRecipeSubmission({
  nameEn: "Grandma's Chicken Pasta!",
  nameEs: '',
  instructions: [
    'Boil the pasta in a large pot of salted water.',
    'Sear the chicken in a hot skillet, then combine.',
  ],
  ingredients: [
    { ingredientId: 'chicken-breast', quantity: 2, unit: 'piece', optional: false },
    { ingredientId: 'pasta-penne', quantity: 200, unit: 'g', optional: false },
    { ingredientId: 'parmesan-cheese', quantity: 30, unit: 'g', optional: true },
  ],
});

describe('generateRecipeId', () => {
  it('slugifies the English name and appends a base-36 timestamp', () => {
    expect(generateRecipeId("Grandma's Chicken  Pasta!", 1_000_000)).toBe(
      `grandmas-chicken-pasta-${(1_000_000).toString(36)}`,
    );
  });

  it('strips leading/trailing hyphens', () => {
    expect(generateRecipeId('  --Tacos-- ', 1)).toBe('tacos-1');
  });
});

describe('createMultiLangText', () => {
  it('falls back to English for missing translations', () => {
    expect(createMultiLangText('Eggs', '', undefined)).toEqual({
      en: 'Eggs',
      es: 'Eggs',
      fr: 'Eggs',
    });
    expect(createMultiLangText('Eggs', 'Huevos', 'Œufs')).toEqual({
      en: 'Eggs',
      es: 'Huevos',
      fr: 'Œufs',
    });
  });
});

describe('determineDietaryLabels', () => {
  it('derives labels from ingredient-id keywords', () => {
    expect(determineDietaryLabels(form.ingredients)).toEqual({
      glutenFree: false,
      vegetarian: false,
      vegan: false,
      dairyFree: false,
      lowCarb: false,
      keto: false,
      paleo: false,
    });
    expect(
      determineDietaryLabels([
        { ingredientId: 'tomato', quantity: 1, unit: 'piece', optional: false },
      ]),
    ).toMatchObject({
      vegan: true,
      vegetarian: true,
      glutenFree: true,
      dairyFree: true,
      paleo: true,
    });
  });
});

describe('generateTags', () => {
  it('adds meal type, difficulty, dietary and time/servings tags', () => {
    const quick = makeRecipeSubmission({
      prepTime: 5,
      cookTime: 10,
      servings: 6,
      ingredients: [{ ingredientId: 'tomato', quantity: 1, unit: 'piece', optional: false }],
    });
    expect(generateTags(quick, determineDietaryLabels(quick.ingredients))).toEqual([
      'dinner',
      'easy',
      'vegetarian',
      'vegan',
      'gluten-free',
      'dairy-free',
      'paleo',
      'quick',
      'fast',
      'large-batch',
    ]);
  });
});

describe('extractEquipment', () => {
  it('lists mentioned equipment once, in first-mention order', () => {
    expect(extractEquipment(form.instructions)).toEqual(['pot', 'skillet']);
    expect(extractEquipment(['Use a pan. Then another pan and a bowl.'])).toEqual(['pan', 'bowl']);
  });
});

describe('transformRecipeFormDataToRecipe', () => {
  it('produces a catalog-valid Recipe', () => {
    const recipe = transformRecipeFormDataToRecipe(form, { author: 'Ana', now });
    expect(RecipeSchema.safeParse(recipe).success).toBe(true);
    expect(recipe).toMatchObject({
      id: `grandmas-chicken-pasta-${now.getTime().toString(36)}`,
      name: {
        en: "Grandma's Chicken Pasta!",
        es: "Grandma's Chicken Pasta!",
        fr: 'Recette de Test',
      },
      type: 'dinner',
      cuisine: ['american'],
      totalTime: 45,
      servings: 4,
      author: 'Ana',
      dateAdded: '2025-01-25',
      rating: 0,
      reviewCount: 0,
      equipment: ['pot', 'skillet'],
      imageUrl: undefined,
    });
    expect(recipe.instructions).toEqual([
      { step: 1, text: createMultiLangText(form.instructions[0]!) },
      { step: 2, text: createMultiLangText(form.instructions[1]!) },
    ]);
    expect(recipe.nutrition).toMatchObject({
      servingSize: '1/4 recipe',
      calories: 200,
      protein: 10,
      carbs: 30,
      fat: 5,
      cholesterol: 0,
    });
  });

  it('defaults the author and accepts the legacy positional author string', () => {
    expect(transformRecipeFormDataToRecipe(form).author).toBe('Community Contributor');
    expect(transformRecipeFormDataToRecipe(form, 'Luis').author).toBe('Luis');
  });

  it('includes restTime in totalTime and keeps a provided image URL', () => {
    const recipe = transformRecipeFormDataToRecipe(
      { ...form, restTime: 15, imageUrl: 'https://img.test/a.jpg' },
      { now },
    );
    expect(recipe.totalTime).toBe(60);
    expect(recipe.imageUrl).toBe('https://img.test/a.jpg');
  });
});

describe('recipeToJson / transformAndSerializeRecipe', () => {
  it('serialises pretty by default and compact on request', () => {
    const { recipe, recipeId, recipeJson } = transformAndSerializeRecipe(form, { now });
    expect(recipeId).toBe(recipe.id);
    expect(recipeJson).toBe(JSON.stringify(recipe, null, 2));
    expect(recipeToJson(recipe, false)).toBe(JSON.stringify(recipe));
    expect(JSON.parse(recipeJson)).toEqual(recipe);
  });
});
