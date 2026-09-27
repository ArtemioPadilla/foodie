import { describe, expect, it } from 'vitest';
import { makePlan, makeRecipe } from '@/tests/fixtures/foodie-domain';
import { buildShoppingListFromPlan, exportShoppingList } from './shopping';

const eggs = makeRecipe(); // rec_001, 2 servings: 4 piece ing_001 + 30 ml ing_002
const omelette = makeRecipe({
  id: 'rec_002',
  servings: 1,
  ingredients: [
    { ingredientId: 'ing_001', quantity: 2, unit: 'piece', optional: false },
    { ingredientId: 'ing_002', quantity: 1, unit: 'tbsp', optional: false },
    { ingredientId: 'ing_003', quantity: 50, unit: 'g', optional: true },
  ],
});

function planWith(meals: Array<{ day: number; slot: 'breakfast' | 'lunch' | 'dinner' | 'snacks'; recipeId: string; servings: number }>) {
  const plan = makePlan();
  for (const m of meals) {
    const day = plan.days[m.day]!;
    if (m.slot === 'snacks') day.meals.snacks = [...(day.meals.snacks ?? []), { recipeId: m.recipeId, servings: m.servings }];
    else day.meals[m.slot] = { recipeId: m.recipeId, servings: m.servings };
  }
  return plan;
}

describe('buildShoppingListFromPlan', () => {
  it('scales ingredients by requested / recipe servings', () => {
    const list = buildShoppingListFromPlan(planWith([{ day: 0, slot: 'breakfast', recipeId: 'rec_001', servings: 4 }]), [eggs]);
    expect(list).toEqual([
      expect.objectContaining({ ingredientId: 'ing_001', quantity: 8, unit: 'piece', checked: false, usedIn: ['rec_001'] }),
      expect.objectContaining({ ingredientId: 'ing_002', quantity: 60, unit: 'ml' }),
    ]);
  });

  it('merges the same ingredient+unit across recipes and days, deduplicating usedIn', () => {
    const plan = planWith([
      { day: 0, slot: 'breakfast', recipeId: 'rec_001', servings: 2 },
      { day: 1, slot: 'breakfast', recipeId: 'rec_001', servings: 2 },
      { day: 2, slot: 'dinner', recipeId: 'rec_002', servings: 1 },
    ]);
    const list = buildShoppingListFromPlan(plan, [eggs, omelette]);
    const pieces = list.find((i) => i.ingredientId === 'ing_001' && i.unit === 'piece');
    expect(pieces?.quantity).toBe(10);
    expect(pieces?.usedIn).toEqual(['rec_001', 'rec_002']);
  });

  it('keeps separate lines for the same ingredient in different units (ids with underscores intact)', () => {
    const plan = planWith([
      { day: 0, slot: 'lunch', recipeId: 'rec_001', servings: 2 },
      { day: 0, slot: 'snacks', recipeId: 'rec_002', servings: 1 },
    ]);
    const list = buildShoppingListFromPlan(plan, [eggs, omelette]);
    const ing002 = list.filter((i) => i.ingredientId === 'ing_002');
    expect(ing002.map((i) => i.unit).sort()).toEqual(['ml', 'tbsp']);
  });

  it('ignores slots whose recipe is unknown and empty plans', () => {
    expect(buildShoppingListFromPlan(planWith([{ day: 0, slot: 'dinner', recipeId: 'ghost', servings: 1 }]), [eggs])).toEqual([]);
    expect(buildShoppingListFromPlan(makePlan(), [eggs])).toEqual([]);
  });

  it('sorts by category with uncategorised items last', () => {
    const plan = planWith([{ day: 0, slot: 'dinner', recipeId: 'rec_002', servings: 1 }]);
    const categoryOf = (id: string) => ({ ing_001: 'protein', ing_003: 'dairy' })[id];
    const list = buildShoppingListFromPlan(plan, [omelette], categoryOf);
    expect(list.map((i) => i.ingredientId)).toEqual(['ing_003', 'ing_001', 'ing_002']);
  });
});

describe('exportShoppingList', () => {
  const list = [
    { ingredientId: 'ing_001', quantity: 8, unit: 'piece', checked: true, usedIn: ['rec_001'], notes: 'free "range"', category: 'protein' },
    { ingredientId: 'ing_002', quantity: 60, unit: 'ml', checked: false, usedIn: [] },
  ];

  it('text marks checked items', () => {
    expect(exportShoppingList(list, 'text')).toBe('✓ 8 piece ing_001\n☐ 60 ml ing_002');
  });

  it('csv has a header and escapes quotes in notes', () => {
    const csv = exportShoppingList(list, 'csv');
    expect(csv.split('\n')[0]).toBe('Ingredient,Quantity,Unit,Category,Notes');
    expect(csv).toContain('ing_001,8,piece,protein,"free ""range"""');
    expect(csv).toContain('ing_002,60,ml,,""');
  });

  it('json round-trips', () => {
    expect(JSON.parse(exportShoppingList(list, 'json'))).toEqual(list);
  });
});
