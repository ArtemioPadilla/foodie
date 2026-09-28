/**
 * Shopping-list arithmetic without UI or storage (roadmap Issue 013 + Issue
 * 014: the full port of legacy `services/shoppingService.ts` — unit
 * normalisation, category resolution/grouping, text/CSV/WhatsApp exports).
 */
import type { Category, Ingredient, Locale, MealPlan, MealSlot, Recipe, ShoppingListItem } from '@/schemas';
import { getTranslated } from '@/i18n';
import { isCustomIngredient } from './ingredient-id';
import { formatQuantity, toPreferredUnit, unitConversions, type ResolvedUnitSystem, type UnitConversionResult } from './units';

export type ShoppingExportFormat = 'text' | 'json' | 'csv' | 'whatsapp';

/** Resolves an ingredient id to its category id (see `makeCategoryResolver`). */
export type CategoryResolver = (ingredientId: string) => string | undefined;

// ── Categories ────────────────────────────────────────────────────────────────

/** Category id for ingredients the catalog does not know (custom/free-text items). */
export const OTHER_CATEGORY = 'other';

/**
 * Keyword → `ingredientCategories[].id` fallback for ids that are not in the
 * catalog (a user-typed "chicken-breast"). Catalog ingredients never hit this:
 * their `category` field is the source of truth.
 */
const FALLBACK_CATEGORY_KEYWORDS: ReadonlyArray<readonly [string, string]> = [
  // Proteins
  ['chicken', 'protein'], ['beef', 'protein'], ['pork', 'protein'], ['fish', 'protein'],
  ['salmon', 'protein'], ['shrimp', 'protein'], ['tofu', 'protein'], ['egg', 'protein'],
  // Dairy
  ['milk', 'dairy'], ['cheese', 'dairy'], ['yogurt', 'dairy'], ['butter', 'dairy'], ['cream', 'dairy'],
  // Produce
  ['tomato', 'vegetables'], ['onion', 'vegetables'], ['garlic', 'vegetables'], ['lettuce', 'vegetables'],
  ['carrot', 'vegetables'], ['potato', 'vegetables'], ['pepper', 'vegetables'], ['spinach', 'vegetables'],
  ['broccoli', 'vegetables'], ['apple', 'fruits'], ['banana', 'fruits'], ['lemon', 'fruits'], ['lime', 'fruits'],
  // Grains & bakery
  ['bread', 'grains'], ['rice', 'grains'], ['pasta', 'grains'], ['flour', 'grains'], ['tortilla', 'grains'],
  // Pantry & spices
  ['oil', 'pantry'], ['olive', 'pantry'], ['vinegar', 'pantry'], ['soy', 'pantry'], ['sugar', 'pantry'],
  ['salt', 'spices'],
];

/**
 * Category id of an ingredient: `ingredient.category` when the id is in the
 * catalog, else a keyword guess, else `other`. Replaces the legacy hard-coded
 * id → "Meat & Poultry" map (criterion 5 of Issue 014); display names come
 * from `getCategoryLabel` + the `categories` collection.
 */
export function getIngredientCategory(
  ingredientId: string,
  ingredients: ReadonlyArray<Ingredient> = [],
): string {
  const known = ingredients.find((i) => i.id === ingredientId);
  if (known) return known.category;
  const lower = ingredientId.toLowerCase();
  const hit = FALLBACK_CATEGORY_KEYWORDS.find(([keyword]) => lower.includes(keyword));
  return hit ? hit[1] : OTHER_CATEGORY;
}

/** A `CategoryResolver` for `buildShoppingListFromPlan` / `stores/shopping.generateFromPlan`. */
export function makeCategoryResolver(ingredients: ReadonlyArray<Ingredient>): CategoryResolver {
  const byId = new Map(ingredients.map((i) => [i.id, i.category] as const));
  return (ingredientId) => byId.get(ingredientId) ?? getIngredientCategory(ingredientId);
}

/**
 * Localised name of a category id from `categories.json → ingredientCategories`
 * (falls back to a capitalised id so unknown/`other` still render).
 */
export function getCategoryLabel(
  categoryId: string | undefined,
  categories: ReadonlyArray<Category> = [],
  lang: Locale = 'en',
): string {
  const id = categoryId || OTHER_CATEGORY;
  const category = categories.find((c) => c.id === id);
  if (category) return getTranslated(category.name, lang);
  return id.charAt(0).toUpperCase() + id.slice(1);
}

