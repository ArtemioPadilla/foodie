// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { todayKey } from '@/lib/format-date';
import { makeEntry, makeNutrition } from '@/tests/fixtures/foodie-domain';
import { resetGoalsToDefaults, setGoals } from './goals';
import {
  $todayEntries,
  $todayProgress,
  $todayTotals,
  $tracking,
  clearTracking,
  deleteEntry,
  duplicateEntry,
  getAverageCalories,
  getDailySummary,
  getEntriesByDate,
  getEntriesByDateRange,
  getMonthlySummary,
  getMostLoggedMeals,
  getStreak,
  getWeeklySummary,
  logBeverage,
  logEntry,
  logIngredient,
  logRecipe,
  logWater,
  updateEntry,
} from './tracking';

/** Port of legacy `tests/unit/contexts/TrackingContext.test.tsx` (23 tests) + computed selectors. */

const lunch = (overrides: Partial<Parameters<typeof logEntry>[0]> = {}) =>
  logEntry({
    date: '2025-01-25',
    time: '12:00:00',
    mealType: 'lunch',
    recipeId: 'recipe-1',
    quantity: 2,
    unit: 'servings',
    servings: 2,
    nutrition: makeNutrition(),
    ...overrides,
  });

beforeEach(() => {
  localStorage.clear();
  clearTracking();
  resetGoalsToDefaults();
});

