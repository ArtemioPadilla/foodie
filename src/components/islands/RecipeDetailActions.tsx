import * as React from 'react';
import {
  CalendarPlusIcon,
  CheckIcon,
  ScaleIcon,
  ShoppingCartIcon,
  TimerIcon,
} from 'lucide-react';
import { FavoriteButton } from '@/components/domain/FavoriteButton';
import { NutritionFacts } from '@/components/domain/NutritionFacts';
import { RecipeTimer } from '@/components/domain/RecipeTimer';
import { ServingsAdjuster } from '@/components/domain/ServingsAdjuster';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Toaster, toast } from '@/components/ui/toast';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { getTranslated, localizedRoute, t, type Locale } from '@/i18n';
import {
  defaultPlanSlot,
  scaledIngredientLines,
  shoppingItemsFor,
  type IngredientMetaMap,
} from '@/lib/domain/recipe-detail';
import type { ResolvedUnitSystem } from '@/lib/domain/units';
import { useUnitConversion } from '@/lib/domain/use-unit-conversion';
import { withBase } from '@/lib/href';
import { useHydrated } from '@/lib/use-hydrated';
import { cn } from '@/lib/utils';
import type { Recipe } from '@/schemas';
import { $currentPlan, addRecipeToPlan, createPlan, WEEKDAYS, type PlanSlot } from '@/stores/planner';
import { addShoppingItem } from '@/stores/shopping';

/**
 * RecipeDetailActions — the one interactive island of `/recipes/[id]/`
 * (roadmap Issue 018, D4 "una isla por página"; port of legacy
 * `RecipeDetailPage` + `RecipeIngredients` + `RecipeInstructions` +
 * `RecipeNutrition` + `RecipeScaler` + `RecipeTimer`).
 *
 * Everything that depends on the selected yield lives here so it re-renders
 * together: servings stepper, ingredient quantities (scaled, then expressed in
 * the user's unit system through `useUnitConversion`), per-step timers (a
 * `Dialog`), the scaled `NutritionFacts` table, the favourite toggle
 * (`FavoriteButton` → `$favorites`), "Add to meal plan" (a `Dialog` with day + meal → `$planner`)
 * and "Add ingredients to shopping list" (`$shopping`).
 *
 * - Hydrated with `client:visible`; the server render already carries the
 *   full ingredient/instruction/nutrition markup at the recipe's own yield,
 *   so the page is complete (and indexable) without JS.
 * - Every `Dialog` and the `Toaster` sit inside this single React root —
 *   compound components never span islands.
 * - The recipe arrives as a serialisable prop and `lang` as a prop; nothing
 *   reads `navigator.language` during render. Store-backed state
 *   (favourite) is only shown after hydration so the SSR markup and the
 *   first client render always agree, and the store-writing actions
 *   (favourite, add to plan, add to shopping) stay `disabled` until the island
 *   is live — `client:visible` hydrates lazily and a click on the inert SSR
 *   buttons would otherwise be lost.
 */
export interface RecipeDetailActionsProps {
  recipe: Recipe;
  lang: Locale;
  /** `ingredientId → { name, category }` resolved at build for this locale. */
  ingredientMeta: IngredientMetaMap;
}

const PLAN_SLOTS: ReadonlyArray<PlanSlot> = ['breakfast', 'lunch', 'dinner', 'snacks'];

