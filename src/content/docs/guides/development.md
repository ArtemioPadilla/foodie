---
title: Development
description: How the code is organised, how pages, islands and stores fit together, and the rules every change follows.
---

## Project layout

```
foodie/
├── public/data/            ← catalog JSON: recipes, ingredients, beverages,
│                              categories, ingredient-prices (single source)
├── src/
│   ├── pages/              ← one Astro page per route; /es/ and /fr/ wrappers
│   ├── components/
│   │   ├── pages/          ← page bodies shared by the three locale wrappers
│   │   ├── islands/        ← React islands (MealPlanner, RecipeBrowser, …)
│   │   ├── domain/         ← Foodie components (RecipeCard, NutritionFacts, …)
│   │   ├── common/         ← Astro chrome (SiteHeader, SiteFooter, LangSwitcher)
│   │   └── ui/             ← the Inceptor UI kit on Base UI (owned source)
│   ├── schemas/            ← Zod schemas for every cross-boundary type
│   ├── stores/             ← Nano Stores ($planner, $shopping, $pantry, …)
│   ├── lib/                ← domain logic, catalog loaders, auth, persist, href
│   ├── i18n/               ← en.ts / es.ts / fr.ts dictionaries and helpers
│   ├── content/            ← these docs (content collection) and the sidebar
│   ├── content.config.ts   ← collections: docs, recipes, ingredients, …
│   └── layouts/            ← BaseLayout, DocsLayout
├── tests/visual/, tests/e2e/  ← Playwright suites
└── docs/                   ← roadmap, ADRs, runbooks (repository docs)
```

## How a page is built

Every route is a static Astro page. Localised routes are thin wrappers that
share one body:

```astro
---
// src/pages/es/planner.astro
import BaseLayout from '../../layouts/BaseLayout.astro';
import Planner from '@/components/pages/Planner.astro';
import { hreflangAlternates, t } from '@/i18n';
const lang = 'es' as const;
---
<BaseLayout title={t(lang, 'planner.title')} lang={lang} alternates={…}>
  <Planner lang={lang} />
</BaseLayout>
```

The body (`components/pages/Planner.astro`) renders static HTML and mounts
**one island per page** with a hydration directive: `client:load` for pages
that are empty without it (planner, shopping list, pantry, tracking),
`client:visible` for enhancements below the fold (recipe detail actions,
the landing page's favourite recipes). Recipe and ingredient pages come from `getStaticPaths()`
over the content collections, so each of the 50 recipes and 105 ingredients
has a real page in each language, with JSON-LD.

To add a page: create the body in `components/pages/`, the EN page in
`src/pages/`, the ES and FR wrappers, and the strings in the three
dictionaries. `src/tests/route-parity.test.ts` fails if a localised page has
no English twin or if ES and FR diverge.

## Islands and state

- An island is a React component in `src/components/islands/` that receives
  `lang` as a prop. It never reads `navigator.language` during render.
- Islands that need the catalog at runtime call `useCatalog()` (TanStack Query,
  cached in IndexedDB for offline use). Static pages read the content
  collections at build time instead.
- State shared between islands lives in Nano Stores (`src/stores/`), persisted
  with `persistentAtom` from `src/lib/persist.ts`. React Context is fine
  *inside* one island, never across islands. Details:
  [State and storage](../../reference/state/).
- Pure logic (unit conversion, shopping-list consolidation, nutrition, plan
  sharing, costs) lives in `src/lib/domain/` and is unit tested without React.

### The compound-component gotcha

Astro hydrates every `client:*` boundary as a separate React root. A
`Dialog`, `Sheet`, `Tabs`, controlled `DropdownMenu` or `Toast` whose trigger
is in one island never sees content in another. Put the whole composition in
one file under `src/components/islands/` and hydrate it once, as the header's
`MobileNav.tsx` does.

## Rules every change follows

1. No `@astrojs/tailwind` (Tailwind v4 runs through `@tailwindcss/vite`).
2. No `@radix-ui/*`: the kit is built on `@base-ui-components/react`.
3. No `@tremor/react` and no `framer-motion` (use `motion/react`).
4. No React Context shared across islands; Nano Stores only.
5. Never wrap the whole app in one island.
6. Only the curated dependencies (see [Installation](../../getting-started/installation/)).
7. Types that cross a boundary (network, storage, forms, `public/data/*.json`)
   are Zod schemas in `src/schemas/`, not `interface`s.
8. Every `href` and asset path goes through `withBase()` (`src/lib/href.ts`);
   locale-aware links through `localizedRoute()`.
9. Never `@ts-ignore`, never `--no-verify`, never delete a test to get green.

ESLint, `src/tests/forbidden-imports.test.ts` and `npm run check:pragmas`
enforce most of these.

## Adding a UI component

Look in the kit first: `docs/COMPONENTS.md` and the live gallery at `/gallery/`
list what exists. New primitives go in `src/components/ui/` with a gallery
entry; Foodie-specific compositions go in `src/components/domain/`
(guidelines in `docs/component-guidelines/foodie.md`).

## Styling and theming

Tailwind v4 utilities over CSS tokens declared in `src/styles/global.css`:
primary emerald `#10b981`, amber accent, and per-category food colours. Dark
mode follows the system unless the user picks a theme; always use the tokens
(`bg-card`, `text-muted-foreground`, …) rather than raw colours so both themes
keep their contrast (`npm run ux:check`).

## Day-to-day commands

```bash
npm run dev               # dev server
npm run test -- <file>    # one Vitest file
npm run tdd               # Vitest in watch mode
npm run check             # the gate before every commit
npm run lint              # ESLint alone
```

Commits follow Conventional Commits with the issue id, for example
`feat(planner): duplicate a day (roadmap #026)`. The full flow is in
[Contributing code](../../contributing/code/).
