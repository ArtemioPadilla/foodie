import { useDraggable, useDroppable } from '@dnd-kit/core';
import { GripVerticalIcon, MinusIcon, PlusIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { getTranslated, localizedRoute, t, type Locale } from '@/i18n';
import { withBase } from '@/lib/href';
import { cn } from '@/lib/utils';
import type { MealSlot as MealSlotValue, Recipe } from '@/schemas';
import { removeRecipeFromPlan, setMealServings, WEEKDAYS, type MealLocation, type PlanSlot } from '@/stores/planner';
import { dayLabel, mealDraggableId, slotDroppableId, slotLabel, type DragData, type DropData } from './dnd';

export const MAX_SERVINGS = 20;

export interface MealSlotProps {
  lang: Locale;
  dayIndex: number;
  slot: PlanSlot;
  /** 0–1 meal for a main slot, any number of snacks. */
  meals: ReadonlyArray<MealSlotValue>;
  recipesById: ReadonlyMap<string, Recipe>;
  /** "+" — open the `RecipePicker` for this slot (the no-drag fallback). */
  onAdd: (dayIndex: number, slot: PlanSlot) => void;
}

/**
 * One droppable meal slot of one day (port of legacy `DroppableSlot` +
 * `DayMealSlot`). Filled slots list their meals as draggable cards with a
 * grip handle (pointer + keyboard), per-meal servings and remove; empty main
 * slots and the snacks slot offer a "+" that opens the picker.
 */
export function MealSlot({ lang, dayIndex, slot, meals, recipesById, onAdd }: MealSlotProps) {
  const drop: DropData = { dayIndex, slot };
  const { setNodeRef, isOver, active } = useDroppable({ id: slotDroppableId(dayIndex, slot), data: drop });
  const day = dayLabel(lang, dayIndex);
  const meal = slotLabel(lang, slot);
  const canAdd = slot === 'snacks' || meals.length === 0;

  return (
    <section
      ref={setNodeRef}
      aria-label={`${day} · ${meal}`}
      data-testid={`meal-slot-${WEEKDAYS[dayIndex]}-${slot}`}
      data-day-index={dayIndex}
      data-slot={slot}
      data-over={isOver ? 'true' : undefined}
      className={cn(
        'rounded-md border border-border bg-background p-2 transition-colors',
        meals.length === 0 && 'border-dashed',
        active && 'border-primary/40',
        isOver && 'border-primary bg-primary/10 ring-2 ring-primary',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{meal}</h4>
        {canAdd && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => onAdd(dayIndex, slot)}
            aria-label={t(lang, 'planner.addToSlotLabel', { day, meal })}
            data-testid="add-meal-button"
          >
            <PlusIcon className="size-4" aria-hidden="true" />
          </Button>
        )}
      </div>
      {meals.length === 0 ? (
        <p className="py-2 text-center text-xs text-muted-foreground">{t(lang, 'planner.emptySlot')}</p>
      ) : (
        <ul className="mt-1 space-y-1.5">
          {meals.map((value, index) => (
            <MealCard
              key={`${value.recipeId}-${index}`}
              lang={lang}
              location={slot === 'snacks' ? { dayIndex, slot, snackIndex: index } : { dayIndex, slot }}
              meal={value}
              recipe={recipesById.get(value.recipeId)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

interface MealCardProps {
  lang: Locale;
  location: MealLocation;
  meal: MealSlotValue;
  recipe: Recipe | undefined;
}

function MealCard({ lang, location, meal, recipe }: MealCardProps) {
  const name = recipe ? getTranslated(recipe.name, lang) : meal.recipeId;
  const day = dayLabel(lang, location.dayIndex);
  const mealName = slotLabel(lang, location.slot);
  const data: DragData = { kind: 'meal', recipeId: meal.recipeId, name, from: location };
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, isDragging } = useDraggable({
    id: mealDraggableId(location),
    data,
  });

  const onRemove = () => {
    removeRecipeFromPlan(location.dayIndex, location.slot, location.slot === 'snacks' ? location.snackIndex : undefined);
    toast({ title: t(lang, 'planner.mealRemoved', { name, day, meal: mealName }) });
  };

  return (
    <li
      ref={setNodeRef}
      data-testid="planned-meal"
      data-recipe-id={meal.recipeId}
      data-dragging={isDragging ? 'true' : undefined}
      className={cn(
        'flex items-start gap-1 rounded-md border border-border bg-card p-1.5 text-card-foreground shadow-sm',
        isDragging && 'opacity-50',
      )}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={t(lang, 'planner.dragMealLabel', { name, day, meal: mealName })}
        className="mt-0.5 flex size-6 shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
        data-testid="meal-drag-handle"
      >
        <GripVerticalIcon className="size-4" aria-hidden="true" />
      </button>
      <div className="min-w-0 flex-1">
        <a
          href={withBase(localizedRoute(`/recipes/${meal.recipeId}/`, lang))}
          className="line-clamp-2 text-sm font-medium text-foreground hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {name}
        </a>
        <div className="mt-1 flex items-center gap-1" data-testid="meal-servings">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-6"
            disabled={meal.servings <= 1}
            onClick={() => setMealServings(location, meal.servings - 1)}
            aria-label={t(lang, 'planner.decreaseMealServings', { name })}
          >
            <MinusIcon className="size-3" aria-hidden="true" />
          </Button>
          <span className="min-w-16 text-center text-xs tabular-nums text-muted-foreground" data-testid="meal-servings-value">
            {t(lang, 'planner.mealServings', { count: meal.servings })}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-6"
            disabled={meal.servings >= MAX_SERVINGS}
            onClick={() => setMealServings(location, meal.servings + 1)}
            aria-label={t(lang, 'planner.increaseMealServings', { name })}
          >
            <PlusIcon className="size-3" aria-hidden="true" />
          </Button>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-6 shrink-0"
        onClick={onRemove}
        aria-label={t(lang, 'planner.removeMeal', { name, day, meal: mealName })}
        data-testid="remove-meal"
      >
        <XIcon className="size-3.5" aria-hidden="true" />
      </Button>
    </li>
  );
}