export default function RecipeDetailActions({ recipe, lang, ingredientMeta }: RecipeDetailActionsProps) {
  const hydrated = useHydrated();
  const name = getTranslated(recipe.name, lang);

  const [servings, setServings] = React.useState(recipe.servings);
  const [unitOverride, setUnitOverride] = React.useState<ResolvedUnitSystem | undefined>(undefined);
  const { convert, preferredSystem } = useUnitConversion(unitOverride);

  const [checkedIngredients, setCheckedIngredients] = React.useState<ReadonlySet<number>>(() => new Set());
  const [completedSteps, setCompletedSteps] = React.useState<ReadonlySet<number>>(() => new Set());
  // `run` feeds the `key` of the timer / plan dialogs so each opening mounts fresh state.
  const [timer, setTimer] = React.useState<{ minutes: number; label: string; run: number } | null>(null);
  const [plan, setPlan] = React.useState<{ open: boolean; run: number; dayIndex: number }>({ open: false, run: 0, dayIndex: 0 });
  const setPlanOpen = (open: boolean) =>
    setPlan((previous) =>
      open ? { open: true, run: previous.run + 1, dayIndex: todayIndex() } : { ...previous, open: false },
    );

  const lines = React.useMemo(
    () => scaledIngredientLines(recipe, servings, ingredientMeta, lang, convert),
    [recipe, servings, ingredientMeta, lang, convert],
  );

  const toggleInSet = (setter: React.Dispatch<React.SetStateAction<ReadonlySet<number>>>, value: number) =>
    setter((previous) => {
      const next = new Set(previous);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });

  const onAddToShopping = () => {
    const items = shoppingItemsFor(recipe, servings, ingredientMeta);
    items.forEach(addShoppingItem);
    toast({ title: t(lang, 'recipe.addedToShopping', { count: items.length }) });
  };

  const onAddToPlan = (dayIndex: number, slot: PlanSlot) => {
    if (!$currentPlan.get()) createPlan();
    addRecipeToPlan(dayIndex, slot, recipe.id, servings);
    setPlanOpen(false);
    toast({
      title: t(lang, 'recipe.addedToPlan', {
        day: t(lang, `planner.${WEEKDAYS[dayIndex]}`),
        meal: t(lang, `planner.${slot}`),
      }),
    });
  };

  const scaled = servings !== recipe.servings;
  const system = unitOverride ?? preferredSystem;

  return (
    <div data-testid="recipe-detail-actions" data-hydrated={hydrated ? 'true' : undefined}>
      {/* ── Actions ─────────────────────────────────────────────────────── */}
      <div
        role="group"
        aria-label={t(lang, 'recipe.detailActions')}
        className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3"
      >
        <FavoriteButton recipeId={recipe.id} recipeName={name} lang={lang} data-testid="favorite-button" />
        <Button
          type="button"
          variant="outline"
          onClick={() => setPlanOpen(true)}
          disabled={!hydrated}
          data-testid="add-to-plan-button"
        >
          <CalendarPlusIcon className="size-4" aria-hidden="true" />
          {t(lang, 'recipe.addToPlanner')}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onAddToShopping}
          disabled={!hydrated}
          data-testid="add-to-shopping-button"
        >
          <ShoppingCartIcon className="size-4" aria-hidden="true" />
          {t(lang, 'recipe.addIngredientsToShopping')}
        </Button>
      </div>

      {/* ── Servings + units ────────────────────────────────────────────── */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <ServingsAdjuster
          servings={servings}
          originalServings={recipe.servings}
          onChange={setServings}
          lang={lang}
        />
        <ToggleGroup
          value={[system]}
          onValueChange={(values) => {
            const next = values[0] as ResolvedUnitSystem | undefined;
            if (next) setUnitOverride(next);
          }}
          aria-label={t(lang, 'recipe.unitSystem')}
          data-testid="unit-toggle"
        >
          <ToggleGroupItem value="metric">
            <ScaleIcon className="size-4" aria-hidden="true" />
            {t(lang, 'recipe.metricShort')}
          </ToggleGroupItem>
          <ToggleGroupItem value="imperial">{t(lang, 'recipe.imperialShort')}</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* ── Ingredients ──────────────────────────────────────────────── */}
        <section aria-labelledby="recipe-ingredients-heading" className="lg:col-span-1">
          <div className="rounded-lg border border-border bg-card p-4 sm:p-6 lg:sticky lg:top-24">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="recipe-ingredients-heading" className="font-display text-2xl font-semibold text-foreground">
                {t(lang, 'recipe.ingredients')}
              </h2>
              {scaled && (
                <span className="text-sm text-primary" data-testid="scaled-note">
                  {t(lang, 'recipe.scaledForServings', { servings })}
                </span>
              )}
            </div>
            <ul className="space-y-2" data-testid="ingredients-list">
              {lines.map((line, index) => {
                const checked = checkedIngredients.has(index);
                const labelId = `ingredient-${recipe.id}-${index}`;
                return (
                  <li
                    key={`${line.ingredientId}-${index}`}
                    className={cn('flex items-start gap-3 rounded-md p-2', checked && 'bg-muted')}
                    data-ingredient-id={line.ingredientId}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleInSet(setCheckedIngredients, index)}
                      aria-labelledby={labelId}
                      className="mt-1"
                    />
                    <span id={labelId} className={cn('flex-1 text-sm', checked && 'text-muted-foreground line-through')}>
                      {line.amount && (
                        <span className="font-semibold text-foreground tabular-nums" data-testid="ingredient-amount">
                          {line.amount}{' '}
                        </span>
                      )}
                      {ingredientMeta[line.ingredientId]?.category ? (
                        // Catalog ingredient → its static page (roadmap #019); unknown ids stay plain text.
                        <a
                          href={withBase(localizedRoute(`/ingredients/${line.ingredientId}/`, lang))}
                          className="text-foreground underline decoration-primary/40 underline-offset-2 hover:text-primary hover:decoration-primary"
                          data-testid="ingredient-link"
                        >
                          {line.name}
                        </a>
                      ) : (
                        <span className="text-foreground">{line.name}</span>
                      )}
                      {line.preparation && <span className="text-muted-foreground">{` (${line.preparation})`}</span>}
                      {line.optional && (
                        <span className="text-xs text-muted-foreground">{` · ${t(lang, 'common.optional')}`}</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
            {checkedIngredients.size > 0 && (
              <div className="mt-4 border-t border-border pt-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t(lang, 'recipe.ingredientsProgress')}</span>
                  <span className="font-medium text-primary" role="status">
                    {t(lang, 'common.checkedProgress', { checked: checkedIngredients.size, total: lines.length })}
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>

        <div className="space-y-8 lg:col-span-2">
          {/* ── Instructions ───────────────────────────────────────────── */}
          <section aria-labelledby="recipe-instructions-heading">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="recipe-instructions-heading" className="font-display text-2xl font-semibold text-foreground">
                {t(lang, 'recipe.instructions')}
              </h2>
              {completedSteps.size > 0 && (
                <span className="text-sm text-muted-foreground" role="status">
                  {t(lang, 'recipe.stepsCompleted', { completed: completedSteps.size, total: recipe.instructions.length })}
                </span>
              )}
            </div>
            <ol className="space-y-4" data-testid="instructions-list">
              {recipe.instructions.map((instruction) => {
                const done = completedSteps.has(instruction.step);
                const stepLabel = t(lang, 'recipe.stepLabel', { step: instruction.step });
                return (
                  <li
                    key={instruction.step}
                    className={cn('flex gap-4 rounded-lg border border-border p-4', done && 'bg-muted')}
                    data-step={instruction.step}
                  >
                    <span
                      className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-full font-semibold',
                        done ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary',
                      )}
                      aria-hidden="true"
                    >
                      {done ? <CheckIcon className="size-4" /> : instruction.step}
                    </span>
                    <div className="flex-1">
                      <p className="sr-only">{stepLabel}</p>
                      <p className={cn('text-foreground', done && 'text-muted-foreground line-through')}>
                        {getTranslated(instruction.text, lang)}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {instruction.time ? (
                          <>
                            <span className="text-sm text-muted-foreground">
                              {t(lang, 'recipe.stepMinutes', { minutes: instruction.time })}
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setTimer((previous) => ({ minutes: instruction.time ?? 0, label: stepLabel, run: (previous?.run ?? 0) + 1 }))}
                              aria-label={`${t(lang, 'recipe.startTimer')} — ${stepLabel}`}
                              data-testid={`timer-button-step-${instruction.step}`}
                            >
                              <TimerIcon className="size-4" aria-hidden="true" />
                              {t(lang, 'recipe.startTimer')}
                            </Button>
                          </>
                        ) : null}
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          aria-pressed={done}
                          onClick={() => toggleInSet(setCompletedSteps, instruction.step)}
                          aria-label={`${done ? t(lang, 'recipe.undoComplete') : t(lang, 'recipe.markComplete')} — ${stepLabel}`}
                        >
                          <CheckIcon className="size-4" aria-hidden="true" />
                          {done ? t(lang, 'recipe.undoComplete') : t(lang, 'recipe.markComplete')}
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* ── Nutrition ──────────────────────────────────────────────── */}
          <NutritionFacts nutrition={recipe.nutrition} baseServings={recipe.servings} servings={servings} lang={lang} />
        </div>
      </div>

      <AddToPlanDialog
        key={`plan-${plan.run}`}
        open={plan.open}
        onOpenChange={setPlanOpen}
        lang={lang}
        recipeName={name}
        servings={servings}
        defaultSlot={defaultPlanSlot(recipe.type)}
        initialDayIndex={plan.dayIndex}
        onConfirm={onAddToPlan}
      />

      <RecipeTimer
        key={`timer-${timer?.run ?? 0}`}
        open={timer !== null}
        onOpenChange={(open) => {
          if (!open) setTimer(null);
        }}
        minutes={timer?.minutes ?? 0}
        stepLabel={timer?.label}
        lang={lang}
      />

      <Toaster />
    </div>
  );
}

interface AddToPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: Locale;
  recipeName: string;
  servings: number;
  defaultSlot: PlanSlot;
  /** Monday = 0 … Sunday = 6. */
  initialDayIndex: number;
  onConfirm: (dayIndex: number, slot: PlanSlot) => void;
}

/** Monday = 0 … Sunday = 6 (the planner's week order). */
function todayIndex(now: Date = new Date()): number {
  return (now.getDay() + 6) % 7;
}

/** "Add to meal plan": pick a weekday and a meal slot, then write to `$planner`. */
function AddToPlanDialog({
  open,
  onOpenChange,
  lang,
  recipeName,
  servings,
  defaultSlot,
  initialDayIndex,
  onConfirm,
}: AddToPlanDialogProps) {
  const dayId = React.useId();
  const mealId = React.useId();
  // Initialised on mount; the island remounts the dialog (`key`) on every
  // opening so each one starts from today + the recipe's meal type.
  const [day, setDay] = React.useState<string>(WEEKDAYS[initialDayIndex] ?? WEEKDAYS[0]);
  const [slot, setSlot] = React.useState<PlanSlot>(defaultSlot);

  const dayItems = WEEKDAYS.map((value) => ({ value, label: t(lang, `planner.${value}`) }));
  const slotItems = PLAN_SLOTS.map((value) => ({ value, label: t(lang, `planner.${value}`) }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="add-to-plan-dialog">
        <DialogHeader>
          <DialogTitle>{t(lang, 'recipe.addToPlanner')}</DialogTitle>
          <DialogDescription>
            {t(lang, 'recipe.addToPlanDescription', { name: recipeName, servings })}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <div className="grid gap-2">
            <label htmlFor={dayId} className="text-sm font-medium text-foreground">
              {t(lang, 'recipe.chooseDay')}
            </label>
            <Select value={day} onValueChange={(value) => value && setDay(value as string)} items={dayItems}>
              <SelectTrigger id={dayId} data-testid="plan-day">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {dayItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <label htmlFor={mealId} className="text-sm font-medium text-foreground">
              {t(lang, 'recipe.chooseMeal')}
            </label>
            <Select value={slot} onValueChange={(value) => value && setSlot(value as PlanSlot)} items={slotItems}>
              <SelectTrigger id={mealId} data-testid="plan-meal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {slotItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>{t(lang, 'common.cancel')}</DialogClose>
          <Button
            type="button"
            onClick={() => onConfirm(Math.max(0, WEEKDAYS.indexOf(day as (typeof WEEKDAYS)[number])), slot)}
            data-testid="confirm-add-to-plan"
          >
            <CalendarPlusIcon className="size-4" aria-hidden="true" />
            {t(lang, 'common.add')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
