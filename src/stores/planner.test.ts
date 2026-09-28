// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MealPlanSchema } from '@/schemas';
import { makePlan } from '@/tests/fixtures/foodie-domain';
import {
  $currentPlan,
  $currentPlanMealCount,
  $hasPlan,
  $savedPlans,
  addRecipeToPlan,
  adjustGlobalServings,
  clearDay,
  clearPlan,
  createPlan,
  deleteSavedPlan,
  duplicateDay,
  getMealCount,
  loadPlan,
  moveMeal,
  removeRecipeFromPlan,
  saveAsTemplate,
  savePlan,
  setMealServings,
  updatePlan,
} from './planner';

beforeEach(() => {
  localStorage.clear();
  $currentPlan.set(null);
  $savedPlans.set([]);
});

describe('persistence', () => {
  it('writes "currentMealPlan" and "savedMealPlans" (legacy keys)', () => {
    createPlan();
    savePlan();
    expect(JSON.parse(localStorage.getItem('currentMealPlan')!).id).toMatch(/^plan_/);
    expect(JSON.parse(localStorage.getItem('savedMealPlans')!)).toHaveLength(1);
  });

  it('hydrates a legacy plan written by PlannerContext.createPlan', async () => {
    const legacy = {
      id: 'plan_1700000000000',
      name: { en: 'New Plan', es: 'Nuevo Plan', fr: 'Nouveau Plan' },
      description: { en: '', es: '', fr: '' },
      servings: 2,
      dietaryRestrictions: [],
      difficulty: 'easy',
      estimatedCost: 0,
      currency: 'USD',
      days: Array.from({ length: 7 }, (_, i) => ({ dayNumber: i + 1, dayName: 'monday', meals: {} })),
      tags: [],
      isPublic: false,
    };
    localStorage.setItem('currentMealPlan', JSON.stringify(legacy));
    localStorage.setItem('savedMealPlans', JSON.stringify([legacy]));
    vi.resetModules();
    const fresh = await import('./planner');
    expect(fresh.$currentPlan.get()?.id).toBe('plan_1700000000000');
    expect(fresh.$savedPlans.get()).toHaveLength(1);
    expect(fresh.$hasPlan.get()).toBe(true);
  });
});

describe('createPlan / updatePlan / clearPlan', () => {
  it('creates a schema-valid 7-day plan with legacy defaults', () => {
    const plan = createPlan({}, new Date(1700000000000));
    expect(MealPlanSchema.safeParse(plan).success).toBe(true);
    expect(plan.id).toBe('plan_1700000000000');
    expect(plan.days.map((d) => d.dayName)).toEqual(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);
    expect(plan.servings).toBe(2);
    expect(plan.name.es).toBe('Nuevo Plan');
    expect($currentPlan.get()).toEqual(plan);
    expect($hasPlan.get()).toBe(true);
  });

  it('honours the provided fields', () => {
    const plan = createPlan({ name: { en: 'Keto', es: 'Keto', fr: 'Keto' }, servings: 4, tags: ['keto'] });
    expect(plan.servings).toBe(4);
    expect(plan.tags).toEqual(['keto']);
  });

  it('updatePlan merges into the current plan and is a no-op without one', () => {
    updatePlan({ servings: 9 });
    expect($currentPlan.get()).toBeNull();
    createPlan();
    updatePlan({ difficulty: 'hard' });
    expect($currentPlan.get()?.difficulty).toBe('hard');
  });

  it('clearPlan removes the current plan', () => {
    createPlan();
    clearPlan();
    expect($currentPlan.get()).toBeNull();
    expect($hasPlan.get()).toBe(false);
    expect(localStorage.getItem('currentMealPlan')).toBe('null');
  });
});

