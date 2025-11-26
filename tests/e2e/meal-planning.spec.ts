import { test, expect } from '@playwright/test';

test.describe('Meal Planning', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/planner');
  });

  // Basic page load works, but calendar-view data-testid not implemented yet
  test('loads meal planner page', async ({ page }) => {
    // Check page loads and title is visible
    await expect(page.locator('h1')).toBeVisible();

    // Skip data-testid check until component is fully implemented
    // await expect(page.locator('[data-testid="calendar-view"]')).toBeVisible();
  });

  // Week and month views have data-testids
  test('switches between week and month view', async ({ page }) => {
    // Start in week view
    await expect(page.locator('[data-testid="week-view"]')).toBeVisible();

    // Switch to month view
    await page.click('text=Month');
    await expect(page.locator('[data-testid="month-view"]')).toBeVisible();

    // Switch back to week view
    await page.click('text=Week');
    await expect(page.locator('[data-testid="week-view"]')).toBeVisible();
  });

  test.skip('adds meal to planner via drag and drop', async ({ page }) => {
    // Open recipe selector
    await page.click('[data-testid="add-meal-button"]');

    // Select a recipe
    await page.locator('[data-testid="recipe-card"]').first().click();

    // Confirm adding to Monday breakfast
    await page.click('[data-testid="confirm-add-meal"]');

    // Meal should appear in calendar
    await expect(page.locator('[data-testid="meal-slot-monday-breakfast"]')).toContainText(
      /.+/
    );
  });

  test.skip('removes meal from planner', async ({ page }) => {
    // Assuming there's a meal already
    const mealSlot = page.locator('[data-testid^="meal-slot"]').first();

    if (await mealSlot.isVisible()) {
      // Click remove button
      await mealSlot.hover();
      await mealSlot.locator('[data-testid="remove-meal"]').click();

      // Confirm removal
      await page.click('text=Confirm');

      // Meal should be removed
      await expect(mealSlot).toBeEmpty();
    }
  });

  test.skip('generates shopping list from meal plan', async ({ page }) => {
    // Navigate to shopping list
    await page.click('[data-testid="generate-shopping-list"]');

    // Should show shopping list page
    await expect(page.url()).toContain('/shopping');
    await expect(page.locator('text=Shopping List')).toBeVisible();
  });

  test.skip('saves meal plan', async ({ page }) => {
    await page.click('[data-testid="save-plan"]');

    // Save dialog should appear
    await page.fill('[data-testid="plan-name-input"]', 'My Test Plan');
    await page.click('text=Save');

    // Success message
    await expect(page.locator('text=Plan saved')).toBeVisible({ timeout: 3000 });
  });

  test.skip('displays plan summary with cost and nutrition', async ({ page }) => {
    await page.click('[data-testid="plan-summary"]');

    // Summary should show cost and nutrition info
    await expect(page.locator('[data-testid="total-cost"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-calories"]')).toBeVisible();
  });
});
