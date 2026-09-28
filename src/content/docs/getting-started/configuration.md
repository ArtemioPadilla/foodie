---
title: Configuration
description: Environment variables, the deploy base path, feature flags, Firebase sign-in and the security policy.
---

Foodie is a static site: all configuration happens at **build time**, through
environment variables and a few config files. Copy `.env.example` to `.env`
for local work; CI sets the same variables in the workflow.

> Every variable that starts with `PUBLIC_` is inlined into the JavaScript the
> browser downloads. Never put a secret in one. Foodie needs no secret at all.

## Build and deploy

| Variable | Default | Purpose |
|---|---|---|
| `ASTRO_BASE` | `/` | Subpath the site is served under. The GitHub Pages build uses `/foodie`. Every link and asset goes through `withBase()` so the same code works at `/` and at `/foodie/`. |
| `FOODIE_DEPLOY` | unset | Set to `1` by `deploy.yml`. The build then refuses to include the mock sign-in adapter. |
| `PUBLIC_CHANNEL` | `development` | `production`, `preview` or `development`; exposed as `flags.channel`. |
| `PUBLIC_BUILD_SHA`, `PUBLIC_VERSION` | unset | Shown in the feedback button's diagnostics. CI fills them. |
| `PUBLIC_REPO_SLUG` | `ArtemioPadilla/foodie` | The repository where feedback issues and recipe submissions are opened. A name, not a credential. |

The production origin (`https://artemiopadilla.github.io`) lives in
`site.config.mjs`; the site name, description and license shown to search
engines and to agents (`/llms.txt`) live in `src/lib/site-meta.ts`.

## Sign-in (optional)

Foodie keeps Firebase Authentication behind an `AuthProvider` contract
(`src/lib/auth/`, ADR 0012). The SDK is downloaded only when someone opens the
sign-in dialog or the profile page.

| Variable | Purpose |
|---|---|
| `PUBLIC_FIREBASE_API_KEY` | Web API key of the Firebase project |
| `PUBLIC_FIREBASE_AUTH_DOMAIN` | e.g. `<project>.firebaseapp.com` |
| `PUBLIC_FIREBASE_PROJECT_ID` | Project id |
| `PUBLIC_FIREBASE_APP_ID` | Web app id |
| `PUBLIC_AUTH_MOCK` | `1` forces the in-memory mock adapter (used by the e2e build) |

- **All four Firebase variables set:** email/password, Google and GitHub
  sign-in are enabled. Enable those providers in the Firebase console and add
  the deployed origin to the authorised domains. Restrict the API key to the
  site's origins in Google Cloud.
- **Any of them missing:** the build still succeeds and sign-in is disabled,
  except in `npm run dev` and tests, which fall back to the mock
  (`demo@foodie.test` / `foodie-demo`).
- `PUBLIC_AUTH_MOCK` together with `FOODIE_DEPLOY=1` or a complete Firebase
  configuration fails the build, so the mock can never ship.

The Firebase values identify the project but are not secrets. CI still reads
them from repository secrets so that forks do not sign in to Foodie's project.
Foodie does not use Firestore: signing in only keys preferences and favourites
to the account, in `localStorage`.

## Feature flags

Flags are `PUBLIC_FLAG_<NAME>` variables with defaults in `src/lib/flags.ts`.
They accept `true/false`, `1/0`, `on/off` and `yes/no`.

| Flag | Default | Controls |
|---|---|---|
| `PUBLIC_FLAG_FEEDBACK_FAB` | on | The floating "report an issue" button |
| `PUBLIC_FLAG_DOCS_SEARCH` | on | The Pagefind search box in these docs |
| `PUBLIC_FLAG_PWA_PROMPTS` | on | Install and update prompts |
| `PUBLIC_FLAG_PRIVACY_TOAST` | on | The first-visit privacy notice |
| `PUBLIC_FLAG_BLOG` | on | The template blog (to be trimmed, roadmap Issue 046) |
| `PUBLIC_FLAG_EXPERIMENTAL_GALLERY` | off | Experimental entries of the component gallery |
| `PUBLIC_FLAG_ANALYTICS` | off | Privacy-friendly analytics script (`PUBLIC_ANALYTICS_*`) |
| `PUBLIC_FLAG_SENTRY` | off | Error reporting (`PUBLIC_SENTRY_DSN`, needs `@sentry/browser`) |

## Content Security Policy

Every page carries a `<meta http-equiv="content-security-policy">` generated
by Astro from `csp.config.mjs` (ADR 0012). Scripts and styles are allowed by
SHA-256 hash, not by `'unsafe-inline'`, and `connect-src` lists only the
origins Foodie talks to (itself, the Firebase auth endpoints when configured,
and flag-gated analytics). Two consequences for contributors:

- A library that injects a `<style>` at runtime or evaluates code is refused.
  Add the style text to `RUNTIME_STYLE_TEXTS` in `csp.config.mjs` so it is
  hashed; do not loosen the policy.
- Zod runs "jitless" in the browser (the inline theme script in `BaseLayout`
  sets the global Zod config), so schema parsing never needs `eval`.

`tests/e2e/csp.spec.ts` visits every kind of page and fails on any refusal.

## Fonts

Fraunces, Hanken Grotesk and JetBrains Mono are self-hosted in `public/fonts/`
and declared in `src/styles/global.css`. No request goes to a font CDN, which
keeps the CSP short and screenshot baselines stable.

## Optional backend

`PUBLIC_API_BASE`, `PUBLIC_CONTACT_ENDPOINT` and `PUBLIC_NEWSLETTER_ENDPOINT`
come from the template's optional self-hosted backend (ADR 0006). Foodie does
not use one today; leave them empty.
