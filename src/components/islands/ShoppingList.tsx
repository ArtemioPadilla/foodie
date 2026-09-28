import * as React from 'react';
import { useStore } from '@nanostores/react';
import { CalendarDaysIcon, ListChecksIcon, SearchXIcon, ShoppingCartIcon } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Toaster, toast } from '@/components/ui/toast';
import { localizedRoute, t, type Locale } from '@/i18n';
import { useCatalog, usePriceCatalog } from '@/lib/catalog/use-catalog';
import { buildPriceBook, estimateShoppingCost } from '@/lib/domain/cost';
import { formatPrice } from '@/lib/domain/ingredient-detail';
import { withBase } from '@/lib/href';
import { isCustomIngredient } from '@/lib/domain/ingredient-id';
import {
  filterShoppingItems,
  fromShoppingDisplay,
  groupShoppingItems,
  isManualShoppingItem,
  makeCategoryResolver,
  shoppingItemKey,
  sortShoppingItems,
  toShoppingDisplay,
  type ShoppingSort,
} from '@/lib/domain/shopping';
import type { ResolvedUnitSystem } from '@/lib/domain/units';
import { useUnitConversion } from '@/lib/domain/use-unit-conversion';
import { useHydrated } from '@/lib/use-hydrated';
import type { ShoppingListItem } from '@/schemas';
import { $currentPlan, getMealCount } from '@/stores/planner';
import { $currency } from '@/stores/preferences';
import { $customPrices } from '@/stores/prices';
import {
  $shopping,
  clearCheckedItems,
  clearShoppingList,
  generateFromPlan,
  removeShoppingItem,
  toggleShoppingItem,
  updateShoppingLine,
  updateShoppingNotes,
} from '@/stores/shopping';
import ErrorBoundary from './ErrorBoundary';
import QueryProvider from './QueryProvider';
import { AddItemModal } from './ShoppingList/AddItemModal';
import { CategoryGroup } from './ShoppingList/CategoryGroup';
import { ExportDialog } from './ShoppingList/ExportDialog';
import { makeShoppingLabels, type ShoppingLabels } from './ShoppingList/labels';
import { ListControls } from './ShoppingList/ListControls';
import { ShoppingListItemRow } from './ShoppingList/ShoppingListItem';
import { LazyPriceManagementModal } from './PriceManagement/LazyPriceManagementModal';

/**
 * ShoppingList — the `/shopping/` island (roadmap Issue 026; port of legacy
 * `ShoppingList`, `ShoppingListItem`, `CategoryGroup`, `ListControls`,
 * `ExportOptions` and PR #28's `AddItemModal`).
 *
 * - State: `$shopping` (`shoppingList` in localStorage, ADR 0002); the plan
 *   from `$currentPlan`; the catalog through `useCatalog()` for localised
 *   ingredient / category / recipe names.
 * - "Generate from plan" consolidates the plan's ingredients with
 *   `convertToBaseUnit` (`normalizeUnits`) and keeps the lines the user added
 *   by hand (`keepManual`); regenerating over recipe lines asks first.
 * - Lines are grouped by category (food-token colour), can be checked,
 *   re-quantified, annotated and removed; "clear checked" / "clear all" confirm
 *   in an `alert-dialog`. Search, sort and show/hide-checked are view state.
 * - Quantities are shown — and exported — in `$preferences.unitSystem`
 *   (`useUnitConversion`, `auto` resolved after hydration).
 * - Exports (text, CSV, WhatsApp, print, clipboard) in `ExportDialog`.
 * - Estimated cost (roadmap Issue 041): each item's quantity × its price in
 *   the item's unit (`lib/domain/cost.ts`, custom > catalog, in
 *   `$preferences.currency`), what is left to buy, and how many items were
 *   priced; the "Manage prices" dialog sits in the toolbar.
 * - Store-backed UI renders after hydration only (the server has no
 *   `localStorage`): SSR and the first client render show a skeleton. Every
 *   Dialog / AlertDialog / Select and the `Toaster` live in this single root.
 */
