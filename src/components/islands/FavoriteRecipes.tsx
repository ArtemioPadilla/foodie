import * as React from 'react';
import { useStore } from '@nanostores/react';
import { ArrowRightIcon } from 'lucide-react';
import { RecipeCard, RecipeCardSkeleton } from '@/components/domain/RecipeCard';
import { Toaster } from '@/components/ui/toast';
import { localizedRoute, t, type Locale } from '@/i18n';
import { useCatalog } from '@/lib/catalog/use-catalog';
import { withBase } from '@/lib/href';
import { useHydrated } from '@/lib/use-hydrated';
import { $favorites } from '@/stores/favorites';
import ErrorBoundary from './ErrorBoundary';
import QueryProvider from './QueryProvider';

/**
 * FavoriteRecipes — the landing's "Your favorites" section (roadmap Issue
 * 020), hydrated with `client:visible`.
 *
 * - Renders nothing but an empty slot on the server and until the visitor
 *   has favourites (`$favorites`, legacy `favoriteRecipes` key), so the
 *   static landing is unchanged for first-time visitors and the catalog is
 *   only fetched (`useCatalog`) when there is something to show.
 * - Up to `limit` cards (favourites order, most recent last → shown first),
 *   each with its `FavoriteButton`; "See all" deep-links `/recipes/?favorites=1`.
 * - The slot keeps a 1px box so Astro's `client:visible` observer has an
 *   element to watch.
 */
export interface FavoriteRecipesProps {
  lang: Locale;
  /** How many cards to show (default 3). */
  limit?: number;
}

export default function FavoriteRecipes({ lang, limit = 3 }: FavoriteRecipesProps) {
  const hydrated = useHydrated();
  const favorites = useStore($favorites);
  if (!hydrated || favorites.length === 0) {
    return <div className="h-px" data-testid="favorite-recipes-slot" aria-hidden="true" />;
  }
  return (
    <QueryProvider>
      <ErrorBoundary name="FavoriteRecipes">
        <FavoriteRecipesView lang={lang} limit={limit} favorites={favorites} />
      </ErrorBoundary>
    </QueryProvider>
  );
}

export function FavoriteRecipesView({ lang, limit = 3, favorites }: FavoriteRecipesProps & { favorites: ReadonlyArray<string> }) {
  const catalog = useCatalog();
  const byId = React.useMemo(() => new Map(catalog.recipes.map((r) => [r.id, r] as const)), [catalog.recipes]);
  // Newest favourite first; ids no longer in the catalog are skipped.
  const recipes = React.useMemo(
    () =>
      [...favorites].reverse().flatMap((id) => {
        const recipe = byId.get(id);
        return recipe ? [recipe] : [];
      }),
    [favorites, byId],
  );
  const loading = catalog.status === 'loading';
  if (!loading && recipes.length === 0) {
    return <div className="h-px" data-testid="favorite-recipes-slot" aria-hidden="true" />;
  }
  const shown = recipes.slice(0, limit);
  const more = recipes.length - shown.length;
  const allHref = `${withBase(localizedRoute('/recipes/', lang))}?favorites=1`;

  return (
    <section className="border-t border-border" aria-labelledby="favorites-heading" data-testid="favorite-recipes">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">{t(lang, 'home.favoritesKicker')}</p>
            <h2 id="favorites-heading" className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {t(lang, 'home.favoritesHeading')}
            </h2>
          </div>
          <a
            href={allHref}
            className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="favorites-view-all"
          >
            {t(lang, 'home.favoritesViewAll')}
            <ArrowRightIcon className="size-4" aria-hidden="true" />
          </a>
        </div>

        <ul className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy={loading || undefined}>
          {loading
            ? Array.from({ length: Math.min(limit, favorites.length) }).map((_, i) => (
                <li key={i}>
                  <RecipeCardSkeleton />
                </li>
              ))
            : shown.map((recipe) => (
                <li key={recipe.id} className="flex">
                  <RecipeCard
                    recipe={recipe}
                    lang={lang}
                    href={withBase(localizedRoute(`/recipes/${recipe.id}/`, lang))}
                    showFavoriteButton
                    className="w-full"
                  />
                </li>
              ))}
        </ul>
        {more > 0 && (
          <p className="mt-6 text-sm text-muted-foreground" data-testid="favorites-more">
            <a href={allHref} className="text-primary hover:underline">
              {t(lang, 'home.favoritesMore', { count: more })}
            </a>
          </p>
        )}
      </div>
      <Toaster closeLabel={t(lang, 'common.close')} />
    </section>
  );
}
