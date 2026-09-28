/**
 * Display labels of the pantry island (roadmap Issue 027): location words,
 * the "expires in N days" line and localised dates. Pure; tested through the
 * island.
 */
import { t, type Locale } from '@/i18n';
import { formatDate, parseDateKey } from '@/lib/format-date';
import { daysUntilExpiration } from '@/lib/domain/pantry';
import type { PantryLocation } from '@/schemas';

/** Stored (capitalised, legacy) location → dictionary key. Same map as `IngredientActions`. */
export const LOCATION_LABEL_KEYS: Record<PantryLocation, string> = {
  Pantry: 'pantry.pantryLocation',
  Fridge: 'pantry.fridge',
  Freezer: 'pantry.freezer',
  Cabinet: 'pantry.cabinet',
  Counter: 'pantry.counter',
};

/** Localised location; a free-text legacy location is shown as typed. */
export function locationLabel(lang: Locale, location: string): string {
  const key = LOCATION_LABEL_KEYS[location as PantryLocation];
  return key ? t(lang, key) : location;
}

/** `2026-10-01` → "October 1, 2026" / "1 de octubre de 2026" / "1 octobre 2026". */
export function formatExpiration(lang: Locale, expirationDate: string): string {
  const key = /^\d{4}-\d{2}-\d{2}/.exec(expirationDate)?.[0];
  return formatDate(key ? parseDateKey(key) : new Date(expirationDate), lang);
}

/** "Expires today" · "Expires tomorrow" · "Expires in 5 days" · "Expired on …" · "No expiration date". */
export function expirationText(lang: Locale, expirationDate: string | undefined, now: Date = new Date()): string {
  const days = daysUntilExpiration(expirationDate, now);
  if (days === null || !expirationDate) return t(lang, 'pantry.noExpiry');
  if (days < 0) return t(lang, 'pantry.expiredOnDate', { date: formatExpiration(lang, expirationDate) });
  if (days === 0) return t(lang, 'pantry.expiresToday');
  if (days === 1) return t(lang, 'pantry.expiresTomorrow');
  return t(lang, 'pantry.expiresInDays', { count: days });
}
