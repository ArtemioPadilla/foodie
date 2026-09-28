/**
 * Pantry — persisted under `localStorage['pantryItems']`. Each item has its
 * own generated `id` (`pantry_<ts>_<rand>`) because the same ingredient can
 * sit in several locations with different expiration dates.
 *
 * `name` and `category` (roadmap Issue 027) describe a **custom** item — one
 * the user typed in the pantry's "Add item" dialog that matches no catalog
 * ingredient, so its `ingredientId` is `custom-<uuid>-<slug>` (same helper as
 * the shopping list's custom items) and there is no catalog entry to take a
 * localised name or a category from. Catalog items leave both unset. Both are
 * optional, so inventories written by the legacy app (whose free-text
 * `ingredientId` doubled as the name) still parse.
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
  name: z.string().optional(),
  category: z.string().optional(),
});
export type PantryItem = z.infer<typeof PantryItemSchema>;

export const PantryItemsSchema = z.array(PantryItemSchema);
export type PantryItems = z.infer<typeof PantryItemsSchema>;

/** Legacy `AddItemModal` locations (stored verbatim, capitalised, in `PantryItem.location`). */
export const PANTRY_LOCATIONS = ['Pantry', 'Fridge', 'Freezer', 'Cabinet', 'Counter'] as const;
export const PantryLocationSchema = z.enum(PANTRY_LOCATIONS);
export type PantryLocation = z.infer<typeof PantryLocationSchema>;

/**
 * The quick-add form of `/ingredients/[id]/` (`IngredientActions`, roadmap
 * Issue 019): a positive quantity in the ingredient's catalog unit, plus the
 * pantry location.
 */
export const IngredientQuickAddSchema = z.object({
  quantity: z.number().positive().finite(),
  location: PantryLocationSchema,
});
export type IngredientQuickAdd = z.infer<typeof IngredientQuickAddSchema>;

// ── Pantry item form (roadmap Issue 027, port of legacy `pantry/AddItemModal`) ─

/** Units offered by the pantry form (legacy `AddItemModal` list, same order). */
export const PANTRY_UNITS = ['piece', 'whole', 'lb', 'oz', 'kg', 'g', 'cup', 'tbsp', 'tsp', 'l', 'ml'] as const;

export const PANTRY_ITEM_NAME_MAX = 60;
export const PANTRY_ITEM_QUANTITY_MAX = 10_000;

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export type PantryItemFormMessages = {
  nameRequired: string;
  nameTooLong: string;
  quantityInvalid: string;
  unitRequired: string;
  dateInvalid: string;
};

const DEFAULT_PANTRY_ITEM_MESSAGES: PantryItemFormMessages = {
  nameRequired: 'Ingredient name is required.',
  nameTooLong: `Use ${PANTRY_ITEM_NAME_MAX} characters or fewer.`,
  quantityInvalid: `Enter a quantity greater than 0 and up to ${PANTRY_ITEM_QUANTITY_MAX}.`,
  unitRequired: 'Pick a unit.',
  dateInvalid: 'Pick a valid date.',
};

/**
 * Validation of the pantry "Add / edit item" form (the roadmap's
 * `pantryItemSchema`), with the messages injected so the island can localise
 * them (same factory pattern as `customShoppingItemSchema`).
 *
 * - `name` is what the user typed or picked from the catalog suggestions; the
 *   island resolves it to a catalog id or mints a `custom-*` id.
 * - `quantity` stays the raw text of the number input and must parse to a
 *   number in (0, 10 000] — legacy rejected 0 on add, and so does this.
 * - `unit` is free (catalog ingredients bring units such as `clove`), non-empty.
 * - `expirationDate` is `''` (no expiry) or a `YYYY-MM-DD` key from the date picker.
 * - `location` is `''` (none) or one of `PANTRY_LOCATIONS`.
 * - `category` only matters for custom items (catalog ones take the catalog's).
 */
export function pantryItemFormSchema(messages: PantryItemFormMessages = DEFAULT_PANTRY_ITEM_MESSAGES) {
  return z.object({
    name: z.string().trim().min(1, messages.nameRequired).max(PANTRY_ITEM_NAME_MAX, messages.nameTooLong),
    quantity: z
      .string()
      .trim()
      .refine((raw) => {
        if (raw === '') return false;
        const value = Number(raw);
        return Number.isFinite(value) && value > 0 && value <= PANTRY_ITEM_QUANTITY_MAX;
      }, messages.quantityInvalid),
    unit: z.string().trim().min(1, messages.unitRequired),
    expirationDate: z.union([z.literal(''), z.string().regex(DATE_KEY, messages.dateInvalid)]),
    location: z.union([z.literal(''), PantryLocationSchema]),
    category: z.string(),
  });
}
export const PantryItemFormSchema = pantryItemFormSchema();
export type PantryItemFormValues = z.infer<typeof PantryItemFormSchema>;
