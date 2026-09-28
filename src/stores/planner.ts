import { computed } from 'nanostores';
import {
  MealPlanSchema,
  SavedMealPlansSchema,
  type MainMealSlot,
  type MealPlan,
  type MealSlot,
  type PlanDay,
} from '@/schemas';
import { persistentAtom } from '@/lib/persist';
import { notifyQuotaExceeded } from './storage-status';

/**
 * Meal planner state (port of `PlannerContext` + the localStorage writes that
 * `PlanTemplates.tsx` used to do by hand). Two persisted atoms, same keys as
 * the legacy app:
 *   - `currentMealPlan`  → `$currentPlan` (`null` when the user has no plan)
 *   - `savedMealPlans`   → `$savedPlans` (templates / saved copies)
 */
export const CURRENT_PLAN_KEY = 'currentMealPlan';
export const SAVED_PLANS_KEY = 'savedMealPlans';

export const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

/** Slot names accepted by `addRecipeToPlan` / `removeRecipeFromPlan`. */
export type PlanSlot = MainMealSlot | 'snacks';

export const $currentPlan = persistentAtom<MealPlan | null>(CURRENT_PLAN_KEY, MealPlanSchema.nullable(), null, {
  onQuotaExceeded: notifyQuotaExceeded,
});

export const $savedPlans = persistentAtom<MealPlan[]>(SAVED_PLANS_KEY, SavedMealPlansSchema, [], {
  onQuotaExceeded: notifyQuotaExceeded,
});

export const $hasPlan = computed($currentPlan, (plan) => plan !== null);
export const $currentPlanMealCount = computed($currentPlan, (plan) => (plan ? getMealCount(plan) : 0));

/** Number of filled slots across the plan (from `PlanTemplates.getMealCount`). */
export function getMealCount(plan: MealPlan): number {
  return plan.days.reduce((count, day) => {
    const { breakfast, lunch, dinner, snacks } = day.meals;
    return count + (breakfast ? 1 : 0) + (lunch ? 1 : 0) + (dinner ? 1 : 0) + (snacks?.length ?? 0);
  }, 0);
}

export function emptyWeek(): PlanDay[] {
  return WEEKDAYS.map((dayName, i) => ({ dayNumber: i + 1, dayName, meals: {} }));
}

/** Start a fresh 7-day plan (legacy `createPlan` defaults) and make it current. */
export function createPlan(input: Partial<MealPlan> = {}, now: Date = new Date()): MealPlan {
  const plan: MealPlan = {
    id: input.id ?? `plan_${now.getTime()}`,
    name: input.name ?? { en: 'New Plan', es: 'Nuevo Plan', fr: 'Nouveau Plan' },
    description: input.description ?? { en: '', es: '', fr: '' },
    servings: input.servings ?? 2,
    dietaryRestrictions: input.dietaryRestrictions ?? [],
    difficulty: input.difficulty ?? 'easy',
    estimatedCost: input.estimatedCost ?? 0,
    currency: input.currency ?? 'USD',
    days: input.days ?? emptyWeek(),
    tags: input.tags ?? [],
    isPublic: input.isPublic ?? false,
    createdAt: input.createdAt ?? now.toISOString(),
  };
  $currentPlan.set(plan);
  return plan;
}

export function updatePlan(updates: Partial<MealPlan>): void {
  const plan = $currentPlan.get();
  if (!plan) return;
  $currentPlan.set({ ...plan, ...updates });
}

function updateDay(dayIndex: number, mutate: (day: PlanDay) => PlanDay): void {
  const plan = $currentPlan.get();
  if (!plan || !plan.days[dayIndex]) return;
  const days = plan.days.map((day, i) => (i === dayIndex ? mutate(day) : day));
  $currentPlan.set({ ...plan, days });
}

/** Set a main meal, or append a snack when `slot === 'snacks'`. */
export function addRecipeToPlan(dayIndex: number, slot: PlanSlot, recipeId: string, servings: number): void {
  updateDay(dayIndex, (day) => {
    if (slot === 'snacks') {
      return { ...day, meals: { ...day.meals, snacks: [...(day.meals.snacks ?? []), { recipeId, servings }] } };
    }
    return { ...day, meals: { ...day.meals, [slot]: { recipeId, servings } } };
  });
}

/**
 * Clear a main meal, or the snacks. With `snackIndex` only that snack is
 * removed (legacy always cleared every snack).
 */
export function removeRecipeFromPlan(dayIndex: number, slot: PlanSlot, snackIndex?: number): void {
  updateDay(dayIndex, (day) => {
    const meals = { ...day.meals };
    if (slot === 'snacks') {
      meals.snacks =
        snackIndex === undefined ? [] : (meals.snacks ?? []).filter((_, i) => i !== snackIndex);
    } else {
      delete meals[slot];
    }
    return { ...day, meals };
  });
}

/** Copy `fromIndex`'s meals onto `toIndex` (deep copy, keeps the target's name/notes). */
export function duplicateDay(fromIndex: number, toIndex: number): void {
  const plan = $currentPlan.get();
  const source = plan?.days[fromIndex];
  if (!plan || !source || fromIndex === toIndex) return;
  updateDay(toIndex, (day) => ({ ...day, meals: structuredClone(source.meals) }));
}

/** A filled position in the plan: a main meal, or one snack by index. */
export interface MealLocation {
  dayIndex: number;
  slot: PlanSlot;
  /** Required to address one snack; ignored for main meals. */
  snackIndex?: number;
}

