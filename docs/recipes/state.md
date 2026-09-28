# State: consuming a store from an island (and why not Context)

**Source of truth:** `src/stores/*.ts` — Nano Stores atoms, most of them
persisted to `localStorage` through `persistentAtom` (`src/lib/persist.ts`).
Roadmap D5 / Issues 012–013.

| Store (module)               | Atom(s)                                                                      | `localStorage` key                  | Port of                           |
| ---------------------------- | ---------------------------------------------------------------------------- | ----------------------------------- | --------------------------------- |
| `stores/theme.ts` (template) | `$theme`                                                                     | `theme`                             | `ThemeContext`                    |
| `stores/preferences.ts`      | `$preferences`, `$unitSystem`, `$dietaryRestrictions`, `$themePreference`    | `foodie:preferences` (guest)        | `AuthContext` preferences         |
| `stores/favorites.ts`        | `$favorites`, `$favoriteCount`                                               | `favoriteRecipes`                   | `RecipeContext.favoriteRecipes`   |
| `stores/planner.ts`          | `$currentPlan`, `$savedPlans`, `$hasPlan`, `$currentPlanMealCount`           | `currentMealPlan`, `savedMealPlans` | `PlannerContext`, `PlanTemplates` |
| `stores/shopping.ts`         | `$shopping`, `$shoppingCount`, `$shoppingCheckedCount`, `$shoppingRemaining` | `shoppingList`                      | `ShoppingContext`                 |
| `stores/pantry.ts`           | `$pantry`, `$pantryCount`                                                    | `pantryItems`                       | `PantryContext`                   |
| `stores/tracking.ts`         | `$tracking`, `$todayEntries`, `$todayTotals`, `$todayProgress`               | `trackingEntries`                   | `TrackingContext` (entries)       |
| `stores/goals.ts`            | `$goals`                                                                     | `nutritionGoals`                    | `TrackingContext` (goals)         |
| `stores/storage-status.ts`   | `$storageQuotaExceeded`                                                      | — (in memory)                       | new                               |

The legacy keys are kept verbatim so a user's data survives the cutover
(ADR 0002); every read is validated with the Zod schema from `src/schemas/`
and an invalid value falls back to the default without being overwritten.

## Reading a store from a React island

```tsx
// src/components/islands/FavoriteButton.tsx
import { useStore } from '@nanostores/react';
import { $favorites, toggleFavorite } from '@/stores/favorites';
import type { Locale } from '@/schemas';

export default function FavoriteButton({
  recipeId,
  lang,
}: {
  recipeId: string;
  lang: Locale;
}) {
  const favorites = useStore($favorites); // re-renders only when $favorites changes
  const isFavorite = favorites.includes(recipeId);
  return (
    <button
      type="button"
      aria-pressed={isFavorite}
      onClick={() => toggleFavorite(recipeId)}
    >
      {isFavorite ? '★' : '☆'}
    </button>
  );
}
```

```astro
---
// Any page: two independent islands share the same store.
import FavoriteButton from '@/components/islands/FavoriteButton';
import FavoriteCount from '@/components/islands/FavoriteCount';
const lang = 'en';
---

<FavoriteButton client:visible recipeId="rec_001" lang={lang} />
<FavoriteCount client:idle lang={lang} />
```

Rules of thumb:

- **Subscribe with `useStore($atom)`; mutate with the exported actions**
  (`addRecipeToPlan`, `generateFromPlan`, `logEntry`, `duplicateDay`,
  `adjustGlobalServings`, …). Actions are plain functions without React, so
  they also work from Astro `<script>` blocks, tests and other stores.
- **Derived data is a `computed`** (`$todayTotals`, `$shoppingRemaining`,
  `$hasPlan`). Subscribe to the narrowest store you need to avoid re-renders.
- **Pure selectors take the data explicitly** (`getExpiringItems(items, days)`,
  `dailySummary(entries, goals, date)` in `lib/domain/tracking`). Pass the
  value you already got from `useStore`; never call `$store.get()` during
  render (it would not subscribe).
- **Hydration:** the atoms are hydrated eagerly at module load when a `window`
  exists, so `$store.get()` is already correct inside an action. Islands render
  first on the server with the default value and then with the stored one;
  read-heavy islands should use `client:only="react"` or guard against the
  one-frame mismatch (e.g. render a skeleton until `useStore` has run once).
- **`lang` comes in as a prop.** Stores never read `navigator.language`;
  localised text is picked with `pickLang(text, lang)` / `getTranslated`.
- **Storage full?** `persistentAtom` swallows `QuotaExceededError` and the
  stores route it to `$storageQuotaExceeded`; one island in the layout
  subscribes and shows `toast()`. Stores never import UI.

## Why not React Context

Astro hydrates every `client:*` component as **its own React root**. A
`<Provider>` in one island is invisible to a sibling island, so
`useContext()` there returns the default value — silently. The legacy
`PlannerProvider`/`ShoppingProvider`/… wrapped the whole SPA, which is exactly
the "one island for the whole app" anti-pattern Inceptor forbids.

Nano Stores live outside React: a module-level atom is shared by every island
on the page (and by inline scripts), `useStore` subscribes a component to it,
and `persistentAtom` adds `localStorage` + cross-tab sync without any provider
tree. Context remains fine **inside** one island (a form wizard's step state, a
`Dialog` composition) — it just must not cross an island boundary.

Enforced by the Validation block of roadmap Issue 013:

```bash
grep -rn "createContext" src/stores | wc -l   # 0
```

## Adding a new persisted store

1. Define the Zod schema (and a `DEFAULT_*` value) in `src/schemas/`.
2. Add the key to ADR 0002 (`docs/decisions/0002-local-first-user-data.md`):
   legacy keys stay verbatim, new keys use the `foodie:` prefix.
3. `export const $thing = persistentAtom('foodie:thing', ThingSchema, DEFAULT_THING, { onQuotaExceeded: notifyQuotaExceeded });`
4. Export actions and `computed` selectors next to it; keep UI (toasts,
   navigation) out of the store.
5. Test with the `// @vitest-environment jsdom` pragma: clear `localStorage`
   in `beforeEach`, assert the key, hydrate with `vi.resetModules()` +
   `await import('./thing')`.
