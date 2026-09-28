# 0010 — Use `@dnd-kit/core` for the meal planner's drag and drop

## Status

`Accepted`

Date: 2026-09-28

> **Numbering.** The roadmap (Issue 024, decision D8) calls this "ADR 0003" of
> the _Foodie_ series (ADR 0001 = migration, ADR 0002 = local-first user data).
> `0003` is already taken in this folder by the inherited Inceptor ADR
> `0003-centinela-verdict-tokens.md`, so this file takes the next free number,
> **0010**. Read "ADR 0003" in the roadmap as this file.

## Context

The legacy planner (`main:src/components/planner/*`) used `react-dnd` 16 with
`react-dnd-html5-backend`. Porting it to Inceptor (React 19 islands) raises
three problems:

1. **Peers.** `react-dnd` 16 declares React ≤ 18 peers and has not had a
   release since 2022; installing it next to React 19 needs `--legacy-peer-deps`
   or overrides, which the template's CI (`npm ci`) rejects.
2. **Accessibility.** The HTML5 backend has no keyboard or screen-reader story:
   the legacy planner could only be filled with a mouse (the "+" picker was the
   de-facto fallback). Inceptor's a11y gates (`axe`, `keyboard-nav.spec.ts`)
   and the ethics checklist expect every interaction to be operable from the
   keyboard.
3. **Touch.** The HTML5 backend does not fire on touch screens at all; the
   legacy app shipped `touchAction: none` on draggables, which also blocked
   scrolling on phones.

Inceptor's curated stack has no drag-and-drop primitive. Its own ROADMAP names
`@dnd-kit` as the intended one, and the Foodie roadmap (D8) already lists
`@dnd-kit/*` as one of the three dependencies allowed on top of the stack
(with `firebase` and one of `lz-string`/`fflate`).

## Decision

Add **`@dnd-kit/core`** (≈10 KB gzip, MIT, React ≥ 16.8 peers including 19)
and **`@dnd-kit/utilities`** (the `CSS.Translate` helper, ≈1 KB) — nothing
else from the family (`@dnd-kit/sortable`/`modifiers` are not needed: the
planner moves items between fixed slots, it does not reorder lists).

- Used **only** by the `MealPlanner` island (`src/components/islands/MealPlanner.tsx`
  and `src/components/islands/MealPlanner/`),
  hydrated `client:load` on `/planner/` ×3 locales; no other page pays for it.
- One `DndContext` per island (it is intra-island React context, which the
  Inceptor rules allow) with two sensors:
  - `PointerSensor` with `activationConstraint: { distance: 8 }` so a tap or
    a vertical scroll on a phone never starts a drag (roadmap risk table);
  - `KeyboardSensor` with a custom coordinate getter that jumps between slot
    centres (arrows), `Space`/`Enter` to pick up and drop, `Esc` to cancel.
- Screen-reader support through dnd-kit's built-in `aria-live` region with
  **localised** announcements and instructions (`planner.dnd.*` in the
  EN/ES/FR dictionaries).
- Drag and drop is never the only way: every empty slot (and the snacks slot)
  has a "+" button that opens the `RecipePicker` dialog, and every planned
  meal has explicit remove and servings buttons. Below `lg` the side-panel
  rows keep `touch-action: manipulation`, so on phones the list scrolls and
  the picker is the way in.
- A `DragOverlay` follows the pointer during pointer drags only; keyboard
  drags keep the source in place and highlight the target slot.

### Alternatives considered

- **`react-dnd` 16** — rejected: React 19 peer conflict, no keyboard support,
  no touch backend without a second package.
- **Native HTML5 drag events** — rejected: no touch, no keyboard, and we would
  re-implement collision detection and announcements by hand.
- **`@atlaskit/pragmatic-drag-and-drop`** — smaller core, but accessibility is
  left to the app ("provide alternative controls") and it is not the library
  the Inceptor roadmap standardises on.
- **`@dnd-kit/react` (0.x)** — the next-generation API is still pre-1.0;
  revisit when it is stable.

## Consequences

**Positive**

- Keyboard and screen-reader users can plan meals by drag and drop, not only
  through the picker.
- Touch devices get working drag without blocking page scroll.
- No peer-dependency overrides; `npm ci` stays clean.

**Negative**

- Two more runtime packages to track (both mature, stable 6.x / 3.x lines).
- Unit tests in jsdom need synthetic element rects (jsdom has no layout) to
  exercise collision detection; the helper lives next to the planner tests.

**Neutral**

- Closes the list of dependencies the roadmap allows on top of Inceptor's
  stack for Phase 3; any further addition needs its own ADR.

## Supersedes

None. (Replaces the legacy app's `react-dnd` usage, which never had an ADR.)

## References

- Roadmap `docs/superpowers/specs/2026-09-27-foodie-inceptor-migration-roadmap.md`
  — D8, Issue 024, risk table ("`@dnd-kit` en móvil").
- [ADR 0001](./0001-foodie-inceptor-migration.md), [ADR 0002](./0002-local-first-user-data.md)
  (the planner writes `currentMealPlan` under that ADR).
- https://docs.dndkit.com/ — sensors, accessibility, collision detection.
