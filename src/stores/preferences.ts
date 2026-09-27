import { computed } from 'nanostores';
import {
  DEFAULT_PREFERENCES,
  ThemePreferenceSchema,
  UserPreferencesSchema,
  type ThemePreference,
  type UnitSystem,
  type UserPreferences,
} from '@/schemas';
import { persistentAtom } from '@/lib/persist';
import { $theme, followSystemTheme, setTheme, systemPrefersDark, type Theme } from './theme';
import { notifyQuotaExceeded } from './storage-status';

/**
 * Guest preferences (unit system, dietary restrictions, theme choice…).
 * Legacy stored these only per signed-in user (`user-preferences-<uid>`, see
 * `AuthContext`); the auth issue (Issue 037) swaps the key on sign-in via
 * `persistentAtom`'s `migrate`. The guest key is new, so it takes the
 * `foodie:` prefix (ADR 0002, "New keys"). `theme` here is the user's
 * *choice* (`light | dark | system`); the resolved value lives in `$theme`
 * (`localStorage['theme']`, applied before first paint by BaseLayout).
 */
export const PREFERENCES_KEY = 'foodie:preferences';

export const $preferences = persistentAtom<UserPreferences>(
  PREFERENCES_KEY,
  UserPreferencesSchema,
  DEFAULT_PREFERENCES,
  { onQuotaExceeded: notifyQuotaExceeded },
);

export const $unitSystem = computed($preferences, (p) => p.unitSystem);
export const $dietaryRestrictions = computed($preferences, (p) => p.dietaryRestrictions);
export const $themePreference = computed($preferences, (p) => normalizeThemePreference(p.theme));

/** Re-exported so islands can read the OS preference without importing two stores. */
export { systemPrefersDark };

export function updatePreferences(updates: Partial<UserPreferences>): void {
  $preferences.set({ ...$preferences.get(), ...updates });
}

export function setUnitSystem(unitSystem: UnitSystem): void {
  updatePreferences({ unitSystem });
}

export function setDietaryRestrictions(dietaryRestrictions: string[]): void {
  updatePreferences({ dietaryRestrictions });
}

export function setDefaultServings(defaultServings: number): void {
  updatePreferences({ defaultServings });
}

export function resetPreferences(): void {
  $preferences.set(DEFAULT_PREFERENCES);
}

// ── Theme ─────────────────────────────────────────────────────────────────────

/** Unknown/legacy strings (e.g. `auto`) count as `system`. */
export function normalizeThemePreference(value: string): ThemePreference {
  const parsed = ThemePreferenceSchema.safeParse(value);
  return parsed.success ? parsed.data : 'system';
}

/** Pure: which concrete theme a preference maps to. */
export function resolveTheme(preference: string, prefersDark: boolean): Theme {
  const pref = normalizeThemePreference(preference);
  if (pref === 'system') return prefersDark ? 'dark' : 'light';
  return pref;
}

/**
 * Record the choice and apply it. `system` hands over to `followSystemTheme`,
 * which removes `localStorage['theme']` so BaseLayout's inline script keeps
 * following the OS on the next load — that is how "respect
 * prefers-color-scheme the first time" stays true after the user has toggled
 * and then gone back to `system`.
 */
export function setThemePreference(preference: ThemePreference): void {
  updatePreferences({ theme: preference });
  if (preference === 'system') followSystemTheme();
  else setTheme(preference);
}

/** Flip between light and dark as an explicit choice (legacy `toggleTheme`). */
export function toggleThemePreference(): void {
  setThemePreference($theme.get() === 'dark' ? 'light' : 'dark');
}
