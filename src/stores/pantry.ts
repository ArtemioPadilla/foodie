import { computed } from 'nanostores';
import { PantryItemsSchema, type PantryItem } from '@/schemas';
import { persistentAtom } from '@/lib/persist';
import { generateId } from '@/lib/domain/id';
import { notifyQuotaExceeded } from './storage-status';

/** Pantry inventory (port of `PantryContext`; same `pantryItems` key). */
export const PANTRY_KEY = 'pantryItems';

export const $pantry = persistentAtom<PantryItem[]>(PANTRY_KEY, PantryItemsSchema, [], {
  onQuotaExceeded: notifyQuotaExceeded,
});

export const $pantryCount = computed($pantry, (items) => items.length);

export type NewPantryItem = Omit<PantryItem, 'id' | 'addedAt'>;

export function addPantryItem(item: NewPantryItem, now: Date = new Date()): PantryItem {
  const created: PantryItem = { ...item, id: generateId('pantry', now.getTime()), addedAt: now.toISOString() };
  $pantry.set([...$pantry.get(), created]);
  return created;
}

export function updatePantryItem(id: string, updates: Partial<Omit<PantryItem, 'id'>>): void {
  $pantry.set($pantry.get().map((item) => (item.id === id ? { ...item, ...updates } : item)));
}

export function removePantryItem(id: string): void {
  $pantry.set($pantry.get().filter((item) => item.id !== id));
}

export function clearPantry(): void {
  $pantry.set([]);
}

// ── Pure selectors (pass `$pantry.get()` or the `useStore` value) ────────────

export function getPantryItemById(items: ReadonlyArray<PantryItem>, id: string): PantryItem | undefined {
  return items.find((item) => item.id === id);
}

/** Items expiring within `days` from `now` (already-expired items are excluded, as legacy). */
export function getExpiringItems(items: ReadonlyArray<PantryItem>, days: number, now: Date = new Date()): PantryItem[] {
  const threshold = now.getTime() + days * 24 * 60 * 60 * 1000;
  return items.filter((item) => {
    if (!item.expirationDate) return false;
    const exp = new Date(item.expirationDate).getTime();
    return exp <= threshold && exp >= now.getTime();
  });
}

export function getLowStockItems(items: ReadonlyArray<PantryItem>, threshold: number): PantryItem[] {
  return items.filter((item) => item.quantity <= threshold);
}
