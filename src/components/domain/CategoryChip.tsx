import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * CategoryChip — a food category's identity colour next to its localised name
 * (roadmap Issue 021; extracted from `IngredientCard`'s `CategoryDot`).
 *
 * - Colours come from the `--color-food-*` tokens (`global.css`, D13). They
 *   are **non-text** indicators (dot, card stripe) and never carry text, so
 *   the WCAG check that applies is 1.4.11 (≥ 3:1 against the surface) —
 *   enforced for every category in both themes by `npm run ux:check`
 *   (`src/tests/ux-contrast.test.ts`). The label keeps the kit's text colours.
 * - `appearance="dot"` (default) is the inline dot + label used in meta rows;
 *   `appearance="chip"` wraps it in a bordered pill for filters and headers.
 * - The label is always rendered, so colour is never the only cue (1.4.1).
 */

/** Ingredient category ids of `categories.ingredientCategories`, in display order. */
export const FOOD_CATEGORY_IDS = ['protein', 'vegetables', 'fruits', 'grains', 'dairy', 'pantry', 'spices'] as const;
export type FoodCategory = (typeof FOOD_CATEGORY_IDS)[number];

/** Tailwind classes per category id (literal so v4 generates them). */
export const FOOD_CATEGORY_CLASSES: Record<FoodCategory, { dot: string; stripe: string }> = {
  protein: { dot: 'bg-food-protein', stripe: 'border-l-food-protein' },
  vegetables: { dot: 'bg-food-vegetables', stripe: 'border-l-food-vegetables' },
  fruits: { dot: 'bg-food-fruits', stripe: 'border-l-food-fruits' },
  grains: { dot: 'bg-food-grains', stripe: 'border-l-food-grains' },
  dairy: { dot: 'bg-food-dairy', stripe: 'border-l-food-dairy' },
  pantry: { dot: 'bg-food-pantry', stripe: 'border-l-food-pantry' },
  spices: { dot: 'bg-food-spices', stripe: 'border-l-food-spices' },
};
const FALLBACK_CATEGORY_CLASSES = { dot: 'bg-muted-foreground', stripe: 'border-l-border' };

/** Classes for a category id; unknown ids fall back to neutral kit colours. */
export function categoryClasses(category: string): { dot: string; stripe: string } {
  return (FOOD_CATEGORY_CLASSES as Record<string, { dot: string; stripe: string }>)[category] ?? FALLBACK_CATEGORY_CLASSES;
}

export interface CategoryChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Category id (`protein`, `vegetables`, …); unknown ids render a neutral dot. */
  category: string;
  /** Localised category name (from `categories.ingredientCategories`). */
  label: string;
  /** `dot` — inline dot + label (default); `chip` — bordered pill. */
  appearance?: 'dot' | 'chip';
}

export function CategoryChip({ category, label, appearance = 'dot', className, ...props }: CategoryChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5',
        appearance === 'chip' && 'rounded-full border border-border bg-card px-2.5 py-0.5 text-xs font-medium text-foreground',
        className,
      )}
      data-category={category}
      data-appearance={appearance}
      {...props}
    >
      <span className={cn('size-2.5 shrink-0 rounded-full', categoryClasses(category).dot)} aria-hidden="true" />
      {label}
    </span>
  );
}
