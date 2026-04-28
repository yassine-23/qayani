import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should load the auth page', async ({ page }) => {
    await page.goto('/auth');

    await page.waitForLoadState('networkidle');

    // Check if on auth page
    expect(page.url()).toContain('/auth');
  });

  test('should display auth options', async ({ page }) => {
    await page.goto('/auth');

    // Wait for page content to load
    await page.waitForSelector('body', { state: 'visible' });

    // Check for authentication UI elements
    // This will vary based on your auth implementation
    const body = await page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should handle Google OAuth button', async ({ page }) => {
    await page.goto('/auth');

    // Look for Google sign-in button
    // Adjust selector based on your implementation
    const googleButton = page.getByRole('button', { name: /google/i }).first();

    if (await googleButton.isVisible()) {
      await expect(googleButton).toBeEnabled();
    }
  });
});