// ── Units ─────────────────────────────────────────────────────────────────────

/** Shopping-side base units (coarser than `units.ts`: you buy cups/lb/kg, not tsp). */
const BASE_UNITS: Record<string, { base: string; factor: number }> = {
  // Volume
  tsp: { base: 'tbsp', factor: 1 / 3 },
  teaspoon: { base: 'tbsp', factor: 1 / 3 },
  tbsp: { base: 'cup', factor: 1 / 16 },
  tablespoon: { base: 'cup', factor: 1 / 16 },
  cup: { base: 'cup', factor: 1 },
  ml: { base: 'cup', factor: 1 / 240 },
  l: { base: 'cup', factor: 4.22 },
  liter: { base: 'cup', factor: 4.22 },
  // Weight
  oz: { base: 'lb', factor: 1 / 16 },
  ounce: { base: 'lb', factor: 1 / 16 },
  lb: { base: 'lb', factor: 1 },
  pound: { base: 'lb', factor: 1 },
  g: { base: 'kg', factor: 1 / 1000 },
  gram: { base: 'kg', factor: 1 / 1000 },
  kg: { base: 'kg', factor: 1 },
  kilogram: { base: 'kg', factor: 1 },
  // Count
  piece: { base: 'piece', factor: 1 },
  whole: { base: 'piece', factor: 1 },
  item: { base: 'piece', factor: 1 },
  // Other
  pinch: { base: 'pinch', factor: 1 },
  dash: { base: 'dash', factor: 1 },
  'to taste': { base: 'to taste', factor: 1 },
};

/** Express a quantity in its shopping base unit (unknown units pass through lower-cased). */
export function convertToBaseUnit(quantity: number, unit: string): { quantity: number; unit: string } {
  const normalised = unit.toLowerCase().trim();
  const conversion = BASE_UNITS[normalised];
  if (!conversion) return { quantity, unit: normalised };
  return { quantity: quantity * conversion.factor, unit: conversion.base };
}

export type IngredientLine = {
  ingredientId: string;
  quantity: number;
  unit: string;
  usedIn: string[];
};

/**
 * Merge lines of the same ingredient whose units share a base (tsp+tbsp+cup,
 * oz+lb, g+kg); incompatible units stay separate. Quantities are rounded to
 * 4 decimals — base units are coarse (30 ml = 0.125 cup), so 2 decimals lost
 * visible precision once the list converts back to ml (Issue 026; displays
 * round to 2) — and `usedIn` is deduplicated.
 */
export function consolidateIngredients(lines: ReadonlyArray<IngredientLine>): IngredientLine[] {
  const merged = new Map<string, { ingredientId: string; quantity: number; unit: string; usedIn: Set<string> }>();
  for (const line of lines) {
    const { quantity, unit } = convertToBaseUnit(line.quantity, line.unit);
    const key = `${line.ingredientId}\u0000${unit}`;
    const existing = merged.get(key);
    if (existing) {
      existing.quantity += quantity;
      line.usedIn.forEach((r) => existing.usedIn.add(r));
    } else {
      merged.set(key, { ingredientId: line.ingredientId, quantity, unit, usedIn: new Set(line.usedIn) });
    }
  }
  return [...merged.values()].map((v) => ({
    ingredientId: v.ingredientId,
    quantity: Math.round(v.quantity * 10_000) / 10_000,
    unit: v.unit,
    usedIn: [...v.usedIn],
  }));
}

export type BuildShoppingListOptions = {
  /** Merge compatible units via `consolidateIngredients` (legacy `generateShoppingListFromPlan`). */
  normalizeUnits?: boolean;
  /** Leave out ingredients flagged `optional` in the recipe. */
  skipOptional?: boolean;
};

/**
 * Consolidate every recipe of `plan` into one list, scaling each recipe's
 * ingredients by `slot.servings / recipe.servings`. Quantities are summed only
 * when the unit matches; a different unit yields a separate line for the same
 * ingredient. `usedIn` holds the recipe ids (deduplicated). Sorted by category
 * (uncategorised last) like the legacy context.
 */
