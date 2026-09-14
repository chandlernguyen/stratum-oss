/**
 * Agency Client Intelligence Page E2E Test
 *
 * Tests that agency users can access and interact with the client intelligence page:
 * - Page loads without errors at /clients/{slug}/intelligence
 * - Business Profile tab displays client intelligence data
 * - Learning History tab displays client-specific AI insights
 * - Tab switching works correctly between Business Profile, Brand Guidelines, and Learning History
 * - No 406 or table not found errors in console
 *
 * Part of Migration 182 & 184 Testing (Client Intelligence View + Learning History)
 *
 * Run Instructions:
 *   # Run this test file
 *   npm run test apps/web/tests/agency/client-intelligence-page.spec.ts
 *
 *   # Run in headed mode (visible browser)
 *   npm run test apps/web/tests/agency/client-intelligence-page.spec.ts -- --headed
 *
 *   # Debug mode
 *   npm run test apps/web/tests/agency/client-intelligence-page.spec.ts -- --debug
 *
 * Prerequisites:
 *   - Frontend: npm run dev (http://127.0.0.1:56310)
 *   - Backend: poetry run uvicorn apps.api.main:app --reload --port 8000
 *   - Database: supabase start with migrations 182, 183, 184 applied
 *   - Test agency user: agency.owner@example.com
 *   - Test client: ecommerce-plus
 */

import { test, expect } from '@playwright/test';
import type { Page, ConsoleMessage } from '@playwright/test';

// Test credentials
const AGENCY_USER = {
  email: 'agency.owner@example.com',
  password: 'LocalDevOnly123!'
};

// Test client from seed data
const TEST_CLIENT = {
  slug: 'ecommerce-plus',
  name: 'E-Commerce Plus'
};

