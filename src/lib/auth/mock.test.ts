import { describe, expect, it } from 'vitest';
import { AuthUserSchema } from '@/schemas/auth';
import { AuthError } from './contracts';
import { MOCK_DEMO_ACCOUNT, MOCK_STORAGE_KEY, createMockAuthProvider } from './mock';

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
}

const code = async (p: Promise<unknown>) => {
  const error = await p.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(AuthError);
  return (error as AuthError).code;
};

describe('mock AuthProvider', () => {
  it('signs the demo account in and emits valid AuthUsers', async () => {
    const auth = createMockAuthProvider();
    const user = await auth.signInEmail(MOCK_DEMO_ACCOUNT.email, MOCK_DEMO_ACCOUNT.password);
    expect(AuthUserSchema.parse(user)).toEqual(user);
    expect(user).toMatchObject({ email: MOCK_DEMO_ACCOUNT.email, displayName: 'Demo Cook', method: 'password' });
  });

  it('never distinguishes unknown e-mail from wrong password', async () => {
    const auth = createMockAuthProvider();
    expect(await code(auth.signInEmail('nobody@foodie.test', 'whatever'))).toBe('invalid-credentials');
    expect(await code(auth.signInEmail(MOCK_DEMO_ACCOUNT.email, 'wrong'))).toBe('invalid-credentials');
    expect(await code(auth.signInEmail('not-an-email', 'x'))).toBe('invalid-email');
  });

  it('signs up, rejects duplicates and weak passwords', async () => {
    const auth = createMockAuthProvider();
    const user = await auth.signUpEmail('New@Foodie.test', 'secret1', 'New Cook');
    expect(user).toMatchObject({ email: 'new@foodie.test', displayName: 'New Cook', uid: 'mock-new-foodie-test' });
    expect(await code(auth.signUpEmail('new@foodie.test', 'secret1'))).toBe('email-in-use');
    expect(await code(auth.signUpEmail('other@foodie.test', '123'))).toBe('weak-password');
  });

  it('Google / GitHub resolve with fixed social users', async () => {
    const auth = createMockAuthProvider();
    expect((await auth.signInGoogle()).method).toBe('google.com');
    expect((await auth.signInGitHub()).method).toBe('github.com');
  });

  it('onSession emits the current session, then every change, until unsubscribed', async () => {
    const auth = createMockAuthProvider();
    const seen: (string | null)[] = [];
    const off = auth.onSession((u) => seen.push(u?.uid ?? null));
    await Promise.resolve();
    await auth.signInGoogle();
    await auth.signOut();
    off();
    await auth.signInGitHub();
    expect(seen).toEqual([null, 'mock-google-user', null]);
  });

  it('resetPassword succeeds for any valid e-mail (no enumeration)', async () => {
    const auth = createMockAuthProvider();
    await expect(auth.resetPassword('nobody@foodie.test')).resolves.toBeUndefined();
    expect(await code(auth.resetPassword('nope'))).toBe('invalid-email');
  });

  it('persists accounts and the session across instances when given a Storage', async () => {
    const storage = new MemoryStorage();
    await createMockAuthProvider({ storage }).signUpEmail('keep@foodie.test', 'secret1');
    expect(storage.getItem(MOCK_STORAGE_KEY)).toContain('keep@foodie.test');

    const again = createMockAuthProvider({ storage });
    const seen: (string | null)[] = [];
    again.onSession((u) => seen.push(u?.email ?? null));
    await Promise.resolve();
    expect(seen).toEqual(['keep@foodie.test']);
  });

  it('recovers from a corrupt stored state', async () => {
    const storage = new MemoryStorage();
    storage.setItem(MOCK_STORAGE_KEY, '{nope');
    const auth = createMockAuthProvider({ storage });
    await expect(auth.signInEmail(MOCK_DEMO_ACCOUNT.email, MOCK_DEMO_ACCOUNT.password)).resolves.toBeTruthy();
  });
});