export function buildShoppingListFromPlan(
  plan: MealPlan,
  recipes: ReadonlyArray<Recipe>,
  categoryOf: CategoryResolver = () => undefined,
  options: BuildShoppingListOptions = {},
): ShoppingListItem[] {
  const recipeById = new Map(recipes.map((r) => [r.id, r] as const));
  const raw: IngredientLine[] = [];

  const addSlot = (slot: MealSlot | undefined) => {
    if (!slot) return;
    const recipe = recipeById.get(slot.recipeId);
    if (!recipe) return;
    const scale = slot.servings / recipe.servings;
    for (const ing of recipe.ingredients) {
      if (options.skipOptional && ing.optional) continue;
      raw.push({ ingredientId: ing.ingredientId, quantity: ing.quantity * scale, unit: ing.unit, usedIn: [recipe.id] });
    }
  };

  for (const day of plan.days) {
    addSlot(day.meals.breakfast);
    addSlot(day.meals.lunch);
    addSlot(day.meals.dinner);
    day.meals.snacks?.forEach(addSlot);
  }

  const merged = options.normalizeUnits ? consolidateIngredients(raw) : mergeExactUnits(raw);

  return merged
    .map<ShoppingListItem>((line) => ({
      ...line,
      checked: false,
      category: categoryOf(line.ingredientId),
      notes: '',
    }))
    .sort((a, b) => {
    if (!a.category && !b.category) return 0;
    if (!a.category) return 1;
    if (!b.category) return -1;
    return a.category.localeCompare(b.category);
  });
}

/** Sum lines with the exact same ingredient+unit (no unit conversion), keeping first-seen order. */
function mergeExactUnits(lines: ReadonlyArray<IngredientLine>): IngredientLine[] {
  const merged = new Map<string, IngredientLine>();
  for (const line of lines) {
    const key = `${line.ingredientId}\u0000${line.unit}`;
    const existing = merged.get(key);
    if (existing) {
      existing.quantity += line.quantity;
      for (const r of line.usedIn) if (!existing.usedIn.includes(r)) existing.usedIn.push(r);
    } else {
      merged.set(key, { ...line, usedIn: [...line.usedIn] });
    }
  }
  return [...merged.values()];
}

// ── Grouping & exports ────────────────────────────────────────────────────────

/** Items keyed by category id (`other` when unset), each group sorted by ingredient id. */
export function groupByCategory(
  items: ReadonlyArray<ShoppingListItem>,
): Record<string, ShoppingListItem[]> {
  const grouped: Record<string, ShoppingListItem[]> = {};
  for (const item of items) {
    const category = item.category || OTHER_CATEGORY;
    (grouped[category] ??= []).push(item);
  }
  for (const group of Object.values(grouped)) {
    group.sort((a, b) => a.ingredientId.localeCompare(b.ingredientId));
  }
  return grouped;
}

/** Fixed words of the exports (English by default; the island passes the page locale's). */
export type ExportStrings = {
  title: string;
  note: string;
  usedIn: string;
  totalItems: string;
  yes: string;
  no: string;
  /** CSV header cells, in column order. */
  headers: {
    category: string;
    ingredient: string;
    quantity: string;
    unit: string;
    checked: string;
    usedIn: string;
    notes: string;
  };
};

export const DEFAULT_EXPORT_STRINGS: ExportStrings = {
  title: 'Shopping List',
  note: 'Note',
  usedIn: 'Used in',
  totalItems: 'Total items',
  yes: 'Yes',
  no: 'No',
  headers: {
    category: 'Category',
    ingredient: 'Ingredient',
    quantity: 'Quantity',
    unit: 'Unit',
    checked: 'Checked',
    usedIn: 'Used In',
    notes: 'Notes',
  },
};

export type ExportLabels = {
  /** Category id → display label (defaults to `getCategoryLabel` with no catalog). */
  categoryLabel?: (categoryId: string) => string;
  /** Ingredient id → display name (defaults to the id). */
  ingredientLabel?: (ingredientId: string) => string;
  /** Recipe id → display name for "Used in" (defaults to the id). */
  recipeLabel?: (recipeId: string) => string;
  /** Unit → display label (defaults to the unit). */
  unitLabel?: (unit: string) => string;
  /** Quantity → display text in text/WhatsApp (CSV always writes the number). */
  quantityLabel?: (quantity: number) => string;
  /** Localised fixed words (title, "Note", CSV headers…). */
  strings?: ExportStrings;
};

