/**
 * RecipeBrowser state helpers (roadmap Issue 017) — the pure half of the
 * `/recipes/` island: parse ↔ serialise the query string, count active
 * filters, and turn `RecipeBrowserState` into the visible recipe list.
 *
 * Kept free of React so the island tests can exercise filters, ordering and
 * URL round-trips without a DOM, and so Issue 020 can link straight to
 * `/recipes/?favorites=1`.
 */
import { filterRecipes, sortRecipes } from '@/lib/catalog/selectors';
import {
  RecipeBrowserStateSchema,
  RecipeViewSchema,
  SortOptionSchema,
  type Ingredient,
  type Locale,
  type Recipe,
  type RecipeBrowserState,
  type SortOption,
} from '@/schemas';

export const DEFAULT_RECIPE_BROWSER_STATE: RecipeBrowserState = RecipeBrowserStateSchema.parse({
  search: '',
  types: [],
  cuisines: [],
  dietaryTags: [],
  difficulties: [],
  maxTime: undefined,
  favoritesOnly: false,
  // Legacy `RecipeContext` default.
  sort: 'rating-desc',
  view: 'grid',
});

/** Query-string parameter for each state field (`?favorites=1` is the Issue 020 contract). */
export const RECIPE_BROWSER_PARAMS = {
  search: 'q',
  types: 'type',
  cuisines: 'cuisine',
  dietaryTags: 'diet',
  difficulties: 'difficulty',
  maxTime: 'time',
  favoritesOnly: 'favorites',
  sort: 'sort',
  view: 'view',
} as const satisfies Record<keyof RecipeBrowserState, string>;

/** Sort options the browser offers, in menu order, with their `recipe.*` label keys. */
export const RECIPE_SORT_CHOICES: ReadonlyArray<{ value: SortOption; labelKey: string }> = [
  { value: 'rating-desc', labelKey: 'recipe.sortRatingDesc' },
  { value: 'rating-asc', labelKey: 'recipe.sortRatingAsc' },
  { value: 'time-asc', labelKey: 'recipe.sortTimeAsc' },
  { value: 'time-desc', labelKey: 'recipe.sortTimeDesc' },
  { value: 'cost-asc', labelKey: 'recipe.sortCostAsc' },
  { value: 'cost-desc', labelKey: 'recipe.sortCostDesc' },
  { value: 'name-asc', labelKey: 'recipe.sortNameAsc' },
  { value: 'name-desc', labelKey: 'recipe.sortNameDesc' },
  { value: 'difficulty-asc', labelKey: 'recipe.sortDifficultyAsc' },
  { value: 'difficulty-desc', labelKey: 'recipe.sortDifficultyDesc' },
  { value: 'recent', labelKey: 'recipe.sortRecent' },
];

/** "≤ N minutes" presets of the total-time filter (legacy RecipeFilters). */
export const RECIPE_MAX_TIME_CHOICES: ReadonlyArray<{ value: number; labelKey: string }> = [
  { value: 15, labelKey: 'recipe.fifteenMinutesOrLess' },
  { value: 30, labelKey: 'recipe.thirtyMinutesOrLess' },
  { value: 60, labelKey: 'recipe.oneHourOrLess' },
];

function csv(params: URLSearchParams, name: string): string[] {
  const seen = new Set<string>();
  for (const raw of params.getAll(name)) {
    for (const part of raw.split(',')) {
      const value = part.trim();
      if (value) seen.add(value);
    }
  }
  return [...seen];
}

/**
 * Parse a query string (with or without the leading `?`) or `URLSearchParams`
 * into a valid state. Tolerant by design: unknown sort/view values fall back
 * to the defaults and a non-numeric `time` is ignored, so a hand-edited or
 * stale URL never crashes the island.
 */
