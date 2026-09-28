# Foodie domain

`gallery.ts` category: `domain` — the Foodie-specific components in
`src/components/domain/` (roadmap Issues 017–021). **Coverage in this file:
all ten entries** — RecipeCard, IngredientCard, NutritionFacts,
DietaryBadges, DifficultyBadge, TimeBadge, CategoryChip, ServingsAdjuster,
RecipeTimer, FavoriteButton. Every one has a light + dark demo at
`/gallery/<slug>/` (one island, `ShowcaseFoodie`, keyed by slug) and a usage
snippet in `src/content/gallery-recipes.ts`.

Rules shared by every component here:

- **`lang: Locale` is a prop**; strings come from `t()` / `getTranslated()`
  (`src/i18n`). Never read `navigator.language` during render.
- **Links are built by the caller** with `withBase(localizedRoute(path, lang))`
  and passed as `href` — components never build URLs.
- **Plain function components** (React 19): no `React.FC`, no `forwardRef`
  (a `ref` is an ordinary prop now). Only kit primitives (`Badge`, `Card`,
  `Button`, `Table`, `Dialog`, `Skeleton`) — no legacy `.btn-*` / `.card`
  global classes.
- **Movement is `motion-safe:`** (hover lifts, the timer ring) — enforced by
  `npm run ux:check` (`src/tests/ux-motion.test.ts`).
- Server-renderable ones (cards, badges, NutritionFacts) are used directly in
  `.astro` pages with no `client:*` directive; the stateful ones
  (ServingsAdjuster, RecipeTimer, FavoriteButton) only inside an island.

---

## RecipeCard

Source: [`src/components/domain/RecipeCard.tsx`](../../src/components/domain/RecipeCard.tsx)

**Purpose**: Catalog card of a recipe — art (image or per-meal-type
placeholder), title, description, dietary badges, time / servings / rating,
difficulty.

**When to use**: Any list of recipes (browser grid, landing "featured",
"your favourites", related recipes). For a picker (planner) pass `onClick`
instead of `href`.

**API overview**:

```tsx
<RecipeCard
  recipe={recipe}            // Recipe (Zod schema)
  lang={lang}
  href={withBase(localizedRoute(`/recipes/${recipe.id}/`, lang))}
  view="grid"                // 'grid' | 'list'
  showFavoriteButton         // interactive FavoriteButton — islands only
  isFavorite                 // read-only heart — static HTML
  showNutrition              // kcal / protein / carbs footer
/>
<RecipeCardSkeleton view="list" />
```

**Common mistakes**:

- `showFavoriteButton` in static Astro markup: the button would be inert and
  the toast has no `<Toaster />`. Use it only inside a hydrated island.
- Wrapping the card in another `<a>`: the title is already a stretched link
  (`after:absolute after:inset-0`); a second anchor nests links.

## IngredientCard

Source: [`src/components/domain/IngredientCard.tsx`](../../src/components/domain/IngredientCard.tsx)

**Purpose**: Catalog card of an ingredient — category stripe + `CategoryChip`,
composite mark, dietary tags (`IngredientTagBadges`), unit price, optional
storage line.

**When to use**: The ingredient browser and any ingredient grid. The `action`
slot (rendered above the stretched link, `z-10`) is for one control such as
"I have it"; `selected` highlights the card.

**API overview**: `ingredient`, `lang`, `categoryName` (localised, from
`categories.ingredientCategories`), `href`, `selected`, `action`,
`showDetails`. Also exports `IngredientTagBadges` and
`IngredientCardSkeleton`.

**Common mistakes**: Passing the raw category id as `categoryName` — it is
shown verbatim; resolve the localised name first.

## NutritionFacts

Source: [`src/components/domain/NutritionFacts.tsx`](../../src/components/domain/NutritionFacts.tsx)

**Purpose**: The eight macros of `NutritionInfo` as an accessible table
(`<caption>`, `scope="col"` headers, one `scope="row"` header per nutrient).

**When to use**: Recipe detail, planner summaries — anywhere nutrition is
read, not compared (use recharts for comparisons).

**API overview**: `nutrition` (per serving), `baseServings`, `servings`
(defaults to `baseServings`), `lang`, `bare` (no card chrome). Values are
multiplied by `servings / baseServings` through `scaleNutrition`: kcal, sodium
and cholesterol round to integers, grams to one decimal; `baseServings <= 0`
keeps the stored values.

**Common mistakes**: Scaling the values before passing them in — the
component scales; pass the catalog values untouched.

## DietaryBadges

Source: [`src/components/domain/DietaryBadges.tsx`](../../src/components/domain/DietaryBadges.tsx)

**Purpose**: The `true` flags of a recipe's `dietaryLabels` as secondary
badges, localised via `dietary.*`.

**When to use**: Cards (`max` 2–3) and the recipe detail (`max={8}`). For
ingredient tags use `IngredientTagBadges`.

**API overview**: `labels`, `lang`, `max` (default 3). Order is fixed by
`DIETARY_LABEL_KEYS` (vegetarian, vegan, glutenFree, …) regardless of object
key order; overflow collapses into a `+N` badge whose `aria-label` lists the
hidden labels. Renders nothing when no flag is set.

