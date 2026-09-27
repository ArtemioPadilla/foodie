import { Recipe, RecipeIngredient, RecipeInstruction, MultiLangText, NutritionInfo, DietaryLabels } from '@/types';
import { RecipeFormData } from '@components/contribute/ContributionWizard';

/**
 * Recipe Transform Service
 * Converts recipe contribution form data to the Recipe JSON format
 */

/**
 * Generate a unique recipe ID from the recipe name
 */
export function generateRecipeId(nameEn: string): string {
  const cleaned = nameEn
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

  // Add timestamp to ensure uniqueness
  const timestamp = Date.now().toString(36);

  return `${cleaned}-${timestamp}`;
}

/**
 * Create multilingual text object
 */
function createMultiLangText(en: string, es?: string, fr?: string): MultiLangText {
  return {
    en: en || '',
    es: es || en || '',
    fr: fr || en || '',
  };
}

/**
 * Determine dietary labels from ingredients and form data
 */
function determineDietaryLabels(
  ingredients: RecipeIngredient[],
  _formData: RecipeFormData
): DietaryLabels {
  // This is a simplified version - in a real app, you'd analyze ingredients
  // against a database to determine dietary compatibility

  const ingredientNames = ingredients.map(i => i.ingredientId.toLowerCase());

  const hasMeat = ingredientNames.some(name =>
    name.includes('chicken') ||
    name.includes('beef') ||
    name.includes('pork') ||
    name.includes('fish') ||
    name.includes('lamb') ||
    name.includes('turkey')
  );

  const hasDairy = ingredientNames.some(name =>
    name.includes('milk') ||
    name.includes('cheese') ||
    name.includes('butter') ||
    name.includes('cream') ||
    name.includes('yogurt')
  );

  const hasEggs = ingredientNames.some(name => name.includes('egg'));

  const hasGluten = ingredientNames.some(name =>
    name.includes('flour') ||
    name.includes('bread') ||
    name.includes('pasta') ||
    name.includes('wheat')
  );

  return {
    glutenFree: !hasGluten,
    vegetarian: !hasMeat,
    vegan: !hasMeat && !hasDairy && !hasEggs,
    dairyFree: !hasDairy,
    lowCarb: false, // Would need nutrition analysis
    keto: false, // Would need nutrition analysis
    paleo: !hasDairy && !hasGluten,
  };
}

/**
 * Generate tags from form data and ingredients
 */
function generateTags(
  formData: RecipeFormData,
  dietaryLabels: DietaryLabels
): string[] {
  const tags: string[] = [];

  // Add meal type
  tags.push(formData.mealType);

  // Add difficulty
  tags.push(formData.difficulty);

  // Add dietary tags
  if (dietaryLabels.vegetarian) tags.push('vegetarian');
  if (dietaryLabels.vegan) tags.push('vegan');
  if (dietaryLabels.glutenFree) tags.push('gluten-free');
  if (dietaryLabels.dairyFree) tags.push('dairy-free');
  if (dietaryLabels.paleo) tags.push('paleo');

  // Add time-based tags
  const totalTime = formData.prepTime + formData.cookTime + (formData.restTime || 0);
  if (totalTime <= 30) tags.push('quick');
  if (totalTime <= 15) tags.push('fast');

  // Add servings tag
  if (formData.servings >= 6) tags.push('large-batch');

  return tags;
}

/**
 * Create nutrition info from form data
 */
function createNutritionInfo(formData: RecipeFormData): NutritionInfo {
  return {
    servingSize: `1/${formData.servings} recipe`,
    calories: formData.calories || 0,
    protein: formData.protein || 0,
    carbs: formData.carbohydrates || 0,
    fat: formData.fat || 0,
    fiber: formData.fiber || 0,
    sugar: formData.sugar || 0,
    sodium: formData.sodium || 0,
    cholesterol: 0, // Not collected in form, default to 0
  };
}

/**
 * Convert form instructions to Recipe instructions
 */
function createInstructions(instructions: string[]): RecipeInstruction[] {
  return instructions.map((text, index) => ({
    step: index + 1,
    text: createMultiLangText(text),
    // time and image are optional and not collected in basic form
  }));
}

/**
 * Extract equipment from instructions (basic implementation)
 */
function extractEquipment(instructions: string[]): string[] {
  const equipment = new Set<string>();
  const equipmentKeywords = [
    'pan', 'pot', 'skillet', 'bowl', 'oven', 'stove', 'blender',
    'mixer', 'whisk', 'spatula', 'knife', 'cutting board', 'baking sheet',
    'dutch oven', 'saucepan', 'wok', 'grill', 'microwave', 'food processor',
  ];

  instructions.forEach(instruction => {
    const lower = instruction.toLowerCase();
    equipmentKeywords.forEach(item => {
      if (lower.includes(item)) {
        equipment.add(item);
      }
    });
  });

  return Array.from(equipment);
}

/**
 * Transform RecipeFormData to Recipe
 */
export function transformRecipeFormDataToRecipe(
  formData: RecipeFormData,
  author?: string
): Recipe {
  const recipeId = generateRecipeId(formData.nameEn);
  const totalTime = formData.prepTime + formData.cookTime + (formData.restTime || 0);
  const dietaryLabels = determineDietaryLabels(formData.ingredients, formData);
  const tags = generateTags(formData, dietaryLabels);

  const recipe: Recipe = {
    id: recipeId,
    name: createMultiLangText(formData.nameEn, formData.nameEs, formData.nameFr),
    description: createMultiLangText(
      formData.descriptionEn,
      formData.descriptionEs,
      formData.descriptionFr
    ),
    type: formData.mealType,
    cuisine: [formData.cuisine],
    prepTime: formData.prepTime,
    cookTime: formData.cookTime,
    totalTime,
    servings: formData.servings,
    difficulty: formData.difficulty,
    tags,
    dietaryLabels,
    nutrition: createNutritionInfo(formData),
    ingredients: formData.ingredients,
    instructions: createInstructions(formData.instructions),
    equipment: extractEquipment(formData.instructions),
    imageUrl: formData.imageUrl || undefined,
    author: author || 'Community Contributor',
    dateAdded: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
    rating: 0, // New recipes start with 0 rating
    reviewCount: 0, // New recipes start with 0 reviews
  };

  return recipe;
}

/**
 * Convert Recipe to formatted JSON string
 */
export function recipeToJson(recipe: Recipe, pretty = true): string {
  if (pretty) {
    return JSON.stringify(recipe, null, 2);
  }
  return JSON.stringify(recipe);
}

/**
 * Transform and serialize recipe form data to JSON
 */
export function transformAndSerializeRecipe(
  formData: RecipeFormData,
  author?: string,
  pretty = true
): { recipeId: string; recipeJson: string; recipe: Recipe } {
  const recipe = transformRecipeFormDataToRecipe(formData, author);
  const recipeJson = recipeToJson(recipe, pretty);

  return {
    recipeId: recipe.id,
    recipeJson,
    recipe,
  };
}

export default {
  generateRecipeId,
  transformRecipeFormDataToRecipe,
  recipeToJson,
  transformAndSerializeRecipe,
};
