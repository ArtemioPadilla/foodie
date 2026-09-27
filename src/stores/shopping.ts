import { computed } from 'nanostores';
import { ShoppingListSchema, type MealPlan, type Recipe, type ShoppingListItem } from '@/schemas';
import { persistentAtom } from '@/lib/persist';
import {
  buildShoppingListFromPlan,
  exportShoppingList,
  type CategoryResolver,
  type ShoppingExportFormat,
} from '@/lib/domain/shopping';
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

export function removeShoppingItem(ingredientId: string): void {
  $shopping.set($shopping.get().filter((i) => i.ingredientId !== ingredientId));
}

export function toggleShoppingItem(ingredientId: string): void {
  $shopping.set($shopping.get().map((i) => (i.ingredientId === ingredientId ? { ...i, checked: !i.checked } : i)));
}

export function updateShoppingQuantity(ingredientId: string, quantity: number): void {
  $shopping.set($shopping.get().map((i) => (i.ingredientId === ingredientId ? { ...i, quantity } : i)));
}

export function updateShoppingNotes(ingredientId: string, notes: string): void {
  $shopping.set($shopping.get().map((i) => (i.ingredientId === ingredientId ? { ...i, notes } : i)));
}

export function clearShoppingList(): void {
  $shopping.set([]);
}

export function clearCheckedItems(): void {
  $shopping.set($shopping.get().filter((i) => !i.checked));
}

/** Replace the list with everything the plan needs (see `buildShoppingListFromPlan`). */
export function generateFromPlan(plan: MealPlan, recipes: ReadonlyArray<Recipe>, categoryOf?: CategoryResolver): void {
  $shopping.set(buildShoppingListFromPlan(plan, recipes, categoryOf));
}

export function exportList(format: ShoppingExportFormat): string {
  return exportShoppingList($shopping.get(), format);
}
