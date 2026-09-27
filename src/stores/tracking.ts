import { computed } from 'nanostores';
import {
  TrackingEntriesSchema,
  type TrackingEntry,
  type TrackingMealType,
} from '@/schemas';
import { persistentAtom } from '@/lib/persist';
import { nowTimeKey, todayKey } from '@/lib/format-date';
import { generateId } from '@/lib/domain/id';
import { createEmptyNutrition, calculateGoalProgress } from '@/lib/domain/nutrition';
import {
  WATER_BEVERAGE_ID,
  averageCalories,
  calculateStreak,
  dailySummary,
  dailyTotals,
  entriesByDate,
  entriesByDateRange,
  monthlySummary,
  mostLoggedMeals,
  waterMl,
  weeklySummary,
} from '@/lib/domain/tracking';
import { $goals } from './goals';
import { notifyQuotaExceeded } from './storage-status';

/**
 * Food diary entries (port of `TrackingContext`). Aggregation lives in
 * `lib/domain/{nutrition,tracking}`; this module only owns the persisted list,
 * the `computed` "today" selectors and the logging actions.
 */
export const TRACKING_KEY = 'trackingEntries';

export const $tracking = persistentAtom<TrackingEntry[]>(TRACKING_KEY, TrackingEntriesSchema, [], {
  onQuotaExceeded: notifyQuotaExceeded,
});

// "Today" is evaluated when the computed re-runs (any entry change). Islands
// that stay open past midnight can force a refresh by touching the store or by
// calling `dailySummary(entries, goals, todayKey())` directly.
export const $todayEntries = computed($tracking, (entries) => entriesByDate(entries, todayKey()));
export const $todayTotals = computed($todayEntries, (entries) => dailyTotals(entries));
export const $todayProgress = computed([$todayTotals, $goals, $todayEntries], (totals, goals, entries) =>
  calculateGoalProgress(totals, goals, waterMl(entries)),
);

export type NewTrackingEntry = Omit<TrackingEntry, 'id' | 'loggedAt'>;

export function logEntry(entry: NewTrackingEntry, now: Date = new Date()): TrackingEntry {
  const created: TrackingEntry = {
    ...entry,
    id: generateId('tracking', now.getTime()),
    loggedAt: now.toISOString(),
  };
  $tracking.set([...$tracking.get(), created]);
  return created;
}

export function updateEntry(id: string, updates: Partial<TrackingEntry>): void {
  $tracking.set($tracking.get().map((e) => (e.id === id ? { ...e, ...updates } : e)));
}

export function deleteEntry(id: string): void {
  $tracking.set($tracking.get().filter((e) => e.id !== id));
}

/** Copy an entry to `newDate` (default today) with the current time. */
export function duplicateEntry(id: string, newDate?: string, now: Date = new Date()): TrackingEntry | undefined {
  const source = $tracking.get().find((e) => e.id === id);
  if (!source) return undefined;
  const copy: TrackingEntry = {
    ...source,
    id: generateId('tracking', now.getTime()),
    date: newDate ?? todayKey(now),
    time: nowTimeKey(now),
    loggedAt: now.toISOString(),
  };
  $tracking.set([...$tracking.get(), copy]);
  return copy;
}

export function logRecipe(
  recipeId: string,
  mealType: TrackingMealType,
  servings: number,
  date?: string,
  nutrition = createEmptyNutrition(),
  now: Date = new Date(),
): TrackingEntry {
  return logEntry(
    {
      date: date ?? todayKey(now),
      time: nowTimeKey(now),
      mealType,
      recipeId,
      quantity: servings,
      unit: 'servings',
      servings,
      nutrition,
    },
    now,
  );
}

export function logIngredient(
  ingredientId: string,
  quantity: number,
  unit: string,
  mealType: TrackingMealType,
  date?: string,
  nutrition = createEmptyNutrition(),
  now: Date = new Date(),
): TrackingEntry {
  return logEntry(
    { date: date ?? todayKey(now), time: nowTimeKey(now), mealType, ingredientId, quantity, unit, nutrition },
    now,
  );
}

export function logBeverage(
  beverageId: string,
  quantity: number,
  unit: string,
  date?: string,
  nutrition = createEmptyNutrition(),
  now: Date = new Date(),
): TrackingEntry {
  return logEntry(
    { date: date ?? todayKey(now), time: nowTimeKey(now), mealType: 'beverage', beverageId, quantity, unit, nutrition },
    now,
  );
}

export function logWater(ml: number, now: Date = new Date()): TrackingEntry {
  return logBeverage(WATER_BEVERAGE_ID, ml, 'ml', undefined, createEmptyNutrition(), now);
}

export function clearTracking(): void {
  $tracking.set([]);
}

// ── Read helpers bound to the stores (legacy context API) ────────────────────

export const getEntriesByDate = (date: string) => entriesByDate($tracking.get(), date);
export const getEntriesByDateRange = (start: string, end: string) =>
  entriesByDateRange($tracking.get(), start, end);
export const getDailySummary = (date: string) => dailySummary($tracking.get(), $goals.get(), date);
export const getWeeklySummary = (startDate: string) => weeklySummary($tracking.get(), $goals.get(), startDate);
export const getMonthlySummary = (year: number, month: number) =>
  monthlySummary($tracking.get(), $goals.get(), year, month);
export const getStreak = (today?: string) => calculateStreak($tracking.get(), $goals.get(), today);
export const getAverageCalories = (days: number) => averageCalories($tracking.get(), days);
export const getMostLoggedMeals = (limit: number) => mostLoggedMeals($tracking.get(), limit);