**Common mistakes**: Rendering a wrapper/heading around it without checking
for flags — the component returns `null` and leaves an orphan heading.

## DifficultyBadge

Source: [`src/components/domain/DifficultyBadge.tsx`](../../src/components/domain/DifficultyBadge.tsx)

**Purpose**: `easy` / `medium` / `hard` as a tinted kit `Badge`
(`recipe.difficulty_*`).

**When to use**: Wherever a recipe's difficulty is shown (cards, detail,
"used in" lists).

**API overview**: `difficulty`, `lang`, plus span attributes.
`DIFFICULTY_CLASS` holds the tints (-100/-950 surface, -800/-200 text).

**Common mistakes**: Relying on the hue alone (e.g. a coloured dot without
the label) — the text carries the meaning.

## TimeBadge

Source: [`src/components/domain/TimeBadge.tsx`](../../src/components/domain/TimeBadge.tsx)

**Purpose**: A duration in minutes with a clock icon (`common.minutesAbbr`).

**When to use**: Meta rows (`appearance="inline"`, inherits colour and size)
or standalone (`appearance="badge"`, outline `Badge`).

**API overview**: `minutes`, `lang`, `label` (title + visually hidden prefix,
e.g. "Total Time"), `appearance`, `iconClassName` (default `size-4`; `size-3.5`
/ `size-3` in dense rows).

**Common mistakes**: Omitting `label` where several durations sit side by
side (prep / cook / total) — screen readers would hear bare numbers.

## CategoryChip

Source: [`src/components/domain/CategoryChip.tsx`](../../src/components/domain/CategoryChip.tsx)

**Purpose**: A food category's identity colour (dot) next to its name;
`appearance="chip"` wraps it in a bordered pill.

**When to use**: Ingredient cards, the ingredient detail header, category
filters and grouped lists. `categoryClasses(id).stripe` gives the matching
card edge (`border-l-food-*`).

**API overview**: `category` (id), `label` (localised), `appearance`
(`'dot' | 'chip'`). `FOOD_CATEGORY_IDS` / `FOOD_CATEGORY_CLASSES` list the
seven categories; unknown ids fall back to `bg-muted-foreground`.

**Colour tokens**: `--color-food-{protein,vegetables,fruits,grains,dairy,pantry,spices}`
in `global.css` (`@theme`). They are **non-text** graphics, so WCAG 1.4.11
applies: ≥ 3:1 against `--background`, `--card` and `--muted` in light and
dark, checked by `npm run ux:check` (`src/tests/ux-contrast.test.ts`). Grains
and spices use `light-dark()` (amber-700 / lime-700 in light) because the
legacy hues fall below 3:1 on white.

**Common mistakes**: Using the tokens as text colour (`text-food-spices`) or
as a filled chip background behind text — neither is contrast-checked. Keep
text in kit colours and the hue in the dot/stripe.

## ServingsAdjuster

Source: [`src/components/domain/ServingsAdjuster.tsx`](../../src/components/domain/ServingsAdjuster.tsx)

**Purpose**: Controlled −/＋ servings stepper with the ×factor and Reset.

**When to use**: Recipe detail and planner slots, together with
`NutritionFacts` / scaled ingredient quantities fed from the same state.

**API overview**: `servings`, `originalServings`, `onChange(n)`, `lang`,
`min` (1), `max` (20). Renders `role="group"` labelled by its heading; the
value is an `<output>` the buttons control.

### Keyboard

| Key | Action |
|---|---|
| Tab | Moves between −, ＋ and Reset (native buttons) |
| Enter / Space | Activates the focused button |

**Common mistakes**: Keeping servings in a store shared across islands for a
single page — it is per-island state (`useState`).

## RecipeTimer

Source: [`src/components/domain/RecipeTimer.tsx`](../../src/components/domain/RecipeTimer.tsx)

**Purpose**: Per-step countdown in a kit `Dialog` with an SVG ring, a
`role="timer"` live region and a Web Notification at zero.

**When to use**: Steps with a `time` in the recipe detail.

**API overview**: `open`, `onOpenChange`, `minutes`, `stepLabel`, `lang`,
`tickMs` (tests). State initialises from `minutes` on mount — change the
`key` to start a fresh countdown.

**Common mistakes**: Putting the trigger in one island and the timer in
another — `Dialog` is a compound component and cannot span islands. Asking
for notification permission on mount instead of on "Start" (a user gesture).

## FavoriteButton

Source: [`src/components/domain/FavoriteButton.tsx`](../../src/components/domain/FavoriteButton.tsx)

**Purpose**: Favourite toggle bound to `$favorites` (persisted under the
legacy `favoriteRecipes` key).

**When to use**: Recipe detail (`appearance="full"`) and interactive cards
(`appearance="icon"`, via `RecipeCard showFavoriteButton`).

**API overview**: `recipeId`, `recipeName` (localised, for the accessible
name and toast), `lang`, `appearance`, `onFavoriteChange(favorite)`. State is
in `aria-pressed`; it reflects the store only after hydration, so SSR and the
first client render agree.

**Common mistakes**: Forgetting the `<Toaster />` in the same island, or
mounting two in one island (`toastManager` is a module singleton — each toast
would render twice).
