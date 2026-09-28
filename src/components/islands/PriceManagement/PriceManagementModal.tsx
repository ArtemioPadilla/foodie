import * as React from 'react';
import { useStore } from '@nanostores/react';
import type { ColumnDef } from '@tanstack/react-table';
import { CoinsIcon, RotateCcwIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Editable } from '@/components/ui/editable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/toast';
import { getTranslated, t, type Locale } from '@/i18n';
import { buildPriceBook, type ResolvedPrice } from '@/lib/domain/cost';
import { categoryLabel } from '@/lib/domain/ingredient-browser';
import { formatPrice } from '@/lib/domain/ingredient-detail';
import { unitLabel } from '@/lib/domain/recipe-detail';
import { CURRENCIES, type Category, type CustomPrice, type Ingredient, type IngredientPrice } from '@/schemas';
import { $currency, setCurrency } from '@/stores/preferences';
import { $customPrices, resetAllCustomPrices, resetCustomPrice, setCustomPrice } from '@/stores/prices';

export interface PriceManagementModalProps {
  lang: Locale;
  ingredients: ReadonlyArray<Ingredient>;
  /** `categories.json → ingredientCategories` for the category column. */
  categories: ReadonlyArray<Category>;
  /** The store price sheet (`usePriceCatalog()`). */
  prices: ReadonlyArray<IngredientPrice>;
  /** Extra classes for the trigger button. */
  triggerClassName?: string;
}

interface PriceRow {
  id: string;
  name: string;
  category: string;
  unit: string;
  unitText: string;
  catalog: ResolvedPrice | undefined;
  custom: CustomPrice | undefined;
}

/** `"1,50"` / `" 2.5 "` → number; `NaN` for anything else. */
export function parsePriceInput(value: string): number {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d*\.?\d+$|^\d+\.$/.test(normalized)) return Number.NaN;
  return Number(normalized);
}

function currencyName(code: string, lang: Locale): string {
  try {
    const name = new Intl.DisplayNames([lang], { type: 'currency' }).of(code);
    return name && name !== code ? `${code} — ${name}` : code;
  } catch {
    return code;
  }
}

/**
 * PriceManagementModal — "Manage prices" button + `Dialog` (roadmap Issue 041,
 * port of PR #28's `PriceManagementModal`).
 *
 * - A `DataTable` of every catalog ingredient (search = the table's global
 *   filter, sortable columns) with the catalog price per recipe unit — the
 *   PR #28 store quote when it converts exactly, else `avgPrice` — and an
 *   inline `Editable` "your price" cell. Custom prices persist in
 *   `foodie:custom-prices` (`$customPrices`) with the currency they were typed
 *   in; the reset button of a row (or "Reset all", confirmed inline) returns
 *   to the catalog price.
 * - The currency select writes `$preferences.currency`; there are no exchange
 *   rates, so prices in another currency are shown but not used.
 * - Trigger and content are one composition: mount it inside the island that
 *   shows the cost (MealPlanner's `PlanSummary`, ShoppingList), never across
 *   islands.
 */
