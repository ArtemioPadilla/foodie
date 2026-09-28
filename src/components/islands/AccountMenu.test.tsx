// @vitest-environment jsdom
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { withBase } from '@/lib/href';
import { MOCK_DEMO_ACCOUNT } from '@/lib/auth/mock';
import { $mergedAccounts, resetAccountMergeForTests } from '@/stores/account-merge';
import { $favorites, addFavorite, clearFavorites } from '@/stores/favorites';
import { $user, initAuth, resetUserStoreForTests, signInEmail } from '@/stores/user';
import AccountMenu, { accountToasts, initials } from './AccountMenu';

/**
 * AccountMenu — the header's account slot (roadmap Issue 036): "Sign in"
 * when anonymous, avatar + menu (Profile, Sign out) with a session.
 */
vi.setConfig({ testTimeout: 20_000 });

// Close the header's own toasts before unmount (see tests/fixtures/toast-timers.ts).
const opened: string[] = [];
beforeEach(() => {
  localStorage.clear();
  resetUserStoreForTests();
  clearFavorites();
  $mergedAccounts.set([]);
  resetAccountMergeForTests();
  localStorage.clear();
  // A fresh page load: nanostores keeps a store "mounted" for a second after
  // its last listener leaves, so onMount (→ initAuth) would not rerun here.
  initAuth();
  opened.length = 0;
  const add = accountToasts.add.bind(accountToasts);
  vi.spyOn(accountToasts, 'add').mockImplementation((options) => {
    const id = add(options);
    opened.push(id);
    return id;
  });
});
afterEach(() => {
  act(() => {
    for (const id of opened) accountToasts.close(id);
  });
  vi.restoreAllMocks();
  window.history.replaceState(null, '', '/');
});

describe('AccountMenu', () => {
  it('server-renders a placeholder (session unknown), never the Sign in button', () => {
    const html = renderToString(<AccountMenu lang="en" />);
    expect(html).toContain('data-state="loading"');
    expect(html).not.toContain('Sign In');
  });

  it('anonymous: a "Sign in" button opens the AuthDialog', async () => {
    const user = userEvent.setup();
    render(<AccountMenu lang="en" />);
    const button = await screen.findByTestId('account-signin');
    expect(button).toHaveTextContent('Sign In');
    await user.click(button);
    expect(await screen.findByTestId('auth-dialog')).toBeInTheDocument();
  });

  it('signing in from the dialog swaps the button for the avatar menu and welcomes the user', async () => {
    const user = userEvent.setup();
    render(<AccountMenu lang="en" />);
    await user.click(await screen.findByTestId('account-signin'));
    await user.type(await screen.findByPlaceholderText('Email'), MOCK_DEMO_ACCOUNT.email);
    await user.type(screen.getByPlaceholderText('Password'), MOCK_DEMO_ACCOUNT.password);
    await user.click(screen.getByTestId('signin-submit'));
    const trigger = await screen.findByTestId('account-menu-trigger');
    expect(trigger).toHaveAccessibleName(`Account menu for ${MOCK_DEMO_ACCOUNT.displayName}`);
    expect(accountToasts.add).toHaveBeenCalledWith(expect.objectContaining({ title: `Welcome, ${MOCK_DEMO_ACCOUNT.displayName}!` }));
  });

  it('signed in: the menu links to the localised profile and signs out in one click', async () => {
    await signInEmail(MOCK_DEMO_ACCOUNT.email, MOCK_DEMO_ACCOUNT.password);
    const user = userEvent.setup();
    render(<AccountMenu lang="es" />);
    await user.click(await screen.findByTestId('account-menu-trigger'));
    const profile = await screen.findByTestId('account-profile');
    expect(profile).toHaveTextContent('Perfil');
    expect(profile).toHaveAttribute('href', withBase('/es/profile/'));
    await user.click(screen.getByTestId('account-signout'));
    await waitFor(() => expect($user.get()).toBeNull());
    expect(await screen.findByTestId('account-signin')).toHaveTextContent('Iniciar Sesión');
  });

  it('?signin=1 (the /profile redirect) opens the dialog once and cleans the URL', async () => {
    window.history.replaceState(null, '', '/?signin=1&x=2');
    render(<AccountMenu lang="en" />);
    expect(await screen.findByTestId('auth-dialog')).toBeInTheDocument();
    expect(window.location.search).toBe('?x=2');
  });

  it('announces the one-time guest → account merge with an Undo that restores the account (roadmap #037)', async () => {
    addFavorite('rec_001');
    addFavorite('rec_002');
    const user = userEvent.setup();
    render(<AccountMenu lang="en" />);
    await screen.findByTestId('account-signin');
    await act(async () => {
      await signInEmail(MOCK_DEMO_ACCOUNT.email, MOCK_DEMO_ACCOUNT.password);
    });
    expect($favorites.key).toMatch(/^user-favorites-/);
    expect($favorites.get()).toEqual(['rec_001', 'rec_002']);
    expect(await screen.findByText('Guest data added to your account')).toBeInTheDocument();
    expect(screen.getByText('2 favourite recipes added.')).toBeInTheDocument();
    await user.click(screen.getByTestId('merge-undo'));
    expect($favorites.get()).toEqual([]);
    expect(await screen.findByText('Merge undone — your account data is as it was.')).toBeInTheDocument();
    // Guest favourites are still there for when they sign out.
    expect(JSON.parse(localStorage.getItem('favoriteRecipes')!)).toEqual(['rec_001', 'rec_002']);
  });

  it('initials come from the name, else the e-mail', () => {
    expect(initials({ displayName: 'Demo Cook', email: null })).toBe('DC');
    expect(initials({ displayName: null, email: 'ana.lopez@x.test' })).toBe('AL');
    expect(initials({ displayName: null, email: null })).toBe('?');
  });
});
