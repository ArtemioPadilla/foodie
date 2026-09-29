# Foodie — Claude Code context

## Overview

Foodie is an offline-first meal-planning web app: a trilingual (EN/ES/FR)
catalog of 50 recipes and 105 ingredients, a weekly planner with drag and drop,
a consolidated shopping list with prices, a pantry, a food diary with goals and
progress charts, optional sign-in, recipe contribution without secrets, and
plan sharing by URL. All user data is local-first (`localStorage`).

v2 is a template-first rebuild on **Inceptor**: **Astro 7** (`^7.3`, ADR 0011)
static pages with **React 19** islands, at the repo root. v1 (React 18 + Vite
SPA) is frozen at the tag `legacy-vite-1.0.0`; read it with
`git show legacy-vite-1.0.0:src/<path>`.

- **Canonical plan:** [`docs/superpowers/specs/2026-09-27-foodie-inceptor-migration-roadmap.md`](docs/superpowers/specs/2026-09-27-foodie-inceptor-migration-roadmap.md)
  — 48 issues in 7 phases, decisions D1–D14, target architecture, per-issue
  acceptance criteria. Read the issue block you work on in full.
- **Docs site:** `/docs/` (content in `src/content/docs/`, sidebar in
  `src/content/docs-sidebar.ts`; `/docs/reference/api/` is generated from
  `src/schemas` at build time).
- **Live:** <https://eat.cybere.co/> (Cloudflare Pages, site at the root,
  base `/`; ADR 0015). The old GitHub Pages address only redirects there.

**Stack (installed).** Astro 7 + `@astrojs/react` (React 19) + `@astrojs/mdx`
· Tailwind v4 via `@tailwindcss/vite` · shadcn-style primitives on
`@base-ui-components/react` (`src/components/ui/`, owned source) · Nano Stores
(`nanostores`, `@nanostores/react`) · TanStack Query/Table/Virtual ·
react-hook-form + Zod 4 · lucide-react · recharts · `motion/react` ·
`@vite-pwa/astro` · Pagefind. Foodie additions allowed by the roadmap:
`@dnd-kit/core` (ADR 0010), `firebase` (only
`firebase/app` + `firebase/auth`, dynamic import, ADR 0012), `fflate` (ADR 0013).
Tests: Vitest + Testing Library, Playwright + axe-core. Node 22 (`.nvmrc`).

## Commands

```bash
npm ci                    # install (lockfile exact)
npm run dev               # http://localhost:4321/
npm run check             # astro check + tsc + vitest + eslint + pragmas, then build + built-site tests — the gate before every commit
npm run test              # vitest only;  npm run test -- <file>  for one file
npm run build             # astro build + pagefind → dist/
npm run preview           # serve dist/
npm run build && npx playwright test   # visual + a11y + smoke suite AND e2e journeys (default config)
npm run test:e2e          # e2e journeys + CSP gate (own build with PUBLIC_AUTH_MOCK=1)
npm run test:visual:update # refresh screenshot baselines (or npm run refresh-baselines, Docker)
npm run a11y              # axe-core scan (needs a build)
npm run ux:check          # contrast + motion token checks
npm run lighthouse        # Lighthouse CI (set CHROME_PATH if Chrome is not found)
npm run perf              # perf gate: prod-shaped build, bundle-split checks, chunk report, Lighthouse scores + byte budgets
npm run docs:screenshots  # README captures into docs/assets/ (needs a running preview)
```

**Playwright under an agent (Astro 7).** When `astro preview` detects an AI
agent (`CLAUDECODE`, `AI_AGENT`, …) it moves itself to the background and
exits. Both Playwright configs start it with `--ignore-lock`, which keeps it in
the foreground under Playwright's control, so the commands above work as-is. A
preview you start by hand as an agent still backgrounds itself: add
`--ignore-lock` or stop it with `npx astro preview stop`. If Lighthouse reports
"Chrome installation not found", point `CHROME_PATH` at Playwright's Chromium
(e.g. `/opt/pw-browsers/chromium-*/chrome-linux/chrome`).

`npm run test:e2e` leaves the mock-auth build in `dist/`: run `npm run build`
again before the visual suite.

## Architecture

