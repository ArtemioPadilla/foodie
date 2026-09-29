# Deploying Foodie to Cloudflare Pages

Production is **Cloudflare Pages** at **<https://eat.cybere.co/>** — the site
lives at the root of its own host (`ASTRO_BASE=/`). The move from GitHub Pages
and its reasons (privacy, a neutral host, repository links opt-in) are recorded
in [ADR 0015](../decisions/0015-cloudflare-pages-hosting.md).

Deploys run from GitHub Actions (`.github/workflows/deploy.yml`, workflow
name **Deploy**) with Wrangler — Cloudflare's own Git integration is not used,
so the build is the same `npm ci && npm run build` that CI checks.

## What the workflow does

| Job | When | What |
|---|---|---|
| `cloudflare` | push to `main`, manual dispatch | Build with `ASTRO_BASE=/`, `SITE_ORIGIN=https://eat.cybere.co`, `FOODIE_DEPLOY=1`, `PUBLIC_BUILD_SHA`, `PUBLIC_VERSION`, the `PUBLIC_FIREBASE_*` secrets and **no** `PUBLIC_REPO_SLUG`. Then: ensure the Pages project `foodie` exists (production branch `main`), `wrangler pages deploy dist --project-name=foodie --branch=main`, attach the custom domain `eat.cybere.co`, and (with `CLOUDFLARE_ZONE_ID`) create or update a proxied `CNAME eat → <project>.pages.dev`. All idempotent. |
| `pages-redirect` | after `cloudflare` really deployed | Polls `https://eat.cybere.co/` for up to ~5 minutes until it answers 200 with `data-app-version`; only then replaces the old GitHub Pages site with the redirect built by `scripts/build-pages-redirect.mjs` (`/foodie/<path>?<q>#<h>` → `https://eat.cybere.co/<path>?<q>#<h>`, `noindex`, canonical to the new host, a kill-switch `sw.js` for the old service worker). If the check fails it skips, and the old site stays up. |
| `preview` | pull requests from this repository | Same build with the default origin, deployed to the branch alias `--branch=<sanitised head branch>` (a branch named `main` becomes `pr-<number>`). |

Without `CLOUDFLARE_API_TOKEN` or `CLOUDFLARE_ACCOUNT_ID`, every job builds,
prints a `::notice::` with these setup steps, skips the deploy steps and
**does not fail**. The old GitHub Pages site is untouched until the new host
answers.

## One-time setup (owner)

1. **API token** — Cloudflare dashboard → *My Profile → API Tokens → Create
   Token → Custom token* with:
   - *Account › Cloudflare Pages › Edit* (required)
   - *Zone › DNS › Edit*, limited to the `cybere.co` zone (optional — lets the
     workflow manage the DNS record)
2. **Repository secrets** (*Settings → Secrets and variables → Actions*):
   - `CLOUDFLARE_API_TOKEN` — the token above
   - `CLOUDFLARE_ACCOUNT_ID` — from the dashboard's account home
   - `CLOUDFLARE_ZONE_ID` (optional) — the `cybere.co` zone id
   - `PUBLIC_FIREBASE_API_KEY`, `PUBLIC_FIREBASE_AUTH_DOMAIN`,
     `PUBLIC_FIREBASE_PROJECT_ID`, `PUBLIC_FIREBASE_APP_ID` (optional; without
     them sign-in is disabled)
3. **DNS** — without `CLOUDFLARE_ZONE_ID`, add a proxied `CNAME` record
   `eat` → `<project>.pages.dev` (the job prints the exact target). The
   custom domain is attached by the workflow; Cloudflare issues the
   certificate once DNS resolves.
4. **Firebase console** (if sign-in is on):
   - *Authentication → Settings → Authorized domains*: add `eat.cybere.co`.
   - *Google Cloud console → APIs & Services → Credentials*: on the Web API
     key, allow the HTTP referrer `https://eat.cybere.co/*` (keep the old one
     until the redirect is live, then remove it).
5. **GitHub Pages** stays enabled (*Settings → Pages → Source: GitHub
   Actions*): after the first successful Cloudflare deploy it serves only the
   redirect page.

Never put a real secret into a file, a `PUBLIC_*` variable or a workflow:
only repository secrets.

## Headers

`public/_headers` is copied to `dist/` and applied by Cloudflare Pages:

- every path: `Strict-Transport-Security: max-age=31536000; includeSubDomains`,
  `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy: camera=(), microphone=(), geolocation=()`,
  `X-Frame-Options: DENY` and `Content-Security-Policy: frame-ancestors 'none'`
  — only that directive: the hashed per-page CSP `<meta>` (ADR 0012) stays the
  source of truth for scripts and styles, and browsers enforce both;
- `/_astro/*`, `/fonts/*`: `Cache-Control: public, max-age=31536000, immutable`;
- `/sw.js`, `/manifest.webmanifest`: `Cache-Control: no-cache`.

`src/tests/headers.test.ts` pins these values and checks that `_headers`
ships in `dist/` and stays out of the service worker precache.

## Privacy

The public site must not reveal the owner's name or GitHub account.
Repository links are **opt-in** through `PUBLIC_REPO_SLUG` (unset in
production), the origin comes from `SITE_ORIGIN`, and
`src/tests/privacy.test.ts` (run by `npm run test:dist`, part of
`npm run check`) scans every served file in `dist/`.

## Checking a deploy

- `https://eat.cybere.co/`, `/es/`, `/fr/`, `/recipes/rec_001/`, `/planner/`
  (offline after one visit), `/docs/` (search).
- `https://eat.cybere.co/robots.txt` and `/sitemap-index.xml` name
  `https://eat.cybere.co/`.
- `curl -sI https://eat.cybere.co/ | grep -i -E 'strict-transport|frame'`
  shows the headers above.
- The old address (`/foodie/…` on GitHub Pages) lands on the same path on the
  new host.

## Rollback

- **A bad build:** Cloudflare dashboard → *Workers & Pages → foodie →
  Deployments* → *Rollback* on the last good deployment (instant), then fix
  forward.
- **Back to GitHub Pages:** revert the hosting commit so `deploy.yml` builds
  with `ASTRO_BASE=/foodie` again (and `SITE_ORIGIN` for that host), run it,
  and remove the custom domain from the Pages project. See ADR 0015.

## Local checks

```bash
npm run build                       # default build: base '/', origin eat.cybere.co, no repo links
npm run test:dist                   # SEO, CSP, bundle, privacy and headers over dist/
node scripts/build-pages-redirect.mjs --out /tmp/redirect-site   # inspect the redirect page
```
