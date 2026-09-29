# Foodie roadmap (after v2.0.0)

The migration to Inceptor is finished in the code: every issue of the
migration plan
([`docs/superpowers/specs/2026-09-27-foodie-inceptor-migration-roadmap.md`](docs/superpowers/specs/2026-09-27-foodie-inceptor-migration-roadmap.md),
Phases 0–6, issues 001–048) is implemented. The GitHub-side steps that
publish it (cutover, tag, release, issues, branch cleanup) are listed, in
order, in
[`docs/runbooks/github-actions-pending.md`](docs/runbooks/github-actions-pending.md).

This file is the backlog that comes **after** that release. Nothing here is
scheduled. Each item says why it was left out of 2.0.0 and what would have to
be true to pick it up. New work follows the same flow as the migration: a
GitHub issue (labels `type:*`, `risk:high` when it applies), a branch, a PR
to `main`, `npm run check` green, and an ADR for any `risk:high` change.

## Deferred product features (decision D14)

These were cut from the migration on purpose: Foodie has no user base that
needs them yet, and each one adds a server, an account requirement or a new
platform to maintain.

| Item | Why it is not in 2.0.0 | Pick it up when | Notes |
|---|---|---|---|
| **Cloud sync** of plans, lists, pantry, diary and favourites (Firestore or another backend) | Local-first by design (ADR 0002): no server copy means no breach surface and no data controller duties | Users ask to use Foodie on more than one device, and a stakeholder ADR (tier 2) covers what leaves the device, retention, conflicts and deletion | Accounts already exist (ADR 0012) and per-user keys are in place (#037); "Export my data" gives a manual path today |
| **Automatic recipe pull requests** from the contribute wizard | It needs a server-side GitHub credential; the v1 flow put a token in the browser (removed by D10) | A small backend exists (Inceptor's `server-node` archetype, `/api/feedback`) or a GitHub App with a narrow scope | Today: the wizard opens a prefilled `recipe-submission.yml` issue and a maintainer turns it into a PR (`docs/recipes/contributing-recipes.md`) |
| **Tauri desktop and Android apps** | The PWA already installs on desktop and Android; the Tauri workflows were removed in #002 | There is a need the PWA cannot meet (file system, background tasks, store distribution) | Inceptor's runbooks stay in `docs/runbooks/tauri-desktop.md` and `tauri-android.md` |
| **iOS app** | Same as above; Safari's "Add to Home Screen" runs the PWA | App Store distribution is wanted | Tauri 2 mobile or a WebView wrapper; needs an Apple developer account |
| **Kanban / board view** of the plan | Not in v1; the week and month views cover planning | Users ask for it | `@dnd-kit` is already in the bundle for the planner |

## Follow-ups found during the migration

Smaller items the migration recorded but did not do:

- **Export and clear data without an account.** `/profile/` is signed-in
  only (#036), so an anonymous visitor, or a build without sign-in, cannot
  reach "Export my data" / "Clear my data". The logic lives in
  `src/lib/user-data.ts` and is UI-independent; expose it from the footer or
  a `/privacy/` page (ADR 0002 §4 amendment).
- **More ingredient prices.** The price sheet covers 51 catalog ingredients
  (PR #28's quotes re-keyed; ADR 0014), not the "150+" the plan expected, and
  prices in another currency are left out because there are no exchange
  rates. Add quotes to `public/data/ingredient-prices.json` (validated by the
  `prices` collection).
- **Recipe photos.** The WebP `srcset` pipeline is ready (#045,
  `docs/recipes/catalog-data.md` § Images) but no recipe ships a photo yet.
- **Docs in Spanish and French.** `/docs/` is English only; ES and FR have
  bridge pages (route-parity allowlist, #043).
- **Drop the integration branch from the workflows.** `ci.yml`,
  `visual.yml`, `lighthouse.yml` and `security.yml` still list `inceptor` in
  their triggers; remove it together with the assertions in
  `src/tests/workflow-foodie-ci.test.ts` once the branch is deleted.
- **Stale mentions of the template.** `.claude/agents/{prometeo,forja,centinela}.md`
  still say "Astro 5"; `CLAUDE.md` still lists `/gallery`, `/demos`,
  `/blocks`, `/blog`, the `blog` collection and `@dnd-kit/utilities`, and its
  roadmap-status row still shows 045–048 as next. These files are
  maintainer-owned; update them in a docs PR.
- **Gallery.** It is built only outside production (`flags.experimentalGallery`,
  #046). If it is ever removed, tighten `RECHARTS_ROUTES` in
  `src/tests/bundle-split.test.ts`.
- **ADR 0011** (Astro 7) is `Proposed` until the cutover PR merges; mark it
  `Accepted` then.
- **`@vite-pwa/astro` override.** Remove the `overrides` entry that lets it
  run on Astro 7 once a release declares Astro 7 in its peer range.
- **Held-back majors.** `dependabot.yml` ignores some majors with the reason
  inline (for example `@tanstack/react-table` 9, `motion` 13, `eslint` 10,
  `typescript` 7). Revisit them one PR at a time.
- **CSP as a response header.** Cloudflare Pages now sends
  `frame-ancestors 'none'` from `public/_headers` (ADR 0015); the rest of the
  policy is still the hashed `<meta>` tag. Moving the whole policy to the
  header (hashes generated per page) and adding a report endpoint remain
  open (ADR 0012).
- **Import user data (ADR 0015).** `/profile` exports `foodie-user-data`
  files, and the old GitHub Pages address offers the same file before it
  redirects, but nothing imports one yet: add "Import data" to `/profile`
  (Zod-validated, per-key merge) so data moves to `eat.cybere.co`.
- **Template sync.** Pull improvements from Inceptor's `src/components/ui/`
  kit by hand, about once a quarter (roadmap risk table).

## Out of scope (unchanged from the migration plan)

- A visual redesign of the product.
