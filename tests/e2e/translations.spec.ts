import { test, expect } from '@playwright/test';

test.describe('Translation Loading in Production', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to home page
    await page.goto('/');

    // Wait for translations to load
    await page.waitForLoadState('networkidle');

    // Additional wait to ensure translations are applied
    await page.waitForTimeout(500);
  });

  test('should not display translation keys on the page', async ({ page }) => {
    // Get all text content from the page
    const bodyText = await page.textContent('body');

    // Check that we don't see common translation keys
    expect(bodyText).not.toContain('app.name');
    expect(bodyText).not.toContain('app.tagline');
    expect(bodyText).not.toContain('nav.home');
    expect(bodyText).not.toContain('nav.recipes');
    expect(bodyText).not.toContain('nav.planner');
    expect(bodyText).not.toContain('nav.shopping');
    expect(bodyText).not.toContain('nav.pantry');
    expect(bodyText).not.toContain('nav.contribute');
  });

  test('should display actual translated text', async ({ page }) => {
    const bodyText = await page.textContent('body');

    // Check that actual translations are present (English)
    expect(bodyText).toContain('Foodie');
    expect(bodyText).toContain('Home');
    expect(bodyText).toContain('Recipes');
    expect(bodyText).toContain('Meal Planner');
  });

  test('should load translation files from correct path with base URL', async ({ page }) => {
    const translationRequests: string[] = [];

    // Intercept translation file requests
    page.on('request', request => {
      const url = request.url();
      if (url.includes('/locales/') && url.endsWith('/translation.json')) {
        translationRequests.push(url);
      }
    });

    // Reload to trigger translation loading
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should have made requests for translation files
    expect(translationRequests.length).toBeGreaterThan(0);

    // All translation requests should include the base path
    translationRequests.forEach(url => {
      // Should contain /foodie/locales/ (with base path)
      expect(url).toContain('/foodie/locales/');

      // Should NOT be requesting from root /locales/
      expect(url).not.toMatch(/^https?:\/\/[^/]+\/locales\//);
    });
  });

  test('should successfully load all three language files', async ({ page }) => {
    const loadedLanguages = new Set<string>();

    page.on('response', async response => {
      const url = response.url();
      if (url.includes('/locales/') && url.endsWith('/translation.json')) {
        // Extract language code from URL
        const match = url.match(/\/locales\/([a-z]{2})\//);
        if (match && response.ok()) {
          loadedLanguages.add(match[1]);
        }
      }
    });

    // Reload to trigger translation loading
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Should have loaded at least English (may lazy-load others)
    expect(loadedLanguages.size).toBeGreaterThanOrEqual(1);
    expect(loadedLanguages.has('en')).toBe(true);
  });

  test('should switch languages correctly', async ({ page }) => {
    // Verify English is loaded
    await expect(page.locator('body')).toContainText('Home');

    // Find and click language selector
    const languageSelector = page.locator('select[aria-label*="language"], select[name="language"], button:has-text("English")');

    if (await languageSelector.count() > 0) {
      // If it's a select dropdown
      if (await languageSelector.first().evaluate(el => el.tagName === 'SELECT')) {
        await languageSelector.first().selectOption('es');
      } else {
        // If it's a button/menu
        await languageSelector.first().click();
        await page.click('text=Español');
      }

      // Wait for language change
      await page.waitForTimeout(500);

      // Check Spanish translations
      const bodyText = await page.textContent('body');
      expect(bodyText).toContain('Inicio'); // Spanish for "Home"
      expect(bodyText).toContain('Recetas'); // Spanish for "Recipes"
    }
  });

  test('should not show translation keys in navigation menu', async ({ page }) => {
    // Get all navigation links
    const navLinks = page.locator('nav a, header a');
    const count = await navLinks.count();

    for (let i = 0; i < count; i++) {
      const linkText = await navLinks.nth(i).textContent();
      if (linkText) {
        // Should not match pattern nav.something
        expect(linkText).not.toMatch(/^nav\.[a-z]+$/);
      }
    }
  });

  test('should not show translation keys in hero section', async ({ page }) => {
    // Find the main heading
    const heading = page.locator('h1').first();
    const headingText = await heading.textContent();

    // Should not be a translation key
    expect(headingText).not.toMatch(/^[a-z]+\.[a-z]+$/);
    expect(headingText).toBeTruthy();
    expect(headingText!.length).toBeGreaterThan(0);
  });

  test('should not show translation keys in feature cards', async ({ page }) => {
    // Find all headings in feature cards
    const featureHeadings = page.locator('h2, h3');
    const count = await featureHeadings.count();

    for (let i = 0; i < count; i++) {
      const text = await featureHeadings.nth(i).textContent();
      if (text && text.trim()) {
        // Should not be a translation key
        expect(text).not.toMatch(/^[a-z]+\.[a-z]+(\.[a-z]+)?$/);
      }
    }
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Block translation file requests to simulate network error
    await page.route('**/locales/**', route => route.abort());

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Page should still render (may show translation keys as fallback)
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    expect(bodyText!.length).toBeGreaterThan(0);
  });
});

test.describe('Translation Loading on Different Routes', () => {
  test('should load translations on recipes page', async ({ page }) => {
    await page.goto('/recipes');
    await page.waitForLoadState('networkidle');

    const bodyText = await page.textContent('body');

    // Should not show keys
    expect(bodyText).not.toContain('recipe.title');
    expect(bodyText).not.toContain('filter.mealType');

    // Should show actual text
    expect(bodyText).not.toBeNull();
  });

  test('should load translations on planner page', async ({ page }) => {
    await page.goto('/planner');
    await page.waitForLoadState('networkidle');

    const bodyText = await page.textContent('body');

    // Should not show keys
    expect(bodyText).not.toContain('planner.createPlan');
    expect(bodyText).not.toContain('planner.weekView');
  });

  test('should load translations on shopping list page', async ({ page }) => {
    await page.goto('/shopping');
    await page.waitForLoadState('networkidle');

    const bodyText = await page.textContent('body');

    // Should not show keys
    expect(bodyText).not.toContain('shopping.title');
    expect(bodyText).not.toContain('shopping.addItem');
  });
});
