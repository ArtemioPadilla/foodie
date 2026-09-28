/**
 * Drag-and-drop model of the `MealPlanner` island (roadmap Issue 024, D8,
 * ADR 0010): ids and payloads of draggables/droppables, the collision
 * strategy, the keyboard coordinate getter and the localised screen-reader
 * announcements. Pure functions over `@dnd-kit/core` types — no React.
 */
import {
  closestCenter,
  pointerWithin,
  KeyboardCode,
  type Announcements,
  type ClientRect,
  type CollisionDetection,
  type KeyboardCoordinateGetter,
  type ScreenReaderInstructions,
} from '@dnd-kit/core';
import { t, type Locale } from '@/i18n';
import { WEEKDAYS, type MealLocation, type PlanSlot } from '@/stores/planner';

export const PLAN_SLOTS: ReadonlyArray<PlanSlot> = ['breakfast', 'lunch', 'dinner', 'snacks'];

/** What is being dragged: a catalog recipe from the side panel, or a meal already in the plan. */
export type DragData =
  | { kind: 'recipe'; recipeId: string; name: string }
  | { kind: 'meal'; recipeId: string; name: string; from: MealLocation };

/** Where it can land: one slot of one day. */
export interface DropData {
  dayIndex: number;
  slot: PlanSlot;
}

export const slotDroppableId = (dayIndex: number, slot: PlanSlot) => `slot:${dayIndex}:${slot}`;
export const recipeDraggableId = (recipeId: string) => `recipe:${recipeId}`;
export const mealDraggableId = ({ dayIndex, slot, snackIndex }: MealLocation) =>
  `meal:${dayIndex}:${slot}:${snackIndex ?? 0}`;

/** "Monday" / "lunes" … for plan day `dayIndex` (plans always start on Monday). */
export function dayLabel(lang: Locale, dayIndex: number): string {
  const day = WEEKDAYS[dayIndex];
  return day ? t(lang, `planner.${day}`) : String(dayIndex + 1);
}

export function slotLabel(lang: Locale, slot: PlanSlot): string {
  return t(lang, `planner.${slot}`);
}

// ── Collision detection ─────────────────────────────────────────────────────

function containsPoint(rect: ClientRect, x: number, y: number): boolean {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

/**
 * Pointer drags: the slot under the pointer (nothing when the pointer is
 * outside every slot, so dropping on the page background is a no-op).
 * Keyboard drags (no pointer coordinates): the slot whose rect contains the
 * centre of the dragged item — the coordinate getter below always lands that
 * centre exactly on a slot centre, and before the first arrow press nothing
 * is "over" (unless a meal starts inside its own slot).
 */
export const plannerCollisionDetection: CollisionDetection = (args) => {
  if (args.pointerCoordinates) return pointerWithin(args);
  const rect = args.collisionRect;
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  return closestCenter(args).filter((collision) => {
    const target = args.droppableRects.get(collision.id);
    return target ? containsPoint(target, cx, cy) : false;
  });
};

// ── Keyboard ────────────────────────────────────────────────────────────────

const DIRECTIONS: Partial<Record<string, { dx: number; dy: number }>> = {
  [KeyboardCode.Right]: { dx: 1, dy: 0 },
  [KeyboardCode.Left]: { dx: -1, dy: 0 },
  [KeyboardCode.Down]: { dx: 0, dy: 1 },
  [KeyboardCode.Up]: { dx: 0, dy: -1 },
};

/**
 * Arrow keys jump from slot to slot instead of nudging pixels: the next slot
 * is the nearest droppable whose centre lies in the pressed direction
 * (off-axis distance weighs double, so → stays on the row and ↓ in the
 * column whatever the responsive grid looks like). Returns the top-left the
 * dragged item needs for its centre to sit on that slot's centre.
 */
export const slotKeyboardCoordinates: KeyboardCoordinateGetter = (event, { context }) => {
  const direction = DIRECTIONS[event.code];
  const rect = context.collisionRect;
  if (!direction || !rect) return undefined;
  event.preventDefault();

  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  let best: { score: number; x: number; y: number } | null = null;

  for (const container of context.droppableContainers.getEnabled()) {
    const target = context.droppableRects.get(container.id);
    if (!target) continue;
    const tx = target.left + target.width / 2;
    const ty = target.top + target.height / 2;
    const along = (tx - cx) * direction.dx + (ty - cy) * direction.dy;
    if (along <= 1) continue; // behind, or on the same line
    const across = Math.abs(direction.dx !== 0 ? ty - cy : tx - cx);
    const score = along + across * 2;
    if (!best || score < best.score) best = { score, x: tx, y: ty };
  }

  if (!best) return undefined;
  return { x: best.x - rect.width / 2, y: best.y - rect.height / 2 };
};

// ── Screen readers ──────────────────────────────────────────────────────────

function dragName(data: unknown): string {
  return (data as DragData | undefined)?.name ?? '';
}

function dropPlace(lang: Locale, data: unknown): { day: string; meal: string } | null {
  const drop = data as DropData | undefined;
  if (!drop || typeof drop.dayIndex !== 'number') return null;
  return { day: dayLabel(lang, drop.dayIndex), meal: slotLabel(lang, drop.slot) };
}

export function plannerScreenReaderInstructions(lang: Locale): ScreenReaderInstructions {
  return { draggable: t(lang, 'planner.dnd.instructions') };
}

/** Localised `aria-live` announcements for every drag phase. */
export function plannerAnnouncements(lang: Locale): Announcements {
  return {
    onDragStart: ({ active }) => t(lang, 'planner.dnd.pickedUp', { name: dragName(active.data.current) }),
    onDragOver: ({ active, over }) => {
      const name = dragName(active.data.current);
      const place = dropPlace(lang, over?.data.current);
      return place ? t(lang, 'planner.dnd.over', { name, ...place }) : t(lang, 'planner.dnd.notOver', { name });
    },
    onDragEnd: ({ active, over }) => {
      const name = dragName(active.data.current);
      const place = dropPlace(lang, over?.data.current);
      return place ? t(lang, 'planner.dnd.dropped', { name, ...place }) : t(lang, 'planner.dnd.droppedNowhere', { name });
    },
    onDragCancel: ({ active }) => t(lang, 'planner.dnd.cancelled', { name: dragName(active.data.current) }),
  };
}
