# Cutover v1 → v2 (`inceptor` → `main`)

This is the maintainer runbook for roadmap **Issue 030**. It publishes Foodie
v2, the Inceptor app, at `https://artemiopadilla.github.io/foodie/` in place of
the v1 React 18 + Vite SPA. The issue is `risk:high` and needs **explicit
human review**. Everything in the repo is already prepared: the v1 URL
redirect, the legacy-data test, `CHANGELOG.md`, the README notice and the
`CONTRIBUTING.md` branching policy. What remains are the GitHub-side actions
below, which only the maintainer can run.

Conventions used below:

```bash
REPO=ArtemioPadilla/foodie
INTEGRATION=inceptor      # the branch that holds v2 (see step 0)
SITE=https://artemiopadilla.github.io/foodie
```

## 0. Preconditions (state of the remote)

On 2026-09-28 the remote had **no tags** and **no `inceptor` or `legacy`
branch**. The v2 work lives on `claude/foodie-status-next-steps-qvkt0l`, which
is a descendant of `main` (`ac89bf1`). Create whatever is missing first:

```bash
git fetch origin --tags
# v1 freeze point: the rollback target. Must exist before main moves.
git rev-parse -q --verify refs/tags/legacy-vite-1.0.0 || {
  git tag -a legacy-vite-1.0.0 ac89bf130d4d0d5dfca5348d6831bfb836e13dff -m "Foodie v1 (React 18 + Vite SPA), frozen before the Inceptor cutover"
  git push origin legacy-vite-1.0.0
}
# Integration branch: create it from the v2 work if it does not exist yet.
git ls-remote --exit-code --heads origin "$INTEGRATION" || {
  git push origin origin/claude/foodie-status-next-steps-qvkt0l:refs/heads/$INTEGRATION
}
```

In the repo settings, check the following:

- **Pages → Build and deployment → Source** is **GitHub Actions**. v1 already
  deploys with `actions/deploy-pages`, so no change is expected.
- **Environments → `github-pages` → Deployment branches and tags** allows
  `main`. For the rollback in step 8, it must also allow the tag
  `legacy-vite-1.0.0`.
- **Branch protection on `main`**: the required checks become v2's, by job
  name as they appear on a PR. These are
  `Build & Check` (ci.yml), `visual` (visual.yml), `lighthouse`
  (lighthouse.yml) and `dependency-review` (security.yml). v1's `test.yml`
  checks go away with the merge.

## 1. Pre-merge checklist (goes in the PR body)

Run everything on a clean clone of `$INTEGRATION`, then paste the results
into the PR:

```bash
git switch "$INTEGRATION" && git pull --ff-only
npm ci
npm run check                               # astro check + tsc + vitest + eslint + pragmas + build + seo
npm run test:e2e                            # e2e journeys, base '/'
ASTRO_BASE=/foodie npm run test:e2e         # same journeys under the Pages base path
npm run build && npx playwright test        # visual + a11y + smoke + keyboard + mobile + journeys
npm run lighthouse                          # performance/a11y/best-practices budgets
npm audit --omit=dev --audit-level=high     # must report no high/critical
```

- [ ] `npm run check` passes.
- [ ] `test:e2e` passes, both with base `/` and with `ASTRO_BASE=/foodie`.
- [ ] The visual suite passes. This includes the `/planner/`, `/shopping/` and
  `/pantry/` baselines and the a11y scans from Issue 029.
- [ ] Lighthouse passes.
- [ ] `npm audit --omit=dev` reports no high or critical advisories.
  On 2026-09-28 the blocker (critical `astro <= 7.2.7`, high `sharp`) was
  cleared by the Astro 7 upgrade
  ([ADR 0011](../decisions/0011-astro-7-upgrade.md)), and the command printed
  `found 0 vulnerabilities`. Re-run it on the day. A new high or critical
  advisory needs a fix or an explicit, dated risk acceptance in the PR. Do not
  merge with this box silently unchecked.
- [ ] ADRs [0001](../decisions/0001-foodie-inceptor-migration.md) and
  [0002](../decisions/0002-local-first-user-data.md) are in the branch
  (`docs/decisions/`).
- [ ] The README carries the "v2 on Inceptor" notice and links the tag
  `legacy-vite-1.0.0`.