export function parseRecipeBrowserState(input: string | URLSearchParams = ''): RecipeBrowserState {
  const params = typeof input === 'string' ? new URLSearchParams(input.replace(/^\?/, '')) : input;
  const P = RECIPE_BROWSER_PARAMS;

  const sortParsed = SortOptionSchema.safeParse(params.get(P.sort));
  const viewParsed = RecipeViewSchema.safeParse(params.get(P.view));
  const timeRaw = Number(params.get(P.maxTime));
  const favorites = params.get(P.favoritesOnly);

  return RecipeBrowserStateSchema.parse({
    // Kept verbatim (no trim): the search box is controlled by this value and
    // a trailing space must survive the URL round trip while the user types.
    search: params.get(P.search) ?? '',
    types: csv(params, P.types),
    cuisines: csv(params, P.cuisines),
    dietaryTags: csv(params, P.dietaryTags),
    difficulties: csv(params, P.difficulties),
    maxTime: Number.isFinite(timeRaw) && timeRaw > 0 ? timeRaw : undefined,
    favoritesOnly: favorites === '1' || favorites === 'true',
    sort: sortParsed.success ? sortParsed.data : DEFAULT_RECIPE_BROWSER_STATE.sort,
    view: viewParsed.success ? viewParsed.data : DEFAULT_RECIPE_BROWSER_STATE.view,
  });
}

/**
 * Serialise to a query string WITHOUT the leading `?` — only the fields that
 * differ from the defaults, in a stable order, so `/recipes/` stays clean and
 * two equal states always produce the same URL.
 */
export function serializeRecipeBrowserState(state: RecipeBrowserState): string {
  const params = new URLSearchParams();
  const P = RECIPE_BROWSER_PARAMS;
  if (state.search.trim()) params.set(P.search, state.search);
  if (state.types.length) params.set(P.types, state.types.join(','));
  if (state.cuisines.length) params.set(P.cuisines, state.cuisines.join(','));
  if (state.dietaryTags.length) params.set(P.dietaryTags, state.dietaryTags.join(','));
  if (state.difficulties.length) params.set(P.difficulties, state.difficulties.join(','));
  if (state.maxTime) params.set(P.maxTime, String(state.maxTime));
  if (state.favoritesOnly) params.set(P.favoritesOnly, '1');
  if (state.sort !== DEFAULT_RECIPE_BROWSER_STATE.sort) params.set(P.sort, state.sort);
  if (state.view !== DEFAULT_RECIPE_BROWSER_STATE.view) params.set(P.view, state.view);
  return params.toString();
}

/** Number of active filters shown on the "Filters" badge (search, sort and view are not filters). */
export function countActiveFilters(state: RecipeBrowserState): number {
  return (
    state.types.length +
    state.cuisines.length +
    state.dietaryTags.length +
    state.difficulties.length +
    (state.maxTime ? 1 : 0) +
    (state.favoritesOnly ? 1 : 0)
  );
}

/** Legacy "Clear all": drop every filter, keep search, sort and view. */
export function clearRecipeBrowserFilters(state: RecipeBrowserState): RecipeBrowserState {
  return {
    ...DEFAULT_RECIPE_BROWSER_STATE,
    search: state.search,
    sort: state.sort,
    view: state.view,
  };
}

/** Toggle `value` in a list filter (`types`, `cuisines`, `dietaryTags`, `difficulties`). */
export function toggleListValue(list: ReadonlyArray<string>, value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export interface ApplyRecipeBrowserStateContext {
  lang: Locale;
  /** Needed for `cost-*` sorts; without it cost sorts keep the input order. */
  ingredients?: ReadonlyArray<Ingredient>;
  /** Favourite recipe ids (`$favorites`); required for `favoritesOnly`. */
  favorites?: ReadonlyArray<string>;
}

/**
 * The recipes the browser shows for `state`: search + filters
 * (`filterRecipes`), the favourites-only switch, then `sortRecipes`.
 */
export function applyRecipeBrowserState(
  recipes: ReadonlyArray<Recipe>,
  state: RecipeBrowserState,
  { lang, ingredients, favorites = [] }: ApplyRecipeBrowserStateContext,
): Recipe[] {
  let result = filterRecipes(
    recipes,
    {
      search: state.search,
      types: state.types,
      cuisines: state.cuisines,
      dietaryLabels: state.dietaryTags,
      difficulties: state.difficulties,
      maxTime: state.maxTime,
    },
    lang,
  );
  if (state.favoritesOnly) {
    const set = new Set(favorites);
    result = result.filter((r) => set.has(r.id));
  }
  return sortRecipes(result, state.sort, { lang, ingredients });
}
