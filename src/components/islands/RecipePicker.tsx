import * as React from 'react';
import { useStore } from '@nanostores/react';
import { SearchIcon, StarIcon, UsersIcon } from 'lucide-react';
import { DifficultyBadge } from '@/components/domain/DifficultyBadge';
import { RecipeArt } from '@/components/domain/RecipeCard';
import { ServingsAdjuster } from '@/components/domain/ServingsAdjuster';
import { TimeBadge } from '@/components/domain/TimeBadge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { getTranslated, t, type Locale } from '@/i18n';
import { searchRecipes } from '@/lib/catalog/selectors';
import { calculateRecipeCost, scaleRecipe } from '@/lib/domain/calculations';
import { formatPrice } from '@/lib/domain/ingredient-detail';
import { calculateRecipeNutrition } from '@/lib/domain/nutrition';
import { cn } from '@/lib/utils';
import type { Ingredient, MealType, Recipe } from '@/schemas';
import { $favorites } from '@/stores/favorites';
import type { PlanSlot } from '@/stores/planner';
import { MAX_SERVINGS } from './MealPlanner/MealSlot';
import { slotLabel } from './MealPlanner/dnd';

/**
 * RecipePicker — the planner's recipe `Dialog` (roadmap Issue 025, port of
 * legacy `RecipePickerModal`; Issue 024 shipped the minimal version as the
 * no-drag fallback).
 *
 * - Search + quick filters (`ToggleGroup`: all / fits this meal / ≤ 30 min /
 *   favourites) narrow the catalog; the list is an ARIA combobox listbox:
 *   ↑/↓ from the search box move the highlighted recipe
 *   (`aria-activedescendant`, focus never leaves the input) and Enter adds it,
 *   a click highlights a row.
 * - The highlighted recipe is previewed (art, description, time, difficulty,
 *   rating, kcal per serving and the estimated cost for the chosen servings
 *   through `lib/domain/calculations`), with a servings stepper that starts at
 *   the plan's default.
 * - "Add" (`data-testid="recipe-picker-add"`) hands `(recipe, servings)` back
 *   to the caller, which writes `$planner` for the active slot.
 *
 * It is **not** an island of its own: it renders inside `MealPlanner`'s React
 * root (compound components never span islands), so the caller owns `open`.
 * The body is mounted only while the dialog is open, so every opening starts
 * from a clean search, filter and servings.
 */
export interface RecipePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: Locale;
  recipes: ReadonlyArray<Recipe>;
  /** Localised "Monday · Lunch" of the slot being filled. */
  targetLabel: string;
  onSelect: (recipe: Recipe, servings: number) => void;
  /** Slot being filled — drives the "fits this meal" quick filter. */
  slot?: PlanSlot;
  /** Servings the stepper starts at (the plan's default). */
  defaultServings?: number;
  /** Catalog ingredients, for the cost estimate of the preview. */
  ingredients?: ReadonlyArray<Ingredient>;
  currency?: string;
}

export const MAX_RESULTS = 50;
/** "≤ 30 min" quick filter. */
export const QUICK_MINUTES = 30;

type QuickFilter = 'all' | 'meal' | 'quick' | 'favorites';

/** Recipe meal types that fit a planner slot. */
export const SLOT_MEAL_TYPES: Record<PlanSlot, ReadonlyArray<MealType>> = {
  breakfast: ['breakfast'],
  lunch: ['lunch'],
  dinner: ['dinner'],
  snacks: ['snack', 'dessert'],
};

export function RecipePicker({ open, onOpenChange, lang, targetLabel, ...rest }: RecipePickerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] max-w-3xl grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden"
        data-testid="recipe-picker"
      >
        <DialogHeader>
          <DialogTitle>{t(lang, 'planner.pickerTitle')}</DialogTitle>
          <DialogDescription>{targetLabel}</DialogDescription>
        </DialogHeader>
        <PickerBody lang={lang} {...rest} />
      </DialogContent>
    </Dialog>
  );
}

type PickerBodyProps = Omit<RecipePickerProps, 'open' | 'onOpenChange' | 'targetLabel'>;

