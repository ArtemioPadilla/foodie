import { computed } from 'nanostores';
import { FavoriteRecipesSchema, type FavoriteRecipes } from '@/schemas';
import { persistentAtom } from '@/lib/persist';
import { notifyQuotaExceeded } from './storage-status';

/**
 * Favourite recipe ids (port of `RecipeContext.favoriteRecipes`). Same
 * `localStorage` key as the legacy app so existing favourites survive.
 */
export const FAVORITES_KEY = 'favoriteRecipes';

export const $favorites = persistentAtom<FavoriteRecipes>(FAVORITES_KEY, FavoriteRecipesSchema, [], {
  onQuotaExceeded: notifyQuotaExceeded,
});

export const $favoriteCount = computed($favorites, (ids) => ids.length);

export function isFavorite(recipeId: string, favorites: ReadonlyArray<string> = $favorites.get()): boolean {
  return favorites.includes(recipeId);
}

export function addFavorite(recipeId: string): void {
  const current = $favorites.get();
  if (!current.includes(recipeId)) $favorites.set([...current, recipeId]);
}

export function removeFavorite(recipeId: string): void {
  const current = $favorites.get();
  if (current.includes(recipeId)) $favorites.set(current.filter((id) => id !== recipeId));
}

/** Legacy `toggleFavorite`: append when absent, drop when present. */
export function toggleFavorite(recipeId: string): void {
  if (isFavorite(recipeId)) removeFavorite(recipeId);
  else addFavorite(recipeId);
}

export function clearFavorites(): void {
  $favorites.set([]);
}
