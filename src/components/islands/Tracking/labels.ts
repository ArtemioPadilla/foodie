/**
 * Display helpers of the tracking island (roadmap Issue 031): entry names
 * resolved against the catalog, the "2 servings" / "250 ml" amount line and
 * localised numbers/dates. Pure; tested through the island.
 */
import { getTranslated, t, type Locale } from '@/i18n';
import { formatDate, parseDateKey } from '@/lib/format-date';
import { unitLabel } from '@/lib/domain/recipe-detail';
import type { Beverage, Ingredient, Recipe, TrackingEntry, TrackingMealType } from '@/schemas';

export interface TrackingCatalog {
  recipes: ReadonlyArray<Recipe>;
  ingredients: ReadonlyArray<Ingredient>;
  beverages: ReadonlyArray<Beverage>;
}

const BCP47: Record<Locale, string> = { en: 'en', es: 'es-419', fr: 'fr' };

/** `1234.5` → "1,234.5" / "1234,5" / "1 234,5" (max one decimal). */
export function formatAmount(value: number, lang: Locale): string {
  return new Intl.NumberFormat(BCP47[lang], { maximumFractionDigits: 1 }).format(value);
}

/** `2026-09-28` → "Monday, September 28, 2026" in the page locale. */
export function formatDayKey(key: string, lang: Locale, style: 'full' | 'long' = 'full'): string {
  return formatDate(parseDateKey(key), lang, { dateStyle: style });
}

export function mealLabel(lang: Locale, meal: TrackingMealType): string {
  return t(lang, `tracking.${meal}`);
}

/** Localised name of what an entry logged; generic label when the catalog no longer has it. */
export function entryDisplayName(entry: TrackingEntry, catalog: TrackingCatalog, lang: Locale): string {
  if (entry.recipeId) {
    const recipe = catalog.recipes.find((r) => r.id === entry.recipeId);
    return recipe ? getTranslated(recipe.name, lang) : t(lang, 'tracking.unknownRecipe');
  }
  if (entry.ingredientId) {
    const ingredient = catalog.ingredients.find((i) => i.id === entry.ingredientId);
    return ingredient ? getTranslated(ingredient.name, lang) : t(lang, 'tracking.unknownIngredient');
  }
  if (entry.beverageId) {
    const beverage = catalog.beverages.find((b) => b.id === entry.beverageId);
    return beverage ? getTranslated(beverage.name, lang) : t(lang, 'tracking.unknownBeverage');
  }
  return entry.customName ? getTranslated(entry.customName, lang) : t(lang, 'tracking.unknownItem');
}

/** "2 servings" for recipes, "250 ml" / "100 g" otherwise. */
export function entryAmount(entry: Pick<TrackingEntry, 'recipeId' | 'quantity' | 'unit' | 'servings'>, lang: Locale): string {
  if (entry.recipeId || entry.unit === 'servings') {
    const count = entry.servings ?? entry.quantity;
    // Plural chosen on the number, interpolated with the localised figure ("1,5 porciones").
    const template = t(lang, count === 1 ? 'tracking.servingsCount' : 'tracking.servingsCount_plural');
    return template.replace('{{count}}', formatAmount(count, lang));
  }
  return `${formatAmount(entry.quantity, lang)} ${unitLabel(lang, entry.unit)}`;
}
