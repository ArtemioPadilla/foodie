import { computed } from 'nanostores';
import { FavoriteRecipesSchema, type FavoriteRecipes } from '@/schemas';
import { persistentAtom } from '@/lib/persist';
import { notifyQuotaExceeded } from './storage-status';
import { $user } from './user';

/**
 * Favourite recipe ids (port of `RecipeContext.favoriteRecipes`). The key
 * follows the session (roadmap Issue 037): guests keep the legacy
 * `favoriteRecipes` key, a signed-in user the legacy per-account
 * `user-favorites-${uid}` (v1 `AuthContext`), so existing favourites of both
 * kinds survive. The one-time guest → account merge is in `./account-merge`.
 */
export const FAVORITES_KEY = 'favoriteRecipes';

/** The key `$favorites` uses for a session (`null` = guest). */
export function favoritesKeyFor(uid: string | null | undefined): string {
  return uid ? `user-favorites-${uid}` : FAVORITES_KEY;
}

export const $favorites = persistentAtom<FavoriteRecipes>(
  () => favoritesKeyFor($user.get()?.uid),
  FavoriteRecipesSchema,
  [],
  { onQuotaExceeded: notifyQuotaExceeded, keyDeps: [$user] },
);

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
