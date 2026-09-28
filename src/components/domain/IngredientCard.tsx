import * as React from 'react';
import { LayersIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getTranslated, t, type Locale } from '@/i18n';
import { activeIngredientTags } from '@/lib/domain/ingredient-browser';
import { formatUnitPrice } from '@/lib/domain/ingredient-detail';
import { cn } from '@/lib/utils';
import { CategoryChip, categoryClasses } from './CategoryChip';
import type { Ingredient, IngredientTagKey } from '@/schemas';

/**
 * IngredientCard — the catalog card of an ingredient (roadmap Issue 019; port
 * of legacy `IngredientCard` + the inline tile of `IngredientsPage`).
 *
 * - The category is an identity colour from the `--color-food-*` tokens
 *   (`global.css`, D13) via `CategoryChip`: a stripe on the card edge and a
 *   dot next to the category name — never text colour, so contrast stays with
 *   the kit.
 * - `href` makes the whole card a link (stretched-link pattern, same as
 *   `RecipeCard`: the title is the only anchor). `action` renders above the
 *   stretched link (e.g. the browser's "I have it" toggle).
 * - Strings come from the dictionaries via `lang` (never `navigator.language`).
 */

/** Dietary flags of an ingredient as localised badges (`dietary.*`). */
export function IngredientTagBadges({
  tags,
  lang = 'en',
  max = 3,
  className,
}: {
  tags: IngredientTagKey[];
  lang?: Locale;
  max?: number;
  className?: string;
}) {
  if (tags.length === 0) return null;
  const shown = tags.slice(0, max);
  const overflow = tags.length - shown.length;
  return (
    <ul className={cn('flex flex-wrap gap-1.5', className)} data-testid="ingredient-tags">
      {shown.map((tag) => (
        <li key={tag}>
          <Badge variant="secondary" className="font-medium">
            {t(lang, `dietary.${tag}`)}
          </Badge>
        </li>
      ))}
      {overflow > 0 && (
        <li>
          <Badge variant="outline" className="border-border" aria-label={tags.slice(max).map((tag) => t(lang, `dietary.${tag}`)).join(', ')}>
            +{overflow}
          </Badge>
        </li>
      )}
    </ul>
  );
}

export interface IngredientCardProps extends React.HTMLAttributes<HTMLDivElement> {
  ingredient: Ingredient;
  lang?: Locale;
  /** Localised category name (from `categories.ingredientCategories`). */
  categoryName?: string;
  /** Link target, already passed through `withBase()` by the caller. */
  href?: string;
  /** Highlights the card (e.g. selected in "what can I make?"). */
  selected?: boolean;
  /** Interactive control rendered above the stretched link (top-right). */
  action?: React.ReactNode;
  /** Legacy `showDetails`: storage instructions under the price. */
  showDetails?: boolean;
}

export function IngredientCard({
  ingredient,
  lang = 'en',
  categoryName,
  href,
  selected = false,
  action,
  showDetails = false,
  className,
  ...props
}: IngredientCardProps) {
  const name = getTranslated(ingredient.name, lang);
  const tags = activeIngredientTags(ingredient.tags);
  const storage = getTranslated(ingredient.storageInstructions, lang);

  return (
    <Card
      data-testid="ingredient-card"
      data-ingredient-id={ingredient.id}
      data-category={ingredient.category}
      data-selected={selected ? 'true' : undefined}
      className={cn(
        'relative flex flex-col gap-2 border-l-4 border-border p-4 motion-safe:transition-all',
        categoryClasses(ingredient.category).stripe,
        href && 'motion-safe:hover:-translate-y-0.5 hover:shadow-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
        selected && 'bg-primary/5 ring-2 ring-primary',
        className,
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display text-base font-semibold leading-snug text-foreground">
          {href ? (
            <a href={href} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
              {name}
            </a>
          ) : (
            name
          )}
        </h3>
        {action && <div className="relative z-10 -mr-1 -mt-1 shrink-0">{action}</div>}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        {categoryName && <CategoryChip category={ingredient.category} label={categoryName} />}
        {ingredient.isComposite && (
          <span className="inline-flex items-center gap-1" data-testid="ingredient-composite">
            <LayersIcon className="size-3.5" aria-hidden="true" />
            {t(lang, 'ingredient.composite')}
          </span>
        )}
      </div>

      <IngredientTagBadges tags={tags} lang={lang} />

      <p className="mt-auto text-sm tabular-nums text-muted-foreground">
        <span className="sr-only">{t(lang, 'ingredient.avgPrice')}: </span>
        {formatUnitPrice(ingredient, lang)}
      </p>
      {showDetails && storage && <p className="line-clamp-2 text-xs text-muted-foreground">{storage}</p>}
    </Card>
  );
}

/** Loading placeholder matching the card's footprint. */
export function IngredientCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2 rounded-lg border border-l-4 border-border bg-card p-4', className)} data-testid="ingredient-card-skeleton">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-1/3" />
      <div className="flex gap-2">
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <Skeleton className="h-4 w-1/4" />
    </div>
  );
}
