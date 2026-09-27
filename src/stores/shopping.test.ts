// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makePlan, makeRecipe } from '@/tests/fixtures/foodie-domain';
import {
  $shopping,
  $shoppingCheckedCount,
  $shoppingCount,
  $shoppingRemaining,
  addShoppingItem,
  clearCheckedItems,
  clearShoppingList,
  exportList,
  generateFromPlan,
  removeShoppingItem,
  toggleShoppingItem,
  updateShoppingNotes,
  updateShoppingQuantity,
} from './shopping';

const item = (ingredientId: string, quantity = 1, usedIn: string[] = []) => ({ ingredientId, quantity, unit: 'g', usedIn });

beforeEach(() => {
  localStorage.clear();
  clearShoppingList();
});

describe('$shopping persistence', () => {
  it('writes the legacy "shoppingList" key', () => {
    addShoppingItem(item('ing_001', 2));
    expect(JSON.parse(localStorage.getItem('shoppingList')!)).toEqual([{ ...item('ing_001', 2), checked: false }]);
  });

  it('hydrates on import', async () => {
    localStorage.setItem('shoppingList', JSON.stringify([{ ...item('ing_009', 3), checked: true }]));
    vi.resetModules();
    const fresh = await import('./shopping');
    expect(fresh.$shopping.get()[0]?.ingredientId).toBe('ing_009');
    expect(fresh.$shoppingCheckedCount.get()).toBe(1);
  });
});

describe('actions', () => {
  it('addShoppingItem appends unchecked, or merges quantity and usedIn for an existing ingredient', () => {
    addShoppingItem(item('ing_001', 2, ['rec_001']));
    addShoppingItem(item('ing_001', 3, ['rec_001', 'rec_002']));
    expect($shopping.get()).toEqual([{ ...item('ing_001', 5, ['rec_001', 'rec_002']), checked: false }]);
  });

  it('removeShoppingItem drops by ingredient id', () => {
    addShoppingItem(item('a'));
    addShoppingItem(item('b'));
    removeShoppingItem('a');
    expect($shopping.get().map((i) => i.ingredientId)).toEqual(['b']);
  });

  it('toggleShoppingItem flips checked and computed counts follow', () => {
    addShoppingItem(item('a'));
    addShoppingItem(item('b'));
    toggleShoppingItem('a');
    expect($shopping.get()[0]?.checked).toBe(true);
    expect($shoppingCount.get()).toBe(2);
    expect($shoppingCheckedCount.get()).toBe(1);
    expect($shoppingRemaining.get().map((i) => i.ingredientId)).toEqual(['b']);
    toggleShoppingItem('a');
    expect($shopping.get()[0]?.checked).toBe(false);
  });

  it('updateShoppingQuantity / updateShoppingNotes edit one line', () => {
    addShoppingItem(item('a'));
    addShoppingItem(item('b'));
    updateShoppingQuantity('a', 7);
    updateShoppingNotes('b', 'ripe');
    expect($shopping.get()[0]?.quantity).toBe(7);
    expect($shopping.get()[1]?.notes).toBe('ripe');
    expect($shopping.get()[0]?.notes).toBeUndefined();
  });

  it('clearCheckedItems keeps only unchecked lines; clearShoppingList empties', () => {
    addShoppingItem(item('a'));
    addShoppingItem(item('b'));
    toggleShoppingItem('a');
    clearCheckedItems();
    expect($shopping.get().map((i) => i.ingredientId)).toEqual(['b']);
    clearShoppingList();
    expect($shopping.get()).toEqual([]);
    expect(localStorage.getItem('shoppingList')).toBe('[]');
  });

  it('generateFromPlan replaces the list with the plan consolidation', () => {
    addShoppingItem(item('stale'));
    const plan = makePlan();
    plan.days[0]!.meals.breakfast = { recipeId: 'rec_001', servings: 4 };
    generateFromPlan(plan, [makeRecipe()], (id) => (id === 'ing_001' ? 'protein' : undefined));
    expect($shopping.get().map((i) => [i.ingredientId, i.quantity, i.category])).toEqual([
      ['ing_001', 8, 'protein'],
      ['ing_002', 60, undefined],
    ]);
  });

  it('exportList serialises the current list', () => {
    addShoppingItem(item('a', 2));
    expect(exportList('text')).toBe('☐ 2 g a');
    expect(JSON.parse(exportList('json'))).toHaveLength(1);
    expect(exportList('csv')).toContain('a,2,g,,""');
  });
});
