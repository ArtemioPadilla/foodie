import * as React from 'react';
import { useStore } from '@nanostores/react';
import { AlertTriangleIcon, CalendarPlusIcon, CheckCircle2Icon, DownloadIcon, EyeIcon, LinkIcon } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Toaster, toast } from '@/components/ui/toast';
import { getTranslated, localizedRoute, t, type Locale } from '@/i18n';
import { useCatalog } from '@/lib/catalog/use-catalog';
import {
  decodeSharedPlan,
  readShareFragment,
  sharedMealCount,
  sharedPlanAsMealPlan,
  withoutUnknownRecipes,
  type SharedPlan as SharedPlanData,
  type SharedPlanError,
} from '@/lib/domain/plan-share';
import { withBase } from '@/lib/href';
import { useHydrated } from '@/lib/use-hydrated';
import { MAIN_MEAL_SLOTS, type MealSlot, type Recipe } from '@/schemas';
import { $currentPlan, WEEKDAYS, createPlan, emptyWeek, getMealCount, savePlan, type PlanSlot } from '@/stores/planner';
import ErrorBoundary from './ErrorBoundary';
import { PlanSummary } from './MealPlanner/PlanSummary';
import QueryProvider from './QueryProvider';

/**
 * SharedPlan — the `/plan/shared/` island (roadmap Issue 040, D11; ADR 0013;
 * port of PR #28's `SharedPlanPage` without Firestore).
 *
 * Reads the plan from the URL fragment (`#p=…`) after hydration (the server
 * never sees it), decodes and validates it (`decodeSharedPlan`, Zod) and shows
 * it read-only: `PlanSummary` plus a week grid whose recipes are resolved with
 * `useCatalog()`; ids the catalog does not have read "Recipe not available".
 * "Import as my plan" makes it the current plan (`createPlan`); a current plan
 * with meals is first confirmed and kept in the saved plans (`savePlan`).
 * Corrupt, foreign or missing payloads get an explanation, never a crash.
 */
export interface SharedPlanProps {
  lang: Locale;
  /** Test hook: the fragment to read instead of `location.hash`. */
  hash?: string;
}

export default function SharedPlan(props: SharedPlanProps) {
  return (
    <QueryProvider>
      <ErrorBoundary name="SharedPlan">
        <SharedPlanView {...props} />
      </ErrorBoundary>
    </QueryProvider>
  );
}

// `location.hash` as an external store: `null` on the server and while
// hydrating (the fragment never reaches the server), live after that.
function subscribeToHash(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}
const readHash = (): string | null => window.location.hash;
const readServerHash = (): string | null => null;

const ERROR_KEYS: Record<SharedPlanError, string> = {
  empty: 'empty',
  corrupt: 'corrupt',
  invalid: 'invalid',
  'too-long': 'tooLong',
  'unsupported-version': 'unsupported',
};

export function SharedPlanView({ lang, hash }: SharedPlanProps) {
  const hydrated = useHydrated();
  const locationHash = React.useSyncExternalStore(subscribeToHash, readHash, readServerHash);
  const fragment = hash ?? locationHash;

  const result = React.useMemo(
    () => (fragment === null ? null : decodeSharedPlan(readShareFragment(fragment))),
    [fragment],
  );

  let status: 'loading' | 'error' | 'ready' = 'loading';
  let body: React.ReactNode = <SharedPlanSkeleton lang={lang} />;
  if (hydrated && result) {
    if (result.ok) {
      status = 'ready';
      body = <SharedPlanBoard lang={lang} shared={result.plan} />;
    } else {
      status = 'error';
      body = <SharedPlanErrorState lang={lang} error={result.error} />;
    }
  }

  return (
    <div data-testid="shared-plan" data-status={status} data-error={result && !result.ok ? result.error : undefined}>
      {body}
      <Toaster closeLabel={t(lang, 'common.close')} />
    </div>
  );
}

function SharedPlanSkeleton({ lang }: { lang: Locale }) {
  return (
    <div className="space-y-4" aria-busy="true">
      <p className="sr-only">{t(lang, 'sharedPlan.loading')}</p>
      <Skeleton className="h-10 w-2/3" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-56 w-full" />
        ))}
      </div>
    </div>
  );
}

