import { computed } from 'nanostores';
import { ShoppingListSchema, type MealPlan, type Recipe, type ShoppingListItem } from '@/schemas';
import { persistentAtom } from '@/lib/persist';
import {
  buildShoppingListFromPlan,
  exportShoppingList,
  matchesShoppingItem,
  mergeGeneratedList,
  type BuildShoppingListOptions,
  type CategoryResolver,
  type ShoppingExportFormat,
} from '@/lib/domain/shopping';
import { makeCustomIngredientId } from '@/lib/domain/ingredient-id';
import { notifyQuotaExceeded } from './storage-status';

/** Shopping list (port of `ShoppingContext`; same `shoppingList` key). */
export const SHOPPING_KEY = 'shoppingList';

export const $shopping = persistentAtom<ShoppingListItem[]>(SHOPPING_KEY, ShoppingListSchema, [], {
  onQuotaExceeded: notifyQuotaExceeded,
});

export const $shoppingCount = computed($shopping, (list) => list.length);
export const $shoppingCheckedCount = computed($shopping, (list) => list.filter((i) => i.checked).length);
export const $shoppingRemaining = computed($shopping, (list) => list.filter((i) => !i.checked));

export type NewShoppingItem = Omit<ShoppingListItem, 'checked'> & { checked?: boolean };

/**
 * Add an item, or merge into the existing line for the same ingredient
 * (quantity summed, `usedIn` unioned) — legacy behaviour, unit-agnostic.
 */
export function addShoppingItem(item: NewShoppingItem): void {
  const list = $shopping.get();
  const existing = list.find((i) => i.ingredientId === item.ingredientId);
  if (existing) {
    $shopping.set(
      list.map((i) =>
        i.ingredientId === item.ingredientId
          ? { ...i, quantity: i.quantity + item.quantity, usedIn: [...new Set([...i.usedIn, ...item.usedIn])] }
          : i,
      ),
    );
    return;
  }
  $shopping.set([...list, { ...item, checked: item.checked ?? false }]);
}

/*
 * Line actions take the ingredient id and, optionally, the unit: the same
 * ingredient can sit on two lines when its units do not convert (`piece` and
 * `cup`), and the list UI (Issue 026) targets exactly one. Without `unit`
 * every line of the ingredient matches (the legacy behaviour).
 */

export function removeShoppingItem(ingredientId: string, unit?: string): void {
  $shopping.set($shopping.get().filter((i) => !matchesShoppingItem(i, ingredientId, unit)));
}

export function toggleShoppingItem(ingredientId: string, unit?: string): void {
  $shopping.set(
    $shopping.get().map((i) => (matchesShoppingItem(i, ingredientId, unit) ? { ...i, checked: !i.checked } : i)),
  );
}

export function updateShoppingQuantity(ingredientId: string, quantity: number, unit?: string): void {
  $shopping.set($shopping.get().map((i) => (matchesShoppingItem(i, ingredientId, unit) ? { ...i, quantity } : i)));
}

/** Edit one line's quantity and unit together (an edit made in the display unit that has no way back). */
export function updateShoppingLine(
  ingredientId: string,
  unit: string,
  patch: Partial<Pick<ShoppingListItem, 'quantity' | 'unit' | 'notes'>>,
): void {
  $shopping.set($shopping.get().map((i) => (matchesShoppingItem(i, ingredientId, unit) ? { ...i, ...patch } : i)));
}

export function updateShoppingNotes(ingredientId: string, notes: string, unit?: string): void {
  $shopping.set($shopping.get().map((i) => (matchesShoppingItem(i, ingredientId, unit) ? { ...i, notes } : i)));
}

export type CustomShoppingItemInput = {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  notes?: string;
};

/**
 * Add a line the user typed (roadmap Issue 026, PR #28's `AddItemModal`):
 * a fresh `custom-<uuid>-<slug>` id, so two "milk" items never merge, the
 * display `name` kept on the line, no `usedIn`.
 */
export function addCustomShoppingItem(input: CustomShoppingItemInput): ShoppingListItem {
  const name = input.name.trim();
  const notes = input.notes?.trim();
  const item: ShoppingListItem = {
    ingredientId: makeCustomIngredientId(name),
    name,
    quantity: input.quantity,
    unit: input.unit,
    category: input.category,
    checked: false,
    usedIn: [],
    ...(notes ? { notes } : {}),
  };
  $shopping.set([...$shopping.get(), item]);
  return item;
}

export function clearShoppingList(): void {
  $shopping.set([]);
}

export function clearCheckedItems(): void {
  $shopping.set($shopping.get().filter((i) => !i.checked));
}

export type GenerateFromPlanOptions = BuildShoppingListOptions & {
  /**
   * Keep the manual lines and the checked state / notes of lines that survive
   * (`mergeGeneratedList`) instead of replacing the whole list.
   */
  keepManual?: boolean;
};

/**
 * Fill the list with everything the plan needs (see `buildShoppingListFromPlan`).
 * By default the list is replaced (legacy); the shopping page passes
 * `{ normalizeUnits: true, keepManual: true }`. Returns the number of lines.
 */
export function generateFromPlan(
  plan: MealPlan,
  recipes: ReadonlyArray<Recipe>,
  categoryOf?: CategoryResolver,
  options: GenerateFromPlanOptions = {},
): number {
  const { keepManual, ...buildOptions } = options;
  const generated = buildShoppingListFromPlan(plan, recipes, categoryOf, buildOptions);
  const next = keepManual ? mergeGeneratedList($shopping.get(), generated) : generated;
  $shopping.set(next);
  return next.length;
}

export function exportList(format: ShoppingExportFormat): string {
  return exportShoppingList($shopping.get(), format);
}
