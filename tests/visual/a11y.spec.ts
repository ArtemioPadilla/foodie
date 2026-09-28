import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { GOALS, PANTRY, PLAN, SHOPPING, TRACKING, TRACKING_HISTORY, seedPlanning } from '../fixtures/planning';

// The production CSP (ADR 0012) refuses the freeze <style> injected with
// page.addStyleTag, so this spec runs with Playwright's bypassCSP. The policy
// itself is audited by tests/e2e/csp.spec.ts and the smoke suite.
test.use({ bypassCSP: true });

/**
 * Accessibility gate (Epic 12, criterion #1 of the 7-item UX quality bar).
 *
 * Runs axe-core on the public routes and asserts ZERO serious or critical
 * violations. Moderate/minor issues are reported but not failed (axe's own
 * design recognizes those as advisory).
 *
 * Threshold rationale: serious = "may exclude a large group of users";
 * critical = "blocks access entirely". Neither is acceptable for a scaffold
 * meant to teach principled UX (see docs/ETHICS.md item #7).
 */

// Include at least one form-bearing route (/login, /contact) so a regression
// in the shared <Form> a11y wiring (label htmlFor ↔ control id) is caught.
// Without form coverage a broken FormItemContext would ship green — exactly
// the blind spot that let a downstream instantiation ship unlabelled inputs.
// `/recipes/rec_001/` (roadmap Issue 018): a static recipe detail — the
// island's servings stepper, unit toggle, checkboxes and nutrition table.
// `/ingredients/` + `/es/ingredients/ing_101/` (roadmap Issue 019): the
// browser's filter chips / toggle buttons and a composite ingredient detail
// with the IngredientActions form.
// `/recipes/` + `/es/recipes/` (roadmap Issue 023): the RecipeBrowser island
// — search, sort select, view toggle, filter accordion with checkboxes and
// radios, 50 cards with FavoriteButtons. `/planner/`, `/es/shopping/`,
// `/fr/pantry/` (roadmap Issue 029): the planning islands in their empty
// state; the seeded (ready) state of each runs in the loop further down.
// `/tracking/`, `/es/tracking/goals/`, `/fr/tracking/progress/` (roadmap
// Issues 031–034): the three tracking pages, empty (default goals, no diary).
// Every route runs in both the chromium-light and chromium-dark projects
// (light + dark themes).
const routes = [
  '/',
  '/gallery/',
  '/demos/dashboard/',
  '/docs/',
  '/login/',
  '/contact/',
  '/recipes/rec_001/',
  '/fr/recipes/rec_001/',
  '/recipes/',
  '/es/recipes/',
  '/ingredients/',
  '/es/ingredients/ing_101/',
  '/planner/',
  '/es/shopping/',
  '/fr/pantry/',
  '/tracking/',
  '/es/tracking/goals/',
  '/fr/tracking/progress/',
];

/**
 * Waits for the page's island to be hydrated before scanning. The progress
 * dashboard is `client:visible`, so it is scrolled into view first.
 */
async function waitForIsland(page: import('@playwright/test').Page, testId: string) {
  const island = page.getByTestId(testId);
  await island.scrollIntoViewIfNeeded();
  await expect(island).toHaveAttribute('data-status', 'ready');
  // Back to the top: scrolled content under the translucent sticky header
  // would be measured as the header's background by the contrast rule.
  await page.evaluate(() => window.scrollTo(0, 0));
}

/** Axe scan (WCAG 2.1 AA) that fails on critical/serious violations. */
async function expectNoSeriousViolations(page: import('@playwright/test').Page, route: string) {
  // Disable animations + transitions before scanning so axe doesn't
  // see transient mid-animation states.
  await page.addStyleTag({
    content: `*, *::before, *::after { animation: none !important; transition: none !important; }`,
  });
  const results = await new AxeBuilder({ page })
    // WCAG 2.1 AA is the baseline (PRINCIPLES.md §5)
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  // Known upstream issues, NOT ours: @base-ui-components/react 1.0.0-rc.0
  // (a) emits aria-orientation on elements whose computed role doesn't
  // allow it (the Slider's hidden <input>, menu <ul>s), and (b) does not
  // propagate aria-label from Root to its internal auto-id'd inputs
  // (Slider, NumberField), so axe's `label` rule flags those hidden
  // inputs even when the visible control is fully labelled. Both are
  // tracked by the Epic 5 re-pin to the stable release — remove this
  // allowlist when @base-ui-components/react leaves rc. Everything else
  // still gates.
  const isUpstreamBaseUi = (v: (typeof results.violations)[number]) =>
    (v.id === 'aria-allowed-attr' &&
      v.nodes.every((n) => n.html.includes('aria-orientation='))) ||
    (v.id === 'label' && v.nodes.every((n) => n.html.includes('id="base-ui-')));

  // Critical / serious are gates. Anything lower is reported only.
  const serious = results.violations.filter(
    (v) =>
      (v.impact === 'critical' || v.impact === 'serious') && !isUpstreamBaseUi(v),
  );
  if (serious.length > 0) {
    console.error(
      `axe violations on ${route}:`,
      JSON.stringify(
        serious.map((v) => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          nodes: v.nodes.map((n) => n.html.slice(0, 160)),
        })),
        null,
        2,
      ),
    );
  }
  expect(serious, `${route} should have no critical or serious a11y issues`).toEqual([]);
}

