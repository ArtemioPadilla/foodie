/**
 * User preferences + profile — persisted per user under
 * `localStorage['user-preferences-<uid>']` / `['user-favorites-<uid>']`, and
 * for guests under the anonymous `favoriteRecipes` key.
 */
import { z } from 'zod';

export const UNIT_SYSTEMS = ['metric', 'imperial', 'auto'] as const;
export const UnitSystemSchema = z.enum(UNIT_SYSTEMS);
export type UnitSystem = z.infer<typeof UnitSystemSchema>;

export const UserPreferencesSchema = z.object({
  /** BCP-47-ish tag as stored by legacy i18next (`en`, `es`, `fr`, `en-US`…). */
  language: z.string(),
  theme: z.string(),
  defaultServings: z.number().int().positive(),
  dietaryRestrictions: z.array(z.string()),
  allergies: z.array(z.string()),
  excludedIngredients: z.array(z.string()),
  unitSystem: UnitSystemSchema,
});
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;

export const DEFAULT_PREFERENCES: UserPreferences = UserPreferencesSchema.parse({
  language: 'en',
  theme: 'system',
  defaultServings: 2,
  dietaryRestrictions: [],
  allergies: [],
  excludedIngredients: [],
  unitSystem: 'auto',
});

/** Favorite recipe ids (`localStorage['favoriteRecipes']`). */
export const FavoriteRecipesSchema = z.array(z.string().min(1));
export type FavoriteRecipes = z.infer<typeof FavoriteRecipesSchema>;

export const UserProfileSchema = z.object({
  id: z.string().min(1),
  email: z.string(),
  displayName: z.string(),
  photoURL: z.string().optional(),
  preferences: UserPreferencesSchema,
  favoriteRecipes: FavoriteRecipesSchema,
  /** ISO datetime string. */
  createdAt: z.string(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;
