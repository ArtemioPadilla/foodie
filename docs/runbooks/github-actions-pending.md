# Pending GitHub-side actions (release v2.0.0)

This is the maintainer runbook for roadmap **Issue 048**, and the single list
of every GitHub-side action the migration left for the maintainer. The code of
all 48 roadmap issues is in the branch; none of the actions below has been run
(on 2026-09-28 the remote had no tags, no `legacy` or `inceptor` branch, and
no roadmap issues, labels or milestones). Only the maintainer can run them.

Work through the steps **in order**. Two runbooks hold the long versions of
some steps, and this list points into them instead of repeating them:

- [`cutover.md`](cutover.md): the pre-merge checks, the legacy-data check,
  the merge of `inceptor` into `main`, the deploy, the production smoke and the
  rollback (Issue 030).
- [`repo-cleanup.md`](repo-cleanup.md): closing PR #28 with its exact comment,
  the legacy Dependabot PRs and the 24 dead branches (Issue 042).

```bash
REPO=ArtemioPadilla/foodie
WORK=claude/foodie-status-next-steps-qvkt0l   # the branch that holds v2 today
INTEGRATION=inceptor
SITE=https://artemiopadilla.github.io/foodie
FIREBASE_PROJECT=foodie-cc553                 # confirm in the Firebase console
gh auth status                                # every gh command needs an owner token
```

## Where each deferred action comes from

| Roadmap issue | Deferred GitHub-side action | Step |
|---|---|---|
| 001 | Tag `legacy-vite-1.0.0`, branch `legacy`, branch `inceptor` (protected), labels and milestones | 2, 3, 4, 10 |
| 006, 047 | Dependabot, CodeQL and dependency review running on `main`; security workflow green there | 5, 17 |
| 007 | Create the 48 roadmap issues with `scripts/create-issues.sh --apply` | 4 |
| 030 | Cutover: pre-merge checks, merge commit into `main`, deploy, smoke, delete `inceptor` | 9, 11, 12, 15 |
| 035, 036 | `PUBLIC_FIREBASE_*` secrets; restrict and rotate the Firebase API key; authorised domains; real Google/GitHub popup under the CSP before merging | 6, 7, 8, 12, 18 |
| 042 | Close PR #28, close Dependabot PRs #29–#35, delete dead branches | 15 |
| 045 | Lighthouse on production, archived | 13 |
| 048 | Tag `v2.0.0`, GitHub Release, close every roadmap issue and milestone | 14, 16, 19 |
| (config) | Discussions (linked from `.github/ISSUE_TEMPLATE/config.yml`), private vulnerability reporting (`SECURITY.md`), extra labels used by templates and workflows | 4, 5 |

## 1. Push the v2 work

