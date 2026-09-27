// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import { isQuotaExceededError, persistentAtom } from './persist';

/**
 * `persistentAtom` (roadmap Issue 012) — the base of every Phase 1 store.
 * Behaviour contracts:
 *   1. hydrates from `localStorage[key]` through `schema.safeParse`, falls back
 *      (and reports, without throwing) on invalid data, writes JSON on `set`;
 *   2. mirrors other tabs through the `storage` event and survives quota errors;
 *   3. `migrate` upgrades legacy shapes; works without `window` (SSR).
 */

const KEY = 'persist-test';
const Schema = z.object({ count: z.number().int(), label: z.string() });
type Value = z.infer<typeof Schema>;
const FALLBACK: Value = { count: 0, label: 'fallback' };

let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  localStorage.clear();
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('persistentAtom — hydration', () => {
  it('starts from the fallback when the key is absent', () => {
    const $store = persistentAtom(KEY, Schema, FALLBACK);
    expect($store.get()).toEqual(FALLBACK);
    expect($store.key).toBe(KEY);
    expect(warn).not.toHaveBeenCalled();
  });

  it('hydrates from a valid localStorage value before any subscriber exists', () => {
    localStorage.setItem(KEY, JSON.stringify({ count: 3, label: 'stored' }));
    const $store = persistentAtom(KEY, Schema, FALLBACK);
    expect($store.get()).toEqual({ count: 3, label: 'stored' });
  });

  it('writes JSON.stringify(value) on every set()', () => {
    const $store = persistentAtom(KEY, Schema, FALLBACK);
    $store.set({ count: 1, label: 'one' });
    expect(localStorage.getItem(KEY)).toBe(JSON.stringify({ count: 1, label: 'one' }));
    $store.set({ count: 2, label: 'two' });
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({ count: 2, label: 'two' });
  });

  it('removes the key when set(undefined) is called on an optional shape', () => {
    const $store = persistentAtom<Value | undefined>(KEY, Schema.optional(), undefined);
    $store.set({ count: 5, label: 'five' });
    expect(localStorage.getItem(KEY)).not.toBeNull();
    $store.set(undefined);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('does not write to localStorage during hydration', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    localStorage.setItem(KEY, JSON.stringify({ count: 9, label: 'nine' }));
    setItem.mockClear();
    persistentAtom(KEY, Schema, FALLBACK);
    expect(setItem).not.toHaveBeenCalled();
  });
});

describe('persistentAtom — invalid data', () => {
  it('falls back and reports (without throwing) when JSON is corrupt', () => {
    localStorage.setItem(KEY, '{not json');
    const onInvalid = vi.fn();
    const $store = persistentAtom(KEY, Schema, FALLBACK, { onInvalid });
    expect($store.get()).toEqual(FALLBACK);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain(KEY);
    expect(String(warn.mock.calls[0]?.[0])).toContain('/issues/new?');
    expect(onInvalid).toHaveBeenCalledWith(
      expect.objectContaining({ key: KEY, raw: '{not json' }),
    );
  });

  it('falls back and reports when the shape does not match the schema', () => {
    localStorage.setItem(KEY, JSON.stringify({ count: 'NaN', label: 1 }));
    const $store = persistentAtom(KEY, Schema, FALLBACK);
    expect($store.get()).toEqual(FALLBACK);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain('count');
  });

  it('keeps the corrupt raw value in localStorage (never destroys user data silently)', () => {
    localStorage.setItem(KEY, JSON.stringify({ count: 'NaN', label: 1 }));
    persistentAtom(KEY, Schema, FALLBACK);
    expect(localStorage.getItem(KEY)).toBe(JSON.stringify({ count: 'NaN', label: 1 }));
  });
});

describe('persistentAtom — migrate', () => {
  it('runs migrate() on data the schema rejects and persists the migrated value', () => {
    localStorage.setItem(KEY, JSON.stringify({ n: 7, name: 'legacy' }));
    const migrate = vi.fn((raw: unknown): Value => {
      const legacy = raw as { n: number; name: string };
      return { count: legacy.n, label: legacy.name };
    });
    const $store = persistentAtom(KEY, Schema, FALLBACK, { migrate });
    expect(migrate).toHaveBeenCalledTimes(1);
    expect($store.get()).toEqual({ count: 7, label: 'legacy' });
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({ count: 7, label: 'legacy' });
    expect(warn).not.toHaveBeenCalled();
  });

  it('does not call migrate() when the stored value already matches the schema', () => {
    localStorage.setItem(KEY, JSON.stringify({ count: 1, label: 'ok' }));
    const migrate = vi.fn();
    persistentAtom(KEY, Schema, FALLBACK, { migrate });
    expect(migrate).not.toHaveBeenCalled();
  });

  it('falls back when migrate() throws or returns an invalid value', () => {
    localStorage.setItem(KEY, JSON.stringify({ n: 'x' }));
    const $a = persistentAtom(KEY, Schema, FALLBACK, {
      migrate: () => {
        throw new Error('cannot migrate');
      },
    });
    expect($a.get()).toEqual(FALLBACK);
    const $b = persistentAtom(KEY, Schema, FALLBACK, {
      migrate: () => ({ count: 'still wrong' }) as unknown as Value,
    });
    expect($b.get()).toEqual(FALLBACK);
    expect(warn).toHaveBeenCalledTimes(2);
  });
});

describe('persistentAtom — cross-tab sync', () => {
  const fire = (key: string | null, newValue: string | null) =>
    window.dispatchEvent(new StorageEvent('storage', { key, newValue }));

  it('mirrors a storage event for its key while mounted', () => {
    const $store = persistentAtom(KEY, Schema, FALLBACK);
    const seen: Value[] = [];
    const unbind = $store.listen((v) => seen.push(v));
    fire(KEY, JSON.stringify({ count: 42, label: 'other tab' }));
    expect($store.get()).toEqual({ count: 42, label: 'other tab' });
    expect(seen).toEqual([{ count: 42, label: 'other tab' }]);
    unbind();
  });

  it('ignores storage events for other keys', () => {
    const $store = persistentAtom(KEY, Schema, FALLBACK);
    const unbind = $store.listen(() => {});
    fire('somebody-else', JSON.stringify({ count: 1, label: 'x' }));
    expect($store.get()).toEqual(FALLBACK);
    unbind();
  });

  it('resets to the fallback when another tab removes the key or clears storage', () => {
    const $store = persistentAtom(KEY, Schema, FALLBACK);
    const unbind = $store.listen(() => {});
    $store.set({ count: 1, label: 'mine' });
    fire(KEY, null);
    expect($store.get()).toEqual(FALLBACK);
    $store.set({ count: 2, label: 'mine again' });
    fire(null, null); // localStorage.clear() in another tab
    expect($store.get()).toEqual(FALLBACK);
    unbind();
  });

  it('keeps the current value when another tab writes something invalid', () => {
    const $store = persistentAtom(KEY, Schema, FALLBACK);
    const unbind = $store.listen(() => {});
    $store.set({ count: 1, label: 'mine' });
    fire(KEY, '{broken');
    expect($store.get()).toEqual({ count: 1, label: 'mine' });
    unbind();
  });

  it('does not echo a mirrored value back into localStorage', () => {
    const $store = persistentAtom(KEY, Schema, FALLBACK);
    const unbind = $store.listen(() => {});
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    fire(KEY, JSON.stringify({ count: 8, label: 'remote' }));
    expect(setItem).not.toHaveBeenCalled();
    unbind();
  });
});

describe('persistentAtom — quota exceeded', () => {
  const quotaError = () => new DOMException('The quota has been exceeded.', 'QuotaExceededError');

  it('keeps the in-memory value and calls onQuotaExceeded instead of throwing', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw quotaError();
    });
    const onQuotaExceeded = vi.fn();
    const $store = persistentAtom(KEY, Schema, FALLBACK, { onQuotaExceeded });
    expect(() => $store.set({ count: 99, label: 'big' })).not.toThrow();
    expect($store.get()).toEqual({ count: 99, label: 'big' });
    expect(onQuotaExceeded).toHaveBeenCalledTimes(1);
    expect(onQuotaExceeded.mock.calls[0]?.[0]).toMatchObject({ key: KEY });
  });

  it('swallows a quota error silently when no callback is given', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw quotaError();
    });
    const $store = persistentAtom(KEY, Schema, FALLBACK);
    expect(() => $store.set({ count: 1, label: 'x' })).not.toThrow();
  });

  it('isQuotaExceededError recognises the standard name and the legacy code 22', () => {
    expect(isQuotaExceededError(quotaError())).toBe(true);
    expect(isQuotaExceededError(new DOMException('full', 'NS_ERROR_DOM_QUOTA_REACHED'))).toBe(true);
    expect(isQuotaExceededError({ code: 22 })).toBe(true);
    expect(isQuotaExceededError(new Error('nope'))).toBe(false);
    expect(isQuotaExceededError(null)).toBe(false);
  });
});

