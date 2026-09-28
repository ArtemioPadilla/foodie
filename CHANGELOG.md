# Changelog

All notable changes to Foodie are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

The v1 history (React 18 + Vite SPA, up to the tag `legacy-vite-1.0.0`) is
archived in [`docs/archive/legacy-vite/CHANGELOG.md`](docs/archive/legacy-vite/CHANGELOG.md).
Canonical plan for v2:
[`docs/superpowers/specs/2026-09-27-foodie-inceptor-migration-roadmap.md`](docs/superpowers/specs/2026-09-27-foodie-inceptor-migration-roadmap.md).

## [Unreleased]

The post-migration backlog is in [`ROADMAP.md`](ROADMAP.md).

### Fixed

- Canonical URLs, hreflang, the sitemap, `robots.txt` and OG tags now use `https://artemiop.com`, the origin the site is actually served from. `artemiopadilla.github.io/foodie/` answers with a 301 to it (the account's Pages custom domain), so the old values pointed search engines at a redirect.

### Security

- CodeQL findings on the v2 code (#047): custom shopping-item ids use the
  CSPRNG (`crypto.getRandomValues`) where `crypto.randomUUID` is unavailable,
  never `Math.random`; the ⌘K search hint turns Pagefind's HTML excerpt into
  text with the browser's parser (entities now display decoded) instead of a
  tag-stripping regex; the CSP hash pass recognises `</script >`-style end
  tags; `npm run perf` no longer prints `CHROME_PATH`. The unused template
  `examples/` scripts and workflows were removed.

## [2.0.0] - 2026-09-28

The date is set when the maintainer tags the release
([`docs/runbooks/github-actions-pending.md`](docs/runbooks/github-actions-pending.md)).

Foodie v2 is a rebuild on the [Inceptor](https://github.com/ArtemioPadilla/inceptor)
template: Astro 7 islands with React 19, Tailwind v4, Base UI primitives,
nanostores and TanStack Query. Every route is a static page in English,
Spanish and French, and it is still served at
`https://artemiopadilla.github.io/foodie/`. This release closes the whole
migration roadmap (Phases 0–6, issues 001–048). A `2.0.0-beta.1` was prepared
for the cutover (#030) but never tagged; its entries are folded in here.

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
- **SEO.** A trilingual sitemap with `hreflang` alternates, a unique title
  and canonical URL on every page, Open Graph tags and `robots.txt` (#022).
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
- **Nutrition tracking.** `/tracking/` is a food diary with quick add for
  recipes, ingredients, drinks and water, and totals against your goals.
  `/tracking/goals/` sets daily goals with presets and a macro preview, and
  `/tracking/progress/` shows week and month charts (calories, trend, a
  sparkline per macro), a streak and the most logged recipe, each chart with
  an accessible data table (#031–#034).
- **Optional accounts.** Sign in with email, Google or GitHub (Firebase Auth,
  loaded only when you open the dialog) from the header's account menu.
  `/profile/` edits your name, avatar, units, diet and language, and offers
  "Export my data" (one JSON file) and "Clear my data". Preferences and
  favourites are kept per account, and guest favourites are merged once into
  the account, with Undo (#035–#037).
- **Recipe contributions without secrets.** `/contribute/` is a step-by-step
  wizard with validation, a saved draft and a preview rendered as the site
  would show it. Submitting downloads the recipe JSON and opens a prefilled
  GitHub issue (`recipe-submission.yml`) — no token or OAuth app in the
  browser (#038, #039).
- **Share a plan by link.** The planner's Share dialog gives a link (plus
  WhatsApp, the system share sheet and a QR code) that carries the plan,
  compressed, in the URL fragment. `/plan/shared/` shows it read-only and
  imports it as your plan. No server or database is involved (#040).
- **Ingredient prices and plan cost.** A validated price sheet (51 catalog
  ingredients), your own prices per ingredient (they win over the sheet) and
  a currency preference drive the cost in the plan summary and the shopping
  list (#041).
- **Documentation on the site.** `/docs/` (Getting started, Guides,
  Reference, Contributing) with Pagefind search over the docs and every
  recipe. The data-model reference is generated from the Zod schemas at build
  time (#043).
- **v1 compatibility (#030).**
  - Your data carries over. The plan, templates, shopping list, pantry,
    favourites, food diary, goals, per-account preferences and theme stay
    under the same `localStorage` keys (ADR 0002), and each value is checked
    against a Zod schema when it is read. A test covers the 12 v1 keys.
  - Old links still work. Deep links in v1's `?/recipes/…` form
    (spa-github-pages) redirect once to the new static route.
- **Quality gates.** `npm run check` runs astro check, tsc, Vitest, ESLint,
  the pragma check, the build and the built-site tests (SEO, CSP, bundle
  split). CI also runs Playwright: visual baselines in light and
  dark, axe accessibility checks, a console smoke test, keyboard, mobile, a
  CSP audit and e2e journeys for each section. `npm run perf` and
  `lighthouse.yml` gate performance ≥ 0.9, accessibility ≥ 0.95, best
  practices = 1 and SEO ≥ 0.95 with byte budgets per page (#006, #023, #029,
  #034, #045).
- **Issue-driven workflow.** The `FeedbackFAB` button pre-fills a GitHub
  issue and now reports the release version (`PUBLIC_VERSION`) next to the
  build SHA. The repo adds issue templates, the `prometeo`, `forja` and
  `centinela` agents and `scripts/create-issues.sh` (#007, #048).

### Changed

- The stack moved from React 18 + Vite (a single-page app) to Astro 7
  islands. Pages ship without JavaScript unless they need it (D1–D4,
  ADR 0011).
- State moved from React Context providers to nanostores. Stores that must
  persist use `persistentAtom`, which validates values with Zod and syncs
  across tabs (#012, #013).
- Translations moved from i18next with a runtime language detector to typed
  dictionaries compiled into each static page. The browser downloads only its
  page's language (#015, #045).
- The catalog (`public/data/*.json`) is validated at build time with Astro
  content collections and at runtime with Zod (#010, #011).
- Drag and drop moved from `react-dnd` to `@dnd-kit/core` (ADR 0010).
- Firebase Auth sits behind an `AuthProvider` contract, configured from
  `PUBLIC_FIREBASE_*` build variables instead of a config committed in the
  source (ADR 0012).
- Fonts (Fraunces, Hanken Grotesk, JetBrains Mono) are self-hosted instead of
  loaded from Google Fonts, and precached for offline use (#035).
- Deployment now uses GitHub Actions with Node 22 and `ASTRO_BASE`. The
  MkDocs and Python steps are gone (D12, #006).
- Project docs rewritten for the new stack: `CLAUDE.md`, `README.md` (CI and
  deploy badges, new screenshots from `npm run docs:screenshots`),
  `CONTRIBUTING.md` (issue-driven flow and recipe flow) and `SECURITY.md`
  (#044, #047).
- Pages download only their own language's strings, and dialogs (sign in,
  account menu, mobile menu, search, recipe picker, prices, templates,
  sharing) load the first time they open: the landing's script went from
  324 KB to 186 KB and the planner's from 438 KB to 333 KB. Recipe photos,
  when they arrive, are pre-optimised WebP with a `srcset` (#045).

### Fixed

- v1's recipe contribution never worked (the GitHub service was never
  initialised and wrote one file per recipe instead of `recipes.json`); the
  new flow goes through a prefilled issue (D10, #039).
- v1 fetched `/foodie/data/beverages.json` with a hard-coded base path and
  registered `/sw.js` by hand at the wrong path; the catalog and the service
  worker now follow the configured base (#016, #028).
- A React hydration error (#418) on pages where the browser offered "Install
  app" (or knew it was offline, or had an update waiting) before the header
  hydrated (#045).

### Removed

- **Dependencies of v1:** `react-router-dom`, `i18next`, `react-i18next`,
  `i18next-browser-languagedetector`, `react-dnd`, `react-dnd-html5-backend`,
  `@octokit/rest`, `date-fns`, `vite`, `vite-plugin-pwa`, `workbox-window`,
  `@vitejs/plugin-react`, `tailwindcss` 3 with `postcss` and `autoprefixer`,
  `ajv` and `ajv-cli` (Zod validates the catalog), `sharp` (brand assets are
  generated with an ad-hoc install), `@vitest/ui`, `@vitest/coverage-v8`,
  `eslint-plugin-react-refresh`, `globals`, `@eslint/js` and
  `typescript-eslint` (#008, #047).
- **Unused dependencies of the template:** `@anthropic-ai/sdk`,
  `@vitest/expect` and `@dnd-kit/utilities` (never imported; `@dnd-kit/core`
  still brings its own copy) (#047).
- The client-side 404 redirect of the single-page app (`404.html`,
  `404-redirect.js`, `spa-redirect.js`). Every route is now a real page;
  `404.astro` only decodes v1 links (#005, #030).
- The `legacy/` working copy. You can still read the v1 code with
  `git show legacy-vite-1.0.0:<path>` (#008).
- The GitHub token in `localStorage` (`github-access-token`, purged on every
  page load) and `VITE_GITHUB_CLIENT_SECRET` in `.env.example` (#039).
- MkDocs and its sources (`mkdocs.yml`, `requirements.txt`, `docs/index.md`,
  `docs/getting-started/`, `docs/guides/`, `docs/reference/api.md`,
  `docs/contributing/recipe-format.md`) (#006, #043).
- **Template surfaces Foodie does not use** (#046): the blog, `/demos/*`,
  `/showcase/*`, `/blocks/*`, `/login/` (replaced by the sign-in dialog),
  `/contact/`, the AI chat kit (`src/components/ui/ai/`) and the islands only
  those pages used. The component gallery stays for contributors but is built
  only outside the production deploy (`PUBLIC_FLAG_EXPERIMENTAL_GALLERY`); the
  deployed site has 516 pages. The ⌘K search lists Foodie's sections in the
  page's language. The dead `server:flask` / `server:node` scripts.

### Security

- Astro 5.18 → 7.3 (`@astrojs/react` 7, `@astrojs/mdx` 8, Vite 8, sharp
  0.35). This clears every production advisory `npm audit --omit=dev`
  reported (critical `astro <= 7.2.7`, high `sharp <= 0.35.4-rc.0`, low
  `esbuild`). `@vite-pwa/astro` 1.2.0 still caps its `astro` peer at `^5`, so
  an npm `overrides` entry lets it run on Astro 7. See
  [ADR 0011](docs/decisions/0011-astro-7-upgrade.md) (#030).
- `npm audit` reports 0 vulnerabilities, dev dependencies included (#047):
  Vitest 5 (the `@vitest/mocker` advisory), a patched `fast-uri`, and
  `overrides` for the Lighthouse CI tooling's `tmp`, `@puppeteer/browsers`
  (drops `extract-zip`), `qs` and `uuid`, each justified in `SECURITY.md`.
  `security.yml` gains an `npm audit --audit-level=high` job and CodeQL v4;
  it runs on push, pull request and weekly. Test tooling majors taken:
  `vitest` 5, `jsdom` 30, `prettier-plugin-astro` 1, and `@nanostores/react`
  2 at runtime.
- **Content-Security-Policy** on every page (Astro's `security.csp` meta):
  hashed inline scripts and styles, no `'unsafe-eval'` and no
  `'unsafe-inline'` for scripts, only the Google/Firebase origins sign-in
  needs. Zod runs without its `new Function` probe. `tests/e2e/csp.spec.ts`
  fails on any violation (#035, ADR 0012).
- No secret reaches the browser: only `PUBLIC_*` variables are read, the
  Firebase web config comes from repository secrets, the GitHub OAuth client
  secret lives only in the Firebase console, and a build that would ship the
  mock sign-in adapter fails (#035, #039). `SECURITY.md` covers reporting,
  scope, the secrets policy and restricting the Firebase API key to the
  deployed origins (#047).

### Deferred

Not part of 2.0.0, by decision D14 of the roadmap; the backlog with the
conditions to pick each one up is in [`ROADMAP.md`](ROADMAP.md):

- **Cloud sync** of plans, lists, pantry and diary (Firestore or another
  backend). Data stays local-first in the browser (ADR 0002).
- **Automatic recipe pull requests** from the wizard (needs a backend such as
  Inceptor's `server-node` `/api/feedback`); today a maintainer turns the
  prefilled issue into a PR.
- **Tauri** desktop and Android apps (the Inceptor runbooks stay in
  `docs/runbooks/tauri-*.md`) and an **iOS** app.
- A Kanban/board view of the plan.

[Unreleased]: https://github.com/ArtemioPadilla/foodie/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/ArtemioPadilla/foodie/compare/legacy-vite-1.0.0...v2.0.0
