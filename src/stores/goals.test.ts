// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_GOALS } from '@/schemas';
import { $goals, resetGoalsToDefaults, setGoals } from './goals';

beforeEach(() => {
  localStorage.clear();
  resetGoalsToDefaults();
});

describe('$goals', () => {
  it('loads with default goals when no localStorage data', () => {
    const goals = $goals.get();
    expect(goals.calories).toBe(2000);
    expect(goals.protein).toBe(50);
    expect(goals.carbs).toBe(250);
    expect(goals.fat).toBe(70);
    expect(goals.fiber).toBe(25);
  });

  it('loads goals from localStorage if available', async () => {
    localStorage.setItem('nutritionGoals', JSON.stringify({ ...DEFAULT_GOALS, calories: 1800, protein: 80 }));
    vi.resetModules();
    const fresh = await import('./goals');
    expect(fresh.$goals.get().calories).toBe(1800);
    expect(fresh.$goals.get().protein).toBe(80);
  });

  it('updates goals (partial merge)', () => {
    setGoals({ calories: 2500 });
    expect($goals.get().calories).toBe(2500);
    expect($goals.get().protein).toBe(50);
  });

  it('resets goals to defaults', () => {
    setGoals({ calories: 3000, protein: 100 });
    resetGoalsToDefaults();
    expect($goals.get()).toEqual(DEFAULT_GOALS);
  });

  it('persists goals to localStorage under "nutritionGoals"', () => {
    setGoals({ calories: 2500 });
    expect(JSON.parse(localStorage.getItem('nutritionGoals')!).calories).toBe(2500);
  });
});
