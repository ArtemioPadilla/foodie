import { describe, expect, it } from 'vitest';
import { PantryItemFormSchema, pantryItemFormSchema, PantryItemsSchema, type PantryItem } from '@/schemas';
import { makeIngredient, makeRecipe } from '@/tests/fixtures/foodie-domain';
import {
  availableIngredientIds,
  daysUntilExpiration,
  expirationStatus,
  filterPantryItems,
  getExpiredItems,
  getExpiringSoon,
  getLowStock,
  isLowStock,
  makePantryNaming,
  missingShoppingLines,
  normalizeName,
  pantryCategories,
  pantryShoppingLine,
  resolveCatalogIngredient,
  sortPantryItems,
  whatCanICook,
} from './pantry';

// Local noon, so the calendar-day arithmetic never straddles midnight.
const NOW = new Date(2026, 8, 28, 12, 0, 0); // 2026-09-28

function item(overrides: Partial<PantryItem> = {}): PantryItem {
  return {
    id: overrides.id ?? `pantry_${overrides.ingredientId ?? 'ing_001'}`,
    ingredientId: 'ing_001',
    quantity: 4,
    unit: 'piece',
    addedAt: '2026-09-01T10:00:00.000Z',
    ...overrides,
  };
}

const chicken = makeIngredient();
const oil = makeIngredient({ id: 'ing_002', name: { en: 'Olive Oil', es: 'Aceite de Oliva', fr: "Huile d'Olive" }, category: 'pantry', unit: 'ml' });
const rice = makeIngredient({ id: 'ing_003', name: { en: 'Rice', es: 'Arroz', fr: 'Riz' }, category: 'grains', unit: 'cup' });
const ingredients = [chicken, oil, rice];

describe('expiration', () => {
  it('counts local calendar days (today 0, tomorrow 1, yesterday -1), null without a date', () => {
    expect(daysUntilExpiration('2026-09-28', NOW)).toBe(0);
    expect(daysUntilExpiration('2026-09-29', NOW)).toBe(1);
    expect(daysUntilExpiration('2026-09-27', NOW)).toBe(-1);
    expect(daysUntilExpiration('2026-10-05', new Date(2026, 8, 28, 23, 59))).toBe(7);
    expect(daysUntilExpiration('2026-10-05T00:00:00.000Z', NOW)).toBe(7);
    expect(daysUntilExpiration(undefined, NOW)).toBeNull();
    expect(daysUntilExpiration('not a date', NOW)).toBeNull();
  });

  it('classifies expired / soon (today … +7) / fresh / none', () => {
    expect(expirationStatus({ expirationDate: '2026-09-27' }, NOW)).toBe('expired');
    expect(expirationStatus({ expirationDate: '2026-09-28' }, NOW)).toBe('soon');
    expect(expirationStatus({ expirationDate: '2026-10-05' }, NOW)).toBe('soon');
    expect(expirationStatus({ expirationDate: '2026-10-06' }, NOW)).toBe('fresh');
    expect(expirationStatus({}, NOW)).toBe('none');
  });

  it('lists expiring-soon items soonest first and expired items most recent first', () => {
    const items = [
      item({ id: 'a', expirationDate: '2026-10-03' }),
      item({ id: 'b', expirationDate: '2026-09-28' }),
      item({ id: 'c', expirationDate: '2026-09-20' }),
      item({ id: 'd', expirationDate: '2026-09-26' }),
      item({ id: 'e', expirationDate: '2026-12-01' }),
      item({ id: 'f' }),
    ];
    expect(getExpiringSoon(items, NOW).map((i) => i.id)).toEqual(['b', 'a']);
    expect(getExpiredItems(items, NOW).map((i) => i.id)).toEqual(['d', 'c']);
  });
});

