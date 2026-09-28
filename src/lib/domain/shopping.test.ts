import { describe, expect, it } from 'vitest';
import type { ShoppingListItem } from '@/schemas';
import {
  makeIngredient,
  makePlan,
  makeRecipe,
  makeShoppingItem,
  mockIngredientCategories,
} from '@/tests/fixtures/foodie-domain';
import {
  buildShoppingListFromPlan,
  consolidateIngredients,
  convertToBaseUnit,
  exportAsCSV,
  exportAsText,
  exportForWhatsApp,
  exportShoppingList,
  filterShoppingItems,
  fromShoppingDisplay,
  getCategoryLabel,
  getIngredientCategory,
  groupByCategory,
  groupShoppingItems,
  isManualShoppingItem,
  localizeShoppingList,
  makeCategoryResolver,
  matchesShoppingItem,
  mergeGeneratedList,
  shoppingItemKey,
  sortShoppingItems,
  toShoppingDisplay,
  whatsappShareUrl,
} from './shopping';

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

// ── Issue 014: unit normalisation + optional filtering in buildShoppingListFromPlan ──

describe('buildShoppingListFromPlan options', () => {
  const plan = planWith([
    { day: 0, slot: 'lunch', recipeId: 'rec_001', servings: 2 },
    { day: 0, slot: 'snacks', recipeId: 'rec_002', servings: 1 },
  ]);

  it('normalizeUnits merges compatible units into the shopping base unit (30 ml + 1 tbsp → cup)', () => {
    const list = buildShoppingListFromPlan(plan, [eggs, omelette], undefined, { normalizeUnits: true });
    const ing002 = list.filter((i) => i.ingredientId === 'ing_002');
    expect(ing002).toHaveLength(1);
    expect(ing002[0]!.unit).toBe('cup');
    expect(ing002[0]!.quantity).toBeCloseTo(30 / 240 + 1 / 16, 2);
    expect(ing002[0]!.usedIn).toEqual(['rec_001', 'rec_002']);
  });

  it('skipOptional leaves out ingredients flagged optional', () => {
    const withOptional = buildShoppingListFromPlan(plan, [eggs, omelette]);
    const without = buildShoppingListFromPlan(plan, [eggs, omelette], undefined, { skipOptional: true });
    expect(withOptional.some((i) => i.ingredientId === 'ing_003')).toBe(true);
    expect(without.some((i) => i.ingredientId === 'ing_003')).toBe(false);
  });

  it('wires categories from the ingredient catalog via makeCategoryResolver', () => {
    const catalog = [makeIngredient({ id: 'ing_001', category: 'protein' }), makeIngredient({ id: 'ing_002', category: 'dairy' })];
    const list = buildShoppingListFromPlan(plan, [eggs, omelette], makeCategoryResolver(catalog));
    expect(list.find((i) => i.ingredientId === 'ing_001')?.category).toBe('protein');
    expect(list.find((i) => i.ingredientId === 'ing_002')?.category).toBe('dairy');
    expect(list.find((i) => i.ingredientId === 'ing_003')?.category).toBe('other');
  });

  it('whatsapp is an export format', () => {
    const list = buildShoppingListFromPlan(plan, [eggs]);
    expect(exportShoppingList(list, 'whatsapp')).toContain('🛒 *Shopping List*');
  });
});

// ── Issue 014: port of legacy `tests/unit/services/shoppingService.test.ts` ──
//
// The legacy `getIngredientCategory` returned display labels from a
// hard-coded id → "Meat & Poultry" map. It now returns
// `categories.json → ingredientCategories[].id` (from `ingredient.category`
// when the id is in the catalog, else a keyword guess), so the expectations
// below are the category ids; labels come from `getCategoryLabel`.

