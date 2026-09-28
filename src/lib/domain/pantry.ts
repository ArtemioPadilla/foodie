/**
 * Pantry domain (roadmap Issue 027; port of the logic inside legacy
 * `pantry/PantryInventory`, `PantryItem`, `ExpirationTracker` and
 * `RecipeSuggestions`). Pure — the `/pantry/` island, its tests and any other
 * reader (`IngredientActions`, a future dashboard) share these selectors.
 *
 * Dates: `expirationDate` is a `YYYY-MM-DD` key (the date picker writes one;
 * legacy wrote the same shape from `<input type="date">`). "Days until
 * expiration" counts **local calendar days** (today = 0), not 24-hour blocks —
 * the legacy `Math.ceil(ms / day)` said "expires in 1 day" for something
 * expiring today and shifted around midnight UTC.
 */
import { getTranslated, type Locale } from '@/i18n';
import { parseDateKey, todayKey } from '@/lib/format-date';
import type { Ingredient, PantryItem, Recipe, ShoppingListItem } from '@/schemas';
import { cleanIngredientId, isCustomIngredient } from './ingredient-id';
import { humanizeId } from './recipe-detail';
import { OTHER_CATEGORY } from './shopping';

// ── Expiration ───────────────────────────────────────────────────────────────

/** Window of the "Expiring soon" block (legacy `daysThreshold = 7`). */
export const EXPIRING_SOON_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}/;

export type ExpirationStatus = 'expired' | 'soon' | 'fresh' | 'none';

/** Local-midnight `Date` of an expiration value (`YYYY-MM-DD`, or an ISO datetime's date part). */
function expirationDay(value: string): Date | null {
  const match = DATE_KEY_RE.exec(value);
  if (match) return parseDateKey(match[0]);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Calendar days from today to the expiration date: `0` expires today, `1`
 * tomorrow, negative already expired; `null` without a (valid) date.
 */
export function daysUntilExpiration(expirationDate: string | undefined, now: Date = new Date()): number | null {
  if (!expirationDate) return null;
  const day = expirationDay(expirationDate);
  if (!day) return null;
  const today = parseDateKey(todayKey(now));
  // Round: a DST change makes one calendar day 23 or 25 hours long.
  return Math.round((day.getTime() - today.getTime()) / DAY_MS);
}

/** `expired` (before today) · `soon` (today … today + `soonDays`) · `fresh` · `none` (no date). */
export function expirationStatus(
  item: Pick<PantryItem, 'expirationDate'>,
  now: Date = new Date(),
  soonDays: number = EXPIRING_SOON_DAYS,
): ExpirationStatus {
  const days = daysUntilExpiration(item.expirationDate, now);
  if (days === null) return 'none';
  if (days < 0) return 'expired';
  return days <= soonDays ? 'soon' : 'fresh';
}

/** Items expiring today … in `days` days, soonest first (expired items excluded, as legacy). */
export function getExpiringSoon<T extends PantryItem>(items: ReadonlyArray<T>, now: Date = new Date(), days = EXPIRING_SOON_DAYS): T[] {
  return items
    .filter((item) => expirationStatus(item, now, days) === 'soon')
    .sort((a, b) => daysUntilExpiration(a.expirationDate, now)! - daysUntilExpiration(b.expirationDate, now)!);
}

/** Items past their date, most recently expired first (legacy `ExpirationTracker`). */
export function getExpiredItems<T extends PantryItem>(items: ReadonlyArray<T>, now: Date = new Date()): T[] {
  return items
    .filter((item) => expirationStatus(item, now) === 'expired')
    .sort((a, b) => daysUntilExpiration(b.expirationDate, now)! - daysUntilExpiration(a.expirationDate, now)!);
}

// ── Stock ────────────────────────────────────────────────────────────────────

/**
 * Low-stock threshold per unit. Legacy flagged `quantity <= 1` whatever the
 * unit, which never fires for gram/millilitre stock (1 g of flour is not "a
 * bit left"); those units get a proportionate threshold, the rest keep 1.
 */
export const LOW_STOCK_THRESHOLDS: Readonly<Record<string, number>> = { g: 50, ml: 50, oz: 2 };
export const DEFAULT_LOW_STOCK_THRESHOLD = 1;

export function lowStockThreshold(unit: string): number {
  return LOW_STOCK_THRESHOLDS[unit] ?? DEFAULT_LOW_STOCK_THRESHOLD;
}

export function isLowStock(item: Pick<PantryItem, 'quantity' | 'unit'>): boolean {
  return item.quantity <= lowStockThreshold(item.unit);
}

/** Low-stock items, emptiest first (then by name via `nameOf`, when given). */
export function getLowStock<T extends PantryItem>(items: ReadonlyArray<T>, nameOf?: (item: T) => string): T[] {
  return items
    .filter(isLowStock)
    .sort((a, b) => a.quantity - b.quantity || (nameOf ? nameOf(a).localeCompare(nameOf(b)) : 0));
}

// ── Names and categories ────────────────────────────────────────────────────

/** Case-, accent- and whitespace-insensitive form of a name for matching. */
export function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s_-]+/g, ' ')
    .trim();
}

