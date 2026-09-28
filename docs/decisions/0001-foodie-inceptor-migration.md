# 0001 — Rebuild Foodie template-first on Inceptor

## Status

`Accepted`

Date: 2026-09-27

> **Numbering note.** This is the first ADR of the _Foodie_ series. The files
> `0001-shape-up-over-scrum.md` … `0009-zag-js-for-gap-primitives.md` in this
> folder are the Inceptor template's own ADRs, inherited with the full copy
> (D2 below) and kept as reference for the agents until roadmap Issue 046
> decides whether they are archived. The migration roadmap refers to _this_
> series by number (ADR 0001 = this file, ADR 0002 = local-first user data,
> ADR 0004 = auth), so the collision is deliberate and documented rather than
> renumbered. Foodie ADRs written after these two take the next number that
> is free in the folder instead of colliding again. The first was
> `0010-dnd-kit.md` (Issue 024), which the roadmap once called "ADR 0003".
> Only the three numbers above are shared with the template series.

## Context

Foodie (`main` @ `ac89bf1`, 2025-11-26) is a React 18 + Vite 7 SPA:
react-router 7, Tailwind 3, i18next (EN/ES/FR), Firebase (Auth only),
react-dnd, `@octokit/rest`, vite-plugin-pwa. ~31k lines, 14 routes, 11 React
contexts, 12 `localStorage` keys, 73 components, 716 translation keys per
language, 50 recipes / 105 ingredients / 39 beverages in `public/data/*.json`.
It has no active users and no data in the cloud (Firestore/Storage were never
used).

The codebase carries known debt: recipe contribution is broken
(`initializeGitHubService` is never called and it writes one file per recipe
while the source is a consolidated `recipes.json`), the Firebase config is
hard-coded while `VITE_FIREBASE_*` is never read, a GitHub client secret sits in
`.env.example`, a GitHub token is stored in `localStorage`, 13 of 25 E2E tests
fail, `npm audit` reports 37 vulnerabilities, and several components/hooks
(`ProtectedRoute`, `Toast`, `ErrorBoundary`, `useSEO`, `useAnalytics`, …) and
dependencies (`react-hook-form`, `zod`, `date-fns`, `workbox-window`) are
installed but unused. TanStack Query is mounted without a single `useQuery`.

Inceptor (Astro 5 + React 19 islands + Tailwind v4 + Base UI + TanStack Query
with IDB persistence + nanostores + `@vite-pwa/astro` + typed route-based i18n

- docs site with Pagefind + IDD agents `prometeo`/`forja`/`centinela` + ethics
  checklist) is the template the author already used to rebuild TradePilot. Its
  non-negotiable rules: no `@astrojs/tailwind`; no React Context shared across
  islands (nanostores); never wrap the whole app in one island; no Radix mixed
  with Base UI; no `@tremor/react`; no `framer-motion` (use `motion/react`);
  cross-boundary types are Zod schemas in `src/schemas/`; every href/asset goes
  through `withBase()`; islands receive `lang` as a prop.

The question: how does Foodie move onto the Inceptor stack without weeks of a
degraded live site and without carrying the legacy debt along?

The full plan, with per-issue acceptance criteria, lives in
[`docs/superpowers/specs/2026-09-27-foodie-inceptor-migration-roadmap.md`](../superpowers/specs/2026-09-27-foodie-inceptor-migration-roadmap.md)
(§1 "Decisiones" D1–D14). This ADR records those decisions, the alternatives
that were rejected, and the consequences.

## Decision

### D1 — Template-first, not strangler/hybrid

Copy a clean Inceptor to the repository root and port Foodie's features _into_
it, issue by issue. Without active users or cloud data, a strangler-fig or a
hybrid SPA-inside-Astro only adds debt. Same path TradePilot took.

### D2 — Full copy of the template, not `scripts/init.mjs`

The template is copied whole (excluding `server-*`, `mcp-server/`,
`registry.json`, `templates/tauri-*`, `INTEGRATION-PLAN.md`, `ROADMAP.md`).
Gallery, docs and demos are kept as reference for the agents; their trimming is
decided in Issue 046.

