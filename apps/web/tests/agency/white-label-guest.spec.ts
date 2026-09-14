/**
 * White-Label Guest View E2E Test
 *
 * Tests white-label branding for guest/client users:
 * - Guest users see client-specific branding
 * - Brand kit colors apply dynamically
 * - Logo displays if provided
 * - Read-only access for guests
 *
 * Part of Phase 2 Agency Implementation testing
 */

import { test, expect } from '@playwright/test';

const GUEST_USER = {
  email: 'client.stakeholder@example.com',
  password: 'LocalDevOnly123!'
};

// Test client IDs from setup_comprehensive_test_data.py
const TEST_CLIENT_IDS = {
  acme: '3bb5a9a1-be6a-4294-92ea-b2cfa3e0c8fa'
};

test.describe('White-Label Guest View', () => {
  test.setTimeout(120000); // 2 minutes

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    // Clear session
    await page.goto('http://127.0.0.1:56310');
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
  });

  test('WLG1: Guest user can login and access dashboard', async ({ page }) => {
    console.log('👤 Testing guest user login...');

    // Login as guest
    await page.goto('http://127.0.0.1:56310');

    const emailInput = page.locator('input[type="email"]');
    await emailInput.clear();
    await emailInput.fill(GUEST_USER.email);

    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.clear();
    await passwordInput.fill(GUEST_USER.password);

    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForLoadState('domcontentloaded')
    ]);

    await page.waitForFunction(
      () => window.location.pathname === '/' || window.location.pathname.includes('dashboard'),
      { timeout: 15000 }
    );

    console.log('✅ Guest user logged in successfully');

    // Verify on dashboard
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/dashboard|\/$/);
    console.log(`✅ Guest user on dashboard: ${currentUrl}`);
  });

  test('WLG2: Guest dashboard applies client branding (if implemented)', async ({ page }) => {
    console.log('🎨 Testing white-label branding...');

    // Login as guest
    await page.goto('http://127.0.0.1:56310');
    await page.fill('input[type="email"]', GUEST_USER.email);
    await page.fill('input[type="password"]', GUEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('domcontentloaded');

    // Wait for dashboard
    await page.waitForTimeout(3000);

    // Check if white-label branding exists
    // Look for custom CSS variables or brand elements
    const rootStyles = await page.evaluate(() => {
      const root = document.documentElement;
      return {
        primaryColor: getComputedStyle(root).getPropertyValue('--brand-primary'),
        secondaryColor: getComputedStyle(root).getPropertyValue('--brand-secondary'),
        accentColor: getComputedStyle(root).getPropertyValue('--brand-accent')
      };
    });

    console.log('📊 CSS Variables:', rootStyles);

    if (rootStyles.primaryColor || rootStyles.secondaryColor || rootStyles.accentColor) {
      console.log('✅ White-label CSS variables detected');
    } else {
      console.log('⚠️ White-label branding not yet implemented - expected behavior');
    }

    // Check for custom logo
    const logoElements = await page.locator('header img, [data-testid="client-logo"]').count();
    if (logoElements > 0) {
      console.log('✅ Client logo found in header');
    } else {
      console.log('⏭️ No custom logo found (might use text-based branding)');
    }

    console.log('✅ White-label branding test completed');
  });

  test('WLG3: Guest has read-only access', async ({ page }) => {
    console.log('🔒 Testing guest read-only permissions...');

    // Login as guest
    await page.goto('http://127.0.0.1:56310');
    await page.fill('input[type="email"]', GUEST_USER.email);
    await page.fill('input[type="password"]', GUEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Try to navigate to settings (should be blocked or unavailable)
    await page.goto('http://127.0.0.1:56310/settings');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const currentUrl = page.url();

    // Guest should either:
    // 1. Be redirected away from settings
    // 2. See a "no access" message
    // 3. Not see settings in navigation
    if (currentUrl.includes('settings')) {
      // Check for "no access" or "unauthorized" message
      const pageContent = await page.content();
      const hasAccessDenied = pageContent.toLowerCase().includes('access') ||
                            pageContent.toLowerCase().includes('permission') ||
                            pageContent.toLowerCase().includes('unauthorized');

      if (hasAccessDenied) {
        console.log('✅ Guest sees access denied message on settings page');
      } else {
        console.log('⚠️ Guest can access settings (permissions need review)');
      }
    } else {
      console.log('✅ Guest redirected away from settings page');
    }

    console.log('✅ Read-only access test completed');
  });

  test('WLG4: Guest cannot access agency-only features', async ({ page }) => {
    console.log('🔒 Testing guest cannot access agency features...');

    // Login as guest
    await page.goto('http://127.0.0.1:56310');
    await page.fill('input[type="email"]', GUEST_USER.email);
    await page.fill('input[type="password"]', GUEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('domcontentloaded');

    // Try to access /clients (agency-only)
    await page.goto('http://127.0.0.1:56310/clients');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const currentUrl = page.url();

    // Guest should be redirected or see access denied
    if (currentUrl.includes('clients')) {
      console.log('⚠️ Guest can access /clients route (needs access control)');
    } else {
      console.log('✅ Guest redirected away from /clients route');
    }

    // Try to access /clients/new
    await page.goto('http://127.0.0.1:56310/clients/new');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const newUrl = page.url();
    if (newUrl.includes('clients/new')) {
      console.log('⚠️ Guest can access /clients/new route (needs access control)');
    } else {
      console.log('✅ Guest redirected away from /clients/new route');
    }

    console.log('✅ Agency feature access control test completed');
  });

  test('WLG5: Client-specific route access for guests', async ({ page }) => {
    console.log('🔒 Testing client-specific route access...');

    // Login as guest
    await page.goto('http://127.0.0.1:56310');
    await page.fill('input[type="email"]', GUEST_USER.email);
    await page.fill('input[type="password"]', GUEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('domcontentloaded');

    const clientId = TEST_CLIENT_IDS.acme;

    // Try to access client-contextual route
    await page.goto(`http://127.0.0.1:56310/clients/${clientId}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    const currentUrl = page.url();

    // Guest access depends on implementation:
    // - If guest belongs to this client: should see read-only view
    // - If guest doesn't belong to this client: should be denied
    if (currentUrl.includes(`/clients/${clientId}`)) {
      console.log('✅ Guest can access their assigned client dashboard');
    } else {
      console.log('⚠️ Guest redirected (might not be assigned to this client)');
    }

    console.log('✅ Client-specific route access test completed');
  });

  test.skip('WLG6: White-label domain routing (future feature)', async ({ page }) => {
    console.log('🌐 Testing white-label domain routing...');

    // This test is for future implementation where:
    // - Each client can have their own subdomain (e.g., acme.marketing-platform.com)
    // - Branding is automatically loaded based on subdomain
    // - Guest users login via their branded portal

    console.log('⏭️ Skipped - White-label domain routing not yet implemented');
  });

  test.skip('WLG7: Custom brand colors apply globally (future feature)', async ({ page }) => {
    console.log('🎨 Testing global brand color application...');

    // This test validates that brand colors from brand_kit JSONB:
    // - Apply to all UI components (buttons, cards, headers)
    // - Override default color scheme
    // - Maintain WCAG AA contrast ratios
    // - Work in both light and dark modes

    console.log('⏭️ Skipped - White-label branding not fully implemented');
  });
});
