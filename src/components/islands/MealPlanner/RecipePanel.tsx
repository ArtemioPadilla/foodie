import * as React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { ClockIcon, GripVerticalIcon, SearchIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { getTranslated, t, type Locale } from '@/i18n';
import { searchRecipes } from '@/lib/catalog/selectors';
import type { CatalogStatus } from '@/lib/catalog/use-catalog';
import { cn } from '@/lib/utils';
import type { Recipe } from '@/schemas';
import { recipeDraggableId, type DragData } from './dnd';

export interface RecipePanelProps {
  lang: Locale;
  recipes: ReadonlyArray<Recipe>;
  status: CatalogStatus;
}

/**
 * Side panel of draggable catalog recipes (port of legacy `DraggableRecipe`,
 * which was never mounted by the old page). Each row is a drag source for
 * pointer and keyboard; a search box narrows the list. Below `lg` the rows
 * keep `touch-action: manipulation` so the list still scrolls on phones —
 * there the "+" picker of each slot is the way in (roadmap risk "@dnd-kit en
 * móvil").
 */
export function RecipePanel({ lang, recipes, status }: RecipePanelProps) {
  const [query, setQuery] = React.useState('');
  const searchId = React.useId();
  const hintId = React.useId();
  const results = React.useMemo(() => searchRecipes(recipes, query, lang), [recipes, query, lang]);

  return (
    <aside
      aria-labelledby="planner-recipes-heading"
      data-testid="recipe-panel"
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 text-card-foreground lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)]"
    >
      <div>
        <h2 id="planner-recipes-heading" className="font-display text-lg font-semibold text-foreground">
          {t(lang, 'planner.recipesPanel')}
        </h2>
        <p id={hintId} className="mt-1 text-xs text-muted-foreground">
          {t(lang, 'planner.recipesPanelHint')}
        </p>
      </div>
      <div className="relative">
        <label htmlFor={searchId} className="sr-only">
          {t(lang, 'planner.searchRecipes')}
        </label>
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          id={searchId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t(lang, 'planner.searchRecipes')}
          className="pl-9"
          data-testid="recipe-panel-search"
        />
      </div>
      {status === 'loading' ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : status === 'error' ? (
        <p role="alert" className="text-sm text-destructive">
          {t(lang, 'planner.catalogError')}
        </p>
      ) : results.length === 0 ? (
        <p role="status" className="text-sm text-muted-foreground">
          {t(lang, 'planner.noRecipesFound', { query })}
        </p>
      ) : (
        <ul className="-mx-1 min-h-0 space-y-1.5 overflow-y-auto px-1 max-lg:max-h-72" aria-describedby={hintId}>
          {results.map((recipe, index) => (
            <DraggableRecipe key={recipe.id} lang={lang} recipe={recipe} index={index} />
          ))}
        </ul>
      )}
    </aside>
  );
}

function DraggableRecipe({ lang, recipe, index }: { lang: Locale; recipe: Recipe; index: number }) {
  const name = getTranslated(recipe.name, lang);
  const data: DragData = { kind: 'recipe', recipeId: recipe.id, name };
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({ id: recipeDraggableId(recipe.id), data });
  return (
    <li>
      <button
        type="button"
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        aria-label={t(lang, 'planner.dragRecipeLabel', { name })}
        data-testid="draggable-recipe"
        data-recipe-id={recipe.id}
        data-panel-index={index}
        className={cn(
          'flex w-full cursor-grab touch-manipulation items-center lg:touch-none gap-2 rounded-md border border-border bg-background px-2 py-2 text-left text-sm',
          'hover:border-primary/50 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing',
          isDragging && 'opacity-50',
        )}
      >
        <GripVerticalIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate font-medium text-foreground">{name}</span>
        <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
          <ClockIcon className="size-3" aria-hidden="true" />
          {recipe.totalTime} {t(lang, 'common.minutes')}
        </span>
      </button>
    </li>
  );
}
