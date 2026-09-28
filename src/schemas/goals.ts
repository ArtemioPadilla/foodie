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

// ── Goals form (roadmap Issue 032 — `/tracking/goals`) ───────────────────────

/** The goals the form edits, in display order. */
export const GOAL_FIELDS = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium', 'water'] as const;
export type GoalField = (typeof GOAL_FIELDS)[number];

/**
 * Accepted range, stepper increment and unit of every goal. The bounds are
 * deliberately wide (they reject typos such as `20000` kcal or a negative
 * amount, not unusual diets); the form shows them next to each field.
 */
export const GOAL_RANGES: Record<GoalField, { min: number; max: number; step: number; unit: 'kcal' | 'g' | 'mg' | 'ml' }> = {
  calories: { min: 800, max: 6000, step: 50, unit: 'kcal' },
  protein: { min: 10, max: 400, step: 5, unit: 'g' },
  carbs: { min: 20, max: 800, step: 5, unit: 'g' },
  fat: { min: 10, max: 300, step: 5, unit: 'g' },
  fiber: { min: 5, max: 100, step: 1, unit: 'g' },
  sugar: { min: 0, max: 300, step: 5, unit: 'g' },
  sodium: { min: 500, max: 6000, step: 100, unit: 'mg' },
  water: { min: 500, max: 6000, step: 250, unit: 'ml' },
};

/** Builds the message of an out-of-range / missing value (the island passes a localised one). */
export type GoalRangeMessage = (field: GoalField, range: (typeof GOAL_RANGES)[GoalField]) => string;

const defaultRangeMessage: GoalRangeMessage = (_field, { min, max, unit }) => `Enter a value between ${min} and ${max} ${unit}.`;

/**
 * `nutritionGoalsSchema` of the goals form: every goal required (the stored
 * `NutritionGoalsSchema` keeps sugar/sodium/water optional for legacy data)
 * and inside `GOAL_RANGES`. Its output is a valid `NutritionGoals`.
 */
export function createNutritionGoalsFormSchema(message: GoalRangeMessage = defaultRangeMessage) {
  const field = (name: GoalField) => {
    const range = GOAL_RANGES[name];
    const error = message(name, range);
    return z
      .number({ error })
      .refine((n) => Number.isFinite(n) && n >= range.min && n <= range.max, { error });
  };
  return z.object(Object.fromEntries(GOAL_FIELDS.map((name) => [name, field(name)])) as Record<GoalField, ReturnType<typeof field>>);
}

export const NutritionGoalsFormSchema = createNutritionGoalsFormSchema();
export type NutritionGoalsFormValues = z.infer<typeof NutritionGoalsFormSchema>;
