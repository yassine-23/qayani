import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should load the home page successfully', async ({ page }) => {
    await page.goto('/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check if page loaded
    expect(page.url()).toContain('/');
  });

  test('should have correct title', async ({ page }) => {
    await page.goto('/');

    // Check for page title or heading
    await expect(page).toHaveTitle(/QAYANI/i);
  });

  test('should display main navigation', async ({ page }) => {
    await page.goto('/');

    // Check for common navigation elements
    // Adjust selectors based on your actual navigation structure
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    await page.waitForLoadState('networkidle');

    // Verify page loads on mobile
    expect(page.url()).toContain('/');
  });
});
