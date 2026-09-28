import * as React from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, RotateCcwIcon, Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Combobox } from '@/components/ui/combobox';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { t, type Locale } from '@/i18n';
import type { CatalogStatus } from '@/lib/catalog/use-catalog';
import { CONTRIBUTE_UNITS, ingredientOptions } from '@/lib/domain/contribute';
import { unitLabel } from '@/lib/domain/recipe-detail';
import type { Ingredient, RecipeSubmission } from '@/schemas';
import { NumberInput, SelectField, TextField, useFormatMessage } from './fields';

export interface IngredientsStepProps {
  lang: Locale;
  ingredients: ReadonlyArray<Ingredient>;
  catalogStatus: CatalogStatus;
  onRetryCatalog: () => void;
}

/**
 * Step 3 — ingredient lines: a catalog `Combobox` (the id is what the recipe
 * stores), quantity, unit, optional preparation and "optional" flag; lines
 * can be reordered and removed.
 */
export function IngredientsStep({ lang, ingredients, catalogStatus, onRetryCatalog }: IngredientsStepProps) {
  const { control } = useFormContext<RecipeSubmission>();
  const format = useFormatMessage(lang);
  const { fields, append, remove, move } = useFieldArray({ control, name: 'ingredients' });

  const options = React.useMemo(() => ingredientOptions(ingredients, lang), [ingredients, lang]);
  const labelById = React.useMemo(() => new Map(options.map((o) => [o.value, o.label])), [options]);
  const idByLabel = React.useMemo(() => new Map(options.map((o) => [o.label, o.value])), [options]);
  const labels = React.useMemo(() => options.map((o) => o.label), [options]);
  const units = React.useMemo(
    () => CONTRIBUTE_UNITS.map((unit) => ({ value: unit, label: unitLabel(lang, unit) })),
    [lang],
  );
  const catalogReady = catalogStatus === 'success' || (catalogStatus === 'offline' && ingredients.length > 0);

  return (
    <div className="grid gap-6" data-testid="contribute-step-ingredients" data-catalog={catalogStatus}>
      <p className="text-sm text-muted-foreground">{t(lang, 'contribute.ingredientsDescription')}</p>

      {catalogStatus === 'loading' && (
        <p className="text-sm text-muted-foreground" role="status">
          {t(lang, 'contribute.catalogLoading')}
        </p>
      )}
      {!catalogReady && catalogStatus !== 'loading' && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-destructive/40 p-3 text-sm" role="alert">
          <span className="text-destructive">{t(lang, 'contribute.catalogError')}</span>
          <Button type="button" size="sm" variant="outline" onClick={onRetryCatalog}>
            <RotateCcwIcon className="size-4" aria-hidden="true" />
            {t(lang, 'common.tryAgain')}
          </Button>
        </div>
      )}

      {fields.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground" data-testid="contribute-no-ingredients">
          {t(lang, 'contribute.noIngredientsYet')}
        </p>
      ) : (
        <ol className="grid gap-4" data-testid="contribute-ingredient-list">
          {fields.map((row, index) => {
            const number = index + 1;
            return (
              <li
                key={row.id}
                className="grid gap-4 rounded-lg border border-border bg-card p-4"
                data-testid="contribute-ingredient-row"
                aria-label={t(lang, 'contribute.ingredientNumber', { number })}
              >
                <div className="grid gap-4 md:grid-cols-[2fr_1fr_1fr]">
                  <FormField
                    control={control}
                    name={`ingredients.${index}.ingredientId`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{`${t(lang, 'contribute.ingredientLabel')} *`}</FormLabel>
                        <FormControl>
                          <Combobox
                            items={labels}
                            value={field.value ? (labelById.get(field.value) ?? null) : null}
                            onValueChange={(label) => {
                              field.onChange(label ? (idByLabel.get(label) ?? '') : '');
                              field.onBlur();
                            }}
                            placeholder={t(lang, 'contribute.searchIngredients')}
                            emptyMessage={t(lang, 'contribute.noIngredientMatch')}
                            disabled={!catalogReady}
                            data-testid="contribute-ingredient-picker"
                          />
                        </FormControl>
                        <FormMessage format={format} />
                      </FormItem>
                    )}
                  />
                  <NumberInput
                    lang={lang}
                    name={`ingredients.${index}.quantity`}
                    label={`${t(lang, 'contribute.quantity')} *`}
                    testId="contribute-ingredient-quantity"
                  />
                  <SelectField
                    lang={lang}
                    name={`ingredients.${index}.unit`}
                    label={`${t(lang, 'contribute.unit')} *`}
                    placeholder={t(lang, 'contribute.selectUnit')}
                    options={units}
                    testId="contribute-ingredient-unit"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-[2fr_1fr] md:items-end">
                  <TextField
                    lang={lang}
                    name={`ingredients.${index}.preparation`}
                    label={t(lang, 'contribute.preparation')}
                    placeholder={t(lang, 'contribute.preparationPlaceholder')}
                    testId="contribute-ingredient-preparation"
                  />
                  <FormField
                    control={control}
                    name={`ingredients.${index}.optional`}
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0 pb-2">
                        <FormControl>
                          <Checkbox
                            checked={Boolean(field.value)}
                            onCheckedChange={(checked) => field.onChange(checked === true)}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">{t(lang, 'contribute.optionalIngredient')}</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => move(index, index - 1)}
                    disabled={index === 0}
                    aria-label={`${t(lang, 'contribute.moveIngredientUp')} — ${number}`}
                  >
                    <ArrowUpIcon aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => move(index, index + 1)}
                    disabled={index === fields.length - 1}
                    aria-label={`${t(lang, 'contribute.moveIngredientDown')} — ${number}`}
                  >
                    <ArrowDownIcon aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => remove(index)}
                    aria-label={`${t(lang, 'contribute.removeIngredient')} — ${number}`}
                    data-testid="contribute-remove-ingredient"
                  >
                    <Trash2Icon aria-hidden="true" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div>
        <Button
          type="button"
          variant="outline"
          onClick={() => append({ ingredientId: '', quantity: 1, unit: '', preparation: '', optional: false })}
          data-testid="contribute-add-ingredient"
        >
          <PlusIcon aria-hidden="true" />
          {fields.length === 0 ? t(lang, 'contribute.addFirstIngredient') : t(lang, 'contribute.addIngredient')}
        </Button>
      </div>

      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground" aria-label={t(lang, 'contribute.ingredientsTip')}>
        <li>{t(lang, 'contribute.ingredientsTip1')}</li>
        <li>{t(lang, 'contribute.ingredientsTip2')}</li>
        <li>{t(lang, 'contribute.ingredientsTip3')}</li>
      </ul>
    </div>
  );
}
