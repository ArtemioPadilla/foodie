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
import { makeRecipe, mockBeverages, mockIngredientCategories } from '@/tests/fixtures/foodie-domain';
import FavoriteRecipes from './FavoriteRecipes';

// The real QueryProvider persists to IndexedDB (absent in jsdom); the test
// wraps the island in its own QueryClientProvider instead.
vi.mock('./QueryProvider', () => ({ default: ({ children }: { children: React.ReactNode }) => children }));

/**
 * The landing's "Your favorites" island (roadmap Issue 020): empty slot and
 * no catalog fetch without favourites; newest-first cards with their
 * FavoriteButton and a `/recipes/?favorites=1` link once there are some.
 */
const recipes = ['rec_001', 'rec_002', 'rec_003', 'rec_004'].map((id, i) =>
  makeRecipe({ id, name: { en: `Recipe ${i + 1}`, es: `Receta ${i + 1}`, fr: `Recette ${i + 1}` } }),
);
const categories = CategoriesFileSchema.parse({
  mealTypes: [{ id: 'breakfast', name: { en: 'Breakfast', es: 'Desayuno', fr: 'Petit-déjeuner' } }],
  cuisines: [{ id: 'american', name: { en: 'American', es: 'Americana', fr: 'Américaine' } }],
  dietaryTags: [{ id: 'vegan', name: { en: 'Vegan', es: 'Vegano', fr: 'Végétalien' } }],
  ingredientCategories: mockIngredientCategories,
});
const payloads: Record<string, unknown> = {
  [CATALOG_FILES.recipes]: { recipes },
  [CATALOG_FILES.ingredients]: { ingredients: [] },
  [CATALOG_FILES.beverages]: mockBeverages,
  [CATALOG_FILES.categories]: categories,
};

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  localStorage.clear();
  $favorites.set([]);
  fetchMock = vi.fn(async (input: string | URL | Request) => {
    const path = String(input).replace(withBase('/'), '/');
    return { ok: path in payloads, status: 200, statusText: 'OK', json: async () => payloads[path] } as unknown as Response;
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderIsland(lang: 'en' | 'es' | 'fr' = 'en', limit?: number) {
  // A fresh client per test keeps caches apart.
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <FavoriteRecipes lang={lang} limit={limit} />
    </QueryClientProvider>,
  );
}

describe('FavoriteRecipes', () => {
  it('renders only an empty slot and fetches nothing without favourites', () => {
    renderIsland();
    expect(screen.getByTestId('favorite-recipes-slot')).toBeInTheDocument();
    expect(screen.queryByTestId('favorite-recipes')).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows the favourites newest first, capped, with a link to /recipes/?favorites=1', async () => {
    $favorites.set(['rec_001', 'rec_003', 'rec_002', 'rec_004']);
    renderIsland('es', 3);
    const section = await screen.findByTestId('favorite-recipes');
    expect(within(section).getByRole('heading', { level: 2 })).toHaveTextContent('Tus favoritos');
    await waitFor(() => expect(within(section).getAllByTestId('recipe-card')).toHaveLength(3));
    expect(within(section).getAllByTestId('recipe-card').map((c) => c.getAttribute('data-recipe-id'))).toEqual(['rec_004', 'rec_002', 'rec_003']);
    expect(screen.getByTestId('favorites-view-all')).toHaveAttribute('href', `${withBase('/es/recipes/')}?favorites=1`);
    expect(screen.getByTestId('favorites-more')).toHaveTextContent('+1 más en tus favoritos');
  });

  it('removing a favourite from its card updates the section, and the last one hides it', async () => {
    const user = userEvent.setup();
    $favorites.set(['rec_002']);
    renderIsland();
    await waitFor(() => expect(screen.getAllByTestId('recipe-card')).toHaveLength(1));
    await user.click(screen.getByRole('button', { name: 'Favorite: Recipe 2' }));
    expect($favorites.get()).toEqual([]);
    await waitFor(() => expect(screen.queryByTestId('favorite-recipes')).not.toBeInTheDocument());
    expect(screen.getByTestId('favorite-recipes-slot')).toBeInTheDocument();
  });

  it('skips ids that are no longer in the catalog', async () => {
    $favorites.set(['rec_999']);
    renderIsland();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByTestId('favorite-recipes-slot')).toBeInTheDocument());
    expect(screen.queryByTestId('recipe-card')).not.toBeInTheDocument();
  });
});