- [ ] In `CHANGELOG.md`, `## [2.0.0-beta.1] - unreleased` has the release date
  (`YYYY-MM-DD`). Commit that date on `$INTEGRATION` before merging.
- [ ] The legacy-data manual validation (step 2) is done and noted in the PR.
- [ ] CI is green on the PR: ci.yml, visual.yml, lighthouse.yml and
  security.yml.

## 2. Legacy data: manual validation

The automated part covers two things:

- `src/tests/legacy-data-compat.test.ts` loads every v1 key into jsdom and
  asserts that each store hydrates, with no rejected values.
- The journey `v1 compatibility (roadmap #030)` in `tests/e2e/journeys.spec.ts`
  opens the real pages with the same data.

The fixture is `src/tests/fixtures/legacy-v1-localstorage.json`, with one
value per ADR 0002 key, shaped as the v1 code wrote it.

To check it by hand in a real browser, against the production build:

```bash
ASTRO_BASE=/foodie npm run build && ASTRO_BASE=/foodie npm run preview   # http://localhost:4321/foodie/
```

1. Open `http://localhost:4321/foodie/`, then open DevTools → Console.
2. Paste the following, with the fixture's JSON in place of `FIXTURE`:

   ```js
   const FIXTURE = /* contents of src/tests/fixtures/legacy-v1-localstorage.json */ {};
   localStorage.clear();
   for (const [k, v] of Object.entries(FIXTURE)) {
     if (k !== '$comment') localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
   }
   location.reload();
   ```

3. Check each of the following:
   - [ ] `/foodie/` redirects once to `/foodie/es/`, because v1 stored
     `i18nextLng: "es"`. The page is dark, from v1's `theme: "dark"`.
   - [ ] `/foodie/planner/` shows 5 meals: Monday breakfast Banana Pancakes,
     Wednesday lunch and dinner, and 2 Friday snacks. Templates lists
     "New Plan" and "Busy week".
   - [ ] `/foodie/shopping/` shows 3 lines with the banana checked. The
     `ing` line is v1's own truncated id from `generateFromPlan`, so it is
     expected.
   - [ ] `/foodie/pantry/` shows flour (Cabinet, expires 2026-12-01) and
     "Olive oil", a v1 free-text item.
   - [ ] `/foodie/recipes/?favorites=1` shows 3 favourites.
   - [ ] `trackingEntries` (3) and `nutritionGoals` (1800 kcal) are unchanged
     in Application → Local Storage. Tracking has no v2 UI until Phase 4.
   - [ ] The Console shows no `[persistentAtom]` warnings.
4. Optionally, repeat with **real** v1 data. On the live v1 site, before the
   merge, run `copy(JSON.stringify(Object.fromEntries(Object.entries(localStorage))))`
   in the Console and keep the result. After the deploy, the new app reads the
   same origin's storage without any action. Compare the plan, list, pantry
   and favourites.

## 3. Merge `inceptor` → `main` (merge commit, never squash)

`main` (`ac89bf1`) is an ancestor of `$INTEGRATION`, so a plain merge would
fast-forward and leave no merge commit. Use one of these:

```bash
# Preferred: through the PR, using GitHub's "Create a merge commit" button, or:
gh pr create --repo "$REPO" --base main --head "$INTEGRATION" \
  --title "chore(release): cutover inceptor → main, v2.0.0-beta.1 (roadmap #030)" \
  --body-file cutover-pr.md          # the checklist from step 1, filled in
gh pr merge <PR> --repo "$REPO" --merge        # --merge = merge commit (not --squash / --rebase)

# Equivalent from a terminal (only if the PR route is unavailable):
git switch main && git pull --ff-only
git merge --no-ff "origin/$INTEGRATION" -m "Merge branch '$INTEGRATION': Foodie v2 on Inceptor (roadmap #030)"
git push origin main
```

## 4. Deploy

The push to `main` triggers `deploy.yml`, "Deploy to GitHub Pages" (Node 22,
`ASTRO_BASE=/foodie`):

```bash
gh run list --repo "$REPO" --workflow deploy.yml --branch main --limit 1
gh run watch --repo "$REPO" "$(gh run list --repo "$REPO" --workflow deploy.yml --branch main --limit 1 --json databaseId -q '.[0].databaseId')"
```

