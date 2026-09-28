/**
 * One-time guest → account merge (roadmap Issue 037, ADR 0002 §4).
 *
 * When a session appears (`$user`), `$preferences` and `$favorites` switch to
 * the per-account keys (`user-preferences-${uid}`, `user-favorites-${uid}`,
 * see their stores). Then, once per account on this device:
 *
 *  - guest favourites (`favoriteRecipes`) missing from the account are
 *    appended to it;
 *  - guest preferences (`foodie:preferences`) become the account's
 *    preferences **only** when the account has none stored yet and the guest
 *    changed something from the defaults — an account's own settings are
 *    never overwritten.
 *
 * The guest keys are left as they are (signing out never deletes anonymous
 * data). The merge publishes `$mergeNotice`; the header's AccountMenu shows it
 * as a toast with **Undo**, which restores the account's previous values.
 * The uid is recorded in `foodie:anon-merged` whether or not the user undoes,
 * so the merge is never proposed twice. Cloud sync stays deferred (D14).
 */
import { atom } from 'nanostores';
import { persistentAtom } from '@/lib/persist';
import {
  DEFAULT_PREFERENCES,
  FavoriteRecipesSchema,
  MergedAccountsSchema,
  UserPreferencesSchema,
  type AuthUser,
  type FavoriteRecipes,
  type UserPreferences,
} from '@/schemas';
import type { ZodType } from 'zod';
import { $favorites, FAVORITES_KEY, favoritesKeyFor } from './favorites';
import { $preferences, PREFERENCES_KEY, preferencesKeyFor } from './preferences';
import { notifyQuotaExceeded } from './storage-status';
import { $user } from './user';

export const MERGED_ACCOUNTS_KEY = 'foodie:anon-merged';

/** Accounts that already had their one-time merge on this device. */
export const $mergedAccounts = persistentAtom<string[]>(MERGED_ACCOUNTS_KEY, MergedAccountsSchema, [], {
  onQuotaExceeded: notifyQuotaExceeded,
});

export interface MergeNotice {
  uid: string;
  /** Guest favourites appended to the account. */
  favoritesAdded: number;
  /** Whether the guest preferences became the account's preferences. */
  preferencesAdopted: boolean;
}

/** The latest merge, until the UI has shown it (`consumeMergeNotice`). */
export const $mergeNotice = atom<MergeNotice | null>(null);

interface Snapshot {
  uid: string;
  favorites: FavoriteRecipes;
  preferences: UserPreferences;
  /** Whether `user-preferences-${uid}` existed before the merge. */
  hadPreferences: boolean;
}
let snapshot: Snapshot | null = null;

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

function read<T>(key: string, schema: ZodType<T>): T | null {
  try {
    const raw = storage()?.getItem(key);
    if (raw == null) return null;
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Run the merge for `user` if it is due. Returns what was merged, or `null`
 * (no session, already merged, nothing to merge, or the stores are not on
 * the account's keys).
 */
export function mergeGuestIntoAccount(user: AuthUser | null = $user.get()): MergeNotice | null {
  const store = storage();
  if (!user || !store) return null;
  const { uid } = user;
  if ($mergedAccounts.get().includes(uid)) return null;
  if ($favorites.key !== favoritesKeyFor(uid) || $preferences.key !== preferencesKeyFor(uid)) return null;

  const accountFavorites = $favorites.get();
  const guestFavorites = read(FAVORITES_KEY, FavoriteRecipesSchema) ?? [];
  const toAdd = guestFavorites.filter((id, i) => !accountFavorites.includes(id) && guestFavorites.indexOf(id) === i);

  let hadPreferences = false;
  try {
    hadPreferences = store.getItem(preferencesKeyFor(uid)) !== null;
  } catch {
    hadPreferences = true; // unknown → never overwrite
  }
  const guestPreferences = read(PREFERENCES_KEY, UserPreferencesSchema);
  const adoptPreferences = !hadPreferences && guestPreferences !== null && !sameJson(guestPreferences, DEFAULT_PREFERENCES);

  if (toAdd.length === 0 && !adoptPreferences) return null;

  snapshot = { uid, favorites: accountFavorites, preferences: $preferences.get(), hadPreferences };
  if (toAdd.length > 0) $favorites.set([...accountFavorites, ...toAdd]);
  if (adoptPreferences && guestPreferences) $preferences.set(guestPreferences);
  $mergedAccounts.set([...$mergedAccounts.get(), uid]);

  const notice: MergeNotice = { uid, favoritesAdded: toAdd.length, preferencesAdopted: adoptPreferences };
  $mergeNotice.set(notice);
  return notice;
}

/**
 * Put the account back as it was before the last merge (the toast's "Undo").
 * The account stays marked as merged. Returns `false` when there is nothing
 * to undo or another account is signed in now.
 */
export function undoMerge(): boolean {
  const last = snapshot;
  snapshot = null;
  $mergeNotice.set(null);
  if (!last || $user.get()?.uid !== last.uid) return false;
  $favorites.set(last.favorites);
  $preferences.set(last.preferences);
  if (!last.hadPreferences) {
    try {
      storage()?.removeItem(preferencesKeyFor(last.uid));
    } catch {
      /* the in-memory value is already restored */
    }
  }
  return true;
}

/** Take the pending notice (the UI shows each merge once). */
export function consumeMergeNotice(): MergeNotice | null {
  const notice = $mergeNotice.get();
  if (notice) $mergeNotice.set(null);
  return notice;
}

let stop: (() => void) | null = null;

/**
 * Merge on every sign-in from now on (and for the current session, if any).
 * Idempotent; returns the unsubscribe. Runs on import in the browser.
 */
export function startAccountMerge(): () => void {
  if (!stop) {
    const off = $user.listen((user) => {
      mergeGuestIntoAccount(user);
    });
    stop = () => {
      off();
      stop = null;
    };
    mergeGuestIntoAccount($user.get());
  }
  return stop!;
}

if (typeof window !== 'undefined') startAccountMerge();

/** Test-only: forget the undo snapshot and the pending notice. */
export function resetAccountMergeForTests(): void {
  snapshot = null;
  $mergeNotice.set(null);
}
