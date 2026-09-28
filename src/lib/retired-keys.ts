/**
 * Storage keys Foodie no longer uses and removes on every page load
 * (ADR 0002 §3, roadmap D10 / Issue 039).
 *
 * v1 kept a GitHub OAuth token in `localStorage` so the contribute wizard
 * could open pull requests from the browser. v2 submits recipes as a
 * prefilled GitHub issue instead (no token anywhere), so the stored
 * credential is deleted the first time a v1 browser loads any v2 page. It is
 * never read: `purgeRetiredKeys` only removes.
 */
export const LEGACY_GITHUB_TOKEN_KEY = 'github-access-token';

export const RETIRED_KEYS: readonly string[] = [LEGACY_GITHUB_TOKEN_KEY];

/** Remove every retired key; returns the ones that were present. Never throws. */
export function purgeRetiredKeys(storage?: Storage | null): string[] {
  let target: Storage | null | undefined = storage;
  try {
    if (target === undefined) target = typeof window === 'undefined' ? null : window.localStorage;
    if (!target) return [];
    const removed: string[] = [];
    for (const key of RETIRED_KEYS) {
      if (target.getItem(key) === null) continue;
      target.removeItem(key);
      removed.push(key);
    }
    return removed;
  } catch {
    // Storage disabled (privacy mode, sandboxed iframe): nothing to purge.
    return [];
  }
}
