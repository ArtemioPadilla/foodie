/**
 * Firebase Auth adapter (roadmap D9, Issue 035).
 *
 * The SDK is loaded with dynamic `import()` of `firebase/app` + `firebase/auth`
 * ONLY — never Firestore, Analytics or the `firebase` umbrella — the first
 * time an action or `onSession` needs it. Together with the lazy
 * `loadAuthProvider()` in `./index.ts`, the Firebase chunk stays out of every
 * page's initial JS: it is fetched when the auth dialog opens, or on load for
 * a visitor who already has a session (see `src/stores/user.ts`).
 */
import type { FirebaseApp } from 'firebase/app';
import type { Auth, User as FirebaseUser } from 'firebase/auth';
import { AuthUserSchema, type AuthErrorCode, type AuthMethod, type AuthUser } from '@/schemas/auth';
import { AuthError, type AuthProvider } from './contracts';
import type { FirebaseWebConfig } from './config';

type AuthModule = typeof import('firebase/auth');

interface Sdk {
  auth: Auth;
  mod: AuthModule;
}

/** Firebase `auth/…` codes → the contract's normalised codes. */
const CODE_MAP: Record<string, AuthErrorCode> = {
  'auth/user-not-found': 'invalid-credentials',
  'auth/wrong-password': 'invalid-credentials',
  'auth/invalid-credential': 'invalid-credentials',
  'auth/invalid-login-credentials': 'invalid-credentials',
  'auth/email-already-in-use': 'email-in-use',
  'auth/invalid-email': 'invalid-email',
  'auth/missing-email': 'invalid-email',
  'auth/weak-password': 'weak-password',
  'auth/user-disabled': 'user-disabled',
  'auth/too-many-requests': 'too-many-requests',
  'auth/popup-closed-by-user': 'popup-closed',
  'auth/cancelled-popup-request': 'popup-closed',
  'auth/popup-blocked': 'popup-blocked',
  'auth/account-exists-with-different-credential': 'account-exists-with-different-credential',
  'auth/network-request-failed': 'network',
  'auth/invalid-api-key': 'not-configured',
  'auth/configuration-not-found': 'not-configured',
  'auth/unauthorized-domain': 'not-configured',
  'auth/operation-not-allowed': 'not-configured',
};

export function toAuthError(error: unknown): AuthError {
  if (error instanceof AuthError) return error;
  const code = (error as { code?: unknown } | null)?.code;
  const mapped = typeof code === 'string' ? CODE_MAP[code] : undefined;
  return new AuthError(mapped ?? 'unknown', { cause: error });
}

function methodOf(user: FirebaseUser): AuthMethod {
  const ids = user.providerData.map((p) => p.providerId);
  if (ids.includes('google.com')) return 'google.com';
  if (ids.includes('github.com')) return 'github.com';
  return 'password';
}

/** Map the SDK's user onto the contract's `AuthUser` — nothing else leaks. */
export function toAuthUser(user: FirebaseUser): AuthUser {
  return AuthUserSchema.parse({
    uid: user.uid,
    email: user.email ?? null,
    displayName: user.displayName ?? null,
    photoURL: user.photoURL ?? null,
    emailVerified: user.emailVerified === true,
    method: methodOf(user),
    createdAt: user.metadata.creationTime ? new Date(user.metadata.creationTime).toISOString() : null,
  });
}

export function createFirebaseAuthProvider(config: FirebaseWebConfig): AuthProvider {
  let sdk: Promise<Sdk> | null = null;

  const load = (): Promise<Sdk> => {
    sdk ??= (async () => {
      const [appMod, mod] = await Promise.all([import('firebase/app'), import('firebase/auth')]);
      const app: FirebaseApp = appMod.getApps()[0] ?? appMod.initializeApp(config);
      const auth = mod.getAuth(app);
      return { auth, mod };
    })().catch((error: unknown) => {
      sdk = null; // allow a retry (e.g. the chunk failed to download offline)
      throw toAuthError(error);
    });
    return sdk;
  };

  const run = async <T>(fn: (s: Sdk) => Promise<T>): Promise<T> => {
    const s = await load();
    try {
      return await fn(s);
    } catch (error) {
      throw toAuthError(error);
    }
  };

  return {
    id: 'firebase',

    signInEmail: (email, password) =>
      run(async ({ auth, mod }) => toAuthUser((await mod.signInWithEmailAndPassword(auth, email, password)).user)),

    signUpEmail: (email, password, displayName) =>
      run(async ({ auth, mod }) => {
        const { user } = await mod.createUserWithEmailAndPassword(auth, email, password);
        if (displayName) {
          await mod.updateProfile(user, { displayName });
          await user.reload();
        }
        return toAuthUser(auth.currentUser ?? user);
      }),

    signInGoogle: () =>
      run(async ({ auth, mod }) => toAuthUser((await mod.signInWithPopup(auth, new mod.GoogleAuthProvider())).user)),

    // No `public_repo` scope any more: recipe contributions go through a
    // prefilled issue (D10), so Foodie only needs the basic GitHub profile.
    signInGitHub: () =>
      run(async ({ auth, mod }) => toAuthUser((await mod.signInWithPopup(auth, new mod.GithubAuthProvider())).user)),

    signOut: () => run(({ auth, mod }) => mod.signOut(auth)),

    // Resolve for unknown addresses too (Firebase does the same when email
    // enumeration protection is on) so the UI cannot be used to probe accounts.
    resetPassword: (email) =>
      run(async ({ auth, mod }) => {
        try {
          await mod.sendPasswordResetEmail(auth, email);
        } catch (error) {
          if ((error as { code?: unknown } | null)?.code !== 'auth/user-not-found') throw error;
        }
      }),

    // Firebase does not fire onAuthStateChanged for profile edits, so the
    // caller (`$user` in src/stores/user.ts) applies the returned user.
    updateProfile: (updates) =>
      run(async ({ auth, mod }) => {
        const user = auth.currentUser;
        if (!user) throw new AuthError('not-signed-in');
        const patch: { displayName?: string | null; photoURL?: string | null } = {};
        if (updates.displayName !== undefined) patch.displayName = updates.displayName;
        if (updates.photoURL !== undefined) patch.photoURL = updates.photoURL;
        await mod.updateProfile(user, patch);
        await user.reload();
        return toAuthUser(auth.currentUser ?? user);
      }),

    onSession(cb) {
      let unsubscribe: (() => void) | null = null;
      let cancelled = false;
      load()
        .then(({ auth, mod }) => {
          if (cancelled) return;
          unsubscribe = mod.onAuthStateChanged(auth, (user) => cb(user ? toAuthUser(user) : null));
        })
        .catch((error: unknown) => {
          // SDK failed to load: report "no session" so $authReady still settles.
          console.warn('[auth] Firebase failed to load', error);
          if (!cancelled) cb(null);
        });
      return () => {
        cancelled = true;
        unsubscribe?.();
      };
    },
  };
}
