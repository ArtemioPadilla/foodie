/**
 * Categories — the taxonomies in `public/data/categories.json`:
 * `{ mealTypes, cuisines, dietaryTags, ingredientCategories }`, each an array
 * of `{ id, name, icon? }`. Meal types and ingredient categories carry a
 * lucide icon name; cuisines and dietary tags do not.
 */
import { z } from 'zod';
import { MultiLangTextSchema } from './multi-lang-text';

export const CategorySchema = z.object({
  id: z.string().min(1),
  name: MultiLangTextSchema,
  icon: z.string().min(1).optional(),
});
export type Category = z.infer<typeof CategorySchema>;

export const CATEGORY_GROUPS = [
  'mealTypes',
  'cuisines',
  'dietaryTags',
  'ingredientCategories',
] as const;
export const CategoryGroupIdSchema = z.enum(CATEGORY_GROUPS);
export type CategoryGroupId = z.infer<typeof CategoryGroupIdSchema>;

/** The whole `categories.json` file. */
export const CategoriesFileSchema = z.object({
  mealTypes: z.array(CategorySchema).min(1),
  cuisines: z.array(CategorySchema).min(1),
  dietaryTags: z.array(CategorySchema).min(1),
  ingredientCategories: z.array(CategorySchema).min(1),
});
export type CategoriesFile = z.infer<typeof CategoriesFileSchema>;

/**
 * One entry of the `categories` content collection: a taxonomy group keyed by
 * its name in the file (`getEntry('categories', 'mealTypes').data.items`).
 */
export const CategoryGroupSchema = z.object({
  id: CategoryGroupIdSchema,
  items: z.array(CategorySchema).min(1),
});
export type CategoryGroup = z.infer<typeof CategoryGroupSchema>;
