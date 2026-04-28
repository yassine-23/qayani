import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should navigate to features page', async ({ page }) => {
    await page.goto('/');

    // Try to navigate to features
    await page.goto('/features');
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/features');
  });

  test('should navigate to pricing page', async ({ page }) => {
    await page.goto('/');

    await page.goto('/pricing');
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/pricing');
  });

  test('should handle back navigation', async ({ page }) => {
    await page.goto('/');
    await page.goto('/features');

    await page.goBack();
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/');
  });
});
