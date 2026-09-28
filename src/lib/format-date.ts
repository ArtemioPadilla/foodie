/**
 * Locale-aware date formatter.
 *
 * Wraps `Intl.DateTimeFormat` so every date rendered on the site uses the same
 * options. Pass the page locale (from `detectLocale(pathname)` or the `lang`
 * prop) to get language-appropriate formatting automatically — e.g. "June 9,
 * 2026" in English vs "9 de junio de 2026" in Spanish.
 *
 * ## Usage in Astro pages
 * ```ts
 * import { formatDate } from '@/lib/format-date';
 * const label = formatDate(new Date(post.date), 'es');
 * ```
 *
 * ## Why not dayjs / date-fns?
 * `Intl.DateTimeFormat` is built into every modern runtime, ships zero bytes to
 * the browser, and covers all Foodie-supported locales without locale data
 * bundles. We only need human-readable labels, not arithmetic.
 */

import type { Locale } from '@/i18n';

/**
 * Format a `Date` as a human-readable string in the given locale.
 *
 * @param date   - The date to format.
 * @param locale - A `Locale` value ('en' | 'es' | 'fr'). Defaults to 'en'.
 * @param opts   - Override `Intl.DateTimeFormatOptions`; defaults to
 *                 `{ dateStyle: 'long' }` which produces e.g. "June 9, 2026".
 *
 * @example
 * formatDate(new Date('2026-06-09'), 'en') // "June 9, 2026"
 * formatDate(new Date('2026-06-09'), 'es') // "9 de junio de 2026"
 */
export function formatDate(
  date: Date,
  locale: Locale = 'en',
  opts: Intl.DateTimeFormatOptions = { dateStyle: 'long' },
): string {
  // Use a BCP 47 tag: 'es' → 'es-419' (Latin American) gives the most widely
  // understood Spanish form. 'en' and 'fr' stay as-is (en-US / fr-FR defaults).
  const bcp47 = locale === 'es' ? 'es-419' : locale;
  return new Intl.DateTimeFormat(bcp47, opts).format(date);
}

// ── Date keys (Foodie tracking / planner) ────────────────────────────────────
//
// Persisted records (`TrackingEntry.date`, planner dates) use a plain
// `YYYY-MM-DD` key in the user's LOCAL calendar day, so an entry logged at
// 23:30 belongs to today, not to tomorrow-in-UTC (the legacy
// `toISOString().split('T')[0]` had that off-by-one). Roadmap Issue 013 —
// replaces `getToday()` / `getCurrentTime()` from `TrackingContext`.

/** `YYYY-MM-DD` in the local time zone. */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Today's `YYYY-MM-DD` (local). */
export function todayKey(now: Date = new Date()): string {
  return toDateKey(now);
}

/** Parse a `YYYY-MM-DD` key into a local-midnight `Date`. */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

/** `HH:mm:ss` in the local time zone (legacy `getCurrentTime()` format). */
export function toTimeKey(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

/** Current local time as `HH:mm:ss`. */
export function nowTimeKey(now: Date = new Date()): string {
  return toTimeKey(now);
}

/** Add `days` (may be negative) to a `YYYY-MM-DD` key. */
export function addDaysToKey(key: string, days: number): string {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}
