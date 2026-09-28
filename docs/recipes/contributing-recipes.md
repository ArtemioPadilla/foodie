# Contributing recipes — submission without secrets

> **Foodie**, roadmap Issue 039 · decision **D10** ([ADR 0001](../decisions/0001-foodie-inceptor-migration.md)).
> Companion to [catalog-data.md](./catalog-data.md) (how a recipe JSON is
> validated and merged).

Foodie v1 opened pull requests from the browser with `@octokit/rest` and a
GitHub OAuth token kept in `localStorage` (`VITE_GITHUB_CLIENT_*` in the
bundle). That flow was broken and needed a secret on the client, so v2 drops it
entirely: **the site never holds a GitHub credential**. The contributor files a
prefilled GitHub issue with their own account; a maintainer turns it into a PR.

## The flow

```
contributor ──► /contribute wizard ──► recipe-<id>.json (download)
                     │
                     └─► github.com/<repo>/issues/new?template=recipe-submission.yml&…
                                   │  (contributor signs in on GitHub, checks the boxes, "Create")
                                   ▼
                        issue labelled recipe-submission
                                   │  maintainer: copy JSON → public/data/recipes.json
                                   ▼
                        PR ──► validate-recipe-pr.yml (Zod catalog test + comment)
                                   │  review & merge to main
                                   ▼
                        deploy.yml ──► recipe live on the next deploy
```

1. **Wizard** (`/contribute/`, `/es/contribute/`, `/fr/contribute/`, island
   `ContributeWizard`, Issue 038). Seven steps validated with
   `RecipeSubmissionSchema`; the preview renders the same components as
   `/recipes/[id]/`. The draft lives in `localStorage['foodie:contribute-draft']`.
2. **Submit** (step 7, `ContributeWizard/SubmitStep.tsx`). One click:
   - opens the issue form in a new tab — URL built by
     `src/lib/domain/recipe-submission-issue.ts` on top of
     `buildIssueUrl()` from `src/lib/report-issue.ts`
     (`issues/new?template=recipe-submission.yml&title=…&recipe-name=…&meal-type=…&cuisine=…&recipe-json=…&notes=…`);
   - downloads `recipe-<id>.json` (`src/lib/download.ts`; a separate
     _Download JSON_ button uses the kit's `DownloadTrigger`);
   - clears the saved draft and shows a link to reopen the issue (in case the
     browser blocked the new tab).
3. **Issue form** (`.github/ISSUE_TEMPLATE/recipe-submission.yml`). The query
   parameters prefill the fields by `id` — `recipe-name`, `meal-type`,
   `cuisine`, `recipe-json` (rendered as a JSON code block) and `notes` (a
   summary: id, servings, times, counts and which ES/FR texts are missing). The
   checklist (license, three languages, ingredient ids, nutrition) cannot be
   prefilled: the contributor ticks it. The form adds the `recipe-submission`
   and `type:feat` labels. A unit test keeps the field ids in sync with the YAML.
4. **Maintainer.** Copies the JSON into `public/data/recipes.json`, renames the
   wizard id (`<slug>-<base36 time>`) to the next free catalog id (`rec_051`, …),
   fills in the missing ES/FR texts, then opens a PR that closes the issue.
   Steps and local checks: [catalog-data.md § Adding a recipe](./catalog-data.md#adding-a-recipe-json--pr--validate-recipe-pryml).
5. **PR check.** `.github/workflows/validate-recipe-pr.yml` runs
   `src/tests/catalog-schema.test.ts` (schemas, unique ids, trilingual text,
   ingredient references) and comments the result.
6. **Deploy.** Merging to `main` runs `deploy.yml`; the recipe gets its static
   page (`getStaticPaths`) ×3 languages.

## The 8 KB limit

GitHub rejects or truncates very long request lines, so
`ISSUE_URL_MAX_LENGTH` in `report-issue.ts` caps the prefilled URL at 8 KB
(8 192 characters, after encoding). A typical recipe JSON fits comfortably;
long ones (many steps, long instructions) do not. In that case:

- the `recipe-json` field is prefilled with an instruction to **attach the
  downloaded `recipe-<id>.json`** (drag the file into the field — GitHub
  uploads it as an attachment), and the `notes` summary says the file must be
  attached;
- the Submit step shows a "Attach the downloaded file" alert **before** the
  contributor clicks, and `data-json-in-url="false"` on the step.

## Privacy and security

- No token, OAuth app or GitHub API call from the browser; nothing is sent by
  Foodie — the contributor reviews the issue on github.com before creating it.
- `.env.example` has no GitHub credentials (`PUBLIC_REPO_SLUG` only names the
  repository the issue opens on; it is not a secret).
- The v1 key `github-access-token` is **deleted on every page load** by
  `purgeRetiredKeys()` (`src/lib/retired-keys.ts`, called from
  `BaseLayout.astro`) and never read — ADR 0002 §3.
- The recipe JSON contains only what the contributor typed (plus
  `author: "Community Contributor"`); no account data is attached.

## Future: automatic PRs through a backend

Decision D14 defers automatic PRs. When a backend exists, Inceptor's
`server-node` archetype ([ADR 0006](../decisions/0006-self-hosted-backend-archetypes.md))
already exposes `POST /api/feedback`, which files GitHub issues with a
**server-side** `GITHUB_TOKEN` (never a `PUBLIC_` variable). The path is:

1. Deploy `server-node` with `GITHUB_TOKEN` scoped to this repository and set
   `PUBLIC_API_BASE` at build time.
2. Teach `SubmitStep` to `POST` the payload (validated server-side with the same
   `RecipeSubmissionSchema`/`RecipeSchema` from `src/schemas/`) when
   `PUBLIC_API_BASE` is set, keeping today's prefilled issue as the fallback.
3. Optionally extend the endpoint to open the PR itself (branch + commit to
   `public/data/recipes.json`), still gated by `validate-recipe-pr.yml` and a
   maintainer review.

Until then the static site keeps working with zero secrets.
