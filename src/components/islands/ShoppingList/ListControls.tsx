import * as React from 'react';
import { CheckCheckIcon, EyeIcon, EyeOffIcon, SearchIcon, Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { t, type Locale } from '@/i18n';
import { SHOPPING_SORTS, type ShoppingSort } from '@/lib/domain/shopping';

export interface ListControlsProps {
  lang: Locale;
  search: string;
  onSearchChange: (search: string) => void;
  sort: ShoppingSort;
  onSortChange: (sort: ShoppingSort) => void;
  showChecked: boolean;
  onToggleShowChecked: () => void;
  total: number;
  checked: number;
  onClearChecked: () => void;
  onClearAll: () => void;
}

const SORT_LABEL_KEYS: Record<ShoppingSort, string> = {
  category: 'shopping.sortByCategory',
  name: 'shopping.sortByName',
  checked: 'shopping.sortByChecked',
};

/**
 * Toolbar of the shopping list (port of legacy `ListControls`, roadmap Issue
 * 026): search, sort (category / name / status), show-hide purchased lines,
 * progress and the two destructive actions — "clear checked" and "clear
 * all" — which the island confirms in an `alert-dialog` (legacy used
 * `window.confirm`). Hidden when printing.
 */
export function ListControls({
  lang,
  search,
  onSearchChange,
  sort,
  onSortChange,
  showChecked,
  onToggleShowChecked,
  total,
  checked,
  onClearChecked,
  onClearAll,
}: ListControlsProps) {
  const searchId = React.useId();
  const sortId = React.useId();
  const percent = total > 0 ? Math.round((checked / total) * 100) : 0;
  const sortItems = React.useMemo(
    () => Object.fromEntries(SHOPPING_SORTS.map((s) => [s, t(lang, SORT_LABEL_KEYS[s])])) as Record<string, string>,
    [lang],
  );

  return (
    <div className="space-y-4 print:hidden" data-testid="shopping-controls">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <label htmlFor={searchId} className="sr-only">
            {t(lang, 'shopping.searchLabel')}
          </label>
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            id={searchId}
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t(lang, 'shopping.searchPlaceholder')}
            className="pl-9"
            autoComplete="off"
            data-testid="shopping-search"
          />
        </div>
        <label htmlFor={sortId} className="sr-only">
          {t(lang, 'shopping.sortLabel')}
        </label>
        <Select value={sort} onValueChange={(value) => value && onSortChange(value as ShoppingSort)} items={sortItems}>
          <SelectTrigger id={sortId} className="w-full md:w-48" data-testid="shopping-sort">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SHOPPING_SORTS.map((s) => (
              <SelectItem key={s} value={s}>
                {sortItems[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant={showChecked ? 'secondary' : 'outline'}
          onClick={onToggleShowChecked}
          data-testid="toggle-checked"
        >
          {showChecked ? <EyeOffIcon className="size-4" aria-hidden="true" /> : <EyeIcon className="size-4" aria-hidden="true" />}
          {t(lang, showChecked ? 'shopping.hideChecked' : 'shopping.showChecked')}
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 text-card-foreground">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="font-medium text-foreground">{t(lang, 'shopping.progress')}</span>
          <span className="font-semibold tabular-nums text-foreground" data-testid="shopping-progress-text">
            {t(lang, 'shopping.progressSummary', { checked, total, percent })}
          </span>
        </div>
        <ProgressBar value={percent} label={t(lang, 'shopping.progressLabel')} className="h-2.5" data-testid="shopping-progress" />
        <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground" data-testid="shopping-stats">
          <div className="flex gap-1">
            <dt>{t(lang, 'shopping.totalItems')}:</dt>
            <dd className="font-semibold text-foreground" data-testid="stat-total">{total}</dd>
          </div>
          <div className="flex gap-1">
            <dt>{t(lang, 'shopping.checked')}:</dt>
            <dd className="font-semibold text-foreground" data-testid="stat-checked">{checked}</dd>
          </div>
          <div className="flex gap-1">
            <dt>{t(lang, 'shopping.remaining')}:</dt>
            <dd className="font-semibold text-foreground" data-testid="stat-remaining">{total - checked}</dd>
          </div>
        </dl>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onClearChecked} disabled={checked === 0} data-testid="clear-completed">
          <CheckCheckIcon className="size-4" aria-hidden="true" />
          {t(lang, 'shopping.clearChecked', { count: checked })}
        </Button>
        <div className="flex-1" />
        <Button type="button" variant="destructive" size="sm" onClick={onClearAll} data-testid="clear-list">
          <Trash2Icon className="size-4" aria-hidden="true" />
          {t(lang, 'shopping.clearList')}
        </Button>
      </div>
    </div>
  );
}
