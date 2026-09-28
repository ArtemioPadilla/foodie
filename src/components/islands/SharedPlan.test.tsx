// @vitest-environment jsdom
import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CATALOG_FILES } from '@/lib/catalog/use-catalog';
import { encodeSharedPlan } from '@/lib/domain/plan-share';
import { withBase } from '@/lib/href';
import { CategoriesFileSchema, type MealPlan } from '@/schemas';
import { $currentPlan, $savedPlans, addRecipeToPlan } from '@/stores/planner';
import { makeIngredient, makePlan, makeRecipe, mockBeverages, mockIngredientCategories } from '@/tests/fixtures/foodie-domain';
import { closeToastsAfterEach } from '@/tests/fixtures/toast-timers';
import { SharedPlanView } from './SharedPlan';

closeToastsAfterEach();

/** `/plan/shared/` island (roadmap Issue 040): decode `#p=`, read-only view, import. */
const eggs = makeRecipe(); // rec_001 · Scrambled Eggs
const tacos = makeRecipe({ id: 'rec_002', name: { en: 'Beef Tacos', es: 'Tacos de Res', fr: 'Tacos au Bœuf' }, type: 'dinner' });

const payloads: Record<string, unknown> = {
  [CATALOG_FILES.recipes]: { recipes: [eggs, tacos] },
  [CATALOG_FILES.ingredients]: { ingredients: [makeIngredient({ id: 'ing_001' }), makeIngredient({ id: 'ing_002' })] },
  [CATALOG_FILES.beverages]: mockBeverages,
  [CATALOG_FILES.categories]: CategoriesFileSchema.parse({
    mealTypes: [{ id: 'breakfast', name: { en: 'Breakfast', es: 'Desayuno', fr: 'Petit-déjeuner' } }],
    cuisines: [{ id: 'american', name: { en: 'American', es: 'Americana', fr: 'Américaine' } }],
    dietaryTags: [{ id: 'vegetarian', name: { en: 'Vegetarian', es: 'Vegetariano', fr: 'Végétarien' } }],
    ingredientCategories: mockIngredientCategories,
  }),
};

function installFetch(failing = false) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) => {
      const path = String(input).replace(withBase('/'), '/');
      const ok = !failing && path in payloads;
      return { ok, status: ok ? 200 : 500, statusText: ok ? 'OK' : 'Error', json: async () => payloads[path] } as unknown as Response;
    }),
  );
}

function sharedPlan(): MealPlan {
  const plan = makePlan({ name: { en: 'Friends week', es: 'Semana de amigos', fr: 'Semaine entre amis' }, servings: 3 });
  plan.days[0]!.meals = { breakfast: { recipeId: 'rec_001', servings: 2 }, dinner: { recipeId: 'rec_002', servings: 4 } };
  plan.days[2]!.meals = { lunch: { recipeId: 'rec_404', servings: 1 }, snacks: [{ recipeId: 'rec_001', servings: 1 }] };
  return plan;
}

function renderShared(hash: string, lang: 'en' | 'es' | 'fr' = 'en') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity, staleTime: Infinity } } });
  const user = userEvent.setup();
  return {
    user,
    ...render(
      <QueryClientProvider client={client}>
        <SharedPlanView lang={lang} hash={hash} />
      </QueryClientProvider>,
    ),
  };
}

const board = () => screen.getByTestId('shared-plan');

beforeEach(() => {
  installFetch();
  localStorage.clear();
  $currentPlan.set(null);
  $savedPlans.set([]);
});
afterEach(() => vi.unstubAllGlobals());

