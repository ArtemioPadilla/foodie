import * as React from 'react';
import { useStore } from '@nanostores/react';
import {
  BarChart3Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  DropletIcon,
  PencilIcon,
  PlusIcon,
  TargetIcon,
  Trash2Icon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Meter } from '@/components/ui/meter';
import { Skeleton } from '@/components/ui/skeleton';
import { Toaster, toast } from '@/components/ui/toast';
import { localizedRoute, t, type Locale } from '@/i18n';
import { useCatalog } from '@/lib/catalog/use-catalog';
import { calculateGoalProgress } from '@/lib/domain/nutrition';
import {
  dailyTotals,
  dayMetrics,
  entriesByDate,
  groupEntriesByMeal,
  sumCalories,
  waterMl,
  withQuantity,
  type DayMetric,
} from '@/lib/domain/tracking';
import { addDaysToKey, todayKey } from '@/lib/format-date';
import { withBase } from '@/lib/href';
import { useHydrated } from '@/lib/use-hydrated';
import { TRACKING_MEAL_TYPES, type TrackingEntry, type TrackingMealType } from '@/schemas';
import { $goals } from '@/stores/goals';
import { $tracking, deleteEntry, duplicateEntry, updateEntry } from '@/stores/tracking';
import ErrorBoundary from './ErrorBoundary';
import QueryProvider from './QueryProvider';
import { DeleteEntryDialog, DuplicateEntryDialog, EditEntryDialog } from './Tracking/EntryDialogs';
import { entryAmount, entryDisplayName, formatAmount, formatDayKey, mealLabel, type TrackingCatalog } from './Tracking/labels';
import { QuickAddDialog } from './Tracking/QuickAddDialog';

/**
 * TrackingToday — the `/tracking/` island (roadmap Issue 031; port of legacy
 * `TrackingPage` + `QuickAddModal`).
 *
 * - State: `$tracking` (`trackingEntries`) and `$goals` (`nutritionGoals`) in
 *   localStorage (ADR 0002); the catalog through `useCatalog()` for localised
 *   names and the quick-add lists. Aggregation is the pure
 *   `lib/domain/tracking` selectors run for the chosen day.
 * - Day view: previous / next day, a date input and "Today" (`?date=` keeps
 *   the day in the URL); totals for kcal, protein, carbs, fat, fiber, sugar
 *   and sodium, each against its goal with a `meter` (plus water); entries
 *   grouped by meal with their kcal.
 * - Entries: edit the amount (nutrition recomputed), copy to another day,
 *   delete after an `alert-dialog` confirmation.
 * - Every Dialog / AlertDialog / Tabs / Select and the `Toaster` live in this
 *   single root. Store-backed UI renders after hydration only (SSR has no
 *   `localStorage` or "today"): SSR and the first client render show a skeleton.
 */
export interface TrackingTodayProps {
  lang: Locale;
}

export default function TrackingToday(props: TrackingTodayProps) {
  return (
    <QueryProvider>
      <ErrorBoundary name="TrackingToday">
        <TrackingTodayView {...props} />
      </ErrorBoundary>
    </QueryProvider>
  );
}

export function TrackingTodayView({ lang }: TrackingTodayProps) {
  const hydrated = useHydrated();
  return (
    <div data-testid="tracking-today" data-status={hydrated ? 'ready' : 'loading'} data-hydrated={hydrated ? 'true' : undefined}>
      {hydrated ? <TrackingDay lang={lang} /> : <TrackingSkeleton lang={lang} />}
      <Toaster closeLabel={t(lang, 'common.close')} />
    </div>
  );
}

function TrackingSkeleton({ lang }: { lang: Locale }) {
  return (
    <div className="space-y-4" aria-busy="true">
      <p className="sr-only">{t(lang, 'tracking.loading')}</p>
      <Skeleton className="h-10 w-full max-w-xl" />
      <Skeleton className="h-48 w-full" />
      {TRACKING_MEAL_TYPES.map((m) => (
        <Skeleton key={m} className="h-24 w-full" />
      ))}
    </div>
  );
}

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/** `?date=YYYY-MM-DD` from the current URL, if valid. */
function dateFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const value = new URLSearchParams(window.location.search).get('date');
  return value && DATE_KEY.test(value) ? value : null;
}

/** Mirror the chosen day in the URL (today → no param) without a navigation. */
function writeDateToUrl(date: string, today: string) {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (date === today) url.searchParams.delete('date');
  else url.searchParams.set('date', date);
  if (url.href !== window.location.href) window.history.replaceState(window.history.state, '', url);
}

