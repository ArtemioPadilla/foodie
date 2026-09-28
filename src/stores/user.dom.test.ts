// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MOCK_DEMO_ACCOUNT } from '@/lib/auth/mock';

/** A fresh copy of the store module — i.e. a new page load (Foodie is multi-page). */
async function freshPage() {
  vi.resetModules();
  return import('./user');
}

beforeEach(() => localStorage.clear());

describe('$user session hint (browser)', () => {
  it('writes the hint on sign-in and removes it on sign-out', async () => {
    const { SESSION_HINT_KEY, signInEmail, signOut } = await freshPage();
    await signInEmail(MOCK_DEMO_ACCOUNT.email, MOCK_DEMO_ACCOUNT.password);
    expect(localStorage.getItem(SESSION_HINT_KEY)).toBe('1');
    await signOut();
    expect(localStorage.getItem(SESSION_HINT_KEY)).toBeNull();
  });

  it('restores a persisted session on first subscription: $authReady waits for the adapter', async () => {
    const first = await freshPage();
    await first.signInEmail(MOCK_DEMO_ACCOUNT.email, MOCK_DEMO_ACCOUNT.password);

    const { $authReady, $user } = await freshPage();
    const ready: boolean[] = [];
    const off = $authReady.subscribe((v) => ready.push(v));
    expect(ready).toEqual([false]);
    await vi.waitFor(() => expect($authReady.get()).toBe(true));
    expect(ready).toEqual([false, true]);
    expect($user.get()?.email).toBe(MOCK_DEMO_ACCOUNT.email);
    off();
  });

  it('anonymous visitors (no hint) are ready on first subscription with no user', async () => {
    const { $authReady, $user } = await freshPage();
    const off = $user.listen(() => undefined);
    expect($authReady.get()).toBe(true);
    expect($user.get()).toBeNull();
    off();
  });
});
