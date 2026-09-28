/**
 * Shopping list — persisted under `localStorage['shoppingList']` as a flat
 * array of items keyed by `ingredientId` (+ `unit`: the same ingredient can
 * sit on two lines when its units do not convert, e.g. `piece` and `cup`).
 * `usedIn` lists the recipe ids the item was consolidated from (empty for
 * items the user added by hand).
 *
 * `name` (roadmap Issue 026) is the display name of a **custom** item — one
 * the user typed in `AddItemModal`, whose `ingredientId` is `custom-<uuid>-<slug>`
 * and therefore has no catalog entry to take a localised name from. Catalog
 * items leave it unset. Optional, so lists written before Issue 026 still parse.
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
  name: z.string().optional(),
});
export type ShoppingListItem = z.infer<typeof ShoppingListItemSchema>;

export const ShoppingListSchema = z.array(ShoppingListItemSchema);
export type ShoppingList = z.infer<typeof ShoppingListSchema>;

// ── "Add item" form (roadmap Issue 026, port of PR #28's `AddItemModal`) ─────

/** Units offered for a custom item (legacy `AddItemModal` list, same order). */
export const SHOPPING_UNITS = ['piece', 'lb', 'oz', 'cup', 'tbsp', 'tsp', 'ml', 'l', 'g', 'kg'] as const;
export const ShoppingUnitSchema = z.enum(SHOPPING_UNITS);
export type ShoppingUnit = z.infer<typeof ShoppingUnitSchema>;

export const CUSTOM_ITEM_NAME_MAX = 60;
export const CUSTOM_ITEM_NOTES_MAX = 200;
export const CUSTOM_ITEM_QUANTITY_MAX = 10_000;

export type CustomShoppingItemMessages = {
  nameRequired: string;
  nameTooLong: string;
  quantityInvalid: string;
  notesTooLong: string;
  categoryRequired: string;
};

const DEFAULT_CUSTOM_ITEM_MESSAGES: CustomShoppingItemMessages = {
  nameRequired: 'Give the item a name.',
  nameTooLong: `Use ${CUSTOM_ITEM_NAME_MAX} characters or fewer.`,
  quantityInvalid: `Enter a quantity greater than 0 and up to ${CUSTOM_ITEM_QUANTITY_MAX}.`,
  notesTooLong: `Use ${CUSTOM_ITEM_NOTES_MAX} characters or fewer.`,
  categoryRequired: 'Pick a category.',
};

/**
 * Validation of the "Add item" form, with the messages injected so the island
 * can localise them (same factory pattern as `planTemplateFormSchema`).
 * `quantity` stays the raw text of the number input (react-hook-form keeps
 * input values as strings); it must parse to a number in (0, 10 000].
 */
export function customShoppingItemSchema(messages: CustomShoppingItemMessages = DEFAULT_CUSTOM_ITEM_MESSAGES) {
  return z.object({
    name: z.string().trim().min(1, messages.nameRequired).max(CUSTOM_ITEM_NAME_MAX, messages.nameTooLong),
    quantity: z
      .string()
      .trim()
      .refine((raw) => {
        if (raw === '') return false;
        const value = Number(raw);
        return Number.isFinite(value) && value > 0 && value <= CUSTOM_ITEM_QUANTITY_MAX;
      }, messages.quantityInvalid),
    unit: ShoppingUnitSchema,
    category: z.string().min(1, messages.categoryRequired),
    notes: z.string().trim().max(CUSTOM_ITEM_NOTES_MAX, messages.notesTooLong),
  });
}
export const CustomShoppingItemSchema = customShoppingItemSchema();
export type CustomShoppingItemFormValues = z.infer<typeof CustomShoppingItemSchema>;
