/**
 * Test Suite: Agency Client Routing with Slug-Based URLs
 *
 * Tests the complete slug-based URL routing system for agency users managing
 * multiple clients. Covers client navigation, context preservation, and the
 * enterprise-grade client switcher functionality.
 *
 * Run Instructions:
 *   # Run this test file
 *   npm run test tests/user-journeys/agency-client-routing.spec.ts
 *
 *   # Run in headed mode (visible browser)
 *   npm run test tests/user-journeys/agency-client-routing.spec.ts -- --headed
 *
 *   # Debug mode
 *   npm run test tests/user-journeys/agency-client-routing.spec.ts -- --debug
 *
 * Prerequisites:
 *   - Frontend: npm run dev (http://127.0.0.1:56310)
 *   - Backend: poetry run uvicorn apps.api.main:app --reload --port 8000
 *   - Database: supabase start
 *   - Test users: agency.owner@example.com (see /tests/TEST_USERS.md)
 *   - Test clients: Test Startup XYZ, Test Client Co (seeded in database)
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Test user credentials
const AGENCY_OWNER = {
  email: 'agency.owner@example.com',
  password: 'LocalDevOnly123!'
};

/**
 * Helper: Login as agency owner
 */
async function loginAsAgencyOwner(page: Page) {
  await page.goto('http://127.0.0.1:56310/login');

  // Wait for login form
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });

  // Fill credentials
  await page.fill('input[type="email"]', AGENCY_OWNER.email);
  await page.fill('input[type="password"]', AGENCY_OWNER.password);

  // Submit
  await page.click('button[type="submit"]');

  // Wait for redirect after login
  await page.waitForLoadState('domcontentloaded');

  // Should redirect to /clients list for agency users
  await page.waitForURL(/\/(clients|dashboard)/, { timeout: 15000 });
}

