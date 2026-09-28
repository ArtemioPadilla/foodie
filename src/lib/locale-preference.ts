/**
 * The visitor's explicit language choice (`localStorage['foodie:locale']`,
 * ADR 0002). One writer for every UI that changes language — the header
 * `LangSwitcher` and the `/profile` preferences — so both persist the same
 * raw value that BaseLayout's first-visit redirect (an `is:inline` script
 * that cannot import this module) and `preferredLegacyLocale()` read.
 *
 * Stored as the bare code (`es`), not JSON: the inline redirect compares it
 * as-is. Writing it before navigating means the redirect never bounces the
 * visitor back to the language they just left.
 */
export const LOCALE_PREFERENCE_KEY = 'foodie:locale';

/**
 * Remember `locale` as the explicit choice. Returns whether it was stored
 * (`false` when storage is unavailable — private mode, blocked site data).
 */
export function rememberLocale(locale: string, storage: Pick<Storage, 'setItem'> | null = safeLocalStorage()): boolean {
  if (!storage || !locale) return false;
  try {
    storage.setItem(LOCALE_PREFERENCE_KEY, locale);
    return true;
  } catch {
    return false;
  }
}

function safeLocalStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}
