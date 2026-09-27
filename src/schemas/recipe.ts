/**
 * Recipe — the central catalog record (`public/data/recipes.json`, wrapped as
 * `{ recipes: Recipe[] }`).
 *
 * Optionality mirrors the real data AND the legacy `Recipe` interface: fields
 * every record happens to carry today (`tips`, `author`, `instructions[].time`)
 * stay optional when legacy marked them optional, so community submissions
 * are not rejected for omitting them.
 */
import { z } from 'zod';
import { MultiLangTextSchema } from './multi-lang-text';
import { NutritionInfoSchema } from './nutrition';

export const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack', 'dessert'] as const;
export const MealTypeSchema = z.enum(MEAL_TYPES);
export type MealType = z.infer<typeof MealTypeSchema>;

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export const DifficultySchema = z.enum(DIFFICULTIES);
export type Difficulty = z.infer<typeof DifficultySchema>;

export const RecipeIngredientSchema = z.object({
  ingredientId: z.string().min(1),
  quantity: z.number().nonnegative(),
  unit: z.string().min(1),
  preparation: z.string().optional(),
  notes: MultiLangTextSchema.optional(),
  optional: z.boolean(),
});
export type RecipeIngredient = z.infer<typeof RecipeIngredientSchema>;

export const RecipeInstructionSchema = z.object({
  step: z.number().int().positive(),
  text: MultiLangTextSchema,
  /** Minutes. */
  time: z.number().nonnegative().optional(),
  image: z.string().optional(),
});
export type RecipeInstruction = z.infer<typeof RecipeInstructionSchema>;

export const DietaryLabelsSchema = z.object({
  glutenFree: z.boolean(),
  vegetarian: z.boolean(),
  vegan: z.boolean(),
  dairyFree: z.boolean(),
  lowCarb: z.boolean(),
  keto: z.boolean(),
  paleo: z.boolean(),
  whole30: z.boolean().optional(),
});
export type DietaryLabels = z.infer<typeof DietaryLabelsSchema>;

export const RecipeVariationSchema = z.object({
  name: MultiLangTextSchema,
  changedIngredients: z.array(RecipeIngredientSchema),
});
export type RecipeVariation = z.infer<typeof RecipeVariationSchema>;

export const RecipeSchema = z.object({
  id: z.string().min(1),
  name: MultiLangTextSchema,
  description: MultiLangTextSchema,
  type: MealTypeSchema,
  cuisine: z.array(z.string().min(1)).min(1),
  /** Minutes. */
  prepTime: z.number().nonnegative(),
  cookTime: z.number().nonnegative(),
  totalTime: z.number().nonnegative(),
  servings: z.number().int().positive(),
  difficulty: DifficultySchema,
  tags: z.array(z.string()),
  dietaryLabels: DietaryLabelsSchema,
  nutrition: NutritionInfoSchema,
  ingredients: z.array(RecipeIngredientSchema).min(1),
  instructions: z.array(RecipeInstructionSchema).min(1),
  tips: MultiLangTextSchema.optional(),
  equipment: z.array(z.string()),
  imageUrl: z.string().optional(),
  videoUrl: z.string().optional(),
  sourceUrl: z.string().optional(),
  author: z.string().optional(),
  /** ISO calendar date, `YYYY-MM-DD`. */
  dateAdded: z.iso.date(),
  rating: z.number().min(0).max(5),
  reviewCount: z.number().int().nonnegative(),
  variations: z.array(RecipeVariationSchema).optional(),
});
export type Recipe = z.infer<typeof RecipeSchema>;

/** The whole `recipes.json` file. */
export const RecipesFileSchema = z.object({ recipes: z.array(RecipeSchema) });

// ── Browsing state (URL/query state of the RecipeBrowser island) ─────────────

export const SORT_OPTIONS = [
  'rating-desc',
  'rating-asc',
  'time-asc',
  'time-desc',
  'name-asc',
  'name-desc',
  'difficulty-asc',
  'difficulty-desc',
  'recent',
  'popular',
  'cost-asc',
  'cost-desc',
  // Legacy options kept so persisted/URL state from the Vite app still parses.
  'rating',
  'prepTime',
  'cost',
  'newest',
  'name',
] as const;
export const SortOptionSchema = z.enum(SORT_OPTIONS);
export type SortOption = z.infer<typeof SortOptionSchema>;

export const RecipeFiltersSchema = z.object({
  search: z.string().optional(),
  types: z.array(z.string()).optional(),
  cuisines: z.array(z.string()).optional(),
  dietaryLabels: z.array(z.string()).optional(),
  difficulties: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  /** Minutes; caps prepTime + cookTime. */
  maxTime: z.number().nonnegative().optional(),
  maxPrepTime: z.number().nonnegative().optional(),
  maxCookTime: z.number().nonnegative().optional(),
  ingredients: z.array(z.string()).optional(),
});
export type RecipeFilters = z.infer<typeof RecipeFiltersSchema>;

// ── RecipeBrowser URL state (roadmap Issue 017) ──────────────────────────────

export const RECIPE_VIEWS = ['grid', 'list'] as const;
export const RecipeViewSchema = z.enum(RECIPE_VIEWS);
export type RecipeView = z.infer<typeof RecipeViewSchema>;

/**
 * Everything the `/recipes/` browser keeps in the URL query string
 * (`?q=&type=&cuisine=&diet=&difficulty=&time=&favorites=1&sort=&view=`).
 * Parsed/serialised by `lib/domain/recipe-browser.ts`; a cross-boundary type,
 * hence a Zod schema (Inceptor rule). `dietaryTags` are `categories.dietaryTags`
 * ids (`gluten-free`), matched against `Recipe.dietaryLabels` and `tags`.
 */
export const RecipeBrowserStateSchema = z.object({
  search: z.string(),
  types: z.array(z.string()),
  cuisines: z.array(z.string()),
  dietaryTags: z.array(z.string()),
  difficulties: z.array(z.string()),
  /** Minutes; caps `totalTime`. */
  maxTime: z.number().positive().optional(),
  favoritesOnly: z.boolean(),
  sort: SortOptionSchema,
  view: RecipeViewSchema,
});
export type RecipeBrowserState = z.infer<typeof RecipeBrowserStateSchema>;
