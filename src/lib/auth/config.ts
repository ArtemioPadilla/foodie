/**
 * Auth configuration from `PUBLIC_*` env (roadmap Issue 035). Replaces the
 * legacy hardcoded Firebase config: nothing project-specific lives in `src/`.
 *
 *   PUBLIC_FIREBASE_API_KEY / _AUTH_DOMAIN / _PROJECT_ID / _APP_ID
 *     All four set  → `authEnabled` (real Firebase adapter).
 *     Any missing   → `authEnabled` false; the site still builds and the
 *                     auth UI degrades (or uses the mock, below).
 *   PUBLIC_AUTH_MOCK=1
 *     Forces the in-memory `mock.ts` adapter (e2e build, demos). Also the
 *     default in dev/test when Firebase is not configured.
 *
 * The Firebase web API key is an identifier, not a secret (access is enforced
 * by Firebase Auth's authorised domains + API-key restrictions), but it is
 * still injected from CI secrets so forks don't sign into Foodie's project.
 */
export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
}

export type AuthMode = 'firebase' | 'mock' | 'disabled';

export interface AuthConfig {
  mode: AuthMode;
  /** True only when every `PUBLIC_FIREBASE_*` value is present. */
  authEnabled: boolean;
  firebase: FirebaseWebConfig | null;
}

type EnvLike = Record<string, unknown>;

const TRUTHY = new Set(['1', 'true', 'on', 'yes']);

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Pure resolver — takes the env record so tests can exercise every branch. */
export function readAuthConfig(env: EnvLike): AuthConfig {
  const firebase: FirebaseWebConfig = {
    apiKey: str(env.PUBLIC_FIREBASE_API_KEY),
    authDomain: str(env.PUBLIC_FIREBASE_AUTH_DOMAIN),
    projectId: str(env.PUBLIC_FIREBASE_PROJECT_ID),
    appId: str(env.PUBLIC_FIREBASE_APP_ID),
  };
  const authEnabled = Object.values(firebase).every((v) => v.length > 0);
  const mockForced = TRUTHY.has(str(env.PUBLIC_AUTH_MOCK).toLowerCase());
  const devLike = env.DEV === true || env.MODE === 'test';

  let mode: AuthMode;
  if (mockForced) mode = 'mock';
  else if (authEnabled) mode = 'firebase';
  else if (devLike) mode = 'mock';
  else mode = 'disabled';

  return { mode, authEnabled, firebase: authEnabled ? firebase : null };
}

export const authConfig: AuthConfig = readAuthConfig(import.meta.env as EnvLike);

/** Convenience re-export matching the template recipe's `supabaseEnabled`. */
export const authEnabled = authConfig.authEnabled;
