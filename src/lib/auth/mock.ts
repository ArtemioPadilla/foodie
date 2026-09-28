/**
 * In-memory `AuthProvider` for tests, local dev without Firebase credentials,
 * and the e2e build (`PUBLIC_AUTH_MOCK=1`, roadmap Issue 035).
 *
 * Behaviour mirrors the Firebase adapter closely enough for UI work:
 *  - Accounts live in a Map seeded with one demo account
 *    (`MOCK_DEMO_ACCOUNT`); sign-up adds to it, duplicate e-mails reject with
 *    `email-in-use`, short passwords with `weak-password`, unknown e-mail or
 *    wrong password with `invalid-credentials` (no enumeration).
 *  - Google / GitHub "popups" resolve immediately with fixed fake users.
 *  - `onSession` emits the current session asynchronously (like the SDK).
 *  - When a `Storage` is supplied the session (and sign-ups) survive page
 *    loads — Foodie is multi-page, so the e2e journey "sign in → /profile"
 *    needs that. Nothing here ever leaves the device.
 */
import { z } from 'zod';
import { AuthUserSchema, PASSWORD_MIN_LENGTH, type AuthUser } from '@/schemas/auth';
import { AuthError, type AuthProvider } from './contracts';

export const MOCK_STORAGE_KEY = 'foodie:mock-auth';

export const MOCK_DEMO_ACCOUNT = {
  email: 'demo@foodie.test',
  password: 'foodie-demo',
  displayName: 'Demo Cook',
} as const;

const MockAccountSchema = z.object({ password: z.string(), user: AuthUserSchema });
const MockStateSchema = z.object({
  accounts: z.record(z.string(), MockAccountSchema),
  sessionEmail: z.string().nullable(),
});
type MockState = z.infer<typeof MockStateSchema>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CREATED_AT = '2024-01-01T00:00:00.000Z';

function slug(email: string): string {
  return email.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function passwordUser(email: string, displayName: string | null): AuthUser {
  return {
    uid: `mock-${slug(email)}`,
    email,
    displayName,
    photoURL: null,
    emailVerified: false,
    method: 'password',
    createdAt: CREATED_AT,
  };
}

const SOCIAL_USERS: Record<'google.com' | 'github.com', AuthUser> = {
  'google.com': {
    uid: 'mock-google-user',
    email: 'google.user@foodie.test',
    displayName: 'Google Cook',
    photoURL: null,
    emailVerified: true,
    method: 'google.com',
    createdAt: CREATED_AT,
  },
  'github.com': {
    uid: 'mock-github-user',
    email: 'github.user@foodie.test',
    displayName: 'GitHub Cook',
    photoURL: null,
    emailVerified: true,
    method: 'github.com',
    createdAt: CREATED_AT,
  },
};

function seed(): MockState {
  const { email, password, displayName } = MOCK_DEMO_ACCOUNT;
  return { accounts: { [email]: { password, user: passwordUser(email, displayName) } }, sessionEmail: null };
}

export interface MockAuthOptions {
  /** Persist accounts + session (e.g. `window.localStorage`). Omit for pure in-memory. */
  storage?: Storage | null;
  /** Artificial latency in ms for every action (default 0). */
  latencyMs?: number;
}

export function createMockAuthProvider(options: MockAuthOptions = {}): AuthProvider {
  const { storage = null, latencyMs = 0 } = options;
  const listeners = new Set<(user: AuthUser | null) => void>();
  let memory: MockState = seed();

  const read = (): MockState => {
    if (!storage) return memory;
    try {
      const raw = storage.getItem(MOCK_STORAGE_KEY);
      const parsed = raw ? MockStateSchema.safeParse(JSON.parse(raw)) : null;
      return parsed?.success ? parsed.data : seed();
    } catch {
      return seed();
    }
  };
  const write = (state: MockState) => {
    memory = state;
    try {
      storage?.setItem(MOCK_STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* quota / private mode: keep in memory */
    }
  };

  const current = (): AuthUser | null => {
    const state = read();
    const socialUser = Object.values(SOCIAL_USERS).find((u) => u.email === state.sessionEmail);
    if (socialUser) return socialUser;
    return state.sessionEmail ? (state.accounts[state.sessionEmail]?.user ?? null) : null;
  };

  const delay = () => new Promise<void>((resolve) => setTimeout(resolve, latencyMs));

  const setSession = (email: string | null) => {
    write({ ...read(), sessionEmail: email });
    const user = current();
    for (const cb of listeners) cb(user);
    return user;
  };

  const normalise = (email: string) => email.trim().toLowerCase();

  return {
    id: 'mock',

    async signInEmail(email, password) {
      await delay();
      const key = normalise(email);
      if (!EMAIL_RE.test(key)) throw new AuthError('invalid-email');
      const account = read().accounts[key];
      if (!account || account.password !== password) throw new AuthError('invalid-credentials');
      return setSession(key) as AuthUser;
    },

    async signUpEmail(email, password, displayName) {
      await delay();
      const key = normalise(email);
      if (!EMAIL_RE.test(key)) throw new AuthError('invalid-email');
      if (password.length < PASSWORD_MIN_LENGTH) throw new AuthError('weak-password');
      const state = read();
      if (state.accounts[key]) throw new AuthError('email-in-use');
      const user = passwordUser(key, displayName?.trim() || null);
      write({ ...state, accounts: { ...state.accounts, [key]: { password, user } } });
      return setSession(key) as AuthUser;
    },

    async signInGoogle() {
      await delay();
      return setSession(SOCIAL_USERS['google.com'].email) as AuthUser;
    },

    async signInGitHub() {
      await delay();
      return setSession(SOCIAL_USERS['github.com'].email) as AuthUser;
    },

    async signOut() {
      await delay();
      setSession(null);
    },

    async resetPassword(email) {
      await delay();
      // Like Firebase with enumeration protection: succeed for any valid e-mail.
      if (!EMAIL_RE.test(normalise(email))) throw new AuthError('invalid-email');
    },

    onSession(cb) {
      listeners.add(cb);
      let active = true;
      queueMicrotask(() => {
        if (active) cb(current());
      });
      return () => {
        active = false;
        listeners.delete(cb);
      };
    },
  };
}
