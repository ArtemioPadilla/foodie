/**
 * Ingredient prices and plan / shopping-list cost (roadmap Issue 041, port of
 * PR #28's `utils/costCalculations.ts` and `IngredientContext` pricing).
 * Pure: every function takes its data explicitly (ADR 0014).
 *
 * **Price resolution** (`buildPriceBook`) — custom > catalog:
 * 1. the user's own price (`foodie:custom-prices`), when it was entered in the
 *    current currency (`$preferences.currency`);
 * 2. the store quote from `public/data/ingredient-prices.json` (PR #28's
 *    sheet), converted from its pack unit (`lb`, `25oz`, `dozen`…) to the
 *    ingredient's recipe unit — only when that conversion is exact
 *    (mass ↔ mass, volume ↔ volume, count ↔ count; never through a density);
 * 3. the ingredient's `avgPrice` from `ingredients.json`.
 *
 * There are no exchange rates: a price in another currency is simply not
 * used, so a cost is never a silent mix of currencies.
 *
 * **Guards** (ported from PR #28): non-positive / non-finite servings,
 * quantities and prices are skipped; a recipe with `servings <= 0` costs 0;
 * every division is guarded, so no function returns `NaN` or `Infinity`.
 */
import {
  PACK_UNIT_PATTERN,
  type CustomPrices,
  type DayMeals,
  type Ingredient,
  type IngredientPrice,
  type MealPlan,
  type MealSlot,
  type Recipe,
  type ShoppingListItem,
} from '@/schemas';

// ── Exact unit conversion ─────────────────────────────────────────────────────

/** Mass units in ounces. */
const MASS: Record<string, number> = {
  oz: 1,
  ounce: 1,
  lb: 16,
  pound: 16,
  g: 1 / 28.349523125,
  gram: 1 / 28.349523125,
  kg: 1000 / 28.349523125,
  kilogram: 1000 / 28.349523125,
};

/** Volume units in US cups. */
const VOLUME: Record<string, number> = {
  tsp: 1 / 48,
  teaspoon: 1 / 48,
  tbsp: 1 / 16,
  tablespoon: 1 / 16,
  cup: 1,
  'fl oz': 1 / 8,
  pint: 2,
  quart: 4,
  gallon: 16,
  ml: 1 / 240,
  l: 1000 / 240,
  liter: 1000 / 240,
};

/** Count units in pieces. */
const COUNT: Record<string, number> = { piece: 1, whole: 1, item: 1, dozen: 12 };

const DIMENSIONS = [MASS, VOLUME, COUNT] as const;

const normalizeUnit = (unit: string) => unit.trim().toLowerCase();

/**
 * `quantity` of `from` expressed in `to`, or `undefined` when the two units do
 * not share a dimension (lb → cup needs a density; head → cup is a guess).
 */
export function convertQuantityExact(quantity: number, from: string, to: string): number | undefined {
  if (!Number.isFinite(quantity)) return undefined;
  const a = normalizeUnit(from);
  const b = normalizeUnit(to);
  if (a === b) return quantity;
  for (const table of DIMENSIONS) {
    const fa = table[a];
    const fb = table[b];
    if (fa !== undefined && fb !== undefined) return (quantity * fa) / fb;
  }
  return undefined;
}

/** `"25oz"` → `{ size: 25, unit: 'oz' }`, `"lb"` → `{ size: 1, unit: 'lb' }`. */
export function parsePackUnit(unit: string): { size: number; unit: string } | undefined {
  const match = PACK_UNIT_PATTERN.exec(normalizeUnit(unit));
  if (!match) return undefined;
  const size = match[1] ? Number(match[1]) : 1;
  return size > 0 && Number.isFinite(size) ? { size, unit: match[2]! } : undefined;
}

/**
 * Price of one `targetUnit` from a pack quote (`$9.99 / 25oz`), or
 * `undefined` when the pack cannot be expressed exactly in `targetUnit`.
 */
export function unitPriceFromQuote(
  quote: Pick<IngredientPrice, 'price' | 'unit'>,
  targetUnit: string,
): number | undefined {
  if (!(quote.price > 0) || !Number.isFinite(quote.price)) return undefined;
  const pack = parsePackUnit(quote.unit);
  if (!pack) return undefined;
  const amount = convertQuantityExact(pack.size, pack.unit, targetUnit);
  if (amount === undefined || !(amount > 0)) return undefined;
  const price = quote.price / amount;
  return Number.isFinite(price) ? price : undefined;
}

// ── Price book ────────────────────────────────────────────────────────────────

export type PriceSource = 'custom' | 'catalog';

export interface ResolvedPrice {
  /** Price of one `unit`. */
  price: number;
  /** The ingredient's recipe unit. */
  unit: string;
  currency: string;
  source: PriceSource;
  /** The store quote the catalog price was derived from, if any. */
  quote?: IngredientPrice;
}

