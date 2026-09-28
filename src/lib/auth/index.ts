/**
 * Lazy entry point to the auth adapters (roadmap Issue 035).
 *
 * Importing this module is cheap: it only reads `authConfig`. The adapters —
 * and, through `firebase.ts`, the Firebase SDK — are pulled in with dynamic
 * `import()` the first time `loadAuthProvider()` is called, so they land in
 * their own chunks and never in a page's initial JS.
 */
import { authConfig, type AuthConfig } from './config';
import type { AuthProvider } from './contracts';

export { authConfig, authEnabled } from './config';
export { AuthError, isAuthError, type AuthProvider, type AuthUser } from './contracts';

let pending: Promise<AuthProvider | null> | null = null;

function browserStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

async function resolve(config: AuthConfig): Promise<AuthProvider | null> {
  if (config.mode === 'firebase' && config.firebase) {
    const { createFirebaseAuthProvider } = await import('./firebase');
    return createFirebaseAuthProvider(config.firebase);
  }
  if (config.mode === 'mock') {
    const { createMockAuthProvider } = await import('./mock');
    return createMockAuthProvider({ storage: browserStorage() });
  }
  return null;
}

/**
 * The configured adapter (memoised), or `null` when auth is disabled (no
 * Firebase env in a production build and no mock flag).
 */
export function loadAuthProvider(config: AuthConfig = authConfig): Promise<AuthProvider | null> {
  pending ??= resolve(config).catch((error: unknown) => {
    pending = null;
    throw error;
  });
  return pending;
}

/** Test-only: forget the memoised adapter. */
export function resetAuthProviderForTests(): void {
  pending = null;
}