function labelsOf(labels: ExportLabels) {
  return {
    category: labels.categoryLabel ?? ((id: string) => getCategoryLabel(id)),
    ingredient: labels.ingredientLabel ?? ((id: string) => id),
    recipe: labels.recipeLabel ?? ((id: string) => id),
    unit: labels.unitLabel ?? ((unit: string) => unit),
    quantity: labels.quantityLabel ?? ((quantity: number) => String(quantity)),
    strings: labels.strings ?? DEFAULT_EXPORT_STRINGS,
  };
}

/** Plain-text export grouped by category, with notes and "Used in" lines. */
export function exportAsText(items: ReadonlyArray<ShoppingListItem>, labels: ExportLabels = {}): string {
  const l = labelsOf(labels);
  let output = `${l.strings.title}\n${'='.repeat(50)}\n\n`;
  for (const [category, group] of Object.entries(groupByCategory(items))) {
    output += `${l.category(category).toUpperCase()}\n${'-'.repeat(30)}\n`;
    for (const item of group) {
      output += `${item.checked ? '✓' : '☐'} ${l.quantity(item.quantity)} ${l.unit(item.unit)} ${l.ingredient(item.ingredientId)}\n`;
      if (item.notes) output += `   ${l.strings.note}: ${item.notes}\n`;
      if (item.usedIn.length > 0) output += `   ${l.strings.usedIn}: ${item.usedIn.map(l.recipe).join(', ')}\n`;
    }
    output += '\n';
  }
  return output;
}

const csvCell = (value: string) => `"${value.replace(/"/g, '""')}"`;

/** CSV export: `Category,Ingredient,Quantity,Unit,Checked,Used In,Notes` (headers localisable). */
export function exportAsCSV(items: ReadonlyArray<ShoppingListItem>, labels: ExportLabels = {}): string {
  const l = labelsOf(labels);
  const h = l.strings.headers;
  const header = `${[h.category, h.ingredient, h.quantity, h.unit, h.checked, h.usedIn, h.notes].join(',')}\n`;
  const rows = items.map((item) =>
    [
      csvCell(l.category(item.category || OTHER_CATEGORY)),
      csvCell(l.ingredient(item.ingredientId)),
      String(item.quantity),
      csvCell(l.unit(item.unit)),
      csvCell(item.checked ? l.strings.yes : l.strings.no),
      csvCell(item.usedIn.map(l.recipe).join('; ')),
      csvCell(item.notes ?? ''),
    ].join(','),
  );
  return header + rows.join('\n');
}

/** WhatsApp-friendly export (bold categories, emoji checkboxes, item count). */
export function exportForWhatsApp(items: ReadonlyArray<ShoppingListItem>, labels: ExportLabels = {}): string {
  const l = labelsOf(labels);
  let output = `🛒 *${l.strings.title}*\n\n`;
  for (const [category, group] of Object.entries(groupByCategory(items))) {
    output += `*${l.category(category)}*\n`;
    for (const item of group) {
      output += `${item.checked ? '✅' : '☑️'} ${l.quantity(item.quantity)} ${l.unit(item.unit)} ${l.ingredient(item.ingredientId)}\n`;
    }
    output += '\n';
  }
  return output + `_${l.strings.totalItems}: ${items.length}_`;
}

/** `https://wa.me/?text=…` — WhatsApp's documented share link (no phone number: the user picks the chat). */
export function whatsappShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/**
 * Serialise the list for copy/export (legacy `exportList`). `text`/`csv` keep
 * the flat one-line-per-item shape the store tests pin; `whatsapp` is the
 * grouped share format. Use `exportAsText`/`exportAsCSV` for grouped output.
 */
export function exportShoppingList(
  list: ReadonlyArray<ShoppingListItem>,
  format: ShoppingExportFormat,
  labels: ExportLabels = {},
): string {
  switch (format) {
    case 'whatsapp':
      return exportForWhatsApp(list, labels);
    case 'json':
      return JSON.stringify(list, null, 2);
    case 'csv': {
      const header = 'Ingredient,Quantity,Unit,Category,Notes\n';
      const rows = list
        .map(
          (item) =>
            `${item.ingredientId},${item.quantity},${item.unit},${item.category ?? ''},"${(item.notes ?? '').replace(/"/g, '""')}"`,
        )
        .join('\n');
      return header + rows;
    }
    case 'text':
    default:
      return list
        .map((item) => `${item.checked ? '✓' : '☐'} ${item.quantity} ${item.unit} ${item.ingredientId}`)
        .join('\n');
  }
}

// ── Lines, display units, list view (roadmap Issue 026) ──────────────────────

