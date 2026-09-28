# Repo cleanup: close PR #28, the legacy Dependabot PRs and the dead branches

This is the maintainer runbook for roadmap **Issue 042** (Phase 5). Everything
inside the repo is done. PR #28's stories are ported (Issues 026, 040, 041) and
its two documents are archived. What remains are GitHub-side actions, and only
the maintainer can run them. This file gives the exact commands and texts.

Conventions:

```bash
REPO=ArtemioPadilla/foodie
SPEC=docs/superpowers/specs/2026-09-27-foodie-inceptor-migration-roadmap.md
```

## 0. Preconditions

- The branch that holds v2 is pushed and reviewed. The ports and the archive
  below must be reachable on the remote before `feat/tracking` is deleted: on
  `main` after the cutover (Issue 030, `docs/runbooks/cutover.md`), or on the
  integration branch before it.
- **PR #28's documents are archived.** They were copied verbatim from
  `origin/feat/tracking` (`f033bc0`):
  - `FIREBASE_SETUP.md` → `docs/archive/legacy-vite/FIREBASE_SETUP.md`
  - `TEST_PLAN.md` → `docs/archive/legacy-vite/TEST_PLAN.md`

  Check this before you delete the branch:

  ```bash
  git fetch origin
  for f in FIREBASE_SETUP.md TEST_PLAN.md; do
    diff <(git show origin/feat/tracking:$f) docs/archive/legacy-vite/$f && echo "$f archived"
  done
  ```

- PR #28's stories and where each one landed in v2:

  | PR #28 story | Roadmap issue | v2 |
  | --- | --- | --- |
  | Custom items in the shopping list (`AddItemModal`, `ingredientUtils`, categories) | 026 | `ShoppingList` island, `lib/domain/ingredient-id.ts` |
  | Share a plan (`SharePlanModal`, `SharedPlanPage`, Firestore) | 040 | `SharePlanModal` + `/plan/shared/` by URL, no Firestore (ADR 0013) |
  | Ingredient prices (`ingredient-prices.json`, `PriceManagementModal`, `costCalculations`) | 041 | `prices` collection, `lib/domain/cost.ts`, `PriceManagementModal` (ADR 0014) |

  `my-venv/`, which PR #28 committed by mistake, is not ported.

## 1. Close PR #28 with a reference

The exact comment is below. If v2 is not on `main` yet, replace `blob/main`
with the branch that holds it.

```bash
gh pr close 28 --repo "$REPO" --comment "$(cat <<'MSG'
Closing without merging: Foodie was rebuilt on Inceptor (Astro 5 + React 19 islands), and this PR's stories were ported one by one instead of merged (roadmap decision D1, "port by stories").

Where each part landed:

- **Custom shopping-list items** (`AddItemModal`, `ingredientUtils`, categories) → roadmap Issue 026: the `ShoppingList` island and `src/lib/domain/ingredient-id.ts`.
- **Share a plan** (`SharePlanModal`, `SharedPlanPage`) → roadmap Issue 040: the plan now travels in the URL (`/plan/shared/#p=…`, compressed with `fflate`). No Firestore is needed (D11, ADR 0013).
- **Ingredient prices** (`public/data/ingredient-prices.json`, `PriceManagementModal`, `costCalculations.ts`, currency support) → roadmap Issue 041. The price sheet is re-keyed onto catalog ids and validated at build time, custom prices override catalog prices, and the NaN and division-by-zero guards are ported with tests (ADR 0014).
- `FIREBASE_SETUP.md` and `TEST_PLAN.md` are archived in `docs/archive/legacy-vite/`.
- `my-venv/` (committed by mistake) is not ported.

Plan and acceptance criteria: https://github.com/ArtemioPadilla/foodie/blob/main/docs/superpowers/specs/2026-09-27-foodie-inceptor-migration-roadmap.md (Issues 026, 040, 041 and 042).

The `feat/tracking` branch will be deleted after this.
MSG
)"
```

## 2. Close the legacy Dependabot PRs (#29–#35)

These bumps target v1's `package-lock.json` (Vite 7, react-router, rollup…).
The v2 lockfile no longer has most of those packages. Dependabot will open new
PRs against the new lockfile if any are still needed.

| PR | Branch | Title |
| --- | --- | --- |
| #29 | `dependabot/npm_and_yarn/multi-d64369b380` | bump react-router and react-router-dom |
| #30 | `dependabot/npm_and_yarn/lodash-4.17.23` | bump lodash from 4.17.21 to 4.17.23 |
| #31 | `dependabot/npm_and_yarn/minimatch-3.1.5` | bump minimatch from 3.1.2 to 3.1.5 |
| #32 | `dependabot/npm_and_yarn/multi-571506d351` | bump rollup |
| #33 | `dependabot/npm_and_yarn/flatted-3.4.2` | bump flatted from 3.3.3 to 3.4.2 |
| #34 | `dependabot/npm_and_yarn/multi-bf05dc1ecf` | bump picomatch |
| #35 | `dependabot/npm_and_yarn/vite-7.3.2` | bump vite from 7.2.4 to 7.3.2 |

```bash
for pr in 29 30 31 32 33 34 35; do
  gh pr close "$pr" --repo "$REPO" --delete-branch \
    --comment "Closing: this bump targets Foodie v1's lockfile, which was replaced by the Inceptor rebuild (roadmap Issue 042). Dependabot will reopen against the new lockfile if the update still applies."
