/**
 * Pure helpers of the goals form (roadmap Issue 032): the maintenance /
 * deficit / surplus presets, the stored-goals → form-values mapping and the
 * macro split shown in the donut preview.
 */
import {
  DEFAULT_GOALS,
  GOAL_FIELDS,
  type NutritionGoals,
  type NutritionGoalsFormValues,
} from '@/schemas';

export const GOAL_PRESETS = ['maintenance', 'deficit', 'surplus'] as const;
export type GoalPreset = (typeof GOAL_PRESETS)[number];

/**
 * Preset targets. Maintenance is the legacy default (2000 kcal); the deficit
 * (−500 kcal) and surplus (+300 kcal) raise protein and keep the macro
 * energy within ±1 % of the calorie target (4 kcal/g protein & carbs, 9 fat).
 */
export const GOAL_PRESET_VALUES: Record<GoalPreset, NutritionGoalsFormValues> = {
  maintenance: toGoalsFormValues(DEFAULT_GOALS),
  deficit: { calories: 1500, protein: 110, carbs: 150, fat: 50, fiber: 30, sugar: 35, sodium: 2300, water: 2500 },
  surplus: { calories: 2300, protein: 120, carbs: 290, fat: 75, fiber: 30, sugar: 50, sodium: 2300, water: 2500 },
};

/** Stored goals → complete form values (missing optional goals fall back to the defaults). */
export function toGoalsFormValues(goals: NutritionGoals): NutritionGoalsFormValues {
  return Object.fromEntries(
    GOAL_FIELDS.map((field) => [field, goals[field] ?? DEFAULT_GOALS[field] ?? 0]),
  ) as NutritionGoalsFormValues;
}

/** kcal per gram of each energy macro. */
export const KCAL_PER_GRAM = { protein: 4, carbs: 4, fat: 9 } as const;
export type EnergyMacro = keyof typeof KCAL_PER_GRAM;
export const ENERGY_MACROS = Object.keys(KCAL_PER_GRAM) as EnergyMacro[];

export interface MacroShare {
  key: EnergyMacro;
  grams: number;
  kcal: number;
  /** Share of the macro energy, rounded; the three add up to 100 (or all 0). */
  percentage: number;
}

/**
 * Energy split between protein, carbs and fat for the donut preview.
 * Invalid (non-finite / negative) amounts count as 0 so the preview never
 * breaks while the user is typing. Percentages use largest-remainder
 * rounding so they always sum to exactly 100.
 */
export function macroSplit(goals: Partial<Record<EnergyMacro, number | null | undefined>>): MacroShare[] {
  const rows = ENERGY_MACROS.map((key) => {
    const raw = goals[key];
    const grams = typeof raw === 'number' && Number.isFinite(raw) && raw > 0 ? raw : 0;
    return { key, grams, kcal: Math.round(grams * KCAL_PER_GRAM[key]) };
  });
  const total = rows.reduce((sum, r) => sum + r.kcal, 0);
  if (total === 0) return rows.map((r) => ({ ...r, percentage: 0 }));
  const exact = rows.map((r) => (r.kcal / total) * 100);
  const floors = exact.map(Math.floor);
  let left = 100 - floors.reduce((a, b) => a + b, 0);
  const order = exact.map((v, i) => ({ i, frac: v - Math.floor(v) })).sort((a, b) => b.frac - a.frac);
  for (const { i } of order) {
    if (left <= 0) break;
    floors[i]! += 1;
    left -= 1;
  }
  return rows.map((r, i) => ({ ...r, percentage: floors[i]! }));
}

/** Energy of the macros in kcal (to compare against the calorie goal). */
export function macroCalories(goals: Partial<Record<EnergyMacro, number | null | undefined>>): number {
  return macroSplit(goals).reduce((sum, m) => sum + m.kcal, 0);
}