/** What identifies one line: the ingredient **and** its unit (see `consolidateIngredients`). */
export type ShoppingItemRef = Pick<ShoppingListItem, 'ingredientId' | 'unit'>;

/** Stable key of a line (`ingredientId` + `unit`), for React keys and store lookups. */
export function shoppingItemKey(item: ShoppingItemRef): string {
  return `${item.ingredientId}\u0000${item.unit}`;
}

/**
 * Does `item` match a store action's target? `unit` omitted → every line of
 * the ingredient (the pre-026 behaviour the store tests pin); given → that line only.
 */
export function matchesShoppingItem(item: ShoppingItemRef, ingredientId: string, unit?: string): boolean {
  return item.ingredientId === ingredientId && (unit === undefined || item.unit === unit);
}

/** A line the user added by hand (custom item, or from an ingredient page) — `usedIn` is empty. */
export function isManualShoppingItem(item: Pick<ShoppingListItem, 'ingredientId' | 'usedIn'>): boolean {
  return item.usedIn.length === 0 || isCustomIngredient(item.ingredientId);
}

/**
 * Friendlier magnitudes once a quantity is in the user's system: 0.06 cup →
 * 1 tbsp, 1200 ml → 1.2 l, 0.2 kg → 200 g, 20 oz → 1.25 lb…
 */
const FRIENDLY_STEPS: Record<string, { to: string; factor: number; when: (q: number) => boolean }> = {
  ml: { to: 'l', factor: 1 / 1000, when: (q) => q >= 1000 },
  l: { to: 'ml', factor: 1000, when: (q) => q < 1 },
  g: { to: 'kg', factor: 1 / 1000, when: (q) => q >= 1000 },
  kg: { to: 'g', factor: 1000, when: (q) => q < 1 },
  cup: { to: 'tbsp', factor: 16, when: (q) => q < 0.25 },
  tbsp: { to: 'tsp', factor: 3, when: (q) => q < 1 },
  oz: { to: 'lb', factor: 1 / 16, when: (q) => q >= 16 },
  lb: { to: 'oz', factor: 16, when: (q) => q < 1 },
};

const round2 = (value: number) => Math.round(value * 100) / 100;
const round4 = (value: number) => Math.round(value * 10_000) / 10_000;

/**
 * Express a stored line (`quantity` in its shopping base unit) in the user's
 * unit system (`$preferences.unitSystem`, `auto` resolved) at a readable
 * magnitude. Units with no counterpart (`piece`, `clove`…) pass through.
 */
export function toShoppingDisplay(quantity: number, unit: string, system: ResolvedUnitSystem): UnitConversionResult {
  let { quantity: q, unit: u } = toPreferredUnit(quantity, unit, system);
  for (let i = 0; i < 2 && q > 0; i++) {
    const step = FRIENDLY_STEPS[u];
    if (!step || !step.when(q)) break;
    q *= step.factor;
    u = step.to;
  }
  q = round2(q);
  return { quantity: q, unit: u, formatted: formatQuantity(q) };
}

/** Factor that turns `from` into `to`, directly or through ml / g; `undefined` when unrelated. */
function conversionFactor(from: string, to: string): number | undefined {
  if (from === to) return 1;
  const direct = unitConversions[from]?.[to];
  if (direct !== undefined) return direct;
  for (const via of ['ml', 'g', 'cup']) {
    const a = unitConversions[from]?.[via];
    const b = unitConversions[via]?.[to];
    if (a !== undefined && b !== undefined) return a * b;
  }
  return undefined;
}

/**
 * Inverse of `toShoppingDisplay` for an edit: the user typed `quantity` in the
 * unit they see; store it back in the line's own unit so the line keeps its
 * identity. Falls back to the displayed unit when the two are unrelated.
 */
export function fromShoppingDisplay(
  quantity: number,
  displayUnit: string,
  storedUnit: string,
): { quantity: number; unit: string } {
  const factor = conversionFactor(displayUnit, storedUnit);
  if (factor === undefined) return { quantity: round4(quantity), unit: displayUnit };
  return { quantity: round4(quantity * factor), unit: storedUnit };
}

/** Every line converted with `toShoppingDisplay` — what the exports print. */
export function localizeShoppingList(
  items: ReadonlyArray<ShoppingListItem>,
  system: ResolvedUnitSystem,
): ShoppingListItem[] {
  return items.map((item) => {
    const shown = toShoppingDisplay(item.quantity, item.unit, system);
    return { ...item, quantity: shown.quantity, unit: shown.unit };
  });
}

