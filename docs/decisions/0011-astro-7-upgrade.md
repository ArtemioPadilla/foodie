# 0011 — Move Foodie from Astro 5 to Astro 7 before the cutover

## Status

`Proposed`. It is accepted when the cutover PR (roadmap Issue 030) merges
with maintainer review.

Date: 2026-09-28

> This is a Foodie-series ADR. It takes the next number that is free in this
> folder (see the numbering note in
> [ADR 0001](./0001-foodie-inceptor-migration.md)).

## Context

Issue 030's pre-merge checklist requires `npm audit --omit=dev` to report no
high advisories. On Astro 5.18.2 the command reported four:

- **critical**: `astro <= 7.2.7`. The advisories include XSS in `define:vars`,
  spread attributes, `transition:*` values and slot names, RCE through AVIF
  image optimization, and a base-path check bypass.
- **high**: `sharp <= 0.35.4-rc.0`, from the libvips and libheif CVEs.
- **low**: `esbuild` and `@astrojs/mdx`, through `astro`.

No 5.x or 6.x release is patched. The only fix npm offered was the Astro 7
major. Inceptor's [ADR 0004](./0004-custom-docs-route.md) had kept the
template on Astro 5 because `@vite-pwa/astro` caps its `astro` peer at `^5`.
Version 1.2.0 is still the latest, and its cap has not moved.

## Decision

Upgrade in place:

| Package                  | Before  | After  |
| ------------------------ | ------- | ------ |
| `astro`                  | ^5.18.2 | ^7.3.5 |
| `@astrojs/react`         | ^5.0.7  | ^7.0.0 |
| `@astrojs/mdx`           | ^4.3.14 | ^8.0.2 |
| `@astrojs/sitemap` (dev) | ^3.7.3  | ^3.7.4 |
| Vite (transitive)        | 6 / 7   | 8      |
| `sharp` (transitive)     | 0.34.5  | 0.35.5 |

The `@vite-pwa/astro` peer cap is bridged with an npm `overrides` entry in
`package.json`: `{"@vite-pwa/astro": {"astro": "$astro"}}`. The plugin itself
only wires `vite-plugin-pwa` (which already supports Vite 8) into Astro's
build hooks, and it works unchanged on Astro 7:

- `dist/sw.js` and `dist/manifest.webmanifest` are generated.
- The offline e2e journey (Issue 028) passes with base `/` and with
  `ASTRO_BASE=/foodie`.

No source change was needed. `astro check`, `tsc`, the 2,060 Vitest tests,
the SEO checks and the build all stay green. All 54 e2e journeys pass, and so
do all the visual and a11y baselines.

Alternatives we rejected:

- **Explicit risk acceptance on Astro 5.** Most of the advisories need SSR,
  server islands or the runtime image service, and Foodie is fully static. But
  the XSS fixes in the static renderer (`define:vars`, spread attributes,
  slot names) do apply at build time, and accepting a critical advisory at the
  moment the site goes public is the wrong default.
- **Dropping `@vite-pwa/astro`.** This would break offline use (Issue 028,
  D6), which is a core Foodie promise.

## Consequences

**Positive**

- `npm audit --omit=dev` prints `found 0 vulnerabilities`. The full tree
  also drops from 21 to 16 advisories, all of them dev-only.
- Foodie is on a supported Astro major for the rest of the roadmap.

**Negative**

- The `overrides` entry hides a peer range the PWA plugin has not declared.
  Every Astro upgrade must re-check the PWA: `npm run build` writes `sw.js`,
  and the offline e2e journey passes. Drop the override once
  `@vite-pwa/astro` supports Astro 7 officially.
- Foodie now differs from the Inceptor template, which is still on 5.x
  (`scripts/init.mjs` and the inherited `src/content/docs/` pages still say
  Astro 5).
- When Astro 7's `astro preview` detects an AI agent, it moves itself to the
  background. A Playwright `webServer` started by an agent then fails with
  "exited early". CI and humans are not affected. The workaround, which is to
  start the preview first and let Playwright reuse it, is in `CLAUDE.md`.

**Neutral**

- Dependabot still ignores `astro` and `@astrojs/*` majors, so each one gets
  a deliberate upgrade PR like this one.

## Supersedes

None. It narrows Inceptor's [ADR 0004](./0004-custom-docs-route.md) for
Foodie: the PWA peer cap no longer pins the Astro version.
