/**
 * Recipe detail page helpers (roadmap Issue 018). Pure: everything the three
 * `pages/{,es/,fr/}recipes/[id].astro` wrappers compute at build time — static paths,
 * related recipes, the ingredient lookup handed to the island, the schema.org
 * `Recipe` JSON-LD (port of legacy `utils/seo.tsx#generateRecipeStructuredData`,
 * now localised) — plus the small formatting helpers the domain components
 * share. No `astro:content` import, so the same functions run in Vitest
 * against `public/data/*.json`.
 */
import { getTranslated, hreflangAlternates, localizedRoute, t, type AlternateLink, type Locale } from '@/i18n';
import type { Category, Ingredient, MealType, Recipe, RecipeIngredient, ShoppingListItem } from '@/schemas';
import { formatQuantity, type UnitConversionResult } from './units';

// ── Formatting ───────────────────────────────────────────────────────────────

/** `units.<unit>` when the dictionary knows it, the raw unit otherwise (`fl oz`). */
export function unitLabel(lang: Locale, unit: string): string {
  const key = `units.${unit}`;
  const label = t(lang, key);
  return label === key ? unit : label;
}

/** `frying-pan` → `frying pan` (equipment ids have no dictionary yet). */
export function humanizeId(id: string): string {
  return id.replace(/[-_]+/g, ' ');
}

/** Minutes → `mm:ss` for the timer display. */
export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// ── Ingredient lookup (serialisable island prop) ─────────────────────────────

export type IngredientMeta = { name: string; category?: string };
/** `ingredientId → { name, category }` for one locale; unknown ids fall back to the id. */
export type IngredientMetaMap = Record<string, IngredientMeta>;

export function buildIngredientMeta(
  recipe: Recipe,
  ingredients: ReadonlyArray<Ingredient>,
  lang: Locale,
): IngredientMetaMap {
  const byId = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));
  const meta: IngredientMetaMap = {};
  for (const line of recipe.ingredients) {
    const ingredient = byId.get(line.ingredientId);
    meta[line.ingredientId] = ingredient
      ? { name: getTranslated(ingredient.name, lang), category: ingredient.category }
      : { name: line.ingredientId };
  }
  return meta;
}

/** Localised cuisine labels from `categories.cuisines`; unknown ids are humanised. */
export function cuisineLabels(recipe: Recipe, cuisines: ReadonlyArray<Category>, lang: Locale): string[] {
  const byId = new Map(cuisines.map((c) => [c.id, c]));
  return recipe.cuisine.map((id) => {
    const category = byId.get(id);
    return category ? getTranslated(category.name, lang) : humanizeId(id);
  });
}

/** Localised meal type label from `categories.mealTypes`; unknown ids are humanised. */
export function mealTypeLabel(recipe: Recipe, mealTypes: ReadonlyArray<Category>, lang: Locale): string {
  const category = mealTypes.find((c) => c.id === recipe.type);
  return category ? getTranslated(category.name, lang) : humanizeId(recipe.type);
}

// ── Scaling (island) ─────────────────────────────────────────────────────────

/** One ingredient line as the detail page renders it for the selected yield. */
export interface ScaledIngredientLine {
  ingredientId: string;
  name: string;
  /** `"1 ½ cup"`; empty when the recipe gives no quantity (to taste). */
  amount: string;
  preparation?: string;
  optional: boolean;
}

/** `(quantity, unit) → preferred-system quantity` (see `useUnitConversion().convert`). */
export type ConvertFn = (quantity: number, unit: string) => UnitConversionResult;

const identityConvert: ConvertFn = (quantity, unit) => ({ quantity, unit, formatted: formatQuantity(quantity) });

/**
 * Legacy `RecipeIngredients`: scale by `servings / recipe.servings` first,
 * then express in the user's unit system, then format (`formatQuantity`).
 */
export function scaledIngredientLines(
  recipe: Recipe,
  servings: number,
  meta: IngredientMetaMap,
  lang: Locale,
  convert: ConvertFn = identityConvert,
): ScaledIngredientLine[] {
  const factor = recipe.servings > 0 ? servings / recipe.servings : 1;
  return recipe.ingredients.map((line) => {
    const name = meta[line.ingredientId]?.name ?? line.ingredientId;
    let amount = '';
    if (line.quantity > 0) {
      const converted = convert(line.quantity * factor, line.unit);
      amount = `${converted.formatted} ${unitLabel(lang, converted.unit)}`;
    }
    return { ingredientId: line.ingredientId, name, amount, preparation: line.preparation, optional: line.optional };
  });
}

/**
 * Shopping lines for "Add ingredients to shopping list": the non-optional
 * ingredients at the selected yield, in the recipe's own units (the store
 * merges by `ingredientId`, unit-agnostic like the legacy context), tagged
 * with the recipe id in `usedIn` and the ingredient category.
 */