The remote copy of `$WORK` is older than the local branch (the remote head was
`9fa9e8e`, roadmap #042). Push from the clone that holds the finished work:

```bash
git push origin "HEAD:refs/heads/$WORK"
test "$(git ls-remote origin "refs/heads/$WORK" | cut -f1)" = "$(git rev-parse HEAD)" && echo pushed
```

## 2. Freeze v1: tag `legacy-vite-1.0.0` and branch `legacy` (Issue 001)

This is the rollback target, so it must exist before `main` moves.

```bash
git fetch origin --tags
git tag -a legacy-vite-1.0.0 ac89bf130d4d0d5dfca5348d6831bfb836e13dff \
  -m "Foodie v1 (React 18 + Vite SPA), frozen before the Inceptor cutover"
git push origin legacy-vite-1.0.0
git push origin ac89bf130d4d0d5dfca5348d6831bfb836e13dff:refs/heads/legacy
git ls-remote origin | grep -E 'legacy-vite-1\.0\.0\^\{\}|refs/heads/legacy$'   # both → ac89bf1…
```

## 3. Create the integration branch `inceptor` (Issues 001, 030)

```bash
git fetch origin
git push origin "refs/remotes/origin/$WORK:refs/heads/$INTEGRATION"
git ls-remote --heads origin "$INTEGRATION"
```

## 4. Labels, milestones and the 48 roadmap issues (Issues 001, 007)

`scripts/create-issues.sh` reads the roadmap and is idempotent (existing
labels, milestones and issues are skipped). It links each issue to the spec on
the `inceptor` branch; after the cutover, run it with `SPEC_BRANCH=main`.

```bash
bash scripts/create-issues.sh | grep -c '^### Issue'       # dry run: 48
bash scripts/create-issues.sh --apply                      # labels phase-0…6, type:*, risk:high; 7 milestones; 48 issues
gh label list --repo "$REPO" --limit 200 | grep -c 'phase-'   # 7
gh api "repos/$REPO/milestones?state=all" -q 'length'      # 7
```

The issue templates and workflows apply labels that the roadmap does not
create. GitHub drops a label that does not exist, so create them too (`bug`,
`enhancement` and `question` are GitHub's defaults):

```bash
gh label create recipe-submission --repo "$REPO" --force --color 0E8A16 --description "Recipe proposed through the contribute wizard (recipe-submission.yml)"
gh label create deploy-failure    --repo "$REPO" --force --color B60205 --description "Opened by deploy-failure-issue.yml"
gh label create ai-approved       --repo "$REPO" --force --color 5319E7 --description "Maintainer approved AI triage of this issue (claude.yml)"
gh label create audit             --repo "$REPO" --force --color C5DEF5 --description "Audit issue (audit.yml template)"
```

Run this step **before** the cutover. `claude.yml` (AI triage) runs on
issues the owner opens, and it only exists on `main` after the merge. If you
run the script later, disable it for the bulk run:
`gh workflow disable claude.yml --repo "$REPO"`, then `gh workflow enable`.

## 5. Repository settings

```bash
# Discussions: the issue chooser links https://github.com/$REPO/discussions
gh api -X PATCH "repos/$REPO" -F has_discussions=true
# Private advisories: SECURITY.md sends reporters to security/advisories/new
gh api -X PUT "repos/$REPO/private-vulnerability-reporting"
# Dependabot alerts and security updates (dependabot.yml handles version updates)
gh api -X PUT "repos/$REPO/vulnerability-alerts"
gh api -X PUT "repos/$REPO/automated-security-fixes"
# CodeQL runs from security.yml (advanced setup); default setup must be off or the upload is rejected
gh api "repos/$REPO/code-scanning/default-setup" -q .state          # expect: not-configured
gh api -X PATCH "repos/$REPO/code-scanning/default-setup" -f state=not-configured   # only if it was configured
# Pages is deployed by Actions (v1 already does this)
gh api "repos/$REPO/pages" -q .build_type                           # expect: workflow
# Let the github-pages environment deploy the v1 tag, for the rollback (cutover.md §8)
gh api -X POST "repos/$REPO/environments/github-pages/deployment-branch-policies" -f name=legacy-vite-1.0.0 -f type=tag
```

The last call works only when the environment uses "Selected branches and
tags". If it returns 404, add the tag in Settings → Environments →
`github-pages` instead.

## 6. Firebase and Google Cloud: a restricted key, authorised domains (Issues 035, 047)

v1 commits the Firebase web config, API key included, in its source on `main`
(ADR 0012). v2 reads it only from `PUBLIC_FIREBASE_*` at build time. Replace
the key without breaking v1 while v1 is still live or is the rollback target:

1. Create a **new** browser key restricted to the deployed origins and to the
   two Auth APIs:

   ```bash
   gcloud services api-keys create --project="$FIREBASE_PROJECT" --display-name="foodie-web-v2" \
     --allowed-referrers="https://artemiopadilla.github.io/*,http://localhost:4321/*" \
     --api-target=service=identitytoolkit.googleapis.com \
     --api-target=service=securetoken.googleapis.com
   gcloud services api-keys list --project="$FIREBASE_PROJECT"          # note NEW_KEY_ID and OLD_KEY_ID
   gcloud services api-keys get-key-string NEW_KEY_ID --project="$FIREBASE_PROJECT"
   ```

2. Restrict the **old** key (the one committed on `main`) to the same
   referrers now; delete it in step 18, once v1 can no longer come back:

   ```bash
   gcloud services api-keys update OLD_KEY_ID --project="$FIREBASE_PROJECT" \
     --allowed-referrers="https://artemiopadilla.github.io/*,http://localhost:4321/*"
   ```

3. Firebase console → Authentication → Settings → **Authorised domains**:
   `artemiopadilla.github.io` and `localhost`.
4. Firebase console → Authentication → Sign-in method: Email/Password, Google
   and GitHub enabled. The GitHub OAuth app's callback URL is
   `https://foodie-cc553.firebaseapp.com/__/auth/handler`, and its client
   secret lives only in the Firebase console (D10).

## 7. Repository secrets and variables

```bash
gh secret set PUBLIC_FIREBASE_API_KEY     --repo "$REPO"      # paste the NEW key from step 6 at the prompt
gh secret set PUBLIC_FIREBASE_AUTH_DOMAIN --repo "$REPO" --body "foodie-cc553.firebaseapp.com"
gh secret set PUBLIC_FIREBASE_PROJECT_ID  --repo "$REPO" --body "$FIREBASE_PROJECT"
gh secret set PUBLIC_FIREBASE_APP_ID      --repo "$REPO"      # Firebase console → Project settings → Your apps
gh secret list --repo "$REPO"
```

- If any of the four is missing, the site still deploys, with sign-in turned
  off.
- Leave `ASTRO_BASE` (default `/foodie`), the `PUBLIC_REPO_SLUG` variable
  (default `ArtemioPadilla/foodie`) and `CHECK_SKIP_ASTRO` unset.
- `ANTHROPIC_API_KEY` is only needed if you want `claude.yml`'s AI triage.
  Otherwise, disable that workflow after the cutover:
  `gh workflow disable claude.yml --repo "$REPO"`.
- Keep v1's `VITE_FIREBASE_*` secrets. The rollback build needs them, and
  step 18 removes them.

## 8. Test the real Firebase popup under the CSP, before the merge (Issues 035, 036)

CI cannot sign in with real providers, and the roadmap asks for this check
before the cutover. GitHub Pages serves one site per repository and
`deploy.yml` publishes only from `main`. So the preview is the production
build served locally. The Content-Security-Policy is a `<meta>` tag in every
page, so the page enforces the same policy it will enforce on Pages.

```bash
git switch "$INTEGRATION" && git pull --ff-only && npm ci
export PUBLIC_FIREBASE_API_KEY=… PUBLIC_FIREBASE_AUTH_DOMAIN=foodie-cc553.firebaseapp.com \
       PUBLIC_FIREBASE_PROJECT_ID=foodie-cc553 PUBLIC_FIREBASE_APP_ID=…   # never commit these
FOODIE_DEPLOY=1 ASTRO_BASE=/foodie npm run build
grep -c 'http-equiv="content-security-policy"' dist/index.html          # 1
npx astro preview --ignore-lock                                         # http://localhost:4321/foodie/
```

In a fresh browser profile with DevTools → Console open:

- [ ] Sign in → **Google**: the popup opens, completes and closes, and the
  header shows the avatar.
- [ ] Sign out, then Sign in → **GitHub**: same result.
- [ ] Email: sign up, sign out, sign in, and "Forgot password" sends the
  email.
- [ ] `/foodie/profile/` opens while signed in and redirects home when signed
  out.
- [ ] The Console shows no `Refused to …` CSP error and no
  `auth/unauthorized-domain` error.

If a CSP error appears, fix the policy in `csp.config.mjs` (ADR 0012) through
a PR. Do not loosen the policy by hand in production. Optionally, repeat the
check on a fork's Pages site (`https://<you>.github.io/foodie/`) after adding
that origin to the key's referrers and to the authorised domains.

## 9. Pre-merge checks and the release date (Issue 030)

Run [`cutover.md`](cutover.md) §1 (checks on a clean clone of `inceptor`)
and §2 (manual legacy-data check). Then put today's date on the release, on
`inceptor`, before the branch is protected:

```bash
perl -pi -e "s/^## \[2\.0\.0\] - unreleased\$/## [2.0.0] - $(date +%F)/" CHANGELOG.md
grep -n '^## \[2\.0\.0\]' CHANGELOG.md                                      # ## [2.0.0] - YYYY-MM-DD
git commit -am "chore(release): date v2.0.0 in the CHANGELOG (roadmap #048)" && git push origin "HEAD:$INTEGRATION"
```

## 10. Branch protection for `main` and `inceptor` (Issues 001, 030)

The required checks are v2's job names, which are not the `build` / `test` /
`type-check` names the roadmap's Issue 001 assumed. Open a PR and look at its
Checks tab to confirm the names before you set them.

```bash
for b in main "$INTEGRATION"; do
  gh api -X PUT "repos/$REPO/branches/$b/protection" --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["Build & Check", "visual", "lhci autorun (dist/)", "Dependency review",
                 "npm audit (high/critical)", "CodeQL (javascript-typescript)"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": { "required_approving_review_count": 0 },
  "restrictions": null
}
JSON
done
gh api "repos/$REPO/branches/main/protection" -q '.required_status_checks.contexts'
```

## 11. Cutover: merge `inceptor` into `main` (Issue 030)

Follow [`cutover.md`](cutover.md) §3. Use a PR with a **merge commit**, never
squash, titled `chore(release): cutover inceptor → main, v2.0.0 (roadmap
#030, #048)`, with the §1 checklist in the body. Then follow §4 and watch
`deploy.yml` publish.

## 12. Production smoke (Issues 030, 036)

Run [`cutover.md`](cutover.md) §7, then check the items it does not cover:

```bash
curl -s "$SITE/" | grep -o 'data-app-version="[^"]*"'                  # data-app-version="2.0.0"
curl -s "$SITE/" | grep -c 'http-equiv="content-security-policy"'      # 1
gh issue list --repo "$REPO" --label deploy-failure --state open       # empty
```

- [ ] On `$SITE/`, Google and GitHub sign-in work as in step 8, with no CSP
  error in the Console.

If production is broken, use the rollback in [`cutover.md`](cutover.md) §8.

## 13. Lighthouse on production, archived (Issue 045)

```bash
mkdir -p lighthouse-v2.0.0
for p in "" es/ fr/ recipes/ recipes/rec_001/ planner/ tracking/progress/; do
  name=$(printf '%s' "${p:-home}" | tr '/' '_')
  npx --yes lighthouse "$SITE/$p" --quiet --chrome-flags="--headless=new" \
    --output=html --output=json --output-path="lighthouse-v2.0.0/$name"
done
for f in lighthouse-v2.0.0/*.report.json; do
  jq -r '[input_filename, (.categories|to_entries|map("\(.key)=\(.value.score)")|join(" "))]|join("  ")' "$f"
done                        # performance ≥ 0.9, accessibility ≥ 0.95, best-practices = 1, seo ≥ 0.95
zip -r lighthouse-v2.0.0.zip lighthouse-v2.0.0
```

## 14. Tag `v2.0.0` and publish the GitHub Release (Issue 048)

We recommend releasing `2.0.0` straight from the cutover merge, because the
merge already carries every phase. The `2.0.0-beta.1` from Issue 030 was
never tagged, and its CHANGELOG entries are folded into `[2.0.0]`. If you
want a soak period first, tag the merge `v2.0.0-beta.1` as a `--prerelease`
with the same notes, and run this step later.

```bash
git fetch origin
MERGE_SHA=$(git rev-parse origin/main)          # the cutover merge commit (plus the dated CHANGELOG)
git tag -a v2.0.0 "$MERGE_SHA" -m "Foodie v2.0.0 — Foodie on Inceptor (roadmap #048)"
git push origin v2.0.0
awk '/^## \[2\.0\.0\]/{f=1;next} /^## \[/{f=0} f' CHANGELOG.md | sed '/^\[[^]]*\]: http/d' > /tmp/notes-v2.0.0.md
gh release create v2.0.0 --repo "$REPO" --verify-tag --latest \
  --title "v2.0.0 — Foodie on Inceptor" --notes-file /tmp/notes-v2.0.0.md lighthouse-v2.0.0.zip
```

## 15. Delete `inceptor` and clean up the repository (Issues 030, 042)

1. Delete `inceptor` as described in [`cutover.md`](cutover.md) §6. Remove its
   protection first:
   `gh api -X DELETE "repos/$REPO/branches/$INTEGRATION/protection"`, then
   `git push origin --delete "$INTEGRATION"`.
2. Close PR #28 with the exact comment in
   [`repo-cleanup.md`](repo-cleanup.md) §1:
   `gh pr close 28 --repo "$REPO" --comment "…"`.
3. Close the legacy Dependabot PRs ([`repo-cleanup.md`](repo-cleanup.md) §2):

   ```bash
   for pr in 29 30 31 32 33 34 35; do
     gh pr close "$pr" --repo "$REPO" --delete-branch \
       --comment "Closing: this bump targets Foodie v1's lockfile, which was replaced by the Inceptor rebuild (roadmap Issue 042). Dependabot will reopen against the new lockfile if the update still applies."
   done
   ```

4. Delete the dead branches, keeping `main`, `legacy`, `phase-*` and
   `claude/*` ([`repo-cleanup.md`](repo-cleanup.md) §3, with the optional
   `archive/*` tags). Once v2.0.0 is out, `$WORK` can go too:
   `git push origin --delete "$WORK"`.

## 16. Close the roadmap issues and milestones (Issue 048)

Each issue is closed with the commits that implemented it on `main`. The same
list is in the status table of the roadmap spec (§6).

```bash
git fetch origin
for n in $(seq 1 48); do
  id=$(printf '%03d' "$n")
  num=$(gh issue list --repo "$REPO" --state open --limit 5 --search "in:title \"roadmap #$id\"" \
        --json number,title -q ".[] | select(.title | endswith(\"(roadmap #$id)\")) | .number")
  [ -n "$num" ] || continue
  shas=$(git log origin/main --reverse -F --grep="(roadmap #$id)" --format=%h | paste -sd' ' -)
  gh issue close "$num" --repo "$REPO" --reason completed \
    --comment "Implemented on main in: $shas. Released in v2.0.0 (https://github.com/$REPO/releases/tag/v2.0.0)."
done
gh api "repos/$REPO/milestones?state=open&per_page=100" -q '.[] | select(.title | test("^v[01]\\.")) | .number' |
  while read -r m; do gh api -X PATCH "repos/$REPO/milestones/$m" -f state=closed; done
```

## 17. Security workflow on `main`, and the new Dependabot PRs (Issues 006, 047)

```bash
gh run list --repo "$REPO" --workflow security.yml --branch main --limit 1   # completed / success
gh api "repos/$REPO/code-scanning/alerts?state=open" -q 'length'            # 0 (or triaged)
gh api "repos/$REPO/dependabot/alerts?state=open" -q 'length'
gh pr list --repo "$REPO" --author app/dependabot                           # grouped PRs against the v2 lockfile
```

Each Dependabot PR has to pass the required checks. The majors that
`dependabot.yml` ignores give their reasons inline in that file.
`security.yml` has a weekly cron and runs on push, so GitHub does not disable
it after 60 idle days.

## 18. After the rollback window: retire v1's credentials

Once v2 has run in production long enough that you will not redeploy
`legacy-vite-1.0.0` (for example, two weeks without a rollback):

```bash
gh secret list --repo "$REPO"
for s in $(gh secret list --repo "$REPO" --json name -q '.[].name | select(startswith("VITE_"))'); do
  gh secret delete "$s" --repo "$REPO"
done
gcloud services api-keys delete OLD_KEY_ID --project="$FIREBASE_PROJECT"   # rotate: the key committed on main stops working
```

Then do the in-repo follow-ups listed in [`ROADMAP.md`](../../ROADMAP.md),
such as dropping `inceptor` from the workflow triggers. Also mark the roadmap
spec `**Estado:** Hecho`, with the release link, in a docs PR.

## 19. Validation (roadmap Issue 048, plus 001, 007 and 042)

```bash
git fetch origin --tags
git tag -l 'v2.*' && gh release view v2.0.0 --repo "$REPO"
git ls-remote --tags origin legacy-vite-1.0.0 v2.0.0                     # both present
git ls-remote --heads origin | awk '{print $2}'                          # main, legacy, (phase-*, claude/*)
gh label list --repo "$REPO" --limit 200 | grep -c 'phase-'              # 7
gh issue list --repo "$REPO" --state open --search 'in:title "roadmap #"' | wc -l   # 0
gh api "repos/$REPO/milestones?state=open" -q 'length'                   # 0
gh pr list --repo "$REPO" --state open | wc -l                           # 0, or only new work
```
