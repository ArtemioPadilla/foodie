/**
 * Pure helpers of the contribute wizard (roadmap Issue 038): message
 * translation for `RecipeSubmissionSchema` issues and validation warnings,
 * step bookkeeping, the per-serving nutrition estimate, the catalog-backed
 * pickers and the preview/submission payload built with `recipe-transform`.
 * No React, no stores — `ContributeWizard` and its tests import this.
 */
import { getTranslated, t, type Locale } from '@/i18n';
import {
  CONTRIBUTE_STEPS,
  SUBMISSION_STEP_FIELDS,
  SUBMISSION_STEP_SCHEMAS,
  type CategoriesFile,
  type ContributeStep,
  type Ingredient,
  type Recipe,
  type RecipeSubmission,
  type SubmissionIngredient,
} from '@/schemas';
import { aggregateNutrition, estimateIngredientNutrition, scaleNutrition } from './nutrition';
import { buildIngredientMeta, cuisineLabels, humanizeId, mealTypeLabel, type IngredientMetaMap } from './recipe-detail';
import { recipeToJson, transformRecipeFormDataToRecipe } from './recipe-transform';
import type { ValidationError, ValidationSummaryWording } from './validation';

// ── Messages ─────────────────────────────────────────────────────────────────

/**
 * `RecipeSubmissionSchema` messages and `getRecipeSubmissionWarnings` texts
 * (English, the legacy wording kept by `validation.ts`) → dictionary keys.
 */
export const SUBMISSION_MESSAGE_KEYS: Readonly<Record<string, string>> = {
  'Recipe name (English) is required': 'contribute.nameRequired',
  'Description must be at least 20 characters': 'contribute.descriptionTooShort',
  'Cuisine is required': 'contribute.cuisineRequired',
  'Difficulty is required': 'contribute.difficultyRequired',
  'Meal type is required': 'contribute.mealTypeRequired',
  'Image URL is not valid': 'contribute.invalidImageUrl',
  'Prep time must be greater than 0': 'contribute.prepTimeRequired',
  'Cook time must be greater than 0': 'contribute.cookTimeRequired',
  'Rest time cannot be negative': 'contribute.restTimeInvalid',
  'Servings must be at least 1': 'contribute.servingsRequired',
  'At least one ingredient is required': 'contribute.ingredientsRequired',
  'Name is required': 'contribute.ingredientNameRequired',
  'Quantity must be greater than 0': 'contribute.ingredientQuantityRequired',
  'Unit is required': 'contribute.ingredientUnitRequired',
  'At least one instruction step is required': 'contribute.instructionsRequired',
  'Instruction must be at least 10 characters': 'contribute.instructionTooShort',
  'Value cannot be negative': 'contribute.nutritionNegative',
  'Recipe name is quite long. Consider shortening it.': 'contribute.warningLongName',
  'Total time exceeds 12 hours. Is this correct?': 'contribute.warningLongTotalTime',
  'Calories per serving seems high. Please verify.': 'contribute.warningHighCalories',
  'Protein per serving seems high. Please verify.': 'contribute.warningHighProtein',
  'Sodium per serving exceeds daily recommended limit.': 'contribute.warningHighSodium',
};

/** A schema/warning message in `lang`; anything unmapped reads "Please enter a valid value". */
export function translateSubmissionMessage(lang: Locale, message: string): string {
  return t(lang, SUBMISSION_MESSAGE_KEYS[message] ?? 'contribute.invalidValue');
}

const ITEM_FIELD = /^(ingredients|instructions)\[(\d+)\]/;