type DialogState =
  | { kind: 'none' }
  | { kind: 'quick-add'; meal: TrackingMealType }
  | { kind: 'edit' | 'duplicate' | 'delete'; entry: TrackingEntry };

function TrackingDay({ lang }: { lang: Locale }) {
  const catalogResult = useCatalog();
  const allEntries = useStore($tracking);
  const goals = useStore($goals);
  const today = todayKey();
  const [date, setDateState] = React.useState<string>(() => dateFromUrl() ?? today);
  const [dialog, setDialog] = React.useState<DialogState>({ kind: 'none' });
  const dateInputId = React.useId();

  const setDate = (next: string) => {
    if (!DATE_KEY.test(next)) return;
    setDateState(next);
    writeDateToUrl(next, todayKey());
  };

  const catalog: TrackingCatalog = catalogResult;
  const entries = React.useMemo(() => entriesByDate(allEntries, date), [allEntries, date]);
  const totals = React.useMemo(() => dailyTotals(entries), [entries]);
  const metrics = React.useMemo(() => dayMetrics(totals, goals), [totals, goals]);
  const water = React.useMemo(() => calculateGoalProgress(totals, goals, waterMl(entries)).water, [totals, goals, entries]);
  const groups = React.useMemo(() => groupEntriesByMeal(entries), [entries]);
  const nameOf = (entry: TrackingEntry) => entryDisplayName(entry, catalog, lang);

  const active = dialog.kind === 'edit' || dialog.kind === 'duplicate' || dialog.kind === 'delete' ? dialog.entry : null;
  const close = () => setDialog({ kind: 'none' });

  const saveQuantity = (quantity: number) => {
    if (!active) return;
    updateEntry(active.id, withQuantity(active, quantity, catalog));
    toast({ title: t(lang, 'tracking.entryUpdated') });
    close();
  };
  const duplicate = (target: string) => {
    if (!active) return;
    duplicateEntry(active.id, target);
    toast({ title: t(lang, 'tracking.entryDuplicated', { date: formatDayKey(target, lang, 'long') }) });
    close();
  };
  const remove = () => {
    if (!active) return;
    deleteEntry(active.id);
    toast({ title: t(lang, 'tracking.entryDeleted') });
    close();
  };

  const [calories, ...nutrients] = metrics as [DayMetric, ...DayMetric[]];

  return (
    <div className="space-y-8" data-testid="tracking-day" data-date={date} data-catalog={catalogResult.status}>
      <div className="flex flex-wrap items-end gap-3" role="group" aria-label={t(lang, 'tracking.dayNavigation')} data-testid="tracking-date-nav">
        <Button type="button" variant="outline" size="icon" onClick={() => setDate(addDaysToKey(date, -1))} aria-label={t(lang, 'tracking.previousDay')} data-testid="tracking-prev-day">
          <ChevronLeftIcon className="size-4" aria-hidden="true" />
        </Button>
        <div className="grid gap-1">
          <label htmlFor={dateInputId} className="sr-only">
            {t(lang, 'tracking.selectDate')}
          </label>
          <Input
            id={dateInputId}
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="w-44"
            data-testid="tracking-date"
          />
        </div>
        <Button type="button" variant="outline" size="icon" onClick={() => setDate(addDaysToKey(date, 1))} aria-label={t(lang, 'tracking.nextDay')} data-testid="tracking-next-day">
          <ChevronRightIcon className="size-4" aria-hidden="true" />
        </Button>
        <Button type="button" variant="secondary" onClick={() => setDate(todayKey())} aria-pressed={date === today} data-testid="tracking-today-button">
          {t(lang, 'tracking.today')}
        </Button>
        <Button type="button" className="sm:ml-auto" onClick={() => setDialog({ kind: 'quick-add', meal: 'breakfast' })} data-testid="tracking-quick-add">
          <PlusIcon className="size-4" aria-hidden="true" />
          {t(lang, 'tracking.quickAdd')}
        </Button>
      </div>

      <section aria-labelledby="tracking-summary-title" className="rounded-lg border border-border bg-card p-5 text-card-foreground shadow-sm sm:p-6" data-testid="tracking-summary">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="tracking-summary-title" className="font-display text-xl font-semibold tracking-tight text-foreground" data-testid="tracking-day-title">
            {formatDayKey(date, lang)}
          </h2>
          <div className="flex gap-2 text-sm">
            <a className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline" href={withBase(localizedRoute('/tracking/goals/', lang))}>
              <TargetIcon className="size-4" aria-hidden="true" />
              {t(lang, 'tracking.editGoals')}
            </a>
            <a className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline" href={withBase(localizedRoute('/tracking/progress/', lang))}>
              <BarChart3Icon className="size-4" aria-hidden="true" />
              {t(lang, 'tracking.viewProgress')}
            </a>
          </div>
        </div>
        <p className="sr-only">{t(lang, 'tracking.summaryTitle')}</p>

        <CaloriesMeter lang={lang} metric={calories} />

        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label={t(lang, 'tracking.summaryTitle')} data-testid="tracking-nutrients">
          {nutrients.map((metric) => (
            <NutrientMeter key={metric.key} lang={lang} metric={metric} />
          ))}
          {water ? (
            <NutrientMeter
              lang={lang}
              metric={{ key: 'water', unit: 'ml', consumed: water.consumed, goal: water.goal, percentage: water.percentage, remaining: water.remaining }}
              label={t(lang, 'goals.water')}
              icon={<DropletIcon className="size-3.5 text-sky-600 dark:text-sky-400" aria-hidden="true" />}
            />
          ) : null}
        </ul>
      </section>

      <section aria-labelledby="tracking-meals-title" className="space-y-4">
        <h2 id="tracking-meals-title" className="sr-only">
          {t(lang, 'tracking.mealsTitle')}
        </h2>
        {TRACKING_MEAL_TYPES.map((meal) => (
          <MealSection
            key={meal}
            lang={lang}
            meal={meal}
            entries={groups[meal]}
            nameOf={nameOf}
            onAdd={() => setDialog({ kind: 'quick-add', meal })}
            onEdit={(entry) => setDialog({ kind: 'edit', entry })}
            onDuplicate={(entry) => setDialog({ kind: 'duplicate', entry })}
            onDelete={(entry) => setDialog({ kind: 'delete', entry })}
          />
        ))}
      </section>

      <QuickAddDialog
        lang={lang}
        open={dialog.kind === 'quick-add'}
        onOpenChange={(open) => !open && close()}
        date={date}
        mealType={dialog.kind === 'quick-add' ? dialog.meal : 'breakfast'}
        recipes={catalogResult.recipes}
        ingredients={catalogResult.ingredients}
        beverages={catalogResult.beverages}
        ingredientCategories={catalogResult.categories.ingredientCategories}
        loading={catalogResult.status === 'loading'}
      />
      <EditEntryDialog lang={lang} entry={dialog.kind === 'edit' ? dialog.entry : null} name={active ? nameOf(active) : ''} onClose={close} onSave={saveQuantity} />
      <DuplicateEntryDialog
        lang={lang}
        entry={dialog.kind === 'duplicate' ? dialog.entry : null}
        name={active ? nameOf(active) : ''}
        defaultDate={date}
        onClose={close}
        onDuplicate={duplicate}
      />
      <DeleteEntryDialog lang={lang} entry={dialog.kind === 'delete' ? dialog.entry : null} name={active ? nameOf(active) : ''} onClose={close} onConfirm={remove} />
    </div>
  );
}