```
foodie/
├── .claude/agents/          ← prometeo, forja, centinela
├── .claude/checklists/      ← ethics, governance, forbidden-imports
├── docs/                    ← roadmap (superpowers/specs), ADRs (decisions/),
│                               runbooks, recipes (how-tos), assets (README captures)
├── public/data/             ← recipes, ingredients, beverages, categories,
│                               ingredient-prices .json (single source of the catalog)
├── src/
│   ├── components/
│   │   ├── ui/              ← Inceptor kit on Base UI (owned)
│   │   ├── domain/          ← RecipeCard, NutritionFacts, DietaryBadges, …
│   │   ├── islands/         ← RecipeBrowser, RecipeDetailActions, IngredientBrowser,
│   │   │                       MealPlanner, ShoppingList, Pantry, TrackingToday,
│   │   │                       GoalsForm, ProgressDashboard, ContributeWizard,
│   │   │                       AuthDialog, AccountMenu, Profile, SharedPlan, MobileNav
│   │   ├── common/          ← Astro chrome (SiteHeader, SiteFooter, LangSwitcher)
│   │   └── pages/           ← page bodies shared by the /, /es/, /fr/ wrappers
│   ├── content/             ← docs collection + docs-sidebar.ts (+ template gallery data)
│   ├── content.config.ts    ← collections: docs, blog, recipes, ingredients,
│   │                           beverages, categories, prices
│   ├── i18n/                ← en.ts (Dictionary type), es.ts, fr.ts, index.ts
│   ├── lib/
│   │   ├── auth/            ← contracts, config, firebase adapter, mock, guard-user
│   │   ├── catalog/         ← collections, useCatalog (Query + IDB), selectors
│   │   ├── domain/          ← units, shopping, nutrition, tracking, plan-share, cost, …
│   │   ├── docs/            ← schema-reference (build-time schema → table data)
│   │   ├── persist.ts       ← persistentAtom (localStorage + Zod + cross-tab)
│   │   └── href.ts, flags.ts, site-meta.ts, report-issue.ts, …
│   ├── schemas/             ← Zod: recipe, ingredient, beverage, meal-plan, shopping,
│   │                           pantry, tracking, goals, preferences, auth,
│   │                           recipe-submission, plan-share, user-data, …
│   ├── stores/              ← $theme, $preferences, $favorites, $planner, $shopping,
│   │                           $pantry, $tracking, $goals, $user, $customPrices, …
│   ├── layouts/             ← BaseLayout, DocsLayout
│   └── pages/               ← one page per route; es/ and fr/ wrappers
└── tests/{visual,e2e,fixtures}/   ← Playwright
```

