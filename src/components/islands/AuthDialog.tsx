import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type FieldValues, type Path, type UseFormReturn } from 'react-hook-form';
import { ArrowLeftIcon, LogInIcon, MailIcon, UserPlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { t, type Locale } from '@/i18n';
import {
  ResetPasswordSchema,
  SignInSchema,
  SignUpSchema,
  type AuthUser,
  type ResetPasswordValues,
  type SignInValues,
  type SignUpValues,
} from '@/schemas/auth';
import {
  authErrorKey,
  preloadAuth,
  resetPassword,
  signInEmail,
  signInGitHub,
  signInGoogle,
  signUpEmail,
} from '@/stores/user';

/**
 * AuthDialog — sign in / sign up / reset password (roadmap Issue 036; port of
 * legacy `AuthModal` + `SignInForm` + `SignUpForm` + `SocialLogin`).
 *
 * Not an island on its own: `Dialog` and `Tabs` are Base UI compounds, so the
 * dialog lives in the same island as whatever opens it (`AccountMenu`), per
 * the compound-component rule. Opening it preloads the auth adapter (the
 * Firebase chunk) so the first click on "Sign in" does not wait for it.
 *
 * Forms are react-hook-form + the Zod schemas of `src/schemas/auth.ts`, whose
 * messages are `auth.errors.*` keys; provider failures are `AuthError`s whose
 * normalised code is shown as `auth.errors.<code>`.
 */
export type AuthTab = 'signin' | 'signup';

export interface AuthDialogProps {
  lang: Locale;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the new session after any successful sign-in / sign-up. */
  onSignedIn?: (user: AuthUser) => void;
  defaultTab?: AuthTab;
}

type View = AuthTab | 'reset';

export default function AuthDialog({ lang, open, onOpenChange, onSignedIn, defaultTab = 'signin' }: AuthDialogProps) {
  const [view, setView] = React.useState<View>(defaultTab);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    preloadAuth().catch(() => {
      /* surfaced by the first action instead */
    });
  }, [open]);

  /** Every close (✕, Escape, success) resets the dialog for next time. */
  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (!next) {
        setView(defaultTab);
        setError(null);
      }
      onOpenChange(next);
    },
    [defaultTab, onOpenChange],
  );

  /** Run one auth action with a shared busy flag and translated errors. */
  const run = React.useCallback(
    async (action: () => Promise<AuthUser>) => {
      setPending(true);
      setError(null);
      try {
        const user = await action();
        handleOpenChange(false);
        onSignedIn?.(user);
      } catch (e) {
        setError(t(lang, authErrorKey(e)));
      } finally {
        setPending(false);
      }
    },
    [lang, handleOpenChange, onSignedIn],
  );

  const errorBox = error ? (
    <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive" data-testid="auth-error">
      {error}
    </p>
  ) : null;

  return (
    <Dialog open={open} onOpenChange={(next) => handleOpenChange(next)}>
      <DialogContent lang={lang} className="max-h-[90vh] overflow-y-auto sm:max-w-md" data-testid="auth-dialog">
        <DialogHeader>
          <DialogTitle className="font-display">{view === 'reset' ? t(lang, 'auth.resetPassword') : t(lang, 'auth.dialogTitle')}</DialogTitle>
          <DialogDescription>{view === 'reset' ? t(lang, 'auth.resetDescription') : t(lang, 'auth.dialogDescription')}</DialogDescription>
        </DialogHeader>

        {view === 'reset' ? (
          <ResetForm lang={lang} pending={pending} setPending={setPending} onBack={() => setView('signin')} />
        ) : (
          <>
            <Tabs value={view} onValueChange={(v) => { setView(v as AuthTab); setError(null); }}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin" data-testid="auth-tab-signin">{t(lang, 'auth.signIn')}</TabsTrigger>
                <TabsTrigger value="signup" data-testid="auth-tab-signup">{t(lang, 'auth.signUp')}</TabsTrigger>
              </TabsList>
              <TabsContent value="signin" className="pt-2">
                <SignInForm
                  lang={lang}
                  pending={pending}
                  onSubmit={(v) => run(() => signInEmail(v.email, v.password))}
                  onForgot={() => { setView('reset'); setError(null); }}
                  error={errorBox}
                />
              </TabsContent>
              <TabsContent value="signup" className="pt-2">
                <SignUpForm
                  lang={lang}
                  pending={pending}
                  onSubmit={(v) => run(() => signUpEmail(v.email, v.password, v.displayName))}
                  error={errorBox}
                />
              </TabsContent>
            </Tabs>
            <SocialButtons lang={lang} pending={pending} onGoogle={() => run(signInGoogle)} onGitHub={() => run(signInGitHub)} />
            {/* ADR 0012 ethics item 2: anonymous use stays one click away. */}
            <Button type="button" variant="ghost" className="w-full" onClick={() => handleOpenChange(false)} data-testid="auth-guest">
              {t(lang, 'auth.guestMode')}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Fields ────────────────────────────────────────────────────────────────────

interface TextFieldProps<T extends FieldValues> {
  form: UseFormReturn<T>;
  name: Path<T>;
  label: string;
  lang: Locale;
  type?: 'text' | 'email' | 'password';
  autoComplete: string;
  disabled: boolean;
}

function TextField<T extends FieldValues>({ form, name, label, lang, type = 'text', autoComplete, disabled }: TextFieldProps<T>) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            {type === 'password' ? (
              <PasswordInput
                {...field}
                placeholder={label}
                autoComplete={autoComplete}
                disabled={disabled}
                showLabel={t(lang, 'auth.showPassword')}
                hideLabel={t(lang, 'auth.hidePassword')}
              />
            ) : (
              <Input {...field} type={type} placeholder={label} autoComplete={autoComplete} disabled={disabled} />
            )}
          </FormControl>
          <FormMessage format={(key) => t(lang, key)} />
        </FormItem>
      )}
    />
  );
}

