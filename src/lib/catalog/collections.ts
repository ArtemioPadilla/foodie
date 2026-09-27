/**
 * Catalog sources — the single description of how `public/data/*.json` maps
 * onto Astro content collections (roadmap Issue 011, D6).
 *
 * `src/content.config.ts` turns each entry into `defineCollection({ loader:
 * file(path, { parser }), schema })`; `src/tests/catalog-schema.test.ts` runs
 * the very same loader + parser + schema against the real files. Keeping the
 * table here (no `astro:content` import) is what lets Vitest exercise it.
 *
 * File shapes (see the docs recipe `docs/recipes/catalog-data.md`):
 * - recipes.json      `{ recipes: Recipe[] }`         → unwrap `recipes`
 * - ingredients.json  `{ ingredients: Ingredient[] }` → unwrap `ingredients`
 * - beverages.json    `Beverage[]`                    → as is
 * - categories.json   `{ mealTypes, cuisines, dietaryTags, ingredientCategories }`
 *                                                     → one entry per taxonomy
 *                                                       `{ id, items }`
 */
import type { z } from 'zod';
import {
  BeverageSchema,
  CATEGORY_GROUPS,
  CategoryGroupSchema,
  IngredientSchema,
  RecipeSchema,
} from '../../schemas';

/** What Astro's `file()` loader accepts back from a `parser`. */
export type CatalogRows = Array<Record<string, unknown>>;
export type CatalogParser = (text: string) => CatalogRows;

function asRecord(value: unknown, what: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${what}: expected a JSON object`);
  }
  return value as Record<string, unknown>;
}

function asRows(value: unknown, what: string): CatalogRows {
  if (!Array.isArray(value)) throw new Error(`${what}: expected a JSON array of records`);
  return value as CatalogRows;
}

/** `{ [key]: Row[] }` → `Row[]` (recipes.json, ingredients.json). */
export function unwrapArray(key: string): CatalogParser {
  return (text) => asRows(asRecord(JSON.parse(text), 'catalog file')[key], `"${key}"`);
}

/** A bare `Row[]` file (beverages.json). */
export const bareArray: CatalogParser = (text) => asRows(JSON.parse(text), 'catalog file');

/**
 * categories.json → one entry per taxonomy so the collection can be queried as
 * `getEntry('categories', 'mealTypes')`. Unknown top-level keys are kept (and
 * then rejected by `CategoryGroupSchema`'s enum) so a typo in the file fails
 * the build instead of silently dropping a taxonomy.
 */
export const categoryGroups: CatalogParser = (text) =>
  Object.entries(asRecord(JSON.parse(text), 'categories.json')).map(([id, items]) => ({
    id,
    items,
  }));

export const CATALOG_COLLECTIONS = {
  recipes: {
    file: './public/data/recipes.json',
    parser: unwrapArray('recipes'),
    schema: RecipeSchema,
  },
  ingredients: {
    file: './public/data/ingredients.json',
    parser: unwrapArray('ingredients'),
    schema: IngredientSchema,
  },
  beverages: {
    file: './public/data/beverages.json',
    parser: bareArray,
    schema: BeverageSchema,
  },
  categories: {
    file: './public/data/categories.json',
    parser: categoryGroups,
    schema: CategoryGroupSchema,
  },
} as const satisfies Record<string, { file: string; parser: CatalogParser; schema: z.ZodType }>;

export type CatalogCollectionName = keyof typeof CATALOG_COLLECTIONS;
export const CATALOG_COLLECTION_NAMES = Object.keys(CATALOG_COLLECTIONS) as CatalogCollectionName[];

/** Entry ids of the `categories` collection. */
export const CATEGORY_ENTRY_IDS = CATEGORY_GROUPS;
