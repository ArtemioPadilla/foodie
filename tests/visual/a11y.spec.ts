import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { PANTRY, PLAN, SHOPPING, TRACKING, seedPlanning } from '../fixtures/planning';

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
];

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
    if (/tracking\/$/.test(route)) await expect(page.getByTestId('tracking-today')).toHaveAttribute('data-status', 'ready');
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
] as const;

for (const { route, storage, ready } of seeded) {
  test(`a11y — ${route} (with data)`, async ({ page }) => {
    await seedPlanning(page, storage);
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId(ready)).toHaveAttribute('data-status', 'ready');
    await expectNoSeriousViolations(page, route);
  });
}

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
