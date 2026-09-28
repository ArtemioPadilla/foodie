/**
 * `persistentAtom` — a Nano Stores atom mirrored to `localStorage`, validated
 * with a Zod schema and kept in sync across tabs (roadmap D5 / Issue 012).
 *
 * It is the base of every Foodie domain store in `src/stores/` and follows the
 * lifecycle of the template's `stores/theme.ts`: pure atom on the server,
 * `onMount` (guarded by `typeof window`) for the `storage` listener.
 *
 * Contract:
 *  - **Hydration** happens eagerly when a `window` exists, so `$store.get()`
 *    is correct from the first call even before any island subscribes (store
 *    actions run outside React). `localStorage[key]` is `JSON.parse`d and
 *    `schema.safeParse`d; on failure the atom keeps `fallback`, the raw value
 *    is left untouched (never destroy user data silently) and the problem is
 *    logged via `console.warn` with a pre-filled `report-issue` URL.
 *  - **Writes**: every `set()` serialises with `JSON.stringify`; `undefined`
 *    removes the key. `QuotaExceededError` is swallowed and surfaced through
 *    the optional `onQuotaExceeded` callback (wire it to `toast()` in islands).
 *  - **Cross-tab**: a `storage` event for `key` (or a `clear()`, `key === null`)
 *    updates the atom without echoing the value back into storage.
 *  - **`migrate`**: optional upgrader for legacy keys with a different shape;
 *    it runs only when the schema rejects the stored value and its result is
 *    validated again and persisted.
 *  - **SSR**: without `window` (or with a throwing `localStorage` getter) the
 *    atom is an ordinary in-memory atom.
 *  - **Reactive key** (Issue 037): `key` may be `() => string`. It is
 *    re-evaluated whenever one of `options.keyDeps` changes (e.g. `[$user]`
 *    for `user-preferences-${uid}`); when the result differs, the atom
 *    re-hydrates from the new key exactly like the first hydration (validate,
 *    migrate, fallback when absent — never writing), later writes and
 *    `storage` events use the new key, and the previous key is left as it
 *    was. `$store.key` always reports the current key.
 */
import { atom, onMount, type ReadableAtom, type WritableAtom } from 'nanostores';
import type { ZodType } from 'zod';
import { buildIssueUrl } from '@/lib/report-issue';

export interface PersistentAtomOptions<T> {
  /** Upgrade a legacy stored shape. Called only when `schema` rejects the raw value. */
  migrate?: (raw: unknown) => T;
  /** Called (after the console warning) when the stored value is unusable. */
  onInvalid?: (info: { key: string; raw: unknown; issues: string }) => void;
  /** Called when a write fails with a quota error; the in-memory value is kept. */
  onQuotaExceeded?: (info: { key: string; error: unknown }) => void;
  /**
   * Stores a function `key` depends on: each change re-evaluates the key
   * (Issue 037). Ignored for a string key.
   */
  keyDeps?: ReadonlyArray<ReadableAtom<unknown>>;
}

/** A fixed storage key, or one computed from other stores (see `keyDeps`). */
export type PersistentKey = string | (() => string);

export type PersistentAtom<T> = WritableAtom<T> & { readonly key: string };

/** `true` for the browser's storage-quota error in all its historical spellings. */
export function isQuotaExceededError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const { name, code } = error as { name?: unknown; code?: unknown };
  return (
    name === 'QuotaExceededError' ||
    name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    code === 22 ||
    code === 1014
  );
}

/** The page's `localStorage`, or `null` on the server / when access throws. */
function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

function describeIssues(error: { issues: ReadonlyArray<{ path: PropertyKey[]; message: string }> }): string {
  return error.issues
    .map((issue) => `${issue.path.map(String).join('.') || '(root)'}: ${issue.message}`)
    .join('; ');
}

type ParseOutcome<T> =
  | { ok: true; value: T; migrated: boolean }
  | { ok: false; raw: unknown; issues: string };