function PickerBody({
  lang,
  recipes,
  onSelect,
  slot,
  defaultServings = 2,
  ingredients,
  currency = 'USD',
}: PickerBodyProps) {
  const favorites = useStore($favorites);
  const [query, setQuery] = React.useState('');
  const [filter, setFilter] = React.useState<QuickFilter>('all');
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [servings, setServings] = React.useState(defaultServings);
  const baseId = React.useId();
  const searchId = `${baseId}-search`;
  const listId = `${baseId}-list`;
  const hintId = `${baseId}-hint`;
  const optionId = (recipeId: string) => `${baseId}-option-${recipeId}`;

  const matches = React.useMemo(() => {
    const found = searchRecipes(recipes, query, lang);
    switch (filter) {
      case 'meal':
        return slot ? found.filter((r) => SLOT_MEAL_TYPES[slot].includes(r.type)) : found;
      case 'quick':
        return found.filter((r) => r.totalTime <= QUICK_MINUTES);
      case 'favorites':
        return found.filter((r) => favorites.includes(r.id));
      default:
        return found;
    }
  }, [recipes, query, lang, filter, slot, favorites]);
  const results = matches.slice(0, MAX_RESULTS);
  const active = results.find((r) => r.id === activeId) ?? results[0] ?? null;

  const activeOptionId = active ? optionId(active.id) : undefined;

  React.useEffect(() => {
    if (activeOptionId) document.getElementById(activeOptionId)?.scrollIntoView?.({ block: 'nearest' });
  }, [activeOptionId]);

  const add = () => {
    if (active) onSelect(active, servings);
  };

  const move = (delta: number) => {
    if (results.length === 0) return;
    const index = active ? results.indexOf(active) : -1;
    const next = results[(index + delta + results.length) % results.length];
    if (next) setActiveId(next.id);
  };

  const onSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      move(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      move(-1);
    } else if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault();
      add();
    }
  };

  const activeName = active ? getTranslated(active.name, lang) : '';

  return (
    <>
      <div className="space-y-3">
        <div className="relative">
          <label htmlFor={searchId} className="sr-only">
            {t(lang, 'planner.pickerSearch')}
          </label>
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            id={searchId}
            type="search"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={results.length > 0}
            aria-controls={results.length > 0 ? listId : undefined}
            aria-activedescendant={activeOptionId}
            aria-describedby={hintId}
            autoComplete="off"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveId(null);
            }}
            onKeyDown={onSearchKeyDown}
            placeholder={t(lang, 'planner.pickerSearch')}
            className="pl-9"
            data-testid="recipe-picker-search"
          />
          <p id={hintId} className="sr-only">
            {t(lang, 'planner.pickerKeyboardHint')}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <ToggleGroup
            value={[filter]}
            onValueChange={(values) => {
              const next = values[0] as QuickFilter | undefined;
              if (next) {
                setFilter(next);
                setActiveId(null);
              }
            }}
            aria-label={t(lang, 'planner.pickerFilters')}
            className="flex-wrap"
            data-testid="recipe-picker-filters"
          >
            <ToggleGroupItem value="all" data-testid="recipe-picker-filter-all">
              {t(lang, 'planner.pickerFilterAll')}
            </ToggleGroupItem>
            {slot ? (
              <ToggleGroupItem value="meal" data-testid="recipe-picker-filter-meal">
                {t(lang, 'planner.pickerFilterMeal', { meal: slotLabel(lang, slot) })}
              </ToggleGroupItem>
            ) : null}
            <ToggleGroupItem value="quick" data-testid="recipe-picker-filter-quick">
              {t(lang, 'planner.pickerFilterQuick')}
            </ToggleGroupItem>
            <ToggleGroupItem value="favorites" data-testid="recipe-picker-filter-favorites">
              {t(lang, 'planner.pickerFilterFavorites')}
            </ToggleGroupItem>
          </ToggleGroup>
          <p className="text-xs text-muted-foreground" role="status" data-testid="recipe-picker-count">
            {matches.length > MAX_RESULTS
              ? t(lang, 'planner.pickerResultsTruncated', { shown: MAX_RESULTS, count: matches.length })
              : t(lang, 'planner.pickerResults', { count: matches.length })}
          </p>
        </div>
      </div>

      <div className="grid min-h-0 gap-4 sm:grid-cols-[minmax(0,1fr)_15rem]">
        {results.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground" data-testid="recipe-picker-empty">
            {t(lang, 'planner.pickerEmpty')}
          </p>
        ) : (
          <ul
            id={listId}
            role="listbox"
            aria-label={t(lang, 'planner.pickerListLabel')}
            className="-mx-1 max-h-[45vh] overflow-y-auto px-1 sm:max-h-none"
            data-testid="recipe-picker-results"
          >
            {results.map((recipe) => {
              const selected = recipe.id === active?.id;
              return (
                // Options are never focused: the keyboard drives them from the combobox input (↑/↓/Enter).
                // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                <li
                  key={recipe.id}
                  id={optionId(recipe.id)}
                  role="option"
                  aria-selected={selected}
                  data-recipe-id={recipe.id}
                  data-testid="recipe-picker-option"
                  // Keep focus in the search box: the listbox is driven by aria-activedescendant.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => setActiveId(recipe.id)}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-md border border-transparent px-2 py-2 text-sm',
                    selected ? 'border-primary bg-primary/10' : 'hover:bg-muted',
                  )}
                >
                  <span className="size-10 shrink-0 overflow-hidden rounded-md">
                    <RecipeArt recipe={recipe} lang={lang} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-foreground">{getTranslated(recipe.name, lang)}</span>
                    <span className="block text-xs text-muted-foreground">
                      {recipe.totalTime} {t(lang, 'common.minutesAbbr')}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        <section
          aria-label={t(lang, 'planner.pickerPreview')}
          className="rounded-lg border border-border bg-card p-3 text-card-foreground"
          data-testid="recipe-picker-preview"
        >
          {active ? (
            <RecipePreview
              recipe={active}
              lang={lang}
              servings={servings}
              defaultServings={defaultServings}
              onServingsChange={setServings}
              ingredients={ingredients}
              currency={currency}
            />
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">{t(lang, 'planner.pickerNoSelection')}</p>
          )}
        </section>
      </div>

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="ghost" />}>{t(lang, 'common.cancel')}</DialogClose>
        <Button
          type="button"
          onClick={add}
          disabled={!active}
          aria-label={active ? t(lang, 'planner.pickerAdd', { name: activeName }) : undefined}
          data-testid="recipe-picker-add"
          data-recipe-id={active?.id}
        >
          {t(lang, 'common.add')}
        </Button>
      </DialogFooter>
    </>
  );
}

