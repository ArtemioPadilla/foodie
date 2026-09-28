# 0012 — Keep Firebase Auth behind an `AuthProvider` contract, loaded lazily

## Status

`Accepted`

Date: 2026-09-28

> Foodie-series ADR. The roadmap (Issue 035, D9) calls this "ADR 0004"; that
> number is taken by Inceptor's inherited
> [ADR 0004](./0004-custom-docs-route.md), so it takes the next free number
> (see the numbering note in [ADR 0001](./0001-foodie-inceptor-migration.md)).
> It is the Stakeholder Analysis required by the `risk:high` tier
> (`.claude/checklists/ethics.json`, tier 2: items 1, 2, 6, 7, 8) for
> Issue 035 and covers the auth surfaces of Issue 036 (`AuthDialog`,
> `AccountMenu`, `/profile`).

## Context

The legacy SPA (`main`) signs users in with Firebase Auth — email/password,
Google and GitHub — through `src/services/firebaseService.ts`, which:

- **hardcoded the Firebase web config** (API key, sender id, measurement id)
  in the bundle and in git history;
- imported `firebase/app` + `firebase/auth` **statically**, so every visitor
  downloaded the SDK (~100 KB gzip) on every page, signed in or not;
- requested GitHub's `public_repo` scope and stored the **OAuth access
  token in `localStorage`** (`github-access-token`) so the contribute flow
  could open PRs — a credential readable by any script on the origin;
- shipped `VITE_GITHUB_CLIENT_SECRET` wiring for that flow.

Foodie never enabled Firestore or Storage (ADR 0002): Firebase is used only
to establish identity. Signing in unlocks per-user preference/favourite
namespaces (Issue 037) and `/profile`; every other feature works anonymously.

The rebuilt site is multi-page Astro with one island per page (D4), so the
session must be shared across islands with nanostores (no cross-island
Context), and the template's single gating module (`src/lib/route-guard.tsx`)
must receive a `GuardUser` adapted once at the boundary.

## Decision

1. **Contract.** `src/lib/auth/contracts.ts` defines `AuthProvider`
   `{ signInEmail, signUpEmail, signInGoogle, signInGitHub, signOut,
   resetPassword, onSession(cb) }` and a single `AuthError` with a normalised
   code. The user object crossing the boundary is the Zod `AuthUserSchema`
   (`src/schemas/auth.ts`): `uid, email, displayName, photoURL,
   emailVerified, method, createdAt` — nothing else (no ID/refresh/OAuth
   tokens). Sign-in failures collapse to `invalid-credentials` (no account
   enumeration).
2. **Adapters.** `src/lib/auth/firebase.ts` (production) and
   `src/lib/auth/mock.ts` (tests, dev without credentials, the e2e build).
   Supabase — the TradePilot path, `docs/recipes/auth-supabase.md` — stays a
   documented alternative: it would be one more adapter against the same
   contract.
3. **Providers kept:** email/password, Google, GitHub (basic profile only —
   the `public_repo` scope and the stored GitHub token are dropped; recipe
   contributions become a prefilled issue, D10).
4. **Configuration from env, not code.** `PUBLIC_FIREBASE_API_KEY`,
   `_AUTH_DOMAIN`, `_PROJECT_ID`, `_APP_ID` (`.env.example`), injected by
   `.github/workflows/deploy.yml` from repository secrets. If any is missing
   `authEnabled` is `false`: production builds disable auth (the UI hides
   it), dev/test fall back to the mock. `PUBLIC_AUTH_MOCK=1` forces the mock
   (set by `playwright.e2e.config.ts`). A source test
   (`src/lib/auth/bundle-boundary.test.ts`) fails if a Firebase key literal
   reappears in `src/`. The web API key is an identifier rather than a secret;
   the owner should still **restrict it to the deployed origins** in Google
   Cloud console and **rotate the key that was committed on `main`**.
