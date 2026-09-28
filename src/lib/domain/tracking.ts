/**
 * Pure selectors over `TrackingEntry[]` (roadmap §2: "selectores puros en
 * lib/domain/tracking"). The `$tracking` store wraps these with `computed`;
 * islands that already hold the entries (e.g. the progress dashboard) can call
 * them directly with any date so nothing here reads the clock implicitly
 * except the `now` defaults.
 */
import {
  TRACKING_MEAL_TYPES,
  type Beverage,
  type DailyTracking,
  type Ingredient,
  type NutritionGoals,
  type PeriodSummary,
  type Recipe,
  type TrackingEntry,
  type TrackingMealType,
  type NutritionInfo,
} from '@/schemas';
import { addDaysToKey, parseDateKey, toDateKey, todayKey } from '@/lib/format-date';
import { aggregateNutrition, calculateEntryNutrition, calculateGoalProgress, scaleNutrition } from './nutrition';

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

// ── Day view (roadmap Issue 031 — `TrackingToday`) ───────────────────────────

/** Millilitres in one glass of water (legacy "quick log water" size). */
export const GLASS_ML = 250;

/** Diary entries of one day grouped by meal, each group in logging order (`time`). */
export function groupEntriesByMeal(
  entries: ReadonlyArray<TrackingEntry>,
): Record<TrackingMealType, TrackingEntry[]> {
  const groups = Object.fromEntries(TRACKING_MEAL_TYPES.map((m) => [m, [] as TrackingEntry[]])) as Record<
    TrackingMealType,
    TrackingEntry[]
  >;
  for (const entry of entries) groups[entry.mealType].push(entry);
  for (const meal of TRACKING_MEAL_TYPES) groups[meal].sort((a, b) => a.time.localeCompare(b.time));
  return groups;
}

/** Sum of `nutrition.calories`, rounded to whole kcal. */
export function sumCalories(entries: ReadonlyArray<TrackingEntry>): number {
  return Math.round(entries.reduce((sum, e) => sum + e.nutrition.calories, 0));
}

/** The nutrients the day view reports, in display order, with their unit. */
export const DAY_METRICS = [
  { key: 'calories', unit: 'kcal' },
  { key: 'protein', unit: 'g' },
  { key: 'carbs', unit: 'g' },
  { key: 'fat', unit: 'g' },
  { key: 'fiber', unit: 'g' },
  { key: 'sugar', unit: 'g' },
  { key: 'sodium', unit: 'mg' },
] as const satisfies ReadonlyArray<{ key: keyof NutritionInfo & keyof NutritionGoals; unit: string }>;
export type DayMetricKey = (typeof DAY_METRICS)[number]['key'];

export interface DayMetric {
  key: DayMetricKey;
  unit: string;
  /** Rounded consumed amount. */
  consumed: number;
  /** Daily goal; `undefined` when the user has none for this nutrient (sugar/sodium are optional). */
  goal: number | undefined;
  /** `consumed / goal` in %, rounded; 0 without a goal. Not clamped (can exceed 100). */
  percentage: number;
  remaining: number;
}

/**
 * Consumed vs goal for every `DAY_METRICS` nutrient — the seven totals the
 * day view shows (kcal, protein, carbs, fat, fiber, sugar, sodium).
 */
export function dayMetrics(totals: NutritionInfo, goals: NutritionGoals): DayMetric[] {
  return DAY_METRICS.map(({ key, unit }) => {
    const consumed = Math.round(totals[key]);
    const goal = goals[key];
    return {
      key,
      unit,
      consumed,
      goal,
      percentage: goal ? Math.round((totals[key] / goal) * 100) : 0,
      remaining: goal ? Math.max(0, Math.round(goal - totals[key])) : 0,
    };
  });
}

/**
 * `entry` with a new quantity (servings for recipe entries): nutrition is
 * recomputed from the catalog when the recipe / ingredient / beverage is
 * known, otherwise scaled in proportion to the old quantity (custom or
 * since-removed items). The caller persists it with `updateEntry`.
 */
export function withQuantity(
  entry: TrackingEntry,
  quantity: number,
  catalog: { recipes: ReadonlyArray<Recipe>; ingredients: ReadonlyArray<Ingredient>; beverages: ReadonlyArray<Beverage> },
): Pick<TrackingEntry, 'quantity' | 'servings' | 'nutrition'> {
  const isRecipe = Boolean(entry.recipeId);
  const next = { ...entry, quantity, servings: isRecipe ? quantity : entry.servings };
  const known =
    (entry.recipeId && catalog.recipes.some((r) => r.id === entry.recipeId)) ||
    (entry.ingredientId && catalog.ingredients.some((i) => i.id === entry.ingredientId)) ||
    (entry.beverageId && catalog.beverages.some((b) => b.id === entry.beverageId));
  const nutrition = known
    ? calculateEntryNutrition(next, catalog.recipes, catalog.ingredients, catalog.beverages)
    : entry.quantity > 0
      ? scaleNutrition(entry.nutrition, quantity / entry.quantity)
      : entry.nutrition;
  return { quantity, servings: next.servings, nutrition };
}

/** Monday-based index (0–6) of a `YYYY-MM-DD` key — the planner's day order. */
export function planDayIndex(dateKey: string): number {
  const weekday = parseDateKey(dateKey).getDay();
  return weekday === 0 ? 6 : weekday - 1;
}
