// @vitest-environment jsdom
import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { withBase } from '@/lib/href';
import { CATALOG_FILES } from '@/lib/catalog/use-catalog';
import { CategoriesFileSchema } from '@/schemas';
import { $currentPlan, $savedPlans, addRecipeToPlan, CURRENT_PLAN_KEY } from '@/stores/planner';
import { makeIngredient, makePlan, makeRecipe, mockBeverages, mockIngredientCategories } from '@/tests/fixtures/foodie-domain';
import { MealPlannerView } from './MealPlanner';
import { PLAN_SLOTS } from './MealPlanner/dnd';
import { closeToastsAfterEach } from '@/tests/fixtures/toast-timers';

// RecipePicker is React.lazy (roadmap #045). Warm its module once so the first
// test that opens it does not race Vite's cold transform of the chunk against
// Testing Library's 1 s findBy timeout (it did on a GitHub runner, PR #36).
beforeAll(async () => {
  await import('./RecipePicker');
});

closeToastsAfterEach();

/**
 * jsdom tests of the `/planner/` island (roadmap Issue 024): hydration
 * parity, create/clear plan, tabs week/month, week navigation, the "+"
 * picker fallback, per-meal and default servings, copy/clear a day, and the
 * keyboard drag and drop (arrows + Enter) with its `aria-live`
 * announcements — all through `$currentPlan`.
 *
 * jsdom has no layout, so `getBoundingClientRect` is stubbed with a synthetic
 * grid: day d / slot s sits at (300 + 200·d, 150·s), panel row i at (0, 50·i).
 */

const eggs = makeRecipe(); // rec_001 · Scrambled Eggs
const tacos = makeRecipe({ id: 'rec_002', name: { en: 'Beef Tacos', es: 'Tacos de Res', fr: 'Tacos au Bœuf' }, type: 'dinner', totalTime: 35 });
const soup = makeRecipe({ id: 'rec_003', name: { en: 'Onion Soup', es: 'Sopa de Cebolla', fr: 'Soupe à l’Oignon' }, type: 'lunch', totalTime: 60 });

const payloads: Record<string, unknown> = {
  [CATALOG_FILES.recipes]: { recipes: [eggs, tacos, soup] },
  [CATALOG_FILES.ingredients]: { ingredients: [makeIngredient({ id: 'ing_001' }), makeIngredient({ id: 'ing_002' })] },
  [CATALOG_FILES.beverages]: mockBeverages,
  [CATALOG_FILES.categories]: CategoriesFileSchema.parse({
    mealTypes: [{ id: 'breakfast', name: { en: 'Breakfast', es: 'Desayuno', fr: 'Petit-déjeuner' } }],
    cuisines: [{ id: 'american', name: { en: 'American', es: 'Americana', fr: 'Américaine' } }],
    dietaryTags: [{ id: 'vegetarian', name: { en: 'Vegetarian', es: 'Vegetariano', fr: 'Végétarien' } }],
    ingredientCategories: mockIngredientCategories,
  }),
};

function installFetch() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) => {
      const path = String(input).replace(withBase('/'), '/');
      const ok = path in payloads;
      return { ok, status: ok ? 200 : 404, statusText: ok ? 'OK' : 'Not Found', json: async () => payloads[path] } as unknown as Response;
    }),
  );
}

// Wednesday 2026-09-30 → the displayed week starts Monday 2026-09-28.
const NOW = new Date(2026, 8, 30, 12);

function renderPlanner(lang: 'en' | 'es' | 'fr' = 'en') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity, staleTime: Infinity } } });
  return render(
    <QueryClientProvider client={client}>
      <MealPlannerView lang={lang} now={NOW} />
    </QueryClientProvider>,
  );
}

const plan = () => $currentPlan.get();
const slot = (day: string, meal: string) => screen.getByTestId(`meal-slot-${day}-${meal}`);

// ── Synthetic layout ─────────────────────────────────────────────────────────

function rect(left: number, top: number, width: number, height: number): DOMRect {
  return { left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) } as DOMRect;
}

