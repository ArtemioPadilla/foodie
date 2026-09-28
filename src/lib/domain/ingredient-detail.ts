/**
 * Ingredient detail page helpers (roadmap Issue 019). Pure: everything the
 * three `pages/{,es/,fr/}ingredients/[id].astro` wrappers compute at build
 * time — static paths (105 ingredients × 3 locales = 315 pages), the
 * "recipes with this ingredient" list, resolved composite components and
 * alternatives, and the `<BaseLayout>` metadata. No `astro:content` import,
 * so the same functions run in Vitest against `public/data/*.json`.
 */
import { getTranslated, hreflangAlternates, localizedRoute, t, type AlternateLink, type Locale } from '@/i18n';
import type { Category, Ingredient, Recipe } from '@/schemas';
import { categoryLabel } from './ingredient-browser';
import { unitLabel } from './recipe-detail';
import { formatQuantity } from './units';

// ── Formatting ───────────────────────────────────────────────────────────────

/** `$1.50` / `1,50 US$` / `1,50 $US` — locale-aware, deterministic at build. */
export function formatPrice(amount: number, currency: string, lang: Locale): string {
  try {
    return new Intl.NumberFormat(lang, { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/** "$1.50 / lb" with the localised unit. */
export function formatUnitPrice(ingredient: Ingredient, lang: Locale): string {
  return `${formatPrice(ingredient.avgPrice, ingredient.currency, lang)} / ${unitLabel(lang, ingredient.unit)}`;
}

// ── Relations ────────────────────────────────────────────────────────────────

/**
 * Recipes that use the ingredient (optional lines included, as legacy),
 * best rated first, ties by id for determinism.
 */
export function recipesUsingIngredient(ingredientId: string, recipes: ReadonlyArray<Recipe>): Recipe[] {
  return recipes
    .filter((recipe) => recipe.ingredients.some((line) => line.ingredientId === ingredientId))
    .sort((a, b) => b.rating - a.rating || a.id.localeCompare(b.id));
}

/** One line of a composite ingredient, resolved for one locale. */
export interface ResolvedComponent {
  ingredientId: string;
  name: string;
  /** `"2 cup"`, localised unit. */
  amount: string;
  notes?: string;
  /** False when the id is not in the catalog (then it is shown, not linked). */
  known: boolean;
}

export function resolveComponents(
  ingredient: Ingredient,
  byId: ReadonlyMap<string, Ingredient>,
  lang: Locale,
): ResolvedComponent[] {
  return (ingredient.components ?? []).map((component) => {
    const target = byId.get(component.ingredientId);
    return {
      ingredientId: component.ingredientId,
      name: target ? getTranslated(target.name, lang) : component.ingredientId,
      amount: `${formatQuantity(component.quantity)} ${unitLabel(lang, component.unit)}`,
      ...(component.notes ? { notes: getTranslated(component.notes, lang) } : {}),
      known: Boolean(target),
    };
  });
}

/** An alternative: linked (with its localised name) when it resolves to a catalog ingredient. */
export interface ResolvedAlternative {
  label: string;
  id?: string;
}

/**
 * `alternatives` in the catalog are free English text (`"tofu"`, `"kale"`)
 * or ids. Resolve by id, then by case-insensitive English name; anything else
 * is shown verbatim (the catalog has no translation for it).
 */
export function resolveAlternatives(
  ingredient: Ingredient,
  byId: ReadonlyMap<string, Ingredient>,
  byEnglishName: ReadonlyMap<string, Ingredient>,
  lang: Locale,
): ResolvedAlternative[] {
  return ingredient.alternatives.map((alternative) => {
    const target = byId.get(alternative) ?? byEnglishName.get(alternative.trim().toLowerCase());
    return target && target.id !== ingredient.id
      ? { label: getTranslated(target.name, lang), id: target.id }
      : { label: alternative };
  });
}

// ── Static paths ─────────────────────────────────────────────────────────────

export interface IngredientDetailCatalog {
  ingredients: ReadonlyArray<Ingredient>;
  recipes: ReadonlyArray<Recipe>;
  /** `categories.ingredientCategories`. */
  ingredientCategories: ReadonlyArray<Category>;
}

/** Everything `components/pages/IngredientDetail.astro` needs, resolved for one locale. */
export type IngredientDetailProps = {
  ingredient: Ingredient;
  categoryName: string;
  components: ResolvedComponent[];
  alternatives: ResolvedAlternative[];
  /** "Recipes with this ingredient", computed at build. */
  recipes: Recipe[];
  /**
   * Set when an earlier catalog ingredient has the same localised name (the
   * catalog carries a few legacy duplicates, e.g. ing_024 / ing_095 "Chia
   * Seeds"): the page title appends it so every `<title>` stays unique
   * (roadmap Issue 022).
   */
  titleQualifier?: string;
};

export type IngredientDetailPath = {
  params: { id: string };
  props: IngredientDetailProps;
};

/** The `getStaticPaths()` result of one locale wrapper: one path per catalog ingredient. */
export function buildIngredientDetailPaths(catalog: IngredientDetailCatalog, lang: Locale): IngredientDetailPath[] {
  const byId = new Map(catalog.ingredients.map((ingredient) => [ingredient.id, ingredient]));
  const byEnglishName = new Map(catalog.ingredients.map((ingredient) => [ingredient.name.en.toLowerCase(), ingredient]));
  const seenNames = new Set<string>();
  return catalog.ingredients.map((ingredient) => {
    const localName = getTranslated(ingredient.name, lang).toLowerCase();
    const titleQualifier = seenNames.has(localName) ? ingredient.id : undefined;
    seenNames.add(localName);
    return {
      params: { id: ingredient.id },
      props: {
        ingredient,
        categoryName: categoryLabel(ingredient.category, catalog.ingredientCategories, lang),
        components: resolveComponents(ingredient, byId, lang),
        alternatives: resolveAlternatives(ingredient, byId, byEnglishName, lang),
        recipes: recipesUsingIngredient(ingredient.id, catalog.recipes),
        ...(titleQualifier ? { titleQualifier } : {}),
      },
    };
  });
}

// ── Page metadata ────────────────────────────────────────────────────────────

export interface IngredientDetailMetaOptions {
  lang: Locale;
  origin: string;
  base: string;
  siteName: string;
}

export interface IngredientDetailMeta {
  title: string;
  description: string;
  url: string;
  alternates: AlternateLink[];
}

/** Localised title/description + hreflang alternates of one ingredient page. */
export function ingredientDetailMeta(props: IngredientDetailProps, options: IngredientDetailMetaOptions): IngredientDetailMeta {
  const { ingredient, categoryName, recipes, titleQualifier } = props;
  const { lang, origin, base, siteName } = options;
  const name = getTranslated(ingredient.name, lang);
  const titleName = titleQualifier ? `${name} (${titleQualifier})` : name;
  const pathname = `/ingredients/${ingredient.id}/`;
  const alternates = hreflangAlternates(pathname, origin, base);
  const url = alternates.find((alt) => alt.hreflang === lang)?.href ?? localizedRoute(pathname, lang);
  const description = ingredient.description
    ? getTranslated(ingredient.description, lang)
    : t(lang, 'ingredient.metaDescription', { name, category: categoryName, count: recipes.length });
  return { title: `${t(lang, 'ingredient.metaTitle', { name: titleName })} — ${siteName}`, description, url, alternates };
}
