# Performance playbook

## `npm run perf` — the gate (roadmap Issue 045)

`npm run perf` (`scripts/perf.mjs`) builds the site the way it is deployed
(auth on: dummy `PUBLIC_FIREBASE_*` unless real ones are set — nothing is
contacted, the SDK only loads when the sign-in dialog opens), then:

1. **Bundle checks** on that build — `src/tests/bundle-split.test.ts`
   (Recharts only on `/tracking/progress|goals/` and the template galleries;
   Firebase never initial JS and reachable only through the lazy auth adapter;
   no chunk over 250 KB gz without a recorded reason) and
   `src/tests/auth-chunk.test.ts`.
2. **Chunk report** → `.lighthouseci/chunk-report.md` (paste it in the PR;
   also `npm run perf:chunks` on any build).
3. **Lighthouse CI** (`.lighthouserc.json`, desktop preset, lhci's static
   server over `dist/`) on `/`, `/es/`, `/fr/`, `/recipes/`,
   `/recipes/rec_001/`, `/planner/`, `/tracking/progress/`:
   - scores (error level): performance ≥ 0.9, accessibility ≥ 0.95,
     best practices = 1, SEO ≥ 0.95; Core Web Vitals warn only;
   - byte budgets from `lighthouse-budgets.json`, asserted by a second
     `lhci assert --budgetsFile` pass (Lighthouse 12 no longer reports
     budgets itself): script ≤ **200 KB** on the landings, ≤ **320 KB** on
     `/recipes/` and recipe details, ≤ **350 KB** on `/planner/*` and
     `/tracking/*`; no third-party requests; ≤ 3 fonts.
4. Scores and transfer sizes → `.lighthouseci/perf-summary.md`.

Chrome: `CHROME_PATH`, else a system Chrome, else Playwright's Chromium (the
script finds it). Budgets are **transfer** sizes as Lighthouse measures them,
response headers included (~0.5 KB per request on lhci's server), so the
number of chunks matters as much as their bytes.

### Measured (2026-09-28, Issue 045)

| Route | Perf | A11y | Best practices | SEO | Script (transfer / requests) | Budget |
|---|---:|---:|---:|---:|---:|---:|
| `/` | 1.00 | 1.00 | 1.00 | 1.00 | 186 KB / 64 | 200 KB |
| `/es/` | 0.99 | 1.00 | 1.00 | 1.00 | 186 KB / 63 | 200 KB |
| `/fr/` | 1.00 | 1.00 | 1.00 | 1.00 | 187 KB / 63 | 200 KB |
| `/recipes/` | 1.00 | 0.96 | 1.00 | 1.00 | 299 KB / 120 | 320 KB |
| `/recipes/rec_001/` | 1.00 | 1.00 | 1.00 | 1.00 | 284 KB / 118 | 320 KB |
| `/planner/` | 1.00 | 1.00 | 1.00 | 1.00 | 333 KB / 136 | 350 KB |
| `/tracking/progress/` | 1.00 | 1.00 | 1.00 | 1.00 | 337 KB / 92 | 350 KB |

Before Issue 045 the landing shipped 324 KB of script (97 requests) and the
planner 438 KB (171). What moved it:

- **Per-locale dictionaries.** `src/i18n` loads only the page's dictionary in
  the browser (~20 KB gz instead of ~60 KB) — see
  `docs/recipes/i18n-islands.md`.
- **Dialogs load on first open.** The header's `AuthDialog`, signed-in
  `AccountDropdown`, `MobileNav` sheet and search palette, and the planner's
  `RecipePicker`, price manager, templates and share dialogs are
  `React.lazy` inside their island (`LazyDialog` renders a look-alike trigger
  until the first press). Compounds still live in one island.
- **Hydration fix.** `InstallButton`, `UpdateToast` and `OfflineBanner` render
  nothing until hydrated; `beforeinstallprompt` firing early had caused a
  React #418 in `errors-in-console` (best practices 0.96).

`/recipes/` accessibility 0.96: Lighthouse's `target-size` flags the 16 px
filter checkboxes next to the accordion headers — above the 0.95 gate; a
follow-up can enlarge their hit area.

The mechanical perf gates (Lighthouse CI, `.lighthouserc.json`) cover
synthetic Web Vitals. They don't cover three things you have to measure
by hand:

1. Smooth-scroll fps on the 50,000-row virtual table
2. Filter-input latency on the same table
3. Theme-toggle behavior under throttled networks

This playbook documents how to capture each one repeatably so the result
goes in a PR description as evidence, not as a vibe check.

## Setup

```bash
npm run build
npm run preview   # serves dist/ on http://localhost:4321
```

Open Chrome → DevTools → Performance panel. Use an incognito window so
extensions don't influence the trace.

## Probe 1 — 60 fps scroll on `/ingredients/`

1. Open `http://localhost:4321/ingredients/` (105 cards; the template's
   `/demos/data/large` table left in roadmap Issue 046)
2. DevTools → Performance → ⚙️ → CPU throttling: 4× slowdown
3. Click Record, scroll the table top → bottom for ~5 seconds, stop recording
4. Read the **FPS meter** (top of the trace). Median should be ≥ 60 with no
   sustained drops below 30
5. Frames > 16.6 ms are highlighted red — count them. PR-ready evidence:
   "median 60 fps, 2 long frames at 18 ms during initial paint"

If you see sustained low fps, the typical culprits are:

- A long list rendered at once — `DataTable` (`src/components/ui/data-table.tsx`)
  virtualizes with `useVirtualizer`; card grids should paginate or virtualize
- Recharts re-renders during scroll — they shouldn't be on this page
- Heavy `useMemo` recomputation — re-check dependency arrays

## Probe 2 — < 50 ms filter latency

1. Same page as Probe 1
2. DevTools → Performance → ⚙️ → CPU throttling: 4× slowdown
3. Click Record, type "a" in the global filter input, stop after the table
   re-renders
4. Find the input event in the timeline. Read **input → render commit** time
5. Should be < 50 ms with 50,000 rows under 4× throttling. The
   `react-virtual` window keeps the diff bounded; if you're hitting > 50 ms,
   the filter probably isn't memoized

## Probe 3 — Theme toggle on Slow 3G

1. DevTools → Network → Throttling: Slow 3G
2. Hard-reload `/`. The theme script runs synchronously before first paint
3. Watch for the dreaded white-on-dark "flash". There should be none —
   `is:inline` on the theme script in `BaseLayout.astro` guarantees it
4. Toggle the theme button. Should be instantaneous (a class-flip), not a
   visible repaint cascade

If a flash appears under Slow 3G, the theme script regressed. Check that
`BaseLayout.astro` still uses `<script is:inline>` at the top of `<head>`.

## What to put in the PR

The PR template's "Mechanical checks" section accepts a one-line summary
per probe:

> - [x] LH perf ≥ 90 desktop preset (CI: <link>)
> - [x] Scroll: median 60 fps, 2 long frames at 18 ms during initial paint
> - [x] Filter: 38 ms input→commit at 50 k rows, 4× CPU throttle
> - [x] Theme: no flash on Slow 3G hard-reload

Save the DevTools trace files to your local notes if you want history. Don't
commit them — they're ~5 MB and not reviewable.

## When to escalate

If you can't hit the budgets with the current pattern, file an issue with the
trace summary, the offending page, and the suspected hot path. Don't lower
the budgets to make CI green — that defeats the gate's purpose.
