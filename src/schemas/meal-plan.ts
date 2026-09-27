/**
 * MealPlan — the planner's persisted state (`localStorage` keys
 * `currentMealPlan` and `savedMealPlans`, kept verbatim so legacy data
 * survives the migration — roadmap US-1.2).
 *
 * A plan is 7 `PlanDay`s; each day has optional breakfast/lunch/dinner slots
 * and a list of snacks. `description` may legitimately be blank (legacy
 * `createPlan` defaults it to empty strings).
 */
import { z } from 'zod';
import { MultiLangTextSchema, OptionalMultiLangTextSchema } from './multi-lang-text';

export const MealSlotSchema = z.object({
  recipeId: z.string().min(1),
  servings: z.number().positive(),
});
export type MealSlot = z.infer<typeof MealSlotSchema>;

export const DayMealsSchema = z.object({
  breakfast: MealSlotSchema.optional(),
  lunch: MealSlotSchema.optional(),
  dinner: MealSlotSchema.optional(),
  snacks: z.array(MealSlotSchema).optional(),
});
export type DayMeals = z.infer<typeof DayMealsSchema>;

export const MAIN_MEAL_SLOTS = ['breakfast', 'lunch', 'dinner'] as const;
export const MainMealSlotSchema = z.enum(MAIN_MEAL_SLOTS);
export type MainMealSlot = z.infer<typeof MainMealSlotSchema>;

export const PlanDaySchema = z.object({
  dayNumber: z.number().int().min(1),
  /** Lower-case English weekday used as a translation key (`monday`…). */
  dayName: z.string().min(1),
  meals: DayMealsSchema,
  notes: MultiLangTextSchema.optional(),
});
export type PlanDay = z.infer<typeof PlanDaySchema>;

export const MealPlanSchema = z.object({
  id: z.string().min(1),
  name: MultiLangTextSchema,
  description: OptionalMultiLangTextSchema,
  cuisine: z.string().optional(),
  servings: z.number().positive(),
  dietaryRestrictions: z.array(z.string()),
  difficulty: z.string(),
  estimatedCost: z.number().nonnegative(),
  currency: z.string(),
  days: z.array(PlanDaySchema),
  shoppingList: z.string().optional(),
  prepInstructions: MultiLangTextSchema.optional(),
  tags: z.array(z.string()),
  author: z.string().optional(),
  isPublic: z.boolean(),
  shareToken: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type MealPlan = z.infer<typeof MealPlanSchema>;

export const SavedMealPlansSchema = z.array(MealPlanSchema);
