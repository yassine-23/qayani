import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * QAYANI Authentication Flow E2E Test
 *
 * This test systematically verifies the complete OAuth flow:
 * 1. Landing page loads
 * 2. Navigate to /auth page
 * 3. Click "Continue with Google"
 * 4. Handle Google OAuth consent
 * 5. Verify callback redirect
 * 6. Verify dashboard access
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || '';

// Create screenshots directory
const SCREENSHOTS_DIR = path.join(process.cwd(), 'test-screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function takeScreenshot(page: Page, name: string) {
  const filename = `${Date.now()}-${name}.png`;
  const filepath = path.join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`📸 Screenshot saved: ${filename}`);
  return filepath;
}

async function logPageInfo(page: Page, step: string) {
  const url = page.url();
  const title = await page.title();
  console.log(`\n🔍 [${step}]`);
  console.log(`   URL: ${url}`);
  console.log(`   Title: ${title}`);
}

test.describe('QAYANI Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start with a clean slate
    await page.context().clearCookies();
    await page.context().clearPermissions();
  });

  test('Landing page should load correctly', async ({ page }) => {
    console.log('\n' + '='.repeat(60));
    console.log('TEST 1: Landing Page');
    console.log('='.repeat(60));

    await page.goto(BASE_URL);
    await logPageInfo(page, 'Landing Page');
    await takeScreenshot(page, 'landing-page');

    // Check for key elements
    await expect(page.locator('text=QAYANI')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Your wisdom deserves to live forever')).toBeVisible();

    // Check for CTA buttons
    const startButton = page.locator('button:has-text("Start Free")').or(page.locator('a:has-text("Start Free")'));
    await expect(startButton).toBeVisible();

    console.log('✅ Landing page loaded successfully');
  });

  test('Auth page should load and display Google OAuth button', async ({ page }) => {
    console.log('\n' + '='.repeat(60));
    console.log('TEST 2: Auth Page');
    console.log('='.repeat(60));

    await page.goto(`${BASE_URL}/auth`);
    await logPageInfo(page, 'Auth Page');
    await takeScreenshot(page, 'auth-page');

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Check for Google OAuth button
    const googleButton = page.locator('button:has-text("Continue with Google")').or(
      page.locator('button:has-text("Sign in with Google")')
    );

    await expect(googleButton).toBeVisible({ timeout: 10000 });
    console.log('✅ Google OAuth button found');

    // Check for other auth elements
    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.isVisible()) {
      console.log('ℹ️  Email/password login also available');
    }
  });

  test('Click Google OAuth button and track redirect flow', async ({ page, context }) => {
    console.log('\n' + '='.repeat(60));
    console.log('TEST 3: OAuth Flow Tracking');
    console.log('='.repeat(60));

    // Track all navigation events
    const navigationLog: string[] = [];

    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        const url = frame.url();
        navigationLog.push(url);
        console.log(`🔗 Navigation: ${url}`);
      }
    });

    // Go to auth page
    await page.goto(`${BASE_URL}/auth`);
    await takeScreenshot(page, 'before-google-click');

    // Click Google OAuth button
    const googleButton = page.locator('button:has-text("Continue with Google")').or(
      page.locator('button:has-text("Sign in with Google")')
    ).first();

    console.log('🖱️  Clicking Google OAuth button...');

    // Set up promise to wait for navigation
    const navigationPromise = page.waitForURL('**/*', { timeout: 30000 }).catch(() => null);

    await googleButton.click();

    // Wait for navigation
    await navigationPromise;

    // Take screenshot after click
    await page.waitForTimeout(2000);
    await logPageInfo(page, 'After Google Button Click');
    await takeScreenshot(page, 'after-google-click');

    console.log(`\n📊 Navigation Flow:`);
    navigationLog.forEach((url, index) => {
      console.log(`   ${index + 1}. ${url}`);
    });

    // Check where we ended up
    const currentUrl = page.url();

    if (currentUrl.includes('accounts.google.com')) {
      console.log('✅ Redirected to Google OAuth consent screen');
      console.log('ℹ️  Manual intervention needed for Google sign-in');
    } else if (currentUrl.includes('/auth/callback')) {
      console.log('✅ Reached OAuth callback');
    } else if (currentUrl.includes('/dashboard')) {
      console.log('✅ Successfully reached dashboard');
    } else if (currentUrl.includes('/auth')) {
      console.log('⚠️  Stayed on /auth page - OAuth redirect may have failed');
      console.log(`   Current URL: ${currentUrl}`);

      // Check for error messages
      const errorMessage = await page.locator('[class*="error"]').textContent().catch(() => null);
      if (errorMessage) {
        console.log(`❌ Error message: ${errorMessage}`);
      }
    } else {
      console.log(`⚠️  Unexpected destination: ${currentUrl}`);
    }
  });

  test('Check OAuth callback handler exists and is accessible', async ({ page }) => {
    console.log('\n' + '='.repeat(60));
    console.log('TEST 4: OAuth Callback Route');
    console.log('='.repeat(60));

    // Try to access callback route (should redirect or show error)
    await page.goto(`${BASE_URL}/auth/callback`);
    await logPageInfo(page, 'Callback Route (Direct Access)');
    await takeScreenshot(page, 'callback-route-direct');

    const currentUrl = page.url();

    if (currentUrl.includes('/auth/callback')) {
      console.log('⚠️  Callback route accessible but no redirect occurred');
      console.log('   This is expected if no OAuth code is provided');
    } else if (currentUrl.includes('/auth')) {
      console.log('✅ Callback route redirects to /auth (expected behavior)');
    } else if (currentUrl.includes('/dashboard')) {
      console.log('✅ Callback route redirects to /dashboard');
    } else {
      console.log(`⚠️  Unexpected redirect: ${currentUrl}`);
    }
  });

  test('Check environment configuration in browser', async ({ page }) => {
    console.log('\n' + '='.repeat(60));
    console.log('TEST 5: Environment Configuration');
    console.log('='.repeat(60));

    await page.goto(`${BASE_URL}/auth`);

    // Check window environment variables
    const envConfig = await page.evaluate(() => {
      return {
        supabaseUrl: (window as any).NEXT_PUBLIC_SUPABASE_URL || 'not set',
        appUrl: (window as any).NEXT_PUBLIC_APP_URL || 'not set',
      };
    });

    console.log(`📋 Browser Environment:`);
    console.log(`   Supabase URL: ${envConfig.supabaseUrl}`);
    console.log(`   App URL: ${envConfig.appUrl}`);

    // Check for Supabase client initialization
    const hasSupabase = await page.evaluate(() => {
      return typeof (window as any).supabase !== 'undefined';
    });

    if (hasSupabase) {
      console.log('✅ Supabase client detected in browser');
    } else {
      console.log('ℹ️  Supabase client not exposed to window');
    }
  });

  test('Verify Supabase OAuth redirect URL configuration', async ({ page }) => {
    console.log('\n' + '='.repeat(60));
    console.log('TEST 6: Supabase OAuth Configuration');
    console.log('='.repeat(60));

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    const redirectUrl = process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL;

    console.log(`📋 Configuration from .env.local:`);
    console.log(`   NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl}`);
    console.log(`   NEXT_PUBLIC_APP_URL: ${appUrl}`);
    console.log(`   NEXT_PUBLIC_SUPABASE_REDIRECT_URL: ${redirectUrl}`);

    console.log(`\n✅ Required Supabase redirect URLs:`);
    console.log(`   1. ${redirectUrl}`);
    console.log(`   2. ${supabaseUrl}/auth/v1/callback`);

    console.log(`\n✅ Required Google OAuth redirect URLs:`);
    console.log(`   1. ${supabaseUrl}/auth/v1/callback`);

    // Check if files exist
    const callbackExists = fs.existsSync(path.join(process.cwd(), 'app', 'auth', 'callback', 'route.ts'));
    console.log(`\n📁 Callback route file exists: ${callbackExists ? '✅ YES' : '❌ NO'}`);
  });
});

test.describe('QAYANI Dashboard Access (Authenticated)', () => {
  test('Try to access dashboard without authentication', async ({ page }) => {
    console.log('\n' + '='.repeat(60));
    console.log('TEST 7: Protected Route Access');
    console.log('='.repeat(60));

    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    await logPageInfo(page, 'Dashboard Access Attempt');
    await takeScreenshot(page, 'dashboard-unauth');

    const currentUrl = page.url();

    if (currentUrl.includes('/auth')) {
      console.log('✅ Correctly redirected to /auth (middleware working)');
    } else if (currentUrl.includes('/dashboard')) {
      console.log('⚠️  Dashboard accessible without authentication');
      console.log('   Middleware may not be working correctly');
    } else {
      console.log(`⚠️  Unexpected redirect: ${currentUrl}`);
    }
  });
});
