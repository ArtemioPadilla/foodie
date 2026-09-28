// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_GOALS, DEFAULT_PREFERENCES, UserDataExportSchema } from '@/schemas';
import { MOCK_STORAGE_KEY } from '@/lib/auth/mock';
import { $favorites, addFavorite } from '@/stores/favorites';
import { $goals, setGoals } from '@/stores/goals';
import { $currentPlan, createPlan } from '@/stores/planner';
import { $preferences, setUnitSystem } from '@/stores/preferences';
import { $shopping, addShoppingItem } from '@/stores/shopping';
import { SESSION_HINT_KEY } from '@/stores/user';
import { LEGACY_GITHUB_TOKEN_KEY } from '@/lib/retired-keys';
import {
  MOCK_AUTH_KEY,
  clearUserData,
  collectUserData,
  exportFileName,
  isFoodieKey,
  listFoodieKeys,
} from './user-data';

/**
 * Export / clear my data (roadmap Issue 036, ADR 0002 §4): a single JSON of
 * every store keyed by storage key; clear wipes every Foodie key (legacy and
 * `foodie:*`, all accounts) but never the auth plumbing.
 */
beforeEach(() => {
  localStorage.clear();
  clearUserData();
});

const USER = {
  uid: 'u-1',
  email: 'cook@foodie.test',
  displayName: 'Cook',
  photoURL: null,
  emailVerified: false,
  method: 'password' as const,
  createdAt: null,
};

describe('isFoodieKey', () => {
  it('recognises legacy, per-account and foodie:* keys but not auth plumbing or strangers', () => {
    for (const key of ['theme', 'favoriteRecipes', 'nutritionGoals', 'user-preferences-abc', 'user-favorites-abc', 'foodie:locale', LEGACY_GITHUB_TOKEN_KEY]) {
      expect(isFoodieKey(key), key).toBe(true);
    }
    for (const key of [SESSION_HINT_KEY, MOCK_AUTH_KEY, 'user-preferences-', 'tanstack-query-cache', 'other-app']) {
      expect(isFoodieKey(key), key).toBe(false);
    }
  });

  it('spells the mock adapter key exactly like the adapter does', () => {
    expect(MOCK_AUTH_KEY).toBe(MOCK_STORAGE_KEY);
  });
});

describe('collectUserData', () => {
  it('exports every store keyed by storage key, plus the other Foodie keys, and validates', () => {
    addFavorite('rec_001');
    setUnitSystem('imperial');
    addShoppingItem({ ingredientId: 'ing_001', quantity: 2, unit: 'pcs', usedIn: [] });
    localStorage.setItem('user-favorites-other', JSON.stringify(['rec_009']));
    localStorage.setItem('foodie:locale', 'es');
    localStorage.setItem(LEGACY_GITHUB_TOKEN_KEY, 'gho_secret');
    localStorage.setItem(SESSION_HINT_KEY, '1');
    localStorage.setItem('unrelated', '1');

    const out = collectUserData(USER, { now: new Date('2026-01-02T03:04:05Z') });
    expect(UserDataExportSchema.safeParse(out).success).toBe(true);
    expect(out.exportedAt).toBe('2026-01-02T03:04:05.000Z');
    expect(out.account).toEqual({ uid: 'u-1', email: 'cook@foodie.test', displayName: 'Cook' });
    expect(out.data[$favorites.key]).toEqual(['rec_001']);
    expect((out.data[$preferences.key] as { unitSystem: string }).unitSystem).toBe('imperial');
    expect(out.data[$shopping.key]).toHaveLength(1);
    expect(out.data[$currentPlan.key]).toBeNull();
    expect(out.data[$goals.key]).toEqual(DEFAULT_GOALS);
    expect(out.data['user-favorites-other']).toEqual(['rec_009']);
    expect(out.data['foodie:locale']).toBe('es');
    // Never: credentials, auth plumbing, other apps' keys.
    expect(out.data).not.toHaveProperty(LEGACY_GITHUB_TOKEN_KEY);
    expect(out.data).not.toHaveProperty(SESSION_HINT_KEY);
    expect(out.data).not.toHaveProperty('unrelated');
  });

  it('marks a guest export with account: null', () => {
    expect(collectUserData(null).account).toBeNull();
  });

  it('names the file by date', () => {
    expect(exportFileName(new Date('2026-09-28T10:00:00Z'))).toBe('foodie-data-2026-09-28.json');
  });
});

describe('clearUserData', () => {
  it('resets every store and removes every Foodie key, keeping auth plumbing and strangers', () => {
    addFavorite('rec_001');
    setGoals({ calories: 1500 });
    $currentPlan.set(createPlan());
    setUnitSystem('metric');
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('user-preferences-u-1', JSON.stringify(DEFAULT_PREFERENCES));
    localStorage.setItem(LEGACY_GITHUB_TOKEN_KEY, 'gho_secret');
    localStorage.setItem(SESSION_HINT_KEY, '1');
    localStorage.setItem('unrelated', 'keep');

    const removed = clearUserData();
    expect(removed).toEqual(expect.arrayContaining(['favoriteRecipes', 'nutritionGoals', 'theme', 'user-preferences-u-1', LEGACY_GITHUB_TOKEN_KEY]));
    expect(listFoodieKeys()).toEqual([]);
    expect($favorites.get()).toEqual([]);
    expect($goals.get()).toEqual(DEFAULT_GOALS);
    expect($currentPlan.get()).toBeNull();
    expect($preferences.get()).toEqual(DEFAULT_PREFERENCES);
    expect(localStorage.getItem(SESSION_HINT_KEY)).toBe('1');
    expect(localStorage.getItem('unrelated')).toBe('keep');
  });
});
