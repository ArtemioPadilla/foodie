/**
 * Pantry — persisted under `localStorage['pantryItems']`. Each item has its
 * own generated `id` (`pantry_<ts>_<rand>`) because the same ingredient can
 * sit in several locations with different expiration dates.
 */
import { z } from 'zod';

export const PantryItemSchema = z.object({
  id: z.string().min(1),
  ingredientId: z.string().min(1),
  quantity: z.number().nonnegative(),
  unit: z.string(),
  /** ISO date string. */
  expirationDate: z.string().optional(),
  /** ISO datetime string. */
  addedAt: z.string(),
  location: z.string().optional(),
});
export type PantryItem = z.infer<typeof PantryItemSchema>;

export const PantryItemsSchema = z.array(PantryItemSchema);
export type PantryItems = z.infer<typeof PantryItemsSchema>;
