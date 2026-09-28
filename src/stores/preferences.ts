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
import { $user } from './user';

/**
 * User preferences (unit system, dietary restrictions, theme choice…).
 *
 * The storage key follows the session (roadmap Issue 037, `persistentAtom`'s
 * reactive key): guests use `foodie:preferences` (new key, `foodie:` prefix
 * per ADR 0002 "New keys"); a signed-in user uses the legacy per-account key
 * `user-preferences-${uid}` (written by v1's `AuthContext`, so v1 accounts
 * find their preferences again). Signing out switches back to the guest key,
 * whose data is never touched by signing in; the one-time guest → account
 * merge lives in `./account-merge`. `theme` here is the user's *choice*
 * (`light | dark | system`); the resolved value lives in `$theme`
 * (`localStorage['theme']`, applied before first paint by BaseLayout).
 */
export const PREFERENCES_KEY = 'foodie:preferences';

/** The key `$preferences` uses for a session (`null` = guest). */
export function preferencesKeyFor(uid: string | null | undefined): string {
  return uid ? `user-preferences-${uid}` : PREFERENCES_KEY;
}

/** v1 per-account objects written before a field existed: fill it with the default. */
function withDefaults(raw: unknown): UserPreferences {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('not a preferences object');
  return { ...DEFAULT_PREFERENCES, ...(raw as Partial<UserPreferences>) };
}

export const $preferences = persistentAtom<UserPreferences>(
  () => preferencesKeyFor($user.get()?.uid),
  UserPreferencesSchema,
  DEFAULT_PREFERENCES,
  { onQuotaExceeded: notifyQuotaExceeded, migrate: withDefaults, keyDeps: [$user] },
);

export const $unitSystem = computed($preferences, (p) => p.unitSystem);
export const $dietaryRestrictions = computed($preferences, (p) => p.dietaryRestrictions);
/** Currency costs are shown in and custom prices are entered in (Issue 041). */
export const $currency = computed($preferences, (p) => p.currency);
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

export function setCurrency(currency: string): void {
  updatePreferences({ currency });
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
