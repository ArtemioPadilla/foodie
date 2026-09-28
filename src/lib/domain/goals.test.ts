import { describe, expect, it } from 'vitest';
import { DEFAULT_GOALS, GOAL_FIELDS, GOAL_RANGES, NutritionGoalsFormSchema, NutritionGoalsSchema, createNutritionGoalsFormSchema } from '@/schemas';
import { GOAL_PRESETS, GOAL_PRESET_VALUES, macroCalories, macroSplit, toGoalsFormValues } from './goals';

describe('goals form schema (roadmap #032)', () => {
  it('accepts the defaults and every preset, producing valid stored goals', () => {
    for (const values of [toGoalsFormValues(DEFAULT_GOALS), ...GOAL_PRESETS.map((p) => GOAL_PRESET_VALUES[p])]) {
      const parsed = NutritionGoalsFormSchema.parse(values);
      expect(NutritionGoalsSchema.safeParse(parsed).success).toBe(true);
    }
  });

  it('rejects values outside each range, NaN and missing goals', () => {
    for (const field of GOAL_FIELDS) {
      const base = toGoalsFormValues(DEFAULT_GOALS);
      const { min, max } = GOAL_RANGES[field];
      expect(NutritionGoalsFormSchema.safeParse({ ...base, [field]: max + 1 }).success).toBe(false);
      if (min > 0) expect(NutritionGoalsFormSchema.safeParse({ ...base, [field]: min - 1 }).success).toBe(false);
      expect(NutritionGoalsFormSchema.safeParse({ ...base, [field]: Number.NaN }).success).toBe(false);
      expect(NutritionGoalsFormSchema.safeParse({ ...base, [field]: null }).success).toBe(false);
    }
  });

  it('uses the injected (localised) message for both kinds of error', () => {
    const schema = createNutritionGoalsFormSchema((field, r) => `${field}:${r.min}-${r.max}`);
    const result = schema.safeParse({ ...toGoalsFormValues(DEFAULT_GOALS), calories: 99_999, fat: null });
    expect(result.success).toBe(false);
    const messages = Object.fromEntries(result.error!.issues.map((i) => [i.path[0], i.message]));
    expect(messages).toEqual({ calories: 'calories:800-6000', fat: 'fat:10-300' });
  });
});

describe('goals helpers (roadmap #032)', () => {
  it('toGoalsFormValues fills the optional goals from the defaults', () => {
    expect(toGoalsFormValues({ calories: 1800, protein: 90, carbs: 200, fat: 60, fiber: 28 })).toEqual({
      calories: 1800, protein: 90, carbs: 200, fat: 60, fiber: 28,
      sugar: DEFAULT_GOALS.sugar, sodium: DEFAULT_GOALS.sodium, water: DEFAULT_GOALS.water,
    });
  });

  it('maintenance is the legacy default; deficit/surplus sit below/above it', () => {
    expect(GOAL_PRESET_VALUES.maintenance).toEqual(toGoalsFormValues(DEFAULT_GOALS));
    expect(GOAL_PRESET_VALUES.deficit.calories).toBe(DEFAULT_GOALS.calories - 500);
    expect(GOAL_PRESET_VALUES.surplus.calories).toBe(DEFAULT_GOALS.calories + 300);
    for (const preset of ['deficit', 'surplus'] as const) {
      const v = GOAL_PRESET_VALUES[preset];
      expect(Math.abs(macroCalories(v) - v.calories) / v.calories).toBeLessThanOrEqual(0.01);
    }
  });

  it('macroSplit converts grams to kcal and percentages summing to 100', () => {
    const split = macroSplit(DEFAULT_GOALS);
    expect(split.map((m) => [m.key, m.kcal])).toEqual([['protein', 200], ['carbs', 1000], ['fat', 630]]);
    expect(split.reduce((s, m) => s + m.percentage, 0)).toBe(100);
    expect(macroSplit({ protein: 1, carbs: 1, fat: 0 }).map((m) => m.percentage)).toEqual([50, 50, 0]);
    expect(macroSplit({ protein: 10, carbs: 10, fat: 10 }).reduce((s, m) => s + m.percentage, 0)).toBe(100);
  });

  it('macroSplit treats empty or invalid amounts as 0', () => {
    expect(macroSplit({ protein: null, carbs: Number.NaN, fat: -3 }).every((m) => m.kcal === 0 && m.percentage === 0)).toBe(true);
  });
});
