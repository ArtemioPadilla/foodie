import * as React from 'react';
import { CheckIcon, ChefHatIcon, ClockIcon, PlusIcon, RefreshCwIcon, SearchIcon, SearchXIcon, StarIcon, WheatIcon, XIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { CategoryDot, IngredientCard, IngredientCardSkeleton } from '@/components/domain/IngredientCard';
import { getTranslated, localizedRoute, t, type Locale } from '@/i18n';
import { useCatalog } from '@/lib/catalog/use-catalog';
import {
  DEFAULT_INGREDIENT_BROWSER_STATE,
  countIngredientFilters,
  filterIngredients,
  groupIngredientsByCategory,
  matchRecipesByIngredients,
  parseIngredientBrowserState,
  serializeIngredientBrowserState,
} from '@/lib/domain/ingredient-browser';
import { toggleListValue } from '@/lib/domain/recipe-browser';
import { withBase } from '@/lib/href';
import { useListing } from '@/lib/use-listing';
import { useUrlState } from '@/lib/use-url-search';
import { cn } from '@/lib/utils';
import { INGREDIENT_TAG_KEYS, type Ingredient, type IngredientBrowserState, type IngredientTagKey } from '@/schemas';
import ErrorBoundary from './ErrorBoundary';
import QueryProvider from './QueryProvider';

/**
 * IngredientBrowser — the `/ingredients/` island (roadmap Issue 019, port of
 * legacy `IngredientsPage`).
 *
 * - Catalog via `useCatalog()` (TanStack Query + IDB); search, category and
 *   dietary filters and the "I have it" selection live in the query string
 *   (`lib/domain/ingredient-browser.ts` + `lib/use-url-search.ts`), read
 *   after hydration so `client:load` never mismatches.
 * - Ingredients are grouped by `categories.ingredientCategories`, each group
 *   and card tinted with its `--color-food-*` token; every card links to the
 *   static `/ingredients/[id]/` page.
 * - Selecting ingredients ranks "Recipes you can make" (legacy sidebar).
 * - `lang` comes in as a prop (D7) — the island never reads `navigator.language`.
 */
export interface IngredientBrowserProps {
  lang: Locale;
  /** Test/embedding hook: start from this state instead of `location.search`. */
  initialState?: IngredientBrowserState;
}

export default function IngredientBrowser(props: IngredientBrowserProps) {
  return (
    <QueryProvider>
      <ErrorBoundary name="IngredientBrowser">
        <IngredientBrowserView {...props} />
      </ErrorBoundary>
    </QueryProvider>
  );
}

export function useIngredientBrowserUrlState(initialState?: IngredientBrowserState) {
  return useUrlState<IngredientBrowserState>(parseIngredientBrowserState, serializeIngredientBrowserState, initialState);
}

export function IngredientBrowserView({ lang, initialState }: IngredientBrowserProps) {
  const catalog = useCatalog();
  const { state, setState, update } = useIngredientBrowserUrlState(initialState);
  const searchId = React.useId();
  const { ingredients, recipes, categories } = catalog;
  const taxonomy = categories.ingredientCategories;

  const visible = React.useMemo(() => filterIngredients(ingredients, state, lang), [ingredients, state, lang]);
  const groups = React.useMemo(() => groupIngredientsByCategory(visible, taxonomy, lang), [visible, taxonomy, lang]);
  const matches = React.useMemo(() => matchRecipesByIngredients(recipes, state.selected), [recipes, state.selected]);
  const byId = React.useMemo(() => new Map(ingredients.map((i) => [i.id, i] as const)), [ingredients]);

  const categoryOptions = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const i of ingredients) counts.set(i.category, (counts.get(i.category) ?? 0) + 1);
    return groupIngredientsByCategory(ingredients, taxonomy, lang).map((g) => ({ id: g.category, label: g.label, count: counts.get(g.category) ?? 0 }));
  }, [ingredients, taxonomy, lang]);

  const listing = useListing<Ingredient>({
    isLoading: catalog.status === 'loading',
    error: catalog.status === 'error' ? catalog.error : null,
    allItems: ingredients,
    filteredItems: visible,
  });

  const activeFilters = countIngredientFilters(state);
  const clearFilters = () => setState((prev) => ({ ...prev, categories: [], tags: [] }));
  const resetAll = () => setState((prev) => ({ ...DEFAULT_INGREDIENT_BROWSER_STATE, selected: prev.selected }));
  const toggleSelected = (id: string) => setState((prev) => ({ ...prev, selected: toggleListValue(prev.selected, id) }));

  return (
    <div className="flex flex-col gap-6" data-testid="ingredient-browser" data-status={listing.status}>
      {/* ── Search ─────────────────────────────────────────────────────── */}
      <div className="relative max-w-xl">
        <label htmlFor={searchId} className="sr-only">
          {t(lang, 'ingredients.searchLabel')}
        </label>
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          id={searchId}
          type="search"
          value={state.search}
          onChange={(event) => update({ search: event.target.value })}
          placeholder={t(lang, 'ingredients.search')}
          className="pl-9"
          data-testid="ingredient-search"
          autoComplete="off"
        />
      </div>

      {/* ── Filters ────────────────────────────────────────────────────── */}
      <section aria-label={t(lang, 'ingredients.filters')} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4" data-testid="ingredient-filters">
        <FilterRow label={t(lang, 'ingredients.categoryFilter')} testId="category-filter">
          {categoryOptions.map((option) => (
            <Chip
              key={option.id}
              pressed={state.categories.includes(option.id)}
              onClick={() => setState((prev) => ({ ...prev, categories: toggleListValue(prev.categories, option.id) }))}
              data-category={option.id}
            >
              <CategoryDot category={option.id} label={option.label} />
              <span className="text-xs tabular-nums text-muted-foreground" aria-hidden="true">
                {option.count}
              </span>
            </Chip>
          ))}
        </FilterRow>
        <FilterRow label={t(lang, 'ingredients.dietaryFilter')} testId="dietary-filter">
          {INGREDIENT_TAG_KEYS.map((tag) => (
            <Chip
              key={tag}
              pressed={state.tags.includes(tag)}
              onClick={() => setState((prev) => ({ ...prev, tags: toggleListValue(prev.tags, tag) as IngredientTagKey[] }))}
              data-tag={tag}
            >
              {t(lang, `dietary.${tag}`)}
            </Chip>
          ))}
        </FilterRow>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground" role="status" aria-live="polite" data-testid="ingredient-results-count">
            {listing.status === 'loading' ? t(lang, 'common.loading') : t(lang, 'ingredients.resultsCount', { count: visible.length })}
          </p>
          {activeFilters > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={clearFilters} data-testid="clear-ingredient-filters">
              {t(lang, 'common.clearFilters')}
              <Badge variant="secondary" className="px-1.5">
                {activeFilters}
              </Badge>
            </Button>
          )}
        </div>
      </section>

      {/* ── Selection ("what can I make?") ─────────────────────────────── */}
      {state.selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3" data-testid="ingredient-selection">
          <span className="text-sm font-medium text-foreground">
            {t(lang, 'ingredients.selected')} ({state.selected.length}):
          </span>
          <ul className="flex flex-wrap gap-2">
            {state.selected.map((id) => {
              const found = byId.get(id);
              const name = found ? getTranslated(found.name, lang) : id;
              return (
                <li key={id}>
                  <Button type="button" size="sm" variant="secondary" className="h-7 rounded-full px-3" onClick={() => toggleSelected(id)}>
                    {name}
                    <XIcon className="size-3" aria-hidden="true" />
                    <span className="sr-only">{t(lang, 'common.remove')}</span>
                  </Button>
                </li>
              );
            })}
          </ul>
          <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={() => update({ selected: [] })} data-testid="clear-selection">
            {t(lang, 'ingredients.clearSelection')}
          </Button>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        {/* ── Groups ─────────────────────────────────────────────────── */}
        <div className="min-w-0 lg:col-span-2">
          {listing.status === 'loading' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" data-testid="ingredient-skeletons">
              {Array.from({ length: 9 }).map((_, i) => (
                <IngredientCardSkeleton key={i} />
              ))}
            </div>
          )}

          {listing.status === 'error' && (
            <ErrorState
              icon={<WheatIcon aria-hidden="true" />}
              title={t(lang, 'ingredients.loadError')}
              hint={t(lang, 'errors.errorLoadingContent')}
              action={
                <Button type="button" variant="outline" onClick={() => catalog.refetch()}>
                  <RefreshCwIcon aria-hidden="true" />
                  {t(lang, 'common.tryAgain')}
                </Button>
              }
            />
          )}

          {listing.status === 'empty-zero' && (
            <EmptyState icon={<WheatIcon aria-hidden="true" />} title={t(lang, 'ingredients.noIngredientsYet')} data-testid="ingredients-empty-zero" />
          )}

          {listing.status === 'empty-filtered' && (
            <EmptyState
              icon={<SearchXIcon aria-hidden="true" />}
              title={t(lang, 'common.noResults')}
              description={t(lang, 'common.tryAdjustingSearch')}
              action={
                <Button type="button" variant="secondary" onClick={resetAll} data-testid="reset-ingredient-filters">
                  {t(lang, 'common.clearFilters')}
                </Button>
              }
              data-testid="ingredients-empty-filtered"
            />
          )}

          {listing.status === 'ready' && (
            <div className="flex flex-col gap-8" data-testid="ingredient-groups">
              {groups.map((group) => (
                <section key={group.category} aria-labelledby={`ingredient-group-${group.category}`} data-testid="ingredient-group" data-category={group.category}>
                  <h2 id={`ingredient-group-${group.category}`} className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-foreground">
                    <CategoryDot category={group.category} label={group.label} />
                    <span className="text-sm font-normal tabular-nums text-muted-foreground">({group.items.length})</span>
                  </h2>
                  <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {group.items.map((ingredient) => {
                      const name = getTranslated(ingredient.name, lang);
                      const selected = state.selected.includes(ingredient.id);
                      return (
                        <li key={ingredient.id} className="flex">
                          <IngredientCard
                            ingredient={ingredient}
                            lang={lang}
                            categoryName={group.label}
                            href={withBase(localizedRoute(`/ingredients/${ingredient.id}/`, lang))}
                            selected={selected}
                            className="w-full"
                            action={
                              <Button
                                type="button"
                                size="icon"
                                variant={selected ? 'default' : 'outline'}
                                className="size-8"
                                aria-pressed={selected}
                                aria-label={t(lang, 'ingredients.haveIngredient', { name })}
                                title={t(lang, 'ingredients.haveIngredient', { name })}
                                onClick={() => toggleSelected(ingredient.id)}
                                data-testid="ingredient-select"
                              >
                                {selected ? <CheckIcon className="size-4" aria-hidden="true" /> : <PlusIcon className="size-4" aria-hidden="true" />}
                              </Button>
                            }
                          />
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>

        {/* ── Recipes you can make ──────────────────────────────────────── */}
        <aside aria-labelledby="matching-recipes-heading" className="lg:col-span-1">
          <div className="lg:sticky lg:top-24">
            <h2 id="matching-recipes-heading" className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-foreground">
              <ChefHatIcon className="size-5" aria-hidden="true" />
              {t(lang, 'ingredients.recipesWithSelected')}
            </h2>
            {state.selected.length === 0 ? (
              <p className="rounded-lg bg-muted p-4 text-center text-sm text-muted-foreground">{t(lang, 'ingredients.selectToFindRecipes')}</p>
            ) : matches.length === 0 ? (
              <p className="rounded-lg bg-muted p-4 text-center text-sm text-muted-foreground">{t(lang, 'ingredients.noMatchingRecipes')}</p>
            ) : (
              <ul className="flex flex-col gap-2" data-testid="matching-recipes">
                {matches.map(({ recipe, matchPercentage, matchedIngredients, totalIngredients }) => (
                  <li key={recipe.id}>
                    <a
                      href={withBase(localizedRoute(`/recipes/${recipe.id}/`, lang))}
                      className="block rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      data-recipe-id={recipe.id}
                    >
                      <span className="block truncate font-medium text-foreground">{getTranslated(recipe.name, lang)}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <Badge variant={matchPercentage >= 80 ? 'default' : matchPercentage >= 50 ? 'secondary' : 'outline'} className="tabular-nums">
                          {t(lang, 'ingredients.matchCount', { matched: matchedIngredients, total: totalIngredients })}
                        </Badge>
                        <span className="inline-flex items-center gap-1">
                          <ClockIcon className="size-3" aria-hidden="true" />
                          {recipe.totalTime} {t(lang, 'common.minutesAbbr')}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <StarIcon className="size-3 fill-amber-400 text-amber-400" aria-hidden="true" />
                          {recipe.rating.toFixed(1)}
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function FilterRow({ label, testId, children }: { label: string; testId: string; children: React.ReactNode }) {
  const id = React.useId();
  return (
    <div role="group" aria-labelledby={id} className="flex flex-col gap-2 sm:flex-row sm:items-start" data-testid={testId}>
      <span id={id} className="w-24 shrink-0 pt-1.5 text-sm font-medium text-foreground">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({
  pressed,
  className,
  children,
  ...props
}: { pressed: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        'inline-flex h-8 items-center gap-2 rounded-full border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        pressed ? 'border-primary bg-primary/10 font-medium text-foreground' : 'border-border bg-background text-foreground hover:bg-muted',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