done
```

`--delete-branch` also removes the seven `dependabot/*` branches. Step 3
removes any that are left.

## 3. Delete the dead remote branches

The list comes from `git ls-remote --heads origin` on 2026-09-28 (27 heads).
**Keep** `main`, `legacy`, `inceptor`, every `phase-*` branch and every
`claude/*` branch. Today the kept ones are `main`,
`claude/foodie-status-next-steps-qvkt0l` and
`claude/implement-pr-23-014p8VwZGNHLVK7AD6f7xjLq`. `legacy` and `inceptor` do
not exist yet; see `cutover.md` step 0. **Delete these 24:**

| Head | Branch |
| --- | --- |
| `5ebb293` | `auth-fix` |
| `f0f4f53` | `copilot/fix-duplicate-import-profile-page` |
| `fdd1fe0` | `copilot/fix-github-action-error` |
| `1b25f0a` | `copilot/implement-ingredient-composition` |
| `4e4877d` | `copilot/improve-navbar-layout` |
| `5abc70c` | `copilot/sub-pr-3` |
| `cb0b8e0` | `copilot/sub-pr-3-again` |
| `8486caf` | `copilot/sub-pr-3-another-one` |
| `279b114` | `copilot/sub-pr-3-one-more-time` |
| `8b244f9` | `copilot/sub-pr-3-yet-again` |
| `8f4df63` | `dependabot/npm_and_yarn/flatted-3.4.2` |
| `5b484de` | `dependabot/npm_and_yarn/lodash-4.17.23` |
| `cf2a43b` | `dependabot/npm_and_yarn/minimatch-3.1.5` |
| `26ad685` | `dependabot/npm_and_yarn/multi-571506d351` |
| `c672966` | `dependabot/npm_and_yarn/multi-bf05dc1ecf` |
| `4dc20e4` | `dependabot/npm_and_yarn/multi-d64369b380` |
| `48b6f07` | `dependabot/npm_and_yarn/vite-7.3.2` |
| `f033bc0` | `feat/tracking` (PR #28, after step 1 and the archive check in step 0) |
| `dc7bd53` | `fix-auth` |
| `1a6950e` | `fix-eslint` |
| `7b35fa9` | `fix-i18n` |
| `448be3a` | `fix-ingredient-detail` |
| `0493061` | `icons` |
| `42e2912` | `remove-mocks` |

Optional safety net: keep each head as a tag so a branch can be restored later
with `git push origin archive/<branch>:refs/heads/<branch>`:

```bash
git fetch origin
for b in $(git ls-remote --heads origin | awk '{print $2}' | sed 's|refs/heads/||' \
           | grep -Ev '^(main|legacy|inceptor|phase-.*|claude/.*)$'); do
  git push origin "refs/remotes/origin/$b:refs/tags/archive/$b"
done
```

Delete them. The filter re-derives the list, so a branch created since then
is also deleted unless it matches the keep pattern. Compare the output with the
table above before you confirm:

```bash
DEAD=$(git ls-remote --heads origin | awk '{print $2}' | sed 's|refs/heads/||' \
       | grep -Ev '^(main|legacy|inceptor|phase-.*|claude/.*)$')
printf '%s\n' $DEAD            # review: should be the 24 above (fewer if step 2 already deleted dependabot/*)
read -p "Delete these branches on origin? [y/N] " ok && [ "$ok" = y ] && \
  for b in $DEAD; do git push origin --delete "$b"; done
```

Equivalent through the API, one branch at a time:
`gh api -X DELETE "repos/$REPO/git/refs/heads/<branch>"`.

## 4. Validation (roadmap Issue 042)

```bash
gh pr list --repo "$REPO" --state open | wc -l   # 0 (plus any v2 PR you have opened on purpose)
git ls-remote --heads origin | wc -l             # 3 today (main + 2 claude/*); more once legacy, inceptor and phase-* exist
git ls-remote --heads origin | awk '{print $2}'  # only main, legacy, inceptor, phase-*, claude/*
```

The acceptance criterion "only `main`, `legacy` and active `phase-*` remain"
leaves out `claude/*`, the agent working branches. This runbook keeps them on
purpose. Delete a `claude/*` branch by hand once its work is merged, for
example `claude/implement-pr-23-…` (PR #23's port) if it is no longer needed.
