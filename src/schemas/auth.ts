/**
 * Auth schemas (roadmap Issue 035, D9) — the cross-boundary shapes of the
 * `AuthProvider` contract in `src/lib/auth/contracts.ts`.
 *
 * `AuthUser` is what every adapter (Firebase, mock) hands to `$user`: the
 * minimum profile Foodie shows (name, avatar) plus the stable `uid` used to
 * namespace per-user storage keys (`user-preferences-${uid}`, Issue 037).
 * Nothing else from the provider's user object crosses into the app — no ID
 * tokens, no refresh tokens, no OAuth access tokens (the legacy app kept a
 * GitHub token in localStorage; D10 removes that).
 *
 * The form schemas (`SignIn`, `SignUp`, `ResetPassword`) are consumed by the
 * AuthDialog in Issue 036. Their messages are i18n keys under `auth.*`, not
 * prose, so the dialog can translate them per locale.
 */
import { z } from 'zod';

/** Sign-in methods Foodie offers (D9). `password` = email + password. */
export const AuthMethodSchema = z.enum(['password', 'google.com', 'github.com', 'mock']);
export type AuthMethod = z.infer<typeof AuthMethodSchema>;

export const AuthUserSchema = z.object({
  /** Provider-issued stable id. Never a placeholder (route-guard rule). */
  uid: z.string().min(1),
  email: z.email().nullable(),
  displayName: z.string().nullable(),
  photoURL: z.url().nullable(),
  emailVerified: z.boolean(),
  /** How this session was established. */
  method: AuthMethodSchema,
  /** ISO timestamp of account creation, when the provider reports it. */
  createdAt: z.string().nullable(),
});
export type AuthUser = z.infer<typeof AuthUserSchema>;

/**
 * Normalised error codes — adapters map provider-specific codes onto these so
 * the UI never branches on `auth/…` strings. Sign-in failures collapse to
 * `invalid-credentials` on purpose: distinguishing "no such user" from "wrong
 * password" enables account enumeration.
 */
export const AuthErrorCodeSchema = z.enum([
  'invalid-credentials',
  'email-in-use',
  'invalid-email',
  'weak-password',
  'user-disabled',
  'too-many-requests',
  'popup-closed',
  'popup-blocked',
  'account-exists-with-different-credential',
  'network',
  'not-configured',
  /** An action that needs a session (e.g. `updateProfile`) ran without one. */
  'not-signed-in',
  'unknown',
]);
export type AuthErrorCode = z.infer<typeof AuthErrorCodeSchema>;

/** Firebase's own minimum is 6 characters; keep the form in line with it. */
export const PASSWORD_MIN_LENGTH = 6;

export const SignInSchema = z.object({
  email: z.string().trim().pipe(z.email('auth.errors.invalidEmail')),
  password: z.string().min(1, 'auth.errors.passwordRequired'),
});
export type SignInValues = z.infer<typeof SignInSchema>;

export const SignUpSchema = z
  .object({
    displayName: z.string().trim().min(1, 'auth.errors.nameRequired').max(80),
    email: z.string().trim().pipe(z.email('auth.errors.invalidEmail')),
    password: z.string().min(PASSWORD_MIN_LENGTH, 'auth.errors.weakPassword').max(128),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'auth.errors.passwordMismatch',
    path: ['confirmPassword'],
  });
export type SignUpValues = z.infer<typeof SignUpSchema>;

export const ResetPasswordSchema = z.object({
  email: z.string().trim().pipe(z.email('auth.errors.invalidEmail')),
});
export type ResetPasswordValues = z.infer<typeof ResetPasswordSchema>;

/** Fields `AuthProvider.updateProfile` may change (Issue 036). `null` clears. */
export const ProfileUpdateSchema = z.object({
  displayName: z.string().trim().min(1).max(80).optional(),
  photoURL: z.url().nullable().optional(),
});
export type ProfileUpdate = z.infer<typeof ProfileUpdateSchema>;

/** `https:` only — an avatar is rendered as `<img src>`, never `javascript:`/`data:`. */
const HTTPS_URL = /^https:\/\/[^\s]+$/i;

/**
 * The `/profile` "Account" form (Issue 036). Messages are i18n keys. An empty
 * avatar URL means "no avatar" (stored as `null`).
 */
export const ProfileFormSchema = z.object({
  displayName: z.string().trim().min(1, 'auth.errors.nameRequired').max(80),
  photoURL: z
    .string()
    .trim()
    .refine((v) => v === '' || (HTTPS_URL.test(v) && z.url().safeParse(v).success), 'profile.errors.invalidUrl'),
});
export type ProfileFormValues = z.infer<typeof ProfileFormSchema>;
