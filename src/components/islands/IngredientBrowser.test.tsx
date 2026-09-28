// @vitest-environment jsdom
import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { withBase } from '@/lib/href';
import { CATALOG_FILES } from '@/lib/catalog/use-catalog';
import { CategoriesFileSchema } from '@/schemas';
import { makeIngredient, makeRecipe, mockBeverages, mockIngredientCategories } from '@/tests/fixtures/foodie-domain';
import { IngredientBrowserView } from './IngredientBrowser';

/**
 * jsdom tests of the `/ingredients/` island (roadmap Issue 019): loading →
 * ready, grouping by category, search, category / dietary filters, URL
 * state, the "I have it" selection → "Recipes you can make", and the
 * `use-listing` empty/error states. Catalog through a fake `fetch`.
 */

const chicken = makeIngredient(); // ing_001 · protein
const spinach = makeIngredient({
  id: 'ing_002',
  name: { en: 'Spinach', es: 'Espinaca', fr: 'Épinard' },
  category: 'vegetables',
  tags: { glutenFree: true, vegan: true, vegetarian: true, dairyFree: true, nutFree: true, kosher: true, halal: true },
});
const cheese = makeIngredient({
  id: 'ing_003',
  name: { en: 'Cheddar', es: 'Queso cheddar', fr: 'Cheddar' },
  category: 'dairy',
  tags: { glutenFree: true, vegan: false, vegetarian: true, dairyFree: false, nutFree: true, kosher: true, halal: false },
});
const eggs = makeRecipe(); // ing_001 + ing_002
const salad = makeRecipe({
  id: 'rec_002',
  name: { en: 'Green Salad', es: 'Ensalada verde', fr: 'Salade verte' },
  ingredients: [
    { ingredientId: 'ing_002', quantity: 1, unit: 'cup', optional: false },
    { ingredientId: 'ing_003', quantity: 1, unit: 'cup', optional: false },
  ],
});

const categories = CategoriesFileSchema.parse({
  mealTypes: [{ id: 'breakfast', name: { en: 'Breakfast', es: 'Desayuno', fr: 'Petit-déjeuner' } }],
  cuisines: [{ id: 'american', name: { en: 'American', es: 'Americana', fr: 'Américaine' } }],
  dietaryTags: [{ id: 'vegan', name: { en: 'Vegan', es: 'Vegano', fr: 'Végétalien' } }],
  ingredientCategories: mockIngredientCategories,
});

const payloads: Record<string, unknown> = {
  [CATALOG_FILES.recipes]: { recipes: [eggs, salad] },
  [CATALOG_FILES.ingredients]: { ingredients: [cheese, spinach, chicken] },
  [CATALOG_FILES.beverages]: mockBeverages,
  [CATALOG_FILES.categories]: categories,
};

function jsonResponse(body: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, statusText: ok ? 'OK' : 'Server Error', json: async () => body } as unknown as Response;
}

function installFetch(overrides: Record<string, unknown | undefined> = {}) {
  const impl = vi.fn(async (input: string | URL | Request) => {
    const path = String(input).replace(withBase('/'), '/');
    if (path in overrides) return overrides[path] === undefined ? jsonResponse({}, false) : jsonResponse(overrides[path]);
    return path in payloads ? jsonResponse(payloads[path]) : jsonResponse({}, false);
  });
  vi.stubGlobal('fetch', impl);
  return impl;
}

function renderBrowser(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity, staleTime: Infinity } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

async function ready() {
  await waitFor(() => expect(screen.getByTestId('ingredient-browser')).toHaveAttribute('data-status', 'ready'));
}

const cardIds = () => screen.getAllByTestId('ingredient-card').map((card) => card.getAttribute('data-ingredient-id'));
const groupIds = () => screen.getAllByTestId('ingredient-group').map((g) => g.getAttribute('data-category'));

function setUrl(search: string) {
  window.history.replaceState(null, '', `/ingredients/${search}`);
}

