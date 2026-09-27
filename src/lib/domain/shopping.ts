/**
 * Shopping-list arithmetic without UI or storage (roadmap Issue 013 + Issue
 * 014: the full port of legacy `services/shoppingService.ts` — unit
 * normalisation, category resolution/grouping, text/CSV/WhatsApp exports).
 */
import type { Category, Ingredient, Locale, MealPlan, MealSlot, Recipe, ShoppingListItem } from '@/schemas';
import { getTranslated } from '@/i18n';

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
 * 2 decimals and `usedIn` is deduplicated.
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
    quantity: Math.round(v.quantity * 100) / 100,
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

export type ExportLabels = {
  /** Category id → display label (defaults to `getCategoryLabel` with no catalog). */
  categoryLabel?: (categoryId: string) => string;
  /** Ingredient id → display name (defaults to the id). */
  ingredientLabel?: (ingredientId: string) => string;
};

function labelsOf(labels: ExportLabels) {
  return {
    category: labels.categoryLabel ?? ((id: string) => getCategoryLabel(id)),
    ingredient: labels.ingredientLabel ?? ((id: string) => id),
  };
}

/** Plain-text export grouped by category, with notes and "Used in" lines. */
export function exportAsText(items: ReadonlyArray<ShoppingListItem>, labels: ExportLabels = {}): string {
  const { category: categoryLabel, ingredient: ingredientLabel } = labelsOf(labels);
  let output = `Shopping List\n${'='.repeat(50)}\n\n`;
  for (const [category, group] of Object.entries(groupByCategory(items))) {
    output += `${categoryLabel(category).toUpperCase()}\n${'-'.repeat(30)}\n`;
    for (const item of group) {
      output += `${item.checked ? '✓' : '☐'} ${item.quantity} ${item.unit} ${ingredientLabel(item.ingredientId)}\n`;
      if (item.notes) output += `   Note: ${item.notes}\n`;
      if (item.usedIn.length > 0) output += `   Used in: ${item.usedIn.join(', ')}\n`;
    }
    output += '\n';
  }
  return output;
}

const csvCell = (value: string) => `"${value.replace(/"/g, '""')}"`;

/** CSV export: `Category,Ingredient,Quantity,Unit,Checked,Used In,Notes`. */
export function exportAsCSV(items: ReadonlyArray<ShoppingListItem>, labels: ExportLabels = {}): string {
  const { category: categoryLabel, ingredient: ingredientLabel } = labelsOf(labels);
  const header = 'Category,Ingredient,Quantity,Unit,Checked,Used In,Notes\n';
  const rows = items.map((item) =>
    [
      csvCell(categoryLabel(item.category || OTHER_CATEGORY)),
      csvCell(ingredientLabel(item.ingredientId)),
      String(item.quantity),
      csvCell(item.unit),
      csvCell(item.checked ? 'Yes' : 'No'),
      csvCell(item.usedIn.join('; ')),
      csvCell(item.notes ?? ''),
    ].join(','),
  );
  return header + rows.join('\n');
}

/** WhatsApp-friendly export (bold categories, emoji checkboxes, item count). */
export function exportForWhatsApp(items: ReadonlyArray<ShoppingListItem>, labels: ExportLabels = {}): string {
  const { category: categoryLabel, ingredient: ingredientLabel } = labelsOf(labels);
  let output = '🛒 *Shopping List*\n\n';
  for (const [category, group] of Object.entries(groupByCategory(items))) {
    output += `*${categoryLabel(category)}*\n`;
    for (const item of group) {
      output += `${item.checked ? '✅' : '☑️'} ${item.quantity} ${item.unit} ${ingredientLabel(item.ingredientId)}\n`;
    }
    output += '\n';
  }
  return output + `_Total items: ${items.length}_`;
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
