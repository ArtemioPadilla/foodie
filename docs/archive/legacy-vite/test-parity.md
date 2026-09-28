# Legacy test parity (roadmap Issue 034)

Every test suite of the frozen React 18 + Vite SPA (`git ls-tree -r main --name-only tests/`)
mapped to the test file(s) that now cover it in the Astro + React 19 islands stack, or
justified when it has no one-to-one successor. Counts are `it(` / `test(` declarations
(legacy, read from `main`) and executed tests (new, `vitest run --reporter=json` /
`playwright test --list`) on 2026-09-28.

## Totals

| | Legacy (`main`) | Inceptor branch |
|---|---:|---:|
| Vitest (unit + integration) | 364 declared (1 `it.skip`) → **363 active** | **2 195** (2 185 passing + 10 skipped template cases) in 219 files |
| Playwright e2e journeys | 36 declared (11 `test.skip`) → 25 active | **68** in `tests/e2e/journeys.spec.ts` (+ 146 visual / a11y / smoke tests in `tests/visual/`) |

Roadmap target "Vitest total ≥ 400": met (2 195). Every one of the 363 active legacy
Vitest cases and the 11 skipped legacy e2e cases has a successor below; most successors
turn the legacy "renders without crashing" bodies into real assertions, so the new file
often has more tests than the legacy one.

## Unit suites (`tests/unit/**`)

| Legacy suite | # | New test file(s) | # | Notes |
|---|---:|---|---:|---|
| `unit/utils/calculations.test.ts` | 26 | `src/lib/domain/calculations.test.ts` | 26 | Same describe blocks (`scaleRecipeIngredient`, `scaleRecipe`, `calculateRecipeCost`, `calculateMealPlanCost`, `calculateDailyNutrition`, …). Roadmap #014. |
| `unit/utils/dateUtils.test.ts` | 56 | `src/lib/domain/date.test.ts`, `src/tests/format-date.test.ts` | 58 + 9 | Legacy compared against UTC `toISOString()`; the port uses local calendar keys (documented at the top of `date.test.ts`). `getToday`/`getCurrentTime` live in `src/lib/format-date.ts`. |
| `unit/utils/nutritionCalculator.test.ts` | 35 | `src/lib/domain/nutrition.test.ts` (`nutritionCalculator (legacy suite)`), `src/tests/legacy-data-compat.test.ts` | 45 + 14 | 1:1 describe blocks inside the legacy-suite block. |
| `unit/utils/unitConversions.test.ts` | 32 | `src/lib/domain/units.test.ts`, `src/lib/domain/use-unit-conversion.test.tsx` | 38 + 3 | Plus the pure half of the legacy `useUnitConversion` hook (unit systems). |
| `unit/utils/cn.test.ts` | 12 | `src/lib/utils.test.ts` | 17 | `cn` is the template's `clsx` + `tailwind-merge` helper; same merge / falsy / conflict cases. |
| `unit/services/shoppingService.test.ts` | 37 | `src/lib/domain/shopping.test.ts` | 69 | Consolidation, categories, base-unit conversion, CSV/text export, WhatsApp link. |
| `unit/services/validationService.test.ts` | 7 | `src/lib/domain/validation.test.ts` | 18 | Explicit "Port of legacy … (7)" block; the rest covers the Zod schemas behind it. |
| `unit/contexts/TrackingContext.test.tsx` | 24 (1 skip) | `src/stores/tracking.test.ts`, `src/stores/goals.test.ts`, `src/lib/domain/tracking.test.ts`, `src/schemas/foodie-domain.test.ts` | 24 + 5 + 25 + 13 | Context → nanostores (`$tracking`, `$goals`, D-context map). The legacy **skipped** "corrupted localStorage" case is a real test now. |
| `unit/contexts/BeverageContext.test.tsx` | 25 | `src/lib/catalog/selectors.test.ts`, `src/lib/catalog/use-catalog.test.tsx` | 33 + 15 | Context → TanStack Query catalog (`useCatalog`) + pure selectors (`getBeverageById`, `…ByCategory`, `search…`). "memoization" becomes Query caching (`useCatalog persistence`). |
| `unit/i18n.test.ts` | 13 | `src/tests/i18n.test.ts`, `src/i18n/index.test.ts` | 36 + 18 | i18next → compiled dictionaries in `src/i18n`; loading / fallback / supported languages / nav + common + recipe keys. |
| `unit/translationSchema.test.ts` | 19 | `src/tests/i18n.test.ts` (`schema: parity, duplicates, empties, types`), `src/i18n/index.test.ts` (`key parity`) | — | Key parity EN/ES/FR, duplicate and empty detection, 29 legacy groups kept. |

