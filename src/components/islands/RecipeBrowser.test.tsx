// @vitest-environment jsdom
import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { withBase } from '@/lib/href';
import { CATALOG_FILES } from '@/lib/catalog/use-catalog';
import { CategoriesFileSchema } from '@/schemas';
import { $favorites } from '@/stores/favorites';
import { makeIngredient, makeRecipe, mockBeverages, mockIngredientCategories } from '@/tests/fixtures/foodie-domain';
import { RecipeBrowserView } from './RecipeBrowser';

/**
 * jsdom tests of the `/recipes/` island (roadmap Issue 017): loading →
 * ready, search, filters, sort, favourites-only, grid/list, URL state and the
 * `use-listing` empty/error states. The catalog is served by a fake `fetch`
 * (same approach as `use-catalog.test.tsx`); URL state goes through the real
 * `window.location` / `history.replaceState`.
 */

const eggs = makeRecipe(); // rec_001 · breakfast · american · easy · 10 min · 4.5★ · vegetarian/glutenFree
const tacos = makeRecipe({
  id: 'rec_002',
  name: { en: 'Beef Tacos', es: 'Tacos de Res', fr: 'Tacos au Bœuf' },
  description: { en: 'Street food', es: 'Comida callejera', fr: 'Cuisine de rue' },
  type: 'dinner',
  cuisine: ['mexican'],
  totalTime: 35,
  difficulty: 'medium',
  tags: ['high-protein'],
  dietaryLabels: { glutenFree: true, vegetarian: false, vegan: false, dairyFree: true, lowCarb: false, keto: false, paleo: false },
  rating: 4.8,
  ingredients: [{ ingredientId: 'ing_beef', quantity: 500, unit: 'g', optional: false }],
});
const soup = makeRecipe({
  id: 'rec_003',
  name: { en: 'Onion Soup', es: 'Sopa de Cebolla', fr: 'Soupe à l’Oignon' },
  description: { en: 'Slow and hearty', es: 'Lenta y contundente', fr: 'Lente et copieuse' },
  type: 'lunch',
  cuisine: ['french'],
  totalTime: 60,
  difficulty: 'hard',
  tags: ['vegetarian', 'comfort-food'],
  dietaryLabels: { glutenFree: false, vegetarian: true, vegan: false, dairyFree: false, lowCarb: false, keto: false, paleo: false },
  rating: 3.9,
  ingredients: [{ ingredientId: 'ing_onion', quantity: 3, unit: 'piece', optional: false }],
});

const categories = CategoriesFileSchema.parse({
  mealTypes: [
    { id: 'breakfast', name: { en: 'Breakfast', es: 'Desayuno', fr: 'Petit-déjeuner' } },
    { id: 'lunch', name: { en: 'Lunch', es: 'Comida', fr: 'Déjeuner' } },
    { id: 'dinner', name: { en: 'Dinner', es: 'Cena', fr: 'Dîner' } },
    { id: 'dessert', name: { en: 'Dessert', es: 'Postre', fr: 'Dessert' } },
  ],
  cuisines: [
    { id: 'mexican', name: { en: 'Mexican', es: 'Mexicana', fr: 'Mexicaine' } },
    { id: 'french', name: { en: 'French', es: 'Francesa', fr: 'Française' } },
  ],
  dietaryTags: [
    { id: 'vegetarian', name: { en: 'Vegetarian', es: 'Vegetariano', fr: 'Végétarien' } },
    { id: 'gluten-free', name: { en: 'Gluten Free', es: 'Sin Gluten', fr: 'Sans Gluten' } },
    { id: 'kosher', name: { en: 'Kosher', es: 'Kosher', fr: 'Casher' } },
  ],
  ingredientCategories: mockIngredientCategories,
});

