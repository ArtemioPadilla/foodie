---
title: State and storage
description: Every Nano Store, the localStorage key it persists to and the schema that validates it — and why Foodie uses stores instead of React Context.
---

Foodie is local-first (ADR 0002): what you plan, buy, stock and eat is stored
in your browser's `localStorage`, never on a server. Shared state is held in
[Nano Stores](https://github.com/nanostores/nanostores) atoms in
`src/stores/`; the persistent ones are created with `persistentAtom`
(`src/lib/persist.ts`), which adds `localStorage`, Zod validation and sync
between tabs.

## Stores

| Store module | Atoms | `localStorage` key | Schema |
|---|---|---|---|
| `theme.ts` | `$theme` | `theme` | — (`light` / `dark`) |
| `preferences.ts` | `$preferences`, `$unitSystem`, `$dietaryRestrictions`, `$currency`, `$themePreference` | `foodie:preferences` (guest) or `user-preferences-<uid>` | `UserPreferencesSchema` |
| `favorites.ts` | `$favorites`, `$favoriteCount` | `favoriteRecipes` (guest) or `user-favorites-<uid>` | `FavoriteRecipesSchema` |
| `planner.ts` | `$currentPlan`, `$savedPlans`, `$hasPlan`, `$currentPlanMealCount` | `currentMealPlan`, `savedMealPlans` | `MealPlanSchema`, `SavedMealPlansSchema` |
| `shopping.ts` | `$shopping`, `$shoppingCount`, `$shoppingCheckedCount`, `$shoppingRemaining` | `shoppingList` | `ShoppingListSchema` |
| `prices.ts` | `$customPrices` | `foodie:custom-prices` | `CustomPricesSchema` |
| `pantry.ts` | `$pantry`, `$pantryCount` | `pantryItems` | `PantryItemsSchema` |
| `tracking.ts` | `$tracking`, `$todayEntries`, `$todayTotals`, `$todayProgress` | `trackingEntries` | `TrackingEntriesSchema` |
| `goals.ts` | `$goals` | `nutritionGoals` | `NutritionGoalsSchema` |
| `contribute-draft.ts` | `$contributeDraft`, `$hasContributeDraft` | `foodie:contribute-draft` | `ContributeDraftSchema` |
| `account-merge.ts` | `$mergedAccounts`, `$mergeNotice` | `foodie:anon-merged` | `MergedAccountsSchema` |
| `user.ts` | `$user`, `$authReady` | `foodie:auth-session` (the value `1`: a hint, no identity or token) | `AuthUserSchema` (in memory) |
| `online.ts`, `install.ts`, `storage-status.ts` | `$online`, `$installPrompt`, `$needsRefresh`, `$storageQuotaExceeded` | — (memory) | — |

The schemas are documented field by field in the
[data model](../api/).

### Keys kept from v1

The keys without a `foodie:` prefix are the ones v1 used; they were kept
verbatim so data saved by v1 opens in v2 unchanged. New keys use the
`foodie:` prefix. The v1 GitHub token key (`github-access-token`) is deleted
on every page load and never read. `i18nextLng`, v1's language choice, is still read to send a returning
visitor to the right locale; an explicit choice made in v2 (the language
switcher or `/profile/`) is stored as `foodie:locale` and wins.

### Validation

Every read goes through the store's schema. A value that fails to parse (edited
by hand, written by an older version) falls back to the default **without**
being overwritten, so nothing is lost silently. When `localStorage` is full,
`persistentAtom` catches the `QuotaExceededError` and sets
`$storageQuotaExceeded`; one island in the layout shows a toast.

### Export and clear

`/profile/` can download every Foodie key as one JSON file
(`UserDataExportSchema`, format `foodie-user-data`) and clear them. Auth
plumbing keys are left alone and credentials are never exported.

## Using a store in an island

```tsx
import { useStore } from '@nanostores/react';
import { $favorites, toggleFavorite } from '@/stores/favorites';
import type { Locale } from '@/i18n';

export default function FavoriteButton({ recipeId, lang }: { recipeId: string; lang: Locale }) {
  const favorites = useStore($favorites);
  const isFavorite = favorites.includes(recipeId);
  return (
    <button type="button" aria-pressed={isFavorite} onClick={() => toggleFavorite(recipeId)}>
      {isFavorite ? '★' : '☆'}
    </button>
  );
}
```

- Subscribe with `useStore($atom)`; change state with the exported actions
  (`addRecipeToPlan`, `generateFromPlan`, `logEntry`, `duplicateDay`, …).
  Actions are plain functions, usable from tests and other stores.
- Derived values are `computed` atoms. Subscribe to the narrowest one.
- Pure selectors in `src/lib/domain/` take the data as arguments; never call
  `$store.get()` during render (it does not subscribe).
- Islands render on the server with the default value and then with the stored
  one. Read-heavy islands show a skeleton until the store has hydrated.
- Stores never import UI and never read `navigator.language`.

## Why not React Context

Astro hydrates each `client:*` island as its own React root. A provider in one
island is invisible to its siblings, so `useContext()` there silently returns
the default. v1 wrapped the whole SPA in providers, which is exactly the "one
island for the whole app" pattern Inceptor forbids. Nano Stores live outside
React, so every island on the page shares them. Context is still fine inside a
single island, such as the contribute wizard's step state.

## Adding a persisted store

1. Define the schema and its default in `src/schemas/`.
2. Record the key in ADR 0002 (`docs/decisions/0002-local-first-user-data.md`)
   with the `foodie:` prefix.
3. `export const $thing = persistentAtom('foodie:thing', ThingSchema, DEFAULT_THING, { onQuotaExceeded: notifyQuotaExceeded });`
4. Export actions and `computed` selectors next to it.
5. Test it under jsdom: clear `localStorage` in `beforeEach`, assert the key,
   re-import with `vi.resetModules()` to test hydration.