5. **Lazy SDK.** Only `firebase/app` + `firebase/auth` are ever imported, and
   only through dynamic `import()` inside `firebase.ts`, itself reached only
   through the dynamic `loadAuthProvider()` in `src/lib/auth/index.ts`. The
   stores (`src/stores/user.ts`: `$user`, `$authReady`, `toGuardUser()`) load
   an adapter when (a) the auth dialog opens (`preloadAuth()`), (b) an action
   runs, or (c) on first subscription **only if** a session hint
   (`foodie:auth-session` = `"1"`) says this browser was signed in. Anonymous
   visitors therefore never download the SDK; `$authReady` flips to `true`
   immediately for them. Guarded on every build by
   `src/tests/auth-chunk.test.ts` (`npm run test:dist`, part of
   `npm run check`): no page's initial JS — scripts, modulepreloads, island
   component/renderer URLs and their static imports — may reach a Firebase
   chunk. Verified with a throwaway `client:load` consumer on the landing
   page and Firebase env set: `firebase/app` (~30 KB) and `firebase/auth`
   (~127 KB) were emitted as separate chunks reachable only through
   `import()`; a deliberate static `import 'firebase/auth'` made the test
   fail (negative control).
6. **Gating.** `toGuardUser()` (`src/lib/auth/guard-user.ts`) maps an
   `AuthUser` to `{ id: uid, roles: ['user'], flags: { verified } }`.
   `/profile` gates with `allow={['user']}`; deny by default.

### CSP — enforced via Astro `security.csp`

Every built page carries a `<meta http-equiv="content-security-policy">` in
`BaseLayout.astro`'s `<head>`, produced by Astro 7's built-in `security.csp`
(`astro.config.mjs`), with the policy defined in `csp.config.mjs`:

| Directive | Sources | Why |
|---|---|---|
| `default-src` | `'self'` | Everything else stays same-origin |
| `script-src` | `'self'` `https://apis.google.com` `https://accounts.google.com` + SHA-256 hashes | Firebase's Google popup loader; hashes cover every inline script (below) |
| `style-src` | `'self'` + SHA-256 hashes | Bundled CSS; Astro's inlined `<style>`; Base UI's scrollbar sheet and zag-js's splitter drag cursor (fixed texts, hashed in `csp.config.mjs`) |
| `style-src-attr` | `'unsafe-inline'` | `style="…"` attributes from React SSR, Astro and Shiki (attributes only, never `<style>` elements) |
| `connect-src` | `'self'` `https://*.googleapis.com` `https://api.github.com` | Firebase Auth REST (identitytoolkit, securetoken, www.googleapis.com); GitHub REST (FeedbackFAB duplicate search, API demos) |
| `frame-src` | `'self'` `https://foodie-cc553.firebaseapp.com` `https://accounts.google.com` | `signInWithPopup`'s auth-handler iframe and the Google account chooser |
| `img-src` | `'self'` `data:` `blob:` `lh3.googleusercontent.com` `avatars.githubusercontent.com` `img.shields.io` | Provider profile photos, README badges |
| `font-src` | `'self'` `data:` | Self-hosted woff2 in `public/fonts/` (no third-party font host) |
| `worker-src` / `manifest-src` / `form-action` / `base-uri` | `'self'` | PWA service worker + manifest; no cross-origin form posts or `<base>` hijack |
| `object-src` | `'none'` | No plugins |

- **Inline scripts.** Astro hashes the scripts it renders (island
  bootstraps, inlined module scripts, client directives). It does **not**
  hash `is:inline` scripts — BaseLayout's zero-flash theme script, the
  first-visit locale redirect (`define:vars`) and FeedbackFAB's diagnostics
  capture. The `cspInlineScriptHashes()` integration (`csp.config.mjs`,
  registered before `AstroPWA`) hashes every executable inline script left
  in each built page, adds it to that page's `script-src`, and moves the meta
  right after `<meta charset>`, ahead of every script and stylesheet (Astro
  emits it just before `</head>`, where it would not govern what precedes
  it). There is no `'unsafe-inline'` for scripts.
