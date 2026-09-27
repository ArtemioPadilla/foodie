/**
 * Recipe contribution form (roadmap Issue 014) — the legacy `RecipeFormData`
 * interface from `components/contribute/ContributionWizard.tsx`, now a Zod
 * schema so `recipe-transform`/`validation` no longer import from components.
 *
 * Every *error* of the legacy `validateRecipeFormData` is a constraint here
 * (one issue per field, same wording); *warnings* ("calories seem high") are
 * not schema failures and live in `lib/domain/validation.ts`.
 */
import { z } from 'zod';
import { DifficultySchema, MealTypeSchema } from './recipe';

export const SubmissionIngredientSchema = z.object({
  ingredientId: z.string().trim().min(1, 'Name is required'),
  quantity: z.number().positive('Quantity must be greater than 0'),
  unit: z.string().trim().min(1, 'Unit is required'),
  preparation: z.string().optional(),
  optional: z.boolean(),
});
export type SubmissionIngredient = z.infer<typeof SubmissionIngredientSchema>;

/** Optional per-serving macro typed by the contributor. */
const OptionalMacro = z.number().nonnegative().optional();

export const RecipeSubmissionSchema = z.object({
  // Basic info
  nameEn: z.string().trim().min(1, 'Recipe name (English) is required'),
  nameEs: z.string(),
  nameFr: z.string(),
  descriptionEn: z.string().trim().min(20, 'Description must be at least 20 characters'),
  descriptionEs: z.string(),
  descriptionFr: z.string(),
  cuisine: z.string().trim().min(1, 'Cuisine is required'),
  difficulty: DifficultySchema,
  mealType: MealTypeSchema,
  /** Empty string = not provided (the wizard initialises it to `''`). */
  imageUrl: z.union([z.literal(''), z.url('Image URL is not valid')]).optional(),

  // Timings (minutes)
  prepTime: z.number().positive('Prep time must be greater than 0'),
  cookTime: z.number().positive('Cook time must be greater than 0'),
  restTime: z.number().nonnegative().optional(),
  servings: z.number().int().min(1, 'Servings must be at least 1'),

  ingredients: z.array(SubmissionIngredientSchema).min(1, 'At least one ingredient is required'),
  instructions: z
    .array(z.string().trim().min(10, 'Instruction must be at least 10 characters'))
    .min(1, 'At least one instruction step is required'),

  // Nutrition per serving (optional)
  calories: OptionalMacro,
  protein: OptionalMacro,
  carbohydrates: OptionalMacro,
  fat: OptionalMacro,
  fiber: OptionalMacro,
  sodium: OptionalMacro,
  sugar: OptionalMacro,
});
export type RecipeSubmission = z.infer<typeof RecipeSubmissionSchema>;

/** Legacy name, kept so ported code reads the same. */
export type RecipeFormData = RecipeSubmission;

/** What the wizard starts from (legacy `initialFormData`). Not schema-valid on purpose. */
export const EMPTY_RECIPE_SUBMISSION: RecipeSubmission = {
  nameEn: '',
  nameEs: '',
  nameFr: '',
  descriptionEn: '',
  descriptionEs: '',
  descriptionFr: '',
  cuisine: '',
  difficulty: 'medium',
  mealType: 'dinner',
  imageUrl: '',
  prepTime: 0,
  cookTime: 0,
  restTime: undefined,
  servings: 4,
  ingredients: [],
  instructions: [],
};