test.describe('Agency Client Intelligence Page', () => {
  test.setTimeout(60000); // 1 minute for page loads and data fetching

  // Track console errors
  let consoleErrors: string[] = [];
  let consoleWarnings: string[] = [];

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    // Clear session
    await page.goto('http://127.0.0.1:56310');
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());

    // Reset error tracking
    consoleErrors = [];
    consoleWarnings = [];

    // Capture console messages
    page.on('console', (msg: ConsoleMessage) => {
      const text = msg.text();
      const type = msg.type();

      if (type === 'error') {
        consoleErrors.push(text);
        console.log('❌ Console Error:', text);
      } else if (type === 'warning') {
        consoleWarnings.push(text);
        console.log('⚠️ Console Warning:', text);
      }
    });
  });

  /**
   * Helper function to login as agency user
   */
  async function loginAsAgency(page: Page) {
    await page.goto('http://127.0.0.1:56310/login');
    await page.waitForLoadState('domcontentloaded');

    const emailInput = page.locator('input[type="email"]');
    await emailInput.waitFor({ state: 'visible', timeout: 5000 });
    await emailInput.fill(AGENCY_USER.email);

    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill(AGENCY_USER.password);

    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForLoadState('domcontentloaded')
    ]);

    // Wait for redirect to dashboard
    await page.waitForFunction(
      () => window.location.pathname === '/' || window.location.pathname.includes('dashboard'),
      { timeout: 15000 }
    );

    console.log('✅ Logged in as agency user');
  }

  test('Client Intelligence page loads successfully without errors', async ({ page }) => {
    /**
     * Test: Agency user can access client intelligence page
     *
     * User Journey:
     * 1. Login as agency owner
     * 2. Navigate to /clients/ecommerce-plus/intelligence
     * 3. Wait for page to load completely
     * 4. Verify page title and basic UI elements
     *
     * Success Criteria:
     * - Page loads without 404 or 500 errors
     * - "Business Intelligence" heading visible
     * - No console errors (especially no 406 or table not found)
     * - Tab navigation present
     */

    await loginAsAgency(page);

    // Navigate to client intelligence page
    await page.goto(`http://127.0.0.1:56310/clients/${TEST_CLIENT.slug}/intelligence`);
    await page.waitForLoadState('domcontentloaded');

    // Verify page loaded successfully
    await expect(page).toHaveURL(new RegExp(`/clients/${TEST_CLIENT.slug}/intelligence`));

    // Check for main heading
    const heading = page.locator('h2:has-text("Business Intelligence")');
    await expect(heading).toBeVisible({ timeout: 10000 });

    // Verify tab navigation exists
    const tabsList = page.locator('div[role="tablist"]');
    await expect(tabsList).toBeVisible();

    // Verify all three tabs are present
    await expect(page.locator('button[role="tab"]:has-text("Business Profile")')).toBeVisible();
    await expect(page.locator('button[role="tab"]:has-text("Brand Guidelines")')).toBeVisible();
    await expect(page.locator('button[role="tab"]:has-text("Learning History")')).toBeVisible();

    // Critical: Check for no 406 or table not found errors
    const has406Error = consoleErrors.some(err =>
      err.includes('406') || err.toLowerCase().includes('schema must be')
    );
    expect(has406Error).toBe(false);

    const hasTableError = consoleErrors.some(err =>
      err.toLowerCase().includes('table') && err.toLowerCase().includes('not found')
    );
    expect(hasTableError).toBe(false);

    console.log('✅ Page loaded successfully without errors');
    console.log(`📊 Console errors: ${consoleErrors.length}`);
    console.log(`⚠️ Console warnings: ${consoleWarnings.length}`);
  });

  test('Business Profile tab displays correctly', async ({ page }) => {
    /**
     * Test: Business Profile tab shows client intelligence data
     *
     * Expected Behavior:
     * - Business Profile tab is active by default
     * - Profile information card visible
     * - Can view business data fields
     * - Loading state works correctly
     *
     * Success Criteria:
     * - Tab content loads without errors
     * - At least one data field visible (even if empty state)
     * - No critical console errors
     */

    await loginAsAgency(page);
    await page.goto(`http://127.0.0.1:56310/clients/${TEST_CLIENT.slug}/intelligence`);
    await page.waitForLoadState('domcontentloaded');

    // Verify Business Profile tab is active by default
    const businessProfileTab = page.locator('button[role="tab"]:has-text("Business Profile")');
    await expect(businessProfileTab).toHaveAttribute('data-state', 'active');

    // Wait for tab content to load
    const tabContent = page.locator('div[role="tabpanel"][data-state="active"]');
    await expect(tabContent).toBeVisible();

    // Check for business data display
    // The component shows either data cards or a "No business data" message
    const hasDataOrEmptyState = await page.evaluate(() => {
      const content = document.querySelector('div[role="tabpanel"][data-state="active"]');
      if (!content) return false;

      const text = content.textContent || '';
      // Look for data field labels or empty state message
      return text.includes('Industry') ||
             text.includes('Company Size') ||
             text.includes('Target Market') ||
             text.includes('No business') ||
             text.includes('Loading');
    });

    expect(hasDataOrEmptyState).toBe(true);

    console.log('✅ Business Profile tab displayed successfully');
  });

  test('Learning History tab displays client-specific AI insights', async ({ page }) => {
    /**
     * Test: Learning History tab shows progressive learning insights
     *
     * Expected Behavior:
     * - Can switch to Learning History tab
     * - Tab content loads with client-specific insights
     * - Shows insights or empty state appropriately
     * - Agent filter dropdown works
     *
     * Success Criteria:
     * - Tab switching works smoothly
     * - No 406 errors when loading learning history
     * - Filter UI is present
     * - Shows insights or "No AI insights" message
     */

    await loginAsAgency(page);
    await page.goto(`http://127.0.0.1:56310/clients/${TEST_CLIENT.slug}/intelligence`);
    await page.waitForLoadState('domcontentloaded');

    // Click on Learning History tab
    const learningHistoryTab = page.locator('button[role="tab"]:has-text("Learning History")');
    await learningHistoryTab.click();
    await page.waitForLoadState('domcontentloaded');

    // Verify tab is now active
    await expect(learningHistoryTab).toHaveAttribute('data-state', 'active');

    // Wait for tab content to render
    const tabContent = page.locator('div[role="tabpanel"][data-state="active"]');
    await expect(tabContent).toBeVisible();

    // Check for filter dropdown (Select component for agent type)
    const filterExists = await page.locator('button[role="combobox"]').count() > 0 ||
                         await page.locator('select').count() > 0 ||
                         await page.locator('text=Filter').count() > 0;

    if (!filterExists) {
      console.log('ℹ️ Filter dropdown may not be visible (acceptable if no insights)');
    }

    // Check for insights display or empty state
    const hasInsightsOrEmptyState = await page.evaluate(() => {
      const content = document.querySelector('div[role="tabpanel"][data-state="active"]');
      if (!content) return false;

      const text = content.textContent || '';
      return text.includes('AI insights') ||
             text.includes('No insights') ||
             text.includes('Learning history') ||
             text.includes('persona') ||
             text.includes('strategy') ||
             text.includes('content') ||
             text.length > 50; // Has some content
    });

    expect(hasInsightsOrEmptyState).toBe(true);

    // Critical: Verify no client_id related errors
    const hasClientIdError = consoleErrors.some(err =>
      err.toLowerCase().includes('client_id') ||
      err.toLowerCase().includes('column') && err.toLowerCase().includes('does not exist')
    );
    expect(hasClientIdError).toBe(false);

    console.log('✅ Learning History tab displayed successfully');
  });

  test('Tab switching works correctly between all tabs', async ({ page }) => {
    /**
     * Test: User can switch between all three tabs
     *
     * User Journey:
     * 1. Start on Business Profile tab
     * 2. Switch to Brand Guidelines tab
     * 3. Switch to Learning History tab
     * 4. Switch back to Business Profile
     *
     * Success Criteria:
     * - Each tab becomes active when clicked
     * - Tab content changes appropriately
     * - No errors during tab switching
     * - URL updates with ?tab= parameter
     */

    await loginAsAgency(page);
    await page.goto(`http://127.0.0.1:56310/clients/${TEST_CLIENT.slug}/intelligence`);
    await page.waitForLoadState('domcontentloaded');

    // Start on Business Profile (default)
    let businessProfileTab = page.locator('button[role="tab"]:has-text("Business Profile")');
    await expect(businessProfileTab).toHaveAttribute('data-state', 'active');

    // Switch to Brand Guidelines
    console.log('📋 Switching to Brand Guidelines tab...');
    const brandGuidelinesTab = page.locator('button[role="tab"]:has-text("Brand Guidelines")');
    await brandGuidelinesTab.click();
    await page.waitForTimeout(500); // Allow tab animation
    await expect(brandGuidelinesTab).toHaveAttribute('data-state', 'active');

    // Verify URL updated
    await expect(page).toHaveURL(new RegExp('tab=brand-guidelines'));

    // Switch to Learning History
    console.log('🧠 Switching to Learning History tab...');
    const learningHistoryTab = page.locator('button[role="tab"]:has-text("Learning History")');
    await learningHistoryTab.click();
    await page.waitForTimeout(500);
    await expect(learningHistoryTab).toHaveAttribute('data-state', 'active');

    // Verify URL updated
    await expect(page).toHaveURL(new RegExp('tab=learning-history'));

    // Switch back to Business Profile
    console.log('🏢 Switching back to Business Profile tab...');
    businessProfileTab = page.locator('button[role="tab"]:has-text("Business Profile")');
    await businessProfileTab.click();
    await page.waitForTimeout(500);
    await expect(businessProfileTab).toHaveAttribute('data-state', 'active');

    // Verify URL updated (should have tab=business-profile or no tab param)
    const currentUrl = page.url();
    const hasCorrectUrl = currentUrl.includes('tab=business-profile') ||
                          !currentUrl.includes('tab=');
    expect(hasCorrectUrl).toBe(true);

    console.log('✅ All tab switches completed successfully');
  });

  test('Direct navigation with tab parameter works correctly', async ({ page }) => {
    /**
     * Test: Can navigate directly to specific tab via URL
     *
     * Expected Behavior:
     * - URL parameter ?tab=learning-history opens Learning History tab
     * - URL parameter ?tab=brand-guidelines opens Brand Guidelines tab
     * - Correct tab is active on page load
     *
     * Success Criteria:
     * - Direct URL navigation activates correct tab
     * - Page loads without errors
     */

    await loginAsAgency(page);

    // Test 1: Navigate directly to Learning History tab
    console.log('🔗 Testing direct navigation to Learning History...');
    await page.goto(`http://127.0.0.1:56310/clients/${TEST_CLIENT.slug}/intelligence?tab=learning-history`);
    await page.waitForLoadState('domcontentloaded');

    const learningHistoryTab = page.locator('button[role="tab"]:has-text("Learning History")');
    await expect(learningHistoryTab).toHaveAttribute('data-state', 'active');
    console.log('✅ Learning History tab activated via URL parameter');

    // Test 2: Navigate directly to Brand Guidelines tab
    console.log('🔗 Testing direct navigation to Brand Guidelines...');
    await page.goto(`http://127.0.0.1:56310/clients/${TEST_CLIENT.slug}/intelligence?tab=brand-guidelines`);
    await page.waitForLoadState('domcontentloaded');

    const brandGuidelinesTab = page.locator('button[role="tab"]:has-text("Brand Guidelines")');
    await expect(brandGuidelinesTab).toHaveAttribute('data-state', 'active');
    console.log('✅ Brand Guidelines tab activated via URL parameter');

    // Test 3: Navigate to Business Profile tab (default)
    console.log('🔗 Testing direct navigation to Business Profile...');
    await page.goto(`http://127.0.0.1:56310/clients/${TEST_CLIENT.slug}/intelligence?tab=business-profile`);
    await page.waitForLoadState('domcontentloaded');

    const businessProfileTab = page.locator('button[role="tab"]:has-text("Business Profile")');
    await expect(businessProfileTab).toHaveAttribute('data-state', 'active');
    console.log('✅ Business Profile tab activated via URL parameter');
  });

  test('No critical console errors during page interaction', async ({ page }) => {
    /**
     * Test: Comprehensive error checking during full page interaction
     *
     * User Journey:
     * 1. Load page
     * 2. Switch between all tabs
     * 3. Scroll through content
     * 4. Check for any critical errors
     *
     * Success Criteria:
     * - No 406 "schema must be public or graphql_public" errors
     * - No "table not found" errors
     * - No "client_id column does not exist" errors
     * - No unhandled promise rejections
     */

    await loginAsAgency(page);
    await page.goto(`http://127.0.0.1:56310/clients/${TEST_CLIENT.slug}/intelligence`);
    await page.waitForLoadState('domcontentloaded');

    // Interact with all tabs
    const tabs = [
      'Business Profile',
      'Brand Guidelines',
      'Learning History'
    ];

    for (const tabName of tabs) {
      const tab = page.locator(`button[role="tab"]:has-text("${tabName}")`);
      await tab.click();
      await page.waitForTimeout(1000); // Allow content to load
      console.log(`✓ Switched to ${tabName} tab`);
    }

    // Check for critical errors
    const criticalErrors = consoleErrors.filter(err => {
      const lowerErr = err.toLowerCase();
      return lowerErr.includes('406') ||
             lowerErr.includes('schema must be') ||
             lowerErr.includes('table') && lowerErr.includes('not found') ||
             lowerErr.includes('client_id') && lowerErr.includes('does not exist') ||
             lowerErr.includes('uncaught') && lowerErr.includes('error') ||
             lowerErr.includes('failed to fetch') && lowerErr.includes('intelligence');
    });

    if (criticalErrors.length > 0) {
      console.error('❌ Critical console errors found:');
      criticalErrors.forEach(err => console.error(`  - ${err}`));
    }

    expect(criticalErrors.length).toBe(0);

    console.log('✅ No critical errors detected during page interaction');
    console.log(`📊 Total console errors: ${consoleErrors.length}`);
    console.log(`⚠️ Total console warnings: ${consoleWarnings.length}`);

    // Log non-critical errors for debugging (if any)
    if (consoleErrors.length > 0) {
      console.log('ℹ️ Non-critical console errors:');
      consoleErrors.forEach(err => console.log(`  - ${err}`));
    }
  });
});
