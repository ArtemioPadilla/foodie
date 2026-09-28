/**
 * A signed-in `AuthUser` for store tests (roadmap Issue 037) — set it on
 * `$user` directly to switch the per-account keys without going through an
 * adapter.
 */
import type { AuthUser } from '@/schemas/auth';

export function fakeUser(uid: string, overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    uid,
    email: `${uid}@foodie.test`,
    displayName: uid,
    photoURL: null,
    emailVerified: false,
    method: 'password',
    createdAt: null,
    ...overrides,
  };
}