export function persistentAtom<T>(
  keySource: PersistentKey,
  schema: ZodType<T>,
  fallback: T,
  options: PersistentAtomOptions<T> = {},
): PersistentAtom<T> {
  const resolveKey = typeof keySource === 'function' ? keySource : () => keySource;
  let key = resolveKey();
  const $store = atom<T>(fallback) as PersistentAtom<T>;
  Object.defineProperty($store, 'key', { get: () => key, enumerable: true });
  const setInMemory = $store.set.bind($store);

  /** Parse a raw `localStorage` string through JSON → schema → (migrate → schema). */
  const parse = (rawString: string): ParseOutcome<T> => {
    let raw: unknown = rawString;
    let issues: string;
    try {
      raw = JSON.parse(rawString);
    } catch (error) {
      issues = `invalid JSON: ${(error as Error).message}`;
      return migrateOrFail(raw, issues);
    }
    const result = schema.safeParse(raw);
    if (result.success) return { ok: true, value: result.data, migrated: false };
    return migrateOrFail(raw, describeIssues(result.error));
  };

  const migrateOrFail = (raw: unknown, issues: string): ParseOutcome<T> => {
    if (!options.migrate) return { ok: false, raw, issues };
    try {
      const migrated = schema.safeParse(options.migrate(raw));
      if (migrated.success) return { ok: true, value: migrated.data, migrated: true };
      return { ok: false, raw, issues: `${issues}; migrate() output: ${describeIssues(migrated.error)}` };
    } catch (error) {
      return { ok: false, raw, issues: `${issues}; migrate() threw: ${(error as Error).message}` };
    }
  };

  const report = (raw: unknown, issues: string): void => {
    const url = buildIssueUrl({
      title: `[persist] localStorage["${key}"] failed validation`,
      body: `Stored value for \`${key}\` did not match its schema and the fallback was used.\n\n\`\`\`\n${issues}\n\`\`\``,
      labels: ['type:bug', 'area:persist'],
    });
    console.warn(
      `[persist] localStorage["${key}"] failed validation; using fallback. Issues: ${issues}. Report: ${url}`,
    );
    options.onInvalid?.({ key, raw, issues });
  };

  const write = (value: T): void => {
    const storage = getStorage();
    if (!storage) return;
    try {
      if (value === undefined) storage.removeItem(key);
      else storage.setItem(key, JSON.stringify(value));
    } catch (error) {
      if (isQuotaExceededError(error)) {
        options.onQuotaExceeded?.({ key, error });
        return;
      }
      // Storage disabled or read-only: keep the in-memory value, nothing to persist.
    }
  };

  /**
   * Load the current key into memory: the stored value (validated/migrated),
   * else `whenAbsent`. Never writes, except to persist a migration.
   */
  const hydrate = (whenAbsent: 'keep' | 'fallback'): void => {
    const stored = (() => {
      try {
        return getStorage()?.getItem(key) ?? null;
      } catch {
        return null;
      }
    })();
    if (stored === null) {
      if (whenAbsent === 'fallback') setInMemory(fallback);
      return;
    }
    const outcome = parse(stored);
    if (outcome.ok) {
      setInMemory(outcome.value);
      if (outcome.migrated) write(outcome.value);
    } else {
      report(outcome.raw, outcome.issues);
      if (whenAbsent === 'fallback') setInMemory(fallback);
    }
  };

  // Eager hydration — `get()` must be right before the first subscriber.
  hydrate('keep');

  // Reactive key: follow `keyDeps` for the atom's whole life (browser only),
  // so actions that run outside React (`$store.get()`) see the right key.
  if (typeof keySource === 'function' && typeof window !== 'undefined') {
    const rekey = () => {
      const next = resolveKey();
      if (next === key) return;
      key = next;
      hydrate('fallback');
    };
    for (const dep of options.keyDeps ?? []) dep.listen(rekey);
  }

  $store.set = (value: T) => {
    setInMemory(value);
    write(value);
  };

  if (typeof window !== 'undefined') {
    onMount($store, () => {
      const onStorage = (event: StorageEvent) => {
        if (event.key !== null && event.key !== key) return;
        if (event.key === null || event.newValue === null) {
          // `clear()` or `removeItem(key)` in another tab.
          setInMemory(fallback);
          return;
        }
        const outcome = parse(event.newValue);
        if (outcome.ok) setInMemory(outcome.value);
        // Invalid remote writes are ignored: our own writer always validates.
      };
      // Keep the window we subscribed on: nanostores unmounts after a delay,
      // by which time a test environment (jsdom) may have removed the global
      // or torn the window down (its EventTarget methods are gone then).
      const target = window;
      target.addEventListener('storage', onStorage);
      return () => {
        if (typeof target.removeEventListener === 'function') {
          target.removeEventListener('storage', onStorage);
        }
      };
    });
  }

  return $store;
}
