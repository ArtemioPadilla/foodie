/**
 * Pure selectors over `TrackingEntry[]` (roadmap §2: "selectores puros en
 * lib/domain/tracking"). The `$tracking` store wraps these with `computed`;
 * islands that already hold the entries (e.g. the progress dashboard) can call
 * them directly with any date so nothing here reads the clock implicitly
 * except the `now` defaults.
 */
import type {
  DailyTracking,
  NutritionGoals,
  PeriodSummary,
  TrackingEntry,
  NutritionInfo,
} from '@/schemas';
import { addDaysToKey, toDateKey, todayKey } from '@/lib/format-date';
import { aggregateNutrition, calculateGoalProgress } from './nutrition';

/** Beverage id whose entries count towards the water goal. */
export const WATER_BEVERAGE_ID = 'bev_water';

export function entriesByDate(entries: ReadonlyArray<TrackingEntry>, date: string): TrackingEntry[] {
  return entries.filter((e) => e.date === date);
}

export function entriesByDateRange(
  entries: ReadonlyArray<TrackingEntry>,
  startDate: string,
  endDate: string,
): TrackingEntry[] {
  return entries.filter((e) => e.date >= startDate && e.date <= endDate);
}

/** Millilitres of water logged in `entries` (unit `ml` only). */
export function waterMl(entries: ReadonlyArray<TrackingEntry>): number {
  return entries
    .filter((e) => e.beverageId === WATER_BEVERAGE_ID && e.unit === 'ml')
    .reduce((sum, e) => sum + e.quantity, 0);
}

export function dailyTotals(entries: ReadonlyArray<TrackingEntry>): NutritionInfo {
  return aggregateNutrition(entries.map((e) => e.nutrition));
}

export function dailySummary(
  entries: ReadonlyArray<TrackingEntry>,
  goals: NutritionGoals,
  date: string,
): DailyTracking {
  const dayEntries = entriesByDate(entries, date);
  const totals = dailyTotals(dayEntries);
  return {
    date,
    entries: dayEntries,
    totals,
    goalProgress: calculateGoalProgress(totals, goals, waterMl(dayEntries)),
  };
}

/** Legacy "on track" rule: 80–120 % of calories and ≥ 80 % of protein. */
export function meetsDailyGoal(day: DailyTracking): boolean {
  const { calories, protein } = day.goalProgress;
  return calories.percentage >= 80 && calories.percentage <= 120 && protein.percentage >= 80;
}

/** `count` consecutive `YYYY-MM-DD` keys starting at `startDate` (inclusive). */
export function dateKeysFrom(startDate: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDaysToKey(startDate, i));
}

/** Every day key of a month (`month` is 1-based). */
export function monthDateKeys(year: number, month: number): string[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, i) => toDateKey(new Date(year, month - 1, i + 1)));
}

export function periodSummary(
  entries: ReadonlyArray<TrackingEntry>,
  goals: NutritionGoals,
  dates: ReadonlyArray<string>,
): PeriodSummary {
  const days = dates.map((date) => dailySummary(entries, goals, date));
  const totals = aggregateNutrition(days.map((d) => d.totals));
  const n = Math.max(1, days.length);
  const averages: NutritionInfo = {
    ...totals,
    calories: Math.round(totals.calories / n),
    protein: Math.round(totals.protein / n),
    carbs: Math.round(totals.carbs / n),
    fat: Math.round(totals.fat / n),
    fiber: Math.round(totals.fiber / n),
    sugar: Math.round(totals.sugar / n),
    sodium: Math.round(totals.sodium / n),
    cholesterol: Math.round(totals.cholesterol / n),
  };
  return {
    startDate: dates[0] ?? '',
    endDate: dates[dates.length - 1] ?? '',
    days,
    averages,
    totals,
    streakDays: days.filter(meetsDailyGoal).length,
  };
}

export function weeklySummary(
  entries: ReadonlyArray<TrackingEntry>,
  goals: NutritionGoals,
  startDate: string,
): PeriodSummary {
  return periodSummary(entries, goals, dateKeysFrom(startDate, 7));
}

export function monthlySummary(
  entries: ReadonlyArray<TrackingEntry>,
  goals: NutritionGoals,
  year: number,
  month: number,
): PeriodSummary {
  return periodSummary(entries, goals, monthDateKeys(year, month));
}

/** Consecutive days ending today (or `today`) that met the daily goal. */
export function calculateStreak(
  entries: ReadonlyArray<TrackingEntry>,
  goals: NutritionGoals,
  today: string = todayKey(),
): number {
  const logged = new Set(entries.map((e) => e.date));
  let streak = 0;
  for (let i = 0; ; i++) {
    const date = addDaysToKey(today, -i);
    if (!logged.has(date)) break;
    if (!meetsDailyGoal(dailySummary(entries, goals, date))) break;
    streak++;
  }
  return streak;
}

/** Mean calories over the `days` most recent logged dates (0 when nothing is logged). */
export function averageCalories(entries: ReadonlyArray<TrackingEntry>, days: number): number {
  const dates = [...new Set(entries.map((e) => e.date))].sort().reverse().slice(0, days);
  if (dates.length === 0) return 0;
  const total = dates.reduce((sum, date) => sum + dailyTotals(entriesByDate(entries, date)).calories, 0);
  return Math.round(total / dates.length);
}

export function mostLoggedMeals(
  entries: ReadonlyArray<TrackingEntry>,
  limit: number,
): Array<{ recipeId: string; count: number }> {
  const counts = new Map<string, number>();
  for (const e of entries) {
    if (e.recipeId) counts.set(e.recipeId, (counts.get(e.recipeId) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([recipeId, count]) => ({ recipeId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
