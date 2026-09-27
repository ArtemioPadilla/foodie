// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { $favoriteCount, $favorites, addFavorite, clearFavorites, isFavorite, removeFavorite, toggleFavorite } from './favorites';

beforeEach(() => {
  localStorage.clear();
  clearFavorites();
});

describe('$favorites', () => {
  it('persists under the legacy "favoriteRecipes" key', () => {
    toggleFavorite('rec_001');
    expect(JSON.parse(localStorage.getItem('favoriteRecipes')!)).toEqual(['rec_001']);
  });

  it('hydrates legacy data on import', async () => {
    localStorage.setItem('favoriteRecipes', JSON.stringify(['rec_007', 'rec_009']));
    vi.resetModules();
    const fresh = await import('./favorites');
    expect(fresh.$favorites.get()).toEqual(['rec_007', 'rec_009']);
  });

  it('toggleFavorite appends when absent and removes when present', () => {
    toggleFavorite('rec_001');
    toggleFavorite('rec_002');
    expect($favorites.get()).toEqual(['rec_001', 'rec_002']);
    toggleFavorite('rec_001');
    expect($favorites.get()).toEqual(['rec_002']);
  });

  it('addFavorite is idempotent and removeFavorite ignores unknown ids', () => {
    addFavorite('rec_001');
    addFavorite('rec_001');
    expect($favorites.get()).toEqual(['rec_001']);
    removeFavorite('nope');
    expect($favorites.get()).toEqual(['rec_001']);
  });

  it('isFavorite reads the store by default or an explicit list', () => {
    addFavorite('rec_001');
    expect(isFavorite('rec_001')).toBe(true);
    expect(isFavorite('rec_002')).toBe(false);
    expect(isFavorite('x', ['x'])).toBe(true);
  });

  it('$favoriteCount is derived with computed', () => {
    expect($favoriteCount.get()).toBe(0);
    addFavorite('a');
    addFavorite('b');
    expect($favoriteCount.get()).toBe(2);
  });
});