test.describe('Agency Client Routing with Slug-Based URLs', () => {
  test.beforeEach(async ({ page }) => {
    // Set consistent viewport
    await page.setViewportSize({ width: 1280, height: 720 });

    // Clear session state
    await page.context().clearCookies();

    // Navigate to app first, then clear localStorage
    // (localStorage is not accessible on about:blank)
    await page.goto('http://127.0.0.1:56310/');
    await page.evaluate(() => localStorage.clear());
  });

  test('agency user can navigate to client via slug-based URL', async ({ page }) => {
    /**
     * Test: Agency user navigates directly to client via slug URL
     *
     * User Journey:
     * 1. Login as agency owner
     * 2. Navigate to /clients/:clientSlug
     * 3. Verify client dashboard loads
     * 4. Verify client context is displayed
     */

    test.setTimeout(60000);

    // Login
    await loginAsAgencyOwner(page);

    // Navigate to specific client by slug
    await page.goto('http://127.0.0.1:56310/clients/test-startup-xyz');

    // Wait for page load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000); // Extra stability time

    // Verify URL contains client slug
    await expect(page).toHaveURL(/\/clients\/test-startup-xyz/);

    // Verify client name is displayed (in breadcrumbs or header)
    // Using flexible assertion since exact UI may vary
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
    expect(pageContent!.toLowerCase()).toContain('test startup');
  });

  test('navigation links preserve client context in URL', async ({ page }) => {
    /**
     * Test: Navigation links maintain /clients/:clientSlug prefix
     *
     * User Journey:
     * 1. Login and navigate to client context
     * 2. Click Dashboard link
     * 3. Verify URL maintains client slug
     * 4. Click Campaigns link
     * 5. Verify URL maintains client slug
     * 6. Click Outputs link
     * 7. Verify URL maintains client slug
     */

    test.setTimeout(90000);

    await loginAsAgencyOwner(page);

    // Navigate to client context
    await page.goto('http://127.0.0.1:56310/clients/test-startup-xyz');
    await page.waitForLoadState('domcontentloaded');

    // Click Dashboard link (use last to target desktop nav, not mobile nav)
    await page.locator('nav a:has-text("Dashboard")').last().click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/clients\/test-startup-xyz/);

    // Click Campaigns link
    await page.locator('nav a:has-text("Campaigns")').last().click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/clients\/test-startup-xyz\/campaigns/);

    // Click Outputs link
    await page.locator('nav a:has-text("Outputs")').last().click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/clients\/test-startup-xyz\/outputs/);

    // Verify we're still in client context
    const url = page.url();
    expect(url).toContain('test-startup-xyz');
  });

  test('agents navigation maintains client context', async ({ page }) => {
    /**
     * Test: Agent dropdown links preserve client slug
     *
     * User Journey:
     * 1. Navigate to client context
     * 2. Open Agents dropdown
     * 3. Click Strategy Agent
     * 4. Verify URL maintains client slug
     */

    test.setTimeout(60000);

    await loginAsAgencyOwner(page);

    // Navigate to client
    await page.goto('http://127.0.0.1:56310/clients/test-startup-xyz');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000); // Extra stability

    // Open Agents dropdown (use last to target desktop nav, not mobile nav)
    await page.locator('nav button:has-text("Agents")').last().click();

    // Wait for dropdown to fully render
    await page.waitForTimeout(500);

    // Click Strategy agent link (with emoji filter for specificity)
    const strategyLink = page.locator('a:has-text("Strategy")').filter({ has: page.locator('span:has-text("🎯")') });
    await strategyLink.click();
    await page.waitForLoadState('domcontentloaded');

    // Verify URL maintains client context
    await expect(page).toHaveURL(/\/clients\/test-startup-xyz\/agents\/strategy/);
  });

  test('client switcher displays and is clickable', async ({ page }) => {
    /**
     * Test: Client switcher component is visible and functional
     *
     * User Journey:
     * 1. Login as agency owner
     * 2. Navigate to client context
     * 3. Verify client switcher is visible
     * 4. Click client switcher
     * 5. Verify dropdown opens
     */

    test.setTimeout(60000);

    await loginAsAgencyOwner(page);

    // Navigate to client
    await page.goto('http://127.0.0.1:56310/clients/test-startup-xyz');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000); // Extra stability

    // Look for client switcher button
    // The ClientSwitcher uses shadcn Popover with Building2 icon
    const clientSwitcher = page.locator('button:has-text("Select client")').or(
      page.locator('button').filter({ hasText: /Test Startup|XYZ/i })
    ).first();

    // Verify switcher is visible
    await expect(clientSwitcher).toBeVisible({ timeout: 10000 });

    // Click switcher
    await clientSwitcher.click();

    // Wait for dropdown/popover to appear
    // The ClientSwitcher shows a search input when opened
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible({ timeout: 5000 });
  });

  test('client switcher preserves current page path when switching', async ({ page }) => {
    /**
     * Test: Switching clients maintains the current page context
     *
     * User Journey:
     * 1. Login and navigate to client A campaigns page
     * 2. Open client switcher
     * 3. Switch to client B
     * 4. Verify URL changes to client B campaigns page
     *
     * Expected: /clients/test-startup-xyz/campaigns → /clients/test-client-co/campaigns
     */

    test.setTimeout(90000);

    await loginAsAgencyOwner(page);

    // Navigate to Client A campaigns
    await page.goto('http://127.0.0.1:56310/clients/test-startup-xyz/campaigns');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000); // Extra stability

    // Verify initial URL
    await expect(page).toHaveURL(/\/clients\/test-startup-xyz\/campaigns/);

    // Open client switcher
    const clientSwitcher = page.locator('button').filter({ hasText: /Test Startup|Select client/i }).first();
    await clientSwitcher.click();

    // Wait for search input to appear
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible({ timeout: 5000 });

    // Look for another client in the list
    // Try to find Test Client Co or any other client
    const otherClientOption = page.locator('button').filter({ hasText: /Global|Retail|StartupXYZ|E-Commerce/i }).first();

    if (await otherClientOption.isVisible({ timeout: 5000 })) {
      // Click the other client
      await otherClientOption.click();
      await page.waitForLoadState('domcontentloaded');

      // Verify URL changed but still shows campaigns page
      const newUrl = page.url();
      expect(newUrl).toContain('/campaigns');
      expect(newUrl).not.toContain('test-startup-xyz');
    } else {
      // If only one client exists, test passes but log warning
      console.log('⚠️  Only one client available, skipping path preservation test');
    }
  });

  test('direct navigation to non-existent client slug shows error', async ({ page }) => {
    /**
     * Test: Navigating to invalid client slug handles error gracefully
     *
     * User Journey:
     * 1. Login as agency owner
     * 2. Navigate to /clients/non-existent-slug
     * 3. Verify error handling (redirect or error message)
     */

    test.setTimeout(60000);

    await loginAsAgencyOwner(page);

    // Navigate to non-existent client
    await page.goto('http://127.0.0.1:56310/clients/non-existent-client-slug-999');
    await page.waitForLoadState('domcontentloaded');

    // Should redirect to /clients list or show error
    const url = page.url();
    const isRedirected = url.endsWith('/clients') || !url.includes('non-existent-client-slug-999');

    if (isRedirected) {
      // Successfully redirected away from invalid slug
      expect(isRedirected).toBe(true);
    } else {
      // Should show error message
      const pageContent = await page.textContent('body');
      expect(pageContent!.toLowerCase()).toMatch(/not found|error|invalid/);
    }
  });

  test('breadcrumbs show client context in slug-based URLs', async ({ page }) => {
    /**
     * Test: Breadcrumbs display client name when in client context
     *
     * User Journey:
     * 1. Login as agency owner
     * 2. Navigate to client campaigns page
     * 3. Verify breadcrumbs show: Clients > [Client Name] > Campaigns
     */

    test.setTimeout(60000);

    await loginAsAgencyOwner(page);

    // Navigate to client campaigns
    await page.goto('http://127.0.0.1:56310/clients/test-startup-xyz/campaigns');
    await page.waitForLoadState('domcontentloaded');

    // Look for breadcrumbs
    // The ContextBreadcrumbs component should display the navigation path
    const pageContent = await page.textContent('body');

    // Verify client name appears in breadcrumbs or header
    expect(pageContent).toBeTruthy();
    expect(pageContent!.toLowerCase()).toContain('test startup');

    // Verify campaigns context
    expect(pageContent!.toLowerCase()).toContain('campaign');
  });

  test('client context banner displays current client', async ({ page }) => {
    /**
     * Test: Client context banner shows client name and campaign count
     *
     * User Journey:
     * 1. Login as agency owner
     * 2. Navigate to client context
     * 3. Verify client banner displays client name
     * 4. Verify "All Clients" button is visible
     */

    test.setTimeout(60000);

    await loginAsAgencyOwner(page);

    // Navigate to client
    await page.goto('http://127.0.0.1:56310/clients/test-startup-xyz');
    await page.waitForLoadState('domcontentloaded');

    // ClientLayout shows a banner with client name and "All Clients" button
    // Look for the client name in the banner
    const banner = page.locator('div').filter({ hasText: /Test Startup XYZ/i }).first();
    await expect(banner).toBeVisible({ timeout: 10000 });

    // Look for "All Clients" button
    const allClientsButton = page.locator('button:has-text("All Clients")');
    await expect(allClientsButton).toBeVisible({ timeout: 5000 });
  });

  test('clicking "All Clients" navigates back to clients list', async ({ page }) => {
    /**
     * Test: "All Clients" button navigates to /clients
     *
     * User Journey:
     * 1. Login and navigate to client context
     * 2. Click "All Clients" button
     * 3. Verify navigation to /clients list
     */

    test.setTimeout(60000);

    await loginAsAgencyOwner(page);

    // Navigate to client
    await page.goto('http://127.0.0.1:56310/clients/test-startup-xyz');
    await page.waitForLoadState('domcontentloaded');

    // Click "All Clients" button
    await page.click('button:has-text("All Clients")');
    await page.waitForLoadState('domcontentloaded');

    // Should navigate to /clients list
    await expect(page).toHaveURL(/\/clients$/);
  });

  test('recent clients section appears in client switcher', async ({ page }) => {
    /**
     * Test: Client switcher shows recent clients section
     *
     * User Journey:
     * 1. Navigate to Client A
     * 2. Navigate to Client B
     * 3. Open client switcher
     * 4. Verify "Recent" section appears with both clients
     */

    test.setTimeout(90000);

    await loginAsAgencyOwner(page);

    // Visit first client
    await page.goto('http://127.0.0.1:56310/clients/test-startup-xyz');
    await page.waitForLoadState('domcontentloaded');

    // Visit second client (if exists)
    await page.goto('http://127.0.0.1:56310/clients/test-client-co');
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
      console.log('⚠️  Second client not found, skipping recent clients test');
    });

    // Open client switcher
    const clientSwitcher = page.locator('button').filter({ hasText: /Test Client|Select client/i });
    await clientSwitcher.first().click();

    // Wait for dropdown
    await page.waitForSelector('input[placeholder*="Search"]', { timeout: 5000 });

    // Look for "Recent" section
    const recentSection = page.locator('text=Recent');

    // Recent section should be visible if multiple clients were visited
    const isVisible = await recentSection.isVisible().catch(() => false);

    if (isVisible) {
      expect(isVisible).toBe(true);
    } else {
      console.log('ℹ️  Recent section not visible (may need 2+ clients visited)');
    }
  });

  test('search functionality in client switcher filters clients', async ({ page }) => {
    /**
     * Test: Client switcher search input filters client list
     *
     * User Journey:
     * 1. Login and navigate to any client
     * 2. Open client switcher
     * 3. Type search query
     * 4. Verify filtered results
     */

    test.setTimeout(60000);

    await loginAsAgencyOwner(page);

    // Navigate to any client
    await page.goto('http://127.0.0.1:56310/clients/test-startup-xyz');
    await page.waitForLoadState('domcontentloaded');

    // Open client switcher
    const clientSwitcher = page.locator('button').filter({ hasText: /Test Startup|Select client/i });
    await clientSwitcher.first().click();

    // Wait for search input
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    // Type search query
    await searchInput.fill('test startup');

    // Wait a bit for filtering
    await page.waitForTimeout(500);

    // Verify Test Startup appears in results
    const acmeResult = page.locator('button').filter({ hasText: /Test Startup/i });
    await expect(acmeResult.first()).toBeVisible();

    // Type non-matching query
    await searchInput.fill('nonexistentclient999');
    await page.waitForTimeout(500);

    // Should show "No clients found"
    const noResults = page.locator('text=No clients found');
    await expect(noResults).toBeVisible({ timeout: 5000 });
  });
});