export interface ShoppingListProps {
  lang: Locale;
}

export default function ShoppingList(props: ShoppingListProps) {
  return (
    <QueryProvider>
      <ErrorBoundary name="ShoppingList">
        <ShoppingListView {...props} />
      </ErrorBoundary>
    </QueryProvider>
  );
}

type Pending = 'generate' | 'clearAll' | 'clearChecked';

export function ShoppingListView({ lang }: ShoppingListProps) {
  const hydrated = useHydrated();
  const items = useStore($shopping);
  const status: 'loading' | 'empty' | 'ready' = !hydrated ? 'loading' : items.length === 0 ? 'empty' : 'ready';

  return (
    <div data-testid="shopping-list" data-status={status} data-hydrated={hydrated ? 'true' : undefined}>
      {hydrated ? <ShoppingBoard lang={lang} items={items} /> : <ShoppingSkeleton lang={lang} />}
      <Toaster closeLabel={t(lang, 'common.close')} />
    </div>
  );
}

function ShoppingSkeleton({ lang }: { lang: Locale }) {
  return (
    <div className="space-y-4" aria-busy="true">
      <p className="sr-only">{t(lang, 'shopping.loading')}</p>
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-24 w-full" />
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-40 w-full" />
      ))}
    </div>
  );
}

function ShoppingBoard({ lang, items }: { lang: Locale; items: ShoppingListItem[] }) {
  const catalog = useCatalog();
  const prices = usePriceCatalog();
  const custom = useStore($customPrices);
  const currency = useStore($currency);
  const plan = useStore($currentPlan);
  const { preferredSystem } = useUnitConversion();
  const [search, setSearch] = React.useState('');
  const [sort, setSort] = React.useState<ShoppingSort>('category');
  const [showChecked, setShowChecked] = React.useState(true);
  // `pending` outlives `confirmOpen` so the alert dialog keeps its text while it animates out.
  const [pending, setPending] = React.useState<Pending | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const hintId = React.useId();

  const categories = catalog.categories.ingredientCategories;
  const labels = React.useMemo(
    () => makeShoppingLabels(lang, { ingredients: catalog.ingredients, recipes: catalog.recipes, categories }, items),
    [lang, catalog.ingredients, catalog.recipes, categories, items],
  );
  const categoryChoices = React.useMemo(
    () => categories.map((c) => ({ id: c.id, label: labels.categoryLabel(c.id) })),
    [categories, labels],
  );

  const book = React.useMemo(
    () => buildPriceBook({ ingredients: catalog.ingredients, prices, custom, currency }),
    [catalog.ingredients, prices, custom, currency],
  );
  const cost = React.useMemo(() => estimateShoppingCost(items, book.priceOf), [items, book]);

  const total = items.length;
  const checkedCount = items.filter((i) => i.checked).length;
  const planMeals = plan ? getMealCount(plan) : 0;
  const canGenerate = plan !== null && planMeals > 0 && catalog.recipes.length > 0;
  const plannerHref = withBase(localizedRoute('/planner/', lang));

  const ask = (kind: Pending) => {
    setPending(kind);
    setConfirmOpen(true);
  };

  const generate = () => {
    if (!plan) return;
    const count = generateFromPlan(plan, catalog.recipes, makeCategoryResolver(catalog.ingredients), {
      normalizeUnits: true,
      keepManual: true,
    });
    toast({ title: t(lang, 'shopping.generated', { count }) });
  };
  const requestGenerate = () => (items.some((i) => !isManualShoppingItem(i)) ? ask('generate') : generate());

  const confirm = () => {
    if (pending === 'generate') generate();
    else if (pending === 'clearAll') {
      clearShoppingList();
      toast({ title: t(lang, 'shopping.listCleared') });
    } else if (pending === 'clearChecked') {
      clearCheckedItems();
      toast({ title: t(lang, 'shopping.checkedCleared', { count: checkedCount }) });
    }
    setConfirmOpen(false);
  };

  const visible = React.useMemo(
    () =>
      sortShoppingItems(
        filterShoppingItems(items, { search, showChecked }, labels.nameOf, labels.categoryLabel),
        sort,
        labels.nameOf,
        lang,
      ),
    [items, search, showChecked, sort, labels, lang],
  );
  const groups = React.useMemo(() => groupShoppingItems(visible, categories.map((c) => c.id)), [visible, categories]);

  const renderRow = (item: ShoppingListItem, flat: boolean) => (
    <ShoppingRow key={shoppingItemKey(item)} lang={lang} item={item} labels={labels} system={preferredSystem} flat={flat} />
  );

  return (
    // `data-catalog` exposes the catalog load state so tests can wait for the
    // final group order/labels (groups reorder once the categories arrive).
    <div className="space-y-6" data-testid="shopping-board" data-catalog={catalog.status}>
      <div className="flex flex-wrap items-center gap-2 print:hidden" data-testid="shopping-actions">
        <Button type="button" onClick={requestGenerate} disabled={!canGenerate} aria-describedby={canGenerate ? undefined : hintId} data-testid="generate-from-plan">
          <ListChecksIcon className="size-4" aria-hidden="true" />
          {t(lang, 'shopping.generateFromPlan')}
        </Button>
        <AddItemModal lang={lang} categories={categoryChoices} unitLabel={labels.unitLabel} />
        <ExportDialog lang={lang} items={items} system={preferredSystem} labels={labels.exportLabels} disabled={total === 0} />
        <LazyPriceManagementModal lang={lang} ingredients={catalog.ingredients} categories={categories} prices={prices} />
        <Badge variant="outline" className="ml-auto" data-testid="unit-system" data-system={preferredSystem}>
          {t(lang, preferredSystem === 'imperial' ? 'shopping.unitSystemImperial' : 'shopping.unitSystemMetric')}
        </Badge>
      </div>
      {!canGenerate ? (
        <p id={hintId} className="-mt-4 text-sm text-muted-foreground print:hidden" data-testid="generate-hint">
          {t(lang, 'shopping.noPlanMeals')}{' '}
          <a href={plannerHref} className="font-medium text-primary underline-offset-4 hover:underline">
            {t(lang, 'shopping.openPlanner')}
          </a>
        </p>
      ) : null}

      {total === 0 ? (
        <EmptyState
          icon={<ShoppingCartIcon aria-hidden="true" />}
          title={t(lang, 'shopping.emptyList')}
          description={t(lang, 'shopping.emptyListDescription')}
          action={
            <Button asChild variant="outline">
              <a href={plannerHref}>
                <CalendarDaysIcon className="size-4" aria-hidden="true" />
                {t(lang, 'shopping.openPlanner')}
              </a>
            </Button>
          }
          data-testid="shopping-empty"
        />
      ) : (
        <>
          <ListControls
            lang={lang}
            search={search}
            onSearchChange={setSearch}
            sort={sort}
            onSortChange={setSort}
            showChecked={showChecked}
            onToggleShowChecked={() => setShowChecked((value) => !value)}
            total={total}
            checked={checkedCount}
            onClearChecked={() => ask('clearChecked')}
            onClearAll={() => ask('clearAll')}
          />

          <p
            className="flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-lg border border-border bg-card px-4 py-3 text-sm"
            data-testid="shopping-cost"
            data-cost={cost.priced > 0 ? cost.total : undefined}
            data-coverage={cost.coverage}
            data-currency={currency}
          >
            <span className="font-medium text-foreground">
              {t(lang, 'shopping.estimatedCost')}:{' '}
              <span className="tabular-nums">
                {cost.priced > 0 ? formatPrice(cost.total, currency, lang) : t(lang, 'shopping.costUnavailable', { currency })}
              </span>
            </span>
            {cost.priced > 0 && cost.remaining !== cost.total ? (
              <span className="text-muted-foreground" data-testid="shopping-cost-remaining">
                {t(lang, 'shopping.costRemaining', { cost: formatPrice(cost.remaining, currency, lang) })}
              </span>
            ) : null}
            {cost.priced > 0 && cost.priced < cost.count ? (
              <span className="text-muted-foreground" data-testid="shopping-cost-coverage">
                {t(lang, 'shopping.costCoverage', { priced: cost.priced, count: cost.count })}
              </span>
            ) : null}
          </p>

          <h2 className="sr-only">{t(lang, 'shopping.itemsList')}</h2>
          {visible.length === 0 ? (
            <EmptyState
              icon={<SearchXIcon aria-hidden="true" />}
              title={t(lang, 'shopping.noResults')}
              description={t(lang, 'shopping.tryDifferentSearch')}
              data-testid="shopping-no-results"
            />
          ) : sort === 'category' ? (
            <div className="space-y-4 print:columns-2 print:gap-6 print:space-y-0" data-testid="shopping-groups">
              {groups.map((group) => (
                <CategoryGroup
                  key={group.category}
                  lang={lang}
                  category={group.category}
                  label={labels.categoryLabel(group.category)}
                  checked={group.items.filter((i) => i.checked).length}
                  total={group.items.length}
                >
                  {group.items.map((item) => renderRow(item, false))}
                </CategoryGroup>
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card" data-testid="shopping-flat-list">
              {visible.map((item) => renderRow(item, true))}
            </ul>
          )}
        </>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent data-testid="shopping-confirm-dialog" data-kind={pending ?? undefined}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending === 'generate'
                ? t(lang, 'shopping.confirmGenerateTitle')
                : pending === 'clearAll'
                  ? t(lang, 'shopping.confirmClearAll')
                  : t(lang, 'shopping.confirmClearChecked', { count: checkedCount })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending === 'generate'
                ? t(lang, 'shopping.confirmGenerateBody')
                : pending === 'clearAll'
                  ? t(lang, 'shopping.confirmClearAllBody', { count: total })
                  : t(lang, 'shopping.confirmClearCheckedBody')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button type="button" variant="outline" />}>{t(lang, 'common.cancel')}</AlertDialogClose>
            <Button
              type="button"
              variant={pending === 'generate' ? 'default' : 'destructive'}
              onClick={confirm}
              data-testid="confirm-shopping-action"
            >
              {pending === 'generate'
                ? t(lang, 'shopping.confirmGenerate')
                : pending === 'clearAll'
                  ? t(lang, 'shopping.clearList')
                  : t(lang, 'common.remove')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ShoppingRow({
  lang,
  item,
  labels,
  system,
  flat,
}: {
  lang: Locale;
  item: ShoppingListItem;
  labels: ShoppingLabels;
  system: ResolvedUnitSystem;
  flat: boolean;
}) {
  const name = labels.nameOf(item);
  const display = toShoppingDisplay(item.quantity, item.unit, system);
  const category = item.category || 'other';
  return (
    <ShoppingListItemRow
      lang={lang}
      item={item}
      name={name}
      display={display}
      unitText={labels.unitLabel(display.unit)}
      usedIn={item.usedIn.map(labels.recipeLabel)}
      custom={isCustomIngredient(item.ingredientId)}
      category={flat ? { id: category, label: labels.categoryLabel(category) } : undefined}
      onToggle={() => toggleShoppingItem(item.ingredientId, item.unit)}
      onRemove={() => {
        removeShoppingItem(item.ingredientId, item.unit);
        toast({ title: t(lang, 'shopping.itemRemoved', { name }) });
      }}
      onQuantityChange={(quantity) => updateShoppingLine(item.ingredientId, item.unit, fromShoppingDisplay(quantity, display.unit, item.unit))}
      onNotesChange={(notes) => updateShoppingNotes(item.ingredientId, notes, item.unit)}
    />
  );
}
