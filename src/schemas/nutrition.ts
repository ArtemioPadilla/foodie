/**
 * NutritionInfo — per-serving macros shared by recipes, beverages and
 * tracking entries. Values are plain numbers in the unit the UI labels
 * (kcal, g, mg); the catalog never stores units per field.
 */
import { z } from 'zod';

export const NutritionInfoSchema = z.object({
  servingSize: z.string(),
  calories: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
  fiber: z.number().nonnegative(),
  sugar: z.number().nonnegative(),
  sodium: z.number().nonnegative(),
  cholesterol: z.number().nonnegative(),
});
export type NutritionInfo = z.infer<typeof NutritionInfoSchema>;