/**
 * The catalog ingredient a typed name refers to — its name in any of the three
 * languages, or its id — compared with `normalizeName`. `undefined` when the
 * name is the user's own (a custom item).
 */
export function resolveCatalogIngredient(name: string, ingredients: ReadonlyArray<Ingredient>): Ingredient | undefined {
  const wanted = normalizeName(name);
  if (!wanted) return undefined;
  return ingredients.find(
    (ingredient) =>
      normalizeName(ingredient.id) === wanted ||
      Object.values(ingredient.name).some((value) => typeof value === 'string' && normalizeName(value) === wanted),
  );
}

export interface PantryNaming {
  /** Display name: custom `name` → catalog name (page locale) → humanised id (legacy free text). */
  nameOf: (item: Pick<PantryItem, 'ingredientId' | 'name'>) => string;
  /** Category id: catalog category → the item's own (custom) → `other`. */
  categoryOf: (item: Pick<PantryItem, 'ingredientId' | 'category'>) => string;
}

export function makePantryNaming(ingredients: ReadonlyArray<Ingredient>, lang: Locale): PantryNaming {
  const byId = new Map(ingredients.map((i) => [i.id, i] as const));
  return {
    nameOf: (item) => {
      if (item.name) return item.name;
      const ingredient = byId.get(item.ingredientId);
      if (ingredient) return getTranslated(ingredient.name, lang);
      return humanizeId(cleanIngredientId(item.ingredientId));
    },
    categoryOf: (item) => byId.get(item.ingredientId)?.category ?? (item.category || OTHER_CATEGORY),
  };
}

// ── Inventory view: filter + sort ───────────────────────────────────────────

export const PANTRY_SORTS = ['expiration', 'name', 'quantity', 'added'] as const;
export type PantrySort = (typeof PANTRY_SORTS)[number];

export const PANTRY_STATUS_FILTERS = ['all', 'expiring', 'expired', 'low'] as const;
export type PantryStatusFilter = (typeof PANTRY_STATUS_FILTERS)[number];

export interface PantryFilters {
  search: string;
  /** Category id, or `all`. */
  category: string;
  status: PantryStatusFilter;
}

export const DEFAULT_PANTRY_FILTERS: PantryFilters = { search: '', category: 'all', status: 'all' };

/**
 * Search (name, id or location — legacy searched id + location), category and
 * status (`expiring` = soon, `expired`, `low` = low stock).
 */
