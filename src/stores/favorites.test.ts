// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeUser } from '@/tests/fixtures/auth-user';
import { $mergeNotice, $mergedAccounts, resetAccountMergeForTests, undoMerge } from './account-merge';
import {
  $favoriteCount,
  $favorites,
  FAVORITES_KEY,
  addFavorite,
  clearFavorites,
  favoritesKeyFor,
  isFavorite,
  removeFavorite,
  toggleFavorite,
} from './favorites';
import { $user } from './user';

beforeEach(() => {
  $user.set(null);
  localStorage.clear();
  clearFavorites();
  $mergedAccounts.set([]);
  resetAccountMergeForTests();
  localStorage.clear();
});

describe('$favorites', () => {
  it('persists under the legacy "favoriteRecipes" key', () => {
    toggleFavorite('rec_001');
    expect(JSON.parse(localStorage.getItem('favoriteRecipes')!)).toEqual(['rec_001']);
  });

  it('hydrates legacy data on import', async () => {
    localStorage.setItem('favoriteRecipes', JSON.stringify(['rec_007', 'rec_009']));
    vi.resetModules();
    const fresh = await import('./favorites');
    expect(fresh.$favorites.get()).toEqual(['rec_007', 'rec_009']);
  });

  it('toggleFavorite appends when absent and removes when present', () => {
    toggleFavorite('rec_001');
    toggleFavorite('rec_002');
    expect($favorites.get()).toEqual(['rec_001', 'rec_002']);
    toggleFavorite('rec_001');
    expect($favorites.get()).toEqual(['rec_002']);
  });

  it('addFavorite is idempotent and removeFavorite ignores unknown ids', () => {
    addFavorite('rec_001');
    addFavorite('rec_001');
    expect($favorites.get()).toEqual(['rec_001']);
    removeFavorite('nope');
    expect($favorites.get()).toEqual(['rec_001']);
  });

  it('isFavorite reads the store by default or an explicit list', () => {
    addFavorite('rec_001');
    expect(isFavorite('rec_001')).toBe(true);
    expect(isFavorite('rec_002')).toBe(false);
    expect(isFavorite('x', ['x'])).toBe(true);
  });

  it('$favoriteCount is derived with computed', () => {
    expect($favoriteCount.get()).toBe(0);
    addFavorite('a');
    addFavorite('b');
    expect($favoriteCount.get()).toBe(2);
  });
});

describe('$favorites per user (roadmap #037)', () => {
  const stored = (key: string) => JSON.parse(localStorage.getItem(key) ?? 'null') as string[] | null;

  it('the key follows $user: user-favorites-${uid} signed in, favoriteRecipes as a guest', () => {
    expect($favorites.key).toBe(FAVORITES_KEY);
    $user.set(fakeUser('u1'));
    expect($favorites.key).toBe('user-favorites-u1');
    expect(favoritesKeyFor('u1')).toBe('user-favorites-u1');
    $user.set(null);
    expect($favorites.key).toBe('favoriteRecipes');
  });

  it('reads the legacy per-account key and writes there while signed in', () => {
    localStorage.setItem('user-favorites-u1', JSON.stringify(['rec_010']));
    $user.set(fakeUser('u1'));
    expect($favorites.get()).toEqual(['rec_010']);
    addFavorite('rec_011');
    expect(stored('user-favorites-u1')).toEqual(['rec_010', 'rec_011']);
    expect(stored('favoriteRecipes')).toBeNull();
  });

  it('signing out goes back to the untouched guest favourites; accounts do not see each other', () => {
    addFavorite('rec_guest');
    $user.set(fakeUser('u1'));
    $mergedAccounts.set(['u1', 'u2']); // no merge in this test
    $favorites.set(['rec_u1']);
    $user.set(fakeUser('u2'));
    expect($favorites.get()).toEqual([]);
    $user.set(null);
    expect($favorites.get()).toEqual(['rec_guest']);
    $user.set(fakeUser('u1'));
    expect($favorites.get()).toEqual(['rec_u1']);
  });

  it('merges guest favourites into the account once, with a notice and undo', () => {
    addFavorite('rec_001');
    addFavorite('rec_002');
    localStorage.setItem('user-favorites-u1', JSON.stringify(['rec_002', 'rec_003']));
    $user.set(fakeUser('u1'));
    expect($favorites.get()).toEqual(['rec_002', 'rec_003', 'rec_001']);
    expect($mergeNotice.get()).toEqual({ uid: 'u1', favoritesAdded: 1, preferencesAdopted: false });
    expect(stored('favoriteRecipes')).toEqual(['rec_001', 'rec_002']); // guest data untouched

    expect(undoMerge()).toBe(true);
    expect($favorites.get()).toEqual(['rec_002', 'rec_003']);
    expect(stored('user-favorites-u1')).toEqual(['rec_002', 'rec_003']);

    // Once: signing out and in again does not propose it again.
    $user.set(null);
    $user.set(fakeUser('u1'));
    expect($favorites.get()).toEqual(['rec_002', 'rec_003']);
    expect($mergeNotice.get()).toBeNull();
  });
});