function RecipePreview({
  recipe,
  lang,
  servings,
  defaultServings,
  onServingsChange,
  ingredients,
  currency,
}: {
  recipe: Recipe;
  lang: Locale;
  servings: number;
  defaultServings: number;
  onServingsChange: (servings: number) => void;
  ingredients?: ReadonlyArray<Ingredient>;
  currency: string;
}) {
  const kcal = Math.round(calculateRecipeNutrition(recipe, 1).calories);
  const cost = ingredients?.length ? calculateRecipeCost(scaleRecipe(recipe, servings), ingredients) : 0;
  return (
    <div className="space-y-3" data-recipe-id={recipe.id}>
      <div className="h-24 overflow-hidden rounded-md">
        <RecipeArt recipe={recipe} lang={lang} />
      </div>
      <div>
        <h3 className="font-display text-base font-semibold text-foreground" data-testid="recipe-picker-preview-name">
          {getTranslated(recipe.name, lang)}
        </h3>
        <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{getTranslated(recipe.description, lang)}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <TimeBadge minutes={recipe.totalTime} lang={lang} iconClassName="size-3.5" />
        <DifficultyBadge difficulty={recipe.difficulty} lang={lang} />
        <span className="inline-flex items-center gap-1" title={t(lang, 'planner.pickerRating', { rating: recipe.rating })}>
          <StarIcon className="size-3.5 fill-amber-400 text-amber-500" aria-hidden="true" />
          <span className="sr-only">{t(lang, 'planner.pickerRating', { rating: recipe.rating })}</span>
          <span aria-hidden="true">{recipe.rating}</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <UsersIcon className="size-3.5" aria-hidden="true" />
          {t(lang, 'planner.mealServings', { count: recipe.servings })}
        </span>
      </div>
      <p className="text-xs text-foreground" data-testid="recipe-picker-kcal">
        {t(lang, 'planner.pickerCalories', { count: kcal })}
      </p>
      <ServingsAdjuster
        servings={servings}
        originalServings={defaultServings}
        onChange={onServingsChange}
        lang={lang}
        max={MAX_SERVINGS}
        className="gap-2"
      />
      {cost > 0 ? (
        <p className="text-xs font-medium text-foreground" data-testid="recipe-picker-cost">
          {t(lang, 'planner.pickerCost', { cost: formatPrice(cost, currency, lang), count: servings })}
        </p>
      ) : null}
    </div>
  );
}
