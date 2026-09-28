import { CopyIcon, EllipsisVerticalIcon, EraserIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/toast';
import { t, type Locale } from '@/i18n';
import { addDaysToKey, formatDate, parseDateKey, todayKey } from '@/lib/format-date';
import { cn } from '@/lib/utils';
import type { MealPlan, PlanDay, Recipe } from '@/schemas';
import { clearDay, duplicateDay, WEEKDAYS, type PlanSlot } from '@/stores/planner';
import { dayLabel, PLAN_SLOTS } from './dnd';
import { MealSlot } from './MealSlot';

export interface WeekViewProps {
  lang: Locale;
  plan: MealPlan;
  /** Monday of the displayed week (`YYYY-MM-DD`). */
  weekStart: string;
  /** Today's key, to highlight the current day. */
  today?: string;
  recipesById: ReadonlyMap<string, Recipe>;
  onAdd: (dayIndex: number, slot: PlanSlot) => void;
}

function dayMeals(day: PlanDay, slot: PlanSlot) {
  if (slot === 'snacks') return day.meals.snacks ?? [];
  const meal = day.meals[slot];
  return meal ? [meal] : [];
}

function countMeals(day: PlanDay): number {
  return PLAN_SLOTS.reduce((n, slot) => n + dayMeals(day, slot).length, 0);
}

/**
 * The 7-day grid (port of legacy `WeekView`): one card per plan day with its
 * date in the displayed week, the four droppable slots and a per-day menu
 * (copy the day onto another one, clear it).
 */
export function WeekView({ lang, plan, weekStart, today = todayKey(), recipesById, onAdd }: WeekViewProps) {
  return (
    <div data-testid="week-view" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {plan.days.map((day, dayIndex) => {
        const dateKey = addDaysToKey(weekStart, dayIndex);
        const isToday = dateKey === today;
        const name = dayLabel(lang, dayIndex);
        const count = countMeals(day);
        return (
          <article
            key={day.dayNumber}
            aria-labelledby={`planner-day-${dayIndex}`}
            data-testid={`day-card-${WEEKDAYS[dayIndex] ?? dayIndex}`}
            className={cn(
              'flex flex-col gap-2 rounded-lg border border-border bg-card p-3 text-card-foreground',
              isToday && 'border-primary ring-1 ring-primary',
            )}
          >
            <header className="flex items-start justify-between gap-2">
              <div>
                <h3 id={`planner-day-${dayIndex}`} className="font-display text-base font-semibold text-foreground">
                  {name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  <time dateTime={dateKey}>{formatDate(parseDateKey(dateKey), lang, { month: 'short', day: 'numeric' })}</time>
                  {count > 0 && (
                    <Badge variant="secondary" className="ml-2 px-1.5 py-0 text-[0.65rem]">
                      {t(lang, 'planner.mealCount', { count })}
                    </Badge>
                  )}
                </p>
              </div>
              <DayMenu lang={lang} dayIndex={dayIndex} dayCount={plan.days.length} hasMeals={count > 0} />
            </header>
            {PLAN_SLOTS.map((slot) => (
              <MealSlot
                key={slot}
                lang={lang}
                dayIndex={dayIndex}
                slot={slot}
                meals={dayMeals(day, slot)}
                recipesById={recipesById}
                onAdd={onAdd}
              />
            ))}
          </article>
        );
      })}
    </div>
  );
}

function DayMenu({ lang, dayIndex, dayCount, hasMeals }: { lang: Locale; dayIndex: number; dayCount: number; hasMeals: boolean }) {
  const name = dayLabel(lang, dayIndex);
  const targets = Array.from({ length: dayCount }, (_, i) => i).filter((i) => i !== dayIndex);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            aria-label={t(lang, 'planner.dayActions', { day: name })}
            data-testid={`day-actions-${WEEKDAYS[dayIndex] ?? dayIndex}`}
          />
        }
      >
        <EllipsisVerticalIcon className="size-4" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-muted-foreground">
          <CopyIcon className="size-3.5" aria-hidden="true" />
          {t(lang, 'planner.duplicateTo', { day: name })}
        </DropdownMenuLabel>
        {targets.map((target) => (
          <DropdownMenuItem
            key={target}
            disabled={!hasMeals}
            onClick={() => {
              duplicateDay(dayIndex, target);
              toast({ title: t(lang, 'planner.dayDuplicated', { from: name, to: dayLabel(lang, target) }) });
            }}
            data-testid="duplicate-day-target"
          >
            {dayLabel(lang, target)}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={!hasMeals}
          onClick={() => {
            clearDay(dayIndex);
            toast({ title: t(lang, 'planner.dayCleared', { day: name }) });
          }}
          data-testid="clear-day"
        >
          <EraserIcon aria-hidden="true" />
          {t(lang, 'planner.clearDay')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
