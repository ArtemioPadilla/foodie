# Changelog

All notable changes to Foodie are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

The v1 history (React 18 + Vite SPA, up to the tag `legacy-vite-1.0.0`) is
archived in [`docs/archive/legacy-vite/CHANGELOG.md`](docs/archive/legacy-vite/CHANGELOG.md).
Canonical plan for v2:
[`docs/superpowers/specs/2026-09-27-foodie-inceptor-migration-roadmap.md`](docs/superpowers/specs/2026-09-27-foodie-inceptor-migration-roadmap.md).

## [Unreleased]

## [2.0.0-beta.1] - unreleased

The date is set when the maintainer tags the cutover
([`docs/runbooks/cutover.md`](docs/runbooks/cutover.md)).

Foodie v2 is a rebuild on the [Inceptor](https://github.com/ArtemioPadilla/inceptor)
template: Astro 7 islands with React 19, Tailwind v4, Base UI primitives,
nanostores and TanStack Query. Every route is a static page in English,
Spanish and French, and it is still served at
`https://artemiopadilla.github.io/foodie/` (roadmap Phases 0–3, issues
001–030).

### Added

- **Trilingual static site.** `/`, `/es/` and `/fr/` each have their own
  pages, and every EN page has ES and FR twins. The language switcher keeps
  the current route. On a first visit, `/` sends the visitor once to the
  language they last chose in v1 (#004, #005).
- **Recipe catalog.** `/recipes/` has search, filters (meal type, cuisine,
  diet, difficulty, time) and sorting, all kept in the URL. Each recipe has a
  static page (`/recipes/<id>/`) with a servings scaler, a metric/imperial
  toggle, a nutrition table and schema.org JSON-LD (#016–#018).
- **Ingredient catalog.** `/ingredients/` is a browser, and each ingredient
  has a detail page with nutrition, composition and the recipes that use it.
  From there you can add the ingredient to the pantry or the shopping list
  (#019).
- **Favourites** from any recipe card or detail page. `/recipes/?favorites=1`
  lists them, and they also appear on the landing page (#020).
- **Meal planner.** `/planner/` shows a week or a month view. You can drag
  recipes with the mouse, touch or keyboard (`@dnd-kit`, with screen-reader
  announcements), set servings per meal and a plan default, copy and clear
  days, and save and load plan templates. A recipe picker offers search and
  quick filters, and a plan summary shows cost, ingredients and average
  nutrition against your goals (#024, #025).
- **Shopping list.** `/shopping/` builds the list from the plan, merging
  quantities and converting units. Lines are grouped by category, and you can
  search, sort, check off items, add notes and add your own items. The list
  exports to text and CSV, can be printed, copied or shared on WhatsApp, and
  shows in metric or imperial units (#026).
- **Pantry.** `/pantry/` tracks stock with expiry dates, storage locations
  and low-stock alerts. You can add missing items to the shopping list, and
  "What can I cook" ranks recipes by how much of them the pantry covers
  (#027).
- **Installable offline app (PWA).** The manifest makes Foodie installable,
  and a service worker precaches every Foodie page. The catalog is cached
  network-first, and the app shows an offline banner and an update prompt
  (#028).
- **v1 compatibility (#030).**
  - Your data carries over. The plan, templates, shopping list, pantry,
    favourites, food diary, goals and theme stay under the same
    `localStorage` keys (ADR 0002), and each value is checked against a Zod
    schema when it is read. A test covers the 12 v1 keys.
  - Old links still work. Deep links in v1's `?/recipes/…` form
    (spa-github-pages) redirect once to the new static route.
- **Quality gates.** `npm run check` runs astro check, tsc, Vitest, ESLint,
  the pragma check, the build and the SEO test. CI also runs Playwright:
  visual baselines in light and dark, axe accessibility checks, a console
  smoke test, keyboard, mobile and e2e journeys for each section. Lighthouse
  budgets gate performance, accessibility and best practices (#006, #023,
  #029).
- **Issue-driven workflow.** The `FeedbackFAB` button pre-fills a GitHub
  issue. The repo adds issue templates and the `prometeo`, `forja` and
  `centinela` agents (#007).

### Changed

- The stack moved from React 18 + Vite (a single-page app) to Astro 7
  islands. Pages ship without JavaScript unless they need it (D1–D4).
- State moved from React Context providers to nanostores. Stores that must
  persist use `persistentAtom`, which validates values with Zod and syncs
  across tabs (#012, #013).
- Translations moved from i18next with a runtime language detector to
  dictionaries compiled into each static page (#015).
- The catalog (`public/data/*.json`) is validated at build time with Astro
  content collections and at runtime with Zod (#010, #011).
- Deployment now uses GitHub Actions with Node 22 and `ASTRO_BASE`. The
  MkDocs and Python steps are gone (D12, #006).

### Security

- Astro 5.18 → 7.3 (`@astrojs/react` 7, `@astrojs/mdx` 8, Vite 8, sharp
  0.35). This clears every production advisory `npm audit --omit=dev`
  reported (critical `astro <= 7.2.7`, high `sharp <= 0.35.4-rc.0`, low
  `esbuild`). `@vite-pwa/astro` 1.2.0 still caps its `astro` peer at `^5`, so
  an npm `overrides` entry lets it run on Astro 7. See
  [ADR 0011](docs/decisions/0011-astro-7-upgrade.md) (#030).

### Removed

- The client-side 404 redirect of the single-page app (`404.html`,
  `404-redirect.js`, `spa-redirect.js`). Every route is now a real page;
  `404.astro` only decodes v1 links (#005, #030).
- The `legacy/` working copy. You can still read the v1 code with
  `git show legacy-vite-1.0.0:<path>` (#008).

### Not yet in this beta

These v1 features are still being ported. Your data for them stays in
`localStorage` untouched until they arrive:

- Nutrition tracking UI (Phase 4, #031–#035). `trackingEntries` and
  `nutritionGoals` are preserved.
- Sign-in, profile, per-account preferences and data export/clear (Phase 5,
  #036–#037). `user-preferences-<uid>` and `user-favorites-<uid>` are
  preserved.
- Recipe submission wizard (#038–#039) and shared plans (#040).

[Unreleased]: https://github.com/ArtemioPadilla/foodie/compare/v2.0.0-beta.1...HEAD
[2.0.0-beta.1]: https://github.com/ArtemioPadilla/foodie/compare/legacy-vite-1.0.0...v2.0.0-beta.1
