# Contributing to Foodie

Thanks for helping. There are two ways in: **add a recipe** (no code needed)
or **change the code**. Both end in a pull request against `main`, checked by
CI and reviewed by a maintainer; merging deploys to
<https://eat.cybere.co/>.

Foodie v2 runs on the [Inceptor](https://github.com/ArtemioPadilla/inceptor)
template (Astro 7 islands + React 19 + Tailwind v4 + Base UI). Before touching
code, read [`CLAUDE.md`](CLAUDE.md): it lists the stack, the rules and the
roadmap status. The docs site has the long versions:
[development](https://eat.cybere.co/docs/guides/development/),
[testing](https://eat.cybere.co/docs/guides/testing/) and the
[data model](https://eat.cybere.co/docs/reference/api/).

## Contributing a recipe

Every recipe is one record in `public/data/recipes.json`, in English, Spanish
and French, validated with `RecipeSchema` (`src/schemas/recipe.ts`). The full
format is in the docs:
[Contributing recipes](https://eat.cybere.co/docs/contributing/recipe-format/).

### Without git — the Contribute wizard

1. Open [`/contribute/`](https://eat.cybere.co/contribute/)
   (or `/es/contribute/`, `/fr/contribute/`) and fill the seven steps; your
   draft is saved in your browser.
2. The last step downloads `recipe-<id>.json`. The public site links no
   repository (ADR 0015), so it does not open the issue for you: open a
   *Recipe submission* issue in this repository and attach the file (or paste
   it into the *Recipe JSON* field). Builds that set `PUBLIC_REPO_SLUG` open
   that issue prefilled instead. Foodie never holds a GitHub token: you create
   the issue with your own account.
3. Tick the checklist and create the issue. It is labelled
   `recipe-submission`.
4. A maintainer copies the JSON into `public/data/recipes.json`, assigns the
   next id (`rec_051`, …), completes any missing translation and opens the PR
   that closes your issue.

### With git — a pull request

1. Fork, then branch from `main` (e.g. `recipe/lentil-soup`).
2. Append your record to `public/data/recipes.json` with the next free id.
   Missing ingredients go into `public/data/ingredients.json` in the same PR.
   Omit optional fields instead of writing `null`.
3. Check it:

   ```bash
   npm run test -- src/tests/catalog-schema.test.ts   # schemas, unique ids, three languages, ingredient references
   npm run build                                      # the content collections must load
   ```

4. Open the PR. `validate-recipe-pr.yml` runs the catalog test and comments the
   result; a maintainer reviews the translations and the nutrition values.

How submissions are processed end to end (and why there are no secrets):
[`docs/recipes/contributing-recipes.md`](docs/recipes/contributing-recipes.md)
and [`docs/recipes/catalog-data.md`](docs/recipes/catalog-data.md).

## Contributing code — the issue-driven flow

Every change starts as a GitHub issue and ships as one PR:

```
issue ──► prometeo (plan) ──► forja (implement) ──► centinela (validate) ──► PR ──► CI + review ──► merge ──► deploy
```

1. **Issue.** Find or open one. Roadmap work comes from the
   [migration roadmap](docs/superpowers/specs/2026-09-27-foodie-inceptor-migration-roadmap.md)
   (`bash scripts/create-issues.sh` turns its issue blocks into GitHub issues;
   dry run by default, `--apply` to create). Each issue has acceptance
   criteria and a validation command.
2. **Plan — prometeo** (`.claude/agents/prometeo.md`) reads the roadmap and the
   issue, checks `Depends on`, and returns an ordered plan. It writes no code.
3. **Implement — forja** (`.claude/agents/forja.md`) implements that one issue
   on its branch with atomic commits, test first where behaviour changes.
4. **Validate — centinela** (`.claude/agents/centinela.md`) runs
   `npm run check` and the issue's validation block, checks forbidden imports
   and the ethics tier, and answers `APPROVED` or `REJECTED` with reasons.
5. **Pull request** against `main` with `Closes #N`. CI (`ci.yml`,
   `visual.yml`, `lighthouse.yml`, `security.yml`) must be green; a maintainer
   reviews and merges; `deploy.yml` publishes.

In a Claude Code session the main session orchestrates the three sub-agents.
Working by hand, you play the three roles yourself: plan from the issue,
implement, then run every check before opening the PR.

### Branches and pull requests

| Branch / tag | What it holds | Deploys? |
|---|---|---|
| `main` | Foodie v2 | Yes. Each push runs `deploy.yml` |
| `phase-N/issue-NNN-slug`, `fix/…`, `feat/…` | One issue each, PR → `main` | No |
| tag `legacy-vite-1.0.0` | The frozen v1 (React 18 + Vite SPA) | No. Rollback only ([`docs/runbooks/cutover.md`](docs/runbooks/cutover.md)) |

To read v1 code: `git show legacy-vite-1.0.0:src/<path>`. The v1 phase
reports and changelog are archived under `docs/archive/legacy-vite/`.

### Conventions

- **Commits:** Conventional Commits with the id —
  `type(scope): summary (roadmap #NNN)` or `(#N)`. A commit that only adds a
  failing test may carry a `Tdd-Red:` trailer.
- **Labels:** `phase-0` … `phase-6`, `type:feat|fix|docs|test|chore`,
  `risk:high`, `recipe-submission`; milestones `v0.1` … `v1.0`.
- **Rules** (enforced by ESLint, tests and review): no `@astrojs/tailwind`, no
  `@radix-ui/*`, no `@tremor/react`, no `framer-motion`; no React Context
  across islands (Nano Stores); one island per page; Zod schemas in
  `src/schemas/` for cross-boundary types; `withBase()` for every href and
  asset; islands get `lang` as a prop.
- **Never** `--no-verify`, never `@ts-ignore`, never delete a test to get
  green — change it deliberately and explain why in the PR.
- **Ethics tier** in the PR description (`.claude/checklists/ethics.json`,
  [`docs/ETHICS.md`](docs/ETHICS.md)): tier-0 docs/tests, tier-1 features and
  fixes, tier-2 (`risk:high`) needs a Stakeholder Analysis ADR.
- Record user-visible changes under `## [Unreleased]` in
  [`CHANGELOG.md`](CHANGELOG.md). New architectural decisions get an ADR in
  `docs/decisions/` (copy `TEMPLATE.md`).

## The checks

```bash
npm run check         # astro check + tsc + Vitest + ESLint + pragmas, then build + built-site tests — must be green
npm run test          # Vitest only (excludes Playwright specs)
npm run test:e2e      # Playwright journeys + the CSP gate (own build with the mock sign-in)
npm run build && npx playwright test   # visual + a11y + smoke + keyboard/mobile + journeys
```

`npm run test:e2e` leaves its mock-auth build in `dist/`; run `npm run build`
before the visual suite. Under an AI agent, Astro 7's `astro preview`
backgrounds itself: the Playwright configs pass `--ignore-lock`, and a preview
started by hand needs it too (or `npx astro preview stop`).

## Visual regression

Playwright snapshots the catalog (`/recipes/`, a recipe detail, an ingredient
detail), the planning pages (`/planner/`, `/shopping/`, `/pantry/`, seeded from
`tests/fixtures/planning.ts` with a frozen clock — roadmap Issue 029) and the
template's component `/gallery`, in both light and dark. The gallery is built
by `npm run build` and in CI but left out of the production deploy
(`FOODIE_DEPLOY=1`, `flagged-pages.config.mjs` — roadmap Issue 046).
Baselines live under `tests/__screenshots__/{chromium-light,chromium-dark}/`.

The CI workflow at `.github/workflows/visual.yml` runs `npx playwright test`
(visual + a11y + smoke + keyboard/mobile + the e2e journeys) on every PR and
push to `main`. It is a **hard gate** — no `continue-on-error` (roadmap Issue
029; `src/tests/workflow-foodie-ci.test.ts` keeps it that way).

Web fonts are self-hosted (`public/fonts/`, `@font-face` in
`src/styles/global.css`), so a baseline renders the same glyphs on every
machine — no third-party font host is involved, and Playwright waits for
`document.fonts.ready` before each screenshot.

Specs that inject a `<style>` to freeze animations (`page.addStyleTag`) and
the axe scan opt into `test.use({ bypassCSP: true })`: the production CSP
refuses injected styles. Everything else — smoke, keyboard, mobile, search and
the e2e journeys, including `tests/e2e/csp.spec.ts` — runs under the real
policy.

> The console-error smoke (`tests/visual/smoke.spec.ts`) is hermetic: it
> answers `api.github.com` (FeedbackFAB's duplicate-issue search) with
> fixtures, so a TLS-intercepting proxy or a GitHub rate limit cannot fail
> it. It runs under the production CSP, so a "Refused to …" console error
> fails it too.

### Update baselines after an intentional visual change

```bash
npm run build
npm run test:visual:update
git add tests/__screenshots__/
git commit -m "test(visual): refresh baselines"
```

### Run visual tests without updating baselines

```bash
npm run build          # build is required; Playwright uses the preview server
npm run test:visual    # equivalent to: playwright test
```

### Why are some pixels noisy?

- **Chart rendering** has minor anti-aliasing variability between machines and
  OSes. The dashboard tolerance is set to `0.03` (3% pixel diff).
- **Network responses** are mocked in the dashboard test so the GitHub API
  data is stable and reproducible.
- **Animations and transitions** are disabled by a `<style>` tag injected
  before each screenshot capture, so no frames are caught mid-animation.

### Refresh baselines in CI's environment (Linux)

The Playwright project ships a Docker image matching the CI runner. The
one-shot:

```bash
npm run refresh-baselines
```

That's a wrapper around `scripts/refresh-baselines.sh` which pulls the
Docker image, runs `npm ci && npm run build && npx playwright test --update-snapshots`
under the container, and prints next-step guidance.

Manual equivalent (in case Docker isn't available on PATH):

```bash
docker run --rm \
  -v "$(pwd):/work" -w /work \
  -e CI=true \
  mcr.microsoft.com/playwright:v1.62.1-noble \
  sh -c "npm ci && npm run build && npx playwright test --update-snapshots"
git add tests/__screenshots__/
git commit -m "test(visual): refresh baselines (linux)"
```

After this, the macOS/Linux differential disappears. Keep the image tag in
step with `@playwright/test` in `package.json` (a newer package cannot find
the browsers of an older image).

### First-time local setup

If Playwright's Chromium browser is not yet installed on your machine:

```bash
npx playwright install --with-deps chromium
```

CI runs this step automatically (see `.github/workflows/visual.yml`).
