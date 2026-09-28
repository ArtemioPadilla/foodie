import * as React from 'react';
import { useStore } from '@nanostores/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch, type Control } from 'react-hook-form';
import { ArrowLeftIcon, RotateCcwIcon, SaveIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DonutChart } from '@/components/ui/charts/donut-chart';
import { chartColor } from '@/components/ui/charts/chart-colors';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { NumberField } from '@/components/ui/number-field';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { Toaster, toast } from '@/components/ui/toast';
import { localizedRoute, t, type Locale } from '@/i18n';
import {
  GOAL_PRESETS,
  GOAL_PRESET_VALUES,
  macroCalories,
  macroSplit,
  toGoalsFormValues,
  type GoalPreset,
} from '@/lib/domain/goals';
import { withBase } from '@/lib/href';
import { useHydrated } from '@/lib/use-hydrated';
import {
  DEFAULT_GOALS,
  GOAL_FIELDS,
  GOAL_RANGES,
  createNutritionGoalsFormSchema,
  type GoalField,
  type NutritionGoalsFormValues,
} from '@/schemas';
import { $goals, resetGoalsToDefaults, setGoals } from '@/stores/goals';
import ErrorBoundary from './ErrorBoundary';
import { BCP47, formatAmount } from './Tracking/labels';

/**
 * GoalsForm — the `/tracking/goals/` island (roadmap Issue 032; port of
 * legacy `GoalsPage`).
 *
 * - State: `$goals` (`localStorage['nutritionGoals']`, ADR 0002). The form is
 *   react-hook-form + `createNutritionGoalsFormSchema` (zod, localised range
 *   messages); nothing is persisted until "Save Goals".
 * - One `number-field` + `slider` pair per goal (kcal, protein, carbs, fat,
 *   fiber, sugar, sodium, water), inline errors through `FormMessage`.
 * - Presets (maintenance / deficit / surplus) fill the form; "Reset to
 *   Defaults" restores and saves the legacy defaults. Both saves announce
 *   themselves with a `toast`.
 * - Live macro split preview with the kit `DonutChart` plus a text legend.
 * - Store-backed UI renders after hydration only (SSR has no localStorage).
 */
export interface GoalsFormProps {
  lang: Locale;
}

export default function GoalsForm(props: GoalsFormProps) {
  return (
    <ErrorBoundary name="GoalsForm">
      <GoalsFormView {...props} />
    </ErrorBoundary>
  );
}

export function GoalsFormView({ lang }: GoalsFormProps) {
  const hydrated = useHydrated();
  return (
    <div data-testid="goals-form" data-status={hydrated ? 'ready' : 'loading'} data-hydrated={hydrated ? 'true' : undefined}>
      {hydrated ? <GoalsEditor lang={lang} /> : <GoalsSkeleton lang={lang} />}
      <Toaster closeLabel={t(lang, 'common.close')} />
    </div>
  );
}

function GoalsSkeleton({ lang }: { lang: Locale }) {
  return (
    <div className="space-y-4" aria-busy="true">
      <p className="sr-only">{t(lang, 'goals.loading')}</p>
      <Skeleton className="h-20 w-full" />
      {GOAL_FIELDS.map((f) => (
        <Skeleton key={f} className="h-24 w-full" />
      ))}
    </div>
  );
}

const PRESET_LABEL: Record<GoalPreset, string> = {
  maintenance: 'goals.presetMaintenance',
  deficit: 'goals.presetDeficit',
  surplus: 'goals.presetSurplus',
};
const PRESET_HINT: Record<GoalPreset, string> = {
  maintenance: 'goals.presetMaintenanceHint',
  deficit: 'goals.presetDeficitHint',
  surplus: 'goals.presetSurplusHint',
};

