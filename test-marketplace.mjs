import { chromium } from 'playwright';

async function testMarketplace() {
  console.log('🚀 Starting Marketplace Test...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    // Test 1: Dashboard Navigation
    console.log('✓ Test 1: Loading Dashboard...');
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/dashboard.png', fullPage: true });
    console.log('  ✅ Dashboard loaded successfully');

    // Check for Avatar Store button
    const avatarStoreButton = await page.locator('text=Avatar Store').count();
    console.log(`  ${avatarStoreButton > 0 ? '✅' : '❌'} Avatar Store button found: ${avatarStoreButton > 0}`);

    // Test 2: Marketplace Page
    console.log('\n✓ Test 2: Loading Marketplace...');
    await page.goto('http://localhost:3000/dashboard/avatar/marketplace');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for any animations
    await page.screenshot({ path: 'screenshots/marketplace.png', fullPage: true });
    console.log('  ✅ Marketplace loaded successfully');

    // Check key elements
    const marketplaceTitle = await page.locator('text=Avatar Marketplace').count();
    const categories = await page.locator('text=Realistic').count();
    const searchBox = await page.locator('input[type="text"]').count();

    console.log(`  ${marketplaceTitle > 0 ? '✅' : '❌'} Marketplace title found`);
    console.log(`  ${categories > 0 ? '✅' : '❌'} Categories displayed`);
    console.log(`  ${searchBox > 0 ? '✅' : '❌'} Search functionality present`);

    // Test 3: Sell Avatar Page
    console.log('\n✓ Test 3: Loading Sell Avatar Page...');
    await page.goto('http://localhost:3000/dashboard/avatar/sell');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/sell-avatar.png', fullPage: true });
    console.log('  ✅ Sell Avatar page loaded successfully');

    const sellTitle = await page.locator('text=Sell Your Avatar').count();
    const stepIndicator = await page.locator('text=Details').count();

    console.log(`  ${sellTitle > 0 ? '✅' : '❌'} Sell page title found`);
    console.log(`  ${stepIndicator > 0 ? '✅' : '❌'} Step wizard present`);

    // Test 4: Navigation between pages
    console.log('\n✓ Test 4: Testing Navigation...');
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForLoadState('networkidle');

    // Click Avatar Store if it exists
    const avatarStoreLink = page.locator('text=Avatar Store').first();
    if (await avatarStoreLink.count() > 0) {
      await avatarStoreLink.click();
      await page.waitForLoadState('networkidle');
      const currentUrl = page.url();
      console.log(`  ${currentUrl.includes('marketplace') ? '✅' : '❌'} Navigation to marketplace works`);
    }

    console.log('\n🎉 All tests completed!\n');
    console.log('📸 Screenshots saved to screenshots/ directory');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

// Create screenshots directory
import { mkdirSync } from 'fs';
try {
  mkdirSync('screenshots', { recursive: true });
} catch (e) {}

testMarketplace();