describe('getIngredientCategory', () => {
  it('prefers ingredient.category from the catalog over any keyword guess', () => {
    const catalog = [makeIngredient({ id: 'chicken-stock', category: 'pantry' })];
    expect(getIngredientCategory('chicken-stock', catalog)).toBe('pantry');
    expect(getIngredientCategory('chicken-stock')).toBe('protein');
  });

  it('categorizes chicken as protein', () => {
    expect(getIngredientCategory('chicken-breast')).toBe('protein');
    expect(getIngredientCategory('CHICKEN-thighs')).toBe('protein');
  });

  it('categorizes fish as protein', () => {
    expect(getIngredientCategory('salmon-fillet')).toBe('protein');
    expect(getIngredientCategory('shrimp')).toBe('protein');
  });

  it('categorizes dairy items correctly', () => {
    expect(getIngredientCategory('milk-whole')).toBe('dairy');
    expect(getIngredientCategory('cheddar-cheese')).toBe('dairy');
    expect(getIngredientCategory('eggs-large')).toBe('protein');
  });

  it('categorizes produce correctly', () => {
    expect(getIngredientCategory('tomato-roma')).toBe('vegetables');
    expect(getIngredientCategory('onion-yellow')).toBe('vegetables');
    expect(getIngredientCategory('garlic-fresh')).toBe('vegetables');
    expect(getIngredientCategory('green-apple')).toBe('fruits');
  });

  it('categorizes grains and bakery correctly', () => {
    expect(getIngredientCategory('bread-whole-wheat')).toBe('grains');
    expect(getIngredientCategory('white-rice')).toBe('grains');
    expect(getIngredientCategory('pasta-penne')).toBe('grains');
  });

  it('categorizes pantry items correctly', () => {
    expect(getIngredientCategory('olive-oil')).toBe('pantry');
    expect(getIngredientCategory('soy-sauce')).toBe('pantry');
    expect(getIngredientCategory('salt-kosher')).toBe('spices');
  });

  it('returns other for unknown ingredients', () => {
    expect(getIngredientCategory('unknown-ingredient')).toBe('other');
    expect(getIngredientCategory('xyz-123')).toBe('other');
  });

  it('is case insensitive', () => {
    expect(getIngredientCategory('CHICKEN-BREAST')).toBe('protein');
    expect(getIngredientCategory('ChIcKeN')).toBe('protein');
  });
});

describe('getCategoryLabel', () => {
  it('resolves the localised name from the categories collection', () => {
    expect(getCategoryLabel('protein', mockIngredientCategories)).toBe('Proteins');
    expect(getCategoryLabel('protein', mockIngredientCategories, 'es')).toBe('Proteínas');
    expect(getCategoryLabel('spices', mockIngredientCategories, 'fr')).toBe('Épices et Herbes');
  });

  it('falls back to a capitalised id for unknown/undefined categories', () => {
    expect(getCategoryLabel('other', mockIngredientCategories)).toBe('Other');
    expect(getCategoryLabel(undefined)).toBe('Other');
    expect(getCategoryLabel('protein')).toBe('Protein');
  });
});

describe('convertToBaseUnit', () => {
  it('converts teaspoons to tablespoons', () => {
    const result = convertToBaseUnit(3, 'tsp');
    expect(result.quantity).toBeCloseTo(1, 2);
    expect(result.unit).toBe('tbsp');
  });

  it('converts ml to cups', () => {
    const result = convertToBaseUnit(240, 'ml');
    expect(result.quantity).toBeCloseTo(1, 1);
    expect(result.unit).toBe('cup');
  });

  it('converts ounces to pounds', () => {
    expect(convertToBaseUnit(16, 'oz')).toEqual({ quantity: 1, unit: 'lb' });
  });

  it('converts grams to kilograms', () => {
    expect(convertToBaseUnit(1000, 'g')).toEqual({ quantity: 1, unit: 'kg' });
  });

  it('converts to base units correctly', () => {
    expect(convertToBaseUnit(1, 'tbsp')).toEqual({ quantity: 1 / 16, unit: 'cup' });
    expect(convertToBaseUnit(2, 'cup')).toEqual({ quantity: 2, unit: 'cup' });
    expect(convertToBaseUnit(1, 'lb')).toEqual({ quantity: 1, unit: 'lb' });
  });

  it('handles unknown units gracefully', () => {
    expect(convertToBaseUnit(5, 'unknown-unit')).toEqual({ quantity: 5, unit: 'unknown-unit' });
  });

  it('is case insensitive', () => {
    expect(convertToBaseUnit(1, 'TSP').unit).toBe('tbsp');
  });

  it('handles zero quantities', () => {
    expect(convertToBaseUnit(0, 'tsp').quantity).toBe(0);
  });
});

