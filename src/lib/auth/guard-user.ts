/**
 * `AuthUser` → `GuardUser` adapter (roadmap Issue 035) — the ONE place the
 * session is translated for `src/lib/route-guard.tsx`, per the template rule
 * "adapt your provider's user to GuardUser once, at the context boundary".
 *
 * Foodie has no backend-granted roles (D14 defers cloud features), so every
 * authenticated session carries exactly the `user` role; protected surfaces
 * such as `/profile` gate with `allow={[SIGNED_IN_ROLE]}`. `verified` is only
 * `true` when the provider says so explicitly (deny by default).
 */
import type { GuardUser } from '@/lib/route-guard';
import type { AuthUser } from '@/schemas/auth';

export const SIGNED_IN_ROLE = 'user';

export function toGuardUser(user: AuthUser | null | undefined): GuardUser | null {
  if (!user || !user.uid) return null;
  return {
    id: user.uid,
    roles: [SIGNED_IN_ROLE],
    flags: { verified: user.emailVerified === true },
  };
}