export function PriceManagementModal({ lang, ingredients, categories, prices, triggerClassName }: PriceManagementModalProps) {
  const custom = useStore($customPrices);
  const currency = useStore($currency);
  const [customOnly, setCustomOnly] = React.useState(false);
  const [confirmReset, setConfirmReset] = React.useState(false);
  // Bumped after a rejected edit so the uncontrolled Editable remounts with the stored value.
  const [revision, setRevision] = React.useState(0);
  const currencyId = React.useId();
  const confirmRef = React.useRef<HTMLButtonElement>(null);
  const customOnlyRef = React.useRef<HTMLButtonElement>(null);

  // Move focus into the inline confirmation when it opens.
  React.useEffect(() => {
    if (confirmReset) confirmRef.current?.focus();
  }, [confirmReset]);
  const closeConfirm = () => {
    setConfirmReset(false);
    // The "Reset all" button may be gone: park focus on a stable control.
    requestAnimationFrame(() => customOnlyRef.current?.focus());
  };

  const book = React.useMemo(
    () => buildPriceBook({ ingredients, prices, custom, currency }),
    [ingredients, prices, custom, currency],
  );
  const customCount = Object.keys(custom).length;

  const rows = React.useMemo<PriceRow[]>(
    () =>
      ingredients
        .map((ingredient) => ({
          id: ingredient.id,
          name: getTranslated(ingredient.name, lang),
          category: categoryLabel(ingredient.category, categories, lang),
          unit: ingredient.unit,
          unitText: unitLabel(lang, ingredient.unit),
          catalog: book.catalog(ingredient.id),
          custom: custom[ingredient.id],
        }))
        .filter((row) => !customOnly || row.custom !== undefined)
        .sort((a, b) => a.name.localeCompare(b.name, lang)),
    [ingredients, categories, lang, book, custom, customOnly],
  );

  const currencyItems = React.useMemo(() => {
    const codes: string[] = [...CURRENCIES];
    if (!codes.includes(currency)) codes.push(currency);
    return Object.fromEntries(codes.map((code) => [code, currencyName(code, lang)]));
  }, [currency, lang]);

  const columns = React.useMemo<ColumnDef<PriceRow, unknown>[]>(() => {
    const commit = (row: PriceRow, value: string) => {
      if (value.trim() === '') {
        if (row.custom) {
          resetCustomPrice(row.id);
          toast({ title: t(lang, 'prices.resetDone', { name: row.name }) });
        }
        return;
      }
      const price = parsePriceInput(value);
      if (!setCustomPrice(row.id, price, currency)) {
        toast({ title: t(lang, 'prices.invalidPrice'), data: { variant: 'destructive' } });
        setRevision((n) => n + 1);
        return;
      }
      toast({ title: t(lang, 'prices.saved', { name: row.name }) });
    };

    return [
      { id: 'name', accessorKey: 'name', header: t(lang, 'prices.columnIngredient'), enableHiding: false },
      { id: 'category', accessorKey: 'category', header: t(lang, 'prices.columnCategory') },
      {
        id: 'catalog',
        accessorFn: (row) => row.catalog?.price ?? -1,
        header: t(lang, 'prices.columnCatalog'),
        enableGlobalFilter: false,
        cell: ({ row: { original: row } }) => (
          <div className="text-sm" data-testid={`catalog-price-${row.id}`}>
            {row.catalog ? (
              <>
                <span className="tabular-nums">
                  {t(lang, 'prices.perUnit', { price: formatPrice(row.catalog.price, row.catalog.currency, lang), unit: row.unitText })}
                </span>
                {row.catalog.currency !== currency ? (
                  <span className="block text-xs text-muted-foreground">
                    {t(lang, 'prices.otherCurrency', { currency: row.catalog.currency })}
                  </span>
                ) : null}
                {row.catalog.quote ? (
                  <span className="block text-xs text-muted-foreground">
                    {t(lang, 'prices.storeQuote', {
                      price: formatPrice(row.catalog.quote.price, row.catalog.quote.currency, lang),
                      unit: row.catalog.quote.unit,
                    })}
                  </span>
                ) : null}
              </>
            ) : (
              <span className="text-muted-foreground">{t(lang, 'prices.noPrice')}</span>
            )}
          </div>
        ),
      },
      {
        id: 'yours',
        accessorFn: (row) => row.custom?.price ?? -1,
        header: t(lang, 'prices.columnYours'),
        enableGlobalFilter: false,
        cell: ({ row: { original: row } }) => (
          <div className="flex flex-wrap items-center gap-2" data-testid={`custom-price-${row.id}`} data-custom={row.custom ? 'true' : undefined}>
            <Editable
              key={`${row.id}:${row.custom?.price ?? ''}:${row.custom?.currency ?? ''}:${revision}`}
              defaultValue={row.custom && row.custom.currency === currency ? String(row.custom.price) : ''}
              placeholder={t(lang, 'prices.yourPricePlaceholder')}
              inputMode="decimal"
              onValueCommit={(value) => commit(row, value)}
              labels={{
                input: t(lang, 'prices.yourPriceLabel', { name: row.name, unit: row.unitText, currency }),
                edit: t(lang, 'prices.edit', { name: row.name }),
                submit: t(lang, 'prices.save', { name: row.name }),
                cancel: t(lang, 'prices.cancel'),
              }}
              data-testid={`price-editable-${row.id}`}
            />
            {row.custom ? (
              <Badge variant={row.custom.currency === currency ? 'secondary' : 'outline'}>
                {row.custom.currency === currency
                  ? t(lang, 'prices.customBadge')
                  : `${formatPrice(row.custom.price, row.custom.currency, lang)} · ${t(lang, 'prices.otherCurrency', { currency: row.custom.currency })}`}
              </Badge>
            ) : null}
          </div>
        ),
      },
      {
        id: 'reset',
        header: t(lang, 'prices.columnActions'),
        enableSorting: false,
        enableGlobalFilter: false,
        cell: ({ row: { original: row } }) =>
          row.custom ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t(lang, 'prices.reset', { name: row.name })}
              title={t(lang, 'prices.reset', { name: row.name })}
              onClick={() => {
                resetCustomPrice(row.id);
                toast({ title: t(lang, 'prices.resetDone', { name: row.name }) });
              }}
              data-testid={`reset-price-${row.id}`}
            >
              <RotateCcwIcon className="size-4" aria-hidden="true" />
            </Button>
          ) : null,
      },
    ];
  }, [lang, currency, revision]);

  return (
    <Dialog onOpenChange={(open) => !open && setConfirmReset(false)}>
      <DialogTrigger render={<Button type="button" variant="outline" size="sm" className={triggerClassName} data-testid="manage-prices-button" />}>
        <CoinsIcon className="size-4" aria-hidden="true" />
        {t(lang, 'prices.manage')}
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto" data-testid="price-dialog">
        <DialogHeader>
          <DialogTitle>{t(lang, 'prices.title')}</DialogTitle>
          <DialogDescription>{t(lang, 'prices.description')}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1">
            <label htmlFor={currencyId} className="text-sm font-medium text-foreground">
              {t(lang, 'prices.currency')}
            </label>
            <Select value={currency} onValueChange={(value) => value && setCurrency(String(value))} items={currencyItems}>
              <SelectTrigger id={currencyId} className="w-60" data-testid="price-currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(currencyItems).map(([code, label]) => (
                  <SelectItem key={code} value={code}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant={customOnly ? 'secondary' : 'outline'}
            aria-pressed={customOnly}
            ref={customOnlyRef}
            onClick={() => setCustomOnly((value) => !value)}
            data-testid="price-custom-only"
          >
            {t(lang, 'prices.customOnly')}
          </Button>
          <p className="text-sm text-muted-foreground" data-testid="price-custom-count" aria-live="polite">
            {t(lang, 'prices.customCount', { count: customCount })}
          </p>
          {customCount > 0 && !confirmReset ? (
            <Button type="button" variant="outline" className="ml-auto" onClick={() => setConfirmReset(true)} data-testid="price-reset-all">
              <RotateCcwIcon className="size-4" aria-hidden="true" />
              {t(lang, 'prices.resetAll')}
            </Button>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">{t(lang, 'prices.currencyHint')}</p>

        {confirmReset ? (
          <div
            role="group"
            aria-labelledby={`${currencyId}-reset-title`}
            className="flex flex-wrap items-center gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-3"
            data-testid="price-reset-confirm"
          >
            <div className="flex-1 text-sm">
              <p id={`${currencyId}-reset-title`} className="font-medium text-foreground">
                {t(lang, 'prices.confirmResetAllTitle')}
              </p>
              <p className="text-muted-foreground">{t(lang, 'prices.confirmResetAllBody', { count: customCount })}</p>
            </div>
            <Button type="button" variant="outline" onClick={closeConfirm}>
              {t(lang, 'common.cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              ref={confirmRef}
              onClick={() => {
                resetAllCustomPrices();
                closeConfirm();
                toast({ title: t(lang, 'prices.resetAllDone') });
              }}
              data-testid="price-reset-all-confirm"
            >
              {t(lang, 'prices.resetAll')}
            </Button>
          </div>
        ) : null}

        {ingredients.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground" role="status">
            {t(lang, 'prices.loading')}
          </p>
        ) : (
          <div data-testid="price-table">
            <DataTable
              columns={columns}
              data={rows}
              getRowId={(row) => row.id}
              height="min(50vh, 28rem)"
              estimateRowSize={56}
              labels={{
                globalFilterPlaceholder: t(lang, 'prices.searchPlaceholder'),
                globalFilter: t(lang, 'prices.search'),
                columns: t(lang, 'prices.columns'),
                toggleColumns: t(lang, 'prices.toggleColumns'),
                noResults: customOnly ? t(lang, 'prices.noCustomPrices') : t(lang, 'prices.noResults'),
              }}
            />
          </div>
        )}

        <DialogFooter>
          <DialogClose render={<Button type="button" />}>{t(lang, 'common.close')}</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