_Rejected — `init.mjs` ("lean" generator)._ Its output does not compile:
`data-table.tsx` imports modules the generator does not copy (breaks `tsc`) and
its `ci.yml` ships `server-node`/`server-flask` jobs against folders that do
not exist. Fixing the generator is Inceptor's job, not this migration's.

### D3 — Integration branch `inceptor`, cutover at Issue 030

Work happens on branch `inceptor`; each issue on `phase-N/issue-NNN-slug` with a
PR into `inceptor`. `main` keeps deploying the legacy SPA until the new app has
core parity (catalog + planner + shopping + pantry, end of Phase 3), when Issue
030 cuts over. The legacy code stays reachable on `main`, on branch `legacy`
and tag `legacy-vite-1.0.0` (`git show main:src/<path>`); the read-only
`legacy/` working copy used during Phase 0 was removed in Issue 008 and the
legacy phase reports/changelog archived under `docs/archive/legacy-vite/`.

### D4 — One Astro page per route, one island per page

`/recipes/[id]` and `/ingredients/[id]` are generated with `getStaticPaths`
from the JSON catalog (50 + 105) × 3 languages. Every page exists as a thin
wrapper in `/`, `/es/`, `/fr/` over a shared body in `src/components/pages/*`.

_Rejected — app-shell island (`client:only` router)._ It violates Inceptor's
"no app-shell" rule, gives up real SEO/JSON-LD (today `useSEO` is unused), and
keeps the SPA `404.html` redirect trick on GitHub Pages.

### D5 — React contexts → persistent nanostores

The 11 contexts become nanostores in `src/stores/*` backed by an in-house
`persistentAtom(key, schema, fallback)` (`src/lib/persist.ts`: localStorage +
Zod validation + cross-tab `storage` sync, ~40 LOC modelled on
`stores/theme.ts`). React Context is allowed only _inside_ an island. The
legacy `localStorage` keys are preserved so existing browsers keep their data
(see [ADR 0002](./0002-local-first-user-data.md)).

### D6 — `public/data/*.json` stays the single catalog source

Astro **content collections** (`file()` loader, validated by the Zod schemas)
feed the static pages; **TanStack Query + IDB** (`useCatalog`) serves islands
that need the catalog at runtime, offline-capable. One origin, validated at
build.

### D7 — Route-based i18n EN/ES/FR, i18next removed

Inceptor's `src/i18n` is extended from EN/ES to EN/ES/FR (`/`, `/es/`, `/fr/`).
Dictionaries are derived from the existing `translation.json` files and typed
as `typeof en`. Islands receive `lang` by prop and never read
`navigator.language` during render. `t()` gains `{{x}}` interpolation and
`_plural` handling (27 keys use them). `i18next`, `react-i18next` and the
browser language detector are removed; the legacy `i18nextLng` key is read
once on `/` to redirect to the preferred locale.

### D8 — `react-dnd` → `@dnd-kit/core` (+ `@dnd-kit/utilities`)

react-dnd 16 has peer problems with React 19; dnd-kit is ~10 KB, React 19
ready, keyboard accessible, and is what Inceptor's own roadmap points to. It is
one of the three dependencies the migration explicitly allows.

### D9 — Firebase Auth kept, behind a contract

Firebase Auth (email, Google, GitHub) stays, wrapped in an `AuthProvider`
contract (`src/lib/auth/contracts.ts`) with `$user`/`$authReady` stores and a
`GuardUser` helper. Configuration comes from `PUBLIC_FIREBASE_*`; the SDK
(`firebase/app` + `firebase/auth` only) is loaded with a dynamic `import()`
inside the auth islands.

_Rejected for now — Supabase (the TradePilot path,
`docs/recipes/auth-supabase.md`)._ The Firebase project already exists and
Foodie uses no Firestore, so a provider switch buys nothing today. The contract
makes the change cheap later; Supabase remains the documented alternative and
will be revisited in ADR 0004 (`/auth`, Issue 035).

