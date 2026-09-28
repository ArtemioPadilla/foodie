import { test, expect } from '@playwright/test';

// The production CSP (ADR 0012) refuses the freeze <style> injected with
// page.addStyleTag, so this spec runs with Playwright's bypassCSP. The policy
// itself is audited by tests/e2e/csp.spec.ts and the smoke suite.
test.use({ bypassCSP: true });

/**
 * Visual snapshot of a static recipe detail (roadmap Issues 018 + 023):
 * `/recipes/rec_001/` — header with DifficultyBadge + DietaryBadges, the
 * meta grid, the hydrated `RecipeDetailActions` island (FavoriteButton,
 * ServingsAdjuster, ingredient links, instructions with timers),
 * NutritionFacts and the related-recipe cards. Baselines live in
 * tests/__screenshots__/{chromium-light,chromium-dark}/recipe-detail.png.
 */
test('recipe detail page screenshot', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('foodie:privacy-ack', 'true'));
  await page.goto('/recipes/rec_001/');

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForLoadState('networkidle');
  await expect(page.getByTestId('recipe-detail-actions')).toHaveAttribute('data-hydrated', 'true');
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.locator('main[data-page="recipe-detail"] h1')).toBeVisible();

  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        caret-color: transparent !important;
      }
    `,
  });

  await expect(page).toHaveScreenshot('recipe-detail.png', {
    fullPage: true,
    maxDiffPixelRatio: 0.02,
  });
});
