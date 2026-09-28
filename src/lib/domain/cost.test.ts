import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { IngredientPricesFileSchema, IngredientsFileSchema, pricesFromFile, RecipesFileSchema, type IngredientPrice } from '@/schemas';
import { makeIngredient, makePlan, makeRecipe, makeShoppingItem } from '@/tests/fixtures/foodie-domain';
import {
  buildPriceBook,
  calculateCostPerServing,
  calculatePlanCost,
  calculateRecipeCost,
  catalogPriceOf,
  convertQuantityExact,
  estimatePlanCost,
  estimateShoppingCost,
  getPriceDataCoverage,
  hasCompleteData,
  parsePackUnit,
  unitPriceFromQuote,
  type PriceLookup,
} from './cost';

/**
 * Roadmap Issue 041 — port of PR #28's `costCalculations.ts` (+ its NaN /
 * division-by-zero guards) and `IngredientContext` pricing (custom > catalog).
 */

const fixed = (prices: Record<string, number>): PriceLookup => (id) => prices[id];
const quote = (overrides: Partial<IngredientPrice> = {}): IngredientPrice => ({
  id: 'ing_001',
  price: 4.29,
  unit: 'dozen',
  currency: 'USD',
  legacyKey: 'eggs',
  ...overrides,
});

// makeRecipe(): 2 servings — 4 piece ing_001 + 30 ml ing_002
const recipe = makeRecipe();

describe('calculateRecipeCost (PR #28)', () => {
  it('sums price × quantity scaled to the servings, rounded to cents', () => {
    const price = fixed({ ing_001: 0.5, ing_002: 0.01 });
    expect(calculateRecipeCost(recipe, 2, price)).toBe(2.3); // 4 × .5 + 30 × .01
    expect(calculateRecipeCost(recipe, 4, price)).toBe(4.6);
    expect(calculateRecipeCost(recipe, 1, price)).toBe(1.15);
  });

  it('skips ingredients without a price', () => {
    expect(calculateRecipeCost(recipe, 2, fixed({ ing_001: 0.5 }))).toBe(2);
    expect(calculateRecipeCost(recipe, 2, fixed({}))).toBe(0);
  });

  it('returns 0 for zero, negative, NaN or infinite servings', () => {
    const price = fixed({ ing_001: 1 });
    for (const servings of [0, -2, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(calculateRecipeCost(recipe, servings, price)).toBe(0);
    }
  });

  it('returns 0 when the recipe has zero servings (no division by zero)', () => {
    const broken = { ...recipe, servings: 0 };
    expect(calculateRecipeCost(broken, 2, fixed({ ing_001: 1 }))).toBe(0);
  });

  it('ignores zero, negative, NaN and infinite prices', () => {
    for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(calculateRecipeCost(recipe, 2, fixed({ ing_001: bad, ing_002: 0.01 }))).toBe(0.3);
    }
  });

  it('ignores negative or non-finite quantities', () => {
    const odd = {
      ...recipe,
      ingredients: [
        { ingredientId: 'ing_001', quantity: -3, unit: 'piece', optional: false },
        { ingredientId: 'ing_002', quantity: Number.NaN, unit: 'ml', optional: false },
        { ingredientId: 'ing_003', quantity: 2, unit: 'piece', optional: false },
      ],
    };
    expect(calculateRecipeCost(odd, 2, fixed({ ing_001: 1, ing_002: 1, ing_003: 1.25 }))).toBe(2.5);
  });

  it('never returns NaN even with an overflowing product', () => {
    const cost = calculateRecipeCost(recipe, 2, fixed({ ing_001: Number.MAX_VALUE, ing_002: Number.MAX_VALUE }));
    expect(Number.isNaN(cost)).toBe(false);
    expect(Number.isFinite(cost)).toBe(true);
  });
});

describe('calculatePlanCost (PR #28)', () => {
  const byId = (id: string) => (id === recipe.id ? recipe : undefined);
  const price = fixed({ ing_001: 0.5, ing_002: 0.01 });

  it('sums breakfast, lunch, dinner and snacks at their servings', () => {
    const plan = makePlan();
    plan.days[0]!.meals = {
      breakfast: { recipeId: 'rec_001', servings: 2 },
      lunch: { recipeId: 'rec_001', servings: 4 },
      snacks: [{ recipeId: 'rec_001', servings: 1 }],
    };
    plan.days[3]!.meals = { dinner: { recipeId: 'rec_001', servings: 2 } };
    expect(calculatePlanCost(plan, byId, price)).toBe(10.35); // 2.30 + 4.60 + 1.15 + 2.30
  });

  it('skips unknown recipes and returns 0 for an empty or missing plan', () => {
    const plan = makePlan();
    plan.days[0]!.meals = { breakfast: { recipeId: 'nope', servings: 2 } };
    expect(calculatePlanCost(plan, byId, price)).toBe(0);
    expect(calculatePlanCost(makePlan({ days: [] }), byId, price)).toBe(0);
    expect(calculatePlanCost(undefined as never, byId, price)).toBe(0);
  });

  it('a zero-serving slot costs nothing instead of NaN', () => {
    const plan = makePlan();
    plan.days[0]!.meals = { breakfast: { recipeId: 'rec_001', servings: 0 } };
    expect(calculatePlanCost(plan, byId, price)).toBe(0);
  });
});