const payloads: Record<string, unknown> = {
  [CATALOG_FILES.recipes]: { recipes: [eggs, tacos, soup] },
  [CATALOG_FILES.ingredients]: {
    ingredients: [
      makeIngredient({ id: 'ing_001', avgPrice: 0.5 }),
      makeIngredient({ id: 'ing_002', avgPrice: 0.01 }),
      makeIngredient({ id: 'ing_beef', avgPrice: 0.05 }),
      makeIngredient({ id: 'ing_onion', avgPrice: 0.3 }),
    ],
  },
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

const cardNames = () => screen.getAllByTestId('recipe-card').map((card) => within(card).getByRole('heading', { level: 3 }).textContent);

async function ready() {
  await waitFor(() => expect(screen.getByTestId('recipe-browser')).toHaveAttribute('data-status', 'ready'));
}

function setUrl(search: string) {
  window.history.replaceState(null, '', `/recipes/${search}`);
}

beforeEach(() => {
  installFetch();
  setUrl('');
  $favorites.set([]);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('RecipeBrowser — states', () => {
  it('shows skeletons while loading, then the cards sorted by rating', async () => {
    renderBrowser(<RecipeBrowserView lang="en" />);
    expect(screen.getByTestId('recipe-skeletons')).toBeInTheDocument();
    expect(screen.getByTestId('recipe-browser')).toHaveAttribute('data-status', 'loading');
    await ready();
    expect(screen.queryByTestId('recipe-skeletons')).not.toBeInTheDocument();
    expect(cardNames()).toEqual(['Beef Tacos', 'Scrambled Eggs', 'Onion Soup']);
    expect(screen.getByTestId('results-count')).toHaveTextContent('3 recipes found');
    // Cards link to the localised detail route through withBase()
    expect(screen.getByRole('link', { name: 'Beef Tacos' })).toHaveAttribute('href', withBase('/recipes/rec_002/'));
  });

  it('renders the error state with a retry button when the recipes file fails', async () => {
    installFetch({ [CATALOG_FILES.recipes]: undefined });
    renderBrowser(<RecipeBrowserView lang="en" />);
    await waitFor(() => expect(screen.getByTestId('recipe-browser')).toHaveAttribute('data-status', 'error'));
    expect(screen.getByRole('alert')).toHaveTextContent('We could not load the recipes');
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('renders the zero-data empty state for an empty catalog', async () => {
    installFetch({ [CATALOG_FILES.recipes]: { recipes: [] } });
    renderBrowser(<RecipeBrowserView lang="en" />);
    await waitFor(() => expect(screen.getByTestId('empty-zero')).toBeInTheDocument());
    expect(screen.getByTestId('empty-zero')).toHaveTextContent('The catalog has no recipes yet');
  });

  it('renders the filtered empty state and "Clear filters" restores everything', async () => {
    const user = userEvent.setup();
    renderBrowser(<RecipeBrowserView lang="en" />);
    await ready();
    await user.type(screen.getByTestId('recipe-search'), 'nothing matches this');
    expect(await screen.findByTestId('empty-filtered')).toHaveTextContent('No recipes found');
    expect(screen.getByTestId('results-count')).toHaveTextContent('0 recipes found');
    await user.click(screen.getByTestId('reset-all'));
    await waitFor(() => expect(screen.getAllByTestId('recipe-card')).toHaveLength(3));
    expect(screen.getByTestId('recipe-search')).toHaveValue('');
  });
});

describe('RecipeBrowser — search, filters, sort', () => {
  it('searches name/description in the page language with EN fallback and writes ?q=', async () => {
    const user = userEvent.setup();
    renderBrowser(<RecipeBrowserView lang="es" />);
    await ready();
    expect(screen.getByTestId('results-count')).toHaveTextContent('3 recetas encontradas');

    await user.type(screen.getByTestId('recipe-search'), 'cebolla');
    await waitFor(() => expect(cardNames()).toEqual(['Sopa de Cebolla']));
    expect(window.location.search).toBe('?q=cebolla');

    // The description is searched in the page language…
    await user.clear(screen.getByTestId('recipe-search'));
    await user.type(screen.getByTestId('recipe-search'), 'callejera');
    await waitFor(() => expect(cardNames()).toEqual(['Tacos de Res']));
    expect(screen.getByTestId('results-count')).toHaveTextContent('1 receta encontrada');

    // …while names match in any locale (legacy: "onion" finds the soup on the ES site too).
    await user.clear(screen.getByTestId('recipe-search'));
    await user.type(screen.getByTestId('recipe-search'), 'onion');
    await waitFor(() => expect(cardNames()).toEqual(['Sopa de Cebolla']));
  });

  it('filters by meal type and cuisine, counts active filters and clears them', async () => {
    const user = userEvent.setup();
    renderBrowser(<RecipeBrowserView lang="en" />);
    await ready();

    const types = within(screen.getByTestId('filter-section-type'));
    // Only meal types with recipes are offered (no "Dessert").
    expect(types.queryByRole('checkbox', { name: /dessert/i })).not.toBeInTheDocument();
    await user.click(types.getByRole('checkbox', { name: /breakfast/i }));
    await waitFor(() => expect(cardNames()).toEqual(['Scrambled Eggs']));
    expect(screen.getByTestId('active-filter-count')).toHaveTextContent('1');
    expect(window.location.search).toBe('?type=breakfast');

    await user.click(types.getByRole('checkbox', { name: /dinner/i }));
    const cuisines = within(screen.getByTestId('filter-section-cuisine'));
    await user.click(cuisines.getByRole('checkbox', { name: /mexican/i }));
    await waitFor(() => expect(cardNames()).toEqual(['Beef Tacos']));
    expect(screen.getByTestId('active-filter-count')).toHaveTextContent('3');
    expect(window.location.search).toBe('?type=breakfast%2Cdinner&cuisine=mexican');

    await user.click(screen.getByTestId('clear-filters'));
    await waitFor(() => expect(screen.getAllByTestId('recipe-card')).toHaveLength(3));
    expect(screen.queryByTestId('active-filter-count')).not.toBeInTheDocument();
    expect(window.location.search).toBe('');
  });

  it('filters by dietary tag (flags or tags), difficulty and max time', async () => {
    const user = userEvent.setup();
    renderBrowser(<RecipeBrowserView lang="en" />);
    await ready();

    const dietary = within(screen.getByTestId('filter-section-dietary'));
    expect(dietary.queryByRole('checkbox', { name: /kosher/i })).not.toBeInTheDocument(); // zero matches → hidden
    await user.click(dietary.getByRole('checkbox', { name: /gluten free/i }));
    await waitFor(() => expect(cardNames()).toEqual(['Beef Tacos', 'Scrambled Eggs']));

    await user.click(within(screen.getByTestId('filter-section-difficulty')).getByRole('checkbox', { name: /easy/i }));
    await waitFor(() => expect(cardNames()).toEqual(['Scrambled Eggs']));

    await user.click(within(screen.getByTestId('filter-section-difficulty')).getByRole('checkbox', { name: /easy/i }));
    await user.click(within(screen.getByTestId('filter-section-time')).getByRole('radio', { name: /15 minutes or less/i }));
    await waitFor(() => expect(cardNames()).toEqual(['Scrambled Eggs']));
    expect(window.location.search).toBe('?diet=gluten-free&time=15');
    expect(screen.getByTestId('filter-section-time')).toHaveTextContent('≤15m');
  });

  it('shows only favourites when the switch is on and reflects $favorites live', async () => {
    const user = userEvent.setup();
    $favorites.set(['rec_003']);
    renderBrowser(<RecipeBrowserView lang="en" />);
    await ready();
    // Roadmap #020: every card carries a FavoriteButton; only Onion Soup's is pressed
    // (adapted from the #017 read-only heart mark, which the button replaces here).
    await waitFor(() => {
      const pressed = screen.getAllByTestId('recipe-card').filter(
        (card) => within(card).getByTestId('recipe-card-favorite-button').getAttribute('aria-pressed') === 'true',
      );
      expect(pressed.map((card) => within(card).getByRole('heading', { level: 3 }).textContent)).toEqual(['Onion Soup']);
    });

    await user.click(screen.getByTestId('favorites-only'));
    await waitFor(() => expect(cardNames()).toEqual(['Onion Soup']));
    expect(window.location.search).toBe('?favorites=1');

    $favorites.set(['rec_003', 'rec_001']);
    await waitFor(() => expect(cardNames()).toEqual(['Scrambled Eggs', 'Onion Soup']));
  });

  it('toggles a favourite from its card: $favorites, toast, and the favourites-only list update (roadmap #020)', async () => {
    const user = userEvent.setup();
    setUrl('?favorites=1');
    $favorites.set(['rec_003', 'rec_002']);
    renderBrowser(<RecipeBrowserView lang="es" />);
    await ready();
    expect(cardNames()).toEqual(['Tacos de Res', 'Sopa de Cebolla']);

    await user.click(screen.getByRole('button', { name: 'Favorito: Tacos de Res' }));
    expect($favorites.get()).toEqual(['rec_003']);
    expect(await screen.findByText('Tacos de Res quitada de tus favoritos')).toBeInTheDocument();
    await waitFor(() => expect(cardNames()).toEqual(['Sopa de Cebolla']));
    expect(localStorage.getItem('favoriteRecipes')).toBe('["rec_003"]');
  });

  it('sorts by time, cost and name from the URL and exposes the sorter', async () => {
    setUrl('?sort=time-asc');
    const { unmount } = renderBrowser(<RecipeBrowserView lang="en" />);
    await ready();
    expect(cardNames()).toEqual(['Scrambled Eggs', 'Beef Tacos', 'Onion Soup']);
    expect(screen.getByTestId('recipe-sorter')).toHaveTextContent('Time (Shortest first)');
    unmount();

    // eggs 4×0.5+30×0.01 = 2.3 · tacos 500×0.05 = 25 · soup 3×0.3 = 0.9
    setUrl('?sort=cost-asc');
    const second = renderBrowser(<RecipeBrowserView lang="en" />);
    await ready();
    expect(cardNames()).toEqual(['Onion Soup', 'Scrambled Eggs', 'Beef Tacos']);
    second.unmount();

    setUrl('?sort=name-asc');
    renderBrowser(<RecipeBrowserView lang="fr" />);
    await ready();
    expect(cardNames()).toEqual(['Œufs Brouillés', 'Soupe à l’Oignon', 'Tacos au Bœuf']);
  });
});

describe('RecipeBrowser — URL state and views', () => {
  it('initialises every control from the query string', async () => {
    setUrl('?q=eggs&type=breakfast&diet=vegetarian&difficulty=easy&time=30&view=list');
    renderBrowser(<RecipeBrowserView lang="en" />);
    await ready();
    expect(screen.getByTestId('recipe-search')).toHaveValue('eggs');
    expect(within(screen.getByTestId('filter-section-type')).getByRole('checkbox', { name: /breakfast/i })).toBeChecked();
    expect(within(screen.getByTestId('filter-section-dietary')).getByRole('checkbox', { name: /vegetarian/i })).toBeChecked();
    expect(within(screen.getByTestId('filter-section-difficulty')).getByRole('checkbox', { name: /easy/i })).toBeChecked();
    expect(within(screen.getByTestId('filter-section-time')).getByRole('radio', { name: /30 minutes or less/i })).toBeChecked();
    expect(screen.getByTestId('active-filter-count')).toHaveTextContent('4');
    expect(screen.getByTestId('recipe-results')).toHaveAttribute('data-view', 'list');
    expect(cardNames()).toEqual(['Scrambled Eggs']);
    // The URL is left untouched (same state → same query string).
    expect(window.location.search).toBe('?q=eggs&type=breakfast&diet=vegetarian&difficulty=easy&time=30&view=list');
  });

  it('switches between grid and list and persists the view in the URL', async () => {
    const user = userEvent.setup();
    renderBrowser(<RecipeBrowserView lang="en" />);
    await ready();
    expect(screen.getByTestId('recipe-results')).toHaveAttribute('data-view', 'grid');
    expect(screen.getAllByTestId('recipe-card')[0]).toHaveAttribute('data-view', 'grid');

    await user.click(screen.getByRole('button', { name: 'List view' }));
    await waitFor(() => expect(screen.getByTestId('recipe-results')).toHaveAttribute('data-view', 'list'));
    expect(screen.getAllByTestId('recipe-card')[0]).toHaveAttribute('data-view', 'list');
    expect(window.location.search).toBe('?view=list');

    await user.click(screen.getByRole('button', { name: 'Grid view' }));
    await waitFor(() => expect(window.location.search).toBe(''));
  });

  it('follows browser navigation (popstate) back to a previous state', async () => {
    renderBrowser(<RecipeBrowserView lang="en" />);
    await ready();
    expect(screen.getAllByTestId('recipe-card')).toHaveLength(3);
    setUrl('?type=lunch');
    window.dispatchEvent(new PopStateEvent('popstate'));
    await waitFor(() => expect(cardNames()).toEqual(['Onion Soup']));
  });

  it('accepts an explicit initialState (embedding/tests) without touching the URL', async () => {
    setUrl('?unrelated=1');
    renderBrowser(
      <RecipeBrowserView
        lang="en"
        initialState={{ search: '', types: ['dinner'], cuisines: [], dietaryTags: [], difficulties: [], favoritesOnly: false, sort: 'rating-desc', view: 'grid' }}
      />,
    );
    await ready();
    expect(cardNames()).toEqual(['Beef Tacos']);
    expect(window.location.search).toBe('?type=dinner');
  });
});