export function shoppingItemsFor(
  recipe: Recipe,
  servings: number,
  meta: IngredientMetaMap = {},
): Array<Omit<ShoppingListItem, 'checked'>> {
  const factor = recipe.servings > 0 ? servings / recipe.servings : 1;
  return recipe.ingredients
    .filter((line) => !line.optional)
    .map((line) => ({
      ingredientId: line.ingredientId,
      quantity: Math.round(line.quantity * factor * 100) / 100,
      unit: line.unit,
      usedIn: [recipe.id],
      ...(meta[line.ingredientId]?.category ? { category: meta[line.ingredientId]?.category } : {}),
    }));
}

/** The planner slot a recipe lands in by default: snacks and desserts go to `snacks`. */
export function defaultPlanSlot(type: MealType): 'breakfast' | 'lunch' | 'dinner' | 'snacks' {
  return type === 'breakfast' || type === 'lunch' || type === 'dinner' ? type : 'snacks';
}

// ── Related recipes ──────────────────────────────────────────────────────────

/**
 * Same cuisine (2 points per shared cuisine) or same meal type (1 point),
 * never the recipe itself; ties broken by rating, then id for determinism.
 */
export function relatedRecipes(recipe: Recipe, all: ReadonlyArray<Recipe>, limit = 3): Recipe[] {
  const cuisines = new Set(recipe.cuisine);
  return all
    .filter((candidate) => candidate.id !== recipe.id)
    .map((candidate) => ({
      candidate,
      score:
        candidate.cuisine.filter((c) => cuisines.has(c)).length * 2 + (candidate.type === recipe.type ? 1 : 0),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || b.candidate.rating - a.candidate.rating || a.candidate.id.localeCompare(b.candidate.id))
    .slice(0, limit)
    .map(({ candidate }) => candidate);
}

// ── JSON-LD ──────────────────────────────────────────────────────────────────

export interface RecipeJsonLdOptions {
  lang: Locale;
  /** Absolute canonical URL of the page. */
  url: string;
  ingredientMeta: IngredientMetaMap;
  /** Absolute image used when the recipe has no `imageUrl` (the site OG image). */
  fallbackImage: string;
  /** `author.name`; defaults to the recipe's author or the site name. */
  siteName: string;
}

/** ISO-8601 duration for schema.org (`PT25M`). */
export function isoMinutes(minutes: number): string {
  return `PT${Math.max(0, Math.round(minutes))}M`;
}

export function recipeIngredientText(line: RecipeIngredient, meta: IngredientMetaMap, lang: Locale): string {
  const name = meta[line.ingredientId]?.name ?? line.ingredientId;
  const quantity = line.quantity > 0 ? `${formatQuantity(line.quantity)} ${unitLabel(lang, line.unit)} ` : '';
  const preparation = line.preparation ? `, ${line.preparation}` : '';
  return `${quantity}${name}${preparation}`;
}

/**
 * schema.org `Recipe` for one locale. Keys the legacy generator emitted are
 * kept (name, image, author, datePublished, description, prep/cook/totalTime,
 * keywords, recipeYield, recipeCategory, recipeCuisine, nutrition,
 * recipeIngredient, recipeInstructions, aggregateRating) plus `url`,
 * `inLanguage` and `servingSize`; `aggregateRating` is omitted (not
 * `undefined`) when there are no reviews.
 */
export function recipeJsonLd(recipe: Recipe, options: RecipeJsonLdOptions): Record<string, unknown> {
  const { lang, url, ingredientMeta, fallbackImage, siteName } = options;
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org/',
    '@type': 'Recipe',
    name: getTranslated(recipe.name, lang),
    url,
    inLanguage: lang,
    image: [recipe.imageUrl ?? fallbackImage],
    author: recipe.author
      ? { '@type': 'Person', name: recipe.author }
      : { '@type': 'Organization', name: siteName },
    datePublished: recipe.dateAdded,
    description: getTranslated(recipe.description, lang),
    prepTime: isoMinutes(recipe.prepTime),
    cookTime: isoMinutes(recipe.cookTime),
    totalTime: isoMinutes(recipe.totalTime),
    keywords: recipe.tags.join(', '),
    recipeYield: `${recipe.servings} ${t(lang, 'common.servings')}`,
    recipeCategory: recipe.type,
    recipeCuisine: recipe.cuisine,
    nutrition: {
      '@type': 'NutritionInformation',
      servingSize: recipe.nutrition.servingSize,
      calories: `${recipe.nutrition.calories} calories`,
      proteinContent: `${recipe.nutrition.protein}g`,
      carbohydrateContent: `${recipe.nutrition.carbs}g`,
      fatContent: `${recipe.nutrition.fat}g`,
      fiberContent: `${recipe.nutrition.fiber}g`,
      sugarContent: `${recipe.nutrition.sugar}g`,
      sodiumContent: `${recipe.nutrition.sodium}mg`,
      cholesterolContent: `${recipe.nutrition.cholesterol}mg`,
    },
    recipeIngredient: recipe.ingredients.map((line) => recipeIngredientText(line, ingredientMeta, lang)),
    recipeInstructions: recipe.instructions.map((step) => ({
      '@type': 'HowToStep',
      position: step.step,
      text: getTranslated(step.text, lang),
      ...(step.image ? { image: step.image } : {}),
    })),
  };
  if (recipe.reviewCount > 0) {
    data.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: recipe.rating,
      reviewCount: recipe.reviewCount,
    };
  }
  if (recipe.videoUrl) data.video = { '@type': 'VideoObject', name: data.name, contentUrl: recipe.videoUrl };
  return data;
}

