// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { LOCALE_PREFERENCE_KEY, rememberLocale } from './locale-preference';

describe('rememberLocale', () => {
  afterEach(() => localStorage.clear());

  it('stores the bare locale code under foodie:locale', () => {
    expect(LOCALE_PREFERENCE_KEY).toBe('foodie:locale');
    expect(rememberLocale('fr')).toBe(true);
    expect(localStorage.getItem('foodie:locale')).toBe('fr');
  });

  it('ignores an empty code and survives a throwing storage', () => {
    expect(rememberLocale('')).toBe(false);
    expect(localStorage.getItem('foodie:locale')).toBeNull();
    const throwing = { setItem: () => { throw new Error('QuotaExceededError'); } };
    expect(rememberLocale('es', throwing)).toBe(false);
    expect(rememberLocale('es', null)).toBe(false);
  });
});
