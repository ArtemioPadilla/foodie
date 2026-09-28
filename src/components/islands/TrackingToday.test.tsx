// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CATALOG_FILES } from '@/lib/catalog/use-catalog';
import { addDaysToKey, todayKey } from '@/lib/format-date';
import { withBase } from '@/lib/href';
import { CategoriesFileSchema, DEFAULT_GOALS, type TrackingEntry } from '@/schemas';
import { $goals } from '@/stores/goals';
import { $tracking, TRACKING_KEY } from '@/stores/tracking';
import { makeEntry, makeIngredient, makeNutrition, makeRecipe, mockBeverages, mockIngredientCategories } from '@/tests/fixtures/foodie-domain';
import { closeToastsAfterEach } from '@/tests/fixtures/toast-timers';
import { TrackingTodayView } from './TrackingToday';

closeToastsAfterEach();

/**
 * jsdom tests of the `/tracking/` island (roadmap Issue 031) — the port of
 * legacy `tests/integration/TrackingPage.test.tsx` (19 tests, same describe
 * blocks and names, turned into real assertions: the legacy bodies mostly
 * asserted `document.body` exists) plus the new behaviours: hydration
 * parity, previous/next day, `?date=` in the URL, the seven totals with
 * `meter`, edit amount, copy to another day and the confirmed delete.
 */

vi.setConfig({ testTimeout: 20_000 });

const eggs = makeRecipe(); // rec_001, 500 kcal for 2 servings
const salad = makeRecipe({ id: 'rec_002', name: { en: 'Green Salad', es: 'Ensalada Verde', fr: 'Salade Verte' } });
const chicken = makeIngredient();

const payloads: Record<string, unknown> = {
  [CATALOG_FILES.recipes]: { recipes: [eggs, salad] },
  [CATALOG_FILES.ingredients]: { ingredients: [chicken] },
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

function renderTracking(lang: 'en' | 'es' | 'fr' = 'en') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity, staleTime: Infinity } } });
  return render(
    <QueryClientProvider client={client}>
      <TrackingTodayView lang={lang} />
    </QueryClientProvider>,
  );
}

const today = () => todayKey();
function entry(overrides: Partial<TrackingEntry>): TrackingEntry {
  return makeEntry({ date: today(), recipeId: eggs.id, quantity: 1, servings: 1, ...overrides });
}
function seed(entries: TrackingEntry[]) {
  $tracking.set(entries);
}
async function ready() {
  await waitFor(() => expect(screen.getByTestId('tracking-today')).toHaveAttribute('data-hydrated', 'true'));
  await waitFor(() => expect(screen.getByTestId('tracking-day')).toHaveAttribute('data-catalog', 'success'));
}
const meal = (id: string) => screen.getAllByTestId('tracking-meal').find((s) => s.dataset.meal === id)!;

