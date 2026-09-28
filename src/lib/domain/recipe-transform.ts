/**
 * Contribution form → catalog `Recipe` (roadmap Issue 014, port of legacy
 * `services/recipeTransformService.ts`). Reads `RecipeSubmission` from
 * `@/schemas/recipe-submission` instead of the wizard component, so this
 * module has no UI import.
 */
import type {
  DietaryLabels,
  Ingredient,
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

/** The catalog facts `determineDietaryLabels` can use for an ingredient id. */
export type DietaryCatalogIngredient = Pick<Ingredient, 'id' | 'tags'>;

/**
 * Dietary labels of a submission. An ingredient found in `catalog` (the
 * wizard picks catalog ids such as `ing_001`) contributes its own tags; any
 * other id falls back to the legacy keyword heuristics over the id. `lowCarb`/
 * `keto` stay false: they need a nutrition analysis the form does not provide.
 */
export function determineDietaryLabels(
  ingredients: ReadonlyArray<RecipeIngredient>,
  catalog: ReadonlyArray<DietaryCatalogIngredient> = [],
): DietaryLabels {
  const byId = new Map(catalog.map((ingredient) => [ingredient.id, ingredient]));
  const matches = (id: string, keywords: string[]) => keywords.some((k) => id.includes(k));
  let hasMeat = false;
  let hasDairy = false;
  let hasAnimal = false;
  let hasGluten = false;
  for (const line of ingredients) {
    const known = byId.get(line.ingredientId);
    if (known) {
      hasMeat ||= !known.tags.vegetarian;
      hasDairy ||= !known.tags.dairyFree;
      hasAnimal ||= !known.tags.vegan;
      hasGluten ||= !known.tags.glutenFree;
      continue;
    }
    const id = line.ingredientId.toLowerCase();
    hasMeat ||= matches(id, MEAT);
    hasDairy ||= matches(id, DAIRY);
    hasAnimal ||= matches(id, ['egg']);
    hasGluten ||= matches(id, GLUTEN);
  }
  return {
    glutenFree: !hasGluten,
    vegetarian: !hasMeat,
    vegan: !hasMeat && !hasDairy && !hasAnimal,
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

/** Listed equipment first, then the keywords found in the instructions; no duplicates (case-insensitive). */
export function mergeEquipment(listed: ReadonlyArray<string>, extracted: ReadonlyArray<string>): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const item of [...listed, ...extracted]) {
    const value = item.trim();
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    merged.push(value);
  }
  return merged;
}

export type TransformOptions = {
  author?: string;
  /** Catalog ingredients: their dietary tags replace the id keyword heuristics. */
  ingredients?: ReadonlyArray<DietaryCatalogIngredient>;
  /** Injected for deterministic ids/dates in tests. */
  now?: Date;
};

/** Build a catalog `Recipe` from a (validated) submission. */
export function transformRecipeFormDataToRecipe(
  formData: RecipeSubmission,
  options: TransformOptions | string = {},
): Recipe {
  const { author, now = new Date(), ingredients = [] } =
    typeof options === 'string' ? { author: options } : options;
  const dietaryLabels = determineDietaryLabels(formData.ingredients, ingredients);
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
    equipment: mergeEquipment(formData.equipment ?? [], extractEquipment(formData.instructions)),
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
