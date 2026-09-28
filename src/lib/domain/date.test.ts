import { describe, expect, it } from 'vitest';
import { nowTimeKey, toDateKey, todayKey } from '@/lib/format-date';
import {
  formatDateKey,
  getDayName,
  getDaysAgo,
  getDaysBetween,
  getDaysFromNow,
  getDaysInRange,
  getMonthRange,
  getRelativeDateString,
  getShortDayName,
  getStartOfWeek,
  getToday,
  getWeekRange,
  isToday,
  isTomorrow,
  isYesterday,
  parseDate,
} from './date';

// Legacy compared against `toISOString().split('T')[0]` (UTC); the port is in
// the LOCAL calendar (see format-date.ts), so expectations use `toDateKey`.
const localKey = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return toDateKey(d);
};

describe('getToday (todayKey)', () => {
  it('returns date in ISO format (YYYY-MM-DD)', () => {
    expect(todayKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns current date', () => {
    expect(getToday()).toBe(localKey());
  });
});

describe('getCurrentTime (nowTimeKey)', () => {
  it('returns time in ISO format (HH:MM:SS)', () => {
    expect(nowTimeKey()).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });
});

describe('formatDateKey', () => {
  it('formats date in English by default', () => {
    const formatted = formatDateKey('2025-01-25');
    expect(formatted).toContain('Jan');
    expect(formatted).toContain('25');
    expect(formatted).toContain('2025');
  });

  it('formats date in Spanish when locale is "es"', () => {
    const formatted = formatDateKey('2025-01-25', 'es');
    expect(formatted).toContain('ene');
    expect(formatted).toContain('2025');
  });

  it('includes weekday in format', () => {
    expect(formatDateKey('2025-01-27')).toContain('Mon');
  });
});

describe('getDayName', () => {
  it('returns full day name in English', () => {
    expect(getDayName('2025-01-27')).toBe('Monday');
  });

  it('returns localized day name', () => {
    expect(getDayName('2025-01-27', 'es')).toBe('lunes');
  });
});

describe('getShortDayName', () => {
  it('returns abbreviated day name', () => {
    expect(getShortDayName('2025-01-27')).toBe('Mon');
  });

  it('returns localized short day name', () => {
    expect(getShortDayName('2025-01-27', 'fr')).toMatch(/^lun/);
  });
});

describe('isToday', () => {
  it("returns true for today's date", () => {
    expect(isToday(getToday())).toBe(true);
  });

  it('returns false for yesterday', () => {
    expect(isToday(getDaysAgo(1))).toBe(false);
  });

  it('returns false for tomorrow', () => {
    expect(isToday(getDaysFromNow(1))).toBe(false);
  });
});

describe('isYesterday', () => {
  it("returns true for yesterday's date", () => {
    expect(isYesterday(getDaysAgo(1))).toBe(true);
  });

  it('returns false for today', () => {
    expect(isYesterday(getToday())).toBe(false);
  });

  it('returns false for two days ago', () => {
    expect(isYesterday(getDaysAgo(2))).toBe(false);
  });
});

describe('isTomorrow', () => {
  it("returns true for tomorrow's date", () => {
    expect(isTomorrow(getDaysFromNow(1))).toBe(true);
  });

  it('returns false for today', () => {
    expect(isTomorrow(getToday())).toBe(false);
  });

  it('returns false for two days from now', () => {
    expect(isTomorrow(getDaysFromNow(2))).toBe(false);
  });
});

describe('getStartOfWeek', () => {
  it('returns a date in the same week', () => {
    expect(getDaysBetween(getStartOfWeek('2025-01-27'), '2025-01-27')).toBeLessThanOrEqual(6);
  });

  it('returns start of current week when no date provided', () => {
    expect(getStartOfWeek()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('result is always before or equal to input date', () => {
    const start = parseDate(getStartOfWeek('2025-01-31'));
    expect(start.getTime()).toBeLessThanOrEqual(parseDate('2025-01-31').getTime());
  });

  it('is Monday-based (Sunday belongs to the week that started six days earlier)', () => {
    expect(getStartOfWeek('2025-01-27')).toBe('2025-01-27'); // Monday
    expect(getStartOfWeek('2025-01-31')).toBe('2025-01-27'); // Friday
    expect(getStartOfWeek('2025-02-02')).toBe('2025-01-27'); // Sunday
  });
});

describe('getWeekRange', () => {
  it('returns 7-day range starting from given date', () => {
    expect(getWeekRange('2025-01-27')).toEqual({ start: '2025-01-27', end: '2025-02-02' });
  });

  it('handles month boundaries', () => {
    expect(getWeekRange('2025-01-29')).toEqual({ start: '2025-01-29', end: '2025-02-04' });
  });
});

describe('getMonthRange', () => {
  it('returns first and last day of month', () => {
    expect(getMonthRange(2025, 1)).toEqual({ start: '2025-01-01', end: '2025-01-31' });
  });

  it('handles February in non-leap year', () => {
    expect(getMonthRange(2025, 2)).toEqual({ start: '2025-02-01', end: '2025-02-28' });
  });

  it('handles February in leap year', () => {
    expect(getMonthRange(2024, 2)).toEqual({ start: '2024-02-01', end: '2024-02-29' });
  });

  it('handles short months', () => {
    expect(getMonthRange(2025, 4)).toEqual({ start: '2025-04-01', end: '2025-04-30' });
  });
});

describe('getDaysInRange', () => {
  it('returns array of dates between start and end', () => {
    expect(getDaysInRange('2025-01-25', '2025-01-28')).toEqual([
      '2025-01-25',
      '2025-01-26',
      '2025-01-27',
      '2025-01-28',
    ]);
  });

  it('includes both start and end dates', () => {
    const dates = getDaysInRange('2025-01-25', '2025-01-27');
    expect(dates).toHaveLength(3);
    expect(dates[0]).toBe('2025-01-25');
    expect(dates.at(-1)).toBe('2025-01-27');
  });

  it('returns single date when start equals end', () => {
    expect(getDaysInRange('2025-01-25', '2025-01-25')).toEqual(['2025-01-25']);
  });

  it('handles ranges crossing month boundaries', () => {
    expect(getDaysInRange('2025-01-30', '2025-02-02')).toEqual([
      '2025-01-30',
      '2025-01-31',
      '2025-02-01',
      '2025-02-02',
    ]);
  });
});

describe('getDaysAgo', () => {
  it('returns date from N days ago', () => {
    expect(getDaysAgo(7)).toBe(localKey(-7));
  });

  it('returns yesterday for 1 day ago', () => {
    expect(isYesterday(getDaysAgo(1))).toBe(true);
  });

  it('handles 0 days ago (today)', () => {
    expect(isToday(getDaysAgo(0))).toBe(true);
  });
});

describe('getDaysFromNow', () => {
  it('returns date N days from now', () => {
    expect(getDaysFromNow(7)).toBe(localKey(7));
  });

  it('returns tomorrow for 1 day from now', () => {
    expect(isTomorrow(getDaysFromNow(1))).toBe(true);
  });

  it('handles 0 days from now (today)', () => {
    expect(isToday(getDaysFromNow(0))).toBe(true);
  });
});

describe('getRelativeDateString', () => {
  it('returns "Today" for today\'s date', () => {
    expect(getRelativeDateString(getToday())).toBe('Today');
  });

  it('returns "Yesterday" for yesterday', () => {
    expect(getRelativeDateString(getDaysAgo(1))).toBe('Yesterday');
  });

  it('returns "Tomorrow" for tomorrow', () => {
    expect(getRelativeDateString(getDaysFromNow(1))).toBe('Tomorrow');
  });

  it('returns "Hoy" in Spanish for today', () => {
    expect(getRelativeDateString(getToday(), 'es')).toBe('Hoy');
  });

  it('returns "Ayer" in Spanish for yesterday', () => {
    expect(getRelativeDateString(getDaysAgo(1), 'es')).toBe('Ayer');
  });

  it('returns "Aujourd\'hui" in French for today', () => {
    expect(getRelativeDateString(getToday(), 'fr')).toBe("Aujourd'hui");
  });

  it('returns formatted date for other dates', () => {
    const result = getRelativeDateString('2025-01-25');
    expect(result).not.toBe('Today');
    expect(result).not.toBe('Yesterday');
    expect(result).not.toBe('Tomorrow');
    expect(result).toContain('Jan');
  });

  it('accepts an injected "now" for deterministic tests', () => {
    const now = new Date(2025, 0, 25, 23, 30);
    expect(getRelativeDateString('2025-01-25', 'en', now)).toBe('Today');
    expect(getRelativeDateString('2025-01-24', 'fr', now)).toBe('Hier');
    expect(getRelativeDateString('2025-01-26', 'es', now)).toBe('Mañana');
  });
});

describe('parseDate', () => {
  it('parses ISO date string to a local-midnight Date (no UTC off-by-one)', () => {
    const date = parseDate('2025-01-25');
    expect(date).toBeInstanceOf(Date);
    expect(date.getFullYear()).toBe(2025);
    expect(date.getMonth()).toBe(0);
    expect(date.getDate()).toBe(25);
  });

  it('handles ISO datetime strings', () => {
    const date = parseDate('2025-01-25T12:30:00.000Z');
    expect(date).toBeInstanceOf(Date);
    expect(date.getFullYear()).toBe(2025);
  });

  it('returns valid Date object', () => {
    expect(parseDate('2025-06-15').toString()).not.toBe('Invalid Date');
  });
});

describe('getDaysBetween', () => {
  it('calculates days between two dates', () => {
    expect(getDaysBetween('2025-01-25', '2025-01-28')).toBe(3);
  });

  it('returns 0 for same date', () => {
    expect(getDaysBetween('2025-01-25', '2025-01-25')).toBe(0);
  });

  it('handles reversed date order', () => {
    expect(getDaysBetween('2025-01-28', '2025-01-25')).toBe(3);
  });

  it('handles dates across months', () => {
    expect(getDaysBetween('2025-01-28', '2025-02-05')).toBe(8);
  });

  it('handles dates across years', () => {
    expect(getDaysBetween('2024-12-25', '2025-01-10')).toBe(16);
  });
});

describe('edge cases', () => {
  it('handles leap year correctly in getMonthRange', () => {
    expect(getMonthRange(2024, 2).end).toBe('2024-02-29');
    expect(getMonthRange(2025, 2).end).toBe('2025-02-28');
  });

  it('handles year boundaries in getDaysInRange', () => {
    expect(getDaysInRange('2024-12-30', '2025-01-02')).toEqual([
      '2024-12-30',
      '2024-12-31',
      '2025-01-01',
      '2025-01-02',
    ]);
  });

  it('handles same start and end in getWeekRange', () => {
    const range = getWeekRange('2025-01-27');
    expect(getDaysBetween(range.start, range.end)).toBe(6);
  });
});