**Routes** (each in `/`, `/es/`, `/fr/`): `/`, `/recipes/`, `/recipes/[id]/`
(getStaticPaths), `/ingredients/`, `/ingredients/[id]/`, `/planner/`,
`/shopping/`, `/pantry/`, `/tracking/`, `/tracking/goals/`,
`/tracking/progress/`, `/contribute/`, `/profile/`, `/plan/shared/`, 404.
EN-only: `/docs/**` (ES/FR have bridge landings), and the template's
`/gallery`, `/demos`, `/blocks`, `/blog` (trimmed in roadmap #046).
**One island per page**; `client:load` where the page is empty without it,
`client:visible`/`client:idle` otherwise.

**Data flow:** Astro page (build) → `getCollection('recipes')` → static HTML +
JSON-LD ×3 locales · island → `useCatalog()` (TanStack Query, IndexedDB
persist) → `fetch(withBase('/data/x.json'))` · island → `useStore($planner)` ←
`persistentAtom` ← `localStorage` (Zod-validated) · auth island →
`AuthProvider` contract → Firebase adapter (lazy) → `$user` / `$authReady` →
`GuardUser`.

## Conventions

- **Branches:** `phase-N/issue-NNN-slug` for roadmap work, from `main`, PR →
  `main` (the `inceptor` integration branch closed with the cutover, #030).
- **Commits:** Conventional Commits with the id, e.g.
  `feat(planner): duplicate a day (roadmap #026)`. `Tdd-Red:` trailer on a
  red-test commit. Record user-visible changes under `## [Unreleased]` in
  `CHANGELOG.md`.
- **Labels / milestones:** `phase-0`…`phase-6`, `type:feat|fix|docs|test|chore`,
  `risk:high`, `recipe-submission`; milestones `v0.1`…`v1.0`. Bootstrap from
  the roadmap with `bash scripts/create-issues.sh` (dry run; `--apply`).
- **Issue-driven development and orchestration.** The main Claude Code session
  is the orchestrator; three sub-agents in `.claude/agents/` do the work:
  **prometeo** plans (reads the roadmap, orders issues by `Depends on`, writes
  no code), **forja** implements one issue with atomic commits, **centinela**
  validates (`npm run check`, the issue's Validation block, forbidden imports,
  ethics tier) and returns `APPROVED` / `REJECTED`. Flow: issue → prometeo →
  forja → centinela → PR → CI + review → merge → deploy.
- **Ethics tiers** (`.claude/checklists/ethics.json`, `docs/ETHICS.md`):
  tier-0 docs/tests; tier-1 default for `type:feat`/`type:fix` (checklist items
  1, 7, 8); tier-2 (`risk:high`: new non-same-origin fetch, new persistent
  storage of user input, `/profile`/AuthDialog-like surfaces, diagnostics
  changes) requires a Stakeholder Analysis ADR.

## Rules

Critical warnings (Inceptor) — read before touching code:

1. ❌ No `@astrojs/tailwind` — Tailwind v4 goes through `@tailwindcss/vite`.
2. ❌ No React Context shared **across** islands — Nano Stores only
   (`src/stores/`, persistent ones through `persistentAtom`). Context inside one
   island is fine.
3. ❌ Never wrap the whole app in one island.
4. ❌ No `@radix-ui/*` mixed with Base UI — the kit is Base UI.
5. ❌ No `@tremor/react` — Tremor Raw (copied source) only.
6. ❌ No `framer-motion` — import from `motion/react`.

Foodie rules on top:

- **Zod at every boundary.** Cross-boundary types (network, storage, forms,
  URL payloads, `public/data/*.json`) are Zod schemas in `src/schemas/`; types
  come from `z.infer`, not `interface`.
- **`withBase()` for every href and asset** (`src/lib/href.ts`); locale-aware
  links through `withBase(localizedRoute(path, lang))`. Never hardcode a base.
- **Privacy (ADR 0015).** Nothing served may name the owner or his GitHub
  account: repository links are opt-in via `PUBLIC_REPO_SLUG` (unset in
  production — gate any new repo link on `REPO_URL`/`SITE.repoSlug`), the
  origin comes from `SITE_ORIGIN`, JSON-LD names `Organization "Foodie"`.
  `src/tests/privacy.test.ts` scans `src/content`, `public/` and all of `dist/`.
- **`lang` is a prop.** Islands receive `lang: Locale` and never read
  `navigator.language` during render; stores and pure functions take `lang`
  as an argument. Every ES page has an FR twin (`route-parity` test).
- **Dependencies:** the curated stack above only. No new runtime dependency
  without a roadmap decision or ADR.
- **Never** `--no-verify`, never `@ts-ignore` (`check:pragmas`), never delete a
  test to get green — adapt it deliberately and say so in the PR.
- **CSP (ADR 0012, `csp.config.mjs`).** Every page ships a hashed CSP meta; no
  `'unsafe-inline'` scripts/styles, no `'unsafe-eval'`. A library that injects
  a runtime `<style>` gets its text added to `RUNTIME_STYLE_TEXTS`; do not
  loosen the policy. Zod runs jitless in the browser because BaseLayout's
  inline theme script sets `globalThis.__zod_globalConfig` — a layout that does
  not use BaseLayout must set it too. `tests/e2e/csp.spec.ts` is the gate.
- **Fonts** (Fraunces, Hanken Grotesk, JetBrains Mono) are self-hosted in
  `public/fonts/` — no font CDN; keeps the CSP short and screenshots stable.
- **Search:** Pagefind indexes only pages with `data-pagefind-body` (the docs
  `<article>`, the recipe detail `<main>`). Mark noise `data-pagefind-ignore`.

**Compound-component gotcha.** shadcn/Base UI compositions that share state
(`Dialog`, `Sheet`, `Tabs`, controlled `DropdownMenu`, `Toast`)
**cannot span multiple islands**: Astro hydrates each `client:*` boundary as its own React
root, so a trigger in one island never sees content in another. Wrap the whole
composition in **one** file under `src/components/islands/` and hydrate it
once — e.g. `MobileNav.tsx` (the header's `Sheet`) or the template's
`ShowcaseDialog.tsx`, mounted as `<MobileNav client:idle lang={lang} … />` /
`<ShowcaseDialog client:visible />`.

**Island lifecycle.** Pair every listener, interval and observer with its
cleanup (`createDisposer()` from `src/lib/disposer.ts`). Browser-only values
(theme, unit system) go through `useClientPreference` so SSR and first paint
match.

**Auth gating.** `src/lib/route-guard.tsx` + `GuardUser` only; explicit
allowlists (`=== true`), deny by default, identity from `$user` — never from
props or query params.

## Data and state

- **Catalog:** `public/data/*.json` is the single source. Content collections
  (`file()` loader, `src/lib/catalog/collections.ts`) validate it with the Zod
  schemas at build time; islands read it at runtime with `useCatalog()`
  (TanStack Query persisted to IndexedDB for 24 h → offline). Prices:
  `ingredient-prices.json` via `usePriceCatalog()` (ADR 0014).
- **User data** (ADR 0002): Nano Stores persisted by `persistentAtom` —
  every read Zod-validated, invalid values fall back to the default without
  being overwritten, cross-tab sync, quota errors → `$storageQuotaExceeded`.
  v1 keys are kept verbatim (`favoriteRecipes`, `currentMealPlan`,
  `savedMealPlans`, `shoppingList`, `pantryItems`, `trackingEntries`,
  `nutritionGoals`, `theme`, per-account `user-preferences-<uid>` /
  `user-favorites-<uid>`); new keys use the `foodie:` prefix
  (`foodie:preferences`, `foodie:custom-prices`, `foodie:contribute-draft`,
  `foodie:locale`, …). The v1 `github-access-token` key is purged on load.
  `/profile/` exports and clears all Foodie keys.
- **Auth** (D9, ADR 0012): Firebase Auth behind the `AuthProvider` contract,
  SDK loaded lazily in auth islands only. Config `PUBLIC_FIREBASE_*` (all four
  or auth is disabled); `PUBLIC_AUTH_MOCK=1` forces the mock (dev/e2e;
  `demo@foodie.test` / `foodie-demo`); the build refuses the mock with
  `FOODIE_DEPLOY=1`. No Firestore.
- **Sharing** (D11, ADR 0013): the plan is compressed with `fflate` into the
  URL fragment → `/plan/shared/`. **Contribution** (D10): the wizard downloads
  JSON and opens a prefilled `recipe-submission.yml` issue — no token, no secret.
- Changing a schema: edit `src/schemas/`, run
  `npm run test -- src/tests/catalog-schema.test.ts`; the data model docs page
  regenerates itself.

## i18n

EN at `/`, ES at `/es/`, FR at `/fr/` — static routes, no runtime switch, no
i18next. UI strings in `src/i18n/{en,es,fr}.ts` (`es`/`fr` typed against
`typeof en`, so a missing key is a `tsc` error); catalog text is
`MultiLangText` `{ en, es, fr }` in the JSON. Helpers: `t(lang, key, params)`
(`{{x}}` interpolation, `_plural` keys), `getTranslated(text, lang)`,
`detectLocale(pathname)`, `localizedRoute(path, lang)`, `hreflangAlternates`.
New page = body in `components/pages/` + EN page + ES/FR wrappers.
`src/tests/i18n.test.ts` checks key parity, placeholders and plurals.

## Testing

- **Vitest** (`src/**/*.test.ts(x)`): domain logic, stores (jsdom pragma,
  `vi.resetModules()` for hydration), islands with an explicit `lang` prop, and
  repo contracts in `src/tests/` (route parity, forbidden imports, i18n, this
  file, workflows, SEO/CSP of `dist/` via `npm run test:dist`).
- **Catalog:** `src/tests/catalog-schema.test.ts` (schemas, unique ids,
  trilingual text, references); `validate-recipe-pr.yml` runs it on PRs.
- **Playwright:** `tests/visual/` (screenshots light/dark in
  `tests/__screenshots__/`, axe, console-error smoke, keyboard, mobile, search)
  and `tests/e2e/` (journeys + `csp.spec.ts`). Specs that inject styles or run
  axe use `test.use({ bypassCSP: true })`; everything else runs under the real
  CSP. Seed state with `tests/fixtures/planning.ts` (frozen clock). Prefer
  `getByRole`/`getByText`/`getByPlaceholder`; wait for hydration
  (`astro-island:not([ssr])`) before interacting.
- Quality bar: Lighthouse a11y ≥ 0.95, best practices = 1.0, no console errors.

## Deploy

`.github/workflows/deploy.yml` (workflow **Deploy**, ADR 0015) on push to
`main`: Node 22, `npm ci`, `npm run build` with `ASTRO_BASE=/`,
`SITE_ORIGIN=https://eat.cybere.co`, `FOODIE_DEPLOY=1`, `PUBLIC_BUILD_SHA`,
`PUBLIC_VERSION` and the `PUBLIC_FIREBASE_*` secrets — **no**
`PUBLIC_REPO_SLUG` — then Cloudflare Pages (project `foodie`, SHA-pinned
`wrangler-action`, custom domain `eat.cybere.co`, DNS with
`CLOUDFLARE_ZONE_ID`). Without `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID`
it builds and skips with a notice. `pages-redirect` turns the old GitHub Pages
site into a redirect once the new host answers; same-repo PRs get preview
aliases. `public/_headers` sets HSTS, `frame-ancestors 'none'` & co. Guide:
`docs/deploy/cloudflare-pages.md`. No Python/MkDocs step (D12). Other
workflows: `ci.yml` (check + actionlint), `visual.yml` (Playwright, hard
gate), `lighthouse.yml`, `security.yml` (CodeQL + dependency review, weekly),
`validate-recipe-pr.yml`, `deploy-failure-issue.yml`. Origin from
`SITE_ORIGIN` (fallback in `site.config.mjs`); rollback and the cutover steps
in `docs/runbooks/cutover.md`. Only `PUBLIC_*` variables reach the bundle —
never put a secret in one; Cloudflare credentials live in repository secrets.

## Agent-readable surface — ⚠️ re-brand when instantiating

`/llms.txt`, `/llms-full.txt`, the JSON-LD blocks and the default meta
description are all single-sourced from `src/lib/site-meta.ts` (name,
description, `repoSlug` from `PUBLIC_REPO_SLUG` — opt-in, no fallback —
license). If this repo is ever used as the seed of another project, update that
file (plus `SITE_ORIGIN`/`site.config.mjs` and `PUBLIC_REPO_SLUG`) first, or
the new site will introduce itself as Foodie.

## Roadmap status

| Phase | Issues | State |
|---|---|---|
| 0 — Foundation | 001–009 | Done |
| 1 — Domain, data and state | 010–016 | Done |
| 2 — Catalog | 017–023 | Done |
| 3 — Planning + cutover | 024–030 | Done in code (cutover runbook: `docs/runbooks/cutover.md`) |
| 4 — Nutrition tracking | 031–034 | Done |
| 5 — Accounts and contribution | 035–042 | Done |
| 6 — Docs, quality and closing | 043–048 | 043 docs site, 044 this file/README/CONTRIBUTING done; next: 045 perf budgets, 046 template trim, 047 deps/security, 048 `v2.0.0` release |

GitHub-side steps (tags, milestones, closing issues, branch cleanup) are the
maintainer's; the runbooks in `docs/runbooks/` list them.

## Decisions (ADRs, `docs/decisions/`)

Foodie: **0001** migration strategy (D1–D14) · **0002** local-first user data
(keys, stakeholders, export/clear) · **0010** `@dnd-kit` for the planner ·
**0011** Astro 7 upgrade · **0012** Firebase Auth adapter + CSP · **0013** plan
sharing with `fflate` · **0014** ingredient prices · **0015** Cloudflare Pages
at `eat.cybere.co`, repository links opt-in. The other numbers
(0001–0009 with other slugs) are Inceptor's inherited ADRs. New decision →
copy `docs/decisions/TEMPLATE.md`.

## References

- Roadmap: `docs/superpowers/specs/2026-09-27-foodie-inceptor-migration-roadmap.md`
- Principles / ethics: `docs/PRINCIPLES.md`, `docs/ETHICS.md`
- How-tos: `docs/recipes/` (catalog-data, state, i18n-islands, contributing-recipes)
- Components: `docs/COMPONENTS.md`, `docs/component-catalog.md`,
  `docs/component-guidelines/foodie.md`; live gallery at `/gallery/`
- Setup: `SETUP.md` · Contributing: `CONTRIBUTING.md` · Changelog: `CHANGELOG.md`