describe('SharedPlan island', () => {
  it('server-renders the loading skeleton only (the fragment is read after hydration)', () => {
    const html = renderToString(
      <QueryClientProvider client={new QueryClient()}>
        <SharedPlanView lang="en" hash={`#p=${encodeSharedPlan(sharedPlan())}`} />
      </QueryClientProvider>,
    );
    expect(html).toContain('data-status="loading"');
    expect(html).not.toContain('Friends week');
  });

  it('shows the plan read-only with recipes resolved from the catalog and unknown ids as "Recipe not available"', async () => {
    renderShared(`#p=${encodeSharedPlan(sharedPlan())}`, 'es');
    await waitFor(() => expect(board()).toHaveAttribute('data-status', 'ready'));
    expect(screen.getByTestId('shared-plan-name')).toHaveTextContent('Semana de amigos');
    expect(screen.getByTestId('shared-plan-servings')).toHaveTextContent('3');
    expect(screen.getByTestId('shared-plan-meal-count')).toHaveTextContent('4 comidas');
    expect(screen.getByTestId('shared-plan-readonly')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByTestId('shared-plan-board')).toHaveAttribute('data-catalog', 'success'));

    const monday = screen.getByTestId('shared-day-monday');
    expect(within(monday).getByRole('link', { name: 'Tacos de Res' })).toHaveAttribute('href', withBase('/es/recipes/rec_002/'));
    const wednesday = screen.getByTestId('shared-day-wednesday');
    const missing = within(wednesday).getAllByTestId('shared-meal').find((li) => li.getAttribute('data-recipe-id') === 'rec_404')!;
    expect(missing).toHaveAttribute('data-available', 'false');
    expect(missing).toHaveTextContent('Receta no disponible');
    expect(screen.getByTestId('plan-summary')).toBeInTheDocument();
    // Read-only: no drag handles, no add/remove buttons.
    expect(screen.queryByTestId('add-meal-button')).toBeNull();
    expect(screen.queryByTestId('planned-meal')).toBeNull();
  });

  it('"Import as my plan" makes it the current plan (a full week) and leaves unknown recipes out', async () => {
    const { user } = renderShared(`#p=${encodeSharedPlan(sharedPlan())}`);
    await waitFor(() => expect(screen.getByTestId('shared-plan-board')).toHaveAttribute('data-catalog', 'success'));
    await user.click(screen.getByTestId('import-shared-plan'));

    const current = $currentPlan.get()!;
    expect(current.name).toEqual({ en: 'Friends week', es: 'Semana de amigos', fr: 'Semaine entre amis' });
    expect(current.servings).toBe(3);
    expect(current.days).toHaveLength(7);
    expect(current.days[0]!.meals).toEqual({ breakfast: { recipeId: 'rec_001', servings: 2 }, dinner: { recipeId: 'rec_002', servings: 4 } });
    expect(current.days[2]!.meals).toEqual({ snacks: [{ recipeId: 'rec_001', servings: 1 }] });
    expect(screen.getByTestId('shared-plan-imported')).toHaveTextContent('Friends week');
    expect(screen.getByTestId('shared-plan-dropped')).toHaveTextContent('1 meal with an unavailable recipe was left out.');
    expect(screen.getByTestId('open-planner')).toHaveAttribute('href', withBase('/planner/'));
    expect(screen.queryByTestId('import-shared-plan')).toBeNull();
  });

  it('asks before replacing a current plan with meals, and keeps it in the saved plans', async () => {
    const mine = makePlan({ id: 'plan_mine', name: { en: 'My week', es: 'Mi semana', fr: 'Ma semaine' } });
    $currentPlan.set(mine);
    addRecipeToPlan(1, 'lunch', 'rec_002', 2);
    const { user } = renderShared(`#p=${encodeSharedPlan(sharedPlan())}`);
    await waitFor(() => expect(screen.getByTestId('shared-plan-board')).toHaveAttribute('data-catalog', 'success'));

    await user.click(screen.getByTestId('import-shared-plan'));
    const dialog = await screen.findByTestId('import-confirm-dialog');
    expect(dialog).toHaveTextContent('“Friends week” will replace “My week”.');
    expect($currentPlan.get()!.id).toBe('plan_mine');

    await user.click(within(dialog).getByTestId('confirm-import'));
    await waitFor(() => expect($currentPlan.get()!.name.en).toBe('Friends week'));
    expect($savedPlans.get().map((p) => p.id)).toEqual(['plan_mine']);
    expect($savedPlans.get()[0]!.days[1]!.meals.lunch).toEqual({ recipeId: 'rec_002', servings: 2 });
  });

  it('cancelling the confirmation keeps the current plan', async () => {
    const mine = makePlan({ id: 'plan_mine' });
    $currentPlan.set(mine);
    addRecipeToPlan(0, 'dinner', 'rec_001', 2);
    const { user } = renderShared(`#p=${encodeSharedPlan(sharedPlan())}`);
    await waitFor(() => expect(board()).toHaveAttribute('data-status', 'ready'));
    await user.click(screen.getByTestId('import-shared-plan'));
    const dialog = await screen.findByTestId('import-confirm-dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect($currentPlan.get()!.id).toBe('plan_mine');
    expect($savedPlans.get()).toEqual([]);
  });

  it.each([
    ['', 'empty', 'No plan in this link'],
    ['#main-content', 'empty', 'No plan in this link'],
    ['#p=not*base64', 'corrupt', 'This link is damaged'],
    ['#p=SGVsbG8gd29ybGQh', 'corrupt', 'This link is damaged'],
  ])('explains a bad fragment %j (%s) without crashing', async (hash, error, title) => {
    renderShared(hash);
    await waitFor(() => expect(board()).toHaveAttribute('data-status', 'error'));
    expect(board()).toHaveAttribute('data-error', error);
    expect(screen.getByTestId('shared-plan-error')).toHaveTextContent(title);
    expect(screen.getByTestId('shared-plan-create-own')).toHaveAttribute('href', withBase('/planner/'));
    expect($currentPlan.get()).toBeNull();
  });

  it('a truncated link is reported as damaged in French', async () => {
    const encoded = encodeSharedPlan(sharedPlan());
    renderShared(`#p=${encoded.slice(0, encoded.length - 12)}`, 'fr');
    await waitFor(() => expect(board()).toHaveAttribute('data-status', 'error'));
    expect(screen.getByTestId('shared-plan-error')).toHaveTextContent('Ce lien est endommagé');
  });

  it('still shows the week when the catalog fails, with a retry', async () => {
    installFetch(true);
    renderShared(`#p=${encodeSharedPlan(sharedPlan())}`);
    await waitFor(() => expect(screen.getByTestId('shared-plan-catalog-error')).toBeInTheDocument());
    expect(screen.getAllByTestId('shared-meal')).toHaveLength(4);
    expect(screen.getAllByTestId('shared-meal').every((li) => li.getAttribute('data-available') === 'true')).toBe(true);
  });

  it('reads location.hash and follows hashchange when no hash prop is given', async () => {
    window.location.hash = `#p=${encodeSharedPlan(sharedPlan())}`;
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <SharedPlanView lang="en" />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(board()).toHaveAttribute('data-status', 'ready'));
    window.location.hash = '#p=broken';
    await waitFor(() => expect(board()).toHaveAttribute('data-status', 'error'));
    window.location.hash = '';
  });
});
