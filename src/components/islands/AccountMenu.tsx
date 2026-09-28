import * as React from 'react';
import { useStore } from '@nanostores/react';
import { LogInIcon, LogOutIcon, UserIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Toaster, createToastManager } from '@/components/ui/toast';
import { localizedRoute, t, type Locale } from '@/i18n';
import { withBase } from '@/lib/href';
import { useHydrated } from '@/lib/use-hydrated';
import type { AuthUser } from '@/schemas/auth';
import { $mergeNotice, consumeMergeNotice, undoMerge, type MergeNotice } from '@/stores/account-merge';
import { $authReady, $user, authAvailable, authErrorKey, signOut } from '@/stores/user';
import AuthDialog from './AuthDialog';
import ErrorBoundary from './ErrorBoundary';

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

export function initials(user: Pick<AuthUser, 'displayName' | 'email'>): string {
  const source = user.displayName?.trim() || user.email?.split('@')[0] || '';
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  const letters = parts.length > 1 ? `${parts[0]![0]}${parts[1]![0]}` : source.slice(0, 2);
  return letters.toUpperCase() || '?';
}

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

  let body: React.ReactNode;
  if (!hydrated || !ready) {
    body = <span className="inline-block size-8 rounded-full bg-muted" aria-hidden="true" data-testid="account-loading" />;
  } else if (!user) {
    body = (
      <Button variant="ghost" size="sm" className="h-9 gap-1.5 px-2 font-mono text-xs lg:text-sm" onClick={() => setDialogOpen(true)} data-testid="account-signin">
        <LogInIcon className="size-4" aria-hidden="true" />
        {t(lang, 'auth.signIn')}
      </Button>
    );
  } else {
    body = (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="size-9 rounded-full p-0"
              aria-label={t(lang, 'auth.accountMenu', { name })}
              data-testid="account-menu-trigger"
            />
          }
        >
          <Avatar className="size-8">
            {user.photoURL ? <AvatarImage src={user.photoURL} alt="" referrerPolicy="no-referrer" /> : null}
            <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">{initials(user)}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60" lang={lang} data-testid="account-menu">
          <div className="px-2 py-1.5 text-sm">
            <p className="text-xs text-muted-foreground">{t(lang, 'auth.signedInAs')}</p>
            <p className="truncate font-medium text-foreground" data-testid="account-name">{name}</p>
            {user.email && user.email !== name ? <p className="truncate text-xs text-muted-foreground">{user.email}</p> : null}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            render={(props) => (
              <a {...props} href={profileHref}>
                {props.children}
              </a>
            )}
            data-testid="account-profile"
          >
            <UserIcon className="size-4" aria-hidden="true" />
            {t(lang, 'auth.profile')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onSignOut} data-testid="account-signout">
            <LogOutIcon className="size-4" aria-hidden="true" />
            {t(lang, 'auth.signOut')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <span className="inline-flex items-center" data-testid="account-slot" data-state={!hydrated || !ready ? 'loading' : user ? 'signed-in' : 'signed-out'}>
      {body}
      <AuthDialog lang={lang} open={dialogOpen} onOpenChange={setDialogOpen} onSignedIn={onSignedIn} />
      <Toaster manager={accountToasts} closeLabel={t(lang, 'common.close')} />
    </span>
  );
}
