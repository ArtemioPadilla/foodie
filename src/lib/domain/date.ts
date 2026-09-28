/**
 * Calendar helpers over `YYYY-MM-DD` keys (roadmap Issue 014, port of legacy
 * `utils/dateUtils.ts`). Only what `@/lib/format-date` does not already cover
 * lives here: `todayKey`/`nowTimeKey`/`parseDateKey`/`addDaysToKey` replace
 * `getToday`/`getCurrentTime`/`parseDate`/`getDaysAgo`-style arithmetic, and
 * `formatDate(Date, locale, opts)` is the generic formatter.
 *
 * All arithmetic is in the user's LOCAL calendar (the legacy
 * `toISOString().split('T')[0]` shifted dates after ~19:00 in the Americas).
 * No date-fns — `Intl.DateTimeFormat` + `Date` are enough.
 */
import type { Locale } from '@/i18n';
import { addDaysToKey, formatDate, parseDateKey, toDateKey, todayKey } from '@/lib/format-date';

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** `YYYY-MM-DD` → local-midnight `Date`; anything else (ISO datetime…) goes through `new Date()`. */
export function parseDate(value: string): Date {
  return DATE_KEY_RE.test(value) ? parseDateKey(value) : new Date(value);
}

/** Short human label — "Sat, Jan 25, 2025" / "sáb, 25 ene 2025". */
export function formatDateKey(key: string, locale: Locale = 'en'): string {
  return formatDate(parseDate(key), locale, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Full weekday name in `locale` ("Monday" / "lunes"). */
export function getDayName(key: string, locale: Locale = 'en'): string {
  return formatDate(parseDate(key), locale, { weekday: 'long' });
}

/** Abbreviated weekday name in `locale` ("Mon" / "lun"). */
export function getShortDayName(key: string, locale: Locale = 'en'): string {
  return formatDate(parseDate(key), locale, { weekday: 'short' });
}

export function isToday(key: string, now: Date = new Date()): boolean {
  return key === toDateKey(now);
}

export function isYesterday(key: string, now: Date = new Date()): boolean {
  return key === addDaysToKey(toDateKey(now), -1);
}

export function isTomorrow(key: string, now: Date = new Date()): boolean {
  return key === addDaysToKey(toDateKey(now), 1);
}

/** Monday of the week containing `key` (today when omitted). */
export function getStartOfWeek(key?: string, now: Date = new Date()): string {
  const d = key ? parseDate(key) : now;
  const weekday = d.getDay(); // 0 = Sunday
  const offsetToMonday = weekday === 0 ? -6 : 1 - weekday;
  return addDaysToKey(toDateKey(d), offsetToMonday);
}

/** `start` and the day six days later. */
export function getWeekRange(startKey: string): { start: string; end: string } {
  return { start: startKey, end: addDaysToKey(startKey, 6) };
}

/** First and last day of `month` (1–12) in `year`. */
export function getMonthRange(year: number, month: number): { start: string; end: string } {
  return {
    start: toDateKey(new Date(year, month - 1, 1)),
    end: toDateKey(new Date(year, month, 0)),
  };
}

/** Every key from `startKey` to `endKey` inclusive (empty when reversed). */
export function getDaysInRange(startKey: string, endKey: string): string[] {
  const keys: string[] = [];
  const end = parseDate(endKey);
  for (const d = parseDate(startKey); d <= end; d.setDate(d.getDate() + 1)) {
    keys.push(toDateKey(d));
  }
  return keys;
}

export function getDaysAgo(days: number, now: Date = new Date()): string {
  return addDaysToKey(toDateKey(now), -days);
}

export function getDaysFromNow(days: number, now: Date = new Date()): string {
  return addDaysToKey(toDateKey(now), days);
}

/** Whole days between two keys (absolute, so order does not matter). */
export function getDaysBetween(startKey: string, endKey: string): number {
  const ms = Math.abs(parseDate(endKey).getTime() - parseDate(startKey).getTime());
  return Math.round(ms / 86_400_000);
}

// Issue 015 may route these through `t(lang, 'date.today')`; kept inline so the
// domain layer has no dependency on the dictionaries yet.
const RELATIVE_LABELS: Record<Locale, { today: string; yesterday: string; tomorrow: string }> = {
  en: { today: 'Today', yesterday: 'Yesterday', tomorrow: 'Tomorrow' },
  es: { today: 'Hoy', yesterday: 'Ayer', tomorrow: 'Mañana' },
  fr: { today: "Aujourd'hui", yesterday: 'Hier', tomorrow: 'Demain' },
};

/** "Today" / "Yesterday" / "Tomorrow" in `locale`, otherwise `formatDateKey`. */
export function getRelativeDateString(
  key: string,
  locale: Locale = 'en',
  now: Date = new Date(),
): string {
  const labels = RELATIVE_LABELS[locale];
  if (isToday(key, now)) return labels.today;
  if (isYesterday(key, now)) return labels.yesterday;
  if (isTomorrow(key, now)) return labels.tomorrow;
  return formatDateKey(key, locale);
}

export { todayKey as getToday };