function readMeal(day: PlanDay, location: MealLocation): MealSlot | undefined {
  if (location.slot === 'snacks') return day.meals.snacks?.[location.snackIndex ?? 0];
  return day.meals[location.slot];
}

/** Remove the meal at `location` from `day` (immutable). */
function withoutMeal(day: PlanDay, location: MealLocation): PlanDay {
  const meals = { ...day.meals };
  if (location.slot === 'snacks') {
    const index = location.snackIndex ?? 0;
    meals.snacks = (meals.snacks ?? []).filter((_, i) => i !== index);
  } else {
    delete meals[location.slot];
  }
  return { ...day, meals };
}

/** Put `meal` at `location` (main slot: replace; snacks: insert at `snackIndex` or append). */
function withMeal(day: PlanDay, location: MealLocation, meal: MealSlot): PlanDay {
  if (location.slot === 'snacks') {
    const snacks = [...(day.meals.snacks ?? [])];
    const index = location.snackIndex ?? snacks.length;
    snacks.splice(Math.min(index, snacks.length), 0, meal);
    return { ...day, meals: { ...day.meals, snacks } };
  }
  return { ...day, meals: { ...day.meals, [location.slot]: meal } };
}

/**
 * Move a meal to another slot (planner drag and drop, roadmap Issue 024).
 *
 * - Target is `snacks` → the meal is appended to that day's snacks.
 * - Target is an empty main slot → the meal moves there.
 * - Target is an occupied main slot → the two meals **swap** (the displaced
 *   meal takes the source position), so a drop never destroys data.
 *
 * Returns `false` (and changes nothing) when there is no plan, no meal at
 * `from`, an out-of-range day, or `from` and `to` are the same slot.
 */
export function moveMeal(from: MealLocation, to: Pick<MealLocation, 'dayIndex' | 'slot'>): boolean {
  const plan = $currentPlan.get();
  const sourceDay = plan?.days[from.dayIndex];
  if (!plan || !sourceDay || !plan.days[to.dayIndex]) return false;
  const meal = readMeal(sourceDay, from);
  if (!meal) return false;
  if (from.dayIndex === to.dayIndex && from.slot === to.slot) return false;

  const days = [...plan.days];
  days[from.dayIndex] = withoutMeal(sourceDay, from);
  const targetDay = days[to.dayIndex] as PlanDay;
  const displaced = to.slot === 'snacks' ? undefined : targetDay.meals[to.slot];
  days[to.dayIndex] = withMeal(targetDay, { dayIndex: to.dayIndex, slot: to.slot }, meal);
  if (displaced) {
    days[from.dayIndex] = withMeal(days[from.dayIndex] as PlanDay, from, displaced);
  }
  $currentPlan.set({ ...plan, days });
  return true;
}

/** Per-meal servings (the −/＋ of a filled slot). Non-positive values are ignored. */
export function setMealServings(location: MealLocation, servings: number): void {
  if (!(servings > 0)) return;
  updateDay(location.dayIndex, (day) => {
    const meal = readMeal(day, location);
    if (!meal || meal.servings === servings) return day;
    if (location.slot === 'snacks') {
      const index = location.snackIndex ?? 0;
      const snacks = (day.meals.snacks ?? []).map((s, i) => (i === index ? { ...s, servings } : s));
      return { ...day, meals: { ...day.meals, snacks } };
    }
    return { ...day, meals: { ...day.meals, [location.slot]: { ...meal, servings } } };
  });
}

/** Empty every slot of one day (keeps its name and notes). */
export function clearDay(dayIndex: number): void {
  updateDay(dayIndex, (day) => ({ ...day, meals: {} }));
}

export function adjustGlobalServings(servings: number): void {
  if (servings <= 0) return;
  updatePlan({ servings });
}

/** Upsert the current plan into `savedMealPlans` (legacy `savePlan`). */
export function savePlan(now: Date = new Date()): MealPlan | null {
  const plan = $currentPlan.get();
  if (!plan) return null;
  const stamped = { ...plan, updatedAt: now.toISOString() };
  const saved = $savedPlans.get();
  const index = saved.findIndex((p) => p.id === stamped.id);
  $savedPlans.set(index >= 0 ? saved.map((p, i) => (i === index ? stamped : p)) : [...saved, stamped]);
  $currentPlan.set(stamped);
  return stamped;
}

/** Make a saved plan current. Returns `false` when the id is unknown. */
export function loadPlan(planId: string): boolean {
  const plan = $savedPlans.get().find((p) => p.id === planId);
  if (!plan) return false;
  $currentPlan.set(structuredClone(plan));
  return true;
}

export function clearPlan(): void {
  $currentPlan.set(null);
}

/**
 * Save a copy of the current plan under a new name/id (from `PlanTemplates`).
 * The current plan is left untouched.
 */
export function saveAsTemplate(name: string, now: Date = new Date()): MealPlan | null {
  const plan = $currentPlan.get();
  const trimmed = name.trim();
  if (!plan || !trimmed) return null;
  const template: MealPlan = {
    ...structuredClone(plan),
    id: `template_${now.getTime()}`,
    name: { en: trimmed, es: trimmed, fr: trimmed },
    createdAt: now.toISOString(),
  };
  $savedPlans.set([...$savedPlans.get(), template]);
  return template;
}

export function deleteSavedPlan(planId: string): void {
  $savedPlans.set($savedPlans.get().filter((p) => p.id !== planId));
}
