# Contributing to Foodie

## 🚧 Migration to Inceptor — temporary branching policy

> **Temporary section** (roadmap Phase 0 → Phase 3). It is removed at the
> cutover (roadmap Issue 030). Canonical plan:
> [`docs/superpowers/specs/2026-09-27-foodie-inceptor-migration-roadmap.md`](docs/superpowers/specs/2026-09-27-foodie-inceptor-migration-roadmap.md).

Foodie is being rebuilt on the [Inceptor](https://github.com/ArtemioPadilla/inceptor)
template (Astro 5 + React 19 + Tailwind v4 + Base UI). While that happens the
repository has **two live lines of development**:

| Branch | What it holds | Deploys? |
|---|---|---|
| `main` | The **legacy** React 18 + Vite SPA, frozen at `ac89bf1` (tag `legacy-vite-1.0.0`, mirrored by the `legacy` branch) | Yes — `https://artemiopadilla.github.io/foodie/` keeps serving legacy until the cutover |
| `inceptor` | The **integration branch** for the new app (roadmap Phases 0–3). Created by the maintainer from the Phase-0 working branch; protected (PR required, checks `build`, `test`, `type-check`) | Not yet — enabled at the cutover |

### Where do PRs go?

- **Migration work** (any roadmap issue `001`–`030`): branch from `inceptor` as
  `phase-N/issue-NNN-short-slug` and open the PR **against `inceptor`**, not
  `main`. Example: `phase-0/issue-003-rebrand-foodie` → PR base `inceptor`.
- **Legacy hotfixes only** (something broken on the live site): PR against
  `main`. Keep them minimal — `main` is frozen apart from urgent fixes and the
  legacy code is not being ported line-by-line.
- **Never** merge `inceptor` into `main` or vice-versa outside the cutover PR
  (roadmap Issue 030). `main` stays the legacy deploy until the new app reaches
  parity on catalog + planner + shopping + pantry (end of Phase 3).

### Conventions on `inceptor`

- Commit messages: Conventional Commits with the roadmap id —
  `type(scope): summary (roadmap #NNN)`.
- Every PR must keep `npm run check` green (astro check + tsc + vitest + eslint
  + pragmas + build) and follow the Inceptor rules listed in `CLAUDE.md`
  (no `@astrojs/tailwind`, no React Context across islands, `withBase()` for
  every href/asset, Zod schemas in `src/schemas/` for cross-boundary types).
- Labels `phase-0`…`phase-6`, `type:chore|feat|docs|test`, `risk:high` and
  milestones `v0.1`…`v1.0` classify the work (created by
  `scripts/create-issues.sh`, roadmap Issue 007).
- Reading legacy code from the `inceptor` branch: `git show main:src/<path>`
  (or `git show legacy:src/<path>`); while Phase 0 is in progress a read-only
  copy also lives under `legacy/` (removed in roadmap Issue 008).

### After the cutover

Once Issue 030 lands, `inceptor` is merged into `main`, `main` deploys the new
app and all PRs target `main` again. This section is deleted in that PR.


## Development workflow

1. Find or open a GitHub issue for the work you want to do.
2. Branch naming: `phase-N/issue-NNN-short-slug` (e.g. `phase-0/issue-001-upgrade-astro-5`).
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

`/showcase` and `/dashboard` are snapshotted by Playwright in both light and dark.
Baselines live under `tests/__screenshots__/{chromium-light,chromium-dark}/`.

The CI workflow at `.github/workflows/visual.yml` re-runs Playwright on every PR.

> ⚠️ **Initial baselines were captured on macOS** and may produce false-positive
> diffs against Ubuntu CI runners due to system font metric differences (~20–50px
> in total page height). The CI job is currently configured with
> `continue-on-error: true` (advisory mode). The fix is to refresh baselines from
> a Linux environment — see "Refresh baselines in CI's environment" below. Once
> baselines are platform-stable, remove the `continue-on-error` flag in
> `.github/workflows/visual.yml` to turn the gate back on.

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
  mcr.microsoft.com/playwright:v1.60.0-noble \
  sh -c "npm ci && npm run build && npx playwright test --update-snapshots"
git add tests/__screenshots__/
git commit -m "test(visual): refresh baselines (linux)"
```

After this, the macOS/Linux differential disappears and the CI gate becomes
trustworthy enough to flip back to a hard fail.

### First-time local setup

If Playwright's Chromium browser is not yet installed on your machine:

```bash
npx playwright install --with-deps chromium
```

CI runs this step automatically (see `.github/workflows/visual.yml`).
