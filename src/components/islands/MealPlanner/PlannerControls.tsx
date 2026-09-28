import { CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon, MinusIcon, PlusIcon, SaveIcon, Trash2Icon } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { getTranslated, t, type Locale } from '@/i18n';
import { addDaysToKey, formatDate, parseDateKey } from '@/lib/format-date';
import type { MealPlan } from '@/schemas';
import { adjustGlobalServings, clearPlan, savePlan } from '@/stores/planner';
import { MAX_SERVINGS } from './MealSlot';
import { LazyPlanTemplates } from './LazyPlanTemplates';
import { LazySharePlanModal } from './LazySharePlanModal';

export interface PlannerControlsProps {
  lang: Locale;
  plan: MealPlan;
  weekStart: string;
  /** Monday of the current week — the "This week" target. */
  currentWeekStart: string;
  onWeekChange: (weekStart: string) => void;
}

/**
 * Toolbar of the planner (port of legacy `PlannerControls` +
 * `ServingsAdjuster`): week navigation, the plan's default servings, save,
 * "Clear plan" behind an `alert-dialog` confirmation, and the `PlanTemplates`
 * manager (Issue 025), and `SharePlanModal` (share by URL, Issue 040).
 */
export function PlannerControls({ lang, plan, weekStart, currentWeekStart, onWeekChange }: PlannerControlsProps) {
  const fmt = (key: string) => formatDate(parseDateKey(key), lang, { month: 'short', day: 'numeric' });
  const range = t(lang, 'planner.weekRange', { start: fmt(weekStart), end: fmt(addDaysToKey(weekStart, 6)) });
  const servings = plan.servings;
  const planName = getTranslated(plan.name, lang);

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg border border-border bg-card p-3" data-testid="planner-controls">
      <div role="group" aria-label={t(lang, 'planner.weekOf', { date: fmt(weekStart) })} className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9"
          onClick={() => onWeekChange(addDaysToKey(weekStart, -7))}
          aria-label={t(lang, 'planner.previousWeek')}
          data-testid="previous-week"
        >
          <ChevronLeftIcon className="size-4" aria-hidden="true" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onWeekChange(currentWeekStart)}
          disabled={weekStart === currentWeekStart}
          data-testid="current-week"
        >
          <CalendarDaysIcon className="size-4" aria-hidden="true" />
          {t(lang, 'planner.today')}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9"
          onClick={() => onWeekChange(addDaysToKey(weekStart, 7))}
          aria-label={t(lang, 'planner.nextWeek')}
          data-testid="next-week"
        >
          <ChevronRightIcon className="size-4" aria-hidden="true" />
        </Button>
        <output className="ml-2 text-sm font-medium tabular-nums text-foreground" aria-live="polite" data-testid="week-range">
          {range}
        </output>
      </div>

      <div role="group" aria-labelledby="planner-servings-label" className="flex items-center gap-2" data-testid="global-servings">
        <span id="planner-servings-label" className="text-sm text-muted-foreground" title={t(lang, 'planner.globalServingsHint')}>
          {t(lang, 'planner.globalServings')}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8"
          disabled={servings <= 1}
          onClick={() => adjustGlobalServings(servings - 1)}
          aria-label={t(lang, 'planner.decreaseGlobalServings')}
        >
          <MinusIcon className="size-4" aria-hidden="true" />
        </Button>
        <output className="min-w-8 text-center font-semibold tabular-nums" data-testid="global-servings-value">
          {servings}
        </output>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8"
          disabled={servings >= MAX_SERVINGS}
          onClick={() => adjustGlobalServings(servings + 1)}
          aria-label={t(lang, 'planner.increaseGlobalServings')}
        >
          <PlusIcon className="size-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <LazyPlanTemplates lang={lang} plan={plan} />
        <LazySharePlanModal lang={lang} plan={plan} />
        <Button
          type="button"
          size="sm"
          onClick={() => {
            savePlan();
            toast({ title: t(lang, 'planner.planSaved') });
          }}
          data-testid="save-plan"
        >
          <SaveIcon className="size-4" aria-hidden="true" />
          {t(lang, 'planner.savePlan')}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger render={<Button type="button" variant="ghost" size="sm" data-testid="clear-plan" />}>
            <Trash2Icon className="size-4" aria-hidden="true" />
            {t(lang, 'planner.clearPlan')}
          </AlertDialogTrigger>
          <AlertDialogContent data-testid="clear-plan-dialog">
            <AlertDialogHeader>
              <AlertDialogTitle>{t(lang, 'planner.confirmClearTitle')}</AlertDialogTitle>
              <AlertDialogDescription>{t(lang, 'planner.confirmClearBody', { name: planName })}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogClose render={<Button type="button" variant="outline" />}>{t(lang, 'common.cancel')}</AlertDialogClose>
              <AlertDialogClose
                render={<Button type="button" variant="destructive" data-testid="confirm-clear-plan" />}
                onClick={() => {
                  clearPlan();
                  toast({ title: t(lang, 'planner.planCleared') });
                }}
              >
                {t(lang, 'planner.clearPlan')}
              </AlertDialogClose>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
