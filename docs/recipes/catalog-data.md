# Catalog data: recipes, ingredients, beverages, categories, prices

**Source of truth:** `public/data/*.json`. The same files are (a) loaded as
Astro **content collections** at build time (static pages, JSON-LD) and
(b) fetched at runtime by islands through `useCatalog()`. Roadmap D6 / Issue 011.

| File                           | Shape                                                        | Collection    | Entries                    |
| ------------------------------ | ------------------------------------------------------------ | ------------- | -------------------------- |
| `public/data/recipes.json`     | `{ "recipes": Recipe[] }`                                    | `recipes`     | 50                         |
| `public/data/ingredients.json` | `{ "ingredients": Ingredient[] }`                            | `ingredients` | 105                        |
| `public/data/beverages.json`   | `Beverage[]` (bare array)                                    | `beverages`   | 39                         |
| `public/data/categories.json`  | `{ mealTypes, cuisines, dietaryTags, ingredientCategories }` | `categories`  | 4 (one entry per taxonomy) |
| `public/data/ingredient-prices.json` | `{ [ingredientId]: { price, unit, currency, legacyKey } }` | `prices` | 51 (one per priced ingredient) |

`ingredient-prices.json` (roadmap Issue 041, [ADR 0014](../decisions/0014-ingredient-prices.md))
is PR #28's store price sheet re-keyed onto catalog ids: `price` is the price
of one pack `unit` (`lb`, `25oz`, `dozen`, `gallon`…). It is optional data —
every ingredient keeps its own `avgPrice` — fetched at runtime by
`usePriceCatalog()`, not `useCatalog()`. Keys must be existing ingredient ids.

The mapping (path → `file()` loader `parser` → Zod schema) lives in
`src/lib/catalog/collections.ts`; `src/content.config.ts` only wires it into
`defineCollection`. Entry ids are the record `id`s (`rec_001`, `ing_042`,
`bev_coffee_black`, `mealTypes`).

```ts
import { getCollection, getEntry } from 'astro:content';

const recipes = await getCollection('recipes'); // CollectionEntry<'recipes'>[]
const mealTypes = (await getEntry('categories', 'mealTypes'))!.data.items;
```

## Validation — what breaks the build

Every record is parsed with the schemas in `src/schemas/` (`RecipeSchema`,
`IngredientSchema`, `BeverageSchema`, `CategoryGroupSchema`, `IngredientPriceSchema`). Failing records
break `astro build` and turn `npm run test -- src/tests/catalog-schema.test.ts` red:

- **All three languages.** Every `MultiLangText` (`name`, `description`, `tips`,
  `instructions[].text`, `ingredients[].notes`, `storageInstructions`, …) must
  have non-blank `en`, `es` **and** `fr`.
- **Unique ids** per file, and **unique English recipe names**
  (`scripts/check-duplicates.mjs`, also runnable on its own).
- **References resolve:** `ingredients[].ingredientId`, `variations[].changedIngredients[].ingredientId`
  and composite `components[].ingredientId` must exist in `ingredients.json`;
  `type` must be one of `categories.json → mealTypes`; an ingredient's
  `category` one of `ingredientCategories`.
- **Enums and ranges:** `type` ∈ breakfast/lunch/dinner/snack/dessert,
  `difficulty` ∈ easy/medium/hard, `rating` 0–5, integer `servings`/`reviewCount`,
  `dateAdded` as `YYYY-MM-DD`, beverage `category` ∈ water/coffee/tea/juice/soda/alcohol/milk/other.

Known drift that is _not_ enforced (data predates the rule): some `cuisine`
values (`international`, `chinese`, `hawaiian`) are missing from
`categories.json → cuisines`, and two recipes have `prepTime + cookTime ≠ totalTime`.
Fix the data before tightening the schema.

## Adding a recipe (JSON → PR → `validate-recipe-pr.yml`)

1. **Write the JSON.** Copy an existing record from `public/data/recipes.json`
   and edit it, or use the in-app _Contribute_ wizard (roadmap Issue 038/039),
   which validates against `RecipeSchema` and downloads the JSON. Pick the next
   free id (`rec_051`, …); ids are zero-padded and sorted.
2. **Reference existing ingredients** by id. If an ingredient is missing, add it
   to `public/data/ingredients.json` in the same PR (same trilingual rules).
3. **Check locally:**

   ```bash
   npm run test -- src/tests/catalog-schema.test.ts   # schemas, ids, translations, references
   node scripts/check-duplicates.mjs                  # optional: duplicates only
   npm run build                                      # content collections must sync
   ```

4. **Open a PR** touching `public/data/*.json`. The
   `.github/workflows/validate-recipe-pr.yml` workflow runs the same catalog test
   and posts (or updates) a comment with the result; a red check means one of
   the rules above failed — the vitest output names the record and field.
5. **Review & merge.** Maintainers check the translations read naturally and
   the nutrition numbers are plausible; merging to `main` deploys.

