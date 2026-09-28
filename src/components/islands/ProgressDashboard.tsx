import * as React from 'react';
import { useStore } from '@nanostores/react';
import { AwardIcon, FlameIcon, TargetIcon, TrendingUpIcon, UtensilsIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart, LineChart, chartColor } from '@/components/ui/charts';
import { Sparkline } from '@/components/ui/charts/sparkline';
import { EmptyState } from '@/components/ui/empty-state';
import { KpiCard } from '@/components/ui/kpi-card';
import { Meter } from '@/components/ui/meter';
import { Skeleton } from '@/components/ui/skeleton';
import { getTranslated, localizedRoute, t, type Locale } from '@/i18n';
import { useCatalog } from '@/lib/catalog/use-catalog';
import {
  PROGRESS_MACROS,
  PROGRESS_VIEWS,
  TREND_WINDOW,
  calculateStreak,
  progressDays,
  progressStats,
  progressSummary,
  type ProgressDay,
  type ProgressMacro,
  type ProgressView,
} from '@/lib/domain/tracking';
import { formatDate, parseDateKey, todayKey } from '@/lib/format-date';
import { withBase } from '@/lib/href';
import { useHydrated } from '@/lib/use-hydrated';
import type { NutritionGoals } from '@/schemas';
import { $goals } from '@/stores/goals';
import { $tracking } from '@/stores/tracking';
import ErrorBoundary from './ErrorBoundary';
import QueryProvider from './QueryProvider';
import { BCP47, formatAmount, formatDayKey } from './Tracking/labels';

/**
 * ProgressDashboard — the `/tracking/progress/` island (roadmap Issue 033;
 * port of legacy `ProgressPage`, which was text only).
 *
 * - State: `$tracking` + `$goals` (localStorage, ADR 0002); aggregation is
 *   the pure `lib/domain/tracking` selectors (`progressSummary` →
 *   `getWeeklySummary` / `getMonthlySummary`, `progressDays`,
 *   `progressStats`, `calculateStreak`). The catalog only names the most
 *   logged recipe.
 * - Week / month selector (`aria-pressed` buttons), KPI cards (average kcal,
 *   streak, goals met, most logged recipe), the kit Recharts wrappers (bars of
 *   kcal per day, trend line vs goal, a sparkline per macro) with the kit
 *   palette (`chart-colors`) and an `sr-only` data table for every chart, and
 *   the legacy daily breakdown with a `meter` per day.
 * - Hydrated with `client:visible`; SSR and the first client render show a
 *   skeleton (no localStorage or "today" on the server).
 */
export interface ProgressDashboardProps {
  lang: Locale;
}

export default function ProgressDashboard(props: ProgressDashboardProps) {
  return (
    <QueryProvider>
      <ErrorBoundary name="ProgressDashboard">
        <ProgressDashboardView {...props} />
      </ErrorBoundary>
    </QueryProvider>
  );
}

export function ProgressDashboardView({ lang }: ProgressDashboardProps) {
  const hydrated = useHydrated();
  return (
    <div data-testid="progress-dashboard" data-status={hydrated ? 'ready' : 'loading'} data-hydrated={hydrated ? 'true' : undefined}>
      {hydrated ? <Progress lang={lang} /> : <ProgressSkeleton lang={lang} />}
    </div>
  );
}

