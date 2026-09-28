import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { t, type Locale } from '@/i18n';
import { formatDate, parseDateKey, toDateKey, todayKey } from '@/lib/format-date';
import { cn } from '@/lib/utils';
import type { MealPlan } from '@/schemas';
import { getMealCount, WEEKDAYS } from '@/stores/planner';

export interface MonthCursor {
  year: number;
  /** 0–11, like `Date#getMonth`. */
  month: number;
}

export interface MonthViewProps {
  lang: Locale;
  plan: MealPlan;
  cursor: MonthCursor;
  onCursorChange: (cursor: MonthCursor) => void;
  /** A date was picked: open its week. */
  onPickDate: (dateKey: string) => void;
  today?: string;
}

/** Monday = 0 … Sunday = 6 (plans start on Monday). */
export function weekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/** Leading blanks + every day of the month, Monday-first. */
export function monthGrid({ year, month }: MonthCursor): Array<string | null> {
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const cells: Array<string | null> = Array.from({ length: weekdayIndex(first) }, () => null);
  for (let d = 1; d <= days; d++) cells.push(toDateKey(new Date(year, month, d)));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function shiftMonth({ year, month }: MonthCursor, delta: number): MonthCursor {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

/**
 * Month overview (port of legacy `MonthView`). The plan is a repeating week,
 * so each date shows the meals planned for its weekday (the legacy view
 * mapped day-of-month 1–7 onto the plan, which was wrong for every other
 * date). Picking a date opens that week in the week view.
 */
export function MonthView({ lang, plan, cursor, onCursorChange, onPickDate, today = todayKey() }: MonthViewProps) {
  const cells = monthGrid(cursor);
  const title = formatDate(new Date(cursor.year, cursor.month, 1), lang, { month: 'long', year: 'numeric' });
  const perWeekday = plan.days.map((day) => getMealCount({ ...plan, days: [day] }));
  // Monday 2024-01-01 … Sunday 2024-01-07 give localised short weekday headers.
  const headers = WEEKDAYS.map((_, i) => formatDate(new Date(2024, 0, 1 + i), lang, { weekday: 'short' }));

  return (
    <section data-testid="month-view" aria-labelledby="planner-month-title" className="rounded-lg border border-border bg-card p-4 text-card-foreground">
      <header className="mb-4 flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onCursorChange(shiftMonth(cursor, -1))}
          aria-label={t(lang, 'planner.previousMonth')}
        >
          <ChevronLeftIcon className="size-4" aria-hidden="true" />
        </Button>
        <h3 id="planner-month-title" className="font-display text-lg font-semibold capitalize text-foreground" aria-live="polite">
          {title}
        </h3>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onCursorChange(shiftMonth(cursor, 1))}
          aria-label={t(lang, 'planner.nextMonth')}
        >
          <ChevronRightIcon className="size-4" aria-hidden="true" />
        </Button>
      </header>

      <div className="grid grid-cols-7 gap-1">
        {headers.map((label) => (
          <div key={label} className="pb-1 text-center text-xs font-semibold uppercase text-muted-foreground" aria-hidden="true">
            {label}
          </div>
        ))}
        {cells.map((key, index) => {
          if (!key) return <div key={`blank-${index}`} aria-hidden="true" />;
          const date = parseDateKey(key);
          const count = perWeekday[weekdayIndex(date)] ?? 0;
          const isToday = key === today;
          const dateLabel = formatDate(date, lang, { weekday: 'long', month: 'long', day: 'numeric' });
          return (
            <button
              key={key}
              type="button"
              onClick={() => onPickDate(key)}
              data-date={key}
              data-meal-count={count}
              aria-current={isToday ? 'date' : undefined}
              aria-label={
                count > 0
                  ? t(lang, 'planner.monthDayLabel', { date: dateLabel, count })
                  : t(lang, 'planner.monthDayEmpty', { date: dateLabel })
              }
              className={cn(
                'flex aspect-square min-h-11 flex-col items-start rounded-md border border-border p-1.5 text-left text-sm transition-colors',
                'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                count > 0 && 'bg-primary/10',
                isToday && 'border-primary font-semibold text-primary',
              )}
            >
              <span className="tabular-nums">{date.getDate()}</span>
              {count > 0 && (
                <span className="mt-auto hidden text-[0.65rem] leading-tight text-muted-foreground sm:block" aria-hidden="true">
                  {t(lang, 'planner.mealCount', { count })}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <footer className="mt-4 flex flex-wrap items-center gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="size-3 rounded-sm border border-primary" aria-hidden="true" />
          {t(lang, 'planner.todayLegend')}
        </span>
        <span className="flex items-center gap-2">
          <span className="size-3 rounded-sm bg-primary/10" aria-hidden="true" />
          {t(lang, 'planner.hasMeals')}
        </span>
        <span className="basis-full">{t(lang, 'planner.monthHint')}</span>
      </footer>
    </section>
  );
}
