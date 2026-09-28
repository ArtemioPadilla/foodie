import * as React from 'react';
import { ChefHatIcon, ShoppingCartIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { t, type Locale } from '@/i18n';
import type { PantryRecipeMatch } from '@/lib/domain/pantry';
import type { Recipe } from '@/schemas';

/** Minimum-match choices of the selector (percent). */
export const MIN_MATCH_CHOICES = [0, 50, 100] as const;
export type MinMatch = (typeof MIN_MATCH_CHOICES)[number];
/** Suggestions shown before "Show all" (legacy `maxResults = 6`). */
export const SUGGESTIONS_PREVIEW = 6;
/** Missing ingredients named before "+N more" (legacy showed 3). */
const MISSING_PREVIEW = 3;

const MIN_MATCH_KEYS: Record<MinMatch, string> = { 0: 'pantry.minMatchAny', 50: 'pantry.minMatchHalf', 100: 'pantry.minMatchFull' };

export interface RecipeSuggestionsProps {
  lang: Locale;
  /** Every match at the current minimum, best first (`whatCanICook`). */
  matches: ReadonlyArray<PantryRecipeMatch>;
  loading: boolean;
  minMatch: MinMatch;
  onMinMatchChange: (value: MinMatch) => void;
  recipeName: (recipe: Recipe) => string;
  recipeHref: (recipe: Recipe) => string;
  ingredientName: (ingredientId: string) => string;
  onAddMissing: (match: PantryRecipeMatch) => void;
}

/**
 * "What can I cook" (port of legacy `RecipeSuggestions`, roadmap Issue 027):
 * recipes ranked by the share of their required ingredients in the pantry
 * (the pure `whatCanICook` selector), each with its match meter, what is
 * missing and a one-click "add missing to shopping list". A minimum-match
 * selector replaces legacy's fixed 50 % threshold.
 */
export function RecipeSuggestions({
  lang,
  matches,
  loading,
  minMatch,
  onMinMatchChange,
  recipeName,
  recipeHref,
  ingredientName,
  onAddMissing,
}: RecipeSuggestionsProps) {
  const [showAll, setShowAll] = React.useState(false);
  const minId = React.useId();
  const minItems = React.useMemo(
    () => Object.fromEntries(MIN_MATCH_CHOICES.map((m) => [String(m), t(lang, MIN_MATCH_KEYS[m])])) as Record<string, string>,
    [lang],
  );
  const visible = showAll ? matches : matches.slice(0, SUGGESTIONS_PREVIEW);

  return (
    <section aria-labelledby="pantry-cook-title" className="space-y-4" data-testid="pantry-suggestions" data-count={matches.length}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="pantry-cook-title" className="font-display text-2xl font-semibold tracking-tight text-foreground">
            {t(lang, 'pantry.whatCanICook')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t(lang, 'pantry.whatCanICookDescription')}</p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor={minId} className="whitespace-nowrap text-sm text-muted-foreground">
            {t(lang, 'pantry.minMatchLabel')}
          </label>
          <Select value={String(minMatch)} onValueChange={(value) => value && onMinMatchChange(Number(value) as MinMatch)} items={minItems}>
            <SelectTrigger id={minId} className="w-48" data-testid="pantry-min-match">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MIN_MATCH_CHOICES.map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {minItems[String(m)]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2" aria-busy="true">
          <p className="sr-only">{t(lang, 'pantry.catalogLoading')}</p>
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : matches.length === 0 ? (
        <EmptyState
          icon={<ChefHatIcon aria-hidden="true" />}
          title={t(lang, 'pantry.noMatches')}
          description={t(lang, 'pantry.noMatchesDescription')}
          data-testid="pantry-suggestions-empty"
        />
      ) : (
        <>
          <ul className="grid gap-4 md:grid-cols-2" data-testid="pantry-suggestion-list">
            {visible.map((match) => {
              const percent = Math.round(match.matchPercentage);
              const name = recipeName(match.recipe);
              const missing = match.missingIngredients;
              return (
                <li
                  key={match.recipe.id}
                  className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 text-card-foreground"
                  data-testid="pantry-suggestion"
                  data-recipe-id={match.recipe.id}
                  data-percent={percent}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold leading-snug">
                      <a href={recipeHref(match.recipe)} className="text-foreground underline-offset-4 hover:text-primary hover:underline">
                        {name}
                      </a>
                    </h3>
                    <Badge variant={percent === 100 ? 'default' : 'outline'} className="shrink-0 tabular-nums" data-testid="suggestion-match">
                      {t(lang, 'pantry.matchPercent', { percent })}
                    </Badge>
                  </div>
                  <ProgressBar value={percent} label={t(lang, 'pantry.matchPercent', { percent })} className="h-2" />
                  <p className="text-sm text-muted-foreground" data-testid="suggestion-have">
                    {t(lang, 'pantry.haveCount', { matched: match.matchedIngredients, total: match.totalIngredients })}
                    {match.expiringIngredients > 0 ? (
                      <span className="mt-0.5 block text-xs font-medium text-foreground" data-testid="suggestion-expiring">
                        {t(lang, 'pantry.usesExpiring', { count: match.expiringIngredients })}
                      </span>
                    ) : null}
                  </p>
                  {missing.length === 0 ? (
                    <p className="text-sm font-medium text-primary" data-testid="suggestion-ready">
                      {t(lang, 'pantry.readyToCook')}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        {t(lang, 'pantry.missing')}:{' '}
                        <span className="text-foreground" data-testid="suggestion-missing">
                          {missing.slice(0, MISSING_PREVIEW).map(ingredientName).join(', ')}
                          {missing.length > MISSING_PREVIEW ? ` ${t(lang, 'pantry.missingMore', { count: missing.length - MISSING_PREVIEW })}` : ''}
                        </span>
                      </p>
                      <Button type="button" size="sm" variant="outline" onClick={() => onAddMissing(match)} data-testid="add-missing-to-shopping">
                        <ShoppingCartIcon className="size-4" aria-hidden="true" />
                        {t(lang, 'pantry.addMissing')}
                        <span className="sr-only">: {name}</span>
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {matches.length > SUGGESTIONS_PREVIEW ? (
            <Button type="button" variant="ghost" onClick={() => setShowAll((value) => !value)} aria-expanded={showAll} data-testid="toggle-all-suggestions">
              {showAll ? t(lang, 'common.showLess') : t(lang, 'pantry.showAllSuggestions', { count: matches.length })}
            </Button>
          ) : null}
          <p className="text-xs text-muted-foreground">{t(lang, 'pantry.suggestionsTip')}</p>
        </>
      )}
    </section>
  );
}
