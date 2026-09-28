// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CATALOG_FILES } from '@/lib/catalog/use-catalog';
import { withBase } from '@/lib/href';
import { CategoriesFileSchema, DEFAULT_GOALS, type TrackingEntry } from '@/schemas';
import { $goals } from '@/stores/goals';
import { $tracking, TRACKING_KEY } from '@/stores/tracking';
import { makeEntry, makeNutrition, makeRecipe, mockBeverages, mockIngredientCategories } from '@/tests/fixtures/foodie-domain';
import { ProgressDashboardView } from './ProgressDashboard';

/**
 * jsdom tests of the `/tracking/progress/` island (roadmap Issue 033) — the
 * port of legacy `tests/integration/ProgressPage.test.tsx` (20 tests, same
 * describe blocks and names) plus the new chart/table/i18n behaviours.
 *
 * Deliberate adaptations of the legacy assertions:
 * - Most legacy bodies only asserted `document.body` exists or that the text
 *   contained "a digit"; they now assert the actual KPI values.
 * - "Active" view button: legacy checked the `bg-primary-600` class; the
 *   selector is now `aria-pressed` buttons, which is what is asserted.
 * - Legacy dates used `toISOString()` (UTC) and the real clock. The clock is
 *   frozen on Thursday 2026-10-01 (`Date` only) so "today" and "yesterday"
 *   always fall in the same Monday-based week.
 */

vi.setConfig({ testTimeout: 20_000 });

const TODAY = '2026-10-01';
const YESTERDAY = '2026-09-30';

const eggs = makeRecipe(); // rec_001 "Scrambled Eggs"
const salad = makeRecipe({ id: 'rec_002', name: { en: 'Green Salad', es: 'Ensalada Verde', fr: 'Salade Verte' } });

const payloads: Record<string, unknown> = {
  [CATALOG_FILES.recipes]: { recipes: [eggs, salad] },
  [CATALOG_FILES.ingredients]: { ingredients: [] },
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

function renderProgress(lang: 'en' | 'es' | 'fr' = 'en') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity, staleTime: Infinity } } });
  return render(
    <QueryClientProvider client={client}>
      <ProgressDashboardView lang={lang} />
    </QueryClientProvider>,
  );
}
async function ready() {
  await waitFor(() => expect(screen.getByTestId('progress-dashboard')).toHaveAttribute('data-hydrated', 'true'));
}
const kpi = (id: string) => screen.getByTestId(`progress-${id}-value`);
const viewButton = (name: 'Week' | 'Month') => screen.getByRole('button', { name });