describe('consolidateIngredients', () => {
  it('consolidates same ingredient with same unit', () => {
    const result = consolidateIngredients([
      { ingredientId: 'ing-1', quantity: 2, unit: 'cup', usedIn: ['Recipe A'] },
      { ingredientId: 'ing-1', quantity: 3, unit: 'cup', usedIn: ['Recipe B'] },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]!.quantity).toBe(5);
    expect(result[0]!.usedIn).toEqual(['Recipe A', 'Recipe B']);
  });

  it('consolidates ingredients with compatible units', () => {
    const result = consolidateIngredients([
      { ingredientId: 'ing-1', quantity: 1, unit: 'cup', usedIn: ['Recipe A'] },
      { ingredientId: 'ing-1', quantity: 16, unit: 'tbsp', usedIn: ['Recipe B'] },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]!.quantity).toBeCloseTo(2, 1);
  });

  it('keeps separate entries for different ingredients', () => {
    const result = consolidateIngredients([
      { ingredientId: 'ing-1', quantity: 2, unit: 'cup', usedIn: ['Recipe A'] },
      { ingredientId: 'ing-2', quantity: 3, unit: 'cup', usedIn: ['Recipe B'] },
    ]);
    expect(result).toHaveLength(2);
  });

  it('keeps separate entries for incompatible units', () => {
    const result = consolidateIngredients([
      { ingredientId: 'ing-1', quantity: 1, unit: 'cup', usedIn: ['Recipe A'] },
      { ingredientId: 'ing-1', quantity: 1, unit: 'lb', usedIn: ['Recipe B'] },
    ]);
    expect(result).toHaveLength(2);
  });

  // Issue 026: 4 decimals (was 2) so 30 ml → 0.125 cup survives the trip back to ml.
  it('rounds quantities to 4 decimal places', () => {
    const result = consolidateIngredients([
      { ingredientId: 'ing-1', quantity: 1.333333, unit: 'cup', usedIn: ['Recipe A'] },
      { ingredientId: 'ing-1', quantity: 2.666666, unit: 'cup', usedIn: ['Recipe B'] },
    ]);
    expect(result[0]!.quantity).toBe(4);
    expect(consolidateIngredients([{ ingredientId: 'ing-2', quantity: 30, unit: 'ml', usedIn: [] }])[0]!.quantity).toBe(0.125);
  });

  it('merges usedIn arrays without duplicates', () => {
    const result = consolidateIngredients([
      { ingredientId: 'ing-1', quantity: 1, unit: 'cup', usedIn: ['Recipe A', 'Recipe B'] },
      { ingredientId: 'ing-1', quantity: 1, unit: 'cup', usedIn: ['Recipe B', 'Recipe C'] },
    ]);
    expect(result[0]!.usedIn).toEqual(['Recipe A', 'Recipe B', 'Recipe C']);
  });

  it('handles empty array', () => {
    expect(consolidateIngredients([])).toHaveLength(0);
  });
});

describe('groupByCategory', () => {
  it('groups items by category', () => {
    const result = groupByCategory([
      makeShoppingItem({ ingredientId: 'chicken', category: 'protein' }),
      makeShoppingItem({ ingredientId: 'beef', category: 'protein' }),
      makeShoppingItem({ ingredientId: 'tomato', category: 'vegetables' }),
    ]);
    expect(result['protein']).toHaveLength(2);
    expect(result['vegetables']).toHaveLength(1);
  });

  it('sorts items within each category', () => {
    const result = groupByCategory([
      makeShoppingItem({ ingredientId: 'zucchini', category: 'vegetables' }),
      makeShoppingItem({ ingredientId: 'apple', category: 'vegetables' }),
      makeShoppingItem({ ingredientId: 'banana', category: 'vegetables' }),
    ]);
    expect(result['vegetables']!.map((i) => i.ingredientId)).toEqual(['apple', 'banana', 'zucchini']);
  });

  it('uses other for items without category', () => {
    const result = groupByCategory([makeShoppingItem({ category: undefined })]);
    expect(result['other']).toHaveLength(1);
  });

  it('handles empty array', () => {
    expect(Object.keys(groupByCategory([]))).toHaveLength(0);
  });
});

