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
import { DIFFICULTIES, DifficultySchema, MEAL_TYPES, MealTypeSchema, RecipeSchema } from './recipe';

export const SubmissionIngredientSchema = z.object({
  ingredientId: z.string().trim().min(1, 'Name is required'),
  quantity: z.number('Quantity must be greater than 0').positive('Quantity must be greater than 0'),
  unit: z.string().trim().min(1, 'Unit is required'),
  preparation: z.string().optional(),
  optional: z.boolean(),
});
export type SubmissionIngredient = z.infer<typeof SubmissionIngredientSchema>;

/** Optional per-serving macro typed by the contributor. */
const OptionalMacro = z.number('Value cannot be negative').nonnegative('Value cannot be negative').optional();

export const RecipeSubmissionSchema = z.object({
  // Basic info
  nameEn: z.string().trim().min(1, 'Recipe name (English) is required'),
  nameEs: z.string(),
  nameFr: z.string(),
  descriptionEn: z.string().trim().min(20, 'Description must be at least 20 characters'),
  descriptionEs: z.string(),
  descriptionFr: z.string(),
  cuisine: z.string().trim().min(1, 'Cuisine is required'),
  difficulty: z.enum(DIFFICULTIES, 'Difficulty is required'),
  mealType: z.enum(MEAL_TYPES, 'Meal type is required'),
  /** Empty string = not provided (the wizard initialises it to `''`). */
  imageUrl: z.union([z.literal(''), z.url('Image URL is not valid')]).optional(),

  // Timings (minutes)
  prepTime: z.number('Prep time must be greater than 0').positive('Prep time must be greater than 0'),
  cookTime: z.number('Cook time must be greater than 0').positive('Cook time must be greater than 0'),
  restTime: z.number('Rest time cannot be negative').nonnegative('Rest time cannot be negative').optional(),
  servings: z
    .number('Servings must be at least 1')
    .int('Servings must be at least 1')
    .min(1, 'Servings must be at least 1'),
  /**
   * Equipment the contributor lists explicitly (roadmap Issue 038, "tiempos/
   * porciones/equipo"); merged with the keywords found in the instructions.
   */
  equipment: z.array(z.string().trim().min(1)).optional(),

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
  equipment: [],
  ingredients: [],
  instructions: [],
};

// ── Wizard steps (roadmap Issue 038) ─────────────────────────────────────────

/** The contribution wizard's steps, in order (legacy `ContributionWizard`). */
export const CONTRIBUTE_STEPS = [
  'basic',
  'timings',
  'ingredients',
  'instructions',
  'nutrition',
  'preview',
  'submit',
] as const;
export type ContributeStep = (typeof CONTRIBUTE_STEPS)[number];

/** Which form fields each editing step owns (`preview`/`submit` check them all). */
export const SUBMISSION_STEP_FIELDS = {
  basic: [
    'nameEn',
    'nameEs',
    'nameFr',
    'descriptionEn',
    'descriptionEs',
    'descriptionFr',
    'cuisine',
    'difficulty',
    'mealType',
    'imageUrl',
  ],
  timings: ['prepTime', 'cookTime', 'restTime', 'servings', 'equipment'],
  ingredients: ['ingredients'],
  instructions: ['instructions'],
  nutrition: ['calories', 'protein', 'carbohydrates', 'fat', 'fiber', 'sodium', 'sugar'],
} as const satisfies Record<
  Exclude<ContributeStep, 'preview' | 'submit'>,
  ReadonlyArray<keyof RecipeSubmission>
>;

/** `['a', 'b']` → `{ a: true, b: true }` — a `.pick()` mask. */
function mask<const F extends keyof RecipeSubmission>(fields: ReadonlyArray<F>): { [K in F]: true } {
  return Object.fromEntries(fields.map((field) => [field, true])) as { [K in F]: true };
}

/**
 * Per-step sub-schemas of `RecipeSubmissionSchema`: the wizard validates only
 * the current step's fields before moving on; the preview and submit steps
 * validate the whole submission.
 */
export const SUBMISSION_STEP_SCHEMAS = {
  basic: RecipeSubmissionSchema.pick(mask(SUBMISSION_STEP_FIELDS.basic)),
  timings: RecipeSubmissionSchema.pick(mask(SUBMISSION_STEP_FIELDS.timings)),
  ingredients: RecipeSubmissionSchema.pick(mask(SUBMISSION_STEP_FIELDS.ingredients)),
  instructions: RecipeSubmissionSchema.pick(mask(SUBMISSION_STEP_FIELDS.instructions)),
  nutrition: RecipeSubmissionSchema.pick(mask(SUBMISSION_STEP_FIELDS.nutrition)),
  preview: RecipeSubmissionSchema,
  submit: RecipeSubmissionSchema,
} as const satisfies Record<ContributeStep, z.ZodType>;

// ── Draft (localStorage `foodie:contribute-draft`, ADR 0002) ─────────────────

/**
 * The in-progress form as stored: the same fields as `RecipeSubmission` but
 * with every constraint relaxed (a draft is incomplete by definition). Only
 * the form's own fields are kept — never a contributor name or credential.
 */
export const RecipeSubmissionDraftDataSchema = z.object({
  nameEn: z.string(),
  nameEs: z.string(),
  nameFr: z.string(),
  descriptionEn: z.string(),
  descriptionEs: z.string(),
  descriptionFr: z.string(),
  cuisine: z.string(),
  difficulty: DifficultySchema,
  mealType: MealTypeSchema,
  imageUrl: z.string().optional(),
  prepTime: z.number(),
  cookTime: z.number(),
  restTime: z.number().optional(),
  servings: z.number(),
  equipment: z.array(z.string()).optional(),
  ingredients: z.array(
    z.object({
      ingredientId: z.string(),
      quantity: z.number(),
      unit: z.string(),
      preparation: z.string().optional(),
      optional: z.boolean(),
    }),
  ),
  instructions: z.array(z.string()),
  calories: z.number().optional(),
  protein: z.number().optional(),
  carbohydrates: z.number().optional(),
  fat: z.number().optional(),
  fiber: z.number().optional(),
  sodium: z.number().optional(),
  sugar: z.number().optional(),
});
export type RecipeSubmissionDraftData = z.infer<typeof RecipeSubmissionDraftDataSchema>;

export const ContributeDraftSchema = z.object({
  version: z.literal(1),
  /** Index into `CONTRIBUTE_STEPS` the contributor was on. */
  step: z.number().int().min(0).max(CONTRIBUTE_STEPS.length - 1),
  data: RecipeSubmissionDraftDataSchema,
  /** ISO timestamp of the last change. */
  updatedAt: z.string(),
});
export type ContributeDraft = z.infer<typeof ContributeDraftSchema>;

/**
 * What the Submit step hands to the sending flow (roadmap Issue 039): the
 * validated form, the catalog `Recipe` it becomes, its id and pretty JSON.
 * It crosses the wizard → issue-URL / clipboard boundary, so it is a schema
 * (Inceptor rule: cross-boundary types are Zod schemas, not interfaces);
 * `buildSubmissionPayload()` (src/lib/domain/contribute.ts) builds it.
 */
export const RecipeSubmissionPayloadSchema = z.object({
  submission: RecipeSubmissionSchema,
  recipe: RecipeSchema,
  recipeId: z.string().min(1),
  recipeJson: z.string().min(1),
});
export type RecipeSubmissionPayload = z.infer<typeof RecipeSubmissionPayloadSchema>;