function GoalsEditor({ lang }: { lang: Locale }) {
  const goals = useStore($goals);
  const schema = React.useMemo(
    () =>
      createNutritionGoalsFormSchema((_field, { min, max, unit }) =>
        t(lang, 'goals.rangeError', { min: formatAmount(min, lang), max: formatAmount(max, lang), unit }),
      ),
    [lang],
  );
  const form = useForm<NutritionGoalsFormValues>({
    resolver: zodResolver(schema),
    defaultValues: toGoalsFormValues(goals),
    mode: 'onTouched',
  });
  const { isDirty, errors, submitCount } = form.formState;
  const [status, setStatus] = React.useState('');

  // Goals changed elsewhere (another tab, the reset button): follow them
  // unless the user is in the middle of editing.
  React.useEffect(() => {
    if (!form.formState.isDirty) form.reset(toGoalsFormValues(goals));
  }, [goals, form]);

  const onSubmit = (values: NutritionGoalsFormValues) => {
    setGoals(values);
    form.reset(values);
    setStatus('');
    toast({ title: t(lang, 'goals.goalsSaved') });
  };

  const onReset = () => {
    resetGoalsToDefaults();
    form.reset(toGoalsFormValues(DEFAULT_GOALS));
    setStatus('');
    toast({ title: t(lang, 'goals.goalsReset') });
  };

  const applyPreset = (preset: GoalPreset) => {
    const values = GOAL_PRESET_VALUES[preset];
    for (const field of GOAL_FIELDS) {
      form.setValue(field, values[field], { shouldDirty: true, shouldValidate: true });
    }
    setStatus(t(lang, 'goals.presetApplied', { preset: t(lang, PRESET_LABEL[preset]) }));
  };

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]" data-testid="goals-editor">
      <Form {...form}>
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" aria-labelledby="goals-fields-title">
          <section aria-labelledby="goals-presets-title" className="rounded-lg border border-border bg-card p-4">
            <h2 id="goals-presets-title" className="font-display text-lg font-semibold text-foreground">
              {t(lang, 'goals.presetsTitle')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t(lang, 'goals.presetsDescription')}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {GOAL_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant="outline"
                  className="h-auto flex-col items-start gap-0.5 whitespace-normal py-2 text-left"
                  data-preset={preset}
                  onClick={() => applyPreset(preset)}
                >
                  <span className="font-semibold">{t(lang, PRESET_LABEL[preset])}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {t(lang, PRESET_HINT[preset], { calories: formatAmount(GOAL_PRESET_VALUES[preset].calories, lang) })}
                  </span>
                </Button>
              ))}
            </div>
          </section>

          <section aria-labelledby="goals-fields-title" className="space-y-3">
            <h2 id="goals-fields-title" className="font-display text-lg font-semibold text-foreground">
              {t(lang, 'goals.fieldsTitle')}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {GOAL_FIELDS.map((name) => (
                <GoalInput key={name} name={name} control={form.control} lang={lang} />
              ))}
            </div>
          </section>

          <div className="space-y-2">
            <p role="status" aria-live="polite" className="min-h-5 text-sm text-muted-foreground" data-testid="goals-status">
              {hasErrors && submitCount > 0 ? t(lang, 'goals.fixErrors') : status || (isDirty ? t(lang, 'goals.unsavedChanges') : '')}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="button" variant="outline" className="flex-1" onClick={onReset}>
                <RotateCcwIcon aria-hidden="true" />
                {t(lang, 'goals.resetDefaults')}
              </Button>
              <Button type="submit" className="flex-1">
                <SaveIcon aria-hidden="true" />
                {t(lang, 'goals.saveGoals')}
              </Button>
            </div>
          </div>
        </form>
      </Form>

      <aside className="space-y-4">
        <MacroPreview control={form.control} lang={lang} />
        <a
          className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
          href={withBase(localizedRoute('/tracking/', lang))}
        >
          <ArrowLeftIcon className="size-4" aria-hidden="true" />
          {t(lang, 'goals.backToDiary')}
        </a>
      </aside>
    </div>
  );
}