Community members without a fork use the **Recipe submission** issue form
(`.github/ISSUE_TEMPLATE/recipe-submission.yml`), which the _Contribute_
wizard opens prefilled; a maintainer turns it into the PR. The whole flow is in
[contributing-recipes.md](./contributing-recipes.md).

## Runtime: `useCatalog()` in islands (Issue 016)

Static pages read the collections; islands that need the catalog at runtime
(recipe browser, planner, shopping list) call `useCatalog()` from
`src/lib/catalog/use-catalog.ts` inside the template's `QueryProvider`:

```tsx
import QueryProvider from '@/components/islands/QueryProvider';
import type { Locale } from '@/i18n';
import { useCatalog } from '@/lib/catalog/use-catalog';
import { filterRecipes, sortRecipes, getIngredientName } from '@/lib/catalog/selectors';

function Inner({ lang }: { lang: Locale }) {
  const { recipes, ingredients, beverages, categories, status } = useCatalog();
  // status: 'loading' | 'success' | 'error' | 'offline' (offline = serving the IDB cache)
  const visible = sortRecipes(filterRecipes(recipes, { types: ['dinner'] }), 'rating-desc', { lang });
  …
}
export default function MyIsland(props) {
  return <QueryProvider idbKey="tanstack-query-cache-catalog"><Inner {...props} /></QueryProvider>;
}
```

- One query per file (`['catalog', 'recipes']` …), `fetch(withBase('/data/x.json'))`
  — never a hardcoded `/foodie/…` — parsed with the same Zod file schemas as the
  build; an invalid payload is `status: 'error'`, not a crash.
- `meta: { persist: true }` → the parsed catalog is stored in IndexedDB for
  24 h (`PERSIST_MAX_AGE_MS`) and served first on the next visit; when the
  refetch fails or the browser is offline the cached copy stays and `status`
  becomes `'offline'`.
- Selectors are pure and take the arrays explicitly (`getRecipeById`,
  `getIngredientName`, `searchRecipes`, `filterRecipes`, `sortRecipes`,
  `makeCategoryResolver(ingredients)` in `lib/domain/shopping`), so the same
  code runs in Astro pages, islands and tests.

## Changing a schema

Edit the schema in `src/schemas/` (never `interface`s — types come from
`z.infer`), keep the field optional unless every existing record has it, and
run the catalog test: it parses the four files in full, so the data tells you
immediately whether the new rule holds.

## Images — the optimisation pipeline (roadmap Issue 045)

**Today no recipe ships a photo.** `imageUrl` (recipe) and `image`
(instruction step) exist in `RecipeSchema` but no record sets them; cards and
the detail page draw `RecipeArt`'s placeholder (an inline, zero-request icon
tile). The only raster files in `public/` are the brand assets (PWA icons,
`apple-touch-icon.png`, `og-image.png`).

**Decision: optimise outside the build, before committing.** Foodie does not
add `sharp` (or any image tool) as a dependency and has no
`scripts/optimize-images.mjs`: the catalog changes by pull request, images are
rare, and a native image library in `devDependencies` would slow every
`npm ci` for a step that runs a few times a year. (`scripts/generate-brand-assets.mjs`
uses the `sharp` that Astro already installs for itself; it only regenerates
the brand assets.) What gets committed is already final, and a unit test keeps
it that way (below).

When a recipe gets a photo:

1. **Export three widths as WebP** — 320, 640 and 960 px wide, 4:3, quality
   ≈ 75 — into `public/images/recipes/<recipe-id>-<width>.webp`. Any of these
   works: [Squoosh](https://squoosh.app) in the browser (WebP, "Resize"), or
   libwebp's CLI: `cwebp -q 75 -resize 640 0 photo.jpg -o public/images/recipes/rec_001-640.webp`.
   Strip EXIF/GPS metadata (both tools drop it by default) — it can leak where
   the photo was taken.
2. **PNG only for flat art** (icons, diagrams), and always losslessly
   recompressed: `oxipng -o 4 --strip safe file.png` (or Squoosh's OxiPNG).
   The brand PNGs were recompressed this way in Issue 045 (pixel-identical,
   ~17 KB saved); run it again after `node scripts/generate-brand-assets.mjs`.
3. **Reference it in the JSON** as `"imageUrl": "/images/recipes/rec_001-640.webp"`
   (site-relative, no base, any of the three widths). `RecipeArt` (cards,
   detail, picker) renders it through `recipeImageSources()`
   (`src/lib/recipe-image.ts`): a `withBase()`d `src` (640 w), a `srcset` over
   320/640/960 w, `sizes`, explicit `width`/`height` (4:3, so CLS stays 0),
   `loading="lazy"` and `decoding="async"`. An `imageUrl` outside
   `/images/recipes/` only gets `withBase()`; an absolute URL passes through.

**Guard:** `src/tests/image-budget.test.ts` fails when a file under
`public/images/recipes/` is not `.webp` or is over 150 KB, or when any raster
image in `public/` is over 200 KB. Lighthouse's `image` budget
(`lighthouse-budgets.json`, `npm run perf`) covers what a page actually loads.
