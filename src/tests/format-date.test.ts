import { describe, it, expect } from 'vitest';
import { formatDate } from '../lib/format-date';

/**
 * Unit tests for the locale-aware date formatter (issue #186).
 *
 * We pin the test date to 2026-06-09 UTC. `Intl.DateTimeFormat` interprets a
 * bare `Date` in the local timezone, so we construct with a UTC timestamp to
 * keep results consistent across machines and CI.
 */
const DATE = new Date('2026-06-09T12:00:00Z'); // noon UTC — avoids day-boundary edge cases

describe('formatDate', () => {
  it('formats in English by default', () => {
    const result = formatDate(DATE, 'en');
    // en-US long dateStyle: "June 9, 2026"
    expect(result).toMatch(/June/);
    expect(result).toMatch(/2026/);
  });

  it('formats in Spanish with month name in Spanish', () => {
    const result = formatDate(DATE, 'es');
    // es-419 long dateStyle: "9 de junio de 2026"
    expect(result).toMatch(/junio/i);
    expect(result).toMatch(/2026/);
  });

  it('accepts custom Intl options', () => {
    const result = formatDate(DATE, 'en', { year: 'numeric', month: 'short' });
    expect(result).toMatch(/Jun/);
    expect(result).toMatch(/2026/);
  });

  it('returns a non-empty string for all supported locales', () => {
    const locales = ['en', 'es'] as const;
    for (const locale of locales) {
      expect(formatDate(DATE, locale).length).toBeGreaterThan(0);
    }
  });
});

// ── Date keys (roadmap Issue 013: replaces TrackingContext getToday/getCurrentTime) ──
import { addDaysToKey, nowTimeKey, parseDateKey, toDateKey, todayKey, toTimeKey } from '../lib/format-date';

describe('date keys', () => {
  const local = new Date(2025, 0, 31, 23, 5, 9); // Jan 31 2025 23:05:09 local time

  it('toDateKey uses the LOCAL calendar day, zero-padded', () => {
    expect(toDateKey(local)).toBe('2025-01-31');
    expect(toDateKey(new Date(2025, 2, 5))).toBe('2025-03-05');
  });

  it('todayKey / nowTimeKey default to now but accept an injected clock', () => {
    expect(todayKey(local)).toBe('2025-01-31');
    expect(nowTimeKey(local)).toBe('23:05:09');
    expect(todayKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(nowTimeKey()).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });

  it('toTimeKey is HH:mm:ss', () => {
    expect(toTimeKey(new Date(2025, 0, 1, 7, 3, 0))).toBe('07:03:00');
  });

  it('parseDateKey round-trips at local midnight', () => {
    const d = parseDateKey('2025-01-31');
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2025, 0, 31, 0]);
    expect(toDateKey(d)).toBe('2025-01-31');
  });

  it('addDaysToKey crosses month and year boundaries in both directions', () => {
    expect(addDaysToKey('2025-01-31', 1)).toBe('2025-02-01');
    expect(addDaysToKey('2025-01-01', -1)).toBe('2024-12-31');
    expect(addDaysToKey('2024-02-28', 1)).toBe('2024-02-29');
  });
});