export type ShoppingSort = 'category' | 'name' | 'checked';
export const SHOPPING_SORTS: ReadonlyArray<ShoppingSort> = ['category', 'name', 'checked'];

export type ShoppingFilter = {
  /** Free text matched against the display name, category label and notes. */
  search: string;
  /** `false` hides purchased lines (legacy "Hide checked"). */
  showChecked: boolean;
};

/** Legacy `ShoppingList` filtering, but on display names (not raw ids). */
export function filterShoppingItems(
  items: ReadonlyArray<ShoppingListItem>,
  { search, showChecked }: ShoppingFilter,
  nameOf: (item: ShoppingListItem) => string,
  categoryLabelOf: (categoryId: string) => string = (id) => id,
): ShoppingListItem[] {
  const query = search.trim().toLocaleLowerCase();
  return items.filter((item) => {
    if (!showChecked && item.checked) return false;
    if (!query) return true;
    return [nameOf(item), categoryLabelOf(item.category || OTHER_CATEGORY), item.notes ?? '']
      .some((text) => text.toLocaleLowerCase().includes(query));
  });
}

/** Sort by display name (`name`), unchecked first (`checked`), or keep order (`category`, grouped later). */
export function sortShoppingItems(
  items: ReadonlyArray<ShoppingListItem>,
  sort: ShoppingSort,
  nameOf: (item: ShoppingListItem) => string,
  locale = 'en',
): ShoppingListItem[] {
  const byName = (a: ShoppingListItem, b: ShoppingListItem) => nameOf(a).localeCompare(nameOf(b), locale);
  const copy = [...items];
  switch (sort) {
    case 'name':
      return copy.sort(byName);
    case 'checked':
      return copy.sort((a, b) => Number(a.checked) - Number(b.checked) || byName(a, b));
    case 'category':
    default:
      return copy.sort(byName);
  }
}

export type ShoppingGroup = { category: string; items: ShoppingListItem[] };

/**
 * Groups for the list view: categories in `order` (the catalog's
 * `ingredientCategories` order), unknown ones after them alphabetically,
 * `other` last; items keep the order they come in (see `sortShoppingItems`).
 */
export function groupShoppingItems(
  items: ReadonlyArray<ShoppingListItem>,
  order: ReadonlyArray<string> = [],
): ShoppingGroup[] {
  const groups = new Map<string, ShoppingListItem[]>();
  for (const item of items) {
    const category = item.category || OTHER_CATEGORY;
    const group = groups.get(category);
    if (group) group.push(item);
    else groups.set(category, [item]);
  }
  const rank = (id: string) => {
    if (id === OTHER_CATEGORY) return Number.MAX_SAFE_INTEGER;
    const index = order.indexOf(id);
    return index === -1 ? order.length : index;
  };
  return [...groups]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([category, groupItems]) => ({ category, items: groupItems }));
}

/**
 * "Generate from plan" without losing work: the recipe-derived lines are
 * replaced by `generated`, the manual ones (custom items, lines added from an
 * ingredient page) are kept, and a generated line that already existed keeps
 * its `checked` state and notes. A manual line with the same ingredient + unit
 * as a generated one absorbs it (quantities summed) instead of duplicating it.
 */
export function mergeGeneratedList(
  current: ReadonlyArray<ShoppingListItem>,
  generated: ReadonlyArray<ShoppingListItem>,
): ShoppingListItem[] {
  const previous = new Map(current.map((item) => [shoppingItemKey(item), item] as const));
  const manual = current.filter(isManualShoppingItem);
  const manualKeys = new Map(manual.map((item, index) => [shoppingItemKey(item), index] as const));
  const merged = manual.map((item) => ({ ...item, usedIn: [...item.usedIn] }));
  const fresh: ShoppingListItem[] = [];
  for (const line of generated) {
    const key = shoppingItemKey(line);
    const manualIndex = manualKeys.get(key);
    if (manualIndex !== undefined) {
      const target = merged[manualIndex]!;
      target.quantity = round4(target.quantity + line.quantity);
      target.usedIn = [...new Set([...target.usedIn, ...line.usedIn])];
      continue;
    }
    const before = previous.get(key);
    fresh.push(before ? { ...line, checked: before.checked, notes: before.notes ?? line.notes } : line);
  }
  return [...fresh, ...merged];
}
