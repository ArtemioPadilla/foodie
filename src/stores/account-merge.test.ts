// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES } from '@/schemas';
import { fakeUser } from '@/tests/fixtures/auth-user';
import {
  $mergeNotice,
  $mergedAccounts,
  MERGED_ACCOUNTS_KEY,
  consumeMergeNotice,
  mergeGuestIntoAccount,
  resetAccountMergeForTests,
  startAccountMerge,
  undoMerge,
} from './account-merge';
import { $favorites, addFavorite, clearFavorites } from './favorites';
import { $preferences, resetPreferences, setUnitSystem } from './preferences';
import { $user } from './user';

/**
 * One-time guest → account merge (roadmap Issue 037): favourites union,
 * guest preferences only into an account without its own, a notice for the
 * toast, undo, and never twice for the same account on this device.
 */
beforeEach(() => {
  $user.set(null);
  localStorage.clear();
  clearFavorites();
  resetPreferences();
  $mergedAccounts.set([]);
  resetAccountMergeForTests();
  localStorage.clear();
});

describe('account merge', () => {
  it('runs on sign-in (started on import) and records the account in foodie:anon-merged', () => {
    addFavorite('rec_001');
    setUnitSystem('imperial');
    $user.set(fakeUser('u1'));
    expect($favorites.get()).toEqual(['rec_001']);
    expect($preferences.get().unitSystem).toBe('imperial');
    expect(JSON.parse(localStorage.getItem(MERGED_ACCOUNTS_KEY)!)).toEqual(['u1']);
    expect(consumeMergeNotice()).toEqual({ uid: 'u1', favoritesAdded: 1, preferencesAdopted: true });
    expect($mergeNotice.get()).toBeNull();
  });

  it('never proposes it twice, even after an undo', () => {
    addFavorite('rec_001');
    $user.set(fakeUser('u1'));
    expect(undoMerge()).toBe(true);
    expect($favorites.get()).toEqual([]);
    $user.set(null);
    addFavorite('rec_002');
    $user.set(fakeUser('u1'));
    expect($favorites.get()).toEqual([]);
    expect(mergeGuestIntoAccount(fakeUser('u1'))).toBeNull();
  });

  it('does nothing without a session or when there is nothing new', () => {
    expect(mergeGuestIntoAccount(null)).toBeNull();
    localStorage.setItem('user-favorites-u1', JSON.stringify(['rec_001']));
    addFavorite('rec_001');
    $user.set(fakeUser('u1'));
    expect($mergeNotice.get()).toBeNull();
    expect($mergedAccounts.get()).toEqual([]);
  });

  it('refuses to merge when the stores are not on that account\'s keys', () => {
    addFavorite('rec_001');
    expect(mergeGuestIntoAccount(fakeUser('someone-else'))).toBeNull();
    expect($favorites.get()).toEqual(['rec_001']);
  });

  it('undo is a no-op once another account is signed in', () => {
    addFavorite('rec_001');
    $user.set(fakeUser('u1'));
    $mergedAccounts.set(['u1', 'u2']);
    $user.set(fakeUser('u2'));
    expect(undoMerge()).toBe(false);
    $user.set(fakeUser('u1'));
    expect($favorites.get()).toEqual(['rec_001']);
  });

  it('startAccountMerge is idempotent', () => {
    const a = startAccountMerge();
    const b = startAccountMerge();
    expect(a).toBe(b);
  });

  it('keeps the guest defaults out of an account (nothing adopted)', () => {
    $user.set(fakeUser('u9'));
    expect($preferences.get()).toEqual(DEFAULT_PREFERENCES);
    expect(localStorage.getItem('user-preferences-u9')).toBeNull();
  });
});
