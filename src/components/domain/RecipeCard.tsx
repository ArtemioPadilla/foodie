import * as React from 'react';
import { CakeIcon, ClockIcon, CookieIcon, HeartIcon, MoonIcon, StarIcon, SunIcon, SunriseIcon, UsersIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getTranslated, t, type Locale } from '@/i18n';
import { cn } from '@/lib/utils';
import type { Difficulty, MealType, Recipe, RecipeView } from '@/schemas';
import { DietaryBadges } from './DietaryBadges';
import { FavoriteButton } from './FavoriteButton';

/**
 * RecipeCard — the catalog card of the Foodie domain (roadmap Issue 017; port
 * of legacy `RecipeCard` + the inline card of `RecipesPage`, and of
 * `RecipeList`'s row for `view="list"`).
 *
 * - No recipe ships an `imageUrl` today, so the art is a tinted placeholder
 *   with a lucide icon per meal type; a real image (`loading="lazy"`) takes
 *   over when present.
 * - `href` makes the whole card a link (stretched-link pattern: the title is
 *   the only anchor, so screen readers hear one link per card); `onClick`
 *   keeps the legacy clickable-card behaviour for pickers.
 * - Favourites: `showFavoriteButton` puts the interactive `FavoriteButton`
 *   on the art (islands); `isFavorite` is the read-only heart (static HTML).
 * - Strings come from the dictionaries via `lang` (never `navigator.language`).
 */
export interface RecipeCardProps extends Omit<React.HTMLAttributes<HTMLElement>, 'onClick'> {
  recipe: Recipe;
  lang?: Locale;
  /** Link target, already passed through `withBase()` by the caller. */
  href?: string;
  onClick?: () => void;
  /** `grid` (vertical card, default) or `list` (horizontal row). */
  view?: RecipeView;
  /** Shows a filled heart on the art when true (read-only mark for static renders). */
  isFavorite?: boolean;
  /**
   * Renders the interactive `FavoriteButton` on the art instead of the
   * read-only heart (roadmap Issue 020). Only inside a hydrated island that
   * mounts a `<Toaster />` — in static Astro markup the button would be inert.
   */
  showFavoriteButton?: boolean;
  /** Legacy `showNutrition`: calories / protein / carbs footer. */
  showNutrition?: boolean;
}

