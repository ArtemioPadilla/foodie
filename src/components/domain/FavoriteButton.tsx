import * as React from 'react';
import { useStore } from '@nanostores/react';
import { HeartIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { t, type Locale } from '@/i18n';
import { useHydrated } from '@/lib/use-hydrated';
import { cn } from '@/lib/utils';
import { $favorites, toggleFavorite } from '@/stores/favorites';

/**
 * FavoriteButton — the reusable favourite toggle (roadmap Issue 020).
 *
 * - Reads and writes `$favorites` (persisted under the legacy
 *   `favoriteRecipes` key, so favourites saved by the old app survive).
 * - A toggle button: `aria-pressed` carries the state; the `icon`
 *   appearance keeps a constant accessible name ("Favorite: <name>"), the
 *   `full` one shows "Add to Favorites" / "Favorited".
 * - Announces every change with `toast()`; the island that renders it must
 *   mount one `<Toaster />` in the same React root (compound components
 *   never span islands).
 * - Store state is only reflected after hydration (`useHydrated`), so the
 *   SSR markup (never pressed) and the first client render always agree.
 * - The button is `disabled` until its island has hydrated. Islands hydrate
 *   lazily (`client:visible` on the recipe detail), and before that there is
 *   no React root to receive — or replay — a click: an enabled SSR button
 *   silently swallowed early clicks (the flaky favourites journey, roadmap
 *   #020). Disabled-until-live means neither a user nor Playwright's
 *   actionability check can press a control that cannot work yet.
 */
export interface FavoriteButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'onToggle' | 'children' | 'aria-pressed'> {
  recipeId: string;
  /** Localised recipe name, for the accessible name and the toast. */
  recipeName: string;
  lang: Locale;
  /** `full` — outlined button with label (detail page); `icon` — round icon button (cards). */
  appearance?: 'full' | 'icon';
  /** Called after the store changed, with the new state. */
  onFavoriteChange?: (favorite: boolean) => void;
}

export function FavoriteButton({
  recipeId,
  recipeName,
  lang,
  appearance = 'full',
  onFavoriteChange,
  className,
  disabled,
  ...props
}: FavoriteButtonProps) {
  const hydrated = useHydrated();
  const favorites = useStore($favorites);
  const favorite = hydrated && favorites.includes(recipeId);
  const inert = !hydrated || disabled;

  const onClick = () => {
    const wasFavorite = $favorites.get().includes(recipeId);
    toggleFavorite(recipeId);
    toast({
      title: t(lang, wasFavorite ? 'recipe.removedFromFavorites' : 'recipe.addedToFavorites', { name: recipeName }),
    });
    onFavoriteChange?.(!wasFavorite);
  };

  if (appearance === 'icon') {
    const label = t(lang, 'recipe.favoriteToggle', { name: recipeName });
    return (
      <Button
        type="button"
        size="icon"
        variant="outline"
        aria-pressed={favorite}
        aria-label={label}
        title={favorite ? t(lang, 'recipe.removeFromFavorites') : t(lang, 'recipe.addToFavorites')}
        onClick={onClick}
        disabled={inert}
        data-favorite={favorite ? 'true' : 'false'}
        className={cn(
          'size-9 rounded-full border-transparent bg-background/90 shadow-sm backdrop-blur hover:bg-background',
          favorite ? 'text-rose-600 dark:text-rose-400' : 'text-foreground',
          className,
        )}
        {...props}
      >
        <HeartIcon className={cn('size-4', favorite && 'fill-current')} aria-hidden="true" />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant={favorite ? 'default' : 'outline'}
      aria-pressed={favorite}
      onClick={onClick}
      disabled={inert}
      data-favorite={favorite ? 'true' : 'false'}
      className={className}
      {...props}
    >
      <HeartIcon className={cn('size-4', favorite && 'fill-current')} aria-hidden="true" />
      {favorite ? t(lang, 'recipe.favorited') : t(lang, 'recipe.addToFavorites')}
    </Button>
  );
}
