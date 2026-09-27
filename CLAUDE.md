# Foodie — Claude Code Context (provisional)

Foodie is an offline-first meal-planning web app (trilingual EN/ES/FR recipe and
ingredient catalog, weekly planner, consolidated shopping list, pantry, food
diary) being rebuilt **template-first on Inceptor**: the Astro 5 + React 19
islands template now lives at the repo root, the legacy React 18 + Vite SPA is
frozen under `legacy/` (and on `main`, which keeps deploying it until the
cutover), and every feature is ported issue by issue into the new stack on the
integration branch `inceptor`. **The canonical plan is
[`docs/superpowers/specs/2026-09-27-foodie-inceptor-migration-roadmap.md`](docs/superpowers/specs/2026-09-27-foodie-inceptor-migration-roadmap.md)**
— 48 issues in 7 phases with decisions (D1–D14), target architecture, route →
page and context → store maps, and per-issue acceptance criteria. Read the
issue block you are working on in full before touching code; this file is
rewritten for the finished stack in roadmap Issue 044.

## Until Issue 044 — the essentials

**Stack (installed).** Astro 5.x (`^5.18`) islands, zero JS by default + `@astrojs/react`
(React 19) + Tailwind v4 via `@tailwindcss/vite` + shadcn-style primitives on
`@base-ui-components/react` (`src/components/ui/`, owned) + nanostores +
TanStack Query/Table/Virtual + react-hook-form/zod + lucide + recharts +
`motion/react` + `@vite-pwa/astro`. Tests: Vitest (`src/**/*.test.ts(x)`),
Playwright (`tests/visual` screenshots/a11y/smoke, `tests/e2e` journeys).

**Commands.** `npm run dev` · `npm run check` (astro check + tsc + vitest +
eslint + pragmas + build — the gate before every commit) · `npm run test` ·
`npm run build && npx playwright test` · `npm run test:e2e` · `npm run a11y` ·
`npm run lighthouse`. Branches `phase-N/issue-NNN-slug` → PR to `inceptor`
(to `main` after roadmap #030); commits are Conventional Commits with the
roadmap id, e.g. `feat(pages): landing Foodie (roadmap #005)`.

**Orchestration.** The main Claude Code session is the orchestrator; three
sub-agents under `.claude/agents/` do the work: **prometeo** plans (reads the
roadmap, orders issues by `Depends on`), **forja** implements one issue with
atomic commits, **centinela** validates (`npm run check`, forbidden imports,
ethics tier) and returns APPROVED / REJECTED. Bootstrap GitHub issues from the
roadmap with `bash scripts/create-issues.sh` (dry run; `--apply` to create).

**Non-negotiable rules (Inceptor + roadmap).**

- No `@astrojs/tailwind`; no `@radix-ui/*` mixed with Base UI; no
  `@tremor/react`; no `framer-motion` (use `motion/react`).
- No React Context shared **across** islands — nanostores only (`src/stores/`,
  persistent ones through `persistentAtom` in `src/lib/persist.ts`); Context
  inside one island is fine. Never wrap the whole app in one island.
- Cross-boundary types (network, storage, forms, `public/data/*.json`) are Zod
  schemas in `src/schemas/`, not `interface`.
- Every href/asset goes through `withBase()` (`src/lib/href.ts`); locale-aware
  links through `localizedRoute()` (`src/i18n`).
- Islands receive `lang: Locale` as a prop and never read `navigator.language`
  during render. Every ES page has an FR twin (`route-parity` test).
- Dependencies: Inceptor's curated stack plus only what the roadmap allows
  (`@dnd-kit/*`, `firebase` — `firebase/app` + `firebase/auth`, dynamic import
  — and one of `lz-string`/`fflate`).
- Never `--no-verify`, never `@ts-ignore`, never delete a test to get green —
  adapt it deliberately and say so in the PR.

**Compound-component gotcha.** shadcn/Base UI compositions that share state
(`Dialog`, `Sheet`, `Tabs`, controlled `DropdownMenu`, `Toast`)
**cannot span multiple islands**: Astro hydrates each `client:*` boundary as
its own React root, so a trigger in one island never sees content in another. Wrap the whole
composition in **one** file under `src/components/islands/` and hydrate it once
— e.g. `MobileNav.tsx` (the header's `Sheet`) or the template's
`ShowcaseDialog.tsx`, mounted as `<MobileNav client:idle lang={lang} … />` /
`<ShowcaseDialog client:visible />`.

**Ethics tiers.** PRs are tier-0 (docs/tests), tier-1 (default for
`type:feat`/`type:fix`: checklist items 1, 7, 8) or tier-2 (`risk:high`: new
non-same-origin fetch, new persistent storage of user input, routes under
`/auth`-like surfaces such as `/profile`/AuthDialog, diagnostics changes) which
requires a Stakeholder Analysis ADR. Source: `.claude/checklists/ethics.json`,
`docs/ETHICS.md`.

**Agent-readable surface — ⚠️ re-brand when instantiating.** `/llms.txt`,
`/llms-full.txt`, the JSON-LD blocks and the default meta description are all
single-sourced from `src/lib/site-meta.ts` (name, description, `repoSlug`
honouring `PUBLIC_REPO_SLUG=ArtemioPadilla/foodie`, license). If this repo is
ever used as the seed of another project, update that file (plus
`site.config.mjs`, `public/robots.txt` and `PUBLIC_REPO_SLUG`) first, or the
new site will introduce itself as Foodie.

## References

- Roadmap (canonical): `docs/superpowers/specs/2026-09-27-foodie-inceptor-migration-roadmap.md`
- Principles / ethics: `docs/PRINCIPLES.md`, `docs/ETHICS.md`
- Decisions: `docs/decisions/` (ADRs; roadmap Issue 009 adds 0001 migration strategy, 0002 local-data stakeholders)
- Components: `docs/COMPONENTS.md`, `docs/component-catalog.md`
- Setup: `SETUP.md` · Contributing: `CONTRIBUTING.md`
