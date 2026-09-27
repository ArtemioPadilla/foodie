/**
 * `persistentAtom` — TDD red stub (roadmap Issue 012). The implementation
 * lands in the green commit; this stub only keeps `tsc`/`astro build` green
 * while `src/lib/persist.test.ts` is red.
 */
import type { WritableAtom } from 'nanostores';
import type { ZodType } from 'zod';

export interface PersistentAtomOptions<T> {
  migrate?: (raw: unknown) => T;
  onInvalid?: (info: { key: string; raw: unknown; issues: string }) => void;
  onQuotaExceeded?: (info: { key: string; error: unknown }) => void;
}

export type PersistentAtom<T> = WritableAtom<T> & { readonly key: string };

export function persistentAtom<T>(
  _key: string,
  _schema: ZodType<T>,
  _fallback: T,
  _options: PersistentAtomOptions<T> = {},
): PersistentAtom<T> {
  throw new Error('persistentAtom: not implemented (TDD red)');
}

export function isQuotaExceededError(_error: unknown): boolean {
  throw new Error('isQuotaExceededError: not implemented (TDD red)');
}
