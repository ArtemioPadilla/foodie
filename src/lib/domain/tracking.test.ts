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
  dayMetrics,
  groupEntriesByMeal,
  planDayIndex,
  sumCalories,
  withQuantity,
} from './tracking';
import { makeIngredient, makeRecipe, mockBeverages } from '@/tests/fixtures/foodie-domain';

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

describe('day view helpers (roadmap #031)', () => {
  it('groupEntriesByMeal buckets every meal type and orders each by time', () => {
    const groups = groupEntriesByMeal([
      makeEntry({ id: 'b', mealType: 'lunch', time: '13:30:00' }),
      makeEntry({ id: 'a', mealType: 'lunch', time: '12:00:00' }),
      makeEntry({ id: 'c', mealType: 'beverage', time: '09:00:00' }),
    ]);
    expect(Object.keys(groups)).toEqual(['breakfast', 'lunch', 'dinner', 'snack', 'beverage']);
    expect(groups.lunch.map((e) => e.id)).toEqual(['a', 'b']);
    expect(groups.beverage).toHaveLength(1);
    expect(groups.breakfast).toEqual([]);
  });

  it('sumCalories rounds the meal total', () => {
    expect(sumCalories([makeEntry({ nutrition: makeNutrition({ calories: 100.4 }) }), makeEntry({ nutrition: makeNutrition({ calories: 50.4 }) })])).toBe(151);
    expect(sumCalories([])).toBe(0);
  });

  it('dayMetrics reports the seven nutrients against the goals', () => {
    const metrics = dayMetrics(makeNutrition({ calories: 1500, protein: 60, sugar: 25, sodium: 3450 }), DEFAULT_GOALS);
    expect(metrics.map((m) => m.key)).toEqual(['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium']);
    expect(metrics[0]).toMatchObject({ consumed: 1500, goal: 2000, percentage: 75, remaining: 500, unit: 'kcal' });
    expect(metrics[1]).toMatchObject({ percentage: 120, remaining: 0 });
    expect(metrics[6]).toMatchObject({ unit: 'mg', percentage: 150 });
    const noSugarGoal = dayMetrics(makeNutrition({ sugar: 10 }), { ...DEFAULT_GOALS, sugar: undefined });
    expect(noSugarGoal[5]).toMatchObject({ goal: undefined, percentage: 0 });
  });

  it('withQuantity recomputes from the catalog, or scales when the item is unknown', () => {
    const recipe = makeRecipe();
    const catalog = { recipes: [recipe], ingredients: [makeIngredient()], beverages: mockBeverages };
    const entry = makeEntry({ recipeId: recipe.id, quantity: 1, servings: 1, nutrition: makeNutrition({ calories: 1 }) });
    const doubled = withQuantity(entry, 2, catalog);
    expect(doubled.servings).toBe(2);
    expect(doubled.nutrition.calories).toBe(Math.round((recipe.nutrition.calories * 2) / recipe.servings));

    const custom = makeEntry({ recipeId: undefined, customName: { en: 'Toast', es: 'Pan', fr: 'Pain' }, quantity: 2, servings: undefined, nutrition: makeNutrition({ calories: 200 }) });
    expect(withQuantity(custom, 3, catalog).nutrition.calories).toBe(300);
  });

  it('planDayIndex is Monday-based', () => {
    expect(planDayIndex('2026-09-28')).toBe(0); // Monday
    expect(planDayIndex('2026-10-04')).toBe(6); // Sunday
  });
});
