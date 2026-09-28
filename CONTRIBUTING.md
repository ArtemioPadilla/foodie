# Contributing to Foodie

## Branches and pull requests

Foodie v2 runs on the [Inceptor](https://github.com/ArtemioPadilla/inceptor)
template (Astro 5 + React 19 + Tailwind v4 + Base UI). The roadmap cutover
(Issue 030, runbook [`docs/runbooks/cutover.md`](docs/runbooks/cutover.md))
merged the integration branch `inceptor` into `main` and deleted it. From then
on there is **one line of development**:

| Branch / tag | What it holds | Deploys? |
|---|---|---|
| `main` | Foodie v2, the Inceptor app | Yes. Each push runs `deploy.yml` and publishes `https://artemiopadilla.github.io/foodie/` |
| tag `legacy-vite-1.0.0` | The frozen v1 (React 18 + Vite SPA, `ac89bf1`) | No. Rollback only (see the runbook) |

### Where do PRs go?

- **Every PR targets `main`**: roadmap work (issues `031` onwards), fixes and
  docs. Branch from `main` as `phase-N/issue-NNN-short-slug`, for example
  `phase-4/issue-031-tracking-today`, and open the PR with base `main`.
- `inceptor` no longer exists. If an older branch was cut from it, rebase it
  onto `main` (`git fetch origin && git rebase origin/main`) before opening the
  PR.
- There is no v1 branch to fix. To read v1 code, run
  `git show legacy-vite-1.0.0:src/<path>`. The v1 phase reports and changelog
  are archived under `docs/archive/legacy-vite/`.

### Conventions

- Commit messages follow Conventional Commits with the roadmap id:
  `type(scope): summary (roadmap #NNN)`.
- Every PR must keep `npm run check` green (astro check, tsc, vitest, eslint,
  pragmas, build). It must also follow the Inceptor rules in `CLAUDE.md`: no
  `@astrojs/tailwind`, no React Context across islands, `withBase()` for every
  href and asset, and Zod schemas in `src/schemas/` for cross-boundary types.
- Labels `phase-0` to `phase-6`, `type:chore|feat|docs|test` and `risk:high`,
  and milestones `v0.1` to `v1.0`, classify the work. They are created by
  `scripts/create-issues.sh` (roadmap Issue 007).
- Record user-visible changes under `## [Unreleased]` in
  [`CHANGELOG.md`](CHANGELOG.md).

## Development workflow

1. Find or open a GitHub issue for the work you want to do.
2. Branch from `main` as `phase-N/issue-NNN-short-slug` (e.g. `phase-4/issue-031-tracking-today`) and open the PR against `main`.
3. Commit messages: Conventional Commits + issue ref (e.g. `feat(ui): add Button component (#6)`).
4. Open a PR that includes `Closes #N` in the body so the issue auto-closes on merge.
5. Every PR must pass `npm run build`, `npm run check`, and `npm run test` before merge.

## Running the unit tests

```bash
npm run test          # vitest only — excludes Playwright specs
npm run type-check    # tsc --noEmit
npm run check         # astro diagnostics
```

## Visual regression

Playwright snapshots the catalog (`/recipes/`, a recipe detail, an ingredient
detail), the planning pages (`/planner/`, `/shopping/`, `/pantry/`, seeded from
`tests/fixtures/planning.ts` with a frozen clock — roadmap Issue 029) and the
template's `/gallery` and `/demos/dashboard`, in both light and dark.
Baselines live under `tests/__screenshots__/{chromium-light,chromium-dark}/`.

The CI workflow at `.github/workflows/visual.yml` runs `npx playwright test`
(visual + a11y + smoke + keyboard/mobile + the e2e journeys) on every PR and
push to `main`. It is a **hard gate** — no `continue-on-error` (roadmap Issue
029; `src/tests/workflow-foodie-ci.test.ts` keeps it that way).

Web fonts are self-hosted (`public/fonts/`, `@font-face` in
`src/styles/global.css`), so a baseline renders the same glyphs on every
machine — no third-party font host is involved, and Playwright waits for
`document.fonts.ready` before each screenshot.

> The console-error smoke (`tests/visual/smoke.spec.ts`) needs the third-party
> hosts the pages load (`api.github.com` for `/demos/dashboard/`) to answer
> normally. On a network that intercepts TLS (corporate proxies, some
> sandboxes) it can fail with `net::ERR_CERT_AUTHORITY_INVALID`; that is the
> environment, not the app — on GitHub runners those hosts answer and the
> smoke passes.

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
