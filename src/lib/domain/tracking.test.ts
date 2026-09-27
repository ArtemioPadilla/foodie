import { describe, expect, it } from 'vitest';
import { DEFAULT_GOALS } from '@/schemas';
import { makeEntry, makeNutrition } from '@/tests/fixtures/foodie-domain';
import {
  averageCalories,
  calculateStreak,
  dailySummary,
  dateKeysFrom,
  entriesByDate,
  entriesByDateRange,
  meetsDailyGoal,
  monthDateKeys,
  monthlySummary,
  mostLoggedMeals,
  waterMl,
  weeklySummary,
} from './tracking';

const onTrack = makeNutrition({ calories: 2000, protein: 50 });

describe('entriesByDate / entriesByDateRange', () => {
  const entries = [
    makeEntry({ id: 'a', date: '2025-01-25' }),
    makeEntry({ id: 'b', date: '2025-01-26' }),
    makeEntry({ id: 'c', date: '2025-01-28' }),
  ];

  it('filters by exact date', () => {
    expect(entriesByDate(entries, '2025-01-25').map((e) => e.id)).toEqual(['a']);
    expect(entriesByDate(entries, '2025-02-01')).toEqual([]);
  });

  it('filters by inclusive range', () => {
    expect(entriesByDateRange(entries, '2025-01-26', '2025-01-28').map((e) => e.id)).toEqual(['b', 'c']);
  });
});

describe('dailySummary', () => {
  it('sums the day and computes goal progress against the goals', () => {
    const entries = [
      makeEntry({ id: 'a', nutrition: makeNutrition({ calories: 500, protein: 25 }) }),
      makeEntry({ id: 'b', mealType: 'dinner', nutrition: makeNutrition({ calories: 300, protein: 20 }) }),
      makeEntry({ id: 'other-day', date: '2025-01-26' }),
    ];
    const summary = dailySummary(entries, DEFAULT_GOALS, '2025-01-25');
    expect(summary.entries).toHaveLength(2);
    expect(summary.totals.calories).toBe(800);
    expect(summary.totals.protein).toBe(45);
    expect(summary.goalProgress.calories.percentage).toBe(40);
    expect(summary.goalProgress.calories.remaining).toBe(1200);
  });

  it('feeds logged water into the water goal', () => {
    const entries = [
      makeEntry({ id: 'w', mealType: 'beverage', beverageId: 'bev_water', quantity: 750, unit: 'ml', recipeId: undefined }),
    ];
    expect(waterMl(entries)).toBe(750);
    expect(dailySummary(entries, DEFAULT_GOALS, '2025-01-25').goalProgress.water?.consumed).toBe(750);
  });
});

describe('meetsDailyGoal', () => {
  it('requires 80–120 % calories and ≥ 80 % protein', () => {
    const on = dailySummary([makeEntry({ nutrition: onTrack })], DEFAULT_GOALS, '2025-01-25');
    const under = dailySummary([makeEntry({ nutrition: makeNutrition({ calories: 1000, protein: 50 }) })], DEFAULT_GOALS, '2025-01-25');
    const over = dailySummary([makeEntry({ nutrition: makeNutrition({ calories: 2500, protein: 50 }) })], DEFAULT_GOALS, '2025-01-25');
    const lowProtein = dailySummary([makeEntry({ nutrition: makeNutrition({ calories: 2000, protein: 10 }) })], DEFAULT_GOALS, '2025-01-25');
    expect(meetsDailyGoal(on)).toBe(true);
    expect(meetsDailyGoal(under)).toBe(false);
    expect(meetsDailyGoal(over)).toBe(false);
    expect(meetsDailyGoal(lowProtein)).toBe(false);
  });
});

describe('date key ranges', () => {
  it('dateKeysFrom yields consecutive local days, crossing month ends', () => {
    expect(dateKeysFrom('2025-01-30', 3)).toEqual(['2025-01-30', '2025-01-31', '2025-02-01']);
  });

  it('monthDateKeys covers every day of the month (1-based month)', () => {
    const feb = monthDateKeys(2024, 2);
    expect(feb).toHaveLength(29);
    expect(feb[0]).toBe('2024-02-01');
    expect(feb[28]).toBe('2024-02-29');
  });
});

describe('weeklySummary / monthlySummary', () => {
  const entries = [
    makeEntry({ id: 'a', date: '2025-01-20', nutrition: onTrack }),
    makeEntry({ id: 'b', date: '2025-01-21', nutrition: makeNutrition({ calories: 700 }) }),
    makeEntry({ id: 'outside', date: '2025-02-10', nutrition: onTrack }),
  ];

  it('weeklySummary spans 7 days from the start and averages over 7', () => {
    const week = weeklySummary(entries, DEFAULT_GOALS, '2025-01-20');
    expect(week.startDate).toBe('2025-01-20');
    expect(week.endDate).toBe('2025-01-26');
    expect(week.days).toHaveLength(7);
    expect(week.totals.calories).toBe(2700);
    expect(week.averages.calories).toBe(Math.round(2700 / 7));
    expect(week.streakDays).toBe(1);
  });

  it('monthlySummary spans the whole month', () => {
    const month = monthlySummary(entries, DEFAULT_GOALS, 2025, 1);
    expect(month.days).toHaveLength(31);
    expect(month.startDate).toBe('2025-01-01');
    expect(month.endDate).toBe('2025-01-31');
    expect(month.totals.calories).toBe(2700);
  });
});

describe('calculateStreak', () => {
  it('counts consecutive on-track days ending today', () => {
    const entries = [
      makeEntry({ id: 'a', date: '2025-01-25', nutrition: onTrack }),
      makeEntry({ id: 'b', date: '2025-01-24', nutrition: onTrack }),
      makeEntry({ id: 'c', date: '2025-01-23', nutrition: makeNutrition({ calories: 100 }) }),
      makeEntry({ id: 'd', date: '2025-01-22', nutrition: onTrack }),
    ];
    expect(calculateStreak(entries, DEFAULT_GOALS, '2025-01-25')).toBe(2);
  });

  it('is 0 when today has nothing logged', () => {
    expect(calculateStreak([makeEntry({ date: '2025-01-24', nutrition: onTrack })], DEFAULT_GOALS, '2025-01-25')).toBe(0);
  });
});

describe('averageCalories / mostLoggedMeals', () => {
  const entries = [
    makeEntry({ id: 'a', date: '2025-01-25', recipeId: 'r1', nutrition: makeNutrition({ calories: 600 }) }),
    makeEntry({ id: 'b', date: '2025-01-25', recipeId: 'r1', nutrition: makeNutrition({ calories: 400 }) }),
    makeEntry({ id: 'c', date: '2025-01-24', recipeId: 'r2', nutrition: makeNutrition({ calories: 500 }) }),
    makeEntry({ id: 'd', date: '2025-01-20', recipeId: undefined, ingredientId: 'i1', nutrition: makeNutrition({ calories: 100 }) }),
  ];

  it('averages over the N most recent logged dates only', () => {
    expect(averageCalories(entries, 2)).toBe(750);
    expect(averageCalories(entries, 10)).toBe(Math.round(1600 / 3));
    expect(averageCalories([], 7)).toBe(0);
  });

  it('ranks recipes by how often they were logged', () => {
    expect(mostLoggedMeals(entries, 5)).toEqual([
      { recipeId: 'r1', count: 2 },
      { recipeId: 'r2', count: 1 },
    ]);
    expect(mostLoggedMeals(entries, 1)).toHaveLength(1);
  });
});