## Integration suites (`tests/integration/**`)

| Legacy suite | # | New test file(s) | # | Notes |
|---|---:|---|---:|---|
| `integration/RecipeCard.test.tsx` | 6 | `src/components/domain/RecipeCard.test.tsx` | 14 | Legacy fixture's `imageUrl` dropped (catalog has none); adds the `href` link mode. |
| `integration/TrackingPage.test.tsx` | 19 | `src/components/islands/TrackingToday.test.tsx` | 25 | Same describe blocks and names (#031). |
| `integration/QuickAddModal.test.tsx` | 14 | `src/components/islands/TrackingQuickAdd.test.tsx` | 20 | Same describe blocks (#031); legacy 3 tabs → 4 (water split out, documented in the file). |
| `integration/GoalsPage.test.tsx` | 19 | `src/components/islands/GoalsForm.test.tsx` | 27 | Same describe blocks (#032); adaptations listed in the file header. |
| `integration/ProgressPage.test.tsx` | 20 | `src/components/islands/ProgressDashboard.test.tsx` | 27 | Same describe blocks (#033); "active view" by `aria-pressed` instead of a colour class. |

## E2E suites (`tests/e2e/**`) → `tests/e2e/journeys.spec.ts`

| Legacy suite | # (skip) | New `describe` / tests | Notes |
|---|---:|---|---|
| `e2e/recipe-browsing.spec.ts` | 9 (1) | `catalog journeys (roadmap #023)`, the recipe detail journeys (#018, #020) | Homepage, cards, search, type filter, detail, ingredients + instructions, scaling, language. The skipped "works offline (PWA)" is real in `offline PWA (roadmap #028)`. |
| `e2e/meal-planning.spec.ts` | 7 (5) | `planner journeys (roadmap #024)`, `planner picker, templates and summary (roadmap #025)`, `planning end to end (roadmap #029)` | `week-view` / `month-view` test ids kept. All 5 skipped cases (add via DnD, remove, generate shopping list, save plan, summary) are real (pointer + keyboard DnD). |
| `e2e/shopping-list.spec.ts` | 8 (5) | `shopping list journeys (roadmap #026)` | The 3 live tests keep their assertions against a seeded list; skipped custom item / export / WhatsApp / clear completed are real; "filters by category" → collapsible category groups (e2e) + name/checked filters (`ShoppingList.test.tsx`). |
| `e2e/translations.spec.ts` | 12 (0) | `no raw translation keys on /{,es/,fr/}{…}` (27 routes incl. the 3 tracking pages), language-switcher and per-locale journeys | Network assertions on `/locales/*.json` are obsolete: dictionaries are compiled into each static page (no runtime fetch, no "network error" path to test). |
| — (no legacy tracking e2e) | — | `food diary journeys (roadmap #031)`, `nutrition tracking journeys (roadmap #034)` | New: log a recipe → progress → set goals → progress recalculated → charts, persistence after reload; presets/reset; goals + progress in 3 locales. |

## Support files (not suites)

| Legacy file | Successor / justification |
|---|---|
| `tests/setup.ts` | `vitest.setup.ts` (jsdom polyfills: `matchMedia`, `scrollIntoView`, `ResizeObserver`, …); jsdom is opted into per file with `// @vitest-environment jsdom`. |
| `tests/test-utils.tsx` | Not needed: no provider tree to wrap (nanostores + per-island `QueryProvider`); tests render islands directly. |
| `tests/mocks/i18n.ts` | Not needed: `t()` is a pure function over compiled dictionaries. |
| `tests/mocks/mockData.ts` | `src/tests/fixtures/foodie-domain.ts` (schema-validated), `src/tests/fixtures/legacy-v1-localstorage.json`, `tests/fixtures/planning.ts` (Playwright). |
| `tests/CLAUDE.md` | Superseded by the root `CLAUDE.md` test section and the roadmap. |

## Accessibility and visual coverage of the tracking pages

`tests/visual/a11y.spec.ts` scans `/tracking/`, `/es/tracking/goals/` and
`/fr/tracking/progress/` empty; `/tracking/`, `/tracking/goals/` and `/tracking/progress/`
seeded; the progress month view; the goals form in its invalid state; and the quick-add
dialog — in `chromium-light` and `chromium-dark`. `tests/visual/tracking.spec.ts` holds
the `tracking.png`, `goals.png` and `progress.png` baselines for both themes.
