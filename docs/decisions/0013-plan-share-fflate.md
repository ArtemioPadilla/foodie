# 0013 — Share meal plans in the URL fragment, compressed with `fflate`

## Status

`Accepted`

Date: 2026-09-28

> **Numbering.** The roadmap (Issue 040, decision D11) calls this "ADR 0005"
> of the _Foodie_ series. `0005` is taken in this folder by Inceptor's
> inherited `0005-base-ui-component-library.md`, so this file takes the next
> free number, **0013** (see the numbering note in
> [ADR 0001](./0001-foodie-inceptor-migration.md)). Read "ADR 0005" in the
> roadmap as this file.

## Context

PR #28 (`origin/feat/tracking`) let a user share a meal plan: `SharePlanModal`
generated a `shareToken`, uploaded the plan to Firestore and linked to
`/shared/plan/<token>`; `SharedPlanPage` fetched it back (falling back to the
sharer's own `localStorage`, which only worked on the sharer's device). Foodie
v2 has no Firestore and no backend (D11, D14), so the link itself must carry
the plan.

What a link needs is small: the plan's name, its default servings and, per
day, the recipe id and servings of breakfast, lunch, dinner and each snack.
Recipes are resolved against the static catalog on the receiving side.

The roadmap allows exactly one compression dependency for this, **`lz-string`
or `fflate`**, and asks for a 7-day × 4-meal plan to fit in a URL under 2 KB.

## Decision

1. **Payload.** `SharedPlanWireSchema` (`src/schemas/plan-share.ts`), a compact
   positional JSON: `{ v: 1, n, s, d: [[breakfast, lunch, dinner, [snacks…]] × ≤ 7] }`
   with each slot `["<recipeId>", servings] | null`, and `n` a plain string when
   the name reads the same in every locale (else `{ en, es, fr }`). Nothing
   else leaves the device: no plan id, description, cost, tags or dates.
2. **Encoding.** `JSON.stringify` → `fflate.deflateSync(level 9)` (raw
   DEFLATE) → base64url without padding (`src/lib/domain/plan-share.ts`).
3. **Transport.** The URL **fragment**: `/{es/,fr/}plan/shared/#p=<payload>`.
   Fragments are not sent in HTTP requests, so the plan never reaches GitHub
   Pages' logs, a CDN or analytics; the page is static and decodes client-side.
   (D11 said "query"; the fragment is strictly better for the same static page
   and is what Issue 040 specifies.)
4. **Decoding is defensive.** `decodeSharedPlan()` never throws: payloads over
   4 096 characters, invalid base64url, failed inflation, inflated JSON over
   32 KB, JSON parse errors, a different `v` and schema failures (max 7 days,
   8 snacks/day, ids ≤ 80 chars, servings in (0, 99], names ≤ 120 chars) each
   map to a typed error the `SharedPlan` island explains.
5. **Library: `fflate`**, measured on this payload (100 random 7 × 4 catalog
   weeks, ids `rec_001…rec_050`):

   | Encoding of the same JSON | Trilingual default name (JSON 516 chars) | Single-language name (JSON 457 chars) |
   |---|---|---|
   | base64url, uncompressed | ~690 | ~610 |
   | `lz-string` `compressToEncodedURIComponent` | **326** | **262** |
   | `fflate` `deflateSync` + base64url | **246** (−25 %) | **198** (−24 %) |

   The longest full French URL
   (`https://artemiopadilla.github.io/foodie/fr/plan/shared/#p=…`) was 306
   characters — far under the 2 KB budget, asserted by
   `src/lib/domain/plan-share.test.ts` (also with 32-character contributed ids
   and 60-character names in all three locales).

   Bundle cost (esbuild, minified + gzip -9, library alone): `fflate` deflate
   path 3.2 KB, inflate path 2.2 KB; `lz-string` 1.7 KB (one module for both).
   In the production build `lib/domain/plan-share.ts` becomes its own chunk
   (12.1 KB minified, 5.9 KB gzip, both directions): the `/planner/` island
   loads it with a dynamic `import()` only when the share dialog opens, and
   the `/plan/shared/` island imports it directly.

6. **Share dialog.** `SharePlanModal` (a `Dialog` inside the `MealPlanner`
   island, trigger included) offers the link with a copy button, a `wa.me`
   WhatsApp link, the Web Share sheet when available, and a QR code drawn on a
   `<canvas>` by `src/lib/qr.ts` — a ~300-line dependency-free encoder (byte
   mode, level M, versions 1–40) checked against python-qrcode reference
   matrices and decoded with jsQR across all versions and masks.

## Consequences

- Shorter links win: ~25 % fewer characters matters for WhatsApp/SMS previews
  and QR density, and it is what the reader sees. The price is a few KB more
  gzip than `lz-string`, on chunks only the share dialog and `/plan/shared/`
  load — accepted.
- `fflate` is ESM, tree-shakeable, typed, MIT, zero dependencies and speaks
  standard DEFLATE: the payload can be decoded by any zlib (`inflateRaw`) if the
  site ever gets a server or a native app.
- The wire format is versioned (`v: 1`). A future change bumps `v`; old links
  then show "made with a newer/older version" instead of a wrong plan.
- Anyone holding a link can read the plan's name and recipe ids — that is the
  point of sharing, and the dialog says so. No personal data is in the payload
  unless the user typed it into the plan's name.
- Importing replaces the current plan after a confirmation when it has meals;
  the replaced plan is first kept in the saved plans (`savedMealPlans`), so
  nothing is lost. Meals whose recipe is not in the catalog are shown as
  "recipe not available" and left out of the import (the count is reported).
- Links do not expire and cannot be revoked (there is nothing server-side);
  cloud sharing with revocation stays deferred with Firestore (D14).

## Alternatives considered

- **`lz-string`** — smaller library, but ~25 % longer links for this payload
  (its UTF-16/LZW scheme shines on long repetitive text, not on ~500 bytes of
  JSON). Rejected on the measured payload size.
- **Native `CompressionStream('deflate-raw')`** — no dependency, but async
  (awkward for a synchronous `href`), only Baseline since 2023 (Safari 16.4) and
  not in older WebViews that open WhatsApp links. Revisit if the dependency
  ever becomes a burden; the wire format is identical, so links would keep
  working.
- **Plain base64url JSON** — no dependency but ~2.8× the compressed size.
- **Query string (`?p=`)** — reaches the server logs and, on GitHub Pages,
  any analytics; rejected for the fragment.
- **Firestore share tokens (PR #28)** — needs a backend and a data-retention
  story; deferred (D14).
