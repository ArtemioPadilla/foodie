// @vitest-environment jsdom
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { withBase } from '@/lib/href';
import { MOCK_DEMO_ACCOUNT } from '@/lib/auth/mock';
import { clearUserData } from '@/lib/user-data';
import { DEFAULT_PREFERENCES, UserDataExportSchema } from '@/schemas';
import { $favorites, addFavorite } from '@/stores/favorites';
import { $preferences } from '@/stores/preferences';
import { $authReady, $user, initAuth, resetUserStoreForTests, signInEmail, signOut } from '@/stores/user';
import { closeToastsAfterEach } from '@/tests/fixtures/toast-timers';
import { ProfileView } from './Profile';

/**
 * `/profile/` island (roadmap Issue 036): RouteGuard (deny by default,
 * explicit allow), name/avatar URL, units, diet, preferred language, and
 * "Export my data" / "Clear my data" (ADR 0002 §4).
 */
closeToastsAfterEach();
vi.setConfig({ testTimeout: 20_000 });

beforeEach(() => {
  localStorage.clear();
  clearUserData();
  resetUserStoreForTests();
});

async function signedIn() {
  await signInEmail(MOCK_DEMO_ACCOUNT.email, MOCK_DEMO_ACCOUNT.password);
}

function renderProfile(lang: 'en' | 'es' | 'fr' = 'en') {
  const navigate = vi.fn();
  render(<ProfileView lang={lang} navigate={navigate} />);
  return { navigate, user: userEvent.setup() };
}

const ready = () => waitFor(() => expect(screen.getByTestId('profile')).toHaveAttribute('data-status', 'ready'));

describe('Profile — guard', () => {
  it('server-renders the loading skeleton only (no redirect before the session is known)', () => {
    const html = renderToString(<ProfileView lang="en" navigate={vi.fn()} />);
    expect(html).toContain('data-status="loading"');
    expect(html).not.toContain('profile-account-form');
  });

  it('waits for $authReady before deciding', () => {
    const { navigate } = renderProfile();
    expect($authReady.get()).toBe(false);
    expect(screen.getByTestId('profile')).toHaveAttribute('data-status', 'loading');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('denies an anonymous visitor and sends them home with ?signin=1 (localised)', async () => {
    initAuth();
    const { navigate } = renderProfile('fr');
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(`${withBase('/fr/')}?signin=1`, 'replace'));
    expect(screen.getByTestId('profile')).toHaveAttribute('data-status', 'denied');
    expect(screen.queryByTestId('profile-account-form')).toBeNull();
  });

  it('shows the account to a signed-in user and redirects after signing out', async () => {
    await signedIn();
    const { navigate } = renderProfile();
    await ready();
    expect(screen.getByTestId('profile-name')).toHaveTextContent(MOCK_DEMO_ACCOUNT.displayName);
    expect(screen.getByText(MOCK_DEMO_ACCOUNT.email)).toBeInTheDocument();
    expect(screen.getByText(/Member since January 1, 2024/)).toBeInTheDocument();
    await signOut();
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(`${withBase('/')}?signin=1`, 'replace'));
  });
});

describe('Profile — account form', () => {
  it('rejects a non-https avatar URL with a translated message', async () => {
    await signedIn();
    const { user } = renderProfile('es');
    await ready();
    const url = screen.getByPlaceholderText('https://');
    await user.type(url, 'javascript:alert(1)');
    await user.click(screen.getByTestId('profile-save'));
    expect(await screen.findByText('Escribe una URL https:// válida o déjala vacía.')).toBeInTheDocument();
  });

  it('saves name and avatar URL through the auth provider', async () => {
    await signedIn();
    const { user } = renderProfile();
    await ready();
    const name = screen.getByPlaceholderText('Name');
    await user.clear(name);
    await user.type(name, 'Chef Demo');
    await user.type(screen.getByPlaceholderText('https://'), 'https://avatars.githubusercontent.com/u/9');
    await user.click(screen.getByTestId('profile-save'));
    await waitFor(() => expect($user.get()).toMatchObject({ displayName: 'Chef Demo', photoURL: 'https://avatars.githubusercontent.com/u/9' }));
    expect(screen.getByTestId('profile-name')).toHaveTextContent('Chef Demo');
  });
});

describe('Profile — preferences', () => {
  it('changes units and diet immediately in $preferences', async () => {
    await signedIn();
    const { user } = renderProfile();
    await ready();
    await user.click(screen.getByRole('radio', { name: 'Imperial (lb, oz, cups)' }));
    expect($preferences.get().unitSystem).toBe('imperial');
    await user.click(screen.getByRole('checkbox', { name: 'Vegan' }));
    await user.click(screen.getByRole('checkbox', { name: 'Gluten Free' }));
    expect($preferences.get().dietaryRestrictions).toEqual(['vegan', 'gluten-free']);
    await user.click(screen.getByRole('checkbox', { name: 'Vegan' }));
    expect($preferences.get().dietaryRestrictions).toEqual(['gluten-free']);
    expect(screen.getByTestId('profile-preferences-status')).toHaveTextContent('Preferences saved');
  });

  it('the preferred language is saved, remembered for the / redirect, and opens the localised profile', async () => {
    await signedIn();
    const { user, navigate } = renderProfile();
    await ready();
    await user.click(screen.getByRole('radio', { name: 'Español' }));
    expect($preferences.get().language).toBe('es');
    expect(localStorage.getItem('foodie:locale')).toBe('es');
    expect(navigate).toHaveBeenCalledWith(withBase('/es/profile/'), 'assign');
  });
});

describe('Profile — your data (ADR 0002 §4)', () => {
  it('"Export my data" downloads one JSON with every store', async () => {
    await signedIn();
    addFavorite('rec_003');
    const created: Blob[] = [];
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      created.push(blob as Blob);
      return 'blob:foodie';
    });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const { user } = renderProfile();
    await ready();
    await user.click(screen.getByTestId('profile-export'));
    await waitFor(() => expect(click).toHaveBeenCalled());
    const payload = UserDataExportSchema.parse(JSON.parse(await created[0]!.text()));
    expect(payload.account?.email).toBe(MOCK_DEMO_ACCOUNT.email);
    expect(payload.data[$favorites.key]).toEqual(['rec_003']);
    expect(payload.data[$preferences.key]).toEqual(DEFAULT_PREFERENCES);
    for (const spy of [click, URL.createObjectURL, URL.revokeObjectURL]) vi.mocked(spy).mockRestore();
  });

  it('"Clear my data" asks first (offering the export) and then resets every store', async () => {
    await signedIn();
    addFavorite('rec_004');
    localStorage.setItem('shoppingList', '[]');
    const { user } = renderProfile();
    await ready();
    await user.click(screen.getByTestId('profile-clear'));
    const dialog = await screen.findByTestId('profile-clear-dialog');
    expect(within(dialog).getByTestId('profile-clear-export')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect($favorites.get()).toEqual(['rec_004']);

    await user.click(screen.getByTestId('profile-clear'));
    await user.click(await screen.findByTestId('profile-clear-confirm'));
    expect($favorites.get()).toEqual([]);
    expect(localStorage.getItem('favoriteRecipes')).toBeNull();
    expect(localStorage.getItem('shoppingList')).toBeNull();
    // Clearing data is not signing out.
    expect($user.get()?.email).toBe(MOCK_DEMO_ACCOUNT.email);
  });
});