for (const route of routes) {
  test(`a11y — ${route}`, async ({ page }) => {
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    // Catalog browsers: scan the hydrated island (cards rendered), not its skeleton.
    if (/recipes\/$/.test(route)) await expect(page.getByTestId('recipe-card').first()).toBeVisible();
    if (/ingredients\/$/.test(route)) await expect(page.getByTestId('ingredient-card').first()).toBeVisible();
    if (/tracking\/$/.test(route)) await waitForIsland(page, 'tracking-today');
    if (/tracking\/goals\/$/.test(route)) await waitForIsland(page, 'goals-form');
    if (/tracking\/progress\/$/.test(route)) await waitForIsland(page, 'progress-dashboard');
    await expectNoSeriousViolations(page, route);
  });
}

// Planning islands with data (roadmap Issue 029): the week board with meals,
// the grouped shopping list with a checked and a custom line, and the pantry
// with expired / expiring / low-stock alerts and "What can I cook".
const seeded = [
  { route: '/planner/', storage: { currentMealPlan: PLAN }, ready: 'meal-planner' },
  { route: '/shopping/', storage: { shoppingList: SHOPPING }, ready: 'shopping-list' },
  { route: '/pantry/', storage: { pantryItems: PANTRY }, ready: 'pantry' },
  // Roadmap Issue 031: the diary's "today" (frozen clock) with entries in several meals.
  { route: '/tracking/', storage: { trackingEntries: TRACKING }, ready: 'tracking-today' },
  // Roadmap Issue 034: custom goals in the form; two weeks of history against
  // them in the dashboard (KPIs, charts, sr-only tables, daily meters).
  { route: '/tracking/goals/', storage: { nutritionGoals: GOALS }, ready: 'goals-form' },
  { route: '/tracking/progress/', storage: { trackingEntries: TRACKING_HISTORY, nutritionGoals: GOALS }, ready: 'progress-dashboard' },
] as const;

for (const { route, storage, ready } of seeded) {
  test(`a11y — ${route} (with data)`, async ({ page }) => {
    await seedPlanning(page, storage);
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    await waitForIsland(page, ready);
    await expectNoSeriousViolations(page, route);
  });
}

// Roadmap Issue 034: the month view of the dashboard (bars for every logged
// day, 7-day trend) and the goals form with an out-of-range value (inline
// error + "fix the errors" live region).
test('a11y — /tracking/progress/ month view', async ({ page }) => {
  await seedPlanning(page, { trackingEntries: TRACKING_HISTORY, nutritionGoals: GOALS });
  await page.goto('/tracking/progress/');
  await waitForIsland(page, 'progress-dashboard');
  await page.getByRole('button', { name: 'Month' }).click();
  await expect(page.getByTestId('progress-view')).toHaveAttribute('data-view', 'month');
  await expect(page.getByTestId('progress-calories-chart').getByRole('img')).toBeVisible();
  await page.mouse.move(0, 0);
  await expectNoSeriousViolations(page, '/tracking/progress/ (month)');
});

test('a11y — /tracking/goals/ invalid value', async ({ page }) => {
  await seedPlanning(page, { nutritionGoals: GOALS });
  await page.goto('/tracking/goals/');
  await waitForIsland(page, 'goals-form');
  const calories = page.locator('[data-goal="calories"]').getByRole('textbox');
  await calories.fill('100');
  await calories.press('Tab');
  await page.getByRole('button', { name: 'Save Goals' }).click();
  await expect(page.getByTestId('goals-status')).toContainText('out of range');
  // The hovered primary button (bg-primary/90) is a kit hover colour, not this page.
  await page.mouse.move(0, 0);
  await expectNoSeriousViolations(page, '/tracking/goals/ (invalid)');
});

// Roadmap Issue 031: the quick-add dialog (Tabs + Select + NumberField) open
// with a recipe selected, then on the water tab.
test('a11y — /tracking/ quick-add dialog', async ({ page }) => {
  await seedPlanning(page, { trackingEntries: TRACKING });
  await page.goto('/tracking/');
  await expect(page.getByTestId('tracking-day')).toHaveAttribute('data-catalog', 'success');
  await page.getByTestId('tracking-quick-add').click();
  const dialog = page.getByTestId('quick-add-dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByTestId('quick-add-recipe-option').first().click();
  await expect(dialog.getByTestId('quick-add-preview')).toBeVisible();
  await expectNoSeriousViolations(page, '/tracking/ (quick add, recipe)');
  await dialog.getByRole('tab', { name: 'Water' }).click();
  await expect(dialog.getByTestId('quick-add-water')).toBeVisible();
  await expectNoSeriousViolations(page, '/tracking/ (quick add, water)');
});