function syntheticRect(this: Element): DOMRect {
  const slotEl = this.matches('[data-slot]') ? this : this.matches('[data-testid="planned-meal"]') ? this.closest('[data-slot]') : null;
  if (slotEl) {
    const d = Number(slotEl.getAttribute('data-day-index'));
    const s = PLAN_SLOTS.indexOf(slotEl.getAttribute('data-slot') as (typeof PLAN_SLOTS)[number]);
    const box = rect(300 + d * 200, s * 150, 180, 140);
    return slotEl === this ? box : rect(box.left + 10, box.top + 30, 160, 60);
  }
  const panelIndex = this.getAttribute('data-panel-index');
  if (panelIndex !== null) return rect(0, Number(panelIndex) * 50, 200, 40);
  return rect(0, 0, 0, 0);
}

let restoreRect: (() => void) | undefined;

beforeEach(() => {
  installFetch();
  localStorage.clear();
  $currentPlan.set(null);
  $savedPlans.set([]);
  const original = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = syntheticRect;
  restoreRect = () => {
    Element.prototype.getBoundingClientRect = original;
  };
});

afterEach(() => {
  restoreRect?.();
  vi.unstubAllGlobals();
});

async function ready() {
  await waitFor(() => expect(screen.getByTestId('meal-planner')).toHaveAttribute('data-status', 'ready'));
  await waitFor(() => expect(screen.getAllByTestId('draggable-recipe')).toHaveLength(3));
}