describe('stock', () => {
  it('flags low stock with a per-unit threshold (1 by default, 50 g / 50 ml)', () => {
    expect(isLowStock({ quantity: 1, unit: 'piece' })).toBe(true);
    expect(isLowStock({ quantity: 2, unit: 'piece' })).toBe(false);
    expect(isLowStock({ quantity: 40, unit: 'g' })).toBe(true);
    expect(isLowStock({ quantity: 200, unit: 'ml' })).toBe(false);
    expect(isLowStock({ quantity: 0, unit: 'cup' })).toBe(true);
  });

  it('sorts low stock emptiest first', () => {
    const items = [item({ id: 'a', quantity: 1 }), item({ id: 'b', quantity: 0 }), item({ id: 'c', quantity: 5 })];
    expect(getLowStock(items).map((i) => i.id)).toEqual(['b', 'a']);
  });
});

describe('names and categories', () => {
  it('normalises case, accents and separators', () => {
    expect(normalizeName('  Pechuga_de-POLLO ')).toBe('pechuga de pollo');
    expect(normalizeName('Œufs Brûlés')).toBe('œufs brules');
  });

  it('resolves a typed name to the catalog in any language, or by id', () => {
    expect(resolveCatalogIngredient('chicken breast', ingredients)?.id).toBe('ing_001');
    expect(resolveCatalogIngredient('aceite de oliva', ingredients)?.id).toBe('ing_002');
    expect(resolveCatalogIngredient('RIZ', ingredients)?.id).toBe('ing_003');
    expect(resolveCatalogIngredient('ing_003', ingredients)?.id).toBe('ing_003');
    expect(resolveCatalogIngredient('Oat milk', ingredients)).toBeUndefined();
    expect(resolveCatalogIngredient('   ', ingredients)).toBeUndefined();
  });

  it('names catalog items in the page locale, custom items by their name, legacy free text humanised', () => {
    const naming = makePantryNaming(ingredients, 'es');
    expect(naming.nameOf(item())).toBe('Pechuga de Pollo');
    expect(naming.nameOf(item({ ingredientId: 'custom-0000-oat-milk', name: 'Oat milk' }))).toBe('Oat milk');
    expect(naming.nameOf(item({ ingredientId: 'green_tea' }))).toBe('green tea');
    expect(naming.categoryOf(item())).toBe('protein');
    expect(naming.categoryOf(item({ ingredientId: 'custom-x-oat', category: 'dairy' }))).toBe('dairy');
    expect(naming.categoryOf(item({ ingredientId: 'Chicken breast' }))).toBe('other');
  });

  it('lists the categories present, in taxonomy order with other last', () => {
    const naming = makePantryNaming(ingredients, 'en');
    const items = [item({ ingredientId: 'ing_003' }), item({ ingredientId: 'custom-x', name: 'X' }), item({ ingredientId: 'ing_001' })];
    expect(pantryCategories(items, naming.categoryOf, ['protein', 'grains'])).toEqual(['protein', 'grains', 'other']);
  });
});

describe('inventory view', () => {
  const naming = makePantryNaming(ingredients, 'en');
  const items = [
    item({ id: 'chicken', ingredientId: 'ing_001', quantity: 1, expirationDate: '2026-09-30', location: 'Fridge', addedAt: '2026-09-02T00:00:00.000Z' }),
    item({ id: 'oil', ingredientId: 'ing_002', quantity: 500, unit: 'ml', addedAt: '2026-09-03T00:00:00.000Z' }),
    item({ id: 'rice', ingredientId: 'ing_003', quantity: 3, unit: 'cup', expirationDate: '2026-09-01', location: 'Cabinet', addedAt: '2026-09-01T00:00:00.000Z' }),
  ];

  it('searches name, id and location', () => {
    const f = (search: string) => filterPantryItems(items, { search, category: 'all', status: 'all' }, naming, NOW).map((i) => i.id);
    expect(f('olive')).toEqual(['oil']);
    expect(f('fridge')).toEqual(['chicken']);
    expect(f('ing_003')).toEqual(['rice']);
    expect(f('')).toEqual(['chicken', 'oil', 'rice']);
  });

  it('filters by category and status', () => {
    const f = (category: string, status: 'all' | 'expiring' | 'expired' | 'low') =>
      filterPantryItems(items, { search: '', category, status }, naming, NOW).map((i) => i.id);
    expect(f('grains', 'all')).toEqual(['rice']);
    expect(f('all', 'expiring')).toEqual(['chicken']);
    expect(f('all', 'expired')).toEqual(['rice']);
    expect(f('all', 'low')).toEqual(['chicken']);
    expect(f('protein', 'expired')).toEqual([]);
  });

  it('sorts by expiration (undated last), name, quantity and date added', () => {
    const s = (sort: 'expiration' | 'name' | 'quantity' | 'added') => sortPantryItems(items, sort, naming.nameOf, 'en', NOW).map((i) => i.id);
    expect(s('expiration')).toEqual(['rice', 'chicken', 'oil']);
    expect(s('name')).toEqual(['chicken', 'oil', 'rice']);
    expect(s('quantity')).toEqual(['chicken', 'rice', 'oil']);
    expect(s('added')).toEqual(['oil', 'chicken', 'rice']);
  });
});

