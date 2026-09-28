/**
 * `AuthProvider` — the contract every auth adapter implements (roadmap D9,
 * Issue 035). Islands never talk to Firebase directly: they call the actions
 * in `src/stores/user.ts`, which delegate to whichever adapter
 * `loadAuthProvider()` resolved (`firebase.ts` in production, `mock.ts` in
 * tests/dev without credentials). Swapping Firebase for Supabase (the
 * TradePilot path, `docs/recipes/auth-supabase.md`) means writing one more
 * adapter against this interface — nothing above it changes.
 *
 * Rules for adapters:
 *  - Every method resolves with / emits an `AuthUser` (Zod-validated), never
 *    the provider's own user object.
 *  - Failures reject with an `AuthError` carrying a normalised
 *    `AuthErrorCode` (see `src/schemas/auth.ts`); the UI translates
 *    `auth.errors.<code>`.
 *  - `onSession(cb)` calls `cb` once with the current session as soon as it
 *    is known (possibly `null`) and again on every change; it returns an
 *    unsubscribe function that is safe to call before the SDK has loaded.
 */
import type { AuthErrorCode, AuthUser, ProfileUpdate } from '@/schemas/auth';

export type { AuthErrorCode, AuthUser, ProfileUpdate } from '@/schemas/auth';

export type AuthProviderId = 'firebase' | 'mock';

export interface AuthProvider {
  readonly id: AuthProviderId;
  signInEmail(email: string, password: string): Promise<AuthUser>;
  signUpEmail(email: string, password: string, displayName?: string): Promise<AuthUser>;
  signInGoogle(): Promise<AuthUser>;
  signInGitHub(): Promise<AuthUser>;
  signOut(): Promise<void>;
  resetPassword(email: string): Promise<void>;
  /**
   * Change the signed-in user's display name / avatar URL (Issue 036,
   * `/profile`). Resolves with the updated `AuthUser`; rejects with
   * `not-signed-in` when there is no session.
   */
  updateProfile(updates: ProfileUpdate): Promise<AuthUser>;
  onSession(cb: (user: AuthUser | null) => void): () => void;
}

/** The one error type adapters throw. `cause` keeps the provider error for logs. */
export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, options?: { cause?: unknown }) {
    super(`auth/${code}`, options);
    this.name = 'AuthError';
    this.code = code;
  }
}

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}

/** The i18n key (`auth.errors.<code>`) the UI shows for any thrown value. */
export function authErrorKey(error: unknown): `auth.errors.${AuthErrorCode}` {
  return `auth.errors.${isAuthError(error) ? error.code : 'unknown'}`;
}