beforeEach(() => {
  installFetch();
  setUrl('');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('IngredientBrowser — states', () => {
  it('shows skeletons, then the ingredients grouped by category in taxonomy order', async () => {
    renderBrowser(<IngredientBrowserView lang="en" />);
    expect(screen.getByTestId('ingredient-skeletons')).toBeInTheDocument();
    await ready();
    expect(groupIds()).toEqual(['protein', 'vegetables', 'dairy']);
    expect(cardIds()).toEqual(['ing_001', 'ing_002', 'ing_003']);
    expect(screen.getByTestId('ingredient-results-count')).toHaveTextContent('3 ingredients');
    // Group heading carries the localised category and its colour dot.
    const vegetables = screen.getAllByTestId('ingredient-group')[1] as HTMLElement;
    expect(within(vegetables).getByRole('heading', { level: 2 })).toHaveTextContent('Vegetables');
    expect(vegetables.querySelector('.bg-food-vegetables')).not.toBeNull();
  });

  it('links every card to its localised static page', async () => {
    renderBrowser(<IngredientBrowserView lang="es" />);
    await ready();
    const link = within(screen.getAllByTestId('ingredient-card')[1] as HTMLElement).getByRole('link', { name: 'Espinaca' });
    expect(link).toHaveAttribute('href', withBase('/es/ingredients/ing_002/'));
  });

  it('renders the error state with a retry when the catalog fails', async () => {
    installFetch({ [CATALOG_FILES.ingredients]: undefined });
    renderBrowser(<IngredientBrowserView lang="en" />);
    await waitFor(() => expect(screen.getByTestId('ingredient-browser')).toHaveAttribute('data-status', 'error'));
    expect(screen.getByText('Could not load the ingredient catalog')).toBeInTheDocument();
  });

  it('renders empty-zero when the catalog has no ingredients', async () => {
    installFetch({ [CATALOG_FILES.ingredients]: { ingredients: [] } });
    renderBrowser(<IngredientBrowserView lang="en" />);
    await waitFor(() => expect(screen.getByTestId('ingredients-empty-zero')).toBeInTheDocument());
  });
});

describe('IngredientBrowser — search, filters and URL state', () => {
  it('searches the localised name and writes ?q=', async () => {
    const user = userEvent.setup();
    renderBrowser(<IngredientBrowserView lang="fr" />);
    await ready();
    await user.type(screen.getByTestId('ingredient-search'), 'epin');
    await waitFor(() => expect(cardIds()).toEqual(['ing_002']));
    expect(window.location.search).toBe('?q=epin');
  });

  it('filters by category (OR) and dietary tags (AND), counts and clears them', async () => {
    const user = userEvent.setup();
    renderBrowser(<IngredientBrowserView lang="en" />);
    await ready();
    const categoryRow = screen.getByTestId('category-filter');
    await user.click(within(categoryRow).getByRole('button', { name: /Dairy/ }));
    await user.click(within(categoryRow).getByRole('button', { name: /Vegetables/ }));
    await waitFor(() => expect(cardIds()).toEqual(['ing_002', 'ing_003']));
    expect(within(categoryRow).getByRole('button', { name: /Dairy/ })).toHaveAttribute('aria-pressed', 'true');

    await user.click(within(screen.getByTestId('dietary-filter')).getByRole('button', { name: 'Vegan' }));
    await waitFor(() => expect(cardIds()).toEqual(['ing_002']));
    expect(window.location.search).toBe('?category=dairy%2Cvegetables&diet=vegan');

    await user.click(screen.getByTestId('clear-ingredient-filters'));
    await waitFor(() => expect(cardIds()).toHaveLength(3));
    expect(window.location.search).toBe('');
  });

  it('applies the state from the URL and resets from the empty-filtered state', async () => {
    const user = userEvent.setup();
    setUrl('?q=zzz&category=protein');
    renderBrowser(<IngredientBrowserView lang="en" />);
    await waitFor(() => expect(screen.getByTestId('ingredients-empty-filtered')).toBeInTheDocument());
    await user.click(screen.getByTestId('reset-ingredient-filters'));
    await ready();
    expect(cardIds()).toHaveLength(3);
  });
});

describe('IngredientBrowser — "Recipes you can make"', () => {
  it('ranks recipes by the selected ingredients and keeps the selection in ?have=', async () => {
    const user = userEvent.setup();
    renderBrowser(<IngredientBrowserView lang="en" />);
    await ready();
    expect(screen.getByText('Select ingredients to find recipes')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'I have Chicken Breast' }));
    await user.click(screen.getByRole('button', { name: 'I have Spinach' }));
    expect(screen.getByRole('button', { name: 'I have Spinach' })).toHaveAttribute('aria-pressed', 'true');
    expect(window.location.search).toBe('?have=ing_001%2Cing_002');

    const matches = within(screen.getByTestId('matching-recipes')).getAllByRole('link');
    expect(matches.map((a) => a.getAttribute('data-recipe-id'))).toEqual(['rec_001', 'rec_002']);
    expect(matches[0]).toHaveTextContent('2/2 ingredients');
    expect(matches[1]).toHaveTextContent('1/2 ingredients');
    expect(matches[0]).toHaveAttribute('href', withBase('/recipes/rec_001/'));

    await user.click(screen.getByTestId('clear-selection'));
    expect(screen.queryByTestId('matching-recipes')).not.toBeInTheDocument();
    expect(window.location.search).toBe('');
  });
});