/** A `DayMetric` or the water line (not a `NutritionInfo` key). */
type MetricLike = Omit<DayMetric, 'key'> & { key: string };

function metricText(lang: Locale, metric: MetricLike): string {
  return metric.goal
    ? t(lang, 'tracking.ofGoal', { consumed: formatAmount(metric.consumed, lang), goal: formatAmount(metric.goal, lang), unit: metric.unit })
    : t(lang, 'tracking.noGoalSet', { consumed: formatAmount(metric.consumed, lang), unit: metric.unit });
}

function meterValueText(lang: Locale, metric: MetricLike): string {
  return metric.goal
    ? t(lang, 'tracking.meterValue', {
        consumed: formatAmount(metric.consumed, lang),
        goal: formatAmount(metric.goal, lang),
        unit: metric.unit,
        percentage: metric.percentage,
      })
    : metricText(lang, metric);
}

function overBy(metric: MetricLike): number {
  return metric.goal ? Math.max(0, Math.round(metric.consumed - metric.goal)) : 0;
}

function CaloriesMeter({ lang, metric }: { lang: Locale; metric: DayMetric }) {
  const over = overBy(metric);
  const label = t(lang, 'nutrition.calories');
  return (
    <div className="mt-4" data-testid="tracking-metric" data-metric="calories" data-percentage={metric.percentage} data-over={over > 0 ? 'true' : undefined}>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-sm text-muted-foreground" data-testid="tracking-calories-remaining">
          {over > 0
            ? t(lang, 'tracking.overAmount', { count: formatAmount(over, lang), unit: metric.unit })
            : t(lang, 'tracking.remainingAmount', { count: formatAmount(metric.remaining, lang), unit: metric.unit })}
        </p>
      </div>
      <p className="font-display text-3xl font-semibold tabular-nums text-foreground" data-testid="tracking-calories">
        {metricText(lang, metric)}
      </p>
      <Meter
        className="mt-3"
        indicatorClassName={over > 0 ? 'bg-destructive' : undefined}
        value={Math.min(metric.percentage, 100)}
        min={0}
        max={100}
        showValue={false}
        aria-label={label}
        getAriaValueText={() => meterValueText(lang, metric)}
      />
    </div>
  );
}

