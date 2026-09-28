import * as React from 'react';
import { useStore } from '@nanostores/react';
import { PackageOpenIcon, PlusIcon, SearchXIcon, ShoppingBasketIcon } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Toaster, toast } from '@/components/ui/toast';
import { getTranslated, localizedRoute, t, type Locale } from '@/i18n';
import { useCatalog } from '@/lib/catalog/use-catalog';
import { isCustomIngredient } from '@/lib/domain/ingredient-id';
import {
  availableIngredientIds,
  DEFAULT_PANTRY_FILTERS,
  filterPantryItems,
  getExpiredItems,
  getExpiringSoon,
  getLowStock,
  makePantryNaming,
  missingShoppingLines,
  pantryCategories,
  pantryShoppingLine,
  sortPantryItems,
  whatCanICook,
  type PantryFilters,
  type PantryRecipeMatch,
  type PantrySort,
} from '@/lib/domain/pantry';
import { humanizeId, unitLabel } from '@/lib/domain/recipe-detail';
import { getCategoryLabel, OTHER_CATEGORY, toShoppingDisplay } from '@/lib/domain/shopping';
import { useUnitConversion } from '@/lib/domain/use-unit-conversion';
import { withBase } from '@/lib/href';
import { useHydrated } from '@/lib/use-hydrated';
import type { PantryItem, Recipe } from '@/schemas';
import { $pantry, clearPantry, removePantryItem } from '@/stores/pantry';
import { addShoppingItem } from '@/stores/shopping';
import ErrorBoundary from './ErrorBoundary';
import { PantryAlerts } from './Pantry/PantryAlerts';
import { PantryControls } from './Pantry/PantryControls';
import { PantryItemDialog } from './Pantry/PantryItemDialog';
import { PantryItemRow } from './Pantry/PantryItemRow';
import { RecipeSuggestions, type MinMatch } from './Pantry/RecipeSuggestions';
import QueryProvider from './QueryProvider';

/**
 * Pantry — the `/pantry/` island (roadmap Issue 027; port of legacy
 * `pantry/PantryInventory`, `PantryItem`, `AddItemModal`, `ExpirationTracker`
 * and `RecipeSuggestions`).
 *
 * - State: `$pantry` (`pantryItems` in localStorage, ADR 0002); the catalog
 *   through `useCatalog()` for localised names, categories and recipes.
 * - Inventory: add / edit in `PantryItemDialog` (rhf + zod, `date-picker` for
 *   the expiration), remove, search, category and status filters, sort by
 *   expiration (default), name, quantity or date added; "clear pantry"
 *   confirms in an `alert-dialog`.
 * - Attention blocks: "Expiring soon" / "Expired" / "Low stock" callouts, with
 *   "add to shopping list" (`$shopping`) on low-stock items and on every row.
 * - "What can I cook": the pure `whatCanICook` selector over the non-expired
 *   stock; "add missing to shopping list" per suggestion.
 * - Store-backed UI renders after hydration only (the server has no
 *   `localStorage`): SSR and the first client render show a skeleton. Every
 *   Dialog / AlertDialog / Select and the `Toaster` live in this single root.
 */
export interface PantryProps {
  lang: Locale;
}

export default function Pantry(props: PantryProps) {
  return (
    <QueryProvider>
      <ErrorBoundary name="Pantry">
        <PantryView {...props} />
      </ErrorBoundary>
    </QueryProvider>
  );
}

export function PantryView({ lang }: PantryProps) {
  const hydrated = useHydrated();
  const items = useStore($pantry);
  const status: 'loading' | 'empty' | 'ready' = !hydrated ? 'loading' : items.length === 0 ? 'empty' : 'ready';

  return (
    <div data-testid="pantry" data-status={status} data-hydrated={hydrated ? 'true' : undefined}>
      {hydrated ? <PantryBoard lang={lang} items={items} /> : <PantrySkeleton lang={lang} />}
      <Toaster closeLabel={t(lang, 'common.close')} />
    </div>
  );
}

function PantrySkeleton({ lang }: { lang: Locale }) {
  return (
    <div className="space-y-4" aria-busy="true">
      <p className="sr-only">{t(lang, 'pantry.loading')}</p>
      <Skeleton className="h-10 w-40" />
      <Skeleton className="h-32 w-full" />
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-20 w-full" />
      ))}
    </div>
  );
}

