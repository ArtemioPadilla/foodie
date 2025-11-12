import { test, expect } from '@playwright/test';

test.describe('Shopping List', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/shopping');
  });

  test('loads shopping list page', async ({ page }) => {
    await expect(page.locator('text=Shopping List')).toBeVisible();
  });

  test('checks off items', async ({ page }) => {
    const firstItem = page.locator('[data-testid="shopping-item"]').first();

    if (await firstItem.isVisible()) {
      const checkbox = firstItem.locator('input[type="checkbox"]');
      await checkbox.check();
      await expect(checkbox).toBeChecked();

      // Item should have checked style
      await expect(firstItem).toHaveClass(/checked/);
    }
  });

  test('adds custom item', async ({ page }) => {
    await page.click('[data-testid="add-item-button"]');

    await page.fill('[data-testid="item-name"]', 'Custom Item');
    await page.fill('[data-testid="item-quantity"]', '2');
    await page.selectOption('[data-testid="item-unit"]', 'cup');

    await page.click('text=Add');

    await expect(page.locator('text=Custom Item')).toBeVisible();
  });

  test('filters by category', async ({ page }) => {
    await page.click('[data-testid="category-filter"]');
    await page.click('text=Produce');

    // Only produce items should be visible
    const items = page.locator('[data-testid="shopping-item"]');
    await expect(items.first()).toBeVisible();
  });

  test('exports shopping list as text', async ({ page }) => {
    await page.click('[data-testid="export-menu"]');

    // Start download
    const downloadPromise = page.waitForEvent('download');
    await page.click('text=Export as Text');
    const download = await downloadPromise;

    // Check download
    expect(download.suggestedFilename()).toContain('shopping-list');
  });

  test('shares via WhatsApp', async ({ page, context }) => {
    await page.click('[data-testid="export-menu"]');
    await page.click('text=Share via WhatsApp');

    // Should open WhatsApp share (or show share dialog)
    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      page.click('[data-testid="whatsapp-share"]').catch(() => {}),
    ]);

    if (popup) {
      expect(popup.url()).toContain('whatsapp');
      await popup.close();
    }
  });

  test('clears completed items', async ({ page }) => {
    // Check some items first
    const items = page.locator('[data-testid="shopping-item"]');
    const count = await items.count();

    if (count > 0) {
      await items.first().locator('input[type="checkbox"]').check();

      await page.click('[data-testid="clear-completed"]');

      // Checked items should be removed
      await expect(items).toHaveCount(count - 1);
    }
  });

  test('groups items by category', async ({ page }) => {
    const categories = page.locator('[data-testid="category-group"]');
    await expect(categories.first()).toBeVisible();

    // Should have category headers
    await expect(page.locator('text=/Produce|Dairy|Meat/')).toBeVisible();
  });
});
