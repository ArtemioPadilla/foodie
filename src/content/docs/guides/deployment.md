---
title: Deployment
description: How Foodie is built and published to Cloudflare Pages at the root of eat.cybere.co, which settings and secrets it needs, and how to check a deploy.
---

Foodie is a static site. Production is **Cloudflare Pages** at
`https://eat.cybere.co/` (the site lives at the root of the host, base `/`),
published by `.github/workflows/deploy.yml` (workflow name **Deploy**) on
every push to `main`. There is no Python or MkDocs step: the docs you are
reading are built with the app.

## What the deploy workflow does

The `cloudflare` job:

1. Checks out `main` and installs Node 22 with `npm ci`.
2. Runs `npm run build` with:
   - `ASTRO_BASE=/` and `SITE_ORIGIN=https://eat.cybere.co`, which drive the
     canonical URLs, hreflang, the sitemap, `robots.txt`, Open Graph tags and
     JSON-LD;
   - `PUBLIC_BUILD_SHA` and `PUBLIC_VERSION` (the `package.json` version,
     also written to `<html data-app-version>`);
   - `FOODIE_DEPLOY=1`, which makes the build fail if the mock sign-in adapter
     would be included and leaves the component gallery out;
   - the four `PUBLIC_FIREBASE_*` secrets (optional; without them sign-in is
     disabled and the site still deploys);
   - **no** `PUBLIC_REPO_SLUG`: the production site links no source
     repository (no GitHub links, no feedback button, no "edit this page").
3. `astro build` writes about 590 pages into `dist/` (every route in three
   languages, one page per recipe and ingredient, these docs), then Pagefind
   indexes the docs and the recipe pages into `dist/_pagefind/`.
4. When the Cloudflare secrets exist, it makes sure the Pages project
   `foodie` exists, deploys `dist/` with Wrangler
   (`pages deploy dist --project-name=foodie --branch=main`), attaches the
   custom domain `eat.cybere.co` and, with a zone id, points the `eat` CNAME at
   the project. Without the secrets it prints a notice and skips the deploy
   instead of failing.

The `pages-redirect` job then waits until `https://eat.cybere.co/` answers
with the new build and only then replaces the old GitHub Pages site with a
small redirect page, so old links and bookmarks land on the same path on the
new host.

Pull requests from this repository get a **preview** deploy on a branch alias
of the Pages project (same build, default origin) when the secrets exist.

A failed production deploy opens an issue automatically
(`deploy-failure-issue.yml`).

## Security headers

`public/_headers` ships with the build. Cloudflare Pages applies it: HSTS,
`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`,
`X-Frame-Options` and a header CSP with only `frame-ancestors 'none'` (the
hashed per-page CSP meta stays the source of truth for scripts and styles),
plus long-lived caching for `/_astro/*` and `/fonts/*` and `no-cache` for the
service worker and the manifest.

## One-time setup

- **Cloudflare API token** with *Account › Cloudflare Pages › Edit* (and,
  optionally, *Zone › DNS › Edit* on the zone that holds `eat.cybere.co`).
- **Repository secrets:** `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`,
  optionally `CLOUDFLARE_ZONE_ID` (then the workflow manages the DNS record),
  and the four `PUBLIC_FIREBASE_*` values if sign-in should work.
- **DNS** (when `CLOUDFLARE_ZONE_ID` is not set): a proxied `CNAME` from `eat`
  to the project's `*.pages.dev` host.
- **Firebase console:** add `eat.cybere.co` to the authorised domains, and
  allow the referrer `https://eat.cybere.co/*` on the Web API key.
- **Settings → Pages → Source: GitHub Actions** stays on: the old address now
  serves the redirect page.

## Opt-in repository links

`PUBLIC_REPO_SLUG=<owner>/<repo>` turns the GitHub integration back on for a
build that wants it (a fork, a test build): header and footer links, the
feedback button, "edit this page" and the prefilled recipe-submission issue.
Unset, the site names no repository and the contribute wizard keeps the JSON
download only.

## The other workflows

| Workflow | When | What |
|---|---|---|
| `ci.yml` | PRs and pushes | `npm run check`, actionlint, pinned-action scan |
| `visual.yml` | PRs and pushes | Playwright: screenshots, a11y, smoke, keyboard, mobile, search, journeys |
| `lighthouse.yml` | PRs and pushes | Lighthouse CI budgets |
| `security.yml` | PRs, pushes, weekly | CodeQL and dependency review |
| `validate-recipe-pr.yml` | PRs touching `public/data/` | Catalog schema test with a PR comment |
| `deploy.yml` | Push to `main`, PRs | Cloudflare Pages deploy (production or preview) and the old-host redirect |

## Checking a deploy

After the workflow finishes, open these URLs (each should render without
console errors):

- `https://eat.cybere.co/` and `/es/`, `/fr/`
- `/recipes/` and a recipe such as `/recipes/rec_001/`
- `/planner/` (after one visit, it must also load offline)
- `/docs/` — try the search box
- `/sitemap-index.xml`, `/robots.txt`, `/llms.txt`

Old v1 links such as `/?/recipes/rec_001` redirect to the static page;
`src/lib/legacy-redirect.ts` handles them.

## Rolling back

Every Cloudflare Pages deployment stays available: roll back from the
project's *Deployments* tab. v1 (React 18 + Vite) is frozen at the tag
`legacy-vite-1.0.0`; the cutover runbook in the repository,
`docs/runbooks/cutover.md`, describes how to redeploy it.

## Other hosts

The same `dist/` works on any static host. Guides for Netlify and Vercel are
in `docs/deploy/`. Serving under a subpath means building with
`ASTRO_BASE=/<path>`; another host means setting `SITE_ORIGIN` in the build
env (the fallback lives in `site.config.mjs`).
