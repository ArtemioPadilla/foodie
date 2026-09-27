/**
 * Nutrition arithmetic shared by tracking, planner and recipe views
 * (roadmap Issue 013; Issue 014 ports the rest of `utils/nutritionCalculator`
 * — recipe/beverage/ingredient estimation — into this module).
 */
import type { GoalProgress, NutritionGoals, NutritionInfo } from '@/schemas';

/** All-zero `NutritionInfo` (legacy `createEmptyNutrition`). */
export function createEmptyNutrition(): NutritionInfo {
  return {
    servingSize: '0g',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
    cholesterol: 0,
  };
}

const round1 = (n: number): number => Math.round(n * 10) / 10;

/** Multiply every macro by `multiplier` (kcal/mg rounded to integers, grams to 0.1). */
export function scaleNutrition(nutrition: NutritionInfo, multiplier: number): NutritionInfo {
  return {
    servingSize: nutrition.servingSize,
    calories: Math.round(nutrition.calories * multiplier),
    protein: round1(nutrition.protein * multiplier),
    carbs: round1(nutrition.carbs * multiplier),
    fat: round1(nutrition.fat * multiplier),
    fiber: round1(nutrition.fiber * multiplier),
    sugar: round1(nutrition.sugar * multiplier),
    sodium: Math.round(nutrition.sodium * multiplier),
    cholesterol: Math.round(nutrition.cholesterol * multiplier),
  };
}

/** Sum a list of `NutritionInfo` (grams rounded to 0.1 at each step, as legacy did). */
export function aggregateNutrition(items: ReadonlyArray<NutritionInfo>): NutritionInfo {
  if (items.length === 0) return createEmptyNutrition();
  return items.reduce<NutritionInfo>(
    (acc, n) => ({
      servingSize: 'Total',
      calories: acc.calories + n.calories,
      protein: round1(acc.protein + n.protein),
      carbs: round1(acc.carbs + n.carbs),
      fat: round1(acc.fat + n.fat),
      fiber: round1(acc.fiber + n.fiber),
      sugar: round1(acc.sugar + n.sugar),
      sodium: acc.sodium + n.sodium,
      cholesterol: acc.cholesterol + n.cholesterol,
    }),
    createEmptyNutrition(),
  );
}

function metricProgress(consumed: number, goal: number): GoalProgress['calories'] {
  return {
    consumed,
    goal,
    remaining: Math.max(0, goal - consumed),
    percentage: goal > 0 ? Math.round((consumed / goal) * 100) : 0,
  };
}

/**
 * Compare a day's totals against the goals. `water` is only present when a
 * water goal exists; `waterMl` is the logged water (tracking passes the sum of
 * `bev_water` entries — legacy always reported 0 here).
 */
export function calculateGoalProgress(
  totals: NutritionInfo,
  goals: NutritionGoals,
  waterMl = 0,
): GoalProgress {
  return {
    calories: metricProgress(totals.calories, goals.calories),
    protein: metricProgress(totals.protein, goals.protein),
    carbs: metricProgress(totals.carbs, goals.carbs),
    fat: metricProgress(totals.fat, goals.fat),
    fiber: metricProgress(totals.fiber, goals.fiber),
    water: goals.water ? metricProgress(waterMl, goals.water) : undefined,
  };
}