describe('persistentAtom — SSR (no window)', () => {
  it('constructs with the fallback and set() never touches storage', () => {
    vi.stubGlobal('window', undefined);
    const $store = persistentAtom(KEY, Schema, FALLBACK);
    expect($store.get()).toEqual(FALLBACK);
    expect(() => $store.set({ count: 1, label: 'server' })).not.toThrow();
    expect($store.get()).toEqual({ count: 1, label: 'server' });
    vi.unstubAllGlobals();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('survives a localStorage getter that throws (Safari private mode)', () => {
    vi.stubGlobal('window', {
      get localStorage(): Storage {
        throw new DOMException('denied', 'SecurityError');
      },
      addEventListener: () => {},
      removeEventListener: () => {},
    });
    const $store = persistentAtom(KEY, Schema, FALLBACK);
    expect($store.get()).toEqual(FALLBACK);
    expect(() => $store.set({ count: 1, label: 'x' })).not.toThrow();
  });
});

describe('persistentAtom — constraints (source text)', () => {
  const source = readFileSync(resolve(process.cwd(), 'src/lib/persist.ts'), 'utf8');

  it('does not use React Context', () => {
    expect(source).not.toMatch(/createContext/);
    expect(source).not.toMatch(/from 'react'/);
  });

  it('imports only nanostores, zod types and repo modules (no new dependency)', () => {
    const imports = [...source.matchAll(/from '([^']+)'/g)].map((m) => m[1]);
    for (const spec of imports) {
      expect(spec).toMatch(/^(nanostores|zod|@\/|\.)/);
    }
  });
});