/**
 * Price of one `unit` of an ingredient (its recipe unit when omitted), or
 * `undefined` when there is no usable price. PR #28's `getIngredientPrice`,
 * plus the unit so a `1 lb` line of an ingredient priced per `oz` is right.
 */
export type PriceLookup = (ingredientId: string, unit?: string) => number | undefined;

export interface PriceBook {
  currency: string;
  /** The price used for costs (custom > catalog), in `currency` only. */
  resolve: (ingredientId: string) => ResolvedPrice | undefined;
  /** The catalog price (store quote or `avgPrice`), whatever its currency. */
  catalog: (ingredientId: string) => ResolvedPrice | undefined;
  priceOf: PriceLookup;
  isCustom: (ingredientId: string) => boolean;
}

export interface PriceBookInput {
  ingredients: ReadonlyArray<Ingredient>;
  prices?: ReadonlyArray<IngredientPrice>;
  custom?: CustomPrices;
  currency: string;
}

/** Catalog price of one ingredient: the store quote when it converts exactly, else `avgPrice`. */
export function catalogPriceOf(ingredient: Ingredient, quote?: IngredientPrice): ResolvedPrice | undefined {
  if (quote) {
    const price = unitPriceFromQuote(quote, ingredient.unit);
    if (price !== undefined) {
      return { price, unit: ingredient.unit, currency: quote.currency, source: 'catalog', quote };
    }
  }
  if (ingredient.avgPrice > 0 && Number.isFinite(ingredient.avgPrice)) {
    return { price: ingredient.avgPrice, unit: ingredient.unit, currency: ingredient.currency, source: 'catalog', quote };
  }
  return undefined;
}

export function buildPriceBook({ ingredients, prices = [], custom = {}, currency }: PriceBookInput): PriceBook {
  const ingredientById = new Map(ingredients.map((i) => [i.id, i] as const));
  const quoteById = new Map(prices.map((p) => [p.id, p] as const));

  const catalog = (id: string): ResolvedPrice | undefined => {
    const ingredient = ingredientById.get(id);
    return ingredient ? catalogPriceOf(ingredient, quoteById.get(id)) : undefined;
  };

  const resolve = (id: string): ResolvedPrice | undefined => {
    const ingredient = ingredientById.get(id);
    if (!ingredient) return undefined;
    const own = custom[id];
    if (own && own.currency === currency && own.price > 0 && Number.isFinite(own.price)) {
      return { price: own.price, unit: ingredient.unit, currency, source: 'custom', quote: quoteById.get(id) };
    }
    const fromCatalog = catalog(id);
    return fromCatalog && fromCatalog.currency === currency ? fromCatalog : undefined;
  };

  const priceOf: PriceLookup = (id, unit) => {
    const resolved = resolve(id);
    if (!resolved) return undefined;
    if (unit === undefined) return resolved.price;
    // Price per `unit` = price per base unit × base units in one `unit`.
    const perUnit = convertQuantityExact(1, unit, resolved.unit);
    if (perUnit === undefined) return undefined;
    const price = resolved.price * perUnit;
    return Number.isFinite(price) && price > 0 ? price : undefined;
  };

  const isCustom = (id: string) => {
    const own = custom[id];
    return own !== undefined && own.currency === currency;
  };

  return { currency, resolve, catalog, priceOf, isCustom };
}

// ── Costs (PR #28 `costCalculations.ts`) ───────────────────────────────────────

const round2 = (value: number) => Math.round(value * 100) / 100;
const isPositive = (value: number) => Number.isFinite(value) && value > 0;

/**
 * Cost of `recipe` for `servings`, or 0 on invalid input. Lines without a
 * usable price (unknown ingredient, other currency, inexact unit) are skipped.
 */
export function calculateRecipeCost(recipe: Recipe, servings: number, getIngredientPrice: PriceLookup): number {
  if (!recipe || !isPositive(servings) || !isPositive(recipe.servings)) return 0;
  const scaleFactor = servings / recipe.servings;
  const total = recipe.ingredients.reduce((sum, line) => {
    if (!(line.quantity >= 0) || !Number.isFinite(line.quantity)) return sum;
    const price = getIngredientPrice(line.ingredientId, line.unit);
    if (price === undefined || !isPositive(price)) return sum;
    const cost = price * line.quantity * scaleFactor;
    return Number.isFinite(cost) ? sum + cost : sum;
  }, 0);
  return Number.isFinite(total) ? round2(total) : 0;
}

/** Every slot of a day, snacks flattened. */
export function slotsOfDay(meals: DayMeals): MealSlot[] {
  return [meals.breakfast, meals.lunch, meals.dinner, ...(meals.snacks ?? [])].filter(
    (slot): slot is MealSlot => slot !== undefined,
  );
}