/** One `validation.ts` error/warning in `lang`, keeping the "Ingredient #2:" / "Step #1:" prefix. */
export function translateValidationError(lang: Locale, error: Pick<ValidationError, 'field' | 'message'>): string {
  const item = ITEM_FIELD.exec(error.field);
  if (!item) return translateSubmissionMessage(lang, error.message);
  const message = translateSubmissionMessage(lang, error.message.replace(/^(Ingredient|Step) #\d+: /, ''));
  const key = item[1] === 'ingredients' ? 'contribute.ingredientItemError' : 'contribute.stepItemError';
  return t(lang, key, { number: Number(item[2]) + 1, message });
}

/** `getValidationSummary` wording in `lang`. */
export function validationSummaryWording(lang: Locale): ValidationSummaryWording {
  return {
    allPassed: t(lang, 'contribute.validationSuccess'),
    errors: (count) => t(lang, 'contribute.validationErrors', { count }),
    warnings: (count) => t(lang, 'contribute.validationWarnings', { count }),
    separator: ' · ',
  };
}

// ── Steps ────────────────────────────────────────────────────────────────────

/** Dictionary key of each step's label (`contribute.basicInfo` …). */
export const STEP_LABEL_KEYS: Readonly<Record<ContributeStep, string>> = {
  basic: 'contribute.basicInfo',
  timings: 'contribute.timings',
  ingredients: 'contribute.ingredients',
  instructions: 'contribute.instructions',
  nutrition: 'contribute.nutrition',
  preview: 'contribute.preview',
  submit: 'contribute.submit',
};

export function stepIndex(step: ContributeStep): number {
  return CONTRIBUTE_STEPS.indexOf(step);
}

/**
 * The editing step that owns a validation `field` (`ingredients[0].unit` →
 * `ingredients`; the `timings` warning → `timings`), for the preview's
 * "Edit" links. `undefined` for anything else.
 */
export function stepOfField(field: string): ContributeStep | undefined {
  const root = field.split(/[.[]/)[0] ?? '';
  if (root === 'timings') return 'timings';
  for (const [step, fields] of Object.entries(SUBMISSION_STEP_FIELDS)) {
    if ((fields as ReadonlyArray<string>).includes(root)) return step as ContributeStep;
  }
  return undefined;
}

/**
 * Where a restored draft may resume: `savedStep`, unless an earlier editing
 * step no longer validates (e.g. the draft was saved mid-way), in which case
 * the first such step — the wizard never shows a step it could not reach.
 */
export function resumeStep(data: unknown, savedStep: number): number {
  const last = Math.min(Math.max(0, Math.trunc(savedStep)), CONTRIBUTE_STEPS.length - 1);
  for (let index = 0; index < last; index += 1) {
    const step = CONTRIBUTE_STEPS[index]!;
    if (step === 'preview' || step === 'submit') break;
    if (!SUBMISSION_STEP_SCHEMAS[step].safeParse(data).success) return index;
  }
  return last;
}

// ── Pickers ──────────────────────────────────────────────────────────────────

/** Units offered for an ingredient line (all have a `units.*` label). */
export const CONTRIBUTE_UNITS = [
  'piece',
  'whole',
  'g',
  'kg',
  'lb',
  'oz',
  'cup',
  'tbsp',
  'tsp',
  'ml',
  'l',
  'clove',
  'slice',
  'leaf',
  'bunch',
  'pinch',
  'can',
  'head',
  'stick',
] as const;

/** Cuisines offered when the catalog taxonomy is unavailable (the `categories.json` ids). */
export const FALLBACK_CUISINES = [
  'american',
  'asian',
  'french',
  'greek',
  'indian',
  'italian',
  'japanese',
  'mediterranean',
  'mexican',
  'middle-eastern',
  'thai',
] as const;

export type PickerOption = { value: string; label: string };

/** Catalog cuisines (or the fallback ids) with localised labels, sorted by label. */
export function cuisineOptions(categories: Pick<CategoriesFile, 'cuisines'>, lang: Locale): PickerOption[] {
  const source = categories.cuisines.length
    ? categories.cuisines.map((c) => ({ value: c.id, label: getTranslated(c.name, lang) }))
    : FALLBACK_CUISINES.map((id) => ({ value: id, label: humanizeId(id).replace(/^\w/, (c) => c.toUpperCase()) }));
  return source.sort((a, b) => a.label.localeCompare(b.label, lang));
}

/** Catalog meal types in catalog order (humanised ids when the taxonomy is missing). */
export function mealTypeOptions(
  categories: Pick<CategoriesFile, 'mealTypes'>,
  lang: Locale,
  ids: ReadonlyArray<string>,
): PickerOption[] {
  return ids.map((id) => {
    const category = categories.mealTypes.find((c) => c.id === id);
    return { value: id, label: category ? getTranslated(category.name, lang) : humanizeId(id) };
  });
}

/**
 * Catalog ingredients as combobox options, sorted by localised name. Names
 * that collide get the id appended so every label maps back to one id.
 */
export function ingredientOptions(ingredients: ReadonlyArray<Pick<Ingredient, 'id' | 'name'>>, lang: Locale): PickerOption[] {
  const counts = new Map<string, number>();
  for (const ingredient of ingredients) {
    const label = getTranslated(ingredient.name, lang);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return ingredients
    .map((ingredient) => {
      const label = getTranslated(ingredient.name, lang);
      return { value: ingredient.id, label: (counts.get(label) ?? 0) > 1 ? `${label} (${ingredient.id})` : label };
    })
    .sort((a, b) => a.label.localeCompare(b.label, lang));
}

// ── Nutrition estimate ───────────────────────────────────────────────────────

export type SubmissionNutrition = Pick<
  RecipeSubmission,
  'calories' | 'protein' | 'carbohydrates' | 'fat' | 'fiber' | 'sodium' | 'sugar'
>;

/**
 * Per-serving estimate from the catalog category of every ingredient line
 * (`estimateIngredientNutrition`), divided by `servings`. `null` when no line
 * resolves to a catalog ingredient with a positive quantity.
 */
export function estimateSubmissionNutrition(
  lines: ReadonlyArray<Pick<SubmissionIngredient, 'ingredientId' | 'quantity' | 'unit'>>,
  catalog: ReadonlyArray<Pick<Ingredient, 'id' | 'category'>>,
  servings: number,
): SubmissionNutrition | null {
  const byId = new Map(catalog.map((ingredient) => [ingredient.id, ingredient]));
  const parts = lines.flatMap((line) => {
    const ingredient = byId.get(line.ingredientId);
    if (!ingredient || !(line.quantity > 0)) return [];
    return [estimateIngredientNutrition(ingredient, line.quantity, line.unit)];
  });
  if (parts.length === 0) return null;
  const perServing = scaleNutrition(aggregateNutrition(parts), 1 / Math.max(1, Math.round(servings) || 1));
  return {
    calories: perServing.calories,
    protein: perServing.protein,
    carbohydrates: perServing.carbs,
    fat: perServing.fat,
    fiber: perServing.fiber,
    sodium: perServing.sodium,
    sugar: perServing.sugar,
  };
}

// ── Preview + submission payload ─────────────────────────────────────────────

export type SubmissionCatalog = {
  ingredients: ReadonlyArray<Ingredient>;
  categories: Pick<CategoriesFile, 'cuisines' | 'mealTypes'>;
};

/**
 * What the Submit step hands to the sending flow (roadmap Issue 039): the
 * validated form, the catalog `Recipe` it becomes, its id and pretty JSON.
 */
export type RecipeSubmissionPayload = {
  submission: RecipeSubmission;
  recipe: Recipe;
  recipeId: string;
  recipeJson: string;
};

export function buildSubmissionPayload(
  submission: RecipeSubmission,
  catalog: Pick<SubmissionCatalog, 'ingredients'>,
  now: Date = new Date(),
): RecipeSubmissionPayload {
  const recipe = transformRecipeFormDataToRecipe(submission, { now, ingredients: catalog.ingredients });
  return { submission, recipe, recipeId: recipe.id, recipeJson: recipeToJson(recipe) };
}

/** Everything the preview needs to render the public detail page's components. */
export type SubmissionPreview = {
  /** The recipe as the page renders it (an off-site image is swapped for the placeholder art). */
  recipe: Recipe;
  ingredientMeta: IngredientMetaMap;
  cuisineNames: string[];
  mealTypeName: string;
  /** The contributor's off-site image URL, which the site's CSP will not load in the preview. */
  externalImageUrl?: string;
};

export function buildSubmissionPreview(
  payload: Pick<RecipeSubmissionPayload, 'recipe'>,
  catalog: SubmissionCatalog,
  lang: Locale,
): SubmissionPreview {
  const { recipe } = payload;
  const external = recipe.imageUrl && /^https?:\/\//i.test(recipe.imageUrl) ? recipe.imageUrl : undefined;
  return {
    recipe: external ? { ...recipe, imageUrl: undefined } : recipe,
    ingredientMeta: buildIngredientMeta(recipe, catalog.ingredients, lang),
    cuisineNames: cuisineLabels(recipe, catalog.categories.cuisines, lang),
    mealTypeName: mealTypeLabel(recipe, catalog.categories.mealTypes, lang),
    externalImageUrl: external,
  };
}