interface FormProps<T> {
  lang: Locale;
  pending: boolean;
  onSubmit: (values: T) => Promise<void> | void;
  error: React.ReactNode;
}

function SignInForm({ lang, pending, onSubmit, onForgot, error }: FormProps<SignInValues> & { onForgot: () => void }) {
  const form = useForm<SignInValues>({ resolver: zodResolver(SignInSchema), defaultValues: { email: '', password: '' } });
  return (
    <Form {...form}>
      <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="signin-form">
        <TextField form={form} name="email" type="email" label={t(lang, 'auth.email')} lang={lang} autoComplete="email" disabled={pending} />
        <TextField form={form} name="password" type="password" label={t(lang, 'auth.password')} lang={lang} autoComplete="current-password" disabled={pending} />
        {error}
        <div className="flex flex-col gap-2">
          <Button type="submit" className="w-full" disabled={pending} data-testid="signin-submit">
            <LogInIcon aria-hidden="true" />
            {pending ? t(lang, 'auth.submitting') : t(lang, 'auth.signIn')}
          </Button>
          <Button type="button" variant="link" className="self-start px-0" onClick={onForgot} disabled={pending} data-testid="auth-forgot">
            {t(lang, 'auth.forgotPassword')}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function SignUpForm({ lang, pending, onSubmit, error }: FormProps<SignUpValues>) {
  const form = useForm<SignUpValues>({
    resolver: zodResolver(SignUpSchema),
    defaultValues: { displayName: '', email: '', password: '', confirmPassword: '' },
  });
  return (
    <Form {...form}>
      <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="signup-form">
        <TextField form={form} name="displayName" label={t(lang, 'auth.displayName')} lang={lang} autoComplete="name" disabled={pending} />
        <TextField form={form} name="email" type="email" label={t(lang, 'auth.email')} lang={lang} autoComplete="email" disabled={pending} />
        <TextField form={form} name="password" type="password" label={t(lang, 'auth.password')} lang={lang} autoComplete="new-password" disabled={pending} />
        <TextField form={form} name="confirmPassword" type="password" label={t(lang, 'auth.confirmPassword')} lang={lang} autoComplete="new-password" disabled={pending} />
        {error}
        <Button type="submit" className="w-full" disabled={pending} data-testid="signup-submit">
          <UserPlusIcon aria-hidden="true" />
          {pending ? t(lang, 'auth.submitting') : t(lang, 'auth.createAccount')}
        </Button>
      </form>
    </Form>
  );
}

function ResetForm({
  lang,
  pending,
  setPending,
  onBack,
}: {
  lang: Locale;
  pending: boolean;
  setPending: (pending: boolean) => void;
  onBack: () => void;
}) {
  const form = useForm<ResetPasswordValues>({ resolver: zodResolver(ResetPasswordSchema), defaultValues: { email: '' } });
  const [status, setStatus] = React.useState<{ ok: boolean; text: string } | null>(null);

  const onSubmit = async ({ email }: ResetPasswordValues) => {
    setPending(true);
    setStatus(null);
    try {
      await resetPassword(email);
      setStatus({ ok: true, text: t(lang, 'auth.resetSent', { email }) });
    } catch (e) {
      setStatus({ ok: false, text: t(lang, authErrorKey(e)) });
    } finally {
      setPending(false);
    }
  };

  return (
    <Form {...form}>
      <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="reset-form">
        <TextField form={form} name="email" type="email" label={t(lang, 'auth.email')} lang={lang} autoComplete="email" disabled={pending} />
        {status ? (
          <p
            role={status.ok ? 'status' : 'alert'}
            className={status.ok ? 'text-sm text-muted-foreground' : 'text-sm text-destructive'}
            data-testid={status.ok ? 'reset-sent' : 'auth-error'}
          >
            {status.text}
          </p>
        ) : null}
        <div className="flex flex-col gap-2">
          <Button type="submit" className="w-full" disabled={pending} data-testid="reset-submit">
            <MailIcon aria-hidden="true" />
            {pending ? t(lang, 'auth.submitting') : t(lang, 'auth.sendResetLink')}
          </Button>
          <Button type="button" variant="link" className="self-start px-0" onClick={onBack} disabled={pending} data-testid="auth-back">
            <ArrowLeftIcon aria-hidden="true" />
            {t(lang, 'auth.backToSignIn')}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function SocialButtons({ lang, pending, onGoogle, onGitHub }: { lang: Locale; pending: boolean; onGoogle: () => void; onGitHub: () => void }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        {t(lang, 'auth.orContinueWith')}
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Button type="button" variant="outline" onClick={onGoogle} disabled={pending} aria-label={t(lang, 'auth.continueWithGoogle')} data-testid="auth-google">
          <GoogleMark />
          {t(lang, 'auth.google')}
        </Button>
        <Button type="button" variant="outline" onClick={onGitHub} disabled={pending} aria-label={t(lang, 'auth.continueWithGitHub')} data-testid="auth-github">
          <GitHubMark />
          {t(lang, 'auth.github')}
        </Button>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function GitHubMark() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}
