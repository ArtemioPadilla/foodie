import { test, expect, type Page } from '@playwright/test';
import { PANTRY, PLAN, SHOPPING, seedPlanning } from '../fixtures/planning';

// The production CSP (ADR 0012) refuses the freeze <style> injected with
// page.addStyleTag, so this spec runs with Playwright's bypassCSP. The policy
// itself is audited by tests/e2e/csp.spec.ts and the smoke suite.
test.use({ bypassCSP: true });

/**
 * Visual baselines of the planning pages (roadmap Issue 029): `/planner/`,
 * `/shopping/` and `/pantry/` with seeded, deterministic localStorage
 * (tests/fixtures/planning.ts), in the chromium-light and chromium-dark
 * projects. Baselines live in
 * tests/__screenshots__/{chromium-light,chromium-dark}/{planner,shopping,pantry}.png.
 *
 * Determinism: the clock is frozen (timers still run, so hydration behaves as
 * usual) and the timezone and locale are pinned. Web fonts are self-hosted
 * (public/fonts/), so every environment renders the same glyphs; Playwright
 * waits for `document.fonts.ready` before each screenshot. Viewport-only shots: the fold holds the
 * controls and the first rows.
 */
test.use({ timezoneId: 'UTC', locale: 'en-US' });

async function freeze(page: Page) {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        caret-color: transparent !important;
      }
    `,
  });
}

test('planner screenshot', async ({ page }) => {
  await seedPlanning(page, { currentMealPlan: PLAN });
  await page.goto('/planner/');
  await page.waitForLoadState('networkidle');
  await expect(page.getByTestId('meal-planner')).toHaveAttribute('data-status', 'ready');
  await expect(page.getByTestId('planned-meal')).toHaveCount(3);
  await expect(page.getByTestId('draggable-recipe').first()).toBeVisible();
  await expect(page.getByTestId('week-range')).toContainText('Sep 28');
  await freeze(page);
  await expect(page).toHaveScreenshot('planner.png', { maxDiffPixelRatio: 0.02 });
});

test('shopping list screenshot', async ({ page }) => {
  await seedPlanning(page, { shoppingList: SHOPPING });
  await page.goto('/shopping/');
  await page.waitForLoadState('networkidle');
  await expect(page.getByTestId('shopping-list')).toHaveAttribute('data-status', 'ready');
  await expect(page.getByTestId('shopping-board')).toHaveAttribute('data-catalog', 'success');
  await expect(page.getByTestId('shopping-item')).toHaveCount(SHOPPING.length);
  await freeze(page);
  await expect(page).toHaveScreenshot('shopping.png', { maxDiffPixelRatio: 0.02 });
});

test('pantry screenshot', async ({ page }) => {
  await seedPlanning(page, { pantryItems: PANTRY });
  await page.goto('/pantry/');
  await page.waitForLoadState('networkidle');
  await expect(page.getByTestId('pantry')).toHaveAttribute('data-status', 'ready');
  await expect(page.getByTestId('pantry-board')).toHaveAttribute('data-catalog', 'success');
  await expect(page.getByTestId('pantry-item')).toHaveCount(PANTRY.length);
  await expect(page.getByTestId('pantry-suggestion').first()).toBeVisible();
  await freeze(page);
  await expect(page).toHaveScreenshot('pantry.png', { maxDiffPixelRatio: 0.02 });
});