/** Total cost of a meal plan (each slot at its own servings), rounded to cents. */
export function calculatePlanCost(
  plan: MealPlan,
  getRecipeById: (id: string) => Recipe | undefined,
  getIngredientPrice: PriceLookup,
): number {
  if (!plan || !plan.days) return 0;
  let total = 0;
  for (const day of plan.days) {
    for (const slot of slotsOfDay(day.meals)) {
      const recipe = getRecipeById(slot.recipeId);
      if (!recipe) continue;
      const cost = calculateRecipeCost(recipe, slot.servings, getIngredientPrice);
      if (Number.isFinite(cost)) total += cost;
    }
  }
  return Number.isFinite(total) ? round2(total) : 0;
}

/** Cost of one serving of `recipe`, or 0 when `servings` is invalid. */
export function calculateCostPerServing(recipe: Recipe, getIngredientPrice: PriceLookup): number {
  if (!recipe || !isPositive(recipe.servings)) return 0;
  const total = calculateRecipeCost(recipe, recipe.servings, getIngredientPrice);
  const perServing = total / recipe.servings;
  return Number.isFinite(perServing) ? round2(perServing) : 0;
}

/** True when every id has a price (an empty list is complete). */
export function hasCompleteData(ingredientIds: ReadonlyArray<string>, getIngredientPrice: PriceLookup): boolean {
  return ingredientIds.every((id) => getIngredientPrice(id) !== undefined);
}

/** Percentage (0–100) of ids with a price; 0 for an empty list. */
export function getPriceDataCoverage(ingredientIds: ReadonlyArray<string>, getIngredientPrice: PriceLookup): number {
  if (ingredientIds.length === 0) return 0;
  const priced = ingredientIds.filter((id) => getIngredientPrice(id) !== undefined).length;
  return (priced / ingredientIds.length) * 100;
}

// ── Estimates for the UI ─────────────────────────────────────────────────────

export interface CostEstimate {
  /** Rounded to cents. */
  total: number;
  /** Lines / items that had a usable price. */
  priced: number;
  /** Lines / items considered. */
  count: number;
  /** `priced / count` as a 0–100 integer (0 when `count` is 0). */
  coverage: number;
}

function coverageOf(priced: number, count: number): number {
  return count > 0 ? Math.round((priced / count) * 100) : 0;
}

export interface PlanCostEstimate extends CostEstimate {
  /** Average per planned day (0 when nothing is planned). */
  perDay: number;
  plannedDays: number;
}

/** Plan cost + how many recipe lines were priced + the per-planned-day average. */
export function estimatePlanCost(
  plan: MealPlan,
  recipes: ReadonlyArray<Recipe>,
  getIngredientPrice: PriceLookup,
): PlanCostEstimate {
  const recipeById = new Map(recipes.map((r) => [r.id, r] as const));
  const getRecipeById = (id: string) => recipeById.get(id);
  let priced = 0;
  let count = 0;
  let plannedDays = 0;
  for (const day of plan.days) {
    const slots = slotsOfDay(day.meals);
    if (slots.length > 0) plannedDays += 1;
    for (const slot of slots) {
      const recipe = getRecipeById(slot.recipeId);
      if (!recipe) continue;
      for (const line of recipe.ingredients) {
        count += 1;
        if (getIngredientPrice(line.ingredientId, line.unit) !== undefined) priced += 1;
      }
    }
  }
  const total = calculatePlanCost(plan, getRecipeById, getIngredientPrice);
  const perDay = plannedDays > 0 ? round2(total / plannedDays) : 0;
  return { total, priced, count, coverage: coverageOf(priced, count), perDay, plannedDays };
}

export interface ShoppingCostEstimate extends CostEstimate {
  /** Cost of the unchecked items (what is still to buy). */
  remaining: number;
}

/** Cost of a shopping list: each item's quantity × its price in the item's unit. */
export function estimateShoppingCost(
  items: ReadonlyArray<ShoppingListItem>,
  getIngredientPrice: PriceLookup,
): ShoppingCostEstimate {
  let total = 0;
  let remaining = 0;
  let priced = 0;
  for (const item of items) {
    if (!(item.quantity >= 0) || !Number.isFinite(item.quantity)) continue;
    const price = getIngredientPrice(item.ingredientId, item.unit);
    if (price === undefined) continue;
    const cost = price * item.quantity;
    if (!Number.isFinite(cost)) continue;
    priced += 1;
    total += cost;
    if (!item.checked) remaining += cost;
  }
  return {
    total: round2(total),
    remaining: round2(remaining),
    priced,
    count: items.length,
    coverage: coverageOf(priced, items.length),
  };
}