describe('what can I cook', () => {
  const eggs = makeRecipe(); // ing_001 + ing_002, rating 4.5
  const pilaf = makeRecipe({
    id: 'rec_002',
    rating: 4,
    ingredients: [
      { ingredientId: 'ing_003', quantity: 1, unit: 'cup', optional: false },
      { ingredientId: 'ing_002', quantity: 1, unit: 'tbsp', optional: false },
      { ingredientId: 'ing_009', quantity: 1, unit: 'tsp', optional: true },
    ],
  });
  const stew = makeRecipe({
    id: 'rec_003',
    rating: 5,
    ingredients: [
      { ingredientId: 'ing_001', quantity: 1, unit: 'lb', optional: false },
      { ingredientId: 'ing_004', quantity: 1, unit: 'cup', optional: false },
      { ingredientId: 'ing_005', quantity: 1, unit: 'cup', optional: false },
    ],
  });
  const noMatch = makeRecipe({ id: 'rec_004', ingredients: [{ ingredientId: 'ing_099', quantity: 1, unit: 'cup', optional: false }] });
  const recipes = [stew, noMatch, eggs, pilaf];

  it('counts stocked, unexpired items; custom and legacy free-text names map to the catalog', () => {
    const ids = availableIngredientIds(
      [
        item({ ingredientId: 'ing_001' }),
        item({ ingredientId: 'ing_002', quantity: 0 }),
        item({ ingredientId: 'ing_003', expirationDate: '2026-09-01' }),
        item({ ingredientId: 'custom-0000-arroz', name: 'Arroz' }),
        item({ ingredientId: 'Olive oil' }),
        item({ ingredientId: 'custom-0000-oat-milk', name: 'Oat milk' }),
      ],
      ingredients,
      NOW,
    );
    expect([...ids].sort()).toEqual(['ing_001', 'ing_002', 'ing_003']);
  });

  it('ranks recipes by the share of required ingredients available, optional ones ignored', () => {
    const matches = whatCanICook(recipes, new Set(['ing_001', 'ing_002', 'ing_003']));
    expect(matches.map((m) => [m.recipe.id, Math.round(m.matchPercentage)])).toEqual([
      ['rec_001', 100],
      ['rec_002', 100],
      ['rec_003', 33],
    ]);
    expect(matches[2]).toMatchObject({ matchedIngredients: 1, totalIngredients: 3, missingIngredients: ['ing_004', 'ing_005'] });
    expect(matches.some((m) => m.recipe.id === 'rec_004')).toBe(false);
  });

  it('breaks ties by expiring ingredients used, then rating; honours minPercentage and limit', () => {
    const available = new Set(['ing_001', 'ing_002', 'ing_003']);
    const tied = whatCanICook(recipes, available, { expiringIds: new Set(['ing_003']) });
    expect(tied.map((m) => m.recipe.id)).toEqual(['rec_002', 'rec_001', 'rec_003']);
    expect(tied[0]!.expiringIngredients).toBe(1);
    expect(whatCanICook(recipes, available, { minPercentage: 50 }).map((m) => m.recipe.id)).toEqual(['rec_001', 'rec_002']);
    expect(whatCanICook(recipes, available, { limit: 1 })).toHaveLength(1);
    expect(whatCanICook(recipes, new Set())).toEqual([]);
  });
});

