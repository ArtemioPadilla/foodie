/**
 * `useCatalog()` — the runtime catalog for islands (roadmap Issue 016, D6).
 *
 * Replaces the legacy `RecipeContext` / `IngredientContext` / `BeverageContext`
 * fetch-on-mount logic with four TanStack queries on the template's
 * `QueryProvider`:
 *
 * - each `public/data/*.json` file is fetched through `withBase()` (the legacy
 *   `fetch('/foodie/data/beverages.json')` broke every non-`/foodie/` deploy),
 * - parsed with the same Zod file schemas the build uses (`RecipesFileSchema`
 *   …), so a malformed payload surfaces as `status: 'error'` instead of a
 *   runtime crash further down,
 * - opted into persistence (`meta.persist: true`): the parsed catalog is written
 *   to IndexedDB by `attachPersister` (24 h) and hydrated before the first
 *   render on the next visit, which is what makes the planner usable offline.
 *
 * The hook must be rendered inside `QueryProvider` (or any `QueryClientProvider`).
 */
import { useMemo } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { withBase } from '@/lib/href';
import {
  BeveragesFileSchema,
  CategoriesFileSchema,
  IngredientPricesFileSchema,
  IngredientsFileSchema,
  pricesFromFile,
  RecipesFileSchema,
  type Beverage,
  type CategoriesFile,
  type Ingredient,
  type IngredientPrice,
  type Recipe,
} from '@/schemas';
import type { CatalogCollectionName } from './collections';

/** Site-relative paths of the catalog files — always wrapped in `withBase()` before fetching. */
export const CATALOG_FILES: Record<CatalogCollectionName, string> = {
  recipes: '/data/recipes.json',
  ingredients: '/data/ingredients.json',
  beverages: '/data/beverages.json',
  categories: '/data/categories.json',
  prices: '/data/ingredient-prices.json',
};

/** Parsed shape of each file as the hook exposes it. */
export interface CatalogData {
  recipes: Recipe[];
  ingredients: Ingredient[];
  beverages: Beverage[];
  categories: CategoriesFile;
}

/**
 * Every fetchable file: the four `useCatalog()` files plus the store price
 * sheet, which only the cost views need (`usePriceCatalog()`, Issue 041).
 */
export interface CatalogFileData extends CatalogData {
  prices: IngredientPrice[];
}

const PARSERS: { [N in CatalogCollectionName]: (json: unknown) => CatalogFileData[N] } = {
  recipes: (json) => RecipesFileSchema.parse(json).recipes,
  ingredients: (json) => IngredientsFileSchema.parse(json).ingredients,
  beverages: (json) => BeveragesFileSchema.parse(json),
  categories: (json) => CategoriesFileSchema.parse(json),
  prices: (json) => pricesFromFile(IngredientPricesFileSchema.parse(json)),
};

/** Root of every catalog query key: `['catalog', <file>]`. */
export const CATALOG_QUERY_KEY = ['catalog'] as const;

export function catalogQueryKey(name: CatalogCollectionName) {
  return [...CATALOG_QUERY_KEY, name] as const;
}

/**
 * Fetch + validate one catalog file. Throws on a non-2xx response, invalid JSON
 * or a schema violation (the ZodError carries every issue path).
 */
export async function fetchCatalogFile<N extends CatalogCollectionName>(
  name: N,
  fetchImpl: typeof fetch = fetch,
): Promise<CatalogFileData[N]> {
  const url = withBase(CATALOG_FILES[name]);
  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status} ${response.statusText}`.trim());
  }
  return PARSERS[name](await response.json());
}

/** Query options shared by `useCatalog` and any prefetch (`queryClient.prefetchQuery(...)`). */
export function catalogQueryOptions<N extends CatalogCollectionName>(name: N) {
  return {
    queryKey: catalogQueryKey(name),
    queryFn: () => fetchCatalogFile(name),
    meta: { persist: true },
  };
}

/**
 * - `loading`  — at least one file has neither data nor error yet
 * - `success`  — every file loaded and the last fetch succeeded
 * - `offline`  — the fetch failed or is paused (browser offline) but the
 *                persisted cache is being served; also when offline with an
 *                empty cache (arrays are then empty)
 * - `error`    — a file failed (network, HTTP or schema) and there is no cache
 */
export type CatalogStatus = 'loading' | 'success' | 'error' | 'offline';

export interface CatalogResult extends CatalogData {
  status: CatalogStatus;
  /** First error among the four queries (network, HTTP status or ZodError). */
  error: Error | null;
  /** True while any file is (re)fetching in the background. */
  isFetching: boolean;
  /** Refetch the four files (e.g. a "retry" button). */
  refetch: () => void;
}

const EMPTY_RECIPES: Recipe[] = [];
const EMPTY_INGREDIENTS: Ingredient[] = [];
const EMPTY_BEVERAGES: Beverage[] = [];
const EMPTY_CATEGORIES: CategoriesFile = {
  mealTypes: [],
  cuisines: [],
  dietaryTags: [],
  ingredientCategories: [],
};

/** Collapse the four query states into one `CatalogStatus` (exported for tests/other hooks). */
export function combineCatalogStatus(
  queries: ReadonlyArray<Pick<UseQueryResult, 'data' | 'isError' | 'fetchStatus'>>,
): CatalogStatus {
  const allHaveData = queries.every((q) => q.data !== undefined);
  const anyPaused = queries.some((q) => q.fetchStatus === 'paused');
  const anyError = queries.some((q) => q.isError);
  if (anyPaused) return 'offline';
  if (allHaveData) return anyError ? 'offline' : 'success';
  if (queries.some((q) => q.isError && q.data === undefined)) return 'error';
  return 'loading';
}

export function useCatalog(): CatalogResult {
  const recipes = useQuery(catalogQueryOptions('recipes'));
  const ingredients = useQuery(catalogQueryOptions('ingredients'));
  const beverages = useQuery(catalogQueryOptions('beverages'));
  const categories = useQuery(catalogQueryOptions('categories'));

  const status = combineCatalogStatus([recipes, ingredients, beverages, categories]);
  const error = recipes.error ?? ingredients.error ?? beverages.error ?? categories.error ?? null;
  const isFetching =
    recipes.isFetching || ingredients.isFetching || beverages.isFetching || categories.isFetching;

  const refetch = () => {
    void recipes.refetch();
    void ingredients.refetch();
    void beverages.refetch();
    void categories.refetch();
  };

  return useMemo<CatalogResult>(
    () => ({
      recipes: recipes.data ?? EMPTY_RECIPES,
      ingredients: ingredients.data ?? EMPTY_INGREDIENTS,
      beverages: beverages.data ?? EMPTY_BEVERAGES,
      categories: categories.data ?? EMPTY_CATEGORIES,
      status,
      error,
      isFetching,
      refetch,
    }),
    // refetch is recreated each render on purpose; the memo keys on data/status.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recipes.data, ingredients.data, beverages.data, categories.data, status, error, isFetching],
  );
}

const EMPTY_PRICES: IngredientPrice[] = [];

/**
 * The store price sheet (`ingredient-prices.json`, roadmap Issue 041) — its
 * own query, outside `useCatalog()`'s combined status: prices are optional
 * (every ingredient still has `avgPrice`), so while loading, offline without
 * cache or on error this is simply `[]`.
 */
export function usePriceCatalog(): IngredientPrice[] {
  const prices = useQuery(catalogQueryOptions('prices'));
  return prices.data ?? EMPTY_PRICES;
}
