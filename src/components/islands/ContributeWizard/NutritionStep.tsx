import * as React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { CalculatorIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { t, type Locale } from '@/i18n';
import { estimateSubmissionNutrition, type SubmissionNutrition } from '@/lib/domain/contribute';
import type { Ingredient, RecipeSubmission } from '@/schemas';
import { NumberInput } from './fields';

const FIELDS: ReadonlyArray<{ name: keyof SubmissionNutrition; label: string; unit: string }> = [
  { name: 'calories', label: 'nutrition.calories', unit: 'nutrition.kcal' },
  { name: 'protein', label: 'nutrition.protein', unit: 'units.g' },
  { name: 'carbohydrates', label: 'nutrition.carbohydrates', unit: 'units.g' },
  { name: 'fat', label: 'nutrition.fat', unit: 'units.g' },
  { name: 'fiber', label: 'nutrition.fiber', unit: 'units.g' },
  { name: 'sugar', label: 'nutrition.sugar', unit: 'units.g' },
  { name: 'sodium', label: 'nutrition.sodium', unit: 'mg' },
];

/**
 * Step 5 — optional nutrition per serving. "Estimate from ingredients" fills
 * every field from `lib/domain/nutrition` (category profile × quantity ÷
 * servings); the contributor can then edit any value.
 */
export function NutritionStep({ lang, ingredients }: { lang: Locale; ingredients: ReadonlyArray<Ingredient> }) {
  const { control, setValue } = useFormContext<RecipeSubmission>();
  const [lines, servings] = useWatch({ control, name: ['ingredients', 'servings'] });
  const estimate = React.useMemo(
    () => estimateSubmissionNutrition(lines ?? [], ingredients, servings ?? 1),
    [lines, ingredients, servings],
  );
  const [estimated, setEstimated] = React.useState(false);

  const applyEstimate = () => {
    if (!estimate) return;
    for (const { name } of FIELDS) {
      setValue(name, estimate[name], { shouldDirty: true, shouldValidate: true });
    }
    setEstimated(true);
  };

  return (
    <div className="grid gap-6" data-testid="contribute-step-nutrition">
      <p className="text-sm text-muted-foreground">{t(lang, 'contribute.nutritionInfoDescription')}</p>

      <div className="grid gap-2 rounded-lg border border-border bg-muted/40 p-4">
        <div>
          <Button
            type="button"
            variant="outline"
            onClick={applyEstimate}
            disabled={!estimate}
            data-testid="contribute-estimate-nutrition"
          >
            <CalculatorIcon aria-hidden="true" />
            {t(lang, 'contribute.estimateNutrition')}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {t(lang, 'contribute.estimateNutritionHint', { servings: servings || 1 })}
        </p>
        {estimated && (
          <p className="text-sm font-medium text-primary" role="status" data-testid="contribute-nutrition-estimated">
            {t(lang, 'contribute.nutritionEstimated')}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FIELDS.map((field) => {
          const unit = field.unit.includes('.') ? t(lang, field.unit) : field.unit;
          return (
            <NumberInput
              key={field.name}
              lang={lang}
              name={field.name}
              optional
              label={`${t(lang, field.label)} (${unit})`}
              testId={`contribute-nutrition-${field.name}`}
            />
          );
        })}
      </div>

      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground" aria-label={t(lang, 'contribute.nutritionTip')}>
        <li>{t(lang, 'contribute.nutritionTip1')}</li>
        <li>{t(lang, 'contribute.nutritionTip3')}</li>
      </ul>
    </div>
  );
}