function NutrientMeter({ lang, metric, label, icon }: { lang: Locale; metric: MetricLike; label?: string; icon?: React.ReactNode }) {
  const name = label ?? t(lang, `nutrition.${metric.key}`);
  const over = overBy(metric);
  return (
    <li data-testid="tracking-metric" data-metric={metric.key} data-percentage={metric.percentage} data-over={over > 0 ? 'true' : undefined}>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
        <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
          {icon}
          {name}
        </span>
        <span className="tabular-nums text-muted-foreground" data-testid="tracking-metric-value">
          {metricText(lang, metric)}
        </span>
      </div>
      <Meter
        value={Math.min(metric.percentage, 100)}
        min={0}
        max={100}
        showValue={false}
        aria-label={name}
        indicatorClassName={over > 0 ? 'bg-destructive' : undefined}
        getAriaValueText={() => meterValueText(lang, metric)}
      />
    </li>
  );
}

function MealSection({
  lang,
  meal,
  entries,
  nameOf,
  onAdd,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  lang: Locale;
  meal: TrackingMealType;
  entries: TrackingEntry[];
  nameOf: (entry: TrackingEntry) => string;
  onAdd: () => void;
  onEdit: (entry: TrackingEntry) => void;
  onDuplicate: (entry: TrackingEntry) => void;
  onDelete: (entry: TrackingEntry) => void;
}) {
  const titleId = `tracking-meal-${meal}`;
  const label = mealLabel(lang, meal);
  return (
    <section
      aria-labelledby={titleId}
      className="rounded-lg border border-border bg-card p-5 text-card-foreground shadow-sm"
      data-testid="tracking-meal"
      data-meal={meal}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 id={titleId} className="text-lg font-semibold text-foreground">
            {label}
          </h3>
          <p className="text-sm tabular-nums text-muted-foreground" data-testid="tracking-meal-calories">
            {t(lang, 'tracking.mealCalories', { count: formatAmount(sumCalories(entries), lang) })}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onAdd} aria-label={t(lang, 'tracking.addToMeal', { meal: label })} data-testid="tracking-meal-add">
          <PlusIcon className="size-4" aria-hidden="true" />
          {t(lang, 'common.add')}
        </Button>
      </div>
      {entries.length === 0 ? (
        <p className="text-sm italic text-muted-foreground" data-testid="tracking-meal-empty">
          {t(lang, 'tracking.noEntries')}
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-md bg-muted/40" aria-label={label}>
          {entries.map((entry) => {
            const name = nameOf(entry);
            return (
              <li key={entry.id} className="flex items-center gap-3 p-3" data-testid="tracking-entry" data-entry-id={entry.id}>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground" data-testid="tracking-entry-name">
                    {name}
                  </p>
                  <p className="text-sm tabular-nums text-muted-foreground" data-testid="tracking-entry-amount">
                    {entryAmount(entry, lang)} · {formatAmount(entry.nutrition.calories, lang)} {t(lang, 'nutrition.kcal')}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1" role="group" aria-label={t(lang, 'tracking.entryActionsLabel', { name })}>
                  <Button type="button" variant="ghost" size="icon" onClick={() => onEdit(entry)} aria-label={t(lang, 'tracking.editEntryLabel', { name })} data-testid="tracking-entry-edit">
                    <PencilIcon className="size-4" aria-hidden="true" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" onClick={() => onDuplicate(entry)} aria-label={t(lang, 'tracking.duplicateEntryLabel', { name })} data-testid="tracking-entry-duplicate">
                    <CopyIcon className="size-4" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => onDelete(entry)}
                    aria-label={t(lang, 'tracking.deleteEntryLabel', { name })}
                    data-testid="tracking-entry-delete"
                  >
                    <Trash2Icon className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
