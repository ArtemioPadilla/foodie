import { DEFAULT_GOALS, NutritionGoalsSchema, type NutritionGoals } from '@/schemas';
import { persistentAtom } from '@/lib/persist';
import { notifyQuotaExceeded } from './storage-status';

/** Daily nutrition targets (legacy `TrackingContext.goals`, same key). */
export const GOALS_KEY = 'nutritionGoals';

export const $goals = persistentAtom<NutritionGoals>(GOALS_KEY, NutritionGoalsSchema, DEFAULT_GOALS, {
  onQuotaExceeded: notifyQuotaExceeded,
});

/** Merge a partial update into the current goals. */
export function setGoals(updates: Partial<NutritionGoals>): void {
  $goals.set({ ...$goals.get(), ...updates });
}

export function resetGoalsToDefaults(): void {
  $goals.set(DEFAULT_GOALS);
}
