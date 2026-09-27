import { describe, expect, it } from 'vitest';
import { DEFAULT_GOALS } from '@/schemas';
import { makeNutrition } from '@/tests/fixtures/foodie-domain';
import { aggregateNutrition, calculateGoalProgress, createEmptyNutrition, scaleNutrition } from './nutrition';

describe('createEmptyNutrition', () => {
  it('is all zeros with a 0g serving size', () => {
    expect(createEmptyNutrition()).toEqual({
      servingSize: '0g',
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
      cholesterol: 0,
    });
  });
});

describe('scaleNutrition', () => {
  it('multiplies every macro, rounding kcal/mg to integers and grams to 0.1', () => {
    const scaled = scaleNutrition(makeNutrition({ calories: 333, protein: 10.55, sodium: 101 }), 0.5);
    expect(scaled.calories).toBe(167);
    expect(scaled.protein).toBe(5.3);
    expect(scaled.sodium).toBe(51);
    expect(scaled.servingSize).toBe('1 serving');
  });
});

describe('aggregateNutrition', () => {
  it('returns empty nutrition for an empty list', () => {
    expect(aggregateNutrition([])).toEqual(createEmptyNutrition());
  });

  it('sums every field and labels the serving size "Total"', () => {
    const total = aggregateNutrition([
      makeNutrition({ calories: 500, protein: 25 }),
      makeNutrition({ calories: 300, protein: 20 }),
    ]);
    expect(total.calories).toBe(800);
    expect(total.protein).toBe(45);
    expect(total.sodium).toBe(800);
    expect(total.servingSize).toBe('Total');
  });

  it('keeps grams at one decimal', () => {
    const total = aggregateNutrition([makeNutrition({ fat: 0.1 }), makeNutrition({ fat: 0.2 })]);
    expect(total.fat).toBe(0.3);
  });
});

describe('calculateGoalProgress', () => {
  it('computes consumed / goal / remaining / percentage per metric', () => {
    const progress = calculateGoalProgress(makeNutrition({ calories: 1000, protein: 50 }), DEFAULT_GOALS);
    expect(progress.calories).toEqual({ consumed: 1000, goal: 2000, remaining: 1000, percentage: 50 });
    expect(progress.protein.percentage).toBe(100);
  });

  it('clamps remaining at 0 when over the goal', () => {
    const progress = calculateGoalProgress(makeNutrition({ calories: 2500 }), DEFAULT_GOALS);
    expect(progress.calories.remaining).toBe(0);
    expect(progress.calories.percentage).toBe(125);
  });

  it('reports water only when a water goal exists, using the logged millilitres', () => {
    expect(calculateGoalProgress(makeNutrition(), { ...DEFAULT_GOALS, water: undefined }).water).toBeUndefined();
    expect(calculateGoalProgress(makeNutrition(), DEFAULT_GOALS, 500).water).toEqual({
      consumed: 500,
      goal: 2000,
      remaining: 1500,
      percentage: 25,
    });
  });

  it('yields 0 % when the goal is 0', () => {
    expect(calculateGoalProgress(makeNutrition(), { ...DEFAULT_GOALS, fiber: 0 }).fiber.percentage).toBe(0);
  });
});
