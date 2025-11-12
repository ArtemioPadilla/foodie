import { test, expect } from '@playwright/test';

test.describe('Recipe Browsing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('loads homepage successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Foodie/);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('displays recipe cards', async ({ page }) => {
    await page.goto('/recipes');
    await expect(page.locator('[data-testid="recipe-card"]').first()).toBeVisible();
  });

  test('searches for recipes', async ({ page }) => {
    await page.goto('/recipes');

    const searchInput = page.locator('input[type="search"]');
    await searchInput.fill('chicken');
    await searchInput.press('Enter');

    await expect(page.locator('[data-testid="recipe-card"]')).toHaveCount(1, { timeout: 3000 });
  });

  test('filters recipes by category', async ({ page }) => {
    await page.goto('/recipes');

    // Click on dinner filter
    await page.click('text=Dinner');

    // Should show only dinner recipes
    await expect(page.locator('[data-testid="recipe-card"]')).toBeVisible();
  });

  test('opens recipe detail page', async ({ page }) => {
    await page.goto('/recipes');

    // Click first recipe
    await page.locator('[data-testid="recipe-card"]').first().click();

    // Should navigate to recipe detail
    await expect(page.url()).toContain('/recipe/');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('displays recipe ingredients and instructions', async ({ page }) => {
    await page.goto('/recipes');
    await page.locator('[data-testid="recipe-card"]').first().click();

    await expect(page.locator('text=Ingredients')).toBeVisible();
    await expect(page.locator('text=Instructions')).toBeVisible();
  });

  test('scales recipe servings', async ({ page }) => {
    await page.goto('/recipes');
    await page.locator('[data-testid="recipe-card"]').first().click();

    // Click increase servings button
    const increaseButton = page.locator('[data-testid="increase-servings"]');
    if (await increaseButton.isVisible()) {
      await increaseButton.click();

      // Servings should increase
      await expect(page.locator('[data-testid="servings-display"]')).toContainText('5');
    }
  });

  test('changes language', async ({ page }) => {
    await page.goto('/');

    // Click language selector
    await page.click('[data-testid="language-selector"]');
    await page.click('text=Español');

    // Content should be in Spanish
    await expect(page.locator('text=Recetas')).toBeVisible({ timeout: 2000 });
  });

  test('works offline (PWA)', async ({ page, context }) => {
    await page.goto('/recipes');
    await page.waitForLoadState('networkidle');

    // Go offline
    await context.setOffline(true);

    // Navigate to another page
    await page.goto('/');

    // Should still load from cache
    await expect(page.locator('h1')).toBeVisible();

    await context.setOffline(false);
  });
});
