/**
 * Nutrition tracking — entries persisted under `localStorage['trackingEntries']`
 * plus the derived daily/period aggregates the progress views compute from
 * them (never persisted, but they cross the island boundary as props).
 */
import { z } from 'zod';
import { MultiLangTextSchema } from './multi-lang-text';
import { NutritionInfoSchema } from './nutrition';

export const TRACKING_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack', 'beverage'] as const;
export const TrackingMealTypeSchema = z.enum(TRACKING_MEAL_TYPES);
export type TrackingMealType = z.infer<typeof TrackingMealTypeSchema>;

export const TrackingEntrySchema = z.object({
  id: z.string().min(1),
  /** `YYYY-MM-DD` */
  date: z.string().min(1),
  /** `HH:mm` */
  time: z.string(),
  mealType: TrackingMealTypeSchema,
  recipeId: z.string().optional(),
  ingredientId: z.string().optional(),
  beverageId: z.string().optional(),
  customName: MultiLangTextSchema.optional(),
  quantity: z.number().nonnegative(),
  unit: z.string(),
  servings: z.number().positive().optional(),
  nutrition: NutritionInfoSchema,
  notes: z.string().optional(),
  /** ISO datetime string. */
  loggedAt: z.string(),
  fromMealPlan: z.boolean().optional(),
  mealPlanId: z.string().optional(),
});
export type TrackingEntry = z.infer<typeof TrackingEntrySchema>;

export const TrackingEntriesSchema = z.array(TrackingEntrySchema);

export const GoalMetricProgressSchema = z.object({
  consumed: z.number(),
  goal: z.number(),
  remaining: z.number(),
  percentage: z.number(),
});
export type GoalMetricProgress = z.infer<typeof GoalMetricProgressSchema>;

export const GoalProgressSchema = z.object({
  calories: GoalMetricProgressSchema,
  protein: GoalMetricProgressSchema,
  carbs: GoalMetricProgressSchema,
  fat: GoalMetricProgressSchema,
  fiber: GoalMetricProgressSchema,
  water: GoalMetricProgressSchema.optional(),
});
export type GoalProgress = z.infer<typeof GoalProgressSchema>;

export const DailyTrackingSchema = z.object({
  date: z.string(),
  entries: z.array(TrackingEntrySchema),
  totals: NutritionInfoSchema,
  goalProgress: GoalProgressSchema,
});
export type DailyTracking = z.infer<typeof DailyTrackingSchema>;

export const PeriodSummarySchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  days: z.array(DailyTrackingSchema),
  averages: NutritionInfoSchema,
  totals: NutritionInfoSchema,
  streakDays: z.number().int().nonnegative(),
});
export type PeriodSummary = z.infer<typeof PeriodSummarySchema>;