export function filterPantryItems<T extends PantryItem>(
  items: ReadonlyArray<T>,
  filters: PantryFilters,
  naming: PantryNaming,
  now: Date = new Date(),
): T[] {
  const query = normalizeName(filters.search);
  return items.filter((item) => {
    if (query) {
      const haystack = [naming.nameOf(item), cleanIngredientId(item.ingredientId), item.location ?? ''].map(normalizeName);
      if (!haystack.some((text) => text.includes(query))) return false;
    }
    if (filters.category !== 'all' && naming.categoryOf(item) !== filters.category) return false;
    switch (filters.status) {
      case 'expiring':
        return expirationStatus(item, now) === 'soon';
      case 'expired':
        return expirationStatus(item, now) === 'expired';
      case 'low':
        return isLowStock(item);
      default:
        return true;
    }
  });
}

/**
 * `expiration` (default — soonest first, undated last), `name`, `quantity`
 * (smallest first) or `added` (newest first). Ties fall back to the name.
 */
export function sortPantryItems<T extends PantryItem>(
  items: ReadonlyArray<T>,
  sort: PantrySort,
  nameOf: PantryNaming['nameOf'],
  lang: Locale = 'en',
  now: Date = new Date(),
): T[] {
  const byName = (a: T, b: T) => nameOf(a).localeCompare(nameOf(b), lang);
  const sorted = [...items];
  switch (sort) {
    case 'expiration':
      return sorted.sort((a, b) => {
        const da = daysUntilExpiration(a.expirationDate, now);
        const db = daysUntilExpiration(b.expirationDate, now);
        if (da === null && db === null) return byName(a, b);
        if (da === null) return 1;
        if (db === null) return -1;
        return da - db || byName(a, b);
      });
    case 'quantity':
      return sorted.sort((a, b) => a.quantity - b.quantity || byName(a, b));
    case 'added':
      return sorted.sort((a, b) => b.addedAt.localeCompare(a.addedAt) || byName(a, b));
    default:
      return sorted.sort(byName);
  }
}