/** Legacy fixture shape: one recipe entry with the given kcal / protein. */
function entry(date: string, calories: number, protein: number, overrides: Partial<TrackingEntry> = {}): TrackingEntry {
  return makeEntry({
    id: `entry-${date}-${calories}`,
    date,
    mealType: 'breakfast',
    recipeId: eggs.id,
    quantity: 1,
    servings: 1,
    nutrition: makeNutrition({ calories, protein, carbs: 60, fat: 15, fiber: 5, sugar: 10, sodium: 300 }),
    ...overrides,
  });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 1, 12, 0, 0));
  localStorage.clear();
  $tracking.set([]);
  $goals.set(DEFAULT_GOALS);
  installFetch();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('ProgressDashboard (port of ProgressPage Integration Tests)', () => {
  describe('page rendering', () => {
    it('renders the progress page', async () => {
      renderProgress();
      await ready();
      expect(screen.getByTestId('progress-view')).toBeInTheDocument();
      expect(screen.getByTestId('progress-period')).toHaveTextContent('September 28, 2026 – October 4, 2026');
    });

    it('displays view selector buttons', async () => {
      renderProgress();
      await ready();
      const group = screen.getByRole('group', { name: 'Period' });
      expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual(['Week', 'Month']);
    });

    it('has stats cards for metrics', async () => {
      renderProgress();
      await ready();
      for (const name of ['Average Calories', 'Day Streak', 'Goals met', 'Most Logged Meals']) {
        expect(screen.getByRole('heading', { level: 3, name })).toBeInTheDocument();
      }
    });
  });

  describe('view selector', () => {
    it('week view is active by default', async () => {
      renderProgress();
      await ready();
      expect(viewButton('Week')).toHaveAttribute('aria-pressed', 'true');
      expect(viewButton('Month')).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByTestId('progress-view')).toHaveAttribute('data-view', 'week');
    });

    it('can switch between week and month views', async () => {
      const user = userEvent.setup();
      renderProgress();
      await ready();
      await user.click(viewButton('Month'));
      expect(viewButton('Month')).toHaveAttribute('aria-pressed', 'true');
      expect(viewButton('Week')).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByTestId('progress-period')).toHaveTextContent('October 1, 2026 – October 31, 2026');
      expect(kpi('goals-met')).toHaveTextContent('0/31');
      await user.click(viewButton('Week'));
      expect(kpi('goals-met')).toHaveTextContent('0/7');
    });

    it('view buttons are interactive', async () => {
      renderProgress();
      await ready();
      for (const btn of within(screen.getByRole('group', { name: 'Period' })).getAllByRole('button')) {
        expect(btn).not.toBeDisabled();
        expect(btn).toHaveAttribute('type', 'button');
      }
    });
  });

  describe('summary stats', () => {
    it('displays average calories stat', async () => {
      $tracking.set([entry(TODAY, 1800, 60), entry(YESTERDAY, 2200, 70)]);
      renderProgress();
      await ready();
      expect(kpi('average')).toHaveTextContent('2,000');
      expect(screen.getByTestId('progress-average')).toHaveTextContent('kcal/day over 2 logged days');
    });

    it('displays streak stat', async () => {
      $tracking.set([entry(TODAY, 2000, 60), entry(YESTERDAY, 2000, 60), entry('2026-09-29', 500, 10)]);
      renderProgress();
      await ready();
      expect(kpi('streak')).toHaveTextContent('2');
    });

    it('displays goals met stat', async () => {
      renderProgress();
      await ready();
      // Legacy "X/7" format.
      expect(kpi('goals-met')).toHaveTextContent('0/7');
    });

    it('shows stats with no tracking data', async () => {
      renderProgress();
      await ready();
      expect(kpi('average')).toHaveTextContent('0');
      expect(kpi('streak')).toHaveTextContent('0');
      expect(kpi('most-logged')).toHaveTextContent('—');
      expect(screen.getByTestId('progress-average')).toHaveTextContent('nothing logged in this period');
    });

    it('shows stats with tracking data', async () => {
      $tracking.set([entry(TODAY, 500, 20)]);
      renderProgress();
      await ready();
      expect(kpi('average')).toHaveTextContent('500');
      expect(kpi('goals-met')).toHaveTextContent('0/7');
      await waitFor(() => expect(kpi('most-logged')).toHaveTextContent('Scrambled Eggs'));
      expect(screen.getByTestId('progress-most-logged')).toHaveTextContent('logged 1 time in this period');
    });
  });

  describe('daily breakdown', () => {
    it('shows empty state when no tracking data', async () => {
      renderProgress();
      await ready();
      const empty = screen.getByTestId('progress-empty');
      expect(empty).toHaveTextContent('Not enough data');
      expect(within(empty).getByRole('link', { name: 'Open the diary' })).toHaveAttribute('href', withBase('/tracking/'));
      expect(screen.queryByTestId('progress-calories-chart')).not.toBeInTheDocument();
    });

    it('displays daily data when entries exist', async () => {
      $tracking.set([entry(TODAY, 500, 20)]);
      renderProgress();
      await ready();
      const today = screen.getAllByTestId('progress-day').find((d) => d.dataset.date === TODAY)!;
      expect(today).toHaveTextContent('500 / 2,000 kcal');
      expect(today).toHaveTextContent('25%');
    });

    it('shows progress bars for each day', async () => {
      $tracking.set([entry(TODAY, 1000, 40)]);
      renderProgress();
      await ready();
      const days = screen.getAllByTestId('progress-day');
      expect(days).toHaveLength(7);
      const meters = screen.getAllByRole('meter');
      expect(meters).toHaveLength(7);
      expect(screen.getByRole('meter', { name: 'Calories on Thursday, October 1' })).toHaveAttribute('aria-valuetext', '50%');
    });

    it('shows multiple days of data', async () => {
      $tracking.set([entry(TODAY, 500, 20), entry(YESTERDAY, 600, 30, { recipeId: salad.id })]);
      renderProgress();
      await ready();
      const byDate = Object.fromEntries(screen.getAllByTestId('progress-day').map((d) => [d.dataset.date, d.textContent]));
      expect(byDate[TODAY]).toContain('500 / 2,000 kcal');
      expect(byDate[YESTERDAY]).toContain('600 / 2,000 kcal');
      expect(byDate['2026-09-28']).toContain('Nothing logged');
      expect(screen.getByTestId('progress-view')).toHaveAttribute('data-logged-days', '2');
    });
  });

  describe('responsive behavior', () => {
    it('renders successfully on all viewports', async () => {
      // SSR (and the hydration render) show the skeleton, never store data.
      const html = renderToString(
        <QueryClientProvider client={new QueryClient()}>
          <ProgressDashboardView lang="en" />
        </QueryClientProvider>,
      );
      expect(html).toContain('data-status="loading"');
      expect(html).toContain('Loading your progress…');
      renderProgress();
      await ready();
      expect(screen.getByTestId('progress-dashboard')).toHaveAttribute('data-status', 'ready');
    });

    it('provides complete progress tracking interface', async () => {
      $tracking.set([entry(TODAY, 2000, 60)]);
      renderProgress();
      await ready();
      expect(within(screen.getByRole('group', { name: 'Period' })).getAllByRole('button')).toHaveLength(2);
      expect(kpi('goals-met')).toHaveTextContent('1/7');
      expect(screen.getByRole('heading', { name: 'Calories per day' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Calorie trend' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Macros per day' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Daily Breakdown' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Edit goals' })).toHaveAttribute('href', withBase('/tracking/goals/'));
    });
  });

  describe('data calculations', () => {
    it('calculates streak correctly', async () => {
      // Today and yesterday on track, the day before off track (too few kcal).
      $tracking.set([entry(TODAY, 2100, 55), entry(YESTERDAY, 1900, 50), entry('2026-09-29', 900, 50), entry('2026-09-28', 2000, 50)]);
      renderProgress();
      await ready();
      expect(kpi('streak')).toHaveTextContent('2');
      expect(kpi('goals-met')).toHaveTextContent('3/7');
      expect(screen.getAllByTestId('progress-day').filter((d) => d.dataset.met === 'true')).toHaveLength(3);
    });

    it('calculates average calories', async () => {
      $tracking.set([entry(TODAY, 500, 20), entry(TODAY, 250, 10), entry(YESTERDAY, 1000, 30)]);
      renderProgress();
      await ready();
      // (750 + 1000) / 2 logged days
      expect(kpi('average')).toHaveTextContent('875');
    });

    it('displays progress percentages', async () => {
      $tracking.set([entry(TODAY, 1000, 40)]);
      renderProgress();
      await ready();
      const today = screen.getAllByTestId('progress-day').find((d) => d.dataset.date === TODAY)!;
      expect(today).toHaveTextContent('50%');
      expect(within(screen.getByTestId('progress-calories-table')).getByRole('row', { name: /Thursday, October 1/ })).toHaveTextContent('50%');
    });
  });
});

