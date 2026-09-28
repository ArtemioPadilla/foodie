import * as React from 'react';
import { ChevronRightIcon } from 'lucide-react';
import { CategoryChip, categoryClasses } from '@/components/domain/CategoryChip';
import { Badge } from '@/components/ui/badge';
import { t, type Locale } from '@/i18n';
import { cn } from '@/lib/utils';

export interface CategoryGroupProps {
  lang: Locale;
  /** Category id (`protein`, …, `other`). */
  category: string;
  /** Localised category name. */
  label: string;
  checked: number;
  total: number;
  children: React.ReactNode;
}

/**
 * A collapsible category of the shopping list (port of legacy
 * `CategoryGroup`, roadmap Issue 026). The category's identity colour comes
 * from the `--color-food-*` tokens (left stripe + `CategoryChip` dot, always
 * next to the name — never the only cue). Collapsed groups stay in the DOM
 * but hidden, and `print:block` brings them back on paper.
 */
export function CategoryGroup({ lang, category, label, checked, total, children }: CategoryGroupProps) {
  const [collapsed, setCollapsed] = React.useState(false);
  const listId = React.useId();
  const done = total > 0 && checked === total;

  return (
    <section
      data-testid="category-group"
      data-category={category}
      className={cn('overflow-hidden rounded-lg border border-l-4 border-border bg-card text-card-foreground break-inside-avoid', categoryClasses(category).stripe)}
    >
      <h3 className="m-0">
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          aria-expanded={!collapsed}
          aria-controls={listId}
          title={t(lang, collapsed ? 'shopping.expandGroup' : 'shopping.collapseGroup', { category: label })}
          className="flex w-full items-center gap-3 bg-muted/40 px-3 py-2.5 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          data-testid="category-toggle"
        >
          <ChevronRightIcon
            className={cn('size-4 shrink-0 text-muted-foreground transition-transform print:hidden', !collapsed && 'rotate-90')}
            aria-hidden="true"
          />
          <CategoryChip category={category} label={label} className="text-base font-semibold text-foreground" />
          <Badge
            variant={done ? 'default' : 'secondary'}
            className="ml-auto tabular-nums"
            title={t(lang, 'shopping.groupProgress', { checked, total })}
            data-testid="category-count"
          >
            {checked}/{total}
          </Badge>
        </button>
      </h3>
      <ul id={listId} className={cn('divide-y divide-border', collapsed && 'hidden print:block')}>
        {children}
      </ul>
    </section>
  );
}