/** Category ids present in the inventory, in taxonomy order (`order`), unknown ones and `other` last. */
export function pantryCategories(
  items: ReadonlyArray<PantryItem>,
  categoryOf: PantryNaming['categoryOf'],
  order: ReadonlyArray<string> = [],
): string[] {
  const present = new Set(items.map(categoryOf));
  const rank = (id: string) => (id === OTHER_CATEGORY ? Number.MAX_SAFE_INTEGER : order.indexOf(id) === -1 ? order.length : order.indexOf(id));
  return [...present].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

// ── "What can I cook" ───────────────────────────────────────────────────────

/**
 * Catalog ingredient ids the pantry can cook with: items with stock left
 * (`quantity > 0`) that have not expired. Catalog items count by id; custom
 * and legacy free-text items count when their name is a catalog ingredient's
 * name in any language (a legacy "Chicken breast" item is `ing_001`).
 */
export function availableIngredientIds(
  items: ReadonlyArray<PantryItem>,
  ingredients: ReadonlyArray<Ingredient>,
  now: Date = new Date(),
): Set<string> {
  const catalogIds = new Set(ingredients.map((i) => i.id));
  const ids = new Set<string>();
  for (const item of items) {
    if (item.quantity <= 0 || expirationStatus(item, now) === 'expired') continue;
    if (catalogIds.has(item.ingredientId)) {
      ids.add(item.ingredientId);
      continue;
    }
    const typed = item.name ?? (isCustomIngredient(item.ingredientId) ? cleanIngredientId(item.ingredientId) : item.ingredientId);
    const match = resolveCatalogIngredient(typed, ingredients);
    if (match) ids.add(match.id);
  }
  return ids;
}

export interface PantryRecipeMatch {
  recipe: Recipe;
  /** 0–100: share of the recipe's required (non-optional) ingredients in the pantry. */
  matchPercentage: number;
  matchedIngredients: number;
  totalIngredients: number;
  /** Required ingredient ids the pantry lacks, in recipe order. */
  missingIngredients: string[];
  /** How many of the matched ingredients are expiring soon (use them first). */
  expiringIngredients: number;
}

export interface WhatCanICookOptions {
  /** Minimum match percentage (0–100); recipes with no matched ingredient are always left out. */
  minPercentage?: number;
  /** Maximum number of results (`Infinity` for all). */
  limit?: number;
  /** Ids expiring soon — ties in percentage go to recipes that use more of them. */
  expiringIds?: ReadonlySet<string>;
}

/**
 * "What can I cook": recipes ranked by the share of their required
 * ingredients available in the pantry (legacy `RecipeSuggestions`), best
 * first; ties go to the recipe that uses more expiring ingredients, then the
 * better-rated one, then the id (stable). Recipes without a required
 * ingredient in the pantry are never suggested.
 */
export function whatCanICook(
  recipes: ReadonlyArray<Recipe>,
  available: ReadonlySet<string>,
  { minPercentage = 0, limit = Infinity, expiringIds = new Set() }: WhatCanICookOptions = {},
): PantryRecipeMatch[] {
  if (available.size === 0) return [];
  const matches: PantryRecipeMatch[] = [];
  for (const recipe of recipes) {
    const required = recipe.ingredients.filter((line) => !line.optional);
    if (required.length === 0) continue;
    const matched = required.filter((line) => available.has(line.ingredientId));
    if (matched.length === 0) continue;
    const matchPercentage = (matched.length / required.length) * 100;
    if (matchPercentage < minPercentage) continue;
    matches.push({
      recipe,
      matchPercentage,
      matchedIngredients: matched.length,
      totalIngredients: required.length,
      missingIngredients: required.filter((line) => !available.has(line.ingredientId)).map((line) => line.ingredientId),
      expiringIngredients: matched.filter((line) => expiringIds.has(line.ingredientId)).length,
    });
  }
  return matches
    .sort(
      (a, b) =>
        b.matchPercentage - a.matchPercentage ||
        b.expiringIngredients - a.expiringIngredients ||
        b.recipe.rating - a.recipe.rating ||
        a.recipe.id.localeCompare(b.recipe.id),
    )
    .slice(0, limit);
}

// ── "Add to shopping list" ──────────────────────────────────────────────────

/** A shopping line (the shape `addShoppingItem` takes) — `checked` is left to the store. */
export type PantryShoppingLine = Omit<ShoppingListItem, 'checked'>;

/**
 * The shopping line that restocks a pantry item: the catalog ingredient when
 * the item is (or names) one, so it merges with plan-generated lines;
 * otherwise the item's own id + display name + category (a custom line). The
 * quantity is the unit's low-stock threshold (1 piece, 50 g…) — a starting
 * point the user adjusts in the list.
 */
export function pantryShoppingLine(
  item: PantryItem,
  ingredients: ReadonlyArray<Ingredient>,
  naming: PantryNaming,
): PantryShoppingLine {
  const catalog =
    ingredients.find((i) => i.id === item.ingredientId) ??
    resolveCatalogIngredient(item.name ?? cleanIngredientId(item.ingredientId), ingredients);
  const base = { quantity: lowStockThreshold(item.unit), unit: item.unit, usedIn: [] as string[] };
  if (catalog) return { ...base, ingredientId: catalog.id, category: catalog.category };
  return { ...base, ingredientId: item.ingredientId, name: naming.nameOf(item), category: naming.categoryOf(item) };
}

/** Shopping lines for the ingredients a suggested recipe is missing (recipe quantities, `usedIn` the recipe). */
export function missingShoppingLines(match: PantryRecipeMatch, ingredients: ReadonlyArray<Ingredient>): PantryShoppingLine[] {
  const categoryOf = new Map(ingredients.map((i) => [i.id, i.category] as const));
  const missing = new Set(match.missingIngredients);
  return match.recipe.ingredients
    .filter((line) => !line.optional && missing.has(line.ingredientId))
    .map((line) => ({
      ingredientId: line.ingredientId,
      quantity: line.quantity,
      unit: line.unit,
      usedIn: [match.recipe.id],
      category: categoryOf.get(line.ingredientId) ?? OTHER_CATEGORY,
    }));
}