beforeEach(() => {
  localStorage.clear();
  $tracking.set([]);
  $goals.set(DEFAULT_GOALS);
  window.history.replaceState(null, '', '/tracking/');
  installFetch();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('TrackingToday (port of TrackingPage Integration Tests)', () => {
  describe('page rendering', () => {
    it('renders the tracking page', async () => {
      renderTracking();
      await ready();
      expect(screen.getByTestId('tracking-summary')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: /\d{4}/ })).toBeInTheDocument();
    });

    it('displays date selector', async () => {
      renderTracking();
      await ready();
      expect(screen.getByLabelText('Select Date')).toHaveValue(today());
      expect(screen.getByRole('button', { name: 'Previous day' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Next day' })).toBeInTheDocument();
    });

    it('displays quick add button', async () => {
      renderTracking();
      await ready();
      expect(screen.getByRole('button', { name: 'Quick Add' })).toBeInTheDocument();
    });

    it('displays meal type sections', async () => {
      renderTracking();
      await ready();
      for (const name of ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Beverage']) {
        expect(screen.getByRole('heading', { level: 3, name })).toBeInTheDocument();
      }
    });
  });

  describe('date selection', () => {
    it('allows changing the selected date', async () => {
      renderTracking();
      await ready();
      fireEvent.change(screen.getByTestId('tracking-date'), { target: { value: '2026-01-15' } });
      expect(screen.getByTestId('tracking-day')).toHaveAttribute('data-date', '2026-01-15');
      expect(screen.getByTestId('tracking-day-title')).toHaveTextContent('January 15, 2026');
      expect(window.location.search).toBe('?date=2026-01-15');
    });

    it('has a today button to reset to current date', async () => {
      renderTracking();
      await ready();
      await userEvent.click(screen.getByRole('button', { name: 'Previous day' }));
      await userEvent.click(screen.getByRole('button', { name: 'Previous day' }));
      expect(screen.getByTestId('tracking-day')).toHaveAttribute('data-date', addDaysToKey(today(), -2));
      await userEvent.click(screen.getByRole('button', { name: 'Next day' }));
      expect(screen.getByTestId('tracking-day')).toHaveAttribute('data-date', addDaysToKey(today(), -1));
      await userEvent.click(screen.getByRole('button', { name: 'Today' }));
      expect(screen.getByTestId('tracking-day')).toHaveAttribute('data-date', today());
      expect(window.location.search).toBe('');
    });
  });

  describe('displaying entries', () => {
    it('shows empty state when no entries', async () => {
      renderTracking();
      await ready();
      expect(screen.getAllByText('No entries for this day')).toHaveLength(5);
      expect(screen.getByTestId('tracking-calories')).toHaveTextContent('0 / 2,000 kcal');
    });

    it('renders with date selector for viewing entries', async () => {
      window.history.replaceState(null, '', '/tracking/?date=2026-01-10');
      seed([entry({ id: 'past', date: '2026-01-10' })]);
      renderTracking();
      await ready();
      expect(screen.getByTestId('tracking-date')).toHaveValue('2026-01-10');
      expect(screen.getByTestId('tracking-entry-name')).toHaveTextContent('Scrambled Eggs');
    });

    it('updates display when date changes', async () => {
      seed([entry({ id: 'today' }), entry({ id: 'yesterday', date: addDaysToKey(today(), -1), recipeId: salad.id })]);
      renderTracking();
      await ready();
      expect(screen.getAllByTestId('tracking-entry')).toHaveLength(1);
      expect(screen.getByTestId('tracking-entry-name')).toHaveTextContent('Scrambled Eggs');
      await userEvent.click(screen.getByRole('button', { name: 'Previous day' }));
      expect(screen.getByTestId('tracking-entry-name')).toHaveTextContent('Green Salad');
    });
  });

  describe('adding entries', () => {
    it('opens quick add modal when add button clicked', async () => {
      renderTracking();
      await ready();
      await userEvent.click(screen.getByRole('button', { name: 'Quick Add' }));
      const dialog = await screen.findByRole('dialog', { name: 'Quick Add' });
      await userEvent.click(within(dialog).getByRole('button', { name: /Scrambled Eggs/ }));
      await userEvent.click(within(dialog).getByRole('button', { name: 'Log Meal' }));
      await waitFor(() => expect(screen.queryByTestId('quick-add-dialog')).not.toBeInTheDocument());
      expect($tracking.get()).toHaveLength(1);
      expect($tracking.get()[0]).toMatchObject({ date: today(), mealType: 'breakfast', recipeId: eggs.id, servings: 1 });
      expect(within(meal('breakfast')).getByTestId('tracking-entry-name')).toHaveTextContent('Scrambled Eggs');
      expect(screen.getByText('Entry logged successfully')).toBeInTheDocument();
    });

    it('a section "Add" button preselects its meal and logs on the chosen day', async () => {
      renderTracking();
      await ready();
      await userEvent.click(screen.getByRole('button', { name: 'Next day' }));
      await userEvent.click(screen.getByRole('button', { name: 'Add to Dinner' }));
      const dialog = await screen.findByRole('dialog');
      expect(within(dialog).getByTestId('quick-add-meal-select')).toHaveTextContent('Dinner');
      await userEvent.click(within(dialog).getByRole('button', { name: /Green Salad/ }));
      await userEvent.click(within(dialog).getByRole('button', { name: 'Log Meal' }));
      await waitFor(() => expect($tracking.get()).toHaveLength(1));
      expect($tracking.get()[0]).toMatchObject({ date: addDaysToKey(today(), 1), mealType: 'dinner', recipeId: salad.id });
    });
  });

  describe('deleting entries', () => {
    it('shows delete button for entries', async () => {
      seed([entry({ id: 'e1' })]);
      renderTracking();
      await ready();
      expect(screen.getByRole('button', { name: 'Delete Scrambled Eggs' })).toBeInTheDocument();
    });

    it('has delete functionality available', async () => {
      seed([entry({ id: 'e1' }), entry({ id: 'e2', recipeId: salad.id, mealType: 'dinner' })]);
      renderTracking();
      await ready();
      await userEvent.click(screen.getByRole('button', { name: 'Delete Scrambled Eggs' }));
      const confirm = await screen.findByRole('alertdialog', { name: 'Delete this entry?' });
      expect(confirm).toHaveTextContent('“Scrambled Eggs” will be removed from your diary.');
      // Cancelling keeps it…
      await userEvent.click(within(confirm).getByRole('button', { name: 'Cancel' }));
      await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
      expect($tracking.get()).toHaveLength(2);
      // …confirming removes it (and only it), persisted under `trackingEntries`.
      await userEvent.click(screen.getByRole('button', { name: 'Delete Scrambled Eggs' }));
      await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Delete' }));
      await waitFor(() => expect($tracking.get().map((e) => e.id)).toEqual(['e2']));
      expect(JSON.parse(localStorage.getItem(TRACKING_KEY) ?? '[]')).toHaveLength(1);
      expect(screen.getByText('Entry deleted')).toBeInTheDocument();
    });

    it('provides UI for managing entries', async () => {
      seed([entry({ id: 'e1' })]);
      renderTracking();
      await ready();
      const actions = screen.getByRole('group', { name: 'Actions for Scrambled Eggs' });
      expect(within(actions).getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual([
        'Edit amount of Scrambled Eggs',
        'Copy Scrambled Eggs to another day',
        'Delete Scrambled Eggs',
      ]);
    });

    it('edits the amount and recomputes the nutrition from the catalog', async () => {
      seed([entry({ id: 'e1', nutrition: makeNutrition({ calories: 250 }) })]);
      renderTracking();
      await ready();
      await userEvent.click(screen.getByRole('button', { name: 'Edit amount of Scrambled Eggs' }));
      const dialog = await screen.findByRole('dialog', { name: 'Edit Entry' });
      await userEvent.click(within(dialog).getByRole('button', { name: 'Increase' }));
      expect(within(dialog).getByRole('textbox', { name: 'Servings' })).toHaveValue('1.5');
      await userEvent.click(within(dialog).getByRole('button', { name: 'Increase' }));
      await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
      await waitFor(() => expect($tracking.get()[0]).toMatchObject({ quantity: 2, servings: 2 }));
      expect($tracking.get()[0]!.nutrition.calories).toBe(500);
      expect(screen.getByTestId('tracking-entry-amount')).toHaveTextContent('2 servings · 500 kcal');
    });

    it('copies an entry to another day', async () => {
      seed([entry({ id: 'e1' })]);
      renderTracking();
      await ready();
      await userEvent.click(screen.getByRole('button', { name: 'Copy Scrambled Eggs to another day' }));
      const dialog = await screen.findByRole('dialog', { name: 'Duplicate Entry' });
      const input = within(dialog).getByLabelText('Copy to');
      expect(input).toHaveValue(addDaysToKey(today(), 1));
      fireEvent.change(input, { target: { value: '2026-12-24' } });
      await userEvent.click(within(dialog).getByRole('button', { name: 'Copy' }));
      await waitFor(() => expect($tracking.get()).toHaveLength(2));
      expect($tracking.get()[1]).toMatchObject({ date: '2026-12-24', recipeId: eggs.id, mealType: 'lunch' });
      expect($tracking.get()[1]!.id).not.toBe('e1');
      expect(screen.getByText('Entry copied to December 24, 2026')).toBeInTheDocument();
    });
  });

  describe('nutrition summary', () => {
    it('displays nutrition information for entries', async () => {
      seed([entry({ id: 'e1', nutrition: makeNutrition({ calories: 500, protein: 25, carbs: 60, fat: 15, fiber: 8, sugar: 5, sodium: 400 }) })]);
      renderTracking();
      await ready();
      expect(screen.getByTestId('tracking-calories')).toHaveTextContent('500 / 2,000 kcal');
      expect(screen.getByTestId('tracking-calories-remaining')).toHaveTextContent('1,500 kcal left');
      const values = Object.fromEntries(
        screen.getAllByTestId('tracking-metric').map((m) => [m.dataset.metric, m.textContent ?? '']),
      );
      expect(values.protein).toContain('25 / 50 g');
      expect(values.carbs).toContain('60 / 250 g');
      expect(values.fat).toContain('15 / 70 g');
      expect(values.fiber).toContain('8 / 25 g');
      expect(values.sugar).toContain('5 / 50 g');
      expect(values.sodium).toContain('400 / 2,300 mg');
      expect(values.water).toContain('0 / 2,000 ml');
    });

    it('shows progress towards goals', async () => {
      seed([
        entry({ id: 'e1', nutrition: makeNutrition({ calories: 1000, protein: 60 }) }),
        entry({ id: 'w', recipeId: undefined, servings: undefined, beverageId: 'bev_water', mealType: 'beverage', quantity: 500, unit: 'ml', nutrition: makeNutrition({ calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 }) }),
      ]);
      renderTracking();
      await ready();
      const calories = screen.getByRole('meter', { name: 'Calories' });
      expect(calories).toHaveAttribute('aria-valuenow', '50');
      expect(calories).toHaveAttribute('aria-valuetext', '1,000 of 2,000 kcal (50%)');
      // Over the goal: the meter is full and the metric says so.
      const protein = screen.getAllByTestId('tracking-metric').find((m) => m.dataset.metric === 'protein')!;
      expect(protein).toHaveAttribute('data-over', 'true');
      expect(protein).toHaveAttribute('data-percentage', '120');
      expect(screen.getByRole('meter', { name: 'Protein' })).toHaveAttribute('aria-valuenow', '100');
      expect(screen.getByRole('meter', { name: 'Water' })).toHaveAttribute('aria-valuenow', '25');
    });
  });

  describe('meal type grouping', () => {
    it('groups entries by meal type', async () => {
      seed([
        entry({ id: 'b1', mealType: 'breakfast' }),
        entry({ id: 'l1', mealType: 'lunch', recipeId: salad.id }),
        entry({ id: 'd1', mealType: 'dinner', recipeId: salad.id }),
      ]);
      renderTracking();
      await ready();
      expect(within(meal('breakfast')).getAllByTestId('tracking-entry')).toHaveLength(1);
      expect(within(meal('lunch')).getByTestId('tracking-entry-name')).toHaveTextContent('Green Salad');
      expect(within(meal('dinner')).getAllByTestId('tracking-entry')).toHaveLength(1);
      expect(within(meal('snack')).getByText('No entries for this day')).toBeInTheDocument();
    });

    it('calculates calories per meal type', async () => {
      seed([
        entry({ id: 'b1', mealType: 'breakfast', nutrition: makeNutrition({ calories: 300 }) }),
        entry({ id: 'b2', mealType: 'breakfast', nutrition: makeNutrition({ calories: 200 }) }),
        entry({ id: 'l1', mealType: 'lunch', nutrition: makeNutrition({ calories: 450 }) }),
      ]);
      renderTracking();
      await ready();
      expect(within(meal('breakfast')).getByTestId('tracking-meal-calories')).toHaveTextContent('500 kcal');
      expect(within(meal('lunch')).getByTestId('tracking-meal-calories')).toHaveTextContent('450 kcal');
      expect(within(meal('dinner')).getByTestId('tracking-meal-calories')).toHaveTextContent('0 kcal');
      expect(screen.getByTestId('tracking-calories')).toHaveTextContent('950 / 2,000 kcal');
    });
  });

  describe('responsive behavior', () => {
    it('renders on mobile viewport', async () => {
      window.innerWidth = 375;
      window.dispatchEvent(new Event('resize'));
      renderTracking();
      await ready();
      expect(screen.getByRole('button', { name: 'Quick Add' })).toBeVisible();
      expect(screen.getAllByTestId('tracking-meal')).toHaveLength(5);
    });

    it('renders on desktop viewport', async () => {
      window.innerWidth = 1440;
      window.dispatchEvent(new Event('resize'));
      renderTracking();
      await ready();
      expect(screen.getByTestId('tracking-nutrients').children).toHaveLength(7); // 6 nutrients + water
    });
  });
});

describe('TrackingToday (island contract)', () => {
  it('server render and first client render show the same skeleton (no localStorage, no "today")', () => {
    seed([entry({ id: 'e1' })]);
    const client = new QueryClient();
    const html = renderToString(
      <QueryClientProvider client={client}>
        <TrackingTodayView lang="en" />
      </QueryClientProvider>,
    );
    expect(html).toContain('data-status="loading"');
    expect(html).toContain('Loading your food diary…');
    expect(html).not.toContain('Scrambled Eggs');
  });

  it('renders in Spanish with localised names, numbers and dates', async () => {
    seed([entry({ id: 'e1', quantity: 1.5, servings: 1.5, nutrition: makeNutrition({ calories: 1375 }) })]);
    window.history.replaceState(null, '', '/es/tracking/?date=' + today());
    renderTracking('es');
    await ready();
    expect(screen.getByTestId('tracking-entry-name')).toHaveTextContent('Huevos Revueltos');
    expect(screen.getByTestId('tracking-entry-amount')).toHaveTextContent('1.5 porciones');
    expect(screen.getByRole('heading', { level: 3, name: 'Desayuno' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Borrar Huevos Revueltos' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Editar metas' })).toHaveAttribute('href', withBase('/es/tracking/goals/'));
  });

  it('an entry whose recipe left the catalog keeps a generic name and scales on edit', async () => {
    seed([entry({ id: 'gone', recipeId: 'rec_999', quantity: 2, servings: 2, nutrition: makeNutrition({ calories: 400 }) })]);
    renderTracking();
    await ready();
    expect(screen.getByTestId('tracking-entry-name')).toHaveTextContent('Recipe');
    await userEvent.click(screen.getByRole('button', { name: 'Edit amount of Recipe' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Decrease' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Decrease' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect($tracking.get()[0]).toMatchObject({ quantity: 1, servings: 1 }));
    expect($tracking.get()[0]!.nutrition.calories).toBe(200);
  });
});
