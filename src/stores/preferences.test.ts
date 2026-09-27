// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PREFERENCES } from '@/schemas';
import { $theme } from './theme';
import {
  $dietaryRestrictions,
  $preferences,
  PREFERENCES_KEY,
  $themePreference,
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
  localStorage.clear();
  resetPreferences();
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
