/**
 * Pure catalog selectors (roadmap Issue 013 ported the `BeverageContext`
 * logic; Issue 016 the `RecipeContext` / `IngredientContext` selectors —
 * the fetch itself lives in `use-catalog.ts`).
 * They take the catalog arrays explicitly so they work in islands (from
 * `useCatalog()`), in Astro pages (from `getCollection`) and in tests.
 */
import { getTranslated, LOCALES } from '@/i18n';
import { calculateRecipeCost } from '@/lib/domain/calculations';
import type { Beverage, Ingredient, Locale, Recipe, RecipeFilters, SortOption } from '@/schemas';

/**
 * @deprecated Alias kept for Issue 013 callers — the canonical helper is
 * `getTranslated(text, lang)` in `src/i18n` (roadmap Issue 015).
 */
export const pickLang = getTranslated;

export function getBeverageById(
  beverages: ReadonlyArray<Beverage>,
  id: string,
): Beverage | undefined {
  return beverages.find((b) => b.id === id);
}

export function getBeveragesByCategory(
  beverages: ReadonlyArray<Beverage>,
  category: string,
): Beverage[] {
  return beverages.filter((b) => b.category === category);
}

/** Case-insensitive, trimmed substring match on the localised name; blank query → all. */
export function searchBeverages(
  beverages: ReadonlyArray<Beverage>,
  query: string,
  lang: Locale = 'en',
): Beverage[] {
  const term = query.trim().toLowerCase();
  if (!term) return [...beverages];
  return beverages.filter((b) => getTranslated(b.name, lang).toLowerCase().includes(term));
}

// ── Recipes / ingredients (roadmap Issue 016 — port of RecipeContext / IngredientContext) ──

export function getRecipeById(recipes: ReadonlyArray<Recipe>, id: string): Recipe | undefined {
  return recipes.find((r) => r.id === id);
}

export function getIngredientById(
  ingredients: ReadonlyArray<Ingredient>,
  id: string,
): Ingredient | undefined {
  return ingredients.find((i) => i.id === id);
}

/** Localised ingredient name; falls back to the id when the catalog does not know it (legacy behaviour). */
export function getIngredientName(
  ingredients: ReadonlyArray<Ingredient>,
  id: string,
  lang: Locale = 'en',
): string {
  const ingredient = getIngredientById(ingredients, id);
  return ingredient ? getTranslated(ingredient.name, lang) : id;
}

export function getIngredientsByCategory(
  ingredients: ReadonlyArray<Ingredient>,
  category: string,
): Ingredient[] {
  return ingredients.filter((i) => i.category === category);
}

/** Recipes whose ingredient lines reference `ingredientId` (ingredient detail → "used in"). */
export function getRecipesByIngredient(
  recipes: ReadonlyArray<Recipe>,
  ingredientId: string,
): Recipe[] {
  return recipes.filter((r) => r.ingredients.some((line) => line.ingredientId === ingredientId));
}

/**
 * Case-insensitive, trimmed substring match on the recipe name in ANY locale
 * (legacy behaviour — "huevos" finds Scrambled Eggs on the English site too)
 * plus the description in `lang`. Blank query → every recipe.
 */
export function searchRecipes(
  recipes: ReadonlyArray<Recipe>,
  query: string,
  lang: Locale = 'en',
): Recipe[] {
  const term = query.trim().toLowerCase();
  if (!term) return [...recipes];
  return recipes.filter(
    (r) =>
      LOCALES.some((l) => r.name[l].toLowerCase().includes(term)) ||
      getTranslated(r.description, lang).toLowerCase().includes(term),
  );
}

/**
 * `categories.dietaryTags` id → `Recipe.dietaryLabels` key
 * (`'gluten-free'` → `'glutenFree'`, `'vegan'` → `'vegan'`).
 */
