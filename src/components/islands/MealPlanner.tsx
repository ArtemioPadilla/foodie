import * as React from 'react';
import { useStore } from '@nanostores/react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { CalendarPlusIcon, GripVerticalIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toaster, toast } from '@/components/ui/toast';
import { getTranslated, LOCALES, t, type Locale } from '@/i18n';
import { useCatalog } from '@/lib/catalog/use-catalog';
import { getStartOfWeek } from '@/lib/domain/date';
import { parseDateKey, todayKey } from '@/lib/format-date';
import { useHydrated } from '@/lib/use-hydrated';
import type { MealPlan, Recipe } from '@/schemas';
import { $currentPlan, addRecipeToPlan, createPlan, moveMeal, type PlanSlot } from '@/stores/planner';
import ErrorBoundary from './ErrorBoundary';
import QueryProvider from './QueryProvider';
import { RecipePicker } from './RecipePicker';
import {
  dayLabel,
  plannerAnnouncements,
  plannerCollisionDetection,
  plannerScreenReaderInstructions,
  slotKeyboardCoordinates,
  slotLabel,
  type DragData,
  type DropData,
} from './MealPlanner/dnd';
import { MonthView, type MonthCursor } from './MealPlanner/MonthView';
import { PlannerControls } from './MealPlanner/PlannerControls';
import { RecipePanel } from './MealPlanner/RecipePanel';
import { WeekView } from './MealPlanner/WeekView';

/**
 * MealPlanner — the `/planner/` island (roadmap Issue 024, D8; port of legacy
 * `MealPlannerCalendar`, `WeekView`, `MonthView`, `DayMealSlot`,
 * `DraggableRecipe`, `DroppableSlot`, `ServingsAdjuster`, `PlannerControls`).
 *
 * - State: `$currentPlan` (`currentMealPlan` in localStorage, ADR 0002) via
 *   the store actions; the catalog through `useCatalog()` (offline-capable).
 * - Drag and drop: one `DndContext` (`@dnd-kit/core`, ADR 0010) with a
 *   `PointerSensor` (8 px activation so taps/scrolls never drag) and a
 *   `KeyboardSensor` whose arrows jump slot to slot; localised `aria-live`
 *   announcements. Drag a recipe from the side panel onto a slot to add it,
 *   drag a planned meal to move it (occupied slots swap).
 * - Fallback without drag: the "+" of every slot opens `RecipePicker`.
 * - `Tabs` week / month (`data-testid="week-view"` / `"month-view"` kept from
 *   the legacy e2e), week navigation, default + per-meal servings, copy /
 *   clear a day, create / save / clear the plan.
 * - Everything store-backed renders after hydration only (the server has no
 *   `localStorage`): SSR and the first client render show a skeleton.
 *   `Dialog`, `AlertDialog`, `DropdownMenu` and the `Toaster` live inside
 *   this single React root (compound components never span islands).
 */
export interface MealPlannerProps {
  lang: Locale;
  /** Test hook: pin "today" (defaults to the real date, read after hydration). */
  now?: Date;
}

export default function MealPlanner(props: MealPlannerProps) {
  return (
    <QueryProvider>
      <ErrorBoundary name="MealPlanner">
        <MealPlannerView {...props} />
      </ErrorBoundary>
    </QueryProvider>
  );
}

export function MealPlannerView({ lang, now }: MealPlannerProps) {
  const hydrated = useHydrated();
  const plan = useStore($currentPlan);

  let body: React.ReactNode;
  let status: 'loading' | 'empty' | 'ready';
  if (!hydrated) {
    status = 'loading';
    body = <PlannerSkeleton lang={lang} />;
  } else if (!plan) {
    status = 'empty';
    body = <NoPlan lang={lang} />;
  } else {
    status = 'ready';
    body = <PlannerBoard lang={lang} plan={plan} now={now} />;
  }

  return (
    <div data-testid="meal-planner" data-status={status} data-hydrated={hydrated ? 'true' : undefined}>
      {body}
      <Toaster />
    </div>
  );
}

