/**
 * Pure catalog selectors (roadmap Issue 013 ports the `BeverageContext`
 * logic; Issue 016 adds the recipe/ingredient selectors and `useCatalog`).
 * They take the catalog arrays explicitly so they work in islands (from
 * `useCatalog()`), in Astro pages (from `getCollection`) and in tests.
 */
import type { Beverage, Locale, MultiLangText } from '@/schemas';

/** Text in `lang`, falling back to English (Issue 015 moves this to `src/i18n`). */
export function pickLang(text: MultiLangText, lang: Locale): string {
  return text[lang] || text.en;
}

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
  return beverages.filter((b) => pickLang(b.name, lang).toLowerCase().includes(term));
}
