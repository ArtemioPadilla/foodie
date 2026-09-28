import * as React from 'react';
import { useStore } from '@nanostores/react';
import { KpiCard } from '@/components/ui/kpi-card';
import { Meter } from '@/components/ui/meter';
import { Metric } from '@/components/ui/metric';
import { t, type Locale } from '@/i18n';
import { formatPrice } from '@/lib/domain/ingredient-detail';
import { calculateGoalProgress, createEmptyNutrition } from '@/lib/domain/nutrition';
import { MACRO_KEYS, summarizeMealPlan } from '@/lib/domain/plan-summary';
import type { Ingredient, MealPlan, Recipe } from '@/schemas';
import { $goals } from '@/stores/goals';

export interface PlanSummaryProps {
  lang: Locale;
  plan: MealPlan;
  recipes: ReadonlyArray<Recipe>;
  ingredients: ReadonlyArray<Ingredient>;
}

const MACRO_META = {
  calories: { unit: 'kcal', labelKey: 'nutrition.calories' },
  protein: { unit: 'g', labelKey: 'nutrition.protein' },
  carbs: { unit: 'g', labelKey: 'nutrition.carbs' },
  fat: { unit: 'g', labelKey: 'nutrition.fat' },
  fiber: { unit: 'g', labelKey: 'nutrition.fiber' },
} as const;

/**
 * PlanSummary — the KPI strip above the planner tabs (roadmap Issue 025,
 * port of legacy `PlanSummary`).
 *
 * - `kpi-card` + `metric`: recipes planned (and how many different ones),
 *   estimated cost (`calculateMealPlanCost` through `summarizeMealPlan`),
 *   different ingredients, planned days.
 * - `meter` per macro: the per-person average planned day against `$goals`
 *   (the meter caps at the goal; the text and `aria-valuetext` carry the real
 *   percentage, so "over the goal" is never hidden).
 */
export function PlanSummary({ lang, plan, recipes, ingredients }: PlanSummaryProps) {
  const goals = useStore($goals);
  const summary = React.useMemo(() => summarizeMealPlan(plan, recipes, ingredients), [plan, recipes, ingredients]);
  const progress = calculateGoalProgress({ ...createEmptyNutrition(), ...summary.dailyAverage }, goals);
  const number = (value: number) => new Intl.NumberFormat(lang).format(value);

  return (
    <section aria-labelledby="plan-summary-heading" className="space-y-3" data-testid="plan-summary">
      <h2 id="plan-summary-heading" className="sr-only">
        {t(lang, 'planner.summaryTitle')}
      </h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard className="p-4" data-testid="summary-recipes">
          <Metric
            value={number(summary.mealCount)}
            label={`${t(lang, 'planner.summaryRecipes')} · ${t(lang, 'planner.summaryUniqueRecipes', { count: summary.uniqueRecipes })}`}
          />
        </KpiCard>
        <KpiCard className="p-4" data-testid="summary-cost">
          <Metric
            value={formatPrice(summary.estimatedCost, plan.currency, lang)}
            label={`${t(lang, 'planner.summaryCost')} · ${t(lang, 'planner.summaryCostHint')}`}
          />
        </KpiCard>
        <KpiCard className="p-4" data-testid="summary-ingredients">
          <Metric
            value={number(summary.uniqueIngredients)}
            label={`${t(lang, 'planner.summaryIngredients')} · ${t(lang, 'planner.summaryIngredientsHint')}`}
          />
        </KpiCard>
        <KpiCard className="p-4" data-testid="summary-days">
          <Metric
            value={t(lang, 'planner.summaryDaysValue', { planned: summary.plannedDays, total: summary.totalDays })}
            label={`${t(lang, 'planner.summaryDays')} · ${t(lang, 'planner.summaryDaysHint')}`}
          />
        </KpiCard>
      </div>

      <KpiCard className="p-4" data-testid="summary-nutrition">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 className="text-sm font-semibold text-foreground">{t(lang, 'planner.summaryNutritionTitle')}</h3>
          <p className="text-xs text-muted-foreground">
            {summary.plannedDays > 0
              ? t(lang, 'planner.summaryNutritionHint', { count: summary.plannedDays })
              : t(lang, 'planner.summaryNutritionEmpty')}
          </p>
        </div>
        <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-5">
          {MACRO_KEYS.map((key) => {
            const { unit, labelKey } = MACRO_META[key];
            const { consumed, goal, percentage } = progress[key];
            const label = t(lang, labelKey);
            const text = t(lang, 'planner.summaryMeterValue', { value: number(consumed), goal: number(goal), unit });
            return (
              <div key={key} data-testid={`summary-meter-${key}`} data-percent={percentage}>
                <Meter
                  value={Math.min(consumed, goal)}
                  min={0}
                  max={goal}
                  showValue={false}
                  label={label}
                  aria-label={label}
                  getAriaValueText={() =>
                    t(lang, 'planner.summaryMeterAria', { value: number(consumed), goal: number(goal), unit, percent: percentage })
                  }
                />
                <p className="mt-1 flex justify-between text-xs tabular-nums text-muted-foreground">
                  <span>{text}</span>
                  <span className={percentage > 100 ? 'font-semibold text-foreground' : undefined}>{percentage}%</span>
                </p>
              </div>
            );
          })}
        </div>
      </KpiCard>
    </section>
  );
}
