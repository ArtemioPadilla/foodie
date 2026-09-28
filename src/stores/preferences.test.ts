// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PREFERENCES } from '@/schemas';
import { fakeUser } from '@/tests/fixtures/auth-user';
import { $mergeNotice, $mergedAccounts, resetAccountMergeForTests, undoMerge } from './account-merge';
import { $theme } from './theme';
import { $user } from './user';
import {
  $dietaryRestrictions,
  $preferences,
  PREFERENCES_KEY,
  $themePreference,
  preferencesKeyFor,
  $unitSystem,
  normalizeThemePreference,
  resetPreferences,
  resolveTheme,
  setDefaultServings,
  setDietaryRestrictions,
  setThemePreference,
  setUnitSystem,
  systemPrefersDark,
  toggleThemePreference,
  updatePreferences,
} from './preferences';

beforeEach(() => {
  $user.set(null);
  localStorage.clear();
  resetPreferences();
  $mergedAccounts.set([]);
  resetAccountMergeForTests();
  localStorage.clear();
  $theme.set('light');
});

describe('$preferences', () => {
  it('defaults to DEFAULT_PREFERENCES and persists under "foodie:preferences" (new key, ADR 0002 prefix)', () => {
    expect(PREFERENCES_KEY).toBe('foodie:preferences');
    expect($preferences.get()).toEqual(DEFAULT_PREFERENCES);
    setUnitSystem('metric');
    expect(JSON.parse(localStorage.getItem('foodie:preferences')!).unitSystem).toBe('metric');
  });

  it('hydrates from storage on import', async () => {
    localStorage.setItem('foodie:preferences', JSON.stringify({ ...DEFAULT_PREFERENCES, unitSystem: 'imperial' }));
    vi.resetModules();
    const fresh = await import('./preferences');
    expect(fresh.$unitSystem.get()).toBe('imperial');
  });

  it('exposes unitSystem / dietaryRestrictions / theme choice as computed stores', () => {
    setUnitSystem('imperial');
    setDietaryRestrictions(['vegan', 'gluten-free']);
    setDefaultServings(4);
    updatePreferences({ allergies: ['peanut'] });
    expect($unitSystem.get()).toBe('imperial');
    expect($dietaryRestrictions.get()).toEqual(['vegan', 'gluten-free']);
    expect($preferences.get().defaultServings).toBe(4);
    expect($preferences.get().allergies).toEqual(['peanut']);
    expect($themePreference.get()).toBe('system');
  });
});

describe('theme preference', () => {
  it('resolveTheme follows the OS only for "system"', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
    expect(resolveTheme('light', true)).toBe('light');
  });

  it('normalizeThemePreference treats unknown legacy values as "system"', () => {
    expect(normalizeThemePreference('auto')).toBe('system');
    expect(normalizeThemePreference('dark')).toBe('dark');
  });

  it('systemPrefersDark reads matchMedia (false in jsdom polyfill)', () => {
    expect(systemPrefersDark()).toBe(false);
  });

  it('setThemePreference records the choice and applies it to $theme, <html> and localStorage.theme', () => {
    setThemePreference('dark');
    expect($preferences.get().theme).toBe('dark');
    expect($theme.get()).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('"system" resolves through prefers-color-scheme and clears localStorage.theme', () => {
    localStorage.setItem('theme', 'dark');
    const mm = vi.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) => ({ matches: true, media: query }) as MediaQueryList,
    );
    setThemePreference('system');
    expect($theme.get()).toBe('dark');
    expect(localStorage.getItem('theme')).toBeNull();
    expect($themePreference.get()).toBe('system');
    mm.mockRestore();
  });

  it('toggleThemePreference flips the resolved theme as an explicit choice', () => {
    toggleThemePreference();
    expect($theme.get()).toBe('dark');
    expect($preferences.get().theme).toBe('dark');
    toggleThemePreference();
    expect($theme.get()).toBe('light');
  });
});

describe('$preferences per user (roadmap #037)', () => {
  const stored = (key: string) => JSON.parse(localStorage.getItem(key) ?? 'null') as typeof DEFAULT_PREFERENCES | null;

  it('the key follows $user: user-preferences-${uid} signed in, foodie:preferences as a guest', () => {
    expect($preferences.key).toBe(PREFERENCES_KEY);
    $user.set(fakeUser('u1'));
    expect($preferences.key).toBe('user-preferences-u1');
    expect(preferencesKeyFor('u1')).toBe('user-preferences-u1');
    expect(preferencesKeyFor(null)).toBe(PREFERENCES_KEY);
    $user.set(null);
    expect($preferences.key).toBe(PREFERENCES_KEY);
  });

  it('reads a v1 account object (legacy shape, missing fields filled) and writes back there', () => {
    const v1 = { language: 'es', theme: 'light', defaultServings: 4, dietaryRestrictions: ['vegan'], allergies: [], excludedIngredients: [] };
    localStorage.setItem('user-preferences-u1', JSON.stringify(v1));
    $user.set(fakeUser('u1'));
    expect($preferences.get()).toEqual({ ...v1, unitSystem: 'auto' });
    setUnitSystem('metric');
    expect(stored('user-preferences-u1')?.unitSystem).toBe('metric');
    expect(stored(PREFERENCES_KEY)).toBeNull();
  });

  it('an account with its own preferences keeps them; the guest ones stay for signing out', () => {
    setUnitSystem('imperial');
    localStorage.setItem('user-preferences-u1', JSON.stringify({ ...DEFAULT_PREFERENCES, unitSystem: 'metric' }));
    $user.set(fakeUser('u1'));
    expect($unitSystem.get()).toBe('metric');
    expect($mergeNotice.get()).toBeNull();
    $user.set(null);
    expect($unitSystem.get()).toBe('imperial');
  });

  it('a first sign-in adopts the guest preferences once, with undo back to none stored', () => {
    setDietaryRestrictions(['vegetarian']);
    $user.set(fakeUser('u2'));
    expect($dietaryRestrictions.get()).toEqual(['vegetarian']);
    expect(stored('user-preferences-u2')?.dietaryRestrictions).toEqual(['vegetarian']);
    expect($mergeNotice.get()).toEqual({ uid: 'u2', favoritesAdded: 0, preferencesAdopted: true });

    expect(undoMerge()).toBe(true);
    expect($preferences.get()).toEqual(DEFAULT_PREFERENCES);
    expect(localStorage.getItem('user-preferences-u2')).toBeNull();
    expect(stored(PREFERENCES_KEY)?.dietaryRestrictions).toEqual(['vegetarian']);
  });

  it('untouched guest defaults are not "merged"', () => {
    $user.set(fakeUser('u3'));
    expect($mergeNotice.get()).toBeNull();
    expect($mergedAccounts.get()).not.toContain('u3');
  });
});