describe('addRecipeToPlan / removeRecipeFromPlan', () => {
  beforeEach(() => {
    createPlan();
  });

  it('sets a main meal slot immutably', () => {
    const before = $currentPlan.get();
    addRecipeToPlan(0, 'breakfast', 'rec_001', 2);
    const after = $currentPlan.get();
    expect(after?.days[0]?.meals.breakfast).toEqual({ recipeId: 'rec_001', servings: 2 });
    expect(after).not.toBe(before);
    expect(before?.days[0]?.meals.breakfast).toBeUndefined();
  });

  it('appends snacks', () => {
    addRecipeToPlan(2, 'snacks', 'rec_001', 1);
    addRecipeToPlan(2, 'snacks', 'rec_002', 1);
    expect($currentPlan.get()?.days[2]?.meals.snacks).toHaveLength(2);
  });

  it('ignores out-of-range days and missing plans', () => {
    addRecipeToPlan(42, 'lunch', 'rec_001', 1);
    expect(getMealCount($currentPlan.get()!)).toBe(0);
    clearPlan();
    expect(() => addRecipeToPlan(0, 'lunch', 'rec_001', 1)).not.toThrow();
  });

  it('removes a main meal, all snacks, or a single snack', () => {
    addRecipeToPlan(0, 'dinner', 'rec_001', 2);
    addRecipeToPlan(0, 'snacks', 'rec_002', 1);
    addRecipeToPlan(0, 'snacks', 'rec_003', 1);
    removeRecipeFromPlan(0, 'dinner');
    expect($currentPlan.get()?.days[0]?.meals.dinner).toBeUndefined();
    removeRecipeFromPlan(0, 'snacks', 0);
    expect($currentPlan.get()?.days[0]?.meals.snacks).toEqual([{ recipeId: 'rec_003', servings: 1 }]);
    removeRecipeFromPlan(0, 'snacks');
    expect($currentPlan.get()?.days[0]?.meals.snacks).toEqual([]);
  });

  it('$currentPlanMealCount counts every filled slot', () => {
    addRecipeToPlan(0, 'breakfast', 'a', 1);
    addRecipeToPlan(0, 'lunch', 'b', 1);
    addRecipeToPlan(1, 'snacks', 'c', 1);
    addRecipeToPlan(1, 'snacks', 'd', 1);
    expect($currentPlanMealCount.get()).toBe(4);
  });
});

describe('duplicateDay / adjustGlobalServings', () => {
  it('deep-copies meals onto the target day and keeps the target name', () => {
    createPlan();
    addRecipeToPlan(0, 'lunch', 'rec_001', 2);
    addRecipeToPlan(0, 'snacks', 'rec_002', 1);
    duplicateDay(0, 3);
    const target = $currentPlan.get()?.days[3];
    expect(target?.dayName).toBe('thursday');
    expect(target?.meals).toEqual($currentPlan.get()?.days[0]?.meals);
    expect(target?.meals.snacks).not.toBe($currentPlan.get()?.days[0]?.meals.snacks);
  });

  it('adjustGlobalServings updates servings and rejects non-positive values', () => {
    createPlan();
    adjustGlobalServings(6);
    expect($currentPlan.get()?.servings).toBe(6);
    adjustGlobalServings(0);
    expect($currentPlan.get()?.servings).toBe(6);
  });
});

describe('savePlan / loadPlan / templates', () => {
  it('savePlan upserts by id into savedMealPlans', () => {
    createPlan();
    savePlan();
    updatePlan({ servings: 3 });
    savePlan();
    expect($savedPlans.get()).toHaveLength(1);
    expect($savedPlans.get()[0]?.servings).toBe(3);
    expect($savedPlans.get()[0]?.updatedAt).toBeDefined();
    expect(savePlan()).not.toBeNull();
  });

  it('savePlan without a plan returns null', () => {
    expect(savePlan()).toBeNull();
    expect($savedPlans.get()).toEqual([]);
  });

  it('loadPlan makes a saved plan current (copy) and reports unknown ids', () => {
    $savedPlans.set([makePlan({ id: 'saved_1' })]);
    expect(loadPlan('saved_1')).toBe(true);
    expect($currentPlan.get()?.id).toBe('saved_1');
    expect($currentPlan.get()).not.toBe($savedPlans.get()[0]);
    expect(loadPlan('missing')).toBe(false);
  });

  it('saveAsTemplate stores a renamed copy without changing the current plan', () => {
    createPlan();
    addRecipeToPlan(0, 'lunch', 'rec_001', 2);
    const template = saveAsTemplate('  Weekday  ', new Date(1700000000000));
    expect(template?.id).toBe('template_1700000000000');
    expect(template?.name).toEqual({ en: 'Weekday', es: 'Weekday', fr: 'Weekday' });
    expect($savedPlans.get()).toHaveLength(1);
    expect($currentPlan.get()?.id).toMatch(/^plan_/);
    expect(saveAsTemplate('   ')).toBeNull();
  });

  it('deleteSavedPlan removes by id', () => {
    $savedPlans.set([makePlan({ id: 'a' }), makePlan({ id: 'b' })]);
    deleteSavedPlan('a');
    expect($savedPlans.get().map((p) => p.id)).toEqual(['b']);
  });
});

