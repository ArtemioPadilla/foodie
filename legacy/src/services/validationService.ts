import { Recipe } from '@/types';
import { RecipeFormData } from '@components/contribute/ContributionWizard';

/**
 * Recipe Validation Service
 * Validates recipe data before submission
 */

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Validate recipe form data
 */
export function validateRecipeFormData(formData: RecipeFormData): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Basic Info Validation
  if (!formData.nameEn || formData.nameEn.trim().length === 0) {
    errors.push({
      field: 'nameEn',
      message: 'Recipe name (English) is required',
      severity: 'error',
    });
  }

  if (formData.nameEn && formData.nameEn.length > 100) {
    warnings.push({
      field: 'nameEn',
      message: 'Recipe name is quite long. Consider shortening it.',
      severity: 'warning',
    });
  }

  if (!formData.descriptionEn || formData.descriptionEn.trim().length < 20) {
    errors.push({
      field: 'descriptionEn',
      message: 'Description must be at least 20 characters',
      severity: 'error',
    });
  }

  if (!formData.cuisine) {
    errors.push({
      field: 'cuisine',
      message: 'Cuisine is required',
      severity: 'error',
    });
  }

  // Timings Validation
  if (!formData.prepTime || formData.prepTime <= 0) {
    errors.push({
      field: 'prepTime',
      message: 'Prep time must be greater than 0',
      severity: 'error',
    });
  }

  if (!formData.cookTime || formData.cookTime <= 0) {
    errors.push({
      field: 'cookTime',
      message: 'Cook time must be greater than 0',
      severity: 'error',
    });
  }

  const totalTime = formData.prepTime + formData.cookTime + (formData.restTime || 0);
  if (totalTime > 720) {
    warnings.push({
      field: 'timings',
      message: 'Total time exceeds 12 hours. Is this correct?',
      severity: 'warning',
    });
  }

  if (!formData.servings || formData.servings < 1) {
    errors.push({
      field: 'servings',
      message: 'Servings must be at least 1',
      severity: 'error',
    });
  }

  // Ingredients Validation
  if (!formData.ingredients || formData.ingredients.length === 0) {
    errors.push({
      field: 'ingredients',
      message: 'At least one ingredient is required',
      severity: 'error',
    });
  }

  formData.ingredients.forEach((ingredient, index) => {
    if (!ingredient.ingredientId || ingredient.ingredientId.trim().length === 0) {
      errors.push({
        field: `ingredients[${index}].ingredientId`,
        message: `Ingredient #${index + 1}: Name is required`,
        severity: 'error',
      });
    }

    if (!ingredient.quantity || ingredient.quantity <= 0) {
      errors.push({
        field: `ingredients[${index}].quantity`,
        message: `Ingredient #${index + 1}: Quantity must be greater than 0`,
        severity: 'error',
      });
    }

    if (!ingredient.unit || ingredient.unit.trim().length === 0) {
      errors.push({
        field: `ingredients[${index}].unit`,
        message: `Ingredient #${index + 1}: Unit is required`,
        severity: 'error',
      });
    }
  });

  // Instructions Validation
  if (!formData.instructions || formData.instructions.length === 0) {
    errors.push({
      field: 'instructions',
      message: 'At least one instruction step is required',
      severity: 'error',
    });
  }

  formData.instructions.forEach((instruction, index) => {
    if (!instruction || instruction.trim().length < 10) {
      errors.push({
        field: `instructions[${index}]`,
        message: `Step #${index + 1}: Instruction must be at least 10 characters`,
        severity: 'error',
      });
    }
  });

  // Nutrition Validation (warnings only, since optional)
  if (formData.calories && formData.calories > 2000) {
    warnings.push({
      field: 'calories',
      message: 'Calories per serving seems high. Please verify.',
      severity: 'warning',
    });
  }

  if (formData.protein && formData.protein > 100) {
    warnings.push({
      field: 'protein',
      message: 'Protein per serving seems high. Please verify.',
      severity: 'warning',
    });
  }

  if (formData.sodium && formData.sodium > 2300) {
    warnings.push({
      field: 'sodium',
      message: 'Sodium per serving exceeds daily recommended limit.',
      severity: 'warning',
    });
  }

  // Image URL Validation
  if (formData.imageUrl) {
    try {
      new URL(formData.imageUrl);
    } catch {
      errors.push({
        field: 'imageUrl',
        message: 'Image URL is not valid',
        severity: 'error',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate final Recipe object
 */
export function validateRecipe(recipe: Recipe): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Required fields
  if (!recipe.id) {
    errors.push({
      field: 'id',
      message: 'Recipe ID is required',
      severity: 'error',
    });
  }

  if (!recipe.name.en) {
    errors.push({
      field: 'name.en',
      message: 'Recipe name (English) is required',
      severity: 'error',
    });
  }

  if (!recipe.description.en) {
    errors.push({
      field: 'description.en',
      message: 'Recipe description (English) is required',
      severity: 'error',
    });
  }

  if (recipe.ingredients.length === 0) {
    errors.push({
      field: 'ingredients',
      message: 'At least one ingredient is required',
      severity: 'error',
    });
  }

  if (recipe.instructions.length === 0) {
    errors.push({
      field: 'instructions',
      message: 'At least one instruction is required',
      severity: 'error',
    });
  }

  // Check for reasonable values
  if (recipe.prepTime > 1440 || recipe.cookTime > 1440) {
    warnings.push({
      field: 'timings',
      message: 'Prep or cook time exceeds 24 hours',
      severity: 'warning',
    });
  }

  if (recipe.servings < 1 || recipe.servings > 100) {
    warnings.push({
      field: 'servings',
      message: 'Servings seems unusual',
      severity: 'warning',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate that recipe ID doesn't already exist
 * This would typically check against the repository
 */
export async function validateUniqueRecipeId(
  recipeId: string,
  existingRecipeIds: string[]
): Promise<boolean> {
  return !existingRecipeIds.includes(recipeId);
}

/**
 * Get a summary of validation issues
 */
export function getValidationSummary(result: ValidationResult): string {
  const parts: string[] = [];

  if (result.errors.length > 0) {
    parts.push(`${result.errors.length} error(s)`);
  }

  if (result.warnings.length > 0) {
    parts.push(`${result.warnings.length} warning(s)`);
  }

  if (result.valid && result.warnings.length === 0) {
    return 'All checks passed';
  }

  return parts.join(', ');
}

export default {
  validateRecipeFormData,
  validateRecipe,
  validateUniqueRecipeId,
  getValidationSummary,
};
