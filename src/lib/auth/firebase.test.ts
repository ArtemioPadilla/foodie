import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthError } from './contracts';

const sdk = vi.hoisted(() => {
  const fakeUser = {
    uid: 'fb-123',
    email: 'cook@example.com',
    displayName: 'Cook',
    photoURL: 'https://example.com/a.png',
    emailVerified: true,
    providerData: [{ providerId: 'google.com' }],
    metadata: { creationTime: 'Mon, 01 Jan 2024 00:00:00 GMT' },
    reload: vi.fn(async () => undefined),
  };
  return {
    fakeUser,
    initializeApp: vi.fn(() => ({ name: '[DEFAULT]' })),
    getApps: vi.fn(() => [] as unknown[]),
    getAuth: vi.fn(() => ({ currentUser: null })),
    signInWithEmailAndPassword: vi.fn(async () => ({ user: fakeUser })),
    signInWithPopup: vi.fn(async () => ({ user: fakeUser })),
    signOut: vi.fn(async () => undefined),
    sendPasswordResetEmail: vi.fn(async () => undefined),
    onAuthStateChanged: vi.fn((_auth: unknown, cb: (u: unknown) => void) => {
      cb(fakeUser);
      return () => undefined;
    }),
  };
});

vi.mock('firebase/app', () => ({ initializeApp: sdk.initializeApp, getApps: sdk.getApps }));
vi.mock('firebase/auth', () => ({
  getAuth: sdk.getAuth,
  signInWithEmailAndPassword: sdk.signInWithEmailAndPassword,
  createUserWithEmailAndPassword: vi.fn(),
  updateProfile: vi.fn(),
  signInWithPopup: sdk.signInWithPopup,
  signOut: sdk.signOut,
  sendPasswordResetEmail: sdk.sendPasswordResetEmail,
  onAuthStateChanged: sdk.onAuthStateChanged,
  GoogleAuthProvider: class {},
  GithubAuthProvider: class {},
}));

const { createFirebaseAuthProvider, toAuthError } = await import('./firebase');

const CONFIG = { apiKey: 'k', authDomain: 'x.firebaseapp.com', projectId: 'x', appId: '1:1:web:1' };

describe('Firebase adapter', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not initialise the SDK until first use', async () => {
    const auth = createFirebaseAuthProvider(CONFIG);
    expect(sdk.initializeApp).not.toHaveBeenCalled();
    const user = await auth.signInEmail('cook@example.com', 'pw');
    expect(sdk.initializeApp).toHaveBeenCalledWith(CONFIG);
    expect(user).toEqual({
      uid: 'fb-123',
      email: 'cook@example.com',
      displayName: 'Cook',
      photoURL: 'https://example.com/a.png',
      emailVerified: true,
      method: 'google.com',
      createdAt: '2024-01-01T00:00:00.000Z',
    });
    await auth.signOut();
    expect(sdk.initializeApp).toHaveBeenCalledTimes(1);
  });

  it('maps provider errors onto normalised AuthError codes', async () => {
    sdk.signInWithEmailAndPassword.mockRejectedValueOnce({ code: 'auth/user-not-found' });
    const auth = createFirebaseAuthProvider(CONFIG);
    await expect(auth.signInEmail('a@b.co', 'x')).rejects.toMatchObject({ code: 'invalid-credentials' });
    expect(toAuthError({ code: 'auth/wrong-password' }).code).toBe('invalid-credentials');
    expect(toAuthError({ code: 'auth/popup-blocked' }).code).toBe('popup-blocked');
    expect(toAuthError(new Error('boom')).code).toBe('unknown');
    expect(toAuthError(new AuthError('network')).code).toBe('network');
  });

  it('onSession forwards mapped users and is safe to unsubscribe early', async () => {
    const auth = createFirebaseAuthProvider(CONFIG);
    const off = auth.onSession(() => undefined);
    off();
    await new Promise((r) => setTimeout(r, 0));
    expect(sdk.onAuthStateChanged).not.toHaveBeenCalled();

    const seen: unknown[] = [];
    auth.onSession((u) => seen.push(u?.uid));
    await vi.waitFor(() => expect(seen).toEqual(['fb-123']));
  });
});

describe('Firebase adapter — resetPassword', () => {
  it('resolves for unknown addresses (no enumeration) but surfaces other errors', async () => {
    const auth = createFirebaseAuthProvider(CONFIG);
    sdk.sendPasswordResetEmail.mockRejectedValueOnce({ code: 'auth/user-not-found' });
    await expect(auth.resetPassword('ghost@example.com')).resolves.toBeUndefined();
    sdk.sendPasswordResetEmail.mockRejectedValueOnce({ code: 'auth/invalid-email' });
    await expect(auth.resetPassword('nope')).rejects.toMatchObject({ code: 'invalid-email' });
  });
});
