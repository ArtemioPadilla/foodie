import * as React from 'react';
import { SearchIcon } from 'lucide-react';
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
import { getTranslated, t, type Locale } from '@/i18n';
import { searchRecipes } from '@/lib/catalog/selectors';
import type { Recipe } from '@/schemas';

/**
 * RecipePicker — the no-drag fallback of the planner (roadmap Issue 024; the
 * full picker — quick filters and preview — lands in Issue 025).
 *
 * A `Dialog` listing the catalog with a search box; "Add" hands the recipe id
 * back to the caller, which writes `$planner` for the active slot. It is
 * **not** an island of its own: it renders inside `MealPlanner`'s React root
 * (compound components never span islands), so the caller owns `open`.
 */
export interface RecipePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: Locale;
  recipes: ReadonlyArray<Recipe>;
  /** Localised "Monday · Lunch" of the slot being filled. */
  targetLabel: string;
  onSelect: (recipe: Recipe) => void;
}

const MAX_RESULTS = 50;

export function RecipePicker({ open, onOpenChange, lang, recipes, targetLabel, onSelect }: RecipePickerProps) {
  const [query, setQuery] = React.useState('');
  const searchId = React.useId();
  const results = React.useMemo(
    () => (query.trim() ? searchRecipes(recipes, query, lang) : [...recipes]).slice(0, MAX_RESULTS),
    [recipes, query, lang],
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setQuery('');
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[85vh] max-w-lg grid-rows-[auto_auto_minmax(0,1fr)_auto]" data-testid="recipe-picker">
        <DialogHeader>
          <DialogTitle>{t(lang, 'planner.pickerTitle')}</DialogTitle>
          <DialogDescription>{targetLabel}</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <label htmlFor={searchId} className="sr-only">
            {t(lang, 'planner.pickerSearch')}
          </label>
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t(lang, 'planner.pickerSearch')}
            className="pl-9"
            data-testid="recipe-picker-search"
          />
        </div>
        {results.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground" role="status">
            {t(lang, 'planner.pickerEmpty')}
          </p>
        ) : (
          <ul className="-mx-2 overflow-y-auto px-2" data-testid="recipe-picker-results">
            {results.map((recipe) => {
              const name = getTranslated(recipe.name, lang);
              return (
                <li key={recipe.id} className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-b-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{name}</p>
                    <p className="text-xs text-muted-foreground">
                      {recipe.totalTime} {t(lang, 'common.minutes')}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onSelect(recipe);
                      setQuery('');
                    }}
                    aria-label={t(lang, 'planner.pickerAdd', { name })}
                    data-testid="recipe-picker-add"
                    data-recipe-id={recipe.id}
                  >
                    {t(lang, 'common.add')}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>{t(lang, 'common.cancel')}</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
