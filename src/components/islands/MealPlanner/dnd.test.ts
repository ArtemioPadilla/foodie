import { describe, expect, it } from 'vitest';
import type { ClientRect, KeyboardCoordinateGetter } from '@dnd-kit/core';
import {
  mealDraggableId,
  plannerAnnouncements,
  plannerCollisionDetection,
  plannerScreenReaderInstructions,
  recipeDraggableId,
  slotDroppableId,
  slotKeyboardCoordinates,
  type DragData,
  type DropData,
} from './dnd';

/** Pure tests of the planner's dnd model (roadmap Issue 024). */

const box = (left: number, top: number, width = 100, height = 100): ClientRect => ({
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
});

// A 3×2 grid of slots: columns at x = 0/200/400, rows at y = 0/200.
const rects = new Map<string, ClientRect>([
  ['a', box(0, 0)],
  ['b', box(200, 0)],
  ['c', box(400, 0)],
  ['d', box(0, 200)],
  ['e', box(200, 200)],
  ['f', box(400, 200)],
]);
const containers = { getEnabled: () => [...rects.keys()].map((id) => ({ id })) };

type Args = Parameters<KeyboardCoordinateGetter>[1];

function move(code: string, from: ClientRect) {
  const event = { code, preventDefault: () => {} } as unknown as KeyboardEvent;
  const context = { collisionRect: from, droppableRects: rects, droppableContainers: containers } as unknown as Args['context'];
  return slotKeyboardCoordinates(event, { active: 'x', currentCoordinates: { x: from.left, y: from.top }, context });
}

describe('slotKeyboardCoordinates', () => {
  it('jumps to the neighbouring slot centre in the arrow direction (top-left of the dragged box)', () => {
    expect(move('ArrowRight', box(30, 40, 40, 20))).toEqual({ x: 230, y: 40 }); // → b, centre (250, 50)
    expect(move('ArrowDown', box(230, 40, 40, 20))).toEqual({ x: 230, y: 240 }); // ↓ e
    expect(move('ArrowLeft', box(430, 240, 40, 20))).toEqual({ x: 230, y: 240 }); // ← e
    expect(move('ArrowUp', box(230, 240, 40, 20))).toEqual({ x: 230, y: 40 }); // ↑ b
  });

  it('prefers the same row / column over a closer diagonal', () => {
    // From the centre of a, → must land on b (same row), not on e.
    expect(move('ArrowRight', box(25, 25, 50, 50))).toEqual({ x: 225, y: 25 });
  });

  it('returns nothing at the edge or for other keys', () => {
    expect(move('ArrowLeft', box(0, 0))).toBeUndefined();
    expect(move('KeyA', box(0, 0))).toBeUndefined();
  });
});

describe('plannerCollisionDetection', () => {
  const droppableContainers = [...rects.keys()].map((id) => ({ id, data: { current: undefined } })) as never;
  const detect = (collisionRect: ClientRect, pointerCoordinates: { x: number; y: number } | null) =>
    plannerCollisionDetection({
      active: { id: 'x' } as never,
      collisionRect,
      droppableRects: rects,
      droppableContainers,
      pointerCoordinates,
    }).map((c) => c.id);

  it('keyboard: only the slot containing the dragged centre', () => {
    expect(detect(box(225, 225, 50, 50), null)).toEqual(['e']);
    expect(detect(box(120, 120, 40, 40), null)).toEqual([]); // centre (140, 140) is between slots
  });

  it('pointer: the slot under the pointer, nothing outside', () => {
    expect(detect(box(0, 0, 10, 10), { x: 450, y: 250 })).toEqual(['f']);
    expect(detect(box(0, 0, 10, 10), { x: 150, y: 150 })).toEqual([]);
  });
});

describe('ids and announcements', () => {
  it('builds stable ids', () => {
    expect(slotDroppableId(2, 'dinner')).toBe('slot:2:dinner');
    expect(recipeDraggableId('rec_001')).toBe('recipe:rec_001');
    expect(mealDraggableId({ dayIndex: 1, slot: 'snacks', snackIndex: 2 })).toBe('meal:1:snacks:2');
    expect(mealDraggableId({ dayIndex: 1, slot: 'lunch' })).toBe('meal:1:lunch:0');
  });

  it('announces every phase in the page language', () => {
    const drag: DragData = { kind: 'recipe', recipeId: 'rec_001', name: 'Huevos Revueltos' };
    const drop: DropData = { dayIndex: 4, slot: 'lunch' };
    const active = { id: 'recipe:rec_001', data: { current: drag } } as never;
    const over = { id: 'slot:4:lunch', data: { current: drop } } as never;
    const es = plannerAnnouncements('es');
    expect(es.onDragStart({ active })).toBe('Has cogido Huevos Revueltos.');
    expect(es.onDragOver({ active, over })).toBe('Huevos Revueltos está sobre Viernes Comida.');
    expect(es.onDragOver({ active, over: null })).toBe('Huevos Revueltos no está sobre ninguna comida.');
    expect(es.onDragEnd({ active, over })).toBe('Huevos Revueltos se soltó en Viernes Comida.');
    expect(es.onDragEnd({ active, over: null })).toMatch(/No ha cambiado nada/);
    expect(es.onDragCancel({ active, over: null })).toBe('Se canceló mover Huevos Revueltos.');
    expect(plannerScreenReaderInstructions('fr').draggable).toMatch(/Espace ou Entrée/);
  });
});
