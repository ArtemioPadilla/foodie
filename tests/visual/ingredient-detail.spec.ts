import { test, expect } from '@playwright/test';

// The production CSP (ADR 0012) refuses the freeze <style> injected with
// page.addStyleTag, so this spec runs with Playwright's bypassCSP. The policy
// itself is audited by tests/e2e/csp.spec.ts and the smoke suite.
test.use({ bypassCSP: true });

/**
 * Visual snapshot of a static ingredient detail (roadmap Issue 019):
 * `/ingredients/ing_101/` (Basil Pesto) is composite, so the page shows every
 * section — composition with yield, preparation, storage, seasonality,
 * alternatives, "Recipes with this ingredient" (empty: no catalog recipe
 * uses a composite yet — the populated list is covered by the e2e journey),
 * quick info — plus the
 * `IngredientActions` island. Baselines live in
 * tests/__screenshots__/{chromium-light,chromium-dark}/ingredient-detail.png.
 */
test('ingredient detail page screenshot', async ({ page }) => {
  // Acknowledge the first-visit privacy notice so it never overlays the capture.
  await page.addInitScript(() => localStorage.setItem('foodie:privacy-ack', 'true'));
  await page.goto('/ingredients/ing_101/');

  // Bring the client:visible island itself into view so its
  // IntersectionObserver fires (scrolling straight to the page bottom can jump
  // past it, which made this capture flaky on a GitHub runner, PR #36).
  const actions = page.getByTestId('ingredient-actions');
  await actions.scrollIntoViewIfNeeded();
  await page.waitForLoadState('networkidle');
  await expect(actions).toHaveAttribute('data-hydrated', 'true');
  await page.evaluate(() => window.scrollTo(0, 0));

  await expect(page.locator('main[data-page="ingredient-detail"] h1')).toHaveText('Basil Pesto');

  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        caret-color: transparent !important;
      }
    `,
  });

  await expect(page).toHaveScreenshot('ingredient-detail.png', {
    fullPage: true,
    maxDiffPixelRatio: 0.02,
  });
});
