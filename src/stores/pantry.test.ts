// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  $pantry,
  $pantryCount,
  addPantryItem,
  clearPantry,
  getExpiringItems,
  getLowStockItems,
  getPantryItemById,
  removePantryItem,
  updatePantryItem,
} from './pantry';

const NOW = new Date('2025-01-25T12:00:00.000Z');
const daysFromNow = (d: number) => new Date(NOW.getTime() + d * 86_400_000).toISOString();

beforeEach(() => {
  localStorage.clear();
  clearPantry();
});

describe('$pantry persistence', () => {
  it('writes the legacy "pantryItems" key', () => {
    addPantryItem({ ingredientId: 'ing_001', quantity: 2, unit: 'kg' }, NOW);
    const saved = JSON.parse(localStorage.getItem('pantryItems')!);
    expect(saved).toHaveLength(1);
    expect(saved[0].id).toMatch(/^pantry_1737806400000_/);
    expect(saved[0].addedAt).toBe(NOW.toISOString());
  });

  it('hydrates on import', async () => {
    localStorage.setItem('pantryItems', JSON.stringify([{ id: 'pantry_1', ingredientId: 'ing_001', quantity: 1, unit: 'kg', addedAt: NOW.toISOString() }]));
    vi.resetModules();
    const fresh = await import('./pantry');
    expect(fresh.$pantry.get()[0]?.id).toBe('pantry_1');
    expect(fresh.$pantryCount.get()).toBe(1);
  });
});

describe('actions', () => {
  it('addPantryItem generates id and addedAt; the same ingredient may appear twice', () => {
    const a = addPantryItem({ ingredientId: 'ing_001', quantity: 1, unit: 'kg', location: 'fridge' });
    const b = addPantryItem({ ingredientId: 'ing_001', quantity: 2, unit: 'kg', location: 'freezer' });
    expect(a.id).not.toBe(b.id);
    expect($pantry.get()).toHaveLength(2);
    expect($pantryCount.get()).toBe(2);
  });

  it('updatePantryItem merges into one item only', () => {
    const a = addPantryItem({ ingredientId: 'a', quantity: 1, unit: 'g' });
    addPantryItem({ ingredientId: 'b', quantity: 1, unit: 'g' });
    updatePantryItem(a.id, { quantity: 9, expirationDate: daysFromNow(3) });
    expect(getPantryItemById($pantry.get(), a.id)?.quantity).toBe(9);
    expect($pantry.get()[1]?.quantity).toBe(1);
  });

  it('removePantryItem / clearPantry', () => {
    const a = addPantryItem({ ingredientId: 'a', quantity: 1, unit: 'g' });
    addPantryItem({ ingredientId: 'b', quantity: 1, unit: 'g' });
    removePantryItem(a.id);
    expect($pantry.get().map((i) => i.ingredientId)).toEqual(['b']);
    clearPantry();
    expect($pantry.get()).toEqual([]);
  });
});

describe('selectors', () => {
  it('getExpiringItems returns items expiring within N days, excluding already expired and undated', () => {
    addPantryItem({ ingredientId: 'soon', quantity: 1, unit: 'g', expirationDate: daysFromNow(2) });
    addPantryItem({ ingredientId: 'later', quantity: 1, unit: 'g', expirationDate: daysFromNow(10) });
    addPantryItem({ ingredientId: 'expired', quantity: 1, unit: 'g', expirationDate: daysFromNow(-1) });
    addPantryItem({ ingredientId: 'undated', quantity: 1, unit: 'g' });
    expect(getExpiringItems($pantry.get(), 3, NOW).map((i) => i.ingredientId)).toEqual(['soon']);
    expect(getExpiringItems($pantry.get(), 30, NOW).map((i) => i.ingredientId)).toEqual(['soon', 'later']);
  });

  it('getLowStockItems uses an inclusive threshold', () => {
    addPantryItem({ ingredientId: 'a', quantity: 0, unit: 'g' });
    addPantryItem({ ingredientId: 'b', quantity: 2, unit: 'g' });
    addPantryItem({ ingredientId: 'c', quantity: 5, unit: 'g' });
    expect(getLowStockItems($pantry.get(), 2).map((i) => i.ingredientId)).toEqual(['a', 'b']);
  });

  it('getPantryItemById returns undefined for unknown ids', () => {
    expect(getPantryItemById([], 'x')).toBeUndefined();
  });
});
