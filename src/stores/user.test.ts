import { afterEach, describe, expect, it } from 'vitest';
import { RouteGuard, hasRole } from '@/lib/route-guard';
import { AuthError, authErrorKey } from '@/lib/auth';
import { MOCK_DEMO_ACCOUNT } from '@/lib/auth/mock';
import {
  $authReady,
  $user,
  SIGNED_IN_ROLE,
  authAvailable,
  initAuth,
  preloadAuth,
  resetPassword,
  resetUserStoreForTests,
  signInEmail,
  signInGitHub,
  signOut,
  signUpEmail,
  toGuardUser,
  updateProfile,
} from './user';

afterEach(() => resetUserStoreForTests());

describe('$authReady transition (mock adapter, node env)', () => {
  it('starts false and flips true on init without loading any adapter for anonymous visitors', () => {
    expect(authAvailable).toBe(true); // vitest MODE=test → mock adapter
    expect($authReady.get()).toBe(false);
    initAuth();
    expect($authReady.get()).toBe(true);
    expect($user.get()).toBeNull();
  });

  it('flips true once the adapter reports the session when preloaded', async () => {
    const provider = await preloadAuth();
    expect(provider?.id).toBe('mock');
    await Promise.resolve();
    expect($authReady.get()).toBe(true);
    expect($user.get()).toBeNull();
  });
});

describe('sign in / out', () => {
  it('signInEmail sets $user; signOut clears it', async () => {
    const user = await signInEmail(MOCK_DEMO_ACCOUNT.email, MOCK_DEMO_ACCOUNT.password);
    expect($user.get()).toEqual(user);
    expect($authReady.get()).toBe(true);
    await signOut();
    expect($user.get()).toBeNull();
  });

  it('propagates normalised AuthErrors and leaves $user untouched', async () => {
    await expect(signInEmail(MOCK_DEMO_ACCOUNT.email, 'wrong')).rejects.toBeInstanceOf(AuthError);
    expect($user.get()).toBeNull();
  });

  it('signUpEmail and social sign-in go through the same store', async () => {
    await signUpEmail('fresh@foodie.test', 'secret1', 'Fresh');
    expect($user.get()?.displayName).toBe('Fresh');
    await signInGitHub();
    expect($user.get()?.method).toBe('github.com');
  });

  it('updateProfile applies the returned user to $user (roadmap #036)', async () => {
    await signInEmail(MOCK_DEMO_ACCOUNT.email, MOCK_DEMO_ACCOUNT.password);
    await updateProfile({ displayName: 'Chef', photoURL: 'https://avatars.githubusercontent.com/u/2' });
    expect($user.get()).toMatchObject({ displayName: 'Chef', photoURL: 'https://avatars.githubusercontent.com/u/2' });
    await signOut();
    await expect(updateProfile({ displayName: 'X' })).rejects.toMatchObject({ code: 'not-signed-in' });
  });

  it('authErrorKey maps any thrown value onto an auth.errors.* key', () => {
    expect(authErrorKey(new AuthError('email-in-use'))).toBe('auth.errors.email-in-use');
    expect(authErrorKey(new Error('boom'))).toBe('auth.errors.unknown');
  });

  it('resetPassword resolves for a valid e-mail', async () => {
    await expect(resetPassword('someone@foodie.test')).resolves.toBeUndefined();
  });
});

describe('guard', () => {
  it('toGuardUser denies anonymous and grants the signed-in role', async () => {
    expect(toGuardUser(null)).toBeNull();
    expect(hasRole(toGuardUser($user.get()), [SIGNED_IN_ROLE])).toBe(false);

    await signInEmail(MOCK_DEMO_ACCOUNT.email, MOCK_DEMO_ACCOUNT.password);
    const guardUser = toGuardUser($user.get());
    expect(guardUser).toMatchObject({ id: $user.get()?.uid, roles: [SIGNED_IN_ROLE] });
    // Demo password account is unverified → the explicit-true flag rule denies.
    expect(guardUser?.flags?.verified).toBe(false);
  });

  it('RouteGuard renders children only for a signed-in user', async () => {
    const render = () =>
      RouteGuard({ user: toGuardUser($user.get()), allow: [SIGNED_IN_ROLE], fallback: 'denied', children: 'profile' });
    expect(render()).toBe('denied');
    await signInGitHub();
    expect(render()).toBe('profile');
    await signOut();
    expect(render()).toBe('denied');
  });
});
