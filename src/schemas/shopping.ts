/**
 * Shopping list — persisted under `localStorage['shoppingList']` as a flat
 * array of items keyed by `ingredientId`. `usedIn` lists the recipe ids the
 * item was consolidated from (empty for items the user added by hand).
 */
import { z } from 'zod';

export const ShoppingListItemSchema = z.object({
  ingredientId: z.string().min(1),
  quantity: z.number().nonnegative(),
  unit: z.string(),
  checked: z.boolean(),
  usedIn: z.array(z.string()),
  notes: z.string().optional(),
  category: z.string().optional(),
});
export type ShoppingListItem = z.infer<typeof ShoppingListItemSchema>;

export const ShoppingListSchema = z.array(ShoppingListItemSchema);
export type ShoppingList = z.infer<typeof ShoppingListSchema>;
