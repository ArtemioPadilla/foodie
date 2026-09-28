import { test, expect, type Page } from '@playwright/test';
import { GOALS, TRACKING, TRACKING_HISTORY, seedPlanning } from '../fixtures/planning';

// The production CSP (ADR 0012) refuses the freeze <style> injected with
// page.addStyleTag, so this spec runs with Playwright's bypassCSP. The policy
// itself is audited by tests/e2e/csp.spec.ts and the smoke suite.
test.use({ bypassCSP: true });

/**
 * Visual baselines of the three tracking pages (roadmap Issue 034):
 * `/tracking/` (the diary's frozen "today" with entries in several meals),
 * `/tracking/goals/` (custom goals, macro split) and `/tracking/progress/`
 * (two weeks of history in the month view: KPIs + calories chart), in the
 * chromium-light and chromium-dark projects. Baselines live in
 * tests/__screenshots__/{chromium-light,chromium-dark}/{tracking,goals,progress}.png.
 *
 * Same determinism as planning.spec.ts: frozen clock (Monday 2026-09-28),
 * pinned timezone/locale, system fonts, animations off; the kit charts render
 * with `isAnimationActive={false}`. Viewport-only shots.
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

test('tracking diary screenshot', async ({ page }) => {
  await seedPlanning(page, { trackingEntries: TRACKING, nutritionGoals: GOALS });
  await page.goto('/tracking/');
  await page.waitForLoadState('networkidle');
  await expect(page.getByTestId('tracking-today')).toHaveAttribute('data-status', 'ready');
  await expect(page.getByTestId('tracking-day')).toHaveAttribute('data-catalog', 'success');
  await expect(page.getByTestId('tracking-entry')).toHaveCount(TRACKING.length);
  await freeze(page);
  await expect(page).toHaveScreenshot('tracking.png', { maxDiffPixelRatio: 0.02 });
});

test('nutrition goals screenshot', async ({ page }) => {
  await seedPlanning(page, { nutritionGoals: GOALS });
  await page.goto('/tracking/goals/');
  await page.waitForLoadState('networkidle');
  await expect(page.getByTestId('goals-form')).toHaveAttribute('data-status', 'ready');
  await expect(page.locator('[data-goal="calories"]').getByRole('textbox')).toHaveValue('1,800');
  await expect(page.getByTestId('goals-macro-legend')).toBeVisible();
  await freeze(page);
  await expect(page).toHaveScreenshot('goals.png', { maxDiffPixelRatio: 0.02 });
});

test('progress dashboard screenshot', async ({ page }) => {
  await seedPlanning(page, { trackingEntries: TRACKING_HISTORY, nutritionGoals: GOALS });
  await page.goto('/tracking/progress/');
  await page.waitForLoadState('networkidle');
  const dashboard = page.getByTestId('progress-dashboard');
  await dashboard.scrollIntoViewIfNeeded();
  await expect(dashboard).toHaveAttribute('data-status', 'ready');
  await page.getByRole('button', { name: 'Month' }).click();
  await expect(page.getByTestId('progress-view')).toHaveAttribute('data-view', 'month');
  await expect(page.getByTestId('progress-view')).toHaveAttribute('data-logged-days', '12');
  await expect(page.getByTestId('progress-most-logged-value')).toHaveText('Banana Pancakes');
  await expect(page.getByTestId('progress-calories-chart').locator('svg').first()).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.mouse.move(0, 0);
  await freeze(page);
  await expect(page).toHaveScreenshot('progress.png', { maxDiffPixelRatio: 0.02 });
});
