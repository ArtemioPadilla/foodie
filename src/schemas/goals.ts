/**
 * NutritionGoals — daily targets persisted under `localStorage['nutritionGoals']`.
 * `DEFAULT_GOALS` reproduces the legacy TrackingContext defaults exactly.
 */
import { z } from 'zod';

export const NutritionGoalsSchema = z.object({
  /** kcal */
  calories: z.number().positive(),
  /** grams */
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
  fiber: z.number().nonnegative(),
  /** mg */
  sodium: z.number().nonnegative().optional(),
  /** grams */
  sugar: z.number().nonnegative().optional(),
  /** ml */
  water: z.number().nonnegative().optional(),
});
export type NutritionGoals = z.infer<typeof NutritionGoalsSchema>;

export const DEFAULT_GOALS: NutritionGoals = NutritionGoalsSchema.parse({
  calories: 2000,
  protein: 50,
  carbs: 250,
  fat: 70,
  fiber: 25,
  sodium: 2300,
  sugar: 50,
  water: 2000,
});