describe('moveMeal / setMealServings / clearDay (roadmap #024)', () => {
  const meals = (dayIndex: number) => $currentPlan.get()?.days[dayIndex]?.meals;

  it('moves a meal into an empty slot of another day', () => {
    createPlan();
    addRecipeToPlan(0, 'breakfast', 'rec_001', 2);
    expect(moveMeal({ dayIndex: 0, slot: 'breakfast' }, { dayIndex: 2, slot: 'dinner' })).toBe(true);
    expect(meals(0)?.breakfast).toBeUndefined();
    expect(meals(2)?.dinner).toEqual({ recipeId: 'rec_001', servings: 2 });
    expect(MealPlanSchema.safeParse($currentPlan.get()).success).toBe(true);
  });

  it('swaps with an occupied main slot so no meal is lost', () => {
    createPlan();
    addRecipeToPlan(0, 'lunch', 'rec_001', 2);
    addRecipeToPlan(1, 'lunch', 'rec_002', 4);
    moveMeal({ dayIndex: 0, slot: 'lunch' }, { dayIndex: 1, slot: 'lunch' });
    expect(meals(0)?.lunch).toEqual({ recipeId: 'rec_002', servings: 4 });
    expect(meals(1)?.lunch).toEqual({ recipeId: 'rec_001', servings: 2 });
  });

  it('appends to snacks and moves a single snack back into its slot position on swap', () => {
    createPlan();
    addRecipeToPlan(0, 'snacks', 'a', 1);
    addRecipeToPlan(0, 'snacks', 'b', 1);
    addRecipeToPlan(3, 'dinner', 'c', 2);
    moveMeal({ dayIndex: 3, slot: 'dinner' }, { dayIndex: 0, slot: 'snacks' });
    expect(meals(0)?.snacks?.map((s) => s.recipeId)).toEqual(['a', 'b', 'c']);
    expect(meals(3)?.dinner).toBeUndefined();
    addRecipeToPlan(3, 'dinner', 'd', 2);
    moveMeal({ dayIndex: 0, slot: 'snacks', snackIndex: 0 }, { dayIndex: 3, slot: 'dinner' });
    expect(meals(3)?.dinner?.recipeId).toBe('a');
    expect(meals(0)?.snacks?.map((s) => s.recipeId)).toEqual(['d', 'b', 'c']);
  });

  it('is a no-op for the same slot, an empty source, bad days or no plan', () => {
    expect(moveMeal({ dayIndex: 0, slot: 'lunch' }, { dayIndex: 1, slot: 'lunch' })).toBe(false);
    createPlan();
    addRecipeToPlan(0, 'lunch', 'rec_001', 2);
    const before = $currentPlan.get();
    expect(moveMeal({ dayIndex: 0, slot: 'lunch' }, { dayIndex: 0, slot: 'lunch' })).toBe(false);
    expect(moveMeal({ dayIndex: 0, slot: 'dinner' }, { dayIndex: 1, slot: 'lunch' })).toBe(false);
    expect(moveMeal({ dayIndex: 0, slot: 'lunch' }, { dayIndex: 9, slot: 'lunch' })).toBe(false);
    expect($currentPlan.get()).toBe(before);
  });

  it('setMealServings updates one meal or one snack and ignores non-positive values', () => {
    createPlan();
    addRecipeToPlan(0, 'dinner', 'rec_001', 2);
    addRecipeToPlan(0, 'snacks', 'a', 1);
    addRecipeToPlan(0, 'snacks', 'b', 1);
    setMealServings({ dayIndex: 0, slot: 'dinner' }, 5);
    setMealServings({ dayIndex: 0, slot: 'snacks', snackIndex: 1 }, 3);
    setMealServings({ dayIndex: 0, slot: 'dinner' }, 0);
    expect(meals(0)?.dinner?.servings).toBe(5);
    expect(meals(0)?.snacks?.map((s) => s.servings)).toEqual([1, 3]);
    expect(JSON.parse(localStorage.getItem('currentMealPlan') ?? '{}').days[0].meals.dinner.servings).toBe(5);
  });

  it('clearDay empties one day and keeps the others', () => {
    createPlan();
    addRecipeToPlan(0, 'dinner', 'rec_001', 2);
    addRecipeToPlan(1, 'dinner', 'rec_002', 2);
    clearDay(0);
    expect(meals(0)).toEqual({});
    expect(meals(1)?.dinner?.recipeId).toBe('rec_002');
    expect($currentPlan.get()?.days[0]?.dayName).toBe('monday');
  });
});