describe('exportAsText', () => {
  const labels = { categoryLabel: (id: string) => getCategoryLabel(id, mockIngredientCategories) };

  it('exports shopping list as formatted text', () => {
    const items: ShoppingListItem[] = [
      makeShoppingItem({ ingredientId: 'chicken-breast', quantity: 2, unit: 'lb', category: 'protein', checked: false, usedIn: ['Grilled Chicken'] }),
    ];
    const result = exportAsText(items, labels);
    expect(result).toContain('Shopping List');
    expect(result).toContain('PROTEINS');
    expect(result).toContain('2 lb chicken-breast');
    expect(result).toContain('Used in: Grilled Chicken');
  });

  it('shows checkboxes correctly', () => {
    const result = exportAsText([makeShoppingItem({ checked: true }), makeShoppingItem({ checked: false, ingredientId: 'ing-2' })]);
    expect(result).toContain('✓');
    expect(result).toContain('☐');
  });

  it('includes notes when present', () => {
    expect(exportAsText([makeShoppingItem({ notes: 'Get organic' })])).toContain('Note: Get organic');
  });

  it('can render ingredient names instead of ids', () => {
    const result = exportAsText([makeShoppingItem()], { ingredientLabel: () => 'Chicken Breast' });
    expect(result).toContain('1.5 lb Chicken Breast');
  });
});

describe('exportAsCSV', () => {
  it('exports shopping list as CSV', () => {
    const items: ShoppingListItem[] = [
      makeShoppingItem({ ingredientId: 'chicken-breast', quantity: 2, unit: 'lb', category: 'protein', checked: false, usedIn: ['Grilled Chicken'], notes: 'Fresh' }),
    ];
    const result = exportAsCSV(items, { categoryLabel: (id) => getCategoryLabel(id, mockIngredientCategories) });
    expect(result).toContain('Category,Ingredient,Quantity,Unit,Checked,Used In,Notes');
    expect(result).toContain('"Proteins","chicken-breast",2,"lb","No","Grilled Chicken","Fresh"');
  });

  it('handles items with no notes', () => {
    expect(exportAsCSV([makeShoppingItem({ notes: undefined })])).toContain('""');
  });

  it('handles checked items', () => {
    expect(exportAsCSV([makeShoppingItem({ checked: true })])).toContain('"Yes"');
  });

  it('handles multiple recipes in usedIn', () => {
    expect(exportAsCSV([makeShoppingItem({ usedIn: ['Recipe A', 'Recipe B', 'Recipe C'] })])).toContain('Recipe A; Recipe B; Recipe C');
  });

  it('escapes double quotes inside cells', () => {
    expect(exportAsCSV([makeShoppingItem({ notes: 'free "range"' })])).toContain('"free ""range"""');
  });
});

describe('exportForWhatsApp', () => {
  it('exports shopping list for WhatsApp', () => {
    const items: ShoppingListItem[] = [
      makeShoppingItem({ ingredientId: 'chicken-breast', quantity: 2, unit: 'lb', category: 'protein', checked: false }),
    ];
    const result = exportForWhatsApp(items, { categoryLabel: (id) => getCategoryLabel(id, mockIngredientCategories) });
    expect(result).toContain('🛒 *Shopping List*');
    expect(result).toContain('*Proteins*');
    expect(result).toContain('2 lb chicken-breast');
    expect(result).toContain('_Total items: 1_');
  });

  it('uses appropriate emoji for checked items', () => {
    const result = exportForWhatsApp([makeShoppingItem({ checked: true }), makeShoppingItem({ ingredientId: 'ing-2', checked: false })]);
    expect(result).toContain('✅');
    expect(result).toContain('☑️');
  });

  it('counts total items correctly', () => {
    const result = exportForWhatsApp([makeShoppingItem(), makeShoppingItem({ ingredientId: 'ing-2' }), makeShoppingItem({ ingredientId: 'ing-3' })]);
    expect(result).toContain('_Total items: 3_');
  });
});

// ── Roadmap Issue 026: list view, display units, localised exports ──────────