- **No `eval`.** The Pagefind loaders (`GlobalSearch.tsx`, `DocsSearch.astro`)
  and the Sentry skeleton used `new Function('return import(u)')` to hide a
  dynamic import from Vite; they now use `import(/* @vite-ignore */ url)`.
  Only the template's gallery pages that mount the live `Playground` (it
  compiles user-typed code with `new Function`) add `'unsafe-eval'`, per page,
  through `Astro.csp.insertScriptResource()`. Zod v4 probes
  `new Function('')` once to decide whether to JIT; under the CSP the probe
  is refused (a `securitypolicyviolation` event, no console error) and Zod
  falls back to its interpreter — behaviour is unchanged.
- **Self-hosted fonts.** Fraunces, Hanken Grotesk and JetBrains Mono ship as
  variable `woff2` files in `public/fonts/` (latin + latin-ext subsets, OFL —
  `public/fonts/LICENSE.md`), declared with `@font-face` (`font-display:
  swap`, `unicode-range`) at the top of `src/styles/global.css`;
  `BaseLayout.astro` preloads the latin Hanken Grotesk face through
  `withBase()`. No request leaves the origin for typography, so the policy
  lists no `fonts.googleapis.com` / `fonts.gstatic.com` and the service
  worker precaches the fonts with the rest of the build (hardening pass
  after Phase 5).
- **Auth domain.** `foodie-cc553.firebaseapp.com` is the default; when
  `PUBLIC_FIREBASE_AUTH_DOMAIN` is set at build time (deploy secrets, a fork's
  own project) that domain replaces it. Flag-gated analytics
  (`PUBLIC_FLAG_ANALYTICS`) and Sentry (`PUBLIC_FLAG_SENTRY` +
  `PUBLIC_SENTRY_DSN`) add their origins only when enabled.
- **Guarded.** `src/tests/csp.test.ts` (`npm run test:dist`, part of
  `npm run check`) checks every page in `dist/`: one CSP meta, placed before
  any script/stylesheet, the Firebase origins present, no `'unsafe-inline'`
  for scripts, `'unsafe-eval'` only on Playground pages, and every inline
  script and `<style>` covered by a hash. The visual, a11y, smoke and e2e
  Playwright suites run against the CSP build (the smoke suite fails on a
  "Refused to …" console error).
- **Limits.** Dev (`astro dev`) serves no CSP. A meta policy cannot express
  `frame-ancestors`, `report-uri` or `sandbox`; if the site moves to a host
  that sets response headers, send the same policy as a header. The real
  Google/GitHub popup flow cannot run in CI (no credentials); Issue 036 must
  exercise it against a Pages preview with the `PUBLIC_FIREBASE_*` secrets
  set before merging (roadmap risk table).

## Stakeholder analysis

| Stakeholder | Interest | Effect of this decision |
|---|---|---|
| Anonymous visitor (the default user) | Use every feature without an account; fast pages | Unchanged features; the Firebase SDK is no longer downloaded for them, and no auth request leaves the device until they open the dialog |
| Signed-in user | Keep preferences/favourites per account; control over identity data | Same providers as before; fewer permissions (no GitHub repo scope), no OAuth token stored in the browser |
| Shared-device users (family computer, library) | Not see each other's data | Per-uid namespaces (Issue 037) + explicit sign-out; anonymous data stays device-local as before (ADR 0002) |
| Children / non-native readers / low-vision users (item 7) | Understandable, accessible sign-in | Sign-in is never required; the dialog (Issue 036) uses the kit's accessible `Dialog`/`Tabs`, translated errors, and no dark patterns (no forced account wall, no pre-checked consent) |
| Maintainer | No secrets in the repo; cheap to switch provider | Config from CI secrets; contract isolates Firebase; mock enables credential-free CI |
| Forks / template reusers | Not accidentally use Foodie's Firebase project | No config in source; missing env disables auth cleanly |
| Google (Firebase) / GitHub | Identity providers | Receive only what their own sign-in flow requires (below) |

