// @vitest-environment jsdom
import * as React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Toaster } from '@/components/ui/toast';
import { $favorites, FAVORITES_KEY } from '@/stores/favorites';
import { FavoriteButton } from './FavoriteButton';

/**
 * FavoriteButton (roadmap Issue 020): `aria-pressed` toggle over
 * `$favorites`, a toast on add/remove, persistence under the legacy
 * `favoriteRecipes` key — including favourites written by the legacy app.
 */
function renderButton(props: Partial<React.ComponentProps<typeof FavoriteButton>> = {}) {
  return render(
    <>
      <FavoriteButton recipeId="rec_001" recipeName="Scrambled Eggs" lang="en" {...props} />
      <Toaster />
    </>,
  );
}

beforeEach(() => {
  localStorage.clear();
  $favorites.set([]);
});

describe('FavoriteButton', () => {
  it('toggles $favorites with aria-pressed and toasts on add and remove', async () => {
    const onFavoriteChange = vi.fn();
    renderButton({ onFavoriteChange });
    const button = screen.getByRole('button', { name: /add to favorites/i });
    expect(button).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(button);
    expect($favorites.get()).toEqual(['rec_001']);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveTextContent('Favorited');
    expect(await screen.findByText('Scrambled Eggs added to your favorites')).toBeInTheDocument();
    expect(onFavoriteChange).toHaveBeenLastCalledWith(true);

    fireEvent.click(button);
    expect($favorites.get()).toEqual([]);
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(await screen.findByText('Scrambled Eggs removed from your favorites')).toBeInTheDocument();
    expect(onFavoriteChange).toHaveBeenLastCalledWith(false);
  });

  it('persists under the legacy `favoriteRecipes` key as a JSON array', () => {
    renderButton();
    fireEvent.click(screen.getByRole('button'));
    expect(FAVORITES_KEY).toBe('favoriteRecipes');
    expect(localStorage.getItem('favoriteRecipes')).toBe('["rec_001"]');
  });

  it('icon appearance keeps a constant localised name and only flips aria-pressed', () => {
    renderButton({ appearance: 'icon', lang: 'fr', recipeName: 'Œufs Brouillés' });
    const button = screen.getByRole('button', { name: 'Favori : Œufs Brouillés' });
    fireEvent.click(button);
    expect(screen.getByRole('button', { name: 'Favori : Œufs Brouillés' })).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveAttribute('title', 'Retirer des favoris');
  });

  it('reflects changes made elsewhere (another island or tab) live', () => {
    renderButton();
    act(() => $favorites.set(['rec_001']));
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('server-renders unpressed whatever the store holds, so hydration never mismatches', () => {
    $favorites.set(['rec_001']);
    const html = renderToString(<FavoriteButton recipeId="rec_001" recipeName="Eggs" lang="en" />);
    expect(html).toContain('aria-pressed="false"');
  });
});

describe('FavoriteButton — legacy data', () => {
  it('shows favourites saved by the legacy app (`favoriteRecipes` written with JSON.stringify)', async () => {
    // Legacy RecipeContext: localStorage.setItem('favoriteRecipes', JSON.stringify(newFavorites))
    localStorage.setItem('favoriteRecipes', JSON.stringify(['rec_001', 'rec_042']));
    vi.resetModules();
    const stores = await import('@/stores/favorites');
    const { FavoriteButton: FreshButton } = await import('./FavoriteButton');
    expect(stores.$favorites.get()).toEqual(['rec_001', 'rec_042']);

    render(
      <>
        <FreshButton recipeId="rec_042" recipeName="Legacy Soup" lang="es" />
        <FreshButton recipeId="rec_007" recipeName="Other" lang="es" />
      </>,
    );
    const [legacy, other] = screen.getAllByRole('button');
    await waitFor(() => expect(legacy).toHaveAttribute('aria-pressed', 'true'));
    expect(other).toHaveAttribute('aria-pressed', 'false');

    // Removing keeps the same key and format the legacy app reads.
    fireEvent.click(legacy as HTMLElement);
    expect(localStorage.getItem('favoriteRecipes')).toBe('["rec_001"]');
  });
});
