import { test, expect } from '@playwright/test';

// The production CSP (ADR 0012) refuses the freeze <style> injected with
// page.addStyleTag, so this spec runs with Playwright's bypassCSP. The policy
// itself is audited by tests/e2e/csp.spec.ts and the smoke suite.
test.use({ bypassCSP: true });

/**
 * Visual snapshot of the recipe browser (roadmap Issues 017 + 023): the
 * `/recipes/` page with the hydrated `RecipeBrowser` island — search, sort,
 * view toggle, the filter sidebar and the first row of RecipeCards (grid).
 * Viewport-only: the full 50-card grid adds nothing but pixels. Baselines
 * live in tests/__screenshots__/{chromium-light,chromium-dark}/recipes.png.
 */
test('recipe browser screenshot', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('foodie:privacy-ack', 'true'));
  await page.goto('/recipes/');
  await page.waitForLoadState('networkidle');
  await expect(page.getByTestId('recipe-card')).toHaveCount(50);

  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        caret-color: transparent !important;
      }
    `,
  });

  await expect(page).toHaveScreenshot('recipes.png', { maxDiffPixelRatio: 0.02 });
});
