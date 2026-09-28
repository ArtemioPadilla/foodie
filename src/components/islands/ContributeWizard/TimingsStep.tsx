import * as React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { TagInput } from '@/components/ui/tag-input';
import { t, type Locale } from '@/i18n';
import type { RecipeSubmission } from '@/schemas';
import { NumberInput, useFormatMessage } from './fields';

/** Step 2 — prep / cook / rest minutes, servings and equipment. */
export function TimingsStep({ lang }: { lang: Locale }) {
  const { control } = useFormContext<RecipeSubmission>();
  const format = useFormatMessage(lang);
  const [prep, cook, rest] = useWatch({ control, name: ['prepTime', 'cookTime', 'restTime'] });
  const total = (prep || 0) + (cook || 0) + (rest || 0);
  const minutes = t(lang, 'contribute.minutes');

  return (
    <div className="grid gap-6" data-testid="contribute-step-timings">
      <p className="text-sm text-muted-foreground">{t(lang, 'contribute.timingsInfoDescription')}</p>
      <div className="grid gap-4 md:grid-cols-3">
        <NumberInput
          lang={lang}
          name="prepTime"
          min={1}
          step={1}
          label={`${t(lang, 'contribute.prepTime')} (${minutes}) *`}
          testId="contribute-prep-time"
        />
        <NumberInput
          lang={lang}
          name="cookTime"
          min={1}
          step={1}
          label={`${t(lang, 'contribute.cookTime')} (${minutes}) *`}
          testId="contribute-cook-time"
        />
        <NumberInput
          lang={lang}
          name="restTime"
          optional
          step={1}
          label={`${t(lang, 'contribute.restTime')} (${minutes})`}
          description={t(lang, 'contribute.restTimeHint')}
          testId="contribute-rest-time"
        />
      </div>
      <p className="text-sm text-foreground" data-testid="contribute-total-time">
        {t(lang, 'contribute.totalTime')}: <span className="font-semibold tabular-nums">{total}</span> {minutes}
      </p>
      <NumberInput
        lang={lang}
        name="servings"
        min={1}
        step={1}
        className="max-w-xs"
        label={`${t(lang, 'contribute.servings')} *`}
        description={t(lang, 'contribute.servingsHint')}
        testId="contribute-servings"
      />
      <FormField
        control={control}
        name="equipment"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t(lang, 'contribute.equipment')}</FormLabel>
            <FormControl>
              <TagInput
                value={field.value ?? []}
                onValueChange={field.onChange}
                placeholder={t(lang, 'contribute.equipmentPlaceholder')}
                inputLabel={t(lang, 'contribute.addEquipment')}
                removeLabel={(item) => t(lang, 'contribute.removeEquipment', { item })}
                data-testid="contribute-equipment"
              />
            </FormControl>
            <FormDescription>{t(lang, 'contribute.equipmentHint')}</FormDescription>
            <FormMessage format={format} />
          </FormItem>
        )}
      />
      <p className="text-sm text-muted-foreground">{t(lang, 'contribute.timingsTip')}</p>
    </div>
  );
}
