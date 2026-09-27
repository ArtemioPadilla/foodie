/**
 * Pure catalog selectors (roadmap Issue 013 ports the `BeverageContext`
 * logic; Issue 016 adds the recipe/ingredient selectors and `useCatalog`).
 * They take the catalog arrays explicitly so they work in islands (from
 * `useCatalog()`), in Astro pages (from `getCollection`) and in tests.
 */
import { getTranslated } from '@/i18n';
import type { Beverage, Locale } from '@/schemas';

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
