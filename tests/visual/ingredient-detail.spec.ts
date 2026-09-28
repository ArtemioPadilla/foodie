import { test, expect } from '@playwright/test';

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

  // Scroll so the client:visible island hydrates before the capture.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForLoadState('networkidle');
  await expect(page.getByTestId('ingredient-actions')).toHaveAttribute('data-hydrated', 'true');
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
