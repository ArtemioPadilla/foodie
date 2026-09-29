# Security policy

Foodie is a static site (Astro + React islands on Cloudflare Pages, ADR 0015)
with local-first user data. There is no Foodie backend and no server-side
secret. Only the `main` branch (what <https://eat.cybere.co/> serves) is
supported. The `legacy-vite-1.0.0` tag (the v1 SPA) gets no fixes.

## Reporting a vulnerability

Please do not file public issues for sensitive findings. Use GitHub's private
advisory flow:
[report a vulnerability](https://github.com/ArtemioPadilla/foodie/security/advisories/new).

We aim to acknowledge a report within about 72 hours and to fix a confirmed
issue within 14 days, depending on severity. Researchers who act in good faith
under this policy are welcome, and with their consent we credit them in the
advisory.

## Scope

In scope:

- The deployed site and this repository's code: XSS or HTML injection (recipe
  and ingredient text, shared-plan URLs, imported JSON), CSP bypasses,
  prototype pollution, unsafe handling of `localStorage` or IndexedDB data.
- The sign-in flow (Firebase Auth adapter, `AuthDialog`, `/profile/`):
  account enumeration, session handling, anything that exposes another
  user's data.
- Leaks through the build: a secret that reaches the bundle, a workflow that
  exposes repository secrets, or a prompt-injection path in the sub-agent
  flow (`.claude/agents/`) that could push to `main` or read secrets.
- Dependency CVEs that Foodie's use makes exploitable.

Out of scope (open a regular issue):

- Findings in upstream dependencies that Foodie does not expose. Report them
  to the dependency.
- Response headers beyond those in `public/_headers` (HSTS, `nosniff`,
  `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options: DENY` and a
  header CSP limited to `frame-ancestors 'none'`; see ADR 0012 and ADR 0015).
- Tooling preferences and forbidden-import scan misses.

## Secrets policy

- **Only `PUBLIC_*` variables reach the browser.** Astro inlines them into the
  bundle, so a `PUBLIC_*` value is public by definition. Never put a secret in
  one. `.env.example` lists every variable the site reads.
- **Foodie holds no secret in the client.** Recipe contributions download a
  JSON file and, only in builds that set `PUBLIC_REPO_SLUG`, open a prefilled
  GitHub issue (roadmap D10; the production build sets none, ADR 0015). There
  is no GitHub token or OAuth client secret in the app, and the v1
  `github-access-token` `localStorage` key is purged on load.
- **Deploy credentials.** `CLOUDFLARE_API_TOKEN` (scopes: *Account ›
  Cloudflare Pages › Edit*, optionally *Zone › DNS › Edit* on `cybere.co`),
  `CLOUDFLARE_ACCOUNT_ID` and the optional `CLOUDFLARE_ZONE_ID` live only in
  repository secrets. The deploy workflow passes them to shell steps through
  `env`, never inline, and pull requests from forks get no deploy job.
- **Privacy of the public site.** The served site names no person and no
  GitHub account (`src/tests/privacy.test.ts` scans every built file);
  repository links are opt-in through `PUBLIC_REPO_SLUG`.
- **Firebase web config** (`PUBLIC_FIREBASE_API_KEY`, `_AUTH_DOMAIN`,
  `_PROJECT_ID`, `_APP_ID`, ADR 0012) identifies the Firebase project; it is not
  a secret. The deploy workflow injects it from repository secrets so forks do
  not sign in to Foodie's project. The owner restricts the API key to the
  deployed origins (HTTP referrers, `https://eat.cybere.co/*`) in the Google
  Cloud console and rotates any
  key that was ever committed. `src/lib/auth/bundle-boundary.test.ts` fails if
  a Firebase key literal appears in `src/`. The GitHub OAuth app's client secret
  lives only in the Firebase console.
- **The mock auth adapter** (`PUBLIC_AUTH_MOCK`, dev and e2e only) keeps demo
  passwords in `localStorage`. `astro.config.mjs` refuses to build with it when
  `FOODIE_DEPLOY=1` (the production deploy) or when a Firebase config is set.
- **Content-Security-Policy.** Every page ships a hashed CSP meta tag with no
  `'unsafe-inline'` scripts or styles and no `'unsafe-eval'` (the dev-only
  component gallery's live playground is the one exception, and the gallery
  is not built for production). `tests/e2e/csp.spec.ts` gates it.

## Dependency hygiene

- `npm audit` (dev dependencies included) must report no high or critical
  advisories. `.github/workflows/security.yml` runs it on every push and pull
  request to `main` and weekly, together with CodeQL and dependency review.
- Dependabot (`.github/dependabot.yml`) opens grouped weekly updates. The
  majors it skips are listed there, each with its reason.
- Vulnerable transitive dependencies of dev tooling are pinned to patched
  releases through `overrides` in `package.json` (roadmap Issue 047). All of
  them sit under `@lhci/cli` (Lighthouse CI, used only by `npm run lighthouse`
  and `npm run perf`), and none reaches the site bundle:

  | Override | Advisory it resolves | Why it is safe |
  |---|---|---|
  | `tmp` ^0.2.7 | GHSA-52f5-9888-hmc6, GHSA-ph9p-34f9-6g65 (high) | Same API (`dirSync`, `fileSync`, `tmpNameSync`) that `@lhci/cli` and `external-editor` call |
  | `@puppeteer/browsers` ^3.2.3 | `extract-zip` ≤ 2.0.1: GHSA-jmr9-qjv8-65gv, GHSA-7pqw-9j4j-h8q3 (high, no patched `extract-zip`) | 3.x replaces `extract-zip` with `modern-tar`. Lighthouse drives an already-installed Chrome, so the browser-download code path does not run |
  | `qs` ^6.16.0 | GHSA-x5fp-wj9c-mxmx, GHSA-4mjr-xmp4-gh2g (moderate) | Patch release within 6.x, used by the local `lhci` server's `express` |
  | `uuid` ^11.1.1 | GHSA-w5hq-g745-h8pq (moderate) | `@lhci/cli` only calls `v4()` |

  Remove an override once `@lhci/cli` ships with the fixed version.
