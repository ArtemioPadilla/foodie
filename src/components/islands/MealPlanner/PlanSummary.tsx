import * as React from 'react';
import { useStore } from '@nanostores/react';
import { KpiCard } from '@/components/ui/kpi-card';
import { Meter } from '@/components/ui/meter';
import { Metric } from '@/components/ui/metric';
import { t, type Locale } from '@/i18n';
import { buildPriceBook, estimatePlanCost } from '@/lib/domain/cost';
import { formatPrice } from '@/lib/domain/ingredient-detail';
import { calculateGoalProgress, createEmptyNutrition } from '@/lib/domain/nutrition';
import { MACRO_KEYS, summarizeMealPlan } from '@/lib/domain/plan-summary';
import type { Category, Ingredient, IngredientPrice, MealPlan, Recipe } from '@/schemas';
import { $goals } from '@/stores/goals';
import { $currency } from '@/stores/preferences';
import { $customPrices } from '@/stores/prices';
import { LazyPriceManagementModal } from '../PriceManagement/LazyPriceManagementModal';

export interface PlanSummaryProps {
  lang: Locale;
  plan: MealPlan;
  recipes: ReadonlyArray<Recipe>;
  ingredients: ReadonlyArray<Ingredient>;
  /** Store price sheet (`usePriceCatalog()`, Issue 041); `[]` = `avgPrice` only. */
  prices?: ReadonlyArray<IngredientPrice>;
  /** `ingredientCategories` for the price manager's category column. */
  categories?: ReadonlyArray<Category>;
}

const NO_PRICES: ReadonlyArray<IngredientPrice> = [];
const NO_CATEGORIES: ReadonlyArray<Category> = [];

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
 *   estimated cost, different ingredients, planned days.
 * - Cost (roadmap Issue 041, PR #28): `lib/domain/cost.ts` with custom prices
 *   (`$customPrices`) over catalog prices, in `$preferences.currency`; the
 *   per-planned-day average and the share of priced ingredient lines; "cost
 *   data unavailable" when nothing could be priced. The "Manage prices"
 *   dialog lives in the card (same island).
 * - `meter` per macro: the per-person average planned day against `$goals`
 *   (the meter caps at the goal; the text and `aria-valuetext` carry the real
 *   percentage, so "over the goal" is never hidden).
 */
export function PlanSummary({ lang, plan, recipes, ingredients, prices = NO_PRICES, categories = NO_CATEGORIES }: PlanSummaryProps) {
  const goals = useStore($goals);
  const custom = useStore($customPrices);
  const currency = useStore($currency);
  const book = React.useMemo(
    () => buildPriceBook({ ingredients, prices, custom, currency }),
    [ingredients, prices, custom, currency],
  );
  const summary = React.useMemo(
    () => summarizeMealPlan(plan, recipes, ingredients, book.priceOf),
    [plan, recipes, ingredients, book],
  );
  const cost = React.useMemo(() => estimatePlanCost(plan, recipes, book.priceOf), [plan, recipes, book]);
  const costUnavailable = cost.count > 0 && cost.priced === 0;
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
        <KpiCard
          className="p-4"
          data-testid="summary-cost"
          data-cost={costUnavailable ? undefined : summary.estimatedCost}
          data-coverage={cost.coverage}
          data-currency={currency}
        >
          <Metric
            value={costUnavailable ? t(lang, 'planner.summaryCostUnavailable') : formatPrice(summary.estimatedCost, currency, lang)}
            label={`${t(lang, 'planner.summaryCost')} · ${t(lang, 'planner.summaryCostHint')}`}
          />
          {!costUnavailable && cost.plannedDays > 0 ? (
            <p className="mt-1 text-xs text-muted-foreground" data-testid="summary-cost-per-day">
              {t(lang, 'planner.summaryCostPerDay', { cost: formatPrice(cost.perDay, currency, lang) })}
            </p>
          ) : null}
          {cost.count > 0 && cost.coverage < 100 ? (
            <p className="mt-1 text-xs text-muted-foreground" data-testid="summary-cost-coverage">
              {t(lang, 'planner.summaryCostCoverage', { percent: cost.coverage })}
            </p>
          ) : null}
          <LazyPriceManagementModal
            lang={lang}
            ingredients={ingredients}
            categories={categories}
            prices={prices}
            triggerClassName="mt-2 print:hidden"
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
