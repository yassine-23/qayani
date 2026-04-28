import { test, expect } from '@playwright/test';

test.describe('Onboarding Flow', () => {
  test('should load onboarding page', async ({ page }) => {
    await page.goto('/onboarding');
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/onboarding');
  });

  test('should navigate to welcome step', async ({ page }) => {
    await page.goto('/onboarding/steps/welcome');
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/onboarding/steps/welcome');
  });

  test('should navigate to avatar step', async ({ page }) => {
    await page.goto('/onboarding/steps/avatar');
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/onboarding/steps/avatar');
  });

  test('should navigate to voice step', async ({ page }) => {
    await page.goto('/onboarding/steps/voice');
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/onboarding/steps/voice');
  });

  test('should navigate to personality step', async ({ page }) => {
    await page.goto('/onboarding/steps/personality');
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/onboarding/steps/personality');
  });

  test('should navigate to complete step', async ({ page }) => {
    await page.goto('/onboarding/steps/complete');
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/onboarding/steps/complete');
  });

  test('should handle step navigation flow', async ({ page }) => {
    const steps = [
      '/onboarding/steps/welcome',
      '/onboarding/steps/avatar',
      '/onboarding/steps/voice',
      '/onboarding/steps/personality',
      '/onboarding/steps/complete'
    ];

    for (const step of steps) {
      await page.goto(step);
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain(step);
    }
  });
});
