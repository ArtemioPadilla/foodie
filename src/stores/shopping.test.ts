// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makePlan, makeRecipe } from '@/tests/fixtures/foodie-domain';
import {
  $shopping,
  $shoppingCheckedCount,
  $shoppingCount,
  $shoppingRemaining,
  addCustomShoppingItem,
  addShoppingItem,
  clearCheckedItems,
  clearShoppingList,
  exportList,
  generateFromPlan,
  removeShoppingItem,
  toggleShoppingItem,
  updateShoppingLine,
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

describe('Issue 026 — line-targeted actions, custom items, merge on generate', () => {
  const twoLines = () => {
    $shopping.set([
      { ingredientId: 'ing_001', quantity: 2, unit: 'piece', checked: false, usedIn: ['rec_001'] },
      { ingredientId: 'ing_001', quantity: 0.5, unit: 'cup', checked: false, usedIn: ['rec_002'] },
    ]);
  };

  it('toggle / quantity / notes / remove target one unit when given', () => {
    twoLines();
    toggleShoppingItem('ing_001', 'cup');
    updateShoppingQuantity('ing_001', 3, 'piece');
    updateShoppingNotes('ing_001', 'big ones', 'piece');
    expect($shopping.get().map((i) => [i.unit, i.quantity, i.checked, i.notes])).toEqual([
      ['piece', 3, false, 'big ones'],
      ['cup', 0.5, true, undefined],
    ]);
    removeShoppingItem('ing_001', 'cup');
    expect($shopping.get().map((i) => i.unit)).toEqual(['piece']);
  });

  it('updateShoppingLine patches quantity and unit of one line', () => {
    twoLines();
    updateShoppingLine('ing_001', 'cup', { quantity: 300, unit: 'ml' });
    expect($shopping.get()[1]).toMatchObject({ quantity: 300, unit: 'ml' });
    expect($shopping.get()[0]).toMatchObject({ quantity: 2, unit: 'piece' });
  });

  it('addCustomShoppingItem mints a custom-* id, keeps the name and never merges', () => {
    const first = addCustomShoppingItem({ name: ' Oat milk ', quantity: 2, unit: 'l', category: 'dairy', notes: '  barista ' });
    addCustomShoppingItem({ name: 'Oat milk', quantity: 1, unit: 'l', category: 'dairy' });
    expect(first.ingredientId).toMatch(/^custom-[0-9a-f-]{36}-oat-milk$/);
    expect($shopping.get()).toHaveLength(2);
    expect($shopping.get()[0]).toEqual({
      ingredientId: first.ingredientId,
      name: 'Oat milk',
      quantity: 2,
      unit: 'l',
      category: 'dairy',
      checked: false,
      usedIn: [],
      notes: 'barista',
    });
    expect($shopping.get()[1]).not.toHaveProperty('notes');
    expect(JSON.parse(localStorage.getItem('shoppingList')!)).toHaveLength(2);
  });

  it('generateFromPlan with keepManual + normalizeUnits keeps custom items and consolidates units', () => {
    addCustomShoppingItem({ name: 'Bread', quantity: 1, unit: 'piece', category: 'grains' });
    const plan = makePlan();
    plan.days[0]!.meals.breakfast = { recipeId: 'rec_001', servings: 2 };
    const count = generateFromPlan(plan, [makeRecipe()], () => 'protein', { keepManual: true, normalizeUnits: true });
    expect(count).toBe(3);
    const lines = $shopping.get().map((i) => [i.name ?? i.ingredientId, i.quantity, i.unit]);
    expect(lines).toEqual([
      ['ing_001', 4, 'piece'],
      ['ing_002', 0.125, 'cup'], // 30 ml → cup base
      ['Bread', 1, 'piece'],
    ]);
  });
});