describe('add to shopping list', () => {
  const naming = makePantryNaming(ingredients, 'en');

  it('restocks a catalog item (or a free-text one naming it) as the catalog ingredient', () => {
    expect(pantryShoppingLine(item({ quantity: 1 }), ingredients, naming)).toEqual({
      ingredientId: 'ing_001',
      quantity: 1,
      unit: 'piece',
      usedIn: [],
      category: 'protein',
    });
    expect(pantryShoppingLine(item({ ingredientId: 'Olive oil', unit: 'ml', quantity: 20 }), ingredients, naming)).toMatchObject({
      ingredientId: 'ing_002',
      quantity: 50,
      unit: 'ml',
      category: 'pantry',
    });
  });

  it('keeps a custom item custom, with its name and category', () => {
    const line = pantryShoppingLine(item({ ingredientId: 'custom-0000-oat-milk', name: 'Oat milk', category: 'dairy', unit: 'l' }), ingredients, naming);
    expect(line).toEqual({ ingredientId: 'custom-0000-oat-milk', name: 'Oat milk', category: 'dairy', quantity: 1, unit: 'l', usedIn: [] });
  });

  it('lists the missing required lines of a suggestion with recipe quantities', () => {
    const recipe = makeRecipe({
      ingredients: [
        { ingredientId: 'ing_001', quantity: 2, unit: 'piece', optional: false },
        { ingredientId: 'ing_003', quantity: 1, unit: 'cup', optional: false },
        { ingredientId: 'ing_002', quantity: 1, unit: 'tbsp', optional: true },
      ],
    });
    const [match] = whatCanICook([recipe], new Set(['ing_001']));
    expect(missingShoppingLines(match!, ingredients)).toEqual([
      { ingredientId: 'ing_003', quantity: 1, unit: 'cup', usedIn: ['rec_001'], category: 'grains' },
    ]);
  });
});

describe('pantry item form schema', () => {
  const valid = { name: 'Rice', quantity: '2', unit: 'cup', expirationDate: '2026-10-01', location: 'Cabinet', category: '' };

  it('accepts a complete item and the optional fields empty', () => {
    expect(PantryItemFormSchema.safeParse(valid).success).toBe(true);
    expect(PantryItemFormSchema.safeParse({ ...valid, expirationDate: '', location: '' }).success).toBe(true);
  });

  it('rejects an empty name, a non-positive quantity, a bad date or location, with injected messages', () => {
    const schema = pantryItemFormSchema({ nameRequired: 'N', nameTooLong: 'L', quantityInvalid: 'Q', unitRequired: 'U', dateInvalid: 'D' });
    const issues = (values: object) => {
      const result = schema.safeParse({ ...valid, ...values });
      return result.success ? [] : result.error.issues.map((i) => i.message);
    };
    expect(issues({ name: '  ' })).toEqual(['N']);
    expect(issues({ name: 'x'.repeat(61) })).toEqual(['L']);
    expect(issues({ quantity: '0' })).toEqual(['Q']);
    expect(issues({ quantity: 'abc' })).toEqual(['Q']);
    expect(issues({ unit: '' })).toEqual(['U']);
    expect(issues({ expirationDate: '01/10/2026' })).toContain('D');
    expect(issues({ location: 'Garage' }).length).toBeGreaterThan(0);
  });

  it('keeps stored inventories without name/category valid (legacy shape)', () => {
    expect(PantryItemsSchema.safeParse([{ id: 'p1', ingredientId: 'Chicken breast', quantity: 1, unit: 'piece', addedAt: '2025-01-01T00:00:00Z' }]).success).toBe(true);
  });
});