describe('calculateCostPerServing (PR #28)', () => {
  it('divides the full-recipe cost by its servings', () => {
    expect(calculateCostPerServing(recipe, fixed({ ing_001: 0.5, ing_002: 0.01 }))).toBe(1.15);
  });

  it('returns 0 when servings is 0, negative or not finite', () => {
    for (const servings of [0, -1, Number.NaN]) {
      expect(calculateCostPerServing({ ...recipe, servings }, fixed({ ing_001: 1 }))).toBe(0);
    }
  });
});

describe('price coverage (PR #28 hasCompleteData / getPriceDataCoverage)', () => {
  const price = fixed({ a: 1, b: 2 });
  it('reports completeness and a percentage, 0 for an empty list', () => {
    expect(hasCompleteData(['a', 'b'], price)).toBe(true);
    expect(hasCompleteData(['a', 'c'], price)).toBe(false);
    expect(getPriceDataCoverage(['a', 'b', 'c', 'd'], price)).toBe(50);
    expect(getPriceDataCoverage([], price)).toBe(0);
  });
});

describe('exact unit conversion', () => {
  it('converts within mass, volume and count, never across', () => {
    expect(convertQuantityExact(1, 'lb', 'oz')).toBe(16);
    expect(convertQuantityExact(1, 'gallon', 'cup')).toBe(16);
    expect(convertQuantityExact(3, 'tsp', 'tbsp')).toBeCloseTo(1);
    expect(convertQuantityExact(1, 'dozen', 'piece')).toBe(12);
    expect(convertQuantityExact(2, 'Cup', ' cup ')).toBe(2);
    expect(convertQuantityExact(1, 'lb', 'cup')).toBeUndefined();
    expect(convertQuantityExact(1, 'head', 'cup')).toBeUndefined();
    expect(convertQuantityExact(Number.NaN, 'lb', 'lb')).toBeUndefined();
  });

  it('parses PR #28 pack units', () => {
    expect(parsePackUnit('25oz')).toEqual({ size: 25, unit: 'oz' });
    expect(parsePackUnit('lb')).toEqual({ size: 1, unit: 'lb' });
    expect(parsePackUnit('20bags')).toEqual({ size: 20, unit: 'bags' });
    expect(parsePackUnit('0lb')).toBeUndefined();
    expect(parsePackUnit('fl oz')).toBeUndefined();
  });

  it('turns a pack quote into a per-recipe-unit price only when exact', () => {
    expect(unitPriceFromQuote({ price: 4.29, unit: 'dozen' }, 'piece')).toBeCloseTo(0.3575);
    expect(unitPriceFromQuote({ price: 1.99, unit: 'lb' }, 'oz')).toBeCloseTo(0.124375);
    expect(unitPriceFromQuote({ price: 3.99, unit: 'gallon' }, 'cup')).toBeCloseTo(0.249375);
    // Weight ounces never become cups or tablespoons (that needs a density).
    expect(unitPriceFromQuote({ price: 9.99, unit: '25oz' }, 'tbsp')).toBeUndefined();
    expect(unitPriceFromQuote({ price: 2.49, unit: 'lb' }, 'piece')).toBeUndefined();
    expect(unitPriceFromQuote({ price: 0, unit: 'lb' }, 'lb')).toBeUndefined();
  });
});

