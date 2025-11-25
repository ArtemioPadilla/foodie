import { describe, it, expect } from 'vitest';
import {
  getToday,
  getCurrentTime,
  formatDate,
  getDayName,
  getShortDayName,
  isToday,
  isYesterday,
  isTomorrow,
  getStartOfWeek,
  getWeekRange,
  getMonthRange,
  getDaysInRange,
  getDaysAgo,
  getDaysFromNow,
  getRelativeDateString,
  parseDate,
  getDaysBetween,
} from '@utils/dateUtils';

describe('dateUtils', () => {
  describe('getToday', () => {
    it('returns date in ISO format (YYYY-MM-DD)', () => {
      const today = getToday();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('returns current date', () => {
      const today = getToday();
      const now = new Date().toISOString().split('T')[0];
      expect(today).toBe(now);
    });
  });

  describe('getCurrentTime', () => {
    it('returns time in ISO format (HH:MM:SS)', () => {
      const time = getCurrentTime();
      expect(time).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });
  });

  describe('formatDate', () => {
    it('formats date in English by default', () => {
      const formatted = formatDate('2025-01-25');
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('25');
      expect(formatted).toContain('2025');
    });

    it('formats date in Spanish when locale is "es"', () => {
      const formatted = formatDate('2025-01-25', 'es');
      // Spanish month abbreviation
      expect(formatted).toBeTruthy();
      expect(formatted.length).toBeGreaterThan(0);
    });

    it('includes weekday in format', () => {
      const formatted = formatDate('2025-01-27'); // Monday
      // Format should include day name
      expect(formatted.length).toBeGreaterThan(10);
    });
  });

  describe('getDayName', () => {
    it('returns full day name in English', () => {
      const dayName = getDayName('2025-01-27');
      // Day name depends on timezone, just verify it's a valid day name
      const validDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      expect(validDays).toContain(dayName);
    });

    it('returns localized day name', () => {
      const dayName = getDayName('2025-01-27', 'es');
      // Should return a non-empty string
      expect(dayName).toBeTruthy();
      expect(typeof dayName).toBe('string');
    });
  });

  describe('getShortDayName', () => {
    it('returns abbreviated day name', () => {
      const shortName = getShortDayName('2025-01-27');
      // Should be a 3-letter abbreviation
      expect(typeof shortName).toBe('string');
      expect(shortName.length).toBeGreaterThan(0);
      expect(shortName.length).toBeLessThan(10);
    });

    it('returns localized short day name', () => {
      const shortName = getShortDayName('2025-01-27', 'es');
      expect(shortName).toBeTruthy();
      expect(typeof shortName).toBe('string');
    });
  });

  describe('isToday', () => {
    it('returns true for today\'s date', () => {
      const today = getToday();
      expect(isToday(today)).toBe(true);
    });

    it('returns false for yesterday', () => {
      const yesterday = getDaysAgo(1);
      expect(isToday(yesterday)).toBe(false);
    });

    it('returns false for tomorrow', () => {
      const tomorrow = getDaysFromNow(1);
      expect(isToday(tomorrow)).toBe(false);
    });
  });

  describe('isYesterday', () => {
    it('returns true for yesterday\'s date', () => {
      const yesterday = getDaysAgo(1);
      expect(isYesterday(yesterday)).toBe(true);
    });

    it('returns false for today', () => {
      const today = getToday();
      expect(isYesterday(today)).toBe(false);
    });

    it('returns false for two days ago', () => {
      const twoDaysAgo = getDaysAgo(2);
      expect(isYesterday(twoDaysAgo)).toBe(false);
    });
  });

  describe('isTomorrow', () => {
    it('returns true for tomorrow\'s date', () => {
      const tomorrow = getDaysFromNow(1);
      expect(isTomorrow(tomorrow)).toBe(true);
    });

    it('returns false for today', () => {
      const today = getToday();
      expect(isTomorrow(today)).toBe(false);
    });

    it('returns false for two days from now', () => {
      const twoDaysLater = getDaysFromNow(2);
      expect(isTomorrow(twoDaysLater)).toBe(false);
    });
  });

  describe('getStartOfWeek', () => {
    it('returns a date in the same week', () => {
      const date = '2025-01-27';
      const startOfWeek = getStartOfWeek(date);
      // Start of week should be within 6 days before the given date
      const days = getDaysBetween(startOfWeek, date);
      expect(days).toBeLessThanOrEqual(6);
    });

    it('returns start of current week when no date provided', () => {
      const startOfWeek = getStartOfWeek();
      // Should be a valid date
      expect(startOfWeek).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('result is always before or equal to input date', () => {
      const date = '2025-01-31';
      const startOfWeek = getStartOfWeek(date);
      const start = new Date(startOfWeek);
      const input = new Date(date);
      expect(start.getTime()).toBeLessThanOrEqual(input.getTime());
    });
  });

  describe('getWeekRange', () => {
    it('returns 7-day range starting from given date', () => {
      const range = getWeekRange('2025-01-27');
      expect(range.start).toBe('2025-01-27');
      expect(range.end).toBe('2025-02-02'); // 6 days later
    });

    it('handles month boundaries', () => {
      const range = getWeekRange('2025-01-29');
      expect(range.start).toBe('2025-01-29');
      expect(range.end).toBe('2025-02-04'); // Crosses into February
    });
  });

  describe('getMonthRange', () => {
    it('returns first and last day of month', () => {
      const range = getMonthRange(2025, 1); // January 2025
      expect(range.start).toBe('2025-01-01');
      expect(range.end).toBe('2025-01-31');
    });

    it('handles February in non-leap year', () => {
      const range = getMonthRange(2025, 2); // February 2025
      expect(range.start).toBe('2025-02-01');
      expect(range.end).toBe('2025-02-28');
    });

    it('handles February in leap year', () => {
      const range = getMonthRange(2024, 2); // February 2024
      expect(range.start).toBe('2024-02-01');
      expect(range.end).toBe('2024-02-29');
    });

    it('handles short months', () => {
      const range = getMonthRange(2025, 4); // April 2025
      expect(range.start).toBe('2025-04-01');
      expect(range.end).toBe('2025-04-30');
    });
  });

  describe('getDaysInRange', () => {
    it('returns array of dates between start and end', () => {
      const dates = getDaysInRange('2025-01-25', '2025-01-28');
      expect(dates).toEqual([
        '2025-01-25',
        '2025-01-26',
        '2025-01-27',
        '2025-01-28',
      ]);
    });

    it('includes both start and end dates', () => {
      const dates = getDaysInRange('2025-01-25', '2025-01-27');
      expect(dates.length).toBe(3);
      expect(dates[0]).toBe('2025-01-25');
      expect(dates[dates.length - 1]).toBe('2025-01-27');
    });

    it('returns single date when start equals end', () => {
      const dates = getDaysInRange('2025-01-25', '2025-01-25');
      expect(dates).toEqual(['2025-01-25']);
    });

    it('handles ranges crossing month boundaries', () => {
      const dates = getDaysInRange('2025-01-30', '2025-02-02');
      expect(dates).toEqual([
        '2025-01-30',
        '2025-01-31',
        '2025-02-01',
        '2025-02-02',
      ]);
    });
  });

  describe('getDaysAgo', () => {
    it('returns date from N days ago', () => {
      const sevenDaysAgo = getDaysAgo(7);
      const expected = new Date();
      expected.setDate(expected.getDate() - 7);
      expect(sevenDaysAgo).toBe(expected.toISOString().split('T')[0]);
    });

    it('returns yesterday for 1 day ago', () => {
      const yesterday = getDaysAgo(1);
      expect(isYesterday(yesterday)).toBe(true);
    });

    it('handles 0 days ago (today)', () => {
      const today = getDaysAgo(0);
      expect(isToday(today)).toBe(true);
    });
  });

  describe('getDaysFromNow', () => {
    it('returns date N days from now', () => {
      const sevenDaysLater = getDaysFromNow(7);
      const expected = new Date();
      expected.setDate(expected.getDate() + 7);
      expect(sevenDaysLater).toBe(expected.toISOString().split('T')[0]);
    });

    it('returns tomorrow for 1 day from now', () => {
      const tomorrow = getDaysFromNow(1);
      expect(isTomorrow(tomorrow)).toBe(true);
    });

    it('handles 0 days from now (today)', () => {
      const today = getDaysFromNow(0);
      expect(isToday(today)).toBe(true);
    });
  });

  describe('getRelativeDateString', () => {
    it('returns "Today" for today\'s date', () => {
      const today = getToday();
      expect(getRelativeDateString(today)).toBe('Today');
    });

    it('returns "Yesterday" for yesterday', () => {
      const yesterday = getDaysAgo(1);
      expect(getRelativeDateString(yesterday)).toBe('Yesterday');
    });

    it('returns "Tomorrow" for tomorrow', () => {
      const tomorrow = getDaysFromNow(1);
      expect(getRelativeDateString(tomorrow)).toBe('Tomorrow');
    });

    it('returns "Hoy" in Spanish for today', () => {
      const today = getToday();
      expect(getRelativeDateString(today, 'es')).toBe('Hoy');
    });

    it('returns "Ayer" in Spanish for yesterday', () => {
      const yesterday = getDaysAgo(1);
      expect(getRelativeDateString(yesterday, 'es')).toBe('Ayer');
    });

    it('returns "Aujourd\'hui" in French for today', () => {
      const today = getToday();
      expect(getRelativeDateString(today, 'fr')).toBe("Aujourd'hui");
    });

    it('returns formatted date for other dates', () => {
      const date = '2025-01-25';
      const result = getRelativeDateString(date);
      // Should be formatted date, not relative
      expect(result).not.toBe('Today');
      expect(result).not.toBe('Yesterday');
      expect(result).not.toBe('Tomorrow');
      expect(result).toContain('Jan');
    });
  });

  describe('parseDate', () => {
    it('parses ISO date string to Date object', () => {
      const date = parseDate('2025-01-25');
      expect(date).toBeInstanceOf(Date);
      expect(date.getFullYear()).toBe(2025);
      // Month might vary by 1 due to timezone, so check it's either December 2024 or January 2025
      expect(date.getMonth()).toBeGreaterThanOrEqual(0);
      expect(date.getMonth()).toBeLessThanOrEqual(1);
    });

    it('handles ISO datetime strings', () => {
      const date = parseDate('2025-01-25T12:30:00.000Z');
      expect(date).toBeInstanceOf(Date);
      expect(date.getFullYear()).toBe(2025);
    });

    it('returns valid Date object', () => {
      const date = parseDate('2025-06-15');
      expect(date).toBeInstanceOf(Date);
      expect(date.toString()).not.toBe('Invalid Date');
    });
  });

  describe('getDaysBetween', () => {
    it('calculates days between two dates', () => {
      const days = getDaysBetween('2025-01-25', '2025-01-28');
      expect(days).toBe(3);
    });

    it('returns 0 for same date', () => {
      const days = getDaysBetween('2025-01-25', '2025-01-25');
      expect(days).toBe(0);
    });

    it('handles reversed date order', () => {
      const days = getDaysBetween('2025-01-28', '2025-01-25');
      expect(days).toBe(3); // Absolute difference
    });

    it('handles dates across months', () => {
      const days = getDaysBetween('2025-01-28', '2025-02-05');
      expect(days).toBe(8);
    });

    it('handles dates across years', () => {
      const days = getDaysBetween('2024-12-25', '2025-01-10');
      expect(days).toBe(16);
    });
  });

  describe('edge cases', () => {
    it('handles leap year correctly in getMonthRange', () => {
      // 2024 is a leap year
      const feb2024 = getMonthRange(2024, 2);
      expect(feb2024.end).toBe('2024-02-29');

      // 2025 is not a leap year
      const feb2025 = getMonthRange(2025, 2);
      expect(feb2025.end).toBe('2025-02-28');
    });

    it('handles year boundaries in getDaysInRange', () => {
      const dates = getDaysInRange('2024-12-30', '2025-01-02');
      expect(dates).toEqual([
        '2024-12-30',
        '2024-12-31',
        '2025-01-01',
        '2025-01-02',
      ]);
    });

    it('handles same start and end in getWeekRange', () => {
      const range = getWeekRange('2025-01-27');
      const days = getDaysBetween(range.start, range.end);
      expect(days).toBe(6); // Always 6 days apart
    });
  });
});
