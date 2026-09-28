import * as React from 'react';
import { MinusIcon, PlusIcon, RotateCcwIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { t, type Locale } from '@/i18n';
import { cn } from '@/lib/utils';

export interface ServingsAdjusterProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  servings: number;
  /** The recipe's own yield; "Reset" returns to it and the ×factor is relative to it. */
  originalServings: number;
  onChange: (servings: number) => void;
  lang?: Locale;
  min?: number;
  max?: number;
}

/**
 * ServingsAdjuster — the −/＋ stepper of the recipe detail (roadmap Issue 018,
 * port of legacy `RecipeScaler`). The current value is an `output` bound to
 * the stepper group, the scale factor appears once the yield differs from the
 * recipe's own, and "Reset" restores it.
 */
export function ServingsAdjuster({
  servings,
  originalServings,
  onChange,
  lang = 'en',
  min = 1,
  max = 20,
  className,
  ...props
}: ServingsAdjusterProps) {
  const labelId = React.useId();
  const outputId = React.useId();
  const modified = servings !== originalServings;
  const factor = servings / originalServings;

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      data-testid="servings-adjuster"
      className={cn('flex flex-wrap items-center gap-3', className)}
      {...props}
    >
      <span id={labelId} className="text-sm font-medium text-foreground">
        {t(lang, 'recipe.servingsLabel')}
      </span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9"
          onClick={() => servings > min && onChange(servings - 1)}
          disabled={servings <= min}
          aria-label={t(lang, 'recipe.decreaseServings')}
          aria-controls={outputId}
        >
          <MinusIcon className="size-4" aria-hidden="true" />
        </Button>
        <output
          id={outputId}
          htmlFor={labelId}
          className="inline-flex h-9 min-w-12 items-center justify-center rounded-md bg-muted px-3 text-lg font-semibold tabular-nums text-foreground"
          data-testid="servings-value"
        >
          {servings}
        </output>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9"
          onClick={() => servings < max && onChange(servings + 1)}
          disabled={servings >= max}
          aria-label={t(lang, 'recipe.increaseServings')}
          aria-controls={outputId}
        >
          <PlusIcon className="size-4" aria-hidden="true" />
        </Button>
      </div>
      {modified && (
        <>
          <span className="text-sm font-medium text-primary tabular-nums" data-testid="servings-factor">
            {t(lang, 'recipe.scaleFactor', { factor: Number(factor.toFixed(2)).toString() })}
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(originalServings)}>
            <RotateCcwIcon className="size-4" aria-hidden="true" />
            {t(lang, 'recipe.resetServings')}
          </Button>
        </>
      )}
    </div>
  );
}