describe('buildPriceBook — custom > catalog', () => {
  const eggs = makeIngredient({ id: 'ing_001', unit: 'piece', avgPrice: 0.5 });
  const oil = makeIngredient({ id: 'ing_003', unit: 'tbsp', avgPrice: 0.3 });
  const saffron = makeIngredient({ id: 'ing_009', unit: 'g', avgPrice: 0 });
  const ingredients = [eggs, oil, saffron];
  const prices = [quote(), quote({ id: 'ing_003', price: 9.99, unit: '25oz', legacyKey: 'olive_oil' })];

  it('uses the store quote when it converts exactly, else avgPrice', () => {
    const book = buildPriceBook({ ingredients, prices, currency: 'USD' });
    expect(book.resolve('ing_001')).toMatchObject({ source: 'catalog', unit: 'piece', quote: prices[0] });
    expect(book.priceOf('ing_001')).toBeCloseTo(0.3575);
    expect(book.resolve('ing_003')).toMatchObject({ source: 'catalog', price: 0.3 });
    expect(book.resolve('ing_009')).toBeUndefined(); // avgPrice 0 = no price
    expect(book.resolve('unknown')).toBeUndefined();
  });

  it('a custom price in the current currency wins', () => {
    const book = buildPriceBook({
      ingredients,
      prices,
      custom: { ing_001: { price: 0.6, currency: 'USD' } },
      currency: 'USD',
    });
    expect(book.resolve('ing_001')).toMatchObject({ source: 'custom', price: 0.6 });
    expect(book.isCustom('ing_001')).toBe(true);
    expect(book.isCustom('ing_003')).toBe(false);
    expect(book.catalog('ing_001')?.price).toBeCloseTo(0.3575);
  });

  it('never mixes currencies: other-currency prices are left out', () => {
    const book = buildPriceBook({
      ingredients,
      prices,
      custom: { ing_001: { price: 0.6, currency: 'USD' }, ing_003: { price: 0.25, currency: 'EUR' } },
      currency: 'EUR',
    });
    expect(book.resolve('ing_001')).toBeUndefined(); // USD custom + USD catalog
    expect(book.isCustom('ing_001')).toBe(false);
    expect(book.resolve('ing_003')).toMatchObject({ source: 'custom', currency: 'EUR', price: 0.25 });
    expect(book.catalog('ing_001')?.currency).toBe('USD');
  });

  it('priceOf converts to the requested unit, or gives up when inexact', () => {
    const book = buildPriceBook({ ingredients: [makeIngredient({ id: 'ing_032', unit: 'oz', avgPrice: 0.1 })], currency: 'USD' });
    expect(book.priceOf('ing_032', 'lb')).toBeCloseTo(1.6);
    expect(book.priceOf('ing_032', 'oz')).toBeCloseTo(0.1);
    expect(book.priceOf('ing_032', 'cup')).toBeUndefined();
  });

  it('ignores corrupt custom values', () => {
    const book = buildPriceBook({
      ingredients,
      custom: { ing_001: { price: Number.NaN, currency: 'USD' } },
      currency: 'USD',
    });
    expect(book.resolve('ing_001')).toMatchObject({ source: 'catalog', price: 0.5 });
  });

  it('catalogPriceOf keeps the quote even when it falls back to avgPrice', () => {
    expect(catalogPriceOf(oil, prices[1])).toMatchObject({ price: 0.3, quote: prices[1] });
  });
});

describe('estimatePlanCost / estimateShoppingCost', () => {
  const price = fixed({ ing_001: 0.5 });

  it('reports coverage and the per-planned-day average (no division by zero)', () => {
    const plan = makePlan();
    plan.days[0]!.meals = { breakfast: { recipeId: 'rec_001', servings: 2 } };
    plan.days[1]!.meals = { lunch: { recipeId: 'rec_001', servings: 2 } };
    const estimate = estimatePlanCost(plan, [recipe], price);
    expect(estimate).toEqual({ total: 4, priced: 2, count: 4, coverage: 50, perDay: 2, plannedDays: 2 });
    expect(estimatePlanCost(makePlan(), [recipe], price)).toEqual({
      total: 0,
      priced: 0,
      count: 0,
      coverage: 0,
      perDay: 0,
      plannedDays: 0,
    });
  });

  it('prices shopping items in their own unit and splits what is left to buy', () => {
    const book = buildPriceBook({
      ingredients: [makeIngredient({ id: 'ing_001', unit: 'oz', avgPrice: 0.25 })],
      currency: 'USD',
    });
    const items = [
      makeShoppingItem({ ingredientId: 'ing_001', quantity: 1.5, unit: 'lb' }), // 24 oz → $6
      makeShoppingItem({ ingredientId: 'ing_001', quantity: 2, unit: 'cup', checked: true }), // inexact
      makeShoppingItem({ ingredientId: 'custom-milk', quantity: 1, unit: 'piece', checked: true }),
      makeShoppingItem({ ingredientId: 'ing_001', quantity: 8, unit: 'oz', checked: true }), // $2
    ];
    expect(estimateShoppingCost(items, book.priceOf)).toEqual({ total: 8, remaining: 6, priced: 2, count: 4, coverage: 50 });
    expect(estimateShoppingCost([], book.priceOf)).toEqual({ total: 0, remaining: 0, priced: 0, count: 0, coverage: 0 });
  });
});

describe('the shipped price sheet (public/data/ingredient-prices.json)', () => {
  const root = resolve(__dirname, '../../..');
  const load = (file: string) => JSON.parse(readFileSync(resolve(root, 'public/data', file), 'utf8'));
  const prices = pricesFromFile(IngredientPricesFileSchema.parse(load('ingredient-prices.json')));
  const ingredients = IngredientsFileSchema.parse(load('ingredients.json')).ingredients;
  const recipes = RecipesFileSchema.parse(load('recipes.json')).recipes;
  const book = buildPriceBook({ ingredients, prices, currency: 'USD' });

  it('prices every recipe of the catalog without NaN', () => {
    for (const r of recipes) {
      const cost = calculateCostPerServing(r, book.priceOf);
      expect(Number.isFinite(cost), r.id).toBe(true);
      expect(cost, r.id).toBeGreaterThan(0);
    }
  });

  it('eggs, milk and pasta come from the store sheet', () => {
    expect(book.resolve('ing_001')?.quote?.legacyKey).toBe('eggs');
    expect(book.priceOf('ing_001')).toBeCloseTo(4.29 / 12);
    expect(book.priceOf('ing_047')).toBeCloseTo(3.99 / 16);
    expect(book.priceOf('ing_012')).toBeCloseTo(1.99 / 16);
  });
});