/** Let dnd-kit attach its document listeners / measure (it defers with a timeout). */
async function tick() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function press(element: Element, code: string, key = code) {
  fireEvent.keyDown(element, { code, key });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('MealPlanner — hydration and plan lifecycle', () => {
  it('server-renders a loading skeleton whatever localStorage holds (no hydration mismatch)', () => {
    $currentPlan.set(makePlan());
    const client = new QueryClient();
    const html = renderToString(
      <QueryClientProvider client={client}>
        <MealPlannerView lang="en" />
      </QueryClientProvider>,
    );
    expect(html).toContain('data-status="loading"');
    expect(html).not.toContain('week-view');
  });

  it('offers to create a plan when there is none, then shows the 7-day week', async () => {
    renderPlanner();
    await waitFor(() => expect(screen.getByTestId('meal-planner')).toHaveAttribute('data-status', 'empty'));
    expect(screen.getByText('No Meal Plan')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('create-plan-button'));
    expect(plan()?.days).toHaveLength(7);
    expect(plan()?.name).toEqual({ en: 'My Meal Plan', es: 'Mi plan de comidas', fr: 'Mon plan de repas' });
    expect(JSON.parse(localStorage.getItem(CURRENT_PLAN_KEY) ?? 'null')?.id).toBe(plan()?.id);
    expect(screen.getByTestId('week-view')).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(7);
    expect(screen.getByTestId('plan-name')).toHaveTextContent('My Meal Plan');
  });

  it('clears the plan only after the alert-dialog confirmation', async () => {
    $currentPlan.set(makePlan());
    renderPlanner();
    await ready();
    await userEvent.click(screen.getByTestId('clear-plan'));
    const dialog = await screen.findByTestId('clear-plan-dialog');
    expect(dialog).toHaveTextContent('Fixture Plan');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(plan()).not.toBeNull();

    await userEvent.click(screen.getByTestId('clear-plan'));
    await userEvent.click(await screen.findByTestId('confirm-clear-plan'));
    expect(plan()).toBeNull();
    await waitFor(() => expect(screen.getByTestId('meal-planner')).toHaveAttribute('data-status', 'empty'));
  });
});

describe('MealPlanner — views and navigation', () => {
  it('switches between the week and month tabs and opens a week from a month date', async () => {
    const p = makePlan();
    p.days[0]!.meals.lunch = { recipeId: 'rec_003', servings: 2 };
    $currentPlan.set(p);
    renderPlanner();
    await ready();
    expect(screen.getByTestId('week-range')).toHaveTextContent('Sep 28 – Oct 4');

    await userEvent.click(screen.getByRole('tab', { name: 'Month View' }));
    const month = await screen.findByTestId('month-view');
    expect(screen.queryByTestId('week-view')).not.toBeInTheDocument();
    expect(month).toHaveTextContent('September 2026');
    // Mondays carry the plan's Monday meals; today is marked.
    expect(within(month).getByRole('button', { name: 'Monday, September 14: 1 meal planned' })).toBeInTheDocument();
    expect(within(month).getByRole('button', { name: /Wednesday, September 30/ })).toHaveAttribute('aria-current', 'date');

    await userEvent.click(within(month).getByRole('button', { name: 'Monday, September 14: 1 meal planned' }));
    expect(await screen.findByTestId('week-view')).toBeInTheDocument();
    expect(screen.getByTestId('week-range')).toHaveTextContent('Sep 14 – Sep 20');
  });

  it('navigates weeks and returns to the current one', async () => {
    $currentPlan.set(makePlan());
    renderPlanner();
    await ready();
    expect(screen.getByTestId('current-week')).toBeDisabled();
    await userEvent.click(screen.getByTestId('next-week'));
    expect(screen.getByTestId('week-range')).toHaveTextContent('Oct 5 – Oct 11');
    expect(within(screen.getByTestId('day-card-monday')).getByText('Oct 5')).toBeInTheDocument();
    await userEvent.click(screen.getByTestId('previous-week'));
    await userEvent.click(screen.getByTestId('previous-week'));
    expect(screen.getByTestId('week-range')).toHaveTextContent('Sep 21 – Sep 27');
    await userEvent.click(screen.getByTestId('current-week'));
    expect(screen.getByTestId('week-range')).toHaveTextContent('Sep 28 – Oct 4');
  });

  it('renders every label in the page language', async () => {
    $currentPlan.set(makePlan());
    renderPlanner('es');
    await waitFor(() => expect(screen.getByTestId('meal-planner')).toHaveAttribute('data-status', 'ready'));
    expect(screen.getByRole('tab', { name: 'Vista Mensual' })).toBeInTheDocument();
    expect(screen.getByTestId('plan-name')).toHaveTextContent('Plan de prueba');
    expect(within(slot('monday', 'breakfast')).getByRole('button', { name: /Añadir una receta a Lunes Desayuno/i })).toBeInTheDocument();
  });
});

describe('MealPlanner — slots, servings and days', () => {
  it('"+" opens the RecipePicker and adds the chosen recipe with the default servings', async () => {
    $currentPlan.set(makePlan({ servings: 3 }));
    renderPlanner();
    await ready();
    await userEvent.click(within(slot('tuesday', 'dinner')).getByTestId('add-meal-button'));
    const picker = await screen.findByTestId('recipe-picker');
    expect(picker).toHaveTextContent('Tuesday · Dinner');
    await userEvent.type(within(picker).getByTestId('recipe-picker-search'), 'taco');
    expect(within(picker).getAllByTestId('recipe-picker-add')).toHaveLength(1);
    await userEvent.click(within(picker).getByRole('button', { name: 'Add Beef Tacos' }));

    expect(plan()?.days[1]?.meals.dinner).toEqual({ recipeId: 'rec_002', servings: 3 });
    await waitFor(() => expect(screen.queryByTestId('recipe-picker')).not.toBeInTheDocument());
    expect(within(slot('tuesday', 'dinner')).getByText('Beef Tacos')).toBeInTheDocument();
    expect(within(slot('tuesday', 'dinner')).queryByTestId('add-meal-button')).not.toBeInTheDocument();
    expect(await screen.findByText('Beef Tacos added to Tuesday Dinner')).toBeInTheDocument();
  });

  it('adjusts per-meal servings, removes a meal and keeps snacks addable', async () => {
    $currentPlan.set(makePlan());
    addRecipeToPlan(0, 'breakfast', 'rec_001', 2);
    addRecipeToPlan(0, 'snacks', 'rec_003', 1);
    renderPlanner();
    await ready();

    const breakfast = slot('monday', 'breakfast');
    await userEvent.click(within(breakfast).getByRole('button', { name: 'More servings of Scrambled Eggs' }));
    expect(plan()?.days[0]?.meals.breakfast?.servings).toBe(3);
    expect(within(breakfast).getByTestId('meal-servings-value')).toHaveTextContent('3 servings');
    await userEvent.click(within(breakfast).getByRole('button', { name: 'Fewer servings of Scrambled Eggs' }));
    await userEvent.click(within(breakfast).getByRole('button', { name: 'Fewer servings of Scrambled Eggs' }));
    expect(within(breakfast).getByTestId('meal-servings-value')).toHaveTextContent('1 serving');
    expect(within(breakfast).getByRole('button', { name: 'Fewer servings of Scrambled Eggs' })).toBeDisabled();

    expect(within(slot('monday', 'snacks')).getByTestId('add-meal-button')).toBeInTheDocument();
    await userEvent.click(within(breakfast).getByRole('button', { name: 'Remove Scrambled Eggs from Monday Breakfast' }));
    expect(plan()?.days[0]?.meals.breakfast).toBeUndefined();
    expect(plan()?.days[0]?.meals.snacks).toHaveLength(1);
    expect(within(slot('monday', 'breakfast')).getByTestId('add-meal-button')).toBeInTheDocument();
  });

  it('changes the default servings used for new meals', async () => {
    $currentPlan.set(makePlan());
    renderPlanner();
    await ready();
    const group = screen.getByTestId('global-servings');
    await userEvent.click(within(group).getByRole('button', { name: 'More default servings' }));
    await userEvent.click(within(group).getByRole('button', { name: 'More default servings' }));
    expect(plan()?.servings).toBe(4);
    expect(screen.getByTestId('global-servings-value')).toHaveTextContent('4');
  });

  it('copies a day onto another and clears a day from the day menu', async () => {
    $currentPlan.set(makePlan());
    addRecipeToPlan(0, 'lunch', 'rec_003', 2);
    renderPlanner();
    await ready();

    await userEvent.click(screen.getByTestId('day-actions-monday'));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Friday' }));
    expect(plan()?.days[4]?.meals.lunch).toEqual({ recipeId: 'rec_003', servings: 2 });
    expect(await screen.findByText('Monday copied to Friday')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('day-actions-friday'));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Clear Day' }));
    expect(plan()?.days[4]?.meals).toEqual({});
    expect(plan()?.days[0]?.meals.lunch?.recipeId).toBe('rec_003');
  });
});

describe('MealPlanner — keyboard drag and drop (@dnd-kit KeyboardSensor)', () => {
  it('picks a recipe up from the panel, moves it with the arrows and drops it with Enter', async () => {
    $currentPlan.set(makePlan({ servings: 2 }));
    renderPlanner();
    await ready();

    const source = screen.getByRole('button', { name: 'Drag Scrambled Eggs' });
    expect(source).toHaveAttribute('aria-roledescription', 'draggable');
    source.focus();
    press(source, 'Space', ' ');
    await tick();
    const live = await screen.findByText('Picked up Scrambled Eggs.');
    expect(live.closest('[aria-live]')).not.toBeNull();

    // Panel row 0 → first slot to the right is Monday breakfast; ↓ → lunch.
    press(document.activeElement ?? source, 'ArrowRight');
    await tick();
    await waitFor(() => expect(slot('monday', 'breakfast')).toHaveAttribute('data-over', 'true'));
    press(document.activeElement ?? source, 'ArrowDown');
    await tick();
    await waitFor(() => expect(slot('monday', 'lunch')).toHaveAttribute('data-over', 'true'));
    expect(screen.getByText('Scrambled Eggs is over Monday Lunch.')).toBeInTheDocument();

    press(document.activeElement ?? source, 'Enter');
    await tick();
    expect(plan()?.days[0]?.meals.lunch).toEqual({ recipeId: 'rec_001', servings: 2 });
    expect(await screen.findByText('Scrambled Eggs was dropped on Monday Lunch.')).toBeInTheDocument();
    expect(within(slot('monday', 'lunch')).getByText('Scrambled Eggs')).toBeInTheDocument();
  });

  it('moves a planned meal to the next day and swaps with an occupied slot', async () => {
    $currentPlan.set(makePlan());
    addRecipeToPlan(0, 'dinner', 'rec_002', 4);
    addRecipeToPlan(2, 'dinner', 'rec_003', 1);
    renderPlanner();
    await ready();

    const handle = within(slot('monday', 'dinner')).getByRole('button', { name: 'Move Beef Tacos (Monday Dinner)' });
    handle.focus();
    press(handle, 'Enter');
    await tick();
    press(handle, 'ArrowRight');
    await tick();
    await waitFor(() => expect(slot('tuesday', 'dinner')).toHaveAttribute('data-over', 'true'));
    press(handle, 'ArrowRight');
    await tick();
    await waitFor(() => expect(slot('wednesday', 'dinner')).toHaveAttribute('data-over', 'true'));
    press(handle, 'Enter');
    await tick();

    expect(plan()?.days[2]?.meals.dinner).toEqual({ recipeId: 'rec_002', servings: 4 });
    expect(plan()?.days[0]?.meals.dinner).toEqual({ recipeId: 'rec_003', servings: 1 });
  });

  it('Escape cancels the drag without touching the plan', async () => {
    $currentPlan.set(makePlan());
    renderPlanner();
    await ready();
    const before = plan();
    const source = screen.getByRole('button', { name: 'Drag Onion Soup' });
    source.focus();
    press(source, 'Space', ' ');
    await tick();
    press(source, 'ArrowRight');
    await tick();
    press(source, 'Escape');
    await tick();
    expect(plan()).toBe(before);
    expect(await screen.findByText('Moving Onion Soup was cancelled.')).toBeInTheDocument();
  });
});

describe('MealPlanner — picker, templates and summary (roadmap #025)', () => {
  it('the picker adds the previewed recipe with the chosen servings and the summary follows', async () => {
    $currentPlan.set(makePlan({ servings: 2 }));
    renderPlanner();
    await ready();
    const summary = screen.getByTestId('plan-summary');
    expect(within(summary).getByTestId('summary-recipes')).toHaveTextContent('0');
    // The summary sits above the week / month tabs.
    expect(summary.compareDocumentPosition(screen.getByRole('tablist')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await userEvent.click(within(slot('friday', 'lunch')).getByTestId('add-meal-button'));
    const picker = await screen.findByTestId('recipe-picker');
    await userEvent.click(within(picker).getByRole('button', { name: 'Fits Lunch' }));
    expect(within(picker).getAllByRole('option')).toHaveLength(1);
    await userEvent.click(within(picker).getByRole('button', { name: 'Increase servings' }));
    await userEvent.click(within(picker).getByRole('button', { name: 'Add Onion Soup' }));

    expect(plan()?.days[4]?.meals.lunch).toEqual({ recipeId: 'rec_003', servings: 3 });
    await waitFor(() => expect(within(summary).getByTestId('summary-recipes')).toHaveTextContent('1'));
    expect(within(summary).getByTestId('summary-days')).toHaveTextContent('1 / 7');
  });

  it('the toolbar opens the templates manager; loading a template replaces the board', async () => {
    const saved = makePlan({ id: 'template_9', name: { en: 'Soup week', es: 'Semana de sopa', fr: 'Semaine soupe' } });
    saved.days[0]!.meals.dinner = { recipeId: 'rec_003', servings: 2 };
    $savedPlans.set([saved]);
    $currentPlan.set(makePlan());
    renderPlanner();
    await ready();

    await userEvent.click(within(screen.getByTestId('planner-controls')).getByTestId('plan-templates-button'));
    const dialog = await screen.findByTestId('plan-templates');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Load Soup week' }));

    await waitFor(() => expect(screen.getByTestId('plan-name')).toHaveTextContent('Soup week'));
    expect(within(slot('monday', 'dinner')).getByText('Onion Soup')).toBeInTheDocument();
  });
});
