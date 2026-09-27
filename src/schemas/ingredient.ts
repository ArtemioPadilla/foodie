/**
 * Ingredient — `public/data/ingredients.json`, wrapped as `{ ingredients: [] }`.
 *
 * Five records are *composite* ingredients (sauces, doughs…): they set
 * `isComposite` and carry `components`, `yield`, `preparationNotes` and a
 * `description`. Everything else omits those fields, hence optional.
 */
import { z } from 'zod';
import { MultiLangTextSchema } from './multi-lang-text';

export const ComponentIngredientSchema = z.object({
  ingredientId: z.string().min(1),
  quantity: z.number().nonnegative(),
  unit: z.string().min(1),
  notes: MultiLangTextSchema.optional(),
});
export type ComponentIngredient = z.infer<typeof ComponentIngredientSchema>;

export const IngredientYieldSchema = z.object({
  quantity: z.number().positive(),
  unit: z.string().min(1),
});
export type IngredientYield = z.infer<typeof IngredientYieldSchema>;

export const IngredientTagsSchema = z.object({
  glutenFree: z.boolean(),
  vegan: z.boolean(),
  vegetarian: z.boolean(),
  dairyFree: z.boolean(),
  nutFree: z.boolean(),
  kosher: z.boolean(),
  halal: z.boolean(),
});
export type IngredientTags = z.infer<typeof IngredientTagsSchema>;

export const IngredientSchema = z.object({
  id: z.string().min(1),
  name: MultiLangTextSchema,
  description: MultiLangTextSchema.optional(),
  /** One of `categories.json → ingredientCategories[].id`. */
  category: z.string().min(1),
  unit: z.string().min(1),
  avgPrice: z.number().nonnegative(),
  /** ISO 4217 code, e.g. `USD`. */
  currency: z.string().length(3),
  region: z.string(),
  tags: IngredientTagsSchema,
  /** Ingredient ids that can stand in for this one. */
  alternatives: z.array(z.string()),
  seasonality: z.array(z.string()),
  storageInstructions: MultiLangTextSchema,
  isComposite: z.boolean().optional(),
  components: z.array(ComponentIngredientSchema).optional(),
  preparationNotes: MultiLangTextSchema.optional(),
  yield: IngredientYieldSchema.optional(),
  imageUrl: z.string().optional(),
});
export type Ingredient = z.infer<typeof IngredientSchema>;

/** The whole `ingredients.json` file. */
export const IngredientsFileSchema = z.object({ ingredients: z.array(IngredientSchema) });
