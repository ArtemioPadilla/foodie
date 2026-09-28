// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MOCK_DEMO_ACCOUNT } from '@/lib/auth/mock';
import { $user, resetUserStoreForTests } from '@/stores/user';
import AuthDialog from './AuthDialog';

/**
 * AuthDialog (roadmap Issue 036) against the mock adapter (vitest MODE=test):
 * tabs sign in / sign up, reset password, Google/GitHub, "continue as guest",
 * and every failure translated through `auth.errors.<code>`.
 */
vi.setConfig({ testTimeout: 20_000 });

beforeEach(() => {
  localStorage.clear();
  resetUserStoreForTests();
});

function setup(lang: 'en' | 'es' | 'fr' = 'en') {
  const onOpenChange = vi.fn();
  const onSignedIn = vi.fn();
  render(<AuthDialog lang={lang} open onOpenChange={onOpenChange} onSignedIn={onSignedIn} />);
  return { onOpenChange, onSignedIn, user: userEvent.setup() };
}

describe('AuthDialog — sign in', () => {
  it('shows the sign-in / sign-up tabs, social buttons and the guest way out', async () => {
    setup();
    const dialog = await screen.findByTestId('auth-dialog');
    expect(dialog).toHaveAccessibleName('Welcome to Foodie');
    expect(screen.getByRole('tab', { name: 'Sign In' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Sign Up' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue with GitHub' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue as Guest' })).toBeInTheDocument();
  });

  it('validates with translated messages before calling the provider', async () => {
    const { user, onSignedIn } = setup();
    await user.click(await screen.findByTestId('signin-submit'));
    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByText('Enter your password.')).toBeInTheDocument();
    expect(onSignedIn).not.toHaveBeenCalled();
  });

  it('signs the demo account in, closes and reports the user', async () => {
    const { user, onOpenChange, onSignedIn } = setup();
    await user.type(await screen.findByPlaceholderText('Email'), MOCK_DEMO_ACCOUNT.email);
    await user.type(screen.getByPlaceholderText('Password'), MOCK_DEMO_ACCOUNT.password);
    await user.click(screen.getByTestId('signin-submit'));
    await waitFor(() => expect(onSignedIn).toHaveBeenCalledWith(expect.objectContaining({ email: MOCK_DEMO_ACCOUNT.email })));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect($user.get()?.email).toBe(MOCK_DEMO_ACCOUNT.email);
  });

  it('shows the normalised provider error (no account enumeration)', async () => {
    const { user, onSignedIn } = setup();
    await user.type(await screen.findByPlaceholderText('Email'), MOCK_DEMO_ACCOUNT.email);
    await user.type(screen.getByPlaceholderText('Password'), 'wrong-password');
    await user.click(screen.getByTestId('signin-submit'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect.');
    expect(onSignedIn).not.toHaveBeenCalled();
    expect($user.get()).toBeNull();
  });

  it('reveals the password with a localised toggle', async () => {
    const { user } = setup('fr');
    await user.click(await screen.findByRole('button', { name: 'Afficher le mot de passe' }));
    expect(screen.getByPlaceholderText('Mot de Passe')).toHaveAttribute('type', 'text');
  });
});

describe('AuthDialog — sign up', () => {
  it('checks the confirmation and creates the account', async () => {
    const { user, onSignedIn } = setup();
    await user.click(await screen.findByRole('tab', { name: 'Sign Up' }));
    await user.type(await screen.findByPlaceholderText('Name'), 'New Cook');
    await user.type(screen.getByPlaceholderText('Email'), 'new@foodie.test');
    await user.type(screen.getByPlaceholderText('Password'), 'secret12');
    await user.type(screen.getByPlaceholderText('Confirm Password'), 'secret13');
    await user.click(screen.getByTestId('signup-submit'));
    expect(await screen.findByText('The passwords do not match.')).toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText('Confirm Password'));
    await user.type(screen.getByPlaceholderText('Confirm Password'), 'secret12');
    await user.click(screen.getByTestId('signup-submit'));
    await waitFor(() => expect(onSignedIn).toHaveBeenCalled());
    expect($user.get()).toMatchObject({ email: 'new@foodie.test', displayName: 'New Cook' });
  });

  it('translates email-in-use (Spanish)', async () => {
    const { user } = setup('es');
    await user.click(await screen.findByRole('tab', { name: 'Registrarse' }));
    await user.type(await screen.findByPlaceholderText('Nombre'), 'Demo');
    await user.type(screen.getByPlaceholderText('Correo Electrónico'), MOCK_DEMO_ACCOUNT.email);
    await user.type(screen.getByPlaceholderText('Contraseña'), 'secret12');
    await user.type(screen.getByPlaceholderText('Confirmar Contraseña'), 'secret12');
    await user.click(screen.getByTestId('signup-submit'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Ya existe una cuenta con este correo. Inicia sesión.');
  });
});

describe('AuthDialog — reset password, social, guest', () => {
  it('sends a reset link for any valid email and goes back to sign in', async () => {
    const { user } = setup();
    await user.click(await screen.findByTestId('auth-forgot'));
    expect(screen.getByTestId('auth-dialog')).toHaveAccessibleName('Reset Password');
    await user.type(screen.getByPlaceholderText('Email'), 'ghost@foodie.test');
    await user.click(screen.getByTestId('reset-submit'));
    expect(await screen.findByTestId('reset-sent')).toHaveTextContent('ghost@foodie.test');
    await user.click(screen.getByTestId('auth-back'));
    expect(await screen.findByTestId('signin-form')).toBeInTheDocument();
  });

  it('Google and GitHub sign in through the same store', async () => {
    const { user, onSignedIn } = setup();
    await user.click(await screen.findByTestId('auth-github'));
    await waitFor(() => expect(onSignedIn).toHaveBeenCalledWith(expect.objectContaining({ method: 'github.com' })));
    await user.click(screen.getByTestId('auth-google'));
    await waitFor(() => expect($user.get()?.method).toBe('google.com'));
  });

  it('"Continue as Guest" just closes the dialog', async () => {
    const { user, onOpenChange, onSignedIn } = setup();
    await user.click(await screen.findByTestId('auth-guest'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSignedIn).not.toHaveBeenCalled();
    expect($user.get()).toBeNull();
  });
});