describe('localised exports (Issue 026)', () => {
  const labels = {
    categoryLabel: (id: string) => getCategoryLabel(id, mockIngredientCategories, 'es'),
    ingredientLabel: () => 'Pechuga de Pollo',
    recipeLabel: (id: string) => (id === 'rec_001' ? 'Huevos Revueltos' : id),
    unitLabel: (unit: string) => (unit === 'lb' ? 'lb' : unit),
    quantityLabel: (q: number) => `~${q}`,
    strings: {
      title: 'Lista de Compras',
      note: 'Nota',
      usedIn: 'Usado en',
      totalItems: 'Artículos',
      yes: 'Sí',
      no: 'No',
      headers: { category: 'Categoría', ingredient: 'Ingrediente', quantity: 'Cantidad', unit: 'Unidad', checked: 'Comprado', usedIn: 'Usado en', notes: 'Notas' },
    },
  };
  const items = [makeShoppingItem({ notes: 'fresca', checked: true })];

  it('text uses the locale words, recipe names and quantity labels', () => {
    const text = exportAsText(items, labels);
    expect(text).toContain('Lista de Compras');
    expect(text).toContain('PROTEÍNAS');
    expect(text).toContain('✓ ~1.5 lb Pechuga de Pollo');
    expect(text).toContain('Nota: fresca');
    expect(text).toContain('Usado en: Huevos Revueltos');
  });

  it('csv localises the header and yes/no but keeps numeric quantities', () => {
    const csv = exportAsCSV(items, labels);
    expect(csv.split('\n')[0]).toBe('Categoría,Ingrediente,Cantidad,Unidad,Comprado,Usado en,Notas');
    expect(csv).toContain('"Proteínas","Pechuga de Pollo",1.5,"lb","Sí","Huevos Revueltos","fresca"');
  });

  it('whatsapp localises the title and the total', () => {
    const text = exportForWhatsApp(items, labels);
    expect(text).toContain('🛒 *Lista de Compras*');
    expect(text).toContain('_Artículos: 1_');
  });

  it('whatsappShareUrl targets wa.me with the text URL-encoded', () => {
    expect(whatsappShareUrl('🛒 *List*\n2 lb chicken & rice')).toBe(
      `https://wa.me/?text=${encodeURIComponent('🛒 *List*\n2 lb chicken & rice')}`,
    );
    expect(whatsappShareUrl('a b')).toBe('https://wa.me/?text=a%20b');
  });
});

describe('toShoppingDisplay / fromShoppingDisplay', () => {
  it('converts base units to the metric system at a readable magnitude', () => {
    expect(toShoppingDisplay(1, 'cup', 'metric')).toMatchObject({ quantity: 240, unit: 'ml' });
    expect(toShoppingDisplay(5, 'cup', 'metric')).toMatchObject({ quantity: 1.2, unit: 'l' });
    expect(toShoppingDisplay(0.5, 'lb', 'metric')).toMatchObject({ quantity: 226.8, unit: 'g' });
    expect(toShoppingDisplay(3, 'piece', 'metric')).toEqual({ quantity: 3, unit: 'piece', formatted: '3' });
  });

  it('converts to imperial and steps small cups down to tbsp / tsp', () => {
    expect(toShoppingDisplay(0.0625, 'cup', 'imperial')).toMatchObject({ quantity: 1, unit: 'tbsp' });
    expect(toShoppingDisplay(1 / 48, 'cup', 'imperial')).toMatchObject({ quantity: 1, unit: 'tsp' });
    expect(toShoppingDisplay(2, 'kg', 'imperial')).toMatchObject({ quantity: 4.41, unit: 'lb' });
    expect(toShoppingDisplay(1.5, 'cup', 'imperial')).toEqual({ quantity: 1.5, unit: 'cup', formatted: '1 ½' });
  });

  it('maps an edit made in the display unit back to the stored unit', () => {
    expect(fromShoppingDisplay(480, 'ml', 'cup')).toEqual({ quantity: 2, unit: 'cup' });
    expect(fromShoppingDisplay(2.4, 'l', 'cup').quantity).toBeCloseTo(10, 2);
    expect(fromShoppingDisplay(500, 'g', 'lb')).toEqual({ quantity: 1.1023, unit: 'lb' });
    expect(fromShoppingDisplay(4, 'piece', 'piece')).toEqual({ quantity: 4, unit: 'piece' });
    expect(fromShoppingDisplay(3, 'clove', 'piece')).toEqual({ quantity: 3, unit: 'clove' });
  });

  it('localizeShoppingList converts every line for the exports', () => {
    const [line] = localizeShoppingList([makeShoppingItem({ quantity: 1, unit: 'cup' })], 'metric');
    expect(line).toMatchObject({ quantity: 240, unit: 'ml', ingredientId: 'ing_001' });
  });
});

describe('line identity', () => {
  it('keys lines by ingredient and unit', () => {
    expect(shoppingItemKey({ ingredientId: 'ing_001', unit: 'cup' })).not.toBe(shoppingItemKey({ ingredientId: 'ing_001', unit: 'piece' }));
    expect(matchesShoppingItem({ ingredientId: 'ing_001', unit: 'cup' }, 'ing_001')).toBe(true);
    expect(matchesShoppingItem({ ingredientId: 'ing_001', unit: 'cup' }, 'ing_001', 'piece')).toBe(false);
  });

  it('manual lines have no usedIn or a custom id', () => {
    expect(isManualShoppingItem(makeShoppingItem({ usedIn: [] }))).toBe(true);
    expect(isManualShoppingItem(makeShoppingItem({ usedIn: ['rec_001'] }))).toBe(false);
    expect(isManualShoppingItem(makeShoppingItem({ ingredientId: 'custom-x', usedIn: ['rec_001'] }))).toBe(true);
  });
});