## What leaves the device

Only when the user **chooses** to sign in, and only to the identity provider:

- **Email/password:** email, password (TLS, to `identitytoolkit.googleapis.com`),
  display name on sign-up. Password reset sends the email address.
- **Google / GitHub:** the provider's OAuth consent flow in a popup; Firebase
  receives the basic profile (uid, email, name, avatar URL).
- **Session refresh:** Firebase periodically exchanges its refresh token with
  `securetoken.googleapis.com` while a session exists.

Stored on the device: Firebase's own session (IndexedDB
`firebaseLocalStorageDb`), the session hint `foodie:auth-session` (`"1"`, no
identity), and — in mock mode only — `foodie:mock-auth` (fake accounts, never
sent anywhere). **Nothing else is sent:** meal plans, diary, pantry,
preferences and favourites stay in `localStorage` (ADR 0002); there is no
Firestore, no analytics from Firebase (Analytics/`measurementId` dropped), no
tracking of anonymous visitors.

## Ethics checklist (tier 2)

1. **Intent declared** — Sign-in exists to let a user keep their own
   preferences per account on a device they share; it serves the user, not
   growth metrics. No feature is gated behind an account except `/profile`.
2. **No deception, no coercion** — Anonymous use stays the default path and
   the stores never open the dialog by themselves; Issue 036's UI must keep
   "Continue as guest", add no sign-up nags or auto-reopening dialogs, and
   make sign-out one click.
6. **Surveillance overt and supportive** — No telemetry is added. The only
   network calls are the provider calls the user initiates (listed above).
7. **Vulnerable groups** — Account creation is optional; error messages are
   non-enumerating and normalised to `auth.errors.<code>` so Issue 036 can
   translate them; a blocked popup surfaces as `popup-blocked` (a clear
   message) instead of a silent failure.
8. **Unintended-but-predictable outcomes** — (a) *Leaked key abuse*: key is
   origin-restricted and rotated; Firebase quotas cap abuse. (b) *Account
   enumeration*: collapsed error codes, reset succeeds for any address.
   (c) *Mock shipped to production*: `PUBLIC_AUTH_MOCK` is only set by the e2e
   config, and `astro.config.mjs` refuses to build when it is set together
   with `FOODIE_DEPLOY=1` (set by the deploy workflow) or with a complete
   `PUBLIC_FIREBASE_*` config, so the mock's plaintext demo passwords in
   `foodie:mock-auth` cannot reach real users.
   (d) *Provider outage / SDK blocked*: `$authReady` still settles to
   anonymous, and every feature keeps working.

## Consequences

**Positive** — No credentials in source; ~100 KB less JS for anonymous
visitors; provider swap is one adapter; credential-free CI through the mock;
smaller GitHub permission footprint.

**Negative** — A returning signed-in user pays the SDK download on first
page load (the hint path); a hand-written `is:inline` script or a new
library-injected `<style>` needs a hash (the dist test and smoke suite say
which); the
four `PUBLIC_FIREBASE_*` repository secrets must be created before the first
deploy that needs auth, otherwise auth is silently disabled.

**Neutral** — Firebase remains the provider (D9); the existing Firebase
project and its users are untouched.

## Supersedes

None.

## References

- Roadmap D9, D10, D14 and Issues 035–037
  (`docs/superpowers/specs/2026-09-27-foodie-inceptor-migration-roadmap.md`)
- [ADR 0002](./0002-local-first-user-data.md) — local-first user data
- `docs/recipes/auth-supabase.md` — the template recipe this follows
- Astro `security.csp` — https://docs.astro.build/en/reference/configuration-reference/#securitycsp
