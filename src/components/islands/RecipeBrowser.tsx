import * as React from 'react';
import { useStore } from '@nanostores/react';
import { LayoutGridIcon, ListIcon, RefreshCwIcon, SearchIcon, SearchXIcon, SlidersHorizontalIcon, UtensilsCrossedIcon, XIcon } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Toaster } from '@/components/ui/toast';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { RecipeCard, RecipeCardSkeleton } from '@/components/domain/RecipeCard';
import { getTranslated, localizedRoute, t, type Locale } from '@/i18n';
import { recipeHasDietaryTag as hasDietaryTag } from '@/lib/catalog/selectors';
import { useCatalog } from '@/lib/catalog/use-catalog';
import {
  DEFAULT_RECIPE_BROWSER_STATE,
  RECIPE_MAX_TIME_CHOICES,
  RECIPE_SORT_CHOICES,
  applyRecipeBrowserState,
  clearRecipeBrowserFilters,
  countActiveFilters,
  parseRecipeBrowserState,
  serializeRecipeBrowserState,
  toggleListValue,
} from '@/lib/domain/recipe-browser';
import { withBase } from '@/lib/href';
import { useListing } from '@/lib/use-listing';
import { useUrlState, writeUrlSearch } from '@/lib/use-url-search';
import { cn } from '@/lib/utils';
import { DIFFICULTIES, MEAL_TYPES, type Category, type Recipe, type RecipeBrowserState, type RecipeView, type SortOption } from '@/schemas';
import { $favorites } from '@/stores/favorites';
import ErrorBoundary from './ErrorBoundary';
import QueryProvider from './QueryProvider';

/**
 * RecipeBrowser — the `/recipes/` island (roadmap Issue 017, port of legacy
 * `RecipesPage` + `RecipeFilters` + `RecipeSorter` + `RecipeGrid`/`RecipeList`).
 *
 * - Catalog via `useCatalog()` (TanStack Query + IDB), favourites via
 *   `$favorites` (each card carries a `FavoriteButton`, roadmap #020, and
 *   "Favorites only" is `?favorites=1`); every filter/sort/view lives in the URL query string
 *   (`lib/domain/recipe-browser.ts`) so results are shareable and Issue 020
 *   can deep-link `/recipes/?favorites=1`.
 * - The URL is read AFTER hydration (`useRecipeBrowserUrlState`): the server
 *   renders the default state, so `client:load` never produces a hydration
 *   mismatch; the catalog is still loading at that point, so nothing flashes.
 * - `lang` comes in as a prop (D7) — the island never reads `navigator.language`.
 */
export interface RecipeBrowserProps {
  lang: Locale;
  /** Test/embedding hook: start from this state instead of `location.search`. */
  initialState?: RecipeBrowserState;
}

export default function RecipeBrowser(props: RecipeBrowserProps) {
  return (
    <QueryProvider>
      <ErrorBoundary name="RecipeBrowser">
        <RecipeBrowserView {...props} />
      </ErrorBoundary>
    </QueryProvider>
  );
}

// ── URL state ────────────────────────────────────────────────────────────────
//
// The query string IS the state (`lib/use-url-search.ts`, shared with
// `IngredientBrowser`): the server renders the defaults, the browser reads
// `location.search` after hydration and writes back with `replaceState`.

/** Replace the current query string (`query` without `?`) and notify every browser instance. */
export const writeRecipeBrowserSearch = writeUrlSearch;

export function useRecipeBrowserUrlState(initialState?: RecipeBrowserState) {
  return useUrlState<RecipeBrowserState>(parseRecipeBrowserState, serializeRecipeBrowserState, initialState);
}

// ── Option helpers ───────────────────────────────────────────────────────────

interface FilterOption {
  id: string;
  label: string;
  count: number;
}

