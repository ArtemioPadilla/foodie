---
title: Testing
description: Vitest unit tests, the catalog check, Playwright screenshots, accessibility, journeys and the CSP gate — what each covers and how to run it.
---

Foodie is tested at three levels. All of them run in CI; the first two also
run inside `npm run check`, the gate before every commit.

## 1. Unit tests (Vitest)

```bash
npm run test                                   # everything
npm run test -- src/lib/domain/shopping.test.ts # one file
npm run tdd                                    # watch mode
```

Tests sit next to the code as `*.test.ts(x)`:

- **Domain logic** (`src/lib/domain/*.test.ts`): unit conversion, shopping
  list consolidation, nutrition totals, plan sharing, costs, validation.
- **Stores** (`src/stores/*.test.ts`): persisted keys, schema validation of
  stored values, cross-tab sync. Use the `// @vitest-environment jsdom`
  pragma, clear `localStorage` in `beforeEach`, and re-import the store with
  `vi.resetModules()` to test hydration.
- **Islands** (`src/components/islands/*.test.tsx`): Testing Library with an
  explicit `lang` prop; never rely on jsdom's `navigator.language`.
- **Repository contracts** (`src/tests/`): route parity between locales,
  i18n key parity and plurals, forbidden imports, workflow and config guards,
  `CLAUDE.md` content, SEO and CSP of the built site.

Write the failing test first. Commits that add a red test may carry a
`Tdd-Red:` trailer; the pair of commits shows the behaviour was specified
before it was built.

## 2. The catalog check

```bash
npm run test -- src/tests/catalog-schema.test.ts
```

Parses every file in `public/data/` with its schema and checks unique ids,
non-blank English, Spanish and French text, and that every ingredient
reference resolves. `astro build` applies the same schemas to the content
collections, so bad data breaks the build too. The
`validate-recipe-pr.yml` workflow runs this test on every PR that touches the
catalog and comments the result. See
[Recipe format](../../contributing/recipe-format/).

## 3. Playwright

Two suites under `tests/`, driven by two configs:

| Suite | Config | Command | What it checks |
|---|---|---|---|
| `tests/visual/` | `playwright.config.ts` | `npm run build && npm run test:visual` | Screenshot baselines in light and dark, axe accessibility, console-error smoke, keyboard navigation, phone layouts, search |
| `tests/e2e/` | `playwright.e2e.config.ts` | `npm run test:e2e` | User journeys (catalog, plan → shopping list → pantry, tracking and goals, offline PWA, v1 data and links, sign-in with the mock adapter, contribute wizard) and the CSP gate |

`npm run test:e2e` builds its own `dist/` with `PUBLIC_AUTH_MOCK=1`, so the
signed-in branches can be exercised. Run `npm run build` again before the
visual suite, which expects a normal build.

### Screenshot baselines

Baselines live in `tests/__screenshots__/{chromium-light,chromium-dark}/` and
cover the catalog, the planning pages (seeded from `tests/fixtures/planning.ts`
with a frozen clock), tracking, and the template's gallery and dashboard.
Fonts are self-hosted, so glyphs match on every machine. After an intentional
visual change:

```bash
npm run build
npm run test:visual:update        # or: npm run refresh-baselines (Docker, CI's Linux image)
```

Specs that inject a `<style>` to freeze animations, and the axe scan, use
`test.use({ bypassCSP: true })`; everything else runs under the production
Content Security Policy.

### The CSP gate

`tests/e2e/csp.spec.ts` opens every kind of page (including the docs, a recipe
with its timer running, open dialogs and menus) and fails on any
`securitypolicyviolation`. It also checks that the collector itself works by
injecting a style that must be refused. When a dependency needs a runtime
style, add its text to `RUNTIME_STYLE_TEXTS` in `csp.config.mjs`.

### Accessibility and performance

```bash
npm run a11y          # axe-core on representative routes (needs a build)
npm run keyboard-nav  # focus order and skip link
npm run lighthouse    # Lighthouse CI against the built site
```

Targets: accessibility ≥ 0.95, best practices = 1.0, no console errors.

## Writing a Playwright test

- Prefer accessible selectors: `getByRole`, `getByText`, `getByPlaceholder`.
  Base UI's `Field` does not always emit `<label for>`, so `getByLabel` can
  miss inputs.
- Specs must pass whether or not Firebase is configured.
- Assert behaviour (an item appears in the shopping list), not just that an
  element exists.
- Wait for hydration before interacting with an island: Astro removes the
  `ssr` attribute from `astro-island` once it is interactive.