## 5. Tag `v2.0.0-beta.1`

```bash
git fetch origin
MERGE_SHA=$(git rev-parse origin/main)          # the merge commit from step 3
git tag -a v2.0.0-beta.1 "$MERGE_SHA" -m "Foodie v2.0.0-beta.1 — Inceptor rebuild (roadmap #030)"
git push origin v2.0.0-beta.1
# Release notes = the CHANGELOG section
awk '/^## \[2.0.0-beta.1\]/{f=1;next} /^## \[/{f=0} f' CHANGELOG.md > /tmp/notes.md
gh release create v2.0.0-beta.1 --repo "$REPO" --prerelease --title "v2.0.0-beta.1" --notes-file /tmp/notes.md
```

## 6. Delete `inceptor`

Remove its branch protection first, if it has any: Settings → Branches.

```bash
git push origin --delete "$INTEGRATION"
# or: gh api -X DELETE "repos/$REPO/git/refs/heads/$INTEGRATION"
```

From now on every PR targets `main` (`CONTRIBUTING.md`). The workflows still
list `inceptor` in their triggers. That is harmless, and you can drop it in a
later chore PR together with `src/tests/workflow-foodie-ci.test.ts`.

## 7. Production smoke

```bash
curl -sI "$SITE/" | head -1                                  # HTTP/2 200
curl -s  "$SITE/manifest.webmanifest" | jq .name             # "Foodie - Meal Planner"
for p in "" es/recipes/ fr/planner/ recipes/rec_001/ es/recipes/rec_001/ shopping/ pantry/ sw.js; do
  printf '%-22s %s\n' "/$p" "$(curl -s -o /dev/null -w '%{http_code}' "$SITE/$p")"
done                                                         # all 200
curl -s -o /dev/null -w '%{http_code}\n' "$SITE/this-does-not-exist/"   # 404 (Foodie 404 page)
gh issue list --repo "$REPO" --label deploy-failure --state open        # empty
```

Then check in a browser, in a fresh profile and in a private window:

- [ ] `/foodie/`, `/foodie/es/recipes/` and `/foodie/fr/planner/` render
  without console errors.
- [ ] A recipe detail page, such as `/foodie/recipes/rec_001/`, renders with
  its scaler and nutrition table.
- [ ] Application → Manifest shows no errors and the page is installable (the
  install icon appears in the address bar).
- [ ] Application → Service Workers shows `sw.js` activated for
  `/foodie/`. Reload offline: `/foodie/recipes/` still works.
- [ ] `$SITE/?/recipes/rec_001` lands on `/foodie/recipes/rec_001/`, and
  `$SITE/?/recipes&type=breakfast~and~q=egg` lands on
  `/foodie/recipes/?type=breakfast&q=egg`. Both are v1 links.
- [ ] Existing users: if you did the optional real-data check in step 2,
  your own v1 data appears in v2.

## 8. Rollback: redeploy `legacy-vite-1.0.0`

If production is broken and a fix-forward is not quick, redeploy the v1 build
from its tag. v1's `deploy.yml` has `workflow_dispatch`, and it needs the
repository's `VITE_FIREBASE_*` secrets. Keep them until v2 is final
(`2.0.0`).

```bash
gh workflow run deploy.yml --repo "$REPO" --ref legacy-vite-1.0.0
gh run watch --repo "$REPO" "$(gh run list --repo "$REPO" --workflow deploy.yml --limit 1 --json databaseId -q '.[0].databaseId')"
curl -sI "$SITE/" | head -1
```

- The `github-pages` environment must allow deployments from the tag (see
  step 0). If it does not, add the tag there, or revert the merge on `main`,
  which redeploys v1 through its own workflow:
  `git revert -m 1 <merge-sha> && git push origin main`.
- User data is safe either way. v2 keeps every v1 key and shape (ADR 0002),
  so v1 reads what v2 wrote. The exception is anything that only v2 can
  create: custom shopping and pantry lines (`custom-…` ids with a `name`)
  show their raw id in v1, and v1 ignores fields it does not know.
- Re-running `deploy.yml` on `main` goes back to v2.