function SharedPlanErrorState({ lang, error }: { lang: Locale; error: SharedPlanError }) {
  const key = ERROR_KEYS[error];
  return (
    <EmptyState
      icon={error === 'empty' ? <LinkIcon aria-hidden="true" /> : <AlertTriangleIcon aria-hidden="true" />}
      title={t(lang, `sharedPlan.${key}Title`)}
      description={t(lang, `sharedPlan.${key}Body`)}
      action={
        <Button asChild>
          <a href={withBase(localizedRoute('/planner/', lang))} data-testid="shared-plan-create-own">
            <CalendarPlusIcon className="size-4" aria-hidden="true" />
            {t(lang, 'sharedPlan.createYourOwn')}
          </a>
        </Button>
      }
      data-testid="shared-plan-error"
    />
  );
}

type Imported = { name: string; dropped: number };

function SharedPlanBoard({ lang, shared }: { lang: Locale; shared: SharedPlanData }) {
  const catalog = useCatalog();
  const current = useStore($currentPlan);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [imported, setImported] = React.useState<Imported | null>(null);

  const catalogReady = catalog.status === 'success' || (catalog.status === 'offline' && catalog.recipes.length > 0);
  const recipesById = React.useMemo(() => new Map<string, Recipe>(catalog.recipes.map((r) => [r.id, r] as const)), [catalog.recipes]);
  const asMealPlan = React.useMemo(() => sharedPlanAsMealPlan(shared), [shared]);
  const name = getTranslated(shared.name, lang);
  const mealCount = sharedMealCount(shared);
  const plannerHref = withBase(localizedRoute('/planner/', lang));

  const importPlan = () => {
    const { plan: kept, dropped } = catalogReady
      ? withoutUnknownRecipes(shared, (id) => recipesById.has(id))
      : { plan: shared, dropped: 0 };
    const before = $currentPlan.get();
    if (before && getMealCount(before) > 0) savePlan();
    const days = emptyWeek().map((day, index) => ({ ...day, meals: kept.days[index]?.meals ?? {} }));
    createPlan({ name: kept.name, servings: kept.servings, days });
    setImported({ name, dropped });
    toast({ title: t(lang, 'sharedPlan.imported') });
  };

  const onImport = () => {
    if (current && getMealCount(current) > 0) setConfirmOpen(true);
    else importPlan();
  };

  return (
    <div className="space-y-6" data-testid="shared-plan-board" data-catalog={catalog.status}>
      <p className="flex gap-2 rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground" data-testid="shared-plan-readonly">
        <EyeIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        <span>{t(lang, 'sharedPlan.readOnly')}</span>
      </p>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-semibold text-foreground" data-testid="shared-plan-name">
            {name}
          </h2>
          <p className="mt-1 flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span data-testid="shared-plan-servings">{t(lang, 'sharedPlan.servings', { count: shared.servings })}</span>
            <span aria-hidden="true">·</span>
            <span data-testid="shared-plan-meal-count">{t(lang, 'planner.mealCount', { count: mealCount })}</span>
          </p>
        </div>
        {!imported && (
          <Button type="button" onClick={onImport} data-testid="import-shared-plan">
            <DownloadIcon className="size-4" aria-hidden="true" />
            {t(lang, 'sharedPlan.importPlan')}
          </Button>
        )}
      </div>

      {imported && (
        <Alert variant="success" data-testid="shared-plan-imported">
          <CheckCircle2Icon className="size-4" aria-hidden="true" />
          <AlertTitle>{t(lang, 'sharedPlan.imported')}</AlertTitle>
          <AlertDescription className="grid gap-2">
            <span>{t(lang, 'sharedPlan.importedDescription', { name: imported.name })}</span>
            {imported.dropped > 0 && (
              <span data-testid="shared-plan-dropped">{t(lang, 'sharedPlan.importedDropped', { count: imported.dropped })}</span>
            )}
            <a href={plannerHref} className="font-medium underline underline-offset-4" data-testid="open-planner">
              {t(lang, 'sharedPlan.openPlanner')}
            </a>
          </AlertDescription>
        </Alert>
      )}

      {catalog.status === 'loading' && (
        <p className="text-sm text-muted-foreground" role="status">
          {t(lang, 'sharedPlan.catalogLoading')}
        </p>
      )}
      {catalog.status === 'error' && (
        <Alert variant="destructive" data-testid="shared-plan-catalog-error">
          <AlertTriangleIcon className="size-4" aria-hidden="true" />
          <AlertDescription className="flex flex-wrap items-center gap-3">
            {t(lang, 'sharedPlan.catalogError')}
            <Button type="button" size="sm" variant="outline" onClick={catalog.refetch}>
              {t(lang, 'sharedPlan.retry')}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {catalogReady && (
        <PlanSummary lang={lang} plan={asMealPlan} recipes={catalog.recipes} ingredients={catalog.ingredients} />
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" data-testid="shared-week">
        {shared.days.map((day, dayIndex) => {
          const weekday = WEEKDAYS[dayIndex] ?? 'monday';
          const slots: Array<[PlanSlot, MealSlot]> = [
            ...MAIN_MEAL_SLOTS.flatMap((slot) => (day.meals[slot] ? [[slot, day.meals[slot]] as [PlanSlot, MealSlot]] : [])),
            ...(day.meals.snacks ?? []).map((snack) => ['snacks', snack] as [PlanSlot, MealSlot]),
          ];
          return (
            <article
              key={day.dayNumber}
              aria-labelledby={`shared-day-${dayIndex}`}
              className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 text-card-foreground"
              data-testid={`shared-day-${weekday}`}
            >
              <h3 id={`shared-day-${dayIndex}`} className="font-display text-base font-semibold text-foreground">
                {t(lang, `planner.${weekday}`)}
              </h3>
              {slots.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t(lang, 'planner.emptySlot')}</p>
              ) : (
                <ul className="grid gap-2">
                  {slots.map(([slot, meal], index) => (
                    <SharedMeal
                      key={`${slot}-${index}`}
                      lang={lang}
                      slot={slot}
                      meal={meal}
                      recipe={recipesById.get(meal.recipeId)}
                      resolved={catalogReady}
                    />
                  ))}
                </ul>
              )}
            </article>
          );
        })}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent data-testid="import-confirm-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{t(lang, 'sharedPlan.importConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(lang, 'sharedPlan.importConfirmBody', { name, current: current ? getTranslated(current.name, lang) : '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button type="button" variant="outline" />}>{t(lang, 'common.cancel')}</AlertDialogClose>
            <AlertDialogClose render={<Button type="button" data-testid="confirm-import" />} onClick={importPlan}>
              {t(lang, 'sharedPlan.importConfirm')}
            </AlertDialogClose>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SharedMeal({
  lang,
  slot,
  meal,
  recipe,
  resolved,
}: {
  lang: Locale;
  slot: PlanSlot;
  meal: MealSlot;
  recipe: Recipe | undefined;
  resolved: boolean;
}) {
  const unavailable = resolved && !recipe;
  return (
    <li
      className="rounded-md border border-border p-2 text-sm"
      data-testid="shared-meal"
      data-recipe-id={meal.recipeId}
      data-available={unavailable ? 'false' : 'true'}
    >
      <span className="block text-xs uppercase tracking-wide text-muted-foreground">{t(lang, `planner.${slot}`)}</span>
      {recipe ? (
        <a
          href={withBase(localizedRoute(`/recipes/${recipe.id}/`, lang))}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          {getTranslated(recipe.name, lang)}
        </a>
      ) : unavailable ? (
        <span className="font-medium text-muted-foreground" title={t(lang, 'sharedPlan.recipeUnavailableHint')}>
          {t(lang, 'sharedPlan.recipeUnavailable')}
        </span>
      ) : (
        <Skeleton className="mt-1 h-4 w-3/4" />
      )}
      <Badge variant="secondary" className="ml-2 px-1.5 py-0 text-[0.65rem]">
        {t(lang, 'planner.mealServings', { count: meal.servings })}
      </Badge>
      {unavailable && <span className="sr-only">{t(lang, 'sharedPlan.recipeUnavailableHint')}</span>}
    </li>
  );
}