function ProgressSkeleton({ lang }: { lang: Locale }) {
  return (
    <div className="space-y-4" aria-busy="true">
      <p className="sr-only">{t(lang, 'progress.loading')}</p>
      <Skeleton className="h-10 w-48" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

const VIEW_LABEL: Record<ProgressView, string> = { week: 'tracking.week', month: 'tracking.month' };

/** Axis label: "Mon 28" in the week view, "28" in the month view. */
function axisLabel(date: string, view: ProgressView, lang: Locale): string {
  const opts: Intl.DateTimeFormatOptions = view === 'week' ? { weekday: 'short', day: 'numeric' } : { day: 'numeric' };
  return new Intl.DateTimeFormat(BCP47[lang], opts).format(parseDateKey(date));
}

/** Row header of the data tables / breakdown: "Monday, September 28". */
function dayLabel(date: string, lang: Locale): string {
  return formatDate(parseDateKey(date), lang, { weekday: 'long', month: 'long', day: 'numeric' });
}

function Progress({ lang }: { lang: Locale }) {
  const entries = useStore($tracking);
  const goals = useStore($goals);
  const catalog = useCatalog();
  const [view, setView] = React.useState<ProgressView>('week');
  const today = todayKey();

  const summary = React.useMemo(() => progressSummary(entries, goals, view, today), [entries, goals, view, today]);
  const days = React.useMemo(() => progressDays(summary, TREND_WINDOW[view]), [summary, view]);
  const stats = React.useMemo(() => progressStats(summary), [summary]);
  const streak = React.useMemo(() => calculateStreak(entries, goals, today), [entries, goals, today]);
  const period = t(lang, 'progress.periodRange', {
    start: formatDayKey(summary.startDate, lang, 'long'),
    end: formatDayKey(summary.endDate, lang, 'long'),
  });

  const mostLoggedRecipe = stats.mostLogged && catalog.recipes.find((r) => r.id === stats.mostLogged?.recipeId);
  const mostLoggedName = stats.mostLogged
    ? mostLoggedRecipe
      ? getTranslated(mostLoggedRecipe.name, lang)
      : t(lang, 'tracking.unknownRecipe')
    : undefined;

  return (
    <div className="space-y-8" data-testid="progress-view" data-view={view} data-logged-days={stats.loggedDays}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label={t(lang, 'progress.viewLabel')} className="inline-flex gap-2">
          {PROGRESS_VIEWS.map((v) => (
            <Button
              key={v}
              type="button"
              size="sm"
              variant={view === v ? 'default' : 'outline'}
              aria-pressed={view === v}
              onClick={() => setView(v)}
            >
              {t(lang, VIEW_LABEL[v])}
            </Button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground" data-testid="progress-period">
          {period}
        </p>
      </div>

      <section aria-labelledby="progress-summary-title">
        <h2 id="progress-summary-title" className="sr-only">
          {t(lang, 'progress.summary')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi
            testId="progress-average"
            icon={<TrendingUpIcon />}
            title={t(lang, 'progress.averageCalories')}
            value={formatAmount(stats.averageCalories, lang)}
            hint={
              stats.loggedDays > 0
                ? t(lang, 'progress.averageHint', { count: stats.loggedDays })
                : t(lang, 'progress.averageHintNone')
            }
          />
          <Kpi
            testId="progress-streak"
            icon={<FlameIcon />}
            title={t(lang, 'progress.streakDays')}
            value={formatAmount(streak, lang)}
            hint={t(lang, 'progress.streakHint')}
          />
          <Kpi
            testId="progress-goals-met"
            icon={<AwardIcon />}
            title={t(lang, 'progress.goalsMet')}
            value={t(lang, 'progress.goalsMetValue', { count: stats.goalsMet, total: stats.totalDays })}
            hint={t(lang, view === 'week' ? 'progress.goalsMetHintWeek' : 'progress.goalsMetHintMonth')}
          />
          <Kpi
            testId="progress-most-logged"
            icon={<UtensilsIcon />}
            title={t(lang, 'progress.mostLogged')}
            value={mostLoggedName ?? '—'}
            valueClassName="text-lg"
            hint={
              stats.mostLogged
                ? t(lang, 'progress.mostLoggedHint', { count: stats.mostLogged.count })
                : t(lang, 'progress.mostLoggedNone')
            }
          />
        </div>
      </section>

      {stats.loggedDays === 0 ? (
        <EmptyState
          data-testid="progress-empty"
          icon={<TargetIcon />}
          title={t(lang, 'progress.noData')}
          description={t(lang, 'progress.noDataDescription')}
          action={
            <a className="text-sm font-medium text-primary underline-offset-4 hover:underline" href={withBase(localizedRoute('/tracking/', lang))}>
              {t(lang, 'progress.openDiary')}
            </a>
          }
        />
      ) : (
        <>
          <ProgressCharts lang={lang} view={view} days={days} period={period} goals={goals} averages={stats.macroAverages} />
          <DailyBreakdown lang={lang} days={view === 'week' ? days : days.filter((d) => d.logged)} />
        </>
      )}

      <p className="flex flex-wrap gap-4 text-sm">
        <a className="text-primary underline-offset-4 hover:underline" href={withBase(localizedRoute('/tracking/', lang))}>
          {t(lang, 'progress.openDiary')}
        </a>
        <a className="text-primary underline-offset-4 hover:underline" href={withBase(localizedRoute('/tracking/goals/', lang))}>
          {t(lang, 'progress.editGoals')}
        </a>
      </p>
    </div>
  );
}

function Kpi({
  testId,
  icon,
  title,
  value,
  hint,
  valueClassName,
}: {
  testId: string;
  icon: React.ReactNode;
  title: string;
  value: string;
  hint: string;
  valueClassName?: string;
}) {
  return (
    <KpiCard data-testid={testId} className="p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span aria-hidden="true" className="grid size-8 place-items-center rounded-md bg-primary/10 text-primary [&>svg]:size-4">
          {icon}
        </span>
        <h3 className="text-sm font-medium">{title}</h3>
      </div>
      <p className={`mt-3 font-display text-3xl font-semibold tabular-nums text-foreground ${valueClassName ?? ''}`} data-testid={`${testId}-value`}>
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </KpiCard>
  );
}

/** A visually hidden table holding the data a chart draws. */
function DataTable({
  caption,
  headers,
  rows,
  testId,
}: {
  caption: string;
  headers: string[];
  rows: Array<{ key: string; cells: string[] }>;
  testId: string;
}) {
  return (
    <table className="sr-only" data-testid={testId}>
      <caption>{caption}</caption>
      <thead>
        <tr>
          {headers.map((h) => (
            <th key={h} scope="col">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key}>
            <th scope="row">{row.cells[0]}</th>
            {row.cells.slice(1).map((cell, i) => (
              <td key={i}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ProgressCharts({
  lang,
  view,
  days,
  period,
  goals,
  averages,
}: {
  lang: Locale;
  view: ProgressView;
  days: ProgressDay[];
  period: string;
  goals: NutritionGoals;
  averages: Record<ProgressMacro, number>;
}) {
  const kcal = t(lang, 'progress.seriesCalories');
  const goal = t(lang, 'progress.seriesGoal');
  const trend = t(lang, 'progress.seriesTrend');
  const windowSize = TREND_WINDOW[view];
  const barRows = days.map((d) => ({ day: axisLabel(d.date, view, lang), [kcal]: d.calories }));
  const lineRows = days.map((d) => ({ day: axisLabel(d.date, view, lang), [trend]: d.trend, [goal]: d.goal }));
  const caloriesTitle = t(lang, 'progress.caloriesChartTitle');
  const trendTitle = t(lang, 'progress.trendChartTitle');
  const num = (n: number) => formatAmount(n, lang);

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="progress-calories-title" className="rounded-lg border border-border bg-card p-5" data-testid="progress-calories-chart">
          <h2 id="progress-calories-title" className="font-display text-lg font-semibold text-foreground">
            {caloriesTitle}
          </h2>
          <BarChart
            className="mt-4"
            height={260}
            data={barRows}
            index="day"
            series={[kcal]}
            ariaLabel={t(lang, 'progress.caloriesChartLabel', { period })}
          />
          <DataTable
            testId="progress-calories-table"
            caption={t(lang, 'progress.tableCaption', { chart: caloriesTitle })}
            headers={[t(lang, 'progress.colDay'), kcal, goal, '%']}
            rows={days.map((d) => ({
              key: d.date,
              cells: [dayLabel(d.date, lang), num(d.calories), num(d.goal), `${d.percentage}%`],
            }))}
          />
        </section>

        <section aria-labelledby="progress-trend-title" className="rounded-lg border border-border bg-card p-5" data-testid="progress-trend-chart">
          <h2 id="progress-trend-title" className="font-display text-lg font-semibold text-foreground">
            {trendTitle}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t(lang, 'progress.trendChartDescription', { count: windowSize })}</p>
          <LineChart
            className="mt-4"
            height={236}
            data={lineRows}
            index="day"
            series={[trend, goal]}
            ariaLabel={t(lang, 'progress.trendChartLabel', { count: windowSize, period })}
          />
          <ul className="mt-2 flex gap-4 text-xs text-muted-foreground" aria-hidden="true">
            {[trend, goal].map((name, i) => (
              <li key={name} className="inline-flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-4 rounded-full" style={{ backgroundColor: chartColor(i) }} />
                {name}
              </li>
            ))}
          </ul>
          <DataTable
            testId="progress-trend-table"
            caption={t(lang, 'progress.tableCaption', { chart: trendTitle })}
            headers={[t(lang, 'progress.colDay'), trend, goal]}
            rows={days.map((d) => ({
              key: d.date,
              cells: [dayLabel(d.date, lang), d.trend === null ? '—' : num(d.trend), num(d.goal)],
            }))}
          />
        </section>
      </div>

      <section aria-labelledby="progress-macros-title" data-testid="progress-macros">
        <h2 id="progress-macros-title" className="font-display text-lg font-semibold text-foreground">
          {t(lang, 'progress.macrosTitle')}
        </h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PROGRESS_MACROS.map((macro, i) => {
            const name = t(lang, `nutrition.${macro}`);
            const target = goals[macro];
            const chartName = t(lang, 'progress.macroSparklineLabel', { name, period });
            return (
              <li key={macro} className="rounded-lg border border-border bg-card p-4" data-macro={macro}>
                <p className="text-sm font-medium text-foreground">{name}</p>
                <p className="mt-1 text-xs text-muted-foreground" data-testid="progress-macro-average">
                  {t(lang, 'progress.macroAverage', {
                    grams: num(averages[macro]),
                    percentage: target ? Math.round((averages[macro] / target) * 100) : 0,
                  })}
                </p>
                <Sparkline className="mt-3" height={48} colorIndex={i} data={days.map((d) => d[macro])} ariaLabel={chartName} />
                <DataTable
                  testId={`progress-${macro}-table`}
                  caption={t(lang, 'progress.tableCaption', { chart: chartName })}
                  headers={[t(lang, 'progress.colDay'), `${name} (g)`]}
                  rows={days.map((d) => ({ key: d.date, cells: [dayLabel(d.date, lang), num(d[macro])] }))}
                />
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}

function DailyBreakdown({ lang, days }: { lang: Locale; days: ProgressDay[] }) {
  return (
    <section aria-labelledby="progress-breakdown-title" className="rounded-lg border border-border bg-card p-5">
      <h2 id="progress-breakdown-title" className="font-display text-lg font-semibold text-foreground">
        {t(lang, 'progress.dailyBreakdown')}
      </h2>
      <ul className="mt-4 space-y-4">
        {days.map((d) => {
          const label = dayLabel(d.date, lang);
          const over = d.percentage > 120;
          return (
            <li key={d.date} data-testid="progress-day" data-date={d.date} data-met={d.metGoal ? 'true' : undefined}>
              <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="font-medium text-foreground">{label}</span>
                <span className="inline-flex items-center gap-2 tabular-nums text-muted-foreground">
                  {d.logged ? (
                    <>
                      {t(lang, 'progress.dayCalories', { calories: formatAmount(d.calories, lang), goal: formatAmount(d.goal, lang) })}
                      <span className="font-medium text-foreground">{d.percentage}%</span>
                      {d.metGoal && <Badge variant="secondary">{t(lang, 'progress.goalMetBadge')}</Badge>}
                    </>
                  ) : (
                    t(lang, 'progress.notLogged')
                  )}
                </span>
              </div>
              <Meter
                value={Math.min(d.percentage, 100)}
                min={0}
                max={100}
                showValue={false}
                indicatorClassName={over ? 'bg-destructive' : undefined}
                aria-label={t(lang, 'progress.dayMeterLabel', { date: label })}
                getAriaValueText={() => `${d.percentage}%`}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