// ── Static paths ─────────────────────────────────────────────────────────────

export interface RecipeDetailCatalog {
  recipes: ReadonlyArray<Recipe>;
  ingredients: ReadonlyArray<Ingredient>;
  cuisines: ReadonlyArray<Category>;
  /** `categories.mealTypes`; optional so a missing taxonomy only humanises the id. */
  mealTypes?: ReadonlyArray<Category>;
}

/** Everything `components/pages/RecipeDetail.astro` needs, resolved for one locale. */
export type RecipeDetailProps = {
  recipe: Recipe;
  related: Recipe[];
  ingredientMeta: IngredientMetaMap;
  cuisineNames: string[];
  /** Localised meal type (`categories.mealTypes`), e.g. "Desayuno". */
  mealTypeName: string;
};

export type RecipeDetailPath = {
  params: { id: string };
  props: RecipeDetailProps;
};

/**
 * The `getStaticPaths()` result of one locale wrapper: one path per catalog
 * recipe (50 today → 150 pages across en/es/fr). Wrappers call this with
 * `getCollection(...).map((e) => e.data)`.
 */
export function buildRecipeDetailPaths(catalog: RecipeDetailCatalog, lang: Locale, relatedLimit = 3): RecipeDetailPath[] {
  return catalog.recipes.map((recipe) => ({
    params: { id: recipe.id },
    props: {
      recipe,
      related: relatedRecipes(recipe, catalog.recipes, relatedLimit),
      ingredientMeta: buildIngredientMeta(recipe, catalog.ingredients, lang),
      cuisineNames: cuisineLabels(recipe, catalog.cuisines, lang),
      mealTypeName: mealTypeLabel(recipe, catalog.mealTypes ?? [], lang),
    },
  }));
}

// ── Page metadata ────────────────────────────────────────────────────────────

export interface RecipeDetailMetaOptions {
  lang: Locale;
  /** Site origin, e.g. `https://artemiop.com`. */
  origin: string;
  /** `import.meta.env.BASE_URL`, e.g. `/foodie/`. */
  base: string;
  siteName: string;
  /** Absolute site OG image, used when the recipe has no image. */
  fallbackImage: string;
}

export interface RecipeDetailMeta {
  title: string;
  description: string;
  /** Absolute canonical URL of this locale's page. */
  url: string;
  alternates: AlternateLink[];
  /** Page-specific OG image, or `undefined` to keep the site default. */
  ogImage?: string;
  jsonLd: Record<string, unknown>[];
}

/** Absolute recipe image, or `undefined` when there is none / it is not an http(s) URL. */
export function absoluteRecipeImage(recipe: Recipe, origin: string, base: string): string | undefined {
  if (!recipe.imageUrl) return undefined;
  if (/^https?:\/\//.test(recipe.imageUrl)) return recipe.imageUrl;
  const prefix = `${origin.replace(/\/$/, '')}${base.replace(/\/$/, '')}`;
  return `${prefix}/${recipe.imageUrl.replace(/^\//, '')}`;
}

/**
 * `<BaseLayout>` props of one recipe page in one locale: localised
 * `title`/`description`, hreflang alternates (en/es/fr/x-default), the OG
 * image and the `Recipe` JSON-LD block.
 */
export function recipeDetailMeta(props: RecipeDetailProps, options: RecipeDetailMetaOptions): RecipeDetailMeta {
  const { recipe, ingredientMeta } = props;
  const { lang, origin, base, siteName, fallbackImage } = options;
  const pathname = `/recipes/${recipe.id}/`;
  const alternates = hreflangAlternates(pathname, origin, base);
  const url = alternates.find((alt) => alt.hreflang === lang)?.href ?? localizedRoute(pathname, lang);
  const ogImage = absoluteRecipeImage(recipe, origin, base);
  return {
    title: `${t(lang, 'recipe.metaTitle', { name: getTranslated(recipe.name, lang) })} — ${siteName}`,
    description: getTranslated(recipe.description, lang),
    url,
    alternates,
    ogImage,
    jsonLd: [
      recipeJsonLd(recipe, { lang, url, ingredientMeta, fallbackImage: ogImage ?? fallbackImage, siteName }),
    ],
  };
}