function GoalInput({ name, control, lang }: { name: GoalField; control: Control<NutritionGoalsFormValues>; lang: Locale }) {
  const range = GOAL_RANGES[name];
  const label = t(lang, `goals.${name}`);
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const value = typeof field.value === 'number' && Number.isFinite(field.value) ? field.value : null;
        return (
          <FormItem className="rounded-lg border border-border bg-card p-4" data-goal={name}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <FormLabel className="text-sm font-medium">{label}</FormLabel>
              <div className="flex items-center gap-2">
                <FormControl>
                  <NumberField
                    value={value}
                    onValueChange={(next) => field.onChange(next ?? null)}
                    onBlur={field.onBlur}
                    min={0}
                    step={range.step}
                    format={{ maximumFractionDigits: 0 }}
                    locale={BCP47[lang]}
                  />
                </FormControl>
                <span className="w-9 text-sm text-muted-foreground">{range.unit}</span>
              </div>
            </div>
            <Slider
              value={Math.min(range.max, Math.max(range.min, value ?? range.min))}
              min={range.min}
              max={range.max}
              step={range.step}
              thumbLabel={t(lang, 'goals.sliderLabel', { name: label, unit: range.unit })}
              onValueChange={(next) => field.onChange(Array.isArray(next) ? next[0] : next)}
              onValueCommitted={() => field.onBlur()}
            />
            <FormDescription className="text-xs">
              {t(lang, 'goals.rangeHint', { min: formatAmount(range.min, lang), max: formatAmount(range.max, lang), unit: range.unit })}
            </FormDescription>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

function MacroPreview({ control, lang }: { control: Control<NutritionGoalsFormValues>; lang: Locale }) {
  const [protein, carbs, fat, calories] = useWatch({ control, name: ['protein', 'carbs', 'fat', 'calories'] });
  const split = macroSplit({ protein, carbs, fat });
  const total = macroCalories({ protein, carbs, fat });
  const names = split.map((m) => t(lang, `goals.${m.key}`));
  const summary = split.map((m, i) => `${names[i]} ${m.percentage}%`).join(', ');
  const goal = typeof calories === 'number' && Number.isFinite(calories) ? calories : 0;
  const diff = Math.round(total - goal);
  return (
    <section aria-labelledby="goals-macros-title" className="rounded-lg border border-border bg-card p-4" data-testid="goals-macros">
      <h2 id="goals-macros-title" className="font-display text-lg font-semibold text-foreground">
        {t(lang, 'goals.macrosTitle')}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{t(lang, 'goals.macrosDescription')}</p>
      {total === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{t(lang, 'goals.macrosEmpty')}</p>
      ) : (
        <>
          <DonutChart
            className="mt-2"
            height={220}
            ariaLabel={t(lang, 'goals.macrosChartLabel', { summary })}
            data={split.map((m, i) => ({ name: names[i]!, value: m.kcal }))}
          />
          <ul className="mt-2 space-y-1 text-sm" data-testid="goals-macro-legend">
            {split.map((m, i) => (
              <li key={m.key} className="flex items-center justify-between gap-2" data-macro={m.key}>
                <span className="flex items-center gap-2">
                  <span aria-hidden="true" className="inline-block size-2.5 rounded-full" style={{ backgroundColor: chartColor(i) }} />
                  {names[i]}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {t(lang, 'goals.macroShare', {
                    grams: formatAmount(m.grams, lang),
                    kcal: formatAmount(m.kcal, lang),
                    percentage: m.percentage,
                  })}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-muted-foreground">
            {t(lang, 'goals.macrosTotal', { kcal: formatAmount(total, lang) })}
            {goal > 0 && Math.abs(diff) > goal * 0.1 && (
              <> {t(lang, 'goals.macrosMismatch', { diff: formatAmount(Math.abs(diff), lang), goal: formatAmount(goal, lang) })}</>
            )}
          </p>
        </>
      )}
    </section>
  );
}
