/**
 * IngredientBrowser state helpers (roadmap Issue 019) — the pure half of the
 * `/ingredients/` island (port of legacy `IngredientsPage`): parse ↔
 * serialise the query string, filter by search / category / dietary tags,
 * group by `categories.ingredientCategories` (in taxonomy order) and the
 * legacy "Recipes you can make" match of the selected ingredients.
 *
 * No React here, so the island tests exercise filters and URL round-trips
 * without a DOM.
 */
import { getTranslated, type Locale } from '@/i18n';
import {
  INGREDIENT_TAG_KEYS,
  IngredientBrowserStateSchema,
  IngredientTagKeySchema,
  type Category,
  type Ingredient,
  type IngredientBrowserState,
  type IngredientTagKey,
  type IngredientTags,
  type Recipe,
} from '@/schemas';

export const DEFAULT_INGREDIENT_BROWSER_STATE: IngredientBrowserState = IngredientBrowserStateSchema.parse({
  search: '',
  categories: [],
  tags: [],
  selected: [],
});

/** Query-string parameter for each state field. */
export const INGREDIENT_BROWSER_PARAMS = {
  search: 'q',
  categories: 'category',
  tags: 'diet',
  selected: 'have',
} as const satisfies Record<keyof IngredientBrowserState, string>;

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

/** Tolerant parse: unknown dietary tags are dropped, never thrown. */
export function parseIngredientBrowserState(input: string | URLSearchParams = ''): IngredientBrowserState {
  const params = typeof input === 'string' ? new URLSearchParams(input.replace(/^\?/, '')) : input;
  const P = INGREDIENT_BROWSER_PARAMS;
  return IngredientBrowserStateSchema.parse({
    search: params.get(P.search) ?? '',
    categories: csv(params, P.categories),
    tags: csv(params, P.tags).filter((tag) => IngredientTagKeySchema.safeParse(tag).success),
    selected: csv(params, P.selected),
  });
}

/** Query string without `?`; only non-default fields, in a stable order. */
export function serializeIngredientBrowserState(state: IngredientBrowserState): string {
  const params = new URLSearchParams();
  const P = INGREDIENT_BROWSER_PARAMS;
  if (state.search.trim()) params.set(P.search, state.search);
  if (state.categories.length) params.set(P.categories, state.categories.join(','));
  if (state.tags.length) params.set(P.tags, state.tags.join(','));
  if (state.selected.length) params.set(P.selected, state.selected.join(','));
  return params.toString();
}

/** Active filters (search and the "have" selection are not filters). */
export function countIngredientFilters(state: IngredientBrowserState): number {
  return state.categories.length + state.tags.length;
}

/** The true flags of an ingredient's tags, in display order. `vegetarian` is implied by `vegan` (legacy detail). */
export function activeIngredientTags(tags: IngredientTags, { collapseVegetarian = true } = {}): IngredientTagKey[] {
  return INGREDIENT_TAG_KEYS.filter(
    (key) => tags[key] === true && !(collapseVegetarian && key === 'vegetarian' && tags.vegan),
  );
}

function normalise(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/**
 * Search (name in `lang` with EN fallback, accent-insensitive), category (OR)
 * and dietary tags (AND). Order is kept.
 */
export function filterIngredients(
  ingredients: ReadonlyArray<Ingredient>,
  state: Pick<IngredientBrowserState, 'search' | 'categories' | 'tags'>,
  lang: Locale,
): Ingredient[] {
  const query = normalise(state.search);
  const categories = new Set(state.categories);
  return ingredients.filter((ingredient) => {
    if (categories.size && !categories.has(ingredient.category)) return false;
    if (state.tags.some((tag) => ingredient.tags[tag] !== true)) return false;
    if (!query) return true;
    const names = [getTranslated(ingredient.name, lang), ingredient.name.en];
    return names.some((name) => normalise(name).includes(query));
  });
}

export interface IngredientGroup {
  category: string;
  /** Localised category name (taxonomy) or the humanised id. */
  label: string;
  items: Ingredient[];
}

/**
 * Group by category in the taxonomy order (`categories.ingredientCategories`),
 * unknown categories last; items sorted by localised name.
 */
export function groupIngredientsByCategory(
  ingredients: ReadonlyArray<Ingredient>,
  taxonomy: ReadonlyArray<Category>,
  lang: Locale,
): IngredientGroup[] {
  const groups = new Map<string, Ingredient[]>();
  for (const ingredient of ingredients) {
    const list = groups.get(ingredient.category) ?? [];
    list.push(ingredient);
    groups.set(ingredient.category, list);
  }
  const order = taxonomy.map((c) => c.id);
  const ids = [...groups.keys()].sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    return (ia === -1 ? order.length : ia) - (ib === -1 ? order.length : ib) || a.localeCompare(b);
  });
  return ids.map((category) => ({
    category,
    label: categoryLabel(category, taxonomy, lang),
    items: (groups.get(category) ?? []).sort((a, b) =>
      getTranslated(a.name, lang).localeCompare(getTranslated(b.name, lang), lang),
    ),
  }));
}

/** Localised category label from the taxonomy; unknown ids are humanised. */
export function categoryLabel(id: string, taxonomy: ReadonlyArray<Category>, lang: Locale): string {
  const entry = taxonomy.find((c) => c.id === id);
  return entry ? getTranslated(entry.name, lang) : id.replace(/[-_]+/g, ' ');
}

export interface RecipeMatch {
  recipe: Recipe;
  /** 0–100, share of the recipe's required ingredients that are selected. */
  matchPercentage: number;
  matchedIngredients: number;
  totalIngredients: number;
}

/**
 * Legacy "Recipes You Can Make": recipes using at least one selected
 * ingredient, ranked by the share of their required (non-optional)
 * ingredients that are selected; ties by rating. Top `limit` (12).
 */
export function matchRecipesByIngredients(
  recipes: ReadonlyArray<Recipe>,
  selected: ReadonlyArray<string>,
  limit = 12,
): RecipeMatch[] {
  if (selected.length === 0) return [];
  const have = new Set(selected);
  const matches: RecipeMatch[] = [];
  for (const recipe of recipes) {
    const required = recipe.ingredients.filter((line) => !line.optional);
    if (required.length === 0) continue;
    const matched = required.filter((line) => have.has(line.ingredientId)).length;
    if (matched === 0) continue;
    matches.push({
      recipe,
      matchPercentage: (matched / required.length) * 100,
      matchedIngredients: matched,
      totalIngredients: required.length,
    });
  }
  return matches
    .sort((a, b) => b.matchPercentage - a.matchPercentage || b.recipe.rating - a.recipe.rating || a.recipe.id.localeCompare(b.recipe.id))
    .slice(0, limit);
}