### D10 — Recipe contribution without client secrets

The wizard is rebuilt with `Form` (react-hook-form + Zod) and `Stepper`.
Submission is a JSON download plus a prefilled GitHub issue
(`recipe-submission.yml`). `@octokit/rest`, the token in `localStorage` and
`VITE_GITHUB_CLIENT_SECRET` are removed. A backend (Inceptor's `server-node`
archetype, `/api/feedback`) can reintroduce automatic PRs later.

### D11 — Share a plan by URL, not Firestore

A compressed plan in the query string → `/plan/shared`. Covers the story of PR
#28 without a backend; `lz-string` or `fflate` (~2 KB) is chosen in Issue 040.

### D12 — Docs: MkDocs → Inceptor `docs` collection + Pagefind

One toolchain; Python leaves the deploy.

### D13 — Brand

Primary emerald `#10b981` (Inceptor's default hue), amber accent, food-category
colours as tokens in `global.css` + `site-meta.ts`. Minimal rebrand; the kit is
adopted as is.

### D14 — Deferred

Cloud sync (Firestore), automatic recipe PRs, Tauri apps, Kanban/board. No
users justify them yet.

**Out of scope:** changing the hosting (GitHub Pages at `/foodie/`), a product
redesign, features not in the roadmap.

## Consequences

**Positive**

- Static, crawlable, trilingual pages with real JSON-LD for every recipe and
  ingredient; no SPA 404 trick.
- The debt list in _Context_ disappears by construction: unused code is not
  ported, secrets never reach the client, dependencies drop from 12 legacy
  packages to 3 justified additions.
- Inceptor's quality gates (`npm run check`, Playwright visual/a11y/e2e,
  Lighthouse budgets, forbidden-imports, ethics checklist, IDD agents) apply
  from the first commit.
- One toolchain for app and docs; TradePilot and Foodie share the same
  architecture, so fixes and recipes transfer.
- `main` keeps serving the current app until parity, so users never see a
  half-migrated site.

**Negative**

- Roughly 48 issues across 7 phases before v1.0; the integration branch lives
  for months and `main` receives only hotfixes meanwhile.
- The full template copy brings gallery/demos/blog pages that Foodie does not
  need until Issue 046 trims them (build time, page count, agent noise).
- Static pages cannot switch language at runtime; a language change is a
  navigation to `/es/` or `/fr/`.
- `npm audit --omit=dev` still reports advisories against Astro 5 (fixes only
  in Astro ≥ 6/7 majors, plus its transitive `sharp`); Issue 047 owns the
  upgrade decision.
- Legacy E2E coverage is not carried over; every page gets a new Playwright
  journey as it ships.

**Neutral**

- `public/data/*.json` and `public/locales/**` are unchanged inputs; only the
  consumers change.
- Firebase remains a dependency; the auth contract makes it replaceable but does
  not replace it.
- Legacy docs (phase reports, changelog) move to `docs/archive/legacy-vite/`
  instead of being deleted.

## Supersedes

None.

## References

- Roadmap: [`docs/superpowers/specs/2026-09-27-foodie-inceptor-migration-roadmap.md`](../superpowers/specs/2026-09-27-foodie-inceptor-migration-roadmap.md)
  (§0 context, §1 decisions D1–D14, §2 target architecture, Issues 001–048)
- [ADR 0002 — Local-first user data](./0002-local-first-user-data.md)
- Legacy reference: branch `main`, branch `legacy`, tag `legacy-vite-1.0.0`;
  archived reports in [`docs/archive/legacy-vite/`](../archive/legacy-vite/)
- Inceptor template: https://github.com/ArtemioPadilla/inceptor (inherited
  ADRs `0001`–`0009` in this folder)
- Roadmap issues: #001 (preserve legacy), #002 (copy template), #008 (remove
  `legacy/`), #009 (this ADR), #030 (cutover), #035 (auth, ADR 0004), #040
  (plan sharing), #046 (template trimming), #047 (dependency hygiene)
