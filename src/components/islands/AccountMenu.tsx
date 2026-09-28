import * as React from 'react';
import { useStore } from '@nanostores/react';
import { LogInIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toaster, createToastManager } from '@/components/ui/toast';
import { localizedRoute, t, type Locale } from '@/i18n';
import { withBase } from '@/lib/href';
import { useHydrated } from '@/lib/use-hydrated';
import type { AuthUser } from '@/schemas/auth';
import { $mergeNotice, consumeMergeNotice, undoMerge, type MergeNotice } from '@/stores/account-merge';
import { $authReady, $user, authAvailable, authErrorKey, signOut } from '@/stores/user';
import ErrorBoundary from './ErrorBoundary';

/**
 * The sign-in dialog (react-hook-form + Zod forms + Tabs) is fetched the first
 * time it opens, not with the header on every page (roadmap Issue 045 —
 * landing script budget). It stays in this island, so the Dialog compound is
 * still owned by one React root.
 */
const AuthDialog = React.lazy(() => import('./AuthDialog'));
/** The signed-in avatar menu, likewise fetched only once someone is signed in. */
const AccountDropdown = React.lazy(() => import('./AccountDropdown'));

/**
 * AccountMenu — the header's account slot (roadmap Issue 036), mounted by
 * `SiteHeader.astro` with `client:idle` on every page.
 *
 *  - Signed out: a "Sign in" button that opens `AuthDialog` (same island —
 *    Dialog/Tabs are compounds that cannot span islands).
 *  - Signed in: the avatar opens a dropdown with the identity, "Profile" and
 *    "Sign out".
 *  - Until `$authReady` (session restore in flight) an avatar-sized
 *    placeholder keeps the header from jumping.
 *  - Builds without an auth adapter (`authAvailable === false`: production
 *    without `PUBLIC_FIREBASE_*`) render nothing at all.
 *  - `?signin=1` in the URL (where `/profile/` sends signed-out visitors)
 *    opens the dialog once and is then removed from the address bar.
 *  - The one-time guest → account merge (Issue 037, `stores/account-merge`)
 *    is announced here as a toast with "Undo".
 *
 * Its toasts use a dedicated manager so they never double-render with the
 * page island's own `<Toaster>`.
 */
export interface AccountMenuProps {
  lang: Locale;
}

/** The header's toast queue (welcome, signed out, guest-data merge). */
export const accountToasts = createToastManager();

export default function AccountMenu({ lang }: AccountMenuProps) {
  if (!authAvailable) return null;
  return (
    <ErrorBoundary name="AccountMenu">
      <AccountMenuView lang={lang} />
    </ErrorBoundary>
  );
}

export { initials } from '@/lib/account-initials';

/** The merge toast: what moved into the account, and an Undo button. */
export function showMergeToast(merged: MergeNotice, lang: Locale): string {
  const lines = [
    merged.favoritesAdded > 0 ? t(lang, 'auth.mergeFavorites', { count: merged.favoritesAdded }) : null,
    merged.preferencesAdopted ? t(lang, 'auth.mergePreferences') : null,
  ].filter(Boolean);
  const undo: React.ComponentPropsWithoutRef<'button'> & { 'data-testid': string } = {
    children: t(lang, 'auth.undo'),
    'data-testid': 'merge-undo',
    onClick: () => {
      accountToasts.close(id);
      if (undoMerge()) accountToasts.add({ title: t(lang, 'auth.mergeUndone') });
    },
  };
  const id = accountToasts.add({
    title: t(lang, 'auth.mergeTitle'),
    description: lines.join(' '),
    timeout: 12_000,
    actionProps: undo,
  });
  return id;
}

/** Remove `signin` from the current URL without a navigation. Returns whether it was there. */
function consumeSignInParam(): boolean {
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get('signin') !== '1') return false;
    url.searchParams.delete('signin');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    return true;
  } catch {
    return false;
  }
}

function AccountMenuView({ lang }: AccountMenuProps) {
  const hydrated = useHydrated();
  const user = useStore($user);
  const ready = useStore($authReady);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  // Mount (and so fetch) the lazy dialog on first open; keep it mounted after
  // that so its close animation and form state behave as before.
  const [dialogWanted, setDialogWanted] = React.useState(false);
  if (dialogOpen && !dialogWanted) setDialogWanted(true);

  React.useEffect(() => {
    if (consumeSignInParam()) setDialogOpen(true);
  }, []);

  // Announce each guest → account merge once, with Undo (Issue 037).
  const notice = useStore($mergeNotice);
  React.useEffect(() => {
    if (!notice) return;
    const merged = consumeMergeNotice();
    if (merged) showMergeToast(merged, lang);
  }, [notice, lang]);

  const onSignedIn = React.useCallback(
    (signedIn: AuthUser) => {
      accountToasts.add({ title: t(lang, 'auth.welcome', { name: signedIn.displayName || signedIn.email || t(lang, 'auth.anonymousName') }) });
    },
    [lang],
  );

  const onSignOut = async () => {
    try {
      await signOut();
      accountToasts.add({ title: t(lang, 'auth.signedOut'), description: t(lang, 'profile.signOutHint') });
    } catch (e) {
      accountToasts.add({ title: t(lang, authErrorKey(e)), data: { variant: 'destructive' } });
    }
  };

  const profileHref = withBase(localizedRoute('/profile/', lang));
  const name = user ? user.displayName || user.email || t(lang, 'auth.anonymousName') : '';

  const placeholder = <span className="inline-block size-8 rounded-full bg-muted" aria-hidden="true" data-testid="account-loading" />;
  let body: React.ReactNode;
  if (!hydrated || !ready) {
    body = placeholder;
  } else if (!user) {
    body = (
      <Button variant="ghost" size="sm" className="h-9 gap-1.5 px-2 font-mono text-xs lg:text-sm" onClick={() => setDialogOpen(true)} data-testid="account-signin">
        <LogInIcon className="size-4" aria-hidden="true" />
        {t(lang, 'auth.signIn')}
      </Button>
    );
  } else {
    body = (
      <React.Suspense fallback={placeholder}>
        <AccountDropdown lang={lang} user={user} name={name} profileHref={profileHref} onSignOut={onSignOut} />
      </React.Suspense>
    );
  }

  return (
    <span className="inline-flex items-center" data-testid="account-slot" data-state={!hydrated || !ready ? 'loading' : user ? 'signed-in' : 'signed-out'}>
      {body}
      {dialogWanted ? (
        <React.Suspense fallback={null}>
          <AuthDialog lang={lang} open={dialogOpen} onOpenChange={setDialogOpen} onSignedIn={onSignedIn} />
        </React.Suspense>
      ) : null}
      <Toaster manager={accountToasts} closeLabel={t(lang, 'common.close')} />
    </span>
  );
}
