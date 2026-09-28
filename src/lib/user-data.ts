/**
 * Export / clear every piece of user data Foodie keeps on this device
 * (roadmap Issue 036, ADR 0002 §4 "Retention is user-controlled").
 *
 *  - `collectUserData()` — the `/profile` "Export my data" payload: the
 *    current value of every persistent store (keyed by its storage key, so a
 *    signed-in export carries `user-preferences-${uid}`) plus every other
 *    Foodie key present in `localStorage` (guest data, other accounts on the
 *    same browser, UI choices such as `foodie:locale`).
 *  - `clearUserData()` — "Clear my data": resets every store in memory and
 *    removes every Foodie key (legacy and `foodie:*`, all accounts).
 *
 * Never exported nor cleared: the auth infrastructure keys (the session hint
 * and the mock adapter's demo accounts — signing out is a separate action)
 * and `github-access-token` (legacy key 12, a credential — it is removed by
 * "clear" but never written into an export file).
 */
import type { WritableAtom } from 'nanostores';
import { DEFAULT_GOALS, DEFAULT_PREFERENCES, USER_DATA_EXPORT_FORMAT, type UserDataExport } from '@/schemas';
import type { AuthUser } from '@/schemas/auth';
import { $mergedAccounts } from '@/stores/account-merge';
import { $favorites } from '@/stores/favorites';
import { $goals } from '@/stores/goals';
import { $pantry } from '@/stores/pantry';
import { $currentPlan, $savedPlans } from '@/stores/planner';
import { $preferences } from '@/stores/preferences';
import { $shopping } from '@/stores/shopping';
import { followSystemTheme } from '@/stores/theme';
import { $tracking } from '@/stores/tracking';
import { SESSION_HINT_KEY } from '@/stores/user';

type PersistedStore = WritableAtom<unknown> & { readonly key: string };

/** Every persistent store with the value "no data" resets it to. */
function stores(): ReadonlyArray<readonly [PersistedStore, unknown]> {
  return [
    [$favorites, []],
    [$currentPlan, null],
    [$savedPlans, []],
    [$shopping, []],
    [$pantry, []],
    [$tracking, []],
    [$goals, DEFAULT_GOALS],
    [$preferences, DEFAULT_PREFERENCES],
    [$mergedAccounts, []],
  ] as unknown as ReadonlyArray<readonly [PersistedStore, unknown]>;
}

/** The inherited v1 keys (ADR 0002, keys 1–9 and 12). */
export const LEGACY_KEYS = [
  'theme',
  'i18nextLng',
  'favoriteRecipes',
  'currentMealPlan',
  'savedMealPlans',
  'shoppingList',
  'pantryItems',
  'trackingEntries',
  'nutritionGoals',
  'github-access-token',
] as const;

/** Keys 10–11: one pair per account that signed in on this browser. */
export const PER_ACCOUNT_KEY_PREFIXES = ['user-preferences-', 'user-favorites-'] as const;

/**
 * `src/lib/auth/mock.ts`'s storage key, spelled out so this module (shipped
 * with `/profile`) never imports the mock adapter; a unit test keeps them equal.
 */
export const MOCK_AUTH_KEY = 'foodie:mock-auth';

/** Auth plumbing, not user data: left alone by export and clear. */
export const AUTH_INFRA_KEYS: ReadonlySet<string> = new Set([SESSION_HINT_KEY, MOCK_AUTH_KEY]);

/** Credentials are never written into an export file. */
const NEVER_EXPORTED: ReadonlySet<string> = new Set(['github-access-token']);

export function isFoodieKey(key: string): boolean {
  if (AUTH_INFRA_KEYS.has(key)) return false;
  if ((LEGACY_KEYS as readonly string[]).includes(key)) return true;
  if (PER_ACCOUNT_KEY_PREFIXES.some((prefix) => key.startsWith(prefix) && key.length > prefix.length)) return true;
  return key.startsWith('foodie:');
}

function browserStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

/** Every Foodie key currently in `storage`, sorted. */
export function listFoodieKeys(storage: Storage | null = browserStorage()): string[] {
  if (!storage) return [];
  const keys: string[] = [];
  try {
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key !== null && isFoodieKey(key)) keys.push(key);
    }
  } catch {
    return [];
  }
  return keys.sort();
}

function parseStored(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export function collectUserData(
  user: AuthUser | null,
  { storage = browserStorage(), now = new Date() }: { storage?: Storage | null; now?: Date } = {},
): UserDataExport {
  const data: Record<string, unknown> = {};
  for (const key of listFoodieKeys(storage)) {
    if (NEVER_EXPORTED.has(key)) continue;
    const raw = storage?.getItem(key);
    if (raw != null) data[key] = parseStored(raw);
  }
  // The stores' validated in-memory values win over raw storage, and stores
  // that were never written still appear (with their defaults).
  for (const [store] of stores()) data[store.key] = store.get();
  return {
    format: USER_DATA_EXPORT_FORMAT,
    version: 1,
    exportedAt: now.toISOString(),
    account: user ? { uid: user.uid, email: user.email, displayName: user.displayName } : null,
    data: Object.fromEntries(Object.entries(data).sort(([a], [b]) => a.localeCompare(b))),
  };
}

/** `foodie-data-YYYY-MM-DD.json` */
export function exportFileName(now: Date = new Date()): string {
  return `foodie-data-${now.toISOString().slice(0, 10)}.json`;
}

export function exportUserDataBlob(user: AuthUser | null, now: Date = new Date()): Blob {
  return new Blob([JSON.stringify(collectUserData(user, { now }), null, 2)], { type: 'application/json' });
}

/**
 * Reset every store and remove every Foodie key. Returns the removed keys.
 * Other tabs follow through the `storage` event (`persistentAtom`).
 */
export function clearUserData(storage: Storage | null = browserStorage()): string[] {
  for (const [store, empty] of stores()) store.set(empty);
  const keys = listFoodieKeys(storage);
  for (const key of keys) {
    try {
      storage?.removeItem(key);
    } catch {
      /* storage turned read-only: nothing else to do */
    }
  }
  followSystemTheme();
  return keys;
}