function capitalize(id: string): string {
  return id.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Options = taxonomy entries with at least one matching recipe, plus ids the
 * recipes use that the taxonomy does not list (`international`, `chinese`…),
 * so no filter is dead and no recipe is unreachable. Labels: catalog name →
 * dictionary (`cuisine.<id>`) → capitalised id.
 */
function buildOptions(
  taxonomy: ReadonlyArray<Category>,
  counts: Map<string, number>,
  lang: Locale,
  dictPrefix?: string,
): FilterOption[] {
  const byId = new Map(taxonomy.map((c) => [c.id, c] as const));
  const ids = [...taxonomy.map((c) => c.id), ...counts.keys()].filter((id, i, all) => all.indexOf(id) === i);
  return ids
    .filter((id) => (counts.get(id) ?? 0) > 0)
    .map((id) => {
      const entry = byId.get(id);
      let label = entry ? getTranslated(entry.name, lang) : '';
      if (!label && dictPrefix) {
        const translated = t(lang, `${dictPrefix}.${id}`);
        label = translated === `${dictPrefix}.${id}` ? '' : translated;
      }
      return { id, label: label || capitalize(id), count: counts.get(id) ?? 0 };
    });
}

function tally(values: Iterable<string>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return counts;
}

// ── View ─────────────────────────────────────────────────────────────────────

export function RecipeBrowserView({ lang, initialState }: RecipeBrowserProps) {
  const catalog = useCatalog();
  const favorites = useStore($favorites);
  const { state, setState, update } = useRecipeBrowserUrlState(initialState);
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const searchId = React.useId();
  const sortId = React.useId();
  const favoritesId = React.useId();

  const { recipes, ingredients, categories } = catalog;

  const options = React.useMemo(() => {
    const dietaryCounts = new Map<string, number>();
    for (const tag of categories.dietaryTags) {
      dietaryCounts.set(tag.id, recipes.filter((r) => hasDietaryTag(r, tag.id)).length);
    }
    const mealTypes: Category[] = categories.mealTypes.length
      ? categories.mealTypes
      : MEAL_TYPES.map((id) => ({ id, name: { en: capitalize(id), es: capitalize(id), fr: capitalize(id) } }));
    return {
      mealTypes: buildOptions(mealTypes, tally(recipes.map((r) => r.type)), lang),
      cuisines: buildOptions(categories.cuisines, tally(recipes.flatMap((r) => r.cuisine)), lang, 'cuisine'),
      dietaryTags: buildOptions(categories.dietaryTags, dietaryCounts, lang),
      difficulties: DIFFICULTIES.map((id) => ({
        id,
        label: t(lang, `recipe.difficulty_${id}`),
        count: recipes.filter((r) => r.difficulty === id).length,
      })).filter((o) => o.count > 0),
    };
  }, [categories, recipes, lang]);

  const visible = React.useMemo(
    () => applyRecipeBrowserState(recipes, state, { lang, ingredients, favorites }),
    [recipes, state, lang, ingredients, favorites],
  );

  const listing = useListing<Recipe>({
    isLoading: catalog.status === 'loading',
    error: catalog.status === 'error' ? catalog.error : null,
    allItems: recipes,
    filteredItems: visible,
  });

  const activeFilters = countActiveFilters(state);
  const clearFilters = () => setState((prev) => clearRecipeBrowserFilters(prev));
  const resetAll = () => setState((prev) => ({ ...DEFAULT_RECIPE_BROWSER_STATE, sort: prev.sort, view: prev.view }));
  const toggle = (key: 'types' | 'cuisines' | 'dietaryTags' | 'difficulties', id: string) =>
    setState((prev) => ({ ...prev, [key]: toggleListValue(prev[key], id) }));

  const sortItems = React.useMemo(
    () => Object.fromEntries(RECIPE_SORT_CHOICES.map((c) => [c.value, t(lang, c.labelKey)])) as Record<string, string>,
    [lang],
  );

  return (
    <div className="flex flex-col gap-6" data-testid="recipe-browser" data-status={listing.status}>
      {/* ── Toolbar: search · sort · view · filters toggle ─────────────────── */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <label htmlFor={searchId} className="sr-only">
            {t(lang, 'recipe.searchLabel')}
          </label>
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            id={searchId}
            type="search"
            value={state.search}
            onChange={(event) => update({ search: event.target.value })}
            placeholder={t(lang, 'recipe.searchPlaceholder')}
            className="pl-9"
            data-testid="recipe-search"
            autoComplete="off"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor={sortId} className="sr-only">
            {t(lang, 'common.sortBy')}
          </label>
          <Select value={state.sort} onValueChange={(value) => value && update({ sort: value as SortOption })} items={sortItems}>
            <SelectTrigger id={sortId} className="w-full min-w-56 md:w-auto" data-testid="recipe-sorter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RECIPE_SORT_CHOICES.map((choice) => (
                <SelectItem key={choice.value} value={choice.value}>
                  {t(lang, choice.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <ToggleGroup
            value={[state.view]}
            onValueChange={(values) => {
              const next = values[0] as RecipeView | undefined;
              if (next) update({ view: next });
            }}
            aria-label={t(lang, 'recipe.view')}
            data-testid="recipe-view-toggle"
          >
            <ToggleGroupItem value="grid" aria-label={t(lang, 'recipe.viewGrid')} title={t(lang, 'recipe.viewGrid')}>
              <LayoutGridIcon className="size-4" aria-hidden="true" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label={t(lang, 'recipe.viewList')} title={t(lang, 'recipe.viewList')}>
              <ListIcon className="size-4" aria-hidden="true" />
            </ToggleGroupItem>
          </ToggleGroup>

          <Button
            type="button"
            variant="outline"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            aria-controls="recipe-filters"
            className="lg:hidden"
            data-testid="filter-toggle"
          >
            <SlidersHorizontalIcon aria-hidden="true" />
            {filtersOpen ? t(lang, 'common.hideFilters') : t(lang, 'common.showFilters')}
            {activeFilters > 0 && <Badge className="ml-1 px-1.5">{activeFilters}</Badge>}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* ── Filters (sidebar ≥ lg, collapsible panel below) ─────────────── */}
        <aside
          id="recipe-filters"
          aria-label={t(lang, 'recipe.filters')}
          className={cn('lg:block lg:w-72 lg:shrink-0 lg:self-start lg:sticky lg:top-24', filtersOpen ? 'block' : 'hidden')}
          data-testid="recipe-filters"
        >
          <div className="rounded-lg border border-border bg-card p-4 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
                {t(lang, 'recipe.filters')}
                {activeFilters > 0 && (
                  <Badge variant="secondary" data-testid="active-filter-count" aria-label={t(lang, 'recipe.activeFilters', { count: activeFilters })}>
                    {activeFilters}
                  </Badge>
                )}
              </h2>
              <div className="flex items-center gap-1">
                {activeFilters > 0 && (
                  <Button type="button" variant="ghost" size="sm" onClick={clearFilters} data-testid="clear-filters">
                    {t(lang, 'common.clearAll')}
                  </Button>
                )}
                <Button type="button" variant="ghost" size="icon" className="lg:hidden" onClick={() => setFiltersOpen(false)} aria-label={t(lang, 'common.close')}>
                  <XIcon aria-hidden="true" />
                </Button>
              </div>
            </div>

            <label className="mt-4 flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
              <Checkbox
                checked={state.favoritesOnly}
                onCheckedChange={(checked) => update({ favoritesOnly: checked })}
                aria-labelledby={`${favoritesId}-label`}
                data-testid="favorites-only"
              />
              <span id={`${favoritesId}-label`}>{t(lang, 'recipe.favoritesOnly')}</span>
              <span className="ml-auto text-xs text-muted-foreground">{favorites.length}</span>
            </label>

            <Accordion multiple defaultValue={['type', 'cuisine', 'dietary', 'difficulty', 'time']} className="mt-2">
              <FilterSection id="type" title={t(lang, 'recipe.mealType')} selected={state.types.length}>
                <CheckboxList options={options.mealTypes} selected={state.types} onToggle={(id) => toggle('types', id)} />
              </FilterSection>
              <FilterSection id="cuisine" title={t(lang, 'recipe.cuisine')} selected={state.cuisines.length}>
                <CheckboxList options={options.cuisines} selected={state.cuisines} onToggle={(id) => toggle('cuisines', id)} lang={lang} collapseAfter={5} />
              </FilterSection>
              <FilterSection id="dietary" title={t(lang, 'recipe.dietary')} selected={state.dietaryTags.length}>
                <CheckboxList options={options.dietaryTags} selected={state.dietaryTags} onToggle={(id) => toggle('dietaryTags', id)} />
              </FilterSection>
              <FilterSection id="difficulty" title={t(lang, 'recipe.difficulty')} selected={state.difficulties.length}>
                <CheckboxList options={options.difficulties} selected={state.difficulties} onToggle={(id) => toggle('difficulties', id)} />
              </FilterSection>
              <FilterSection id="time" title={t(lang, 'recipe.totalTime')} selected={state.maxTime ? 1 : 0} badge={state.maxTime ? t(lang, 'recipe.maxTimeFormat', { time: state.maxTime }) : undefined}>
                <RadioGroup
                  value={String(state.maxTime ?? 'any')}
                  onValueChange={(value) => update({ maxTime: value === 'any' ? undefined : Number(value) })}
                  aria-label={t(lang, 'recipe.totalTime')}
                >
                  <RadioRow value="any" label={t(lang, 'recipe.anyTime')} />
                  {RECIPE_MAX_TIME_CHOICES.map((choice) => (
                    <RadioRow key={choice.value} value={String(choice.value)} label={t(lang, choice.labelKey)} />
                  ))}
                </RadioGroup>
              </FilterSection>
            </Accordion>
          </div>
        </aside>

        {/* ── Results ─────────────────────────────────────────────────────── */}
        <section className="min-w-0 flex-1" aria-labelledby="recipe-results-heading">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 id="recipe-results-heading" className="sr-only">
              {t(lang, 'recipe.availableRecipes')}
            </h2>
            <p className="text-sm text-muted-foreground" role="status" aria-live="polite" data-testid="results-count">
              {listing.status === 'loading' ? t(lang, 'common.loading') : t(lang, 'recipe.resultsCount', { count: visible.length })}
            </p>
            {activeFilters > 0 && (
              <Button type="button" variant="link" size="sm" onClick={clearFilters} className="h-auto p-0">
                {t(lang, 'common.clearFilters')}
              </Button>
            )}
          </div>

          {listing.status === 'loading' && (
            <div className={layoutClass(state.view)} aria-busy="true" data-testid="recipe-skeletons">
              {Array.from({ length: state.view === 'list' ? 6 : 9 }).map((_, i) => (
                <RecipeCardSkeleton key={i} view={state.view} />
              ))}
            </div>
          )}

          {listing.status === 'error' && (
            <ErrorState
              icon={<UtensilsCrossedIcon aria-hidden="true" />}
              title={t(lang, 'recipe.loadError')}
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
            <EmptyState icon={<UtensilsCrossedIcon aria-hidden="true" />} title={t(lang, 'recipe.noRecipesYet')} data-testid="empty-zero" />
          )}

          {listing.status === 'empty-filtered' && (
            <EmptyState
              icon={<SearchXIcon aria-hidden="true" />}
              title={t(lang, 'recipe.noRecipes')}
              description={t(lang, 'common.tryAdjustingSearch')}
              action={
                <Button type="button" variant="secondary" onClick={resetAll} data-testid="reset-all">
                  {t(lang, 'common.clearFilters')}
                </Button>
              }
              data-testid="empty-filtered"
            />
          )}

          {listing.status === 'ready' && (
            <ul className={layoutClass(state.view)} data-testid="recipe-results" data-view={state.view}>
              {listing.items.map((recipe) => (
                <li key={recipe.id} className="flex">
                  <RecipeCard
                    recipe={recipe}
                    lang={lang}
                    view={state.view}
                    href={withBase(localizedRoute(`/recipes/${recipe.id}/`, lang))}
                    showFavoriteButton
                    className="w-full"
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* One Toaster for this React root: the cards' FavoriteButton toasts here. */}
      <Toaster closeLabel={t(lang, 'common.close')} />
    </div>
  );
}

function layoutClass(view: RecipeView): string {
  return view === 'list' ? 'flex flex-col gap-3' : 'grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3';
}

function FilterSection({
  id,
  title,
  selected,
  badge,
  children,
}: {
  id: string;
  title: string;
  selected: number;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <AccordionItem value={id} data-testid={`filter-section-${id}`}>
      <AccordionTrigger className="py-3 text-foreground">
        <span className="flex items-center gap-2">
          {title}
          {selected > 0 && (
            <Badge variant="secondary" className="px-1.5">
              {badge ?? selected}
            </Badge>
          )}
        </span>
      </AccordionTrigger>
      <AccordionContent>{children}</AccordionContent>
    </AccordionItem>
  );
}

function CheckboxList({
  options,
  selected,
  onToggle,
  lang = 'en',
  collapseAfter,
}: {
  options: FilterOption[];
  selected: ReadonlyArray<string>;
  onToggle: (id: string) => void;
  lang?: Locale;
  /** Show only the first N options until "Show more" is pressed. */
  collapseAfter?: number;
}) {
  const [showAll, setShowAll] = React.useState(false);
  const hidden = collapseAfter !== undefined && !showAll ? Math.max(options.length - collapseAfter, 0) : 0;
  // Keep selected options visible even when they fall past the fold.
  const shown = hidden > 0 ? options.filter((o, i) => i < (collapseAfter ?? 0) || selected.includes(o.id)) : options;
  return (
    <div className="flex flex-col gap-2">
      {shown.map((option) => (
        <CheckboxRow key={option.id} option={option} checked={selected.includes(option.id)} onToggle={() => onToggle(option.id)} />
      ))}
      {collapseAfter !== undefined && options.length > collapseAfter && (
        <Button type="button" variant="ghost" size="sm" className="justify-start px-0 text-primary hover:bg-transparent" onClick={() => setShowAll((v) => !v)}>
          {showAll ? t(lang, 'common.showLess') : t(lang, 'common.showMore', { count: options.length - collapseAfter })}
        </Button>
      )}
    </div>
  );
}

/**
 * Base UI renders the checkbox/radio as a `<span role="…">` (not a labelable
 * element), so a wrapping `<label>` alone gives it no accessible name — the
 * text span is referenced explicitly with `aria-labelledby`. The `<label>`
 * still makes the text a click target through Base UI's hidden native input.
 */
function CheckboxRow({ option, checked, onToggle }: { option: FilterOption; checked: boolean; onToggle: () => void }) {
  const id = React.useId();
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
      <Checkbox checked={checked} onCheckedChange={onToggle} value={option.id} aria-labelledby={id} />
      <span id={id} className="flex-1">
        {option.label}
      </span>
      <span className="text-xs tabular-nums text-muted-foreground" aria-hidden="true">
        {option.count}
      </span>
    </label>
  );
}

function RadioRow({ value, label }: { value: string; label: string }) {
  const id = React.useId();
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
      <RadioGroupItem value={value} aria-labelledby={id} />
      <span id={id}>{label}</span>
    </label>
  );
}