const MEAL_TYPE_ART: Record<MealType, { Icon: React.ComponentType<{ className?: string }>; tint: string }> = {
  breakfast: { Icon: SunriseIcon, tint: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  lunch: { Icon: SunIcon, tint: 'bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300' },
  dinner: { Icon: MoonIcon, tint: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' },
  snack: { Icon: CookieIcon, tint: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300' },
  dessert: { Icon: CakeIcon, tint: 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300' },
};

const DIFFICULTY_CLASS: Record<Difficulty, string> = {
  easy: 'border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  medium: 'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  hard: 'border-transparent bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200',
};

/** Recipe art: the image when present, otherwise the per-meal-type placeholder. */
export function RecipeArt({
  recipe,
  lang = 'en',
  className,
}: {
  recipe: Recipe;
  lang?: Locale;
  className?: string;
}) {
  const name = getTranslated(recipe.name, lang);
  if (recipe.imageUrl) {
    return (
      <img
        src={recipe.imageUrl}
        alt={name}
        loading="lazy"
        decoding="async"
        className={cn('h-full w-full object-cover', className)}
      />
    );
  }
  const { Icon, tint } = MEAL_TYPE_ART[recipe.type];
  return (
    <div
      role="img"
      aria-label={t(lang, 'recipe.imagePlaceholder', { name })}
      data-testid="recipe-art-placeholder"
      data-meal-type={recipe.type}
      className={cn('flex h-full w-full items-center justify-center', tint, className)}
    >
      <Icon className="size-1/3 opacity-80" aria-hidden="true" />
    </div>
  );
}

export function DifficultyBadge({ difficulty, lang = 'en', className }: { difficulty: Difficulty; lang?: Locale; className?: string }) {
  return (
    <Badge className={cn(DIFFICULTY_CLASS[difficulty], className)} data-difficulty={difficulty}>
      {t(lang, `recipe.difficulty_${difficulty}`)}
    </Badge>
  );
}

export function RecipeCard({
  recipe,
  lang = 'en',
  href,
  onClick,
  view = 'grid',
  isFavorite = false,
  showFavoriteButton = false,
  showNutrition = false,
  className,
  ...props
}: RecipeCardProps) {
  const name = getTranslated(recipe.name, lang);
  const description = getTranslated(recipe.description, lang);
  const interactive = Boolean(href || onClick);
  const isList = view === 'list';

  const title = href ? (
    // Stretched link: `after:absolute after:inset-0` makes the whole card the hit area.
    <a href={href} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
      {name}
    </a>
  ) : (
    name
  );

  const meta = (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
      <span className="inline-flex items-center gap-1" title={t(lang, 'recipe.totalTime')}>
        <ClockIcon className="size-4" aria-hidden="true" />
        <span>
          {recipe.totalTime} {t(lang, 'common.minutesAbbr')}
        </span>
      </span>
      <span className="inline-flex items-center gap-1">
        <UsersIcon className="size-4" aria-hidden="true" />
        <span>{recipe.servings}</span>
        <span className="sr-only">{t(lang, 'recipe.servingsCount', { count: recipe.servings })}</span>
      </span>
      <span className="inline-flex items-center gap-1" title={t(lang, 'recipe.rating')}>
        <StarIcon className="size-4 fill-amber-400 text-amber-400" aria-hidden="true" />
        <span className="font-medium text-foreground">{recipe.rating.toFixed(1)}</span>
        {recipe.reviewCount > 0 && (
          <span className="text-xs" aria-label={t(lang, 'recipe.reviewCount', { count: recipe.reviewCount })}>
            ({recipe.reviewCount})
          </span>
        )}
      </span>
    </div>
  );

  return (
    <Card
      // React 19 lets `Card` forward `ref`; we only need the semantics here.
      role={onClick && !href ? 'button' : undefined}
      tabIndex={onClick && !href ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick && !href
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      data-testid="recipe-card"
      data-recipe-id={recipe.id}
      data-view={view}
      className={cn(
        'relative overflow-hidden transition-all',
        interactive && 'cursor-pointer hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10',
        href && 'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
        isList ? 'flex items-stretch gap-4 p-3' : 'flex flex-col',
        className,
      )}
      {...props}
    >
      <div className={cn('relative shrink-0 overflow-hidden bg-muted', isList ? 'h-24 w-24 rounded-md sm:h-28 sm:w-28' : 'h-44')}>
        <RecipeArt recipe={recipe} lang={lang} />
        {showFavoriteButton ? (
          // Above the stretched title link (z-10) so it stays clickable.
          <div className="absolute left-2 top-2 z-10">
            <FavoriteButton recipeId={recipe.id} recipeName={name} lang={lang} appearance="icon" data-testid="recipe-card-favorite-button" />
          </div>
        ) : isFavorite && (
          <span
            className="absolute left-2 top-2 inline-flex size-7 items-center justify-center rounded-full bg-background/90 text-rose-500 shadow-sm"
            title={t(lang, 'recipe.favorited')}
            data-testid="recipe-card-favorite"
          >
            <HeartIcon className="size-4 fill-current" aria-hidden="true" />
            <span className="sr-only">{t(lang, 'recipe.favorited')}</span>
          </span>
        )}
        {!isList && <DifficultyBadge difficulty={recipe.difficulty} lang={lang} className="absolute right-2 top-2 shadow-sm" />}
      </div>

      <div className={cn('flex min-w-0 flex-1 flex-col gap-2', isList ? 'py-0.5' : 'p-4')}>
        <div className="flex items-start justify-between gap-2">
          <h3 className={cn('font-display font-semibold leading-snug text-foreground', isList ? 'text-base' : 'text-lg line-clamp-1')}>
            {title}
          </h3>
          {isList && <DifficultyBadge difficulty={recipe.difficulty} lang={lang} className="shrink-0" />}
        </div>
        <p className={cn('text-sm text-muted-foreground', isList ? 'line-clamp-1' : 'line-clamp-2')}>{description}</p>
        <DietaryBadges labels={recipe.dietaryLabels} lang={lang} max={isList ? 2 : 3} />
        <div className={cn(isList ? 'mt-auto' : 'mt-auto pt-1')}>{meta}</div>

        {showNutrition && (
          <dl className="mt-2 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center text-xs">
            <div>
              <dd className="font-semibold text-foreground">{recipe.nutrition.calories}</dd>
              <dt className="text-muted-foreground">{t(lang, 'common.caloriesAbbr')}</dt>
            </div>
            <div>
              <dd className="font-semibold text-foreground">{recipe.nutrition.protein}g</dd>
              <dt className="text-muted-foreground">{t(lang, 'common.protein')}</dt>
            </div>
            <div>
              <dd className="font-semibold text-foreground">{recipe.nutrition.carbs}g</dd>
              <dt className="text-muted-foreground">{t(lang, 'common.carbs')}</dt>
            </div>
          </dl>
        )}
      </div>
    </Card>
  );
}

/** Loading placeholder matching the card's footprint in either view. */
export function RecipeCardSkeleton({ view = 'grid', className }: { view?: RecipeView; className?: string }) {
  if (view === 'list') {
    return (
      <div className={cn('flex items-stretch gap-4 rounded-lg border border-border bg-card p-3', className)} data-testid="recipe-card-skeleton">
        <Skeleton className="h-24 w-24 shrink-0 rounded-md sm:h-28 sm:w-28" />
        <div className="flex flex-1 flex-col gap-2 py-1">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="mt-auto h-4 w-2/5" />
        </div>
      </div>
    );
  }
  return (
    <div className={cn('overflow-hidden rounded-lg border border-border bg-card', className)} data-testid="recipe-card-skeleton">
      <Skeleton className="h-44 w-full rounded-none" />
      <div className="flex flex-col gap-3 p-4">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}
