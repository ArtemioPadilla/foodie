import * as React from 'react';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { t, type Locale } from '@/i18n';
import { scaleNutrition } from '@/lib/domain/nutrition';
import { cn } from '@/lib/utils';
import type { NutritionInfo } from '@/schemas';

export interface NutritionFactsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Per-serving values as stored in the catalog. */
  nutrition: NutritionInfo;
  /** The recipe's own yield. */
  baseServings: number;
  /** The yield currently selected; values are multiplied by `servings / baseServings` (legacy behaviour). */
  servings?: number;
  lang?: Locale;
  /** Render without the surrounding card chrome (gallery / embedding). */
  bare?: boolean;
}

type Row = { key: keyof Omit<NutritionInfo, 'servingSize'>; unit: 'kcal' | 'g' | 'mg'; labelKey: string };

/** Display order — the eight macros of `NutritionInfo`. */
export const NUTRITION_ROWS: ReadonlyArray<Row> = [
  { key: 'calories', unit: 'kcal', labelKey: 'nutrition.calories' },
  { key: 'protein', unit: 'g', labelKey: 'nutrition.protein' },
  { key: 'carbs', unit: 'g', labelKey: 'nutrition.carbohydrates' },
  { key: 'fat', unit: 'g', labelKey: 'nutrition.fat' },
  { key: 'fiber', unit: 'g', labelKey: 'nutrition.fiber' },
  { key: 'sugar', unit: 'g', labelKey: 'nutrition.sugar' },
  { key: 'sodium', unit: 'mg', labelKey: 'nutrition.sodium' },
  { key: 'cholesterol', unit: 'mg', labelKey: 'nutrition.cholesterol' },
];

/**
 * NutritionFacts — the recipe's macros as an accessible table (roadmap Issue
 * 018, port of legacy `RecipeNutrition`): a `<caption>`, a header row with
 * `scope="col"` and one `scope="row"` header per nutrient, so screen readers
 * announce "Protein, 24 g" instead of a grid of numbers. Values are scaled by
 * `servings / baseServings` exactly as the legacy card did.
 */
export function NutritionFacts({
  nutrition,
  baseServings,
  servings = baseServings,
  lang = 'en',
  bare = false,
  className,
  ...props
}: NutritionFactsProps) {
  const factor = baseServings > 0 ? servings / baseServings : 1;
  const values = React.useMemo(() => scaleNutrition(nutrition, factor), [nutrition, factor]);
  const scaled = servings !== baseServings;

  return (
    <div
      className={cn(!bare && 'rounded-lg border border-border bg-card p-4 sm:p-6', className)}
      data-testid="nutrition-facts"
      data-servings={servings}
      {...props}
    >
      <Table className="text-sm">
        <TableCaption className="mb-3 mt-0 text-left caption-top">
          <span className="block font-display text-lg font-semibold text-foreground">{t(lang, 'nutrition.title')}</span>
          <span className="block text-muted-foreground">
            {scaled
              ? t(lang, 'nutrition.scaledValues', { servings })
              : t(lang, 'nutrition.perServing', { size: nutrition.servingSize })}
          </span>
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">{t(lang, 'nutrition.nutrient')}</TableHead>
            <TableHead scope="col" className="text-right">
              {t(lang, 'nutrition.amount')}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {NUTRITION_ROWS.map((row) => (
            <TableRow key={row.key} data-nutrient={row.key}>
              <TableHead scope="row" className="h-auto py-2 font-medium text-foreground">
                {t(lang, row.labelKey)}
              </TableHead>
              <TableCell className="py-2 text-right tabular-nums">
                {values[row.key]}
                <span className="ml-1 text-muted-foreground">{row.unit === 'kcal' ? t(lang, 'nutrition.kcal') : row.unit}</span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="mt-4 text-xs text-muted-foreground">{t(lang, 'nutrition.disclaimer')}</p>
    </div>
  );
}