function PlannerSkeleton({ lang }: { lang: Locale }) {
  return (
    <div className="space-y-4" aria-busy="true">
      <p className="sr-only">{t(lang, 'planner.loading')}</p>
      <Skeleton className="h-14 w-full" />
      <div className="grid gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <Skeleton className="h-96 w-full" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-80 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

function NoPlan({ lang }: { lang: Locale }) {
  const onCreate = () => {
    const name = Object.fromEntries(LOCALES.map((l) => [l, t(l, 'planner.planName')])) as MealPlan['name'];
    createPlan({ name });
    toast({ title: t(lang, 'planner.planCreated') });
  };
  return (
    <EmptyState
      icon={<CalendarPlusIcon aria-hidden="true" />}
      title={t(lang, 'planner.noPlan')}
      description={t(lang, 'planner.noPlanDescription')}
      action={
        <Button type="button" onClick={onCreate} data-testid="create-plan-button">
          <CalendarPlusIcon className="size-4" aria-hidden="true" />
          {t(lang, 'planner.createPlan')}
        </Button>
      }
      data-testid="planner-empty"
    />
  );
}

type View = 'week' | 'month';

function PlannerBoard({ lang, plan, now }: { lang: Locale; plan: MealPlan; now?: Date }) {
  const catalog = useCatalog();
  const today = React.useMemo(() => todayKey(now), [now]);
  const currentWeekStart = React.useMemo(() => getStartOfWeek(today), [today]);
  const [view, setView] = React.useState<View>('week');
  const [weekStart, setWeekStart] = React.useState(currentWeekStart);
  const [cursor, setCursor] = React.useState<MonthCursor>(() => {
    const d = parseDateKey(currentWeekStart);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [picker, setPicker] = React.useState<{ open: boolean; dayIndex: number; slot: PlanSlot }>({
    open: false,
    dayIndex: 0,
    slot: 'breakfast',
  });
  const [dragging, setDragging] = React.useState<{ data: DragData; pointer: boolean } | null>(null);

  const recipesById = React.useMemo(
    () => new Map<string, Recipe>(catalog.recipes.map((r) => [r.id, r] as const)),
    [catalog.recipes],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: slotKeyboardCoordinates }),
  );
  const accessibility = React.useMemo(
    () => ({ announcements: plannerAnnouncements(lang), screenReaderInstructions: plannerScreenReaderInstructions(lang) }),
    [lang],
  );

  const onDragStart = ({ active, activatorEvent }: DragStartEvent) => {
    const data = active.data.current as DragData | undefined;
    if (data) setDragging({ data, pointer: !(activatorEvent instanceof KeyboardEvent) });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDragging(null);
    const drag = active.data.current as DragData | undefined;
    const drop = over?.data.current as DropData | undefined;
    if (!drag || !drop) return;
    if (drag.kind === 'recipe') addRecipeToPlan(drop.dayIndex, drop.slot, drag.recipeId, plan.servings);
    else moveMeal(drag.from, drop);
  };

  const openPicker = (dayIndex: number, slot: PlanSlot) => setPicker({ open: true, dayIndex, slot });

  const onPick = (recipe: Recipe) => {
    const { dayIndex, slot } = picker;
    addRecipeToPlan(dayIndex, slot, recipe.id, plan.servings);
    setPicker((previous) => ({ ...previous, open: false }));
    toast({
      title: t(lang, 'planner.addedToSlot', {
        name: getTranslated(recipe.name, lang),
        day: dayLabel(lang, dayIndex),
        meal: slotLabel(lang, slot),
      }),
    });
  };

  const openWeekOf = (dateKey: string) => {
    setWeekStart(getStartOfWeek(dateKey));
    setView('week');
  };

  return (
    <div className="space-y-4">
      <PlannerControls
        lang={lang}
        plan={plan}
        weekStart={weekStart}
        currentWeekStart={currentWeekStart}
        onWeekChange={setWeekStart}
      />

      <Tabs value={view} onValueChange={(value) => setView(value as View)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold text-foreground" data-testid="plan-name">
            {getTranslated(plan.name, lang)}
          </h2>
          <TabsList aria-label={t(lang, 'planner.viewSwitcher')}>
            <TabsTrigger value="week" data-testid="week-tab">
              {t(lang, 'planner.weekView')}
            </TabsTrigger>
            <TabsTrigger value="month" data-testid="month-tab">
              {t(lang, 'planner.monthView')}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="week" className="mt-4">
          <DndContext
            id="meal-planner"
            sensors={sensors}
            collisionDetection={plannerCollisionDetection}
            accessibility={accessibility}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragCancel={() => setDragging(null)}
          >
            <div className="grid gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
              <RecipePanel lang={lang} recipes={catalog.recipes} status={catalog.status} />
              <WeekView
                lang={lang}
                plan={plan}
                weekStart={weekStart}
                today={today}
                recipesById={recipesById}
                onAdd={openPicker}
              />
            </div>
            {/* Pointer drags follow the cursor with an overlay (mounted only for
                them: an overlay always renders its positioned box, and keyboard
                drags must collide with the source's own rect, which jumps from
                slot centre to slot centre). Keyboard drags leave the source in
                place and highlight the target slot. */}
            {dragging?.pointer ? (
              <DragOverlay dropAnimation={null}>
                <div className="flex max-w-60 items-center gap-2 rounded-md border border-primary bg-card px-3 py-2 text-sm font-medium text-card-foreground shadow-lg">
                  <GripVerticalIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                  <span className="truncate">{dragging.data.name}</span>
                </div>
              </DragOverlay>
            ) : null}
          </DndContext>
        </TabsContent>

        <TabsContent value="month" className="mt-4">
          <MonthView lang={lang} plan={plan} cursor={cursor} onCursorChange={setCursor} onPickDate={openWeekOf} today={today} />
        </TabsContent>
      </Tabs>

      <RecipePicker
        open={picker.open}
        onOpenChange={(open) => setPicker((previous) => ({ ...previous, open }))}
        lang={lang}
        recipes={catalog.recipes}
        targetLabel={t(lang, 'planner.pickerDescription', {
          day: dayLabel(lang, picker.dayIndex),
          meal: slotLabel(lang, picker.slot),
        })}
        onSelect={onPick}
      />
    </div>
  );
}