function PantryBoard({ lang, items }: { lang: Locale; items: PantryItem[] }) {
  const catalog = useCatalog();
  const { preferredSystem } = useUnitConversion();
  // One "today" per mount: expiry badges must not flicker between renders.
  const now = React.useMemo(() => new Date(), []);
  const [filters, setFilters] = React.useState<PantryFilters>(DEFAULT_PANTRY_FILTERS);
  const [sort, setSort] = React.useState<PantrySort>('expiration');
  const [minMatch, setMinMatch] = React.useState<MinMatch>(0);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<PantryItem | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const taxonomy = catalog.categories.ingredientCategories;
  const naming = React.useMemo(() => makePantryNaming(catalog.ingredients, lang), [catalog.ingredients, lang]);
  const categoryLabel = React.useCallback(
    (id: string) => (id === OTHER_CATEGORY ? t(lang, 'pantry.otherCategory') : getCategoryLabel(id, taxonomy, lang)),
    [taxonomy, lang],
  );
  const unitText = React.useCallback((unit: string) => unitLabel(lang, unit), [lang]);
  const display = React.useCallback((item: PantryItem) => toShoppingDisplay(item.quantity, item.unit, preferredSystem), [preferredSystem]);
  const quantityOf = React.useCallback((item: PantryItem) => {
    const d = display(item);
    return `${d.formatted} ${unitText(d.unit)}`;
  }, [display, unitText]);

  const expiring = React.useMemo(() => getExpiringSoon(items, now), [items, now]);
  const expired = React.useMemo(() => getExpiredItems(items, now), [items, now]);
  const lowStock = React.useMemo(() => getLowStock(items, naming.nameOf), [items, naming]);

  const presentCategories = React.useMemo(
    () => pantryCategories(items, naming.categoryOf, taxonomy.map((c) => c.id)).map((id) => ({ id, label: categoryLabel(id) })),
    [items, naming, taxonomy, categoryLabel],
  );
  const formCategories = React.useMemo(() => taxonomy.map((c) => ({ id: c.id, label: categoryLabel(c.id) })), [taxonomy, categoryLabel]);
  // A category filter whose last item was removed falls back to "all".
  const activeFilters = React.useMemo(
    () => (filters.category === 'all' || presentCategories.some((c) => c.id === filters.category) ? filters : { ...filters, category: 'all' }),
    [filters, presentCategories],
  );
  const visible = React.useMemo(
    () => sortPantryItems(filterPantryItems(items, activeFilters, naming, now), sort, naming.nameOf, lang, now),
    [items, activeFilters, naming, now, sort, lang],
  );

  const matches = React.useMemo(() => {
    const available = availableIngredientIds(items, catalog.ingredients, now);
    const expiringIds = availableIngredientIds(expiring, catalog.ingredients, now);
    return whatCanICook(catalog.recipes, available, { minPercentage: minMatch, expiringIds });
  }, [items, catalog.ingredients, catalog.recipes, expiring, minMatch, now]);
  const ingredientNames = React.useMemo(
    () => new Map(catalog.ingredients.map((i) => [i.id, getTranslated(i.name, lang)] as const)),
    [catalog.ingredients, lang],
  );

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (item: PantryItem) => {
    setEditing(item);
    setDialogOpen(true);
  };
  const addToShopping = (item: PantryItem) => {
    addShoppingItem(pantryShoppingLine(item, catalog.ingredients, naming));
    toast({ title: t(lang, 'pantry.addedToShopping', { name: naming.nameOf(item) }) });
  };
  const addMissing = (match: PantryRecipeMatch) => {
    const lines = missingShoppingLines(match, catalog.ingredients);
    lines.forEach(addShoppingItem);
    toast({ title: t(lang, 'pantry.missingAdded', { count: lines.length }) });
  };
  const remove = (item: PantryItem) => {
    removePantryItem(item.id);
    toast({ title: t(lang, 'pantry.itemRemoved', { name: naming.nameOf(item) }) });
  };
  const confirmClear = () => {
    clearPantry();
    setConfirmOpen(false);
    toast({ title: t(lang, 'pantry.pantryCleared') });
  };

  const ingredientsHref = withBase(localizedRoute('/ingredients/', lang));
  const recipeHref = (recipe: Recipe) => withBase(localizedRoute(`/recipes/${recipe.id}/`, lang));

  return (
    <div className="space-y-10" data-testid="pantry-board" data-catalog={catalog.status}>
      <div className="flex flex-wrap items-center gap-3" data-testid="pantry-actions">
        <Button type="button" onClick={openAdd} data-testid="add-pantry-item">
          <PlusIcon className="size-4" aria-hidden="true" />
          {t(lang, 'pantry.addItem')}
        </Button>
        <Button asChild variant="outline">
          <a href={ingredientsHref}>
            <ShoppingBasketIcon className="size-4" aria-hidden="true" />
            {t(lang, 'pantry.browseIngredients')}
          </a>
        </Button>
        {items.length > 0 ? (
          <p className="ml-auto text-sm text-muted-foreground" data-testid="pantry-count">
            {t(lang, 'pantry.itemCount', { count: items.length })}
          </p>
        ) : null}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<PackageOpenIcon aria-hidden="true" />}
          title={t(lang, 'pantry.emptyPantry')}
          description={t(lang, 'pantry.emptyPantryDescription')}
          action={
            <Button type="button" onClick={openAdd} data-testid="add-first-pantry-item">
              <PlusIcon className="size-4" aria-hidden="true" />
              {t(lang, 'pantry.addFirstItem')}
            </Button>
          }
          data-testid="pantry-empty"
        />
      ) : (
        <>
          <PantryAlerts
            lang={lang}
            expiring={expiring}
            expired={expired}
            lowStock={lowStock}
            nameOf={naming.nameOf}
            quantityOf={quantityOf}
            now={now}
            onAddToShopping={addToShopping}
          />

          <section aria-labelledby="pantry-inventory-title" className="space-y-4" data-testid="pantry-inventory">
            <h2 id="pantry-inventory-title" className="font-display text-2xl font-semibold tracking-tight text-foreground">
              {t(lang, 'pantry.inventory')}
            </h2>
            <PantryControls
              lang={lang}
              filters={activeFilters}
              onFiltersChange={setFilters}
              sort={sort}
              onSortChange={setSort}
              categories={presentCategories}
              onClearAll={() => setConfirmOpen(true)}
            />
            {visible.length === 0 ? (
              <EmptyState
                icon={<SearchXIcon aria-hidden="true" />}
                title={t(lang, 'pantry.noResults')}
                description={t(lang, 'pantry.tryDifferentSearch')}
                data-testid="pantry-no-results"
              />
            ) : (
              <ul
                className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card text-card-foreground"
                aria-label={t(lang, 'pantry.inventoryList')}
                data-testid="pantry-list"
              >
                {visible.map((item) => {
                  const d = display(item);
                  const categoryId = naming.categoryOf(item);
                  return (
                    <PantryItemRow
                      key={item.id}
                      lang={lang}
                      item={item}
                      name={naming.nameOf(item)}
                      category={{ id: categoryId, label: categoryLabel(categoryId) }}
                      display={d}
                      unitText={unitText(d.unit)}
                      custom={isCustomIngredient(item.ingredientId)}
                      now={now}
                      onEdit={() => openEdit(item)}
                      onAddToShopping={() => addToShopping(item)}
                      onRemove={() => remove(item)}
                    />
                  );
                })}
              </ul>
            )}
          </section>

          <RecipeSuggestions
            lang={lang}
            matches={matches}
            loading={catalog.status === 'loading'}
            minMatch={minMatch}
            onMinMatchChange={setMinMatch}
            recipeName={(recipe) => getTranslated(recipe.name, lang)}
            recipeHref={recipeHref}
            ingredientName={(id) => ingredientNames.get(id) ?? humanizeId(id)}
            onAddMissing={addMissing}
          />
        </>
      )}

      <PantryItemDialog
        lang={lang}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        ingredients={catalog.ingredients}
        categories={formCategories}
        naming={naming}
        unitLabel={unitText}
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent data-testid="pantry-confirm-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{t(lang, 'pantry.confirmClearAll')}</AlertDialogTitle>
            <AlertDialogDescription>{t(lang, 'pantry.confirmClearAllBody', { count: items.length })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button type="button" variant="outline" />}>{t(lang, 'common.cancel')}</AlertDialogClose>
            <Button type="button" variant="destructive" onClick={confirmClear} data-testid="confirm-clear-pantry">
              {t(lang, 'pantry.clearPantry')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