describe('filter / sort / group for the list view', () => {
  const names: Record<string, string> = { a: 'Zucchini', b: 'Apple', c: 'Milk' };
  const nameOf = (i: ShoppingListItem) => names[i.ingredientId] ?? i.ingredientId;
  const list = [
    makeShoppingItem({ ingredientId: 'a', category: 'vegetables', checked: true }),
    makeShoppingItem({ ingredientId: 'b', category: 'fruits', notes: 'green' }),
    makeShoppingItem({ ingredientId: 'c', category: undefined }),
  ];

  it('searches display names, category labels and notes; hides checked on demand', () => {
    expect(filterShoppingItems(list, { search: 'zucc', showChecked: true }, nameOf).map((i) => i.ingredientId)).toEqual(['a']);
    expect(filterShoppingItems(list, { search: 'GREEN', showChecked: true }, nameOf).map((i) => i.ingredientId)).toEqual(['b']);
    expect(filterShoppingItems(list, { search: 'fruit', showChecked: true }, nameOf, (id) => id).map((i) => i.ingredientId)).toEqual(['b']);
    expect(filterShoppingItems(list, { search: '', showChecked: false }, nameOf).map((i) => i.ingredientId)).toEqual(['b', 'c']);
  });

  it('sorts by name or by status (unchecked first)', () => {
    expect(sortShoppingItems(list, 'name', nameOf).map(nameOf)).toEqual(['Apple', 'Milk', 'Zucchini']);
    expect(sortShoppingItems(list, 'checked', nameOf).map(nameOf)).toEqual(['Apple', 'Milk', 'Zucchini']);
    expect(sortShoppingItems([list[0]!, list[1]!], 'checked', nameOf).at(-1)?.checked).toBe(true);
  });

  it('groups in catalog order with unknown categories next and other last', () => {
    const groups = groupShoppingItems(
      [...list, makeShoppingItem({ ingredientId: 'd', category: 'bakery' })],
      ['protein', 'vegetables', 'fruits'],
    );
    expect(groups.map((g) => g.category)).toEqual(['vegetables', 'fruits', 'bakery', 'other']);
    expect(groups[3]!.items.map((i) => i.ingredientId)).toEqual(['c']);
  });
});

describe('mergeGeneratedList', () => {
  it('replaces recipe lines, keeps manual lines and carries checked/notes over', () => {
    const current = [
      makeShoppingItem({ ingredientId: 'ing_001', unit: 'piece', quantity: 2, usedIn: ['rec_001'], checked: true, notes: 'free range' }),
      makeShoppingItem({ ingredientId: 'ing_009', unit: 'cup', quantity: 1, usedIn: ['rec_009'] }),
      makeShoppingItem({ ingredientId: 'custom-1-milk', name: 'Milk', unit: 'l', quantity: 1, usedIn: [] }),
    ];
    const generated = [
      makeShoppingItem({ ingredientId: 'ing_001', unit: 'piece', quantity: 6, usedIn: ['rec_001', 'rec_002'], notes: '' }),
      makeShoppingItem({ ingredientId: 'ing_002', unit: 'cup', quantity: 0.5, usedIn: ['rec_002'] }),
    ];
    const merged = mergeGeneratedList(current, generated);
    expect(merged.map((i) => [i.ingredientId, i.quantity, i.checked])).toEqual([
      ['ing_001', 6, true],
      ['ing_002', 0.5, false],
      ['custom-1-milk', 1, false],
    ]);
    expect(merged[0]!.notes).toBe('free range');
  });

  it('a manual line with the same ingredient + unit absorbs the generated quantity', () => {
    const merged = mergeGeneratedList(
      [makeShoppingItem({ ingredientId: 'ing_001', unit: 'lb', quantity: 1, usedIn: [] })],
      [makeShoppingItem({ ingredientId: 'ing_001', unit: 'lb', quantity: 1.25, usedIn: ['rec_001'] })],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ quantity: 2.25, usedIn: ['rec_001'] });
  });
});