export function dietaryTagKey(tagId: string): string {
  return tagId.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

/**
 * True when the recipe carries the dietary tag either as a free-form `tags`
 * entry (legacy behaviour) or as a `true` flag in `dietaryLabels` — the data
 * marks `dairyFree: true` on 26 recipes while no recipe is tagged
 * `dairy-free`, so a tags-only match (legacy) silently returned nothing.
 */
export function recipeHasDietaryTag(recipe: Recipe, tagId: string): boolean {
  if (recipe.tags.includes(tagId)) return true;
  const flags = recipe.dietaryLabels as Record<string, boolean | undefined>;
  return flags[dietaryTagKey(tagId)] === true;
}

/**
 * Apply `RecipeFilters` (every set filter must match). Ported from
 * `RecipeContext`: `dietaryLabels` match the recipe `tags` array OR the
 * `dietaryLabels` flags (any of — see `recipeHasDietaryTag`), `tags` the
 * `tags` array (any of), `cuisines` any-of, `types`/`difficulties` exact,
 * `maxTime` caps `totalTime`; `ingredients` keeps recipes using at least one
 * listed id.
 */
export function filterRecipes(
  recipes: ReadonlyArray<Recipe>,
  filters: RecipeFilters,
  lang: Locale = 'en',
): Recipe[] {
  let result = filters.search ? searchRecipes(recipes, filters.search, lang) : [...recipes];
  const { types, cuisines, dietaryLabels, difficulties, tags, ingredients } = filters;
  if (types?.length) result = result.filter((r) => types.includes(r.type));
  if (cuisines?.length) result = result.filter((r) => r.cuisine.some((c) => cuisines.includes(c)));
  if (dietaryLabels?.length) {
    result = result.filter((r) => dietaryLabels.some((label) => recipeHasDietaryTag(r, label)));
  }
  if (difficulties?.length) result = result.filter((r) => difficulties.includes(r.difficulty));
  if (tags?.length) result = result.filter((r) => tags.some((tag) => r.tags.includes(tag)));
  const { maxTime, maxPrepTime, maxCookTime } = filters;
  if (maxTime) result = result.filter((r) => r.totalTime <= maxTime);
  if (maxPrepTime) result = result.filter((r) => r.prepTime <= maxPrepTime);
  if (maxCookTime) result = result.filter((r) => r.cookTime <= maxCookTime);
  if (ingredients?.length) {
    result = result.filter((r) => r.ingredients.some((line) => ingredients.includes(line.ingredientId)));
  }
  return result;
}

const DIFFICULTY_RANK: Record<string, number> = { easy: 1, medium: 2, hard: 3 };

export interface SortRecipesOptions {
  /** Locale used for name sorting (legacy always compared the English name). */
  lang?: Locale;
  /** Needed by `cost-asc` / `cost-desc`; without it cost sorts keep the input order. */
  ingredients?: ReadonlyArray<Ingredient>;
}

/**
 * Return a NEW array sorted by a `SortOption`. Legacy aliases (`rating`,
 * `prepTime`, `newest`, `name`, `cost`) map onto their `-desc`/`-asc` forms.
 */
export function sortRecipes(
  recipes: ReadonlyArray<Recipe>,
  sortBy: SortOption,
  options: SortRecipesOptions = {},
): Recipe[] {
  const lang = options.lang ?? 'en';
  const costOf = (r: Recipe) =>
    options.ingredients ? calculateRecipeCost(r, options.ingredients) : 0;
  const name = (r: Recipe) => getTranslated(r.name, lang);
  const comparators: Record<SortOption, (a: Recipe, b: Recipe) => number> = {
    'rating-desc': (a, b) => b.rating - a.rating,
    rating: (a, b) => b.rating - a.rating,
    'rating-asc': (a, b) => a.rating - b.rating,
    'time-asc': (a, b) => a.totalTime - b.totalTime,
    prepTime: (a, b) => a.totalTime - b.totalTime,
    'time-desc': (a, b) => b.totalTime - a.totalTime,
    'name-asc': (a, b) => name(a).localeCompare(name(b), lang),
    name: (a, b) => name(a).localeCompare(name(b), lang),
    'name-desc': (a, b) => name(b).localeCompare(name(a), lang),
    'difficulty-asc': (a, b) =>
      (DIFFICULTY_RANK[a.difficulty] ?? 0) - (DIFFICULTY_RANK[b.difficulty] ?? 0),
    'difficulty-desc': (a, b) =>
      (DIFFICULTY_RANK[b.difficulty] ?? 0) - (DIFFICULTY_RANK[a.difficulty] ?? 0),
    recent: (a, b) => Date.parse(b.dateAdded) - Date.parse(a.dateAdded),
    newest: (a, b) => Date.parse(b.dateAdded) - Date.parse(a.dateAdded),
    popular: (a, b) => b.reviewCount - a.reviewCount,
    'cost-asc': (a, b) => costOf(a) - costOf(b),
    cost: (a, b) => costOf(a) - costOf(b),
    'cost-desc': (a, b) => costOf(b) - costOf(a),
  };
  return [...recipes].sort(comparators[sortBy]);
}
