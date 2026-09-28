import { LogOutIcon, UserIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { t, type Locale } from '@/i18n';
import type { AuthUser } from '@/schemas/auth';
import { initials } from '@/lib/account-initials';

/**
 * The signed-in half of `AccountMenu` (roadmap Issues 036, 045): avatar
 * trigger + dropdown (identity, Profile, Sign out). Loaded with `React.lazy`
 * only once a user is signed in, so signed-out visitors never download the
 * menu/positioning code. Rendered inside the AccountMenu island — the
 * DropdownMenu compound stays in one React root.
 */
export interface AccountDropdownProps {
  lang: Locale;
  user: AuthUser;
  name: string;
  profileHref: string;
  onSignOut: () => void;
}

export default function AccountDropdown({ lang, user, name, profileHref, onSignOut }: AccountDropdownProps) {
  return (
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
