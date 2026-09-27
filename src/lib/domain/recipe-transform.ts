/**
 * Contribution form → catalog `Recipe` (roadmap Issue 014, port of legacy
 * `services/recipeTransformService.ts`). Reads `RecipeSubmission` from
 * `@/schemas/recipe-submission` instead of the wizard component, so this
 * module has no UI import.
 */
import type {
  DietaryLabels,
  MultiLangText,
  NutritionInfo,
  Recipe,
  RecipeIngredient,
  RecipeInstruction,
  RecipeSubmission,
} from '@/schemas';
import { toDateKey } from '@/lib/format-date';

/** `"Grandma's Paella!"` → `grandmas-paella-<base36 timestamp>`. */
export function generateRecipeId(nameEn: string, now: number = Date.now()): string {
  const slug = nameEn
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug}-${now.toString(36)}`;
}

/** Missing translations fall back to English so the result satisfies `MultiLangTextSchema`. */
export function createMultiLangText(en: string, es?: string, fr?: string): MultiLangText {
  return { en: en || '', es: es || en || '', fr: fr || en || '' };
}

const MEAT = ['chicken', 'beef', 'pork', 'fish', 'lamb', 'turkey'];
const DAIRY = ['milk', 'cheese', 'butter', 'cream', 'yogurt'];
const GLUTEN = ['flour', 'bread', 'pasta', 'wheat'];

/**
 * Keyword heuristics over ingredient ids (the legacy behaviour). `lowCarb`/
 * `keto` stay false: they need a nutrition analysis the form does not provide.
 */
export function determineDietaryLabels(
  ingredients: ReadonlyArray<RecipeIngredient>,
): DietaryLabels {
  const ids = ingredients.map((i) => i.ingredientId.toLowerCase());
  const has = (keywords: string[]) => ids.some((id) => keywords.some((k) => id.includes(k)));
  const hasMeat = has(MEAT);
  const hasDairy = has(DAIRY);
  const hasEggs = has(['egg']);
  const hasGluten = has(GLUTEN);
  return {
    glutenFree: !hasGluten,
    vegetarian: !hasMeat,
    vegan: !hasMeat && !hasDairy && !hasEggs,
    dairyFree: !hasDairy,
    lowCarb: false,
    keto: false,
    paleo: !hasDairy && !hasGluten,
  };
}

export function totalTimeOf(formData: RecipeSubmission): number {
  return formData.prepTime + formData.cookTime + (formData.restTime ?? 0);
}

/** Meal type, difficulty, dietary and time-based tags. */
export function generateTags(formData: RecipeSubmission, dietaryLabels: DietaryLabels): string[] {
  const tags: string[] = [formData.mealType, formData.difficulty];
  if (dietaryLabels.vegetarian) tags.push('vegetarian');
  if (dietaryLabels.vegan) tags.push('vegan');
  if (dietaryLabels.glutenFree) tags.push('gluten-free');
  if (dietaryLabels.dairyFree) tags.push('dairy-free');
  if (dietaryLabels.paleo) tags.push('paleo');
  const totalTime = totalTimeOf(formData);
  if (totalTime <= 30) tags.push('quick');
  if (totalTime <= 15) tags.push('fast');
  if (formData.servings >= 6) tags.push('large-batch');
  return tags;
}

function createNutritionInfo(formData: RecipeSubmission): NutritionInfo {
  return {
    servingSize: `1/${formData.servings} recipe`,
    calories: formData.calories ?? 0,
    protein: formData.protein ?? 0,
    carbs: formData.carbohydrates ?? 0,
    fat: formData.fat ?? 0,
    fiber: formData.fiber ?? 0,
    sugar: formData.sugar ?? 0,
    sodium: formData.sodium ?? 0,
    cholesterol: 0, // not collected by the form
  };
}

function createInstructions(instructions: ReadonlyArray<string>): RecipeInstruction[] {
  return instructions.map((text, index) => ({ step: index + 1, text: createMultiLangText(text) }));
}

const EQUIPMENT_KEYWORDS = [
  'pan',
  'pot',
  'skillet',
  'bowl',
  'oven',
  'stove',
  'blender',
  'mixer',
  'whisk',
  'spatula',
  'knife',
  'cutting board',
  'baking sheet',
  'dutch oven',
  'saucepan',
  'wok',
  'grill',
  'microwave',
  'food processor',
];

/** Equipment keywords mentioned anywhere in the instructions (first-mention order). */
export function extractEquipment(instructions: ReadonlyArray<string>): string[] {
  const found = new Set<string>();
  for (const instruction of instructions) {
    const lower = instruction.toLowerCase();
    for (const item of EQUIPMENT_KEYWORDS) if (lower.includes(item)) found.add(item);
  }
  return [...found];
}

export type TransformOptions = {
  author?: string;
  /** Injected for deterministic ids/dates in tests. */
  now?: Date;
};

/** Build a catalog `Recipe` from a (validated) submission. */
export function transformRecipeFormDataToRecipe(
  formData: RecipeSubmission,
  options: TransformOptions | string = {},
): Recipe {
  const { author, now = new Date() } = typeof options === 'string' ? { author: options } : options;
  const dietaryLabels = determineDietaryLabels(formData.ingredients);
  return {
    id: generateRecipeId(formData.nameEn, now.getTime()),
    name: createMultiLangText(formData.nameEn, formData.nameEs, formData.nameFr),
    description: createMultiLangText(
      formData.descriptionEn,
      formData.descriptionEs,
      formData.descriptionFr,
    ),
    type: formData.mealType,
    cuisine: [formData.cuisine],
    prepTime: formData.prepTime,
    cookTime: formData.cookTime,
    totalTime: totalTimeOf(formData),
    servings: formData.servings,
    difficulty: formData.difficulty,
    tags: generateTags(formData, dietaryLabels),
    dietaryLabels,
    nutrition: createNutritionInfo(formData),
    ingredients: formData.ingredients,
    instructions: createInstructions(formData.instructions),
    equipment: extractEquipment(formData.instructions),
    imageUrl: formData.imageUrl || undefined,
    author: author || 'Community Contributor',
    dateAdded: toDateKey(now),
    rating: 0,
    reviewCount: 0,
  };
}

export function recipeToJson(recipe: Recipe, pretty = true): string {
  return pretty ? JSON.stringify(recipe, null, 2) : JSON.stringify(recipe);
}

/** Transform + serialise in one go (what the submit step hands to the PR/issue flow). */
export function transformAndSerializeRecipe(
  formData: RecipeSubmission,
  options: TransformOptions | string = {},
  pretty = true,
): { recipeId: string; recipeJson: string; recipe: Recipe } {
  const recipe = transformRecipeFormDataToRecipe(formData, options);
  return { recipeId: recipe.id, recipeJson: recipeToJson(recipe, pretty), recipe };
}