describe('initialization', () => {
  it('starts with empty entries array', () => {
    expect($tracking.get()).toEqual([]);
    expect($todayEntries.get()).toEqual([]);
  });

  it('loads entries from localStorage if available', async () => {
    localStorage.setItem('trackingEntries', JSON.stringify([makeEntry()]));
    vi.resetModules();
    const fresh = await import('./tracking');
    expect(fresh.$tracking.get()).toHaveLength(1);
    expect(fresh.$tracking.get()[0]?.id).toBe('entry-1');
  });

  it('handles corrupted localStorage data gracefully (legacy skipped test)', async () => {
    localStorage.setItem('trackingEntries', 'invalid json');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.resetModules();
    const fresh = await import('./tracking');
    expect(fresh.$tracking.get()).toEqual([]);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('logEntry', () => {
  it('adds a new entry', () => {
    lunch();
    expect($tracking.get()).toHaveLength(1);
    expect($tracking.get()[0]?.mealType).toBe('lunch');
  });

  it('generates unique ID for new entry', () => {
    const a = lunch();
    const b = lunch();
    expect(a.id).toMatch(/^tracking_/);
    expect(a.id).not.toBe(b.id);
  });

  it('adds loggedAt timestamp', () => {
    const entry = lunch();
    expect(new Date(entry.loggedAt).getTime()).not.toBeNaN();
  });

  it('persists to localStorage under "trackingEntries"', () => {
    lunch();
    expect(JSON.parse(localStorage.getItem('trackingEntries')!)).toHaveLength(1);
  });
});

describe('updateEntry', () => {
  it('updates an existing entry', () => {
    const { id } = lunch();
    updateEntry(id, { quantity: 3 });
    expect($tracking.get()[0]?.quantity).toBe(3);
  });

  it('does not modify other entries', () => {
    lunch({ time: '08:00:00', mealType: 'breakfast', quantity: 1 });
    const second = lunch({ recipeId: 'recipe-2' });
    updateEntry(second.id, { quantity: 5 });
    expect($tracking.get()).toHaveLength(2);
    expect($tracking.get()[0]?.quantity).toBe(1);
    expect($tracking.get()[1]?.quantity).toBe(5);
  });
});

describe('deleteEntry', () => {
  it('removes an entry', () => {
    const { id } = lunch();
    deleteEntry(id);
    expect($tracking.get()).toHaveLength(0);
  });

  it('only removes the specified entry', () => {
    const first = lunch({ mealType: 'breakfast' });
    lunch();
    deleteEntry(first.id);
    expect($tracking.get()).toHaveLength(1);
    expect($tracking.get()[0]?.mealType).toBe('lunch');
  });
});

describe('duplicateEntry', () => {
  it('copies an entry to the given date with a fresh id and time', () => {
    const src = lunch();
    const clock = new Date(2025, 1, 2, 9, 30, 0);
    const copy = duplicateEntry(src.id, '2025-02-02', clock);
    expect(copy?.id).not.toBe(src.id);
    expect(copy?.date).toBe('2025-02-02');
    expect(copy?.time).toBe('09:30:00');
    expect(copy?.recipeId).toBe('recipe-1');
    expect($tracking.get()).toHaveLength(2);
  });

  it('defaults to today and returns undefined for unknown ids', () => {
    const src = lunch();
    expect(duplicateEntry(src.id)?.date).toBe(todayKey());
    expect(duplicateEntry('ghost')).toBeUndefined();
  });
});

describe('getEntriesByDate / getEntriesByDateRange', () => {
  it('returns entries for a specific date', () => {
    lunch();
    lunch({ date: '2025-01-26', recipeId: 'recipe-2' });
    const entries = getEntriesByDate('2025-01-25');
    expect(entries).toHaveLength(1);
    expect(entries[0]?.date).toBe('2025-01-25');
    expect(getEntriesByDateRange('2025-01-25', '2025-01-26')).toHaveLength(2);
  });

  it('returns empty array for date with no entries', () => {
    expect(getEntriesByDate('2025-01-25')).toEqual([]);
  });
});

describe('getDailySummary', () => {
  it('calculates daily totals correctly', () => {
    lunch({ nutrition: makeNutrition({ calories: 500, protein: 25 }) });
    lunch({ time: '18:00:00', mealType: 'dinner', recipeId: 'recipe-2', nutrition: makeNutrition({ calories: 300, protein: 20 }) });
    const summary = getDailySummary('2025-01-25');
    expect(summary.totals.calories).toBe(800);
    expect(summary.totals.protein).toBe(45);
    expect(summary.entries).toHaveLength(2);
  });

  it('calculates goal progress', () => {
    lunch({ nutrition: makeNutrition({ calories: 1000, protein: 50 }) });
    const summary = getDailySummary('2025-01-25');
    expect(summary.goalProgress.calories.percentage).toBe(50);
    expect(summary.goalProgress.calories.remaining).toBe(1000);
  });

  it('weekly / monthly / streak / averages / most-logged are bound to the stores', () => {
    lunch({ nutrition: makeNutrition({ calories: 2000, protein: 50 }) });
    lunch({ date: '2025-01-24', recipeId: 'recipe-2', nutrition: makeNutrition({ calories: 2000, protein: 50 }) });
    expect(getWeeklySummary('2025-01-20').totals.calories).toBe(4000);
    expect(getMonthlySummary(2025, 1).streakDays).toBe(2);
    expect(getStreak('2025-01-25')).toBe(2);
    expect(getAverageCalories(7)).toBe(2000);
    expect(getMostLoggedMeals(1)).toEqual([{ recipeId: 'recipe-1', count: 1 }]);
  });
});

describe('todayEntries, todayTotals and todayProgress (computed)', () => {
  it('derive from entries dated today and from the goals', () => {
    lunch({ date: todayKey(), nutrition: makeNutrition({ calories: 1000, protein: 25 }) });
    lunch(); // 2025-01-25 — not today
    expect($todayEntries.get()).toHaveLength(1);
    expect($todayTotals.get().calories).toBe(1000);
    expect($todayProgress.get().calories.percentage).toBe(50);
    setGoals({ calories: 1000 });
    expect($todayProgress.get().calories.percentage).toBe(100);
  });

  it('counts logged water towards the water goal', () => {
    logWater(500);
    expect($todayProgress.get().water?.consumed).toBe(500);
  });
});

describe('helper logging methods', () => {
  it('logRecipe creates entry with recipe data', () => {
    logRecipe('recipe-1', 'lunch', 2, '2025-01-25');
    expect($tracking.get()).toHaveLength(1);
    expect($tracking.get()[0]?.recipeId).toBe('recipe-1');
    expect($tracking.get()[0]?.servings).toBe(2);
    expect($tracking.get()[0]?.unit).toBe('servings');
  });

  it('logIngredient and logBeverage default the date to today', () => {
    logIngredient('ing_001', 150, 'g', 'breakfast');
    logBeverage('bev_coffee', 240, 'ml');
    expect($tracking.get()[0]).toMatchObject({ ingredientId: 'ing_001', date: todayKey(), mealType: 'breakfast' });
    expect($tracking.get()[1]).toMatchObject({ beverageId: 'bev_coffee', mealType: 'beverage' });
  });

  it('logWater creates entry with 250ml water', () => {
    logWater(250);
    expect($tracking.get()).toHaveLength(1);
    expect($tracking.get()[0]).toMatchObject({ mealType: 'beverage', beverageId: 'bev_water', quantity: 250, unit: 'ml' });
  });
});

describe('edge cases', () => {
  it('handles zero nutrition data', () => {
    lunch({ date: todayKey(), nutrition: makeNutrition({ calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 }) });
    expect($todayTotals.get().calories).toBe(0);
  });
});