describe('ProgressDashboard — charts (roadmap #033)', () => {
  beforeEach(() => {
    $tracking.set([entry(TODAY, 1800, 80), entry(YESTERDAY, 2400, 100), entry('2026-09-28', 2100, 60)]);
  });

  it('renders the kit bar / line charts and a sparkline per macro, each with an accessible name', async () => {
    renderProgress();
    await ready();
    const period = 'September 28, 2026 – October 4, 2026';
    expect(screen.getByRole('img', { name: `Bar chart of calories per day, ${period}` })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: `Line chart of the 3-day calorie average against the goal, ${period}` })).toBeInTheDocument();
    for (const name of ['Protein', 'Carbs', 'Fat', 'Fiber']) {
      expect(screen.getByRole('img', { name: `${name} per day, ${period}` })).toBeInTheDocument();
    }
  });

  it('has an sr-only data table for every chart', async () => {
    renderProgress();
    await ready();
    const tables = screen.getAllByRole('table');
    expect(tables).toHaveLength(6);
    for (const table of tables) expect(table).toHaveClass('sr-only');

    const calories = screen.getByRole('table', { name: 'Data of the chart “Calories per day”' });
    const rows = within(calories).getAllByRole('row');
    expect(rows).toHaveLength(8); // header + 7 days
    expect(rows[0]).toHaveTextContent(/Day\s*Calories\s*Goal\s*%/);
    expect(rows[1]).toHaveTextContent(/Monday, September 28\s*2,100\s*2,000\s*105%/);

    const trend = screen.getByRole('table', { name: 'Data of the chart “Calorie trend”' });
    const trendRows = within(trend).getAllByRole('row');
    // 3-day trailing average: Mon 2100, Tue gap → 2100, Wed (2100+2400)/2, Thu (2400+1800)/2
    expect(trendRows.slice(1, 5).map((r) => r.querySelectorAll('td')[0]?.textContent)).toEqual(['2,100', '2,100', '2,250', '2,100']);

    expect(screen.getByRole('table', { name: /Protein per day/ })).toBeInTheDocument();
  });

  it('switching to the month view re-aggregates the charts over the whole month', async () => {
    const user = userEvent.setup();
    renderProgress();
    await ready();
    await user.click(viewButton('Month'));
    const calories = screen.getByRole('table', { name: 'Data of the chart “Calories per day”' });
    expect(within(calories).getAllByRole('row')).toHaveLength(32); // header + 31 days of October
    expect(screen.getByText('7-day average of the logged days, against your goal.')).toBeInTheDocument();
    // Only today is in October; the breakdown lists logged days only in the month view.
    expect(screen.getAllByTestId('progress-day')).toHaveLength(1);
    expect(kpi('average')).toHaveTextContent('1,800');
  });

  it('reports macro averages against the goals', async () => {
    renderProgress();
    await ready();
    const protein = within(screen.getByTestId('progress-macros')).getAllByRole('listitem').find((li) => li.dataset.macro === 'protein')!;
    // (80 + 100 + 60) / 3 = 80 g → 160 % of the 50 g goal
    expect(within(protein).getByTestId('progress-macro-average')).toHaveTextContent('80 g/day · 160% of goal');
  });

  it('recomputes when the diary or the goals change (another island / tab)', async () => {
    renderProgress();
    await ready();
    expect(kpi('goals-met')).toHaveTextContent('3/7');
    // A higher calorie goal pushes Thursday's 1800 kcal under 80 %.
    act(() => $goals.set({ ...DEFAULT_GOALS, calories: 2500 }));
    await waitFor(() => expect(kpi('goals-met')).toHaveTextContent('2/7'));
    act(() => $tracking.set([]));
    await waitFor(() => expect(screen.getByTestId('progress-empty')).toBeInTheDocument());
    expect(localStorage.getItem(TRACKING_KEY)).toBe('[]');
  });
});

describe('ProgressDashboard — localisation (roadmap #033)', () => {
  it('renders labels, dates and the most logged recipe in the page locale', async () => {
    $tracking.set([entry(TODAY, 1500, 50, { recipeId: salad.id })]);
    renderProgress('es');
    await ready();
    expect(screen.getByRole('button', { name: 'Semana' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: 'Calorías por día' })).toBeInTheDocument();
    await waitFor(() => expect(kpi('most-logged')).toHaveTextContent('Ensalada Verde'));
    expect(screen.getByRole('link', { name: 'Editar metas' })).toHaveAttribute('href', withBase('/es/tracking/goals/'));
    expect(screen.getByRole('table', { name: 'Datos de la gráfica «Calorías por día»' })).toBeInTheDocument();
  });

  it('uses French number and date formats', async () => {
    $tracking.set([entry(TODAY, 1500, 50)]);
    renderProgress('fr');
    await ready();
    expect(screen.getByRole('button', { name: 'Mois' })).toBeInTheDocument();
    expect(kpi('average')).toHaveTextContent(/^1\s500$/);
    expect(screen.getByTestId('progress-period')).toHaveTextContent('28 septembre 2026 – 4 octobre 2026');
  });
});
