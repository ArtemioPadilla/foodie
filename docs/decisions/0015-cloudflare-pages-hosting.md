# 0015 — Host Foodie on Cloudflare Pages at eat.cybere.co; repository links opt-in

## Status

`Accepted`

Date: 2026-09-29

## Context

Foodie v2 shipped as a GitHub *project* page: the account's Pages custom domain
served it at `<personal domain>/foodie/`, and `<account>.github.io/foodie/`
redirected there. Everything the public site said about itself therefore named
the owner:

- the **origin** — canonical URLs, hreflang, the sitemap, `robots.txt`, Open
  Graph/Twitter tags and JSON-LD all carried the personal domain;
- the **repository** — header and footer GitHub links, the FeedbackFAB
  (`data-repo`), docs "edit this page", the contribute wizard's prefilled
  issue, the error-boundary report link, `llms.txt`, the JSON-LD
  `codeRepository`, island props (`repoUrl`) and a fallback slug compiled into
  every build even when `PUBLIC_REPO_SLUG` was unset;
- **copy and assets** — the OG image footer, docs pages (clone commands, the
  deployment guide) and a gallery demo avatar.

The owner wants the public site to stand on its own: nothing it serves may
reveal his name or GitHub account. A GitHub Pages project site cannot do that —
the host itself is the account.

Constraints: the site is static (no server), user data is local-first in
`localStorage` (ADR 0002), the per-page hashed CSP is the security baseline
(ADR 0012), and the deploy must stay a plain `npm ci && npm run build`.

## Decision

1. **Host on Cloudflare Pages at `https://eat.cybere.co/`, site at the root**
   (`ASTRO_BASE=/`). `.github/workflows/deploy.yml` (renamed **Deploy**)
   builds in GitHub Actions and deploys `dist/` with the SHA-pinned
   `cloudflare/wrangler-action` to the Pages project `foodie`; it creates the
   project, attaches the custom domain and (with a zone id) manages the DNS
   record idempotently, and skips with a notice — not a failure — when the
   Cloudflare secrets are missing. Same-repository pull requests get preview
   deploys on branch aliases. Cloudflare's Git integration was rejected so CI
   and production run the same build.
2. **The origin is build configuration.** `SITE_ORIGIN` (build env, default
   `https://eat.cybere.co`) is resolved in `site.config.mjs` and re-exported by
   `src/lib/site-meta.ts`; `robots.txt` became a generated endpoint
   (`src/pages/robots.txt.ts`) so its Sitemap URL follows origin + base.
3. **Repository links are opt-in.** `PUBLIC_REPO_SLUG` has no fallback: unset
   (the default and the production build) means no header/footer/home GitHub
   links, no FeedbackFAB or HydrationCanary, no "edit this page", no
   `codeRepository`/`SoftwareSourceCode` in JSON-LD, no repository in
   `llms.txt`, an error-boundary fallback with only *Reload*, and a contribute
   wizard that keeps the JSON download and says, in EN/ES/FR, that submissions
   by link are not open yet. Setting the slug restores the previous
   behaviour (tests and forks use a neutral placeholder, never the owner's).
4. **The site publishes itself.** JSON-LD names `Organization "Foodie"` as
   publisher; the footer credits Foodie; the OG image prints `eat.cybere.co`.
5. **A privacy gate.** `src/tests/privacy.test.ts` fails on the owner's name,
   account or personal domain in `src/content`, the text files of `public/`,
   `site-meta.ts`, and — via `npm run test:dist`, part of `npm run check` —
   every served file of `dist/`.
6. **Response headers.** `public/_headers`: HSTS, `nosniff`,
   `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options: DENY` and a
   header CSP with only `frame-ancestors 'none'` (the hashed meta CSP stays
   the source of truth; browsers enforce both), immutable caching for
   `/_astro/*` and `/fonts/*`, `no-cache` for `sw.js` and the manifest.
7. **The old address redirects, after the new one works.** The
   `pages-redirect` job waits until `eat.cybere.co` serves the new build
   (`data-app-version`), then deploys to GitHub Pages a page that sends
   `/foodie/<path>?<query>#<hash>` to the same path on the new host, plus a
   `sw.js` that retires the old service worker.

## Consequences

**Positive**

- Nothing served names a person; a test enforces it on every `npm run check`.
- Security headers the old host could not send (`frame-ancestors`, HSTS,
  `Permissions-Policy`) now apply.
- Previews per pull request; instant rollbacks from the Cloudflare dashboard.
- Canonical/sitemap/robots follow one build variable instead of three
  hand-synced strings.

**Negative**

- **User data does not carry over automatically.** `localStorage` is per
  origin, so plans, lists and the diary saved on the old address stay there.
  Mitigation: the redirect page detects Foodie data on the old origin and,
  before continuing, offers **Download my data** in the `/profile` export
  format (`foodie-user-data` v1). *Follow-up:* an import path on the new site
  (`/profile` → "Import data") that reads that file.
- The public site no longer offers one-click issue filing or recipe
  submission by link; contributors download the JSON and file it through the
  repository themselves.
- Two more secrets to manage (`CLOUDFLARE_API_TOKEN`,
  `CLOUDFLARE_ACCOUNT_ID`, optional `CLOUDFLARE_ZONE_ID`) and a new vendor.
- Firebase needs `eat.cybere.co` as an authorised domain and API-key referrer
  before sign-in works on the new host.

**Neutral**

- The repository stays where it is; README, CHANGELOG, LICENSE and ADRs are
  repository files, not served, and keep their GitHub context.
- `ASTRO_BASE` support stays (every link still goes through `withBase()`), so a
  subpath deploy remains possible.

## Rollback

- A bad build: Cloudflare dashboard → *Deployments → Rollback*.
- Back to GitHub Pages: revert the hosting change so `deploy.yml` builds with
  `ASTRO_BASE=/foodie` (and `SITE_ORIGIN` for that host) and deploys to Pages;
  that overwrites the redirect page. Remove the custom domain from the
  Cloudflare project. Data saved on `eat.cybere.co` would then stay there — the
  same per-origin caveat in reverse.

## Supersedes

None. Amends ADR 0012 § CSP (header CSP limited to `frame-ancestors`) and the
deploy notes of ADR 0001 (D12: still Node-only, no Python/MkDocs).

## References

- `site.config.mjs`, `src/lib/site-meta.ts`, `src/pages/robots.txt.ts`
- `.github/workflows/deploy.yml`, `scripts/build-pages-redirect.mjs`
- `public/_headers`, `src/tests/privacy.test.ts`, `src/tests/headers.test.ts`
- `docs/deploy/cloudflare-pages.md`, `docs/runbooks/github-actions-pending.md`
  step 20, `docs/runbooks/cutover.md` §9
- ADR 0002 (local-first user data), ADR 0012 (Firebase + CSP)
