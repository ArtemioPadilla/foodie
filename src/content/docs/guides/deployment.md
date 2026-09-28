---
title: Deployment
description: How Foodie is built and published to GitHub Pages under /foodie/, which settings and secrets it needs, and how to check a deploy.
---

Foodie is a static site. Production is **GitHub Pages** at
`https://artemiop.com/foodie/`, published by
`.github/workflows/deploy.yml` on every push to `main`. There is no Python or
MkDocs step any more: the docs you are reading are built with the app.

## What the deploy workflow does

1. Checks out `main` and installs Node 22 with `npm ci`.
2. Runs `npm run build` with:
   - `ASTRO_BASE=/foodie` (or the `ASTRO_BASE` repository secret), so every
     link, asset and the service worker scope live under `/foodie/`;
   - `PUBLIC_REPO_SLUG`, `PUBLIC_BUILD_SHA` and `PUBLIC_VERSION` (the
     `package.json` version, shown in the feedback button's diagnostics);
   - `FOODIE_DEPLOY=1`, which makes the build fail if the mock sign-in adapter
     would be included;
   - the four `PUBLIC_FIREBASE_*` repository secrets (optional; without them
     sign-in is disabled and the site still deploys).
3. `astro build` writes about 590 pages into `dist/` (every route in three
   languages, one page per recipe and ingredient, these docs), then Pagefind
   indexes the docs and the recipe pages into `dist/_pagefind/`.
4. Uploads `dist/` as the Pages artifact and deploys it.

A failed deploy opens an issue automatically
(`deploy-failure-issue.yml`).

## Repository settings (one time)

- **Settings → Pages → Source: GitHub Actions.**
- **Settings → Secrets and variables → Actions:** `PUBLIC_FIREBASE_API_KEY`,
  `PUBLIC_FIREBASE_AUTH_DOMAIN`, `PUBLIC_FIREBASE_PROJECT_ID`,
  `PUBLIC_FIREBASE_APP_ID` if sign-in should work; optionally `ASTRO_BASE`
  and the `PUBLIC_REPO_SLUG` variable for a fork.
- In the Firebase console, add `artemiop.com` to the authorised
  domains.

## The other workflows

| Workflow | When | What |
|---|---|---|
| `ci.yml` | PRs and pushes | `npm run check`, actionlint, pinned-action scan |
| `visual.yml` | PRs and pushes | Playwright: screenshots, a11y, smoke, keyboard, mobile, search, journeys |
| `lighthouse.yml` | PRs and pushes | Lighthouse CI budgets |
| `security.yml` | PRs, pushes, weekly | CodeQL and dependency review |
| `validate-recipe-pr.yml` | PRs touching `public/data/` | Catalog schema test with a PR comment |
| `deploy.yml` | Push to `main` | Build and publish to GitHub Pages |

## Checking a deploy

After the workflow finishes, open these URLs (each should render without
console errors):

- `https://artemiop.com/foodie/` and `/foodie/es/`, `/foodie/fr/`
- `/foodie/recipes/` and a recipe such as `/foodie/recipes/rec_001/`
- `/foodie/planner/` (after one visit, it must also load offline)
- `/foodie/docs/` — try the search box
- `/foodie/sitemap-index.xml`, `/foodie/llms.txt`

Old v1 links such as `/foodie/?/recipes/rec_001` redirect to the static page;
`src/lib/legacy-redirect.ts` handles them.

## Rolling back

v1 (React 18 + Vite) is frozen at the tag `legacy-vite-1.0.0`. The cutover
runbook in the repository, `docs/runbooks/cutover.md`, describes how to
redeploy it if v2 ever has to be pulled.

## Other hosts

The same `dist/` works on any static host. Guides for Cloudflare Pages,
Netlify and Vercel are in `docs/deploy/`. Serving at the root of a domain
means building with `ASTRO_BASE=/` and changing `SITE_ORIGIN` in
`site.config.mjs` (plus the sitemap URL in `public/robots.txt`).
