/**
 * Session stores (roadmap D9, Issue 035): `$user` + `$authReady`, shared by
 * every island (AccountMenu, AuthDialog, Profile — Issue 036) through Nano
 * Stores, never React Context.
 *
 * Lazy by design — the Firebase chunk must not load on every page:
 *  - When a component first subscribes, `initAuth()` runs. With no session
 *    hint in localStorage (anonymous visitor) it marks `$authReady` true with
 *    `$user = null` WITHOUT loading any adapter.
 *  - With a hint (this browser had a session last time) it loads the adapter
 *    right away so the session is restored and `$authReady` flips once the
 *    provider reports it.
 *  - Opening the auth dialog calls `preloadAuth()`; any action (`signInEmail`,
 *    …) also loads the adapter on demand.
 *
 * The hint (`SESSION_HINT_KEY`) is a bare "1" — no identity, no token. The
 * session itself is persisted by the provider (Firebase: IndexedDB).
 */
import { atom, onMount } from 'nanostores';
import { AuthError, authConfig, loadAuthProvider, resetAuthProviderForTests, type AuthProvider } from '@/lib/auth';
import type { AuthUser } from '@/schemas/auth';

export { toGuardUser, SIGNED_IN_ROLE } from '@/lib/auth/guard-user';

export const SESSION_HINT_KEY = 'foodie:auth-session';

/** The signed-in user, or `null` (anonymous / not yet known — see `$authReady`). */
export const $user = atom<AuthUser | null>(null);
/** `false` until the session state is known; guards must wait for `true`. */
export const $authReady = atom<boolean>(false);

/** Whether any adapter is configured (Firebase env or mock). Static per build. */
export const authAvailable = authConfig.mode !== 'disabled';

let initialised = false;
let starting: Promise<AuthProvider | null> | null = null;
let unsubscribe: (() => void) | null = null;

function storage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

function readHint(): boolean {
  try {
    return storage()?.getItem(SESSION_HINT_KEY) === '1';
  } catch {
    return false;
  }
}

function writeHint(signedIn: boolean): void {
  try {
    const s = storage();
    if (!s) return;
    if (signedIn) s.setItem(SESSION_HINT_KEY, '1');
    else s.removeItem(SESSION_HINT_KEY);
  } catch {
    /* private mode / quota — the hint is only an optimisation */
  }
}

function applySession(user: AuthUser | null): void {
  $user.set(user);
  writeHint(user !== null);
}

/**
 * Load the adapter (once) and subscribe to its session. Resolves with the
 * adapter, or `null` when auth is disabled for this build.
 */
export function preloadAuth(): Promise<AuthProvider | null> {
  starting ??= loadAuthProvider()
    .then((provider) => {
      if (!provider) {
        $authReady.set(true);
        return null;
      }
      unsubscribe = provider.onSession((user) => {
        applySession(user);
        $authReady.set(true);
      });
      return provider;
    })
    .catch((error: unknown) => {
      starting = null;
      $authReady.set(true);
      throw error;
    });
  return starting;
}

/** Resolve the initial session state; idempotent. Runs on first subscription. */
export function initAuth(): void {
  if (initialised) return;
  initialised = true;
  if (!authAvailable || !readHint()) {
    $authReady.set(true);
    return;
  }
  preloadAuth().catch((error: unknown) => console.warn('[auth] session restore failed', error));
}

if (typeof window !== 'undefined') {
  onMount($user, () => initAuth());
  onMount($authReady, () => initAuth());
}

async function withProvider<T>(fn: (provider: AuthProvider) => Promise<T>): Promise<T> {
  const provider = await preloadAuth();
  if (!provider) throw new AuthError('not-configured');
  return fn(provider);
}

async function signedIn(promise: Promise<AuthUser>): Promise<AuthUser> {
  const user = await promise;
  applySession(user);
  $authReady.set(true);
  return user;
}

export const signInEmail = (email: string, password: string) =>
  withProvider((p) => signedIn(p.signInEmail(email, password)));

export const signUpEmail = (email: string, password: string, displayName?: string) =>
  withProvider((p) => signedIn(p.signUpEmail(email, password, displayName)));

export const signInGoogle = () => withProvider((p) => signedIn(p.signInGoogle()));

export const signInGitHub = () => withProvider((p) => signedIn(p.signInGitHub()));

export const signOut = () =>
  withProvider(async (p) => {
    await p.signOut();
    applySession(null);
  });

export const resetPassword = (email: string) => withProvider((p) => p.resetPassword(email));

/** Test-only: drop the adapter, the subscription and both atoms' state. */
export function resetUserStoreForTests(): void {
  unsubscribe?.();
  unsubscribe = null;
  starting = null;
  initialised = false;
  resetAuthProviderForTests();
  $user.set(null);
  $authReady.set(false);
}
