/**
 * Get today's date as ISO string (YYYY-MM-DD)
 */
export function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get current time as ISO time string (HH:MM:SS)
 */
export function getCurrentTime(): string {
  const now = new Date();
  return now.toTimeString().split(' ')[0];
}

/**
 * Format date for display
 */
export function formatDate(date: string, locale: string = 'en-US'): string {
  const d = new Date(date);
  return d.toLocaleDateString(locale, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get day name from date
 */
export function getDayName(date: string, locale: string = 'en-US'): string {
  const d = new Date(date);
  return d.toLocaleDateString(locale, { weekday: 'long' });
}

/**
 * Get short day name from date
 */
export function getShortDayName(date: string, locale: string = 'en-US'): string {
  const d = new Date(date);
  return d.toLocaleDateString(locale, { weekday: 'short' });
}

/**
 * Check if date is today
 */
export function isToday(date: string): boolean {
  return date === getToday();
}

/**
 * Check if date is yesterday
 */
export function isYesterday(date: string): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return date === yesterday.toISOString().split('T')[0];
}

/**
 * Check if date is tomorrow
 */
export function isTomorrow(date: string): boolean {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return date === tomorrow.toISOString().split('T')[0];
}

/**
 * Get start of week (Monday) for a given date
 * If no date provided, returns start of current week
 */
export function getStartOfWeek(date?: string): string {
  const d = date ? new Date(date) : new Date();
  const day = d.getDay();
  // Calculate difference to Monday (0 = Sunday, 1 = Monday, etc.)
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

/**
 * Get week range starting from a given date
 */
export function getWeekRange(startDate: string): { start: string; end: string } {
  const start = new Date(startDate);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

/**
 * Get month range for a given year and month
 */
export function getMonthRange(year: number, month: number): { start: string; end: string } {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0); // Last day of month

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

/**
 * Get array of dates in a range
 */
export function getDaysInRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split('T')[0]);
  }

  return dates;
}

/**
 * Get date N days ago
 */
export function getDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

/**
 * Get date N days from now
 */
export function getDaysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * Get relative date string (e.g., "Today", "Yesterday", or formatted date)
 */
export function getRelativeDateString(date: string, locale: string = 'en-US'): string {
  if (isToday(date)) {
    return locale === 'es' ? 'Hoy' : locale === 'fr' ? "Aujourd'hui" : 'Today';
  }
  if (isYesterday(date)) {
    return locale === 'es' ? 'Ayer' : locale === 'fr' ? 'Hier' : 'Yesterday';
  }
  if (isTomorrow(date)) {
    return locale === 'es' ? 'Mañana' : locale === 'fr' ? 'Demain' : 'Tomorrow';
  }
  return formatDate(date, locale);
}

/**
 * Parse ISO date string to Date object
 */
export function parseDate(dateString: string): Date {
  return new Date(dateString);
}

/**
 * Get days between two dates
 */
export function getDaysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}
