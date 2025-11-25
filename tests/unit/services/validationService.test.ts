import { describe, it, expect } from 'vitest';
import { validateRecipeFormData } from '@services/validationService';
import type { RecipeFormData } from '@types';

describe('validationService', () => {
  const validFormData: RecipeFormData = {
    nameEn: 'Test Recipe',
    nameEs: 'Receta de Prueba',
    nameFr: 'Recette de Test',
    descriptionEn: 'A test recipe with sufficient description length for validation',
    descriptionEs: 'Una receta de prueba con suficiente longitud de descripción',
    descriptionFr: 'Une recette de test avec une description suffisamment longue',
    cuisine: 'american',
    mealType: 'dinner',
    difficulty: 'easy',
    prepTime: 15,
    cookTime: 30,
    servings: 4,
    ingredients: [
      { ingredientId: 'ing-1', quantity: 2, unit: 'cup', optional: false },
    ],
    instructions: [
      'Step 1: Preheat the oven to 350°F',
      'Step 2: Mix all ingredients together',
    ],
    calories: 200,
    protein: 10,
    carbohydrates: 30,
    fat: 5,
    imageUrl: '',
  };

  describe('validateRecipeFormData', () => {
    it('validates a correct recipe', () => {
      const result = validateRecipeFormData(validFormData);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('requires recipe name in English', () => {
      const invalid = { ...validFormData, nameEn: '' };
      const result = validateRecipeFormData(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('nameEn');
    });

    it('requires at least one ingredient', () => {
      const invalid = { ...validFormData, ingredients: [] };
      const result = validateRecipeFormData(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'ingredients')).toBe(true);
    });

    it('requires at least one instruction', () => {
      const invalid = { ...validFormData, instructions: [] };
      const result = validateRecipeFormData(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'instructions')).toBe(true);
    });

    it('warns for unusual calorie values', () => {
      const unusual = { ...validFormData, calories: 3000 };
      const result = validateRecipeFormData(unusual);
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('validates prep time is positive', () => {
      const invalid = { ...validFormData, prepTime: -5 };
      const result = validateRecipeFormData(invalid);
      expect(result.valid).toBe(false);
    });

    it('validates servings is positive', () => {
      const invalid = { ...validFormData, servings: 0 };
      const result = validateRecipeFormData(invalid);
      expect(result.valid).toBe(false);
    });
  });
});
