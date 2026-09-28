import * as React from 'react';
import { SearchIcon, Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { t, type Locale } from '@/i18n';
import { PANTRY_SORTS, PANTRY_STATUS_FILTERS, type PantryFilters, type PantrySort, type PantryStatusFilter } from '@/lib/domain/pantry';

export interface PantryControlsProps {
  lang: Locale;
  filters: PantryFilters;
  onFiltersChange: (filters: PantryFilters) => void;
  sort: PantrySort;
  onSortChange: (sort: PantrySort) => void;
  /** Category choices present in the inventory: `{ id, label }`. */
  categories: ReadonlyArray<{ id: string; label: string }>;
  onClearAll: () => void;
}

const SORT_LABEL_KEYS: Record<PantrySort, string> = {
  expiration: 'pantry.sortExpiration',
  name: 'pantry.sortName',
  quantity: 'pantry.sortQuantity',
  added: 'pantry.sortAdded',
};

const STATUS_LABEL_KEYS: Record<PantryStatusFilter, string> = {
  all: 'pantry.statusAll',
  expiring: 'pantry.statusExpiring',
  expired: 'pantry.statusExpired',
  low: 'pantry.statusLow',
};

/**
 * Inventory toolbar (port of legacy `PantryInventory`'s controls, roadmap
 * Issue 027): search, category filter, status filter (legacy "Expiring soon" /
 * "Low stock", plus "Expired"), sort (expiration first by default) and the
 * confirmed "Clear pantry" (legacy used `window.confirm`).
 */
export function PantryControls({ lang, filters, onFiltersChange, sort, onSortChange, categories, onClearAll }: PantryControlsProps) {
  const searchId = React.useId();
  const categoryId = React.useId();
  const statusId = React.useId();
  const sortId = React.useId();

  const categoryItems = React.useMemo(
    () => ({ all: t(lang, 'pantry.allCategories'), ...Object.fromEntries(categories.map((c) => [c.id, c.label])) }) as Record<string, string>,
    [categories, lang],
  );
  const statusItems = React.useMemo(
    () => Object.fromEntries(PANTRY_STATUS_FILTERS.map((s) => [s, t(lang, STATUS_LABEL_KEYS[s])])) as Record<string, string>,
    [lang],
  );
  const sortItems = React.useMemo(
    () => Object.fromEntries(PANTRY_SORTS.map((s) => [s, t(lang, SORT_LABEL_KEYS[s])])) as Record<string, string>,
    [lang],
  );

  return (
    <div className="space-y-3" data-testid="pantry-controls">
      <div className="relative">
        <label htmlFor={searchId} className="sr-only">
          {t(lang, 'pantry.searchLabel')}
        </label>
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          id={searchId}
          type="search"
          value={filters.search}
          onChange={(event) => onFiltersChange({ ...filters, search: event.target.value })}
          placeholder={t(lang, 'pantry.searchPlaceholder')}
          className="pl-9"
          autoComplete="off"
          data-testid="pantry-search"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
        <div>
          <label htmlFor={categoryId} className="sr-only">
            {t(lang, 'pantry.categoryFilterLabel')}
          </label>
          <Select value={filters.category} onValueChange={(value) => value && onFiltersChange({ ...filters, category: value })} items={categoryItems}>
            <SelectTrigger id={categoryId} className="w-full" data-testid="pantry-category-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(categoryItems).map(([id, label]) => (
                <SelectItem key={id} value={id}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label htmlFor={statusId} className="sr-only">
            {t(lang, 'pantry.statusFilterLabel')}
          </label>
          <Select
            value={filters.status}
            onValueChange={(value) => value && onFiltersChange({ ...filters, status: value as PantryStatusFilter })}
            items={statusItems}
          >
            <SelectTrigger id={statusId} className="w-full" data-testid="pantry-status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PANTRY_STATUS_FILTERS.map((s) => (
                <SelectItem key={s} value={s}>
                  {statusItems[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label htmlFor={sortId} className="sr-only">
            {t(lang, 'pantry.sortLabel')}
          </label>
          <Select value={sort} onValueChange={(value) => value && onSortChange(value as PantrySort)} items={sortItems}>
            <SelectTrigger id={sortId} className="w-full" data-testid="pantry-sort">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PANTRY_SORTS.map((s) => (
                <SelectItem key={s} value={s}>
                  {sortItems[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="button" variant="destructive" onClick={onClearAll} data-testid="clear-pantry">
          <Trash2Icon className="size-4" aria-hidden="true" />
          {t(lang, 'pantry.clearPantry')}
        </Button>
      </div>
    </div>
  );
}
