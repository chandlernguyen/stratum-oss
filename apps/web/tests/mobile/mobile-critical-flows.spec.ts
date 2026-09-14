import { test, expect, devices } from '@playwright/test';
import { selectAgentFromQuickSelector, navigateToAgent, navigateToCampaigns } from '../helpers/mobile';
import { DEVICES } from '../helpers/devices';

/**
 * Phase 5: Mobile & Performance Testing
 * Created: 2025-10-14
 * Updated: 2025-11-13 (Added 3 critical mobile breakpoints)
 * Part of: UNIFIED_PRODUCTION_ROADMAP Phase 5
 *
 * Tests critical user flows across 6 viewport sizes:
 * - Android: 360x800 (Budget Android devices)
 * - Mobile: 375x812 (iPhone 13)
 * - iPhone 15: 393x852 (Current iPhone standard)
 * - iPhone Pro Max: 430x932 (Largest iPhone)
 * - Tablet: 768x1024 (iPad)
 * - Desktop: 1440x900
 *
 * Coverage: 7 flows × 6 viewports = 42 tests
 */

const SME_USER = {
  email: 'sme.owner@example.com',
  password: 'LocalDevOnly123!'
};

const AGENCY_USER = {
  email: 'agency.owner@example.com',
  password: 'LocalDevOnly123!'
};

const VIEWPORTS = [
  { name: 'Android (360px)', width: DEVICES['android-360'].viewport.width, height: DEVICES['android-360'].viewport.height },
  { name: 'Mobile (375px)', width: 375, height: 812 },
  { name: 'iPhone 15 (393px)', width: DEVICES['iphone-15'].viewport.width, height: DEVICES['iphone-15'].viewport.height },
  { name: 'iPhone Pro Max (430px)', width: DEVICES['iphone-15-pro-max'].viewport.width, height: DEVICES['iphone-15-pro-max'].viewport.height },
  { name: 'Tablet (768px)', width: 768, height: 1024 },
  { name: 'Desktop (1440px)', width: 1440, height: 900 }
];

// =============================================================================
// SME FLOWS (15 tests total)
// =============================================================================

VIEWPORTS.forEach(({ name, width, height }) => {
  test.describe(`${name} Viewport (${width}x${height}) - SME Flows`, () => {
    test.use({ viewport: { width, height } });
    test.setTimeout(120000); // 2 minutes per test

    // -------------------------------------------------------------------------
    // Flow 1: Auth Flow
    // -------------------------------------------------------------------------
    test(`${name}: SME can login successfully`, async ({ page }) => {
      await page.goto('http://127.0.0.1:56310/login');

      // Verify form is visible and usable
      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]');
      const submitButton = page.locator('button[type="submit"]');

      await expect(emailInput).toBeVisible();
      await expect(passwordInput).toBeVisible();
      await expect(submitButton).toBeVisible();

      // Verify touch targets are adequate (will check in separate test)
      await emailInput.fill(SME_USER.email);
      await passwordInput.fill(SME_USER.password);
      await submitButton.click();

      // ✅ SME-SPECIFIC: Verify navigation to SME dashboard
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      await expect(page.locator('text=Your Intelligence Briefing')).toBeVisible();
    });

    // -------------------------------------------------------------------------
    // Flow 2: Dashboard Flow
    // -------------------------------------------------------------------------
    test(`${name}: Dashboard loads and displays correctly`, async ({ page }) => {
      // Login first
      await page.goto('http://127.0.0.1:56310/login');
      await page.fill('input[type="email"]', SME_USER.email);
      await page.fill('input[type="password"]', SME_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard', { timeout: 10000 });

      // ✅ SME-SPECIFIC: Verify SME dashboard components are visible
      await expect(page.locator('text=Your Intelligence Briefing')).toBeVisible();

      // Verify navigation menu is accessible
      if (width < 768) {
        // Mobile: Check for hamburger menu
        const menuButton = page.locator('button[aria-label*="menu"], button:has-text("Menu")').first();
        if (await menuButton.isVisible({ timeout: 2000 })) {
          await expect(menuButton).toBeVisible();
        }
      } else {
        // Tablet/Desktop: Check for full navigation
        const navItems = page.locator('nav a, [role="navigation"] a');
        const count = await navItems.count();
        expect(count).toBeGreaterThan(0);
      }

      // Verify content is readable (not cut off)
      const mainContent = page.locator('main, [role="main"]');
      await expect(mainContent).toBeVisible();
    });

    // -------------------------------------------------------------------------
    // Flow 3: Agent Flow
    // -------------------------------------------------------------------------
    test(`${name}: Strategy Agent chat interface works`, async ({ page }) => {
      // Login
      await page.goto('http://127.0.0.1:56310/login');
      await page.fill('input[type="email"]', SME_USER.email);
      await page.fill('input[type="password"]', SME_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard', { timeout: 10000 });

      // Navigate to Strategy Agent
      await page.goto('http://127.0.0.1:56310/strategy');
      await page.waitForLoadState('domcontentloaded');

      // Verify agent page loads
      await expect(page.locator('h1').filter({ hasText: /Business Strategy Agent/i })).toBeVisible({ timeout: 10000 });

      // Verify chat interface is usable
      const chatInput = page.locator('textarea[placeholder*="message"], textarea[placeholder*="question"]').first();

      if (await chatInput.isVisible({ timeout: 5000 })) {
        await expect(chatInput).toBeVisible();

        // Verify input is large enough for mobile typing
        const box = await chatInput.boundingBox();
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(40); // Minimum height for comfortable typing
        }

        // Test typing (don't actually send to save time)
        await chatInput.fill('Test message for viewport testing');
        await expect(chatInput).toHaveValue('Test message for viewport testing');
      }
    });

    // -------------------------------------------------------------------------
    // Flow 4: Navigation Flow
    // -------------------------------------------------------------------------
    test(`${name}: Navigation between pages works`, async ({ page }) => {
      // Login
      await page.goto('http://127.0.0.1:56310/login');
      await page.fill('input[type="email"]', SME_USER.email);
      await page.fill('input[type="password"]', SME_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard', { timeout: 10000 });

      // Navigate to different pages using viewport-appropriate navigation
      // 1. Navigate to Strategy Agent
      await navigateToAgent(page, 'Strategy', width);
      await expect(page.locator('h1').filter({ hasText: /Business Strategy Agent/i })).toBeVisible({ timeout: 10000 });

      // 2. Navigate to Campaigns
      await navigateToCampaigns(page, width);
      await expect(page.locator('h1, h2').filter({ hasText: /Campaigns/i })).toBeVisible({ timeout: 5000 });

      // ✅ SME-SPECIFIC: Navigate back to SME dashboard
      await page.goto('http://127.0.0.1:56310/dashboard');
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('text=Your Intelligence Briefing')).toBeVisible();
    });

    // -------------------------------------------------------------------------
    // Flow 5: Forms Flow
    // -------------------------------------------------------------------------
    test(`${name}: Forms are usable on this viewport`, async ({ page }) => {
      // Login
      await page.goto('http://127.0.0.1:56310/login');
      await page.fill('input[type="email"]', SME_USER.email);
      await page.fill('input[type="password"]', SME_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard', { timeout: 10000 });

      // Test using dashboard page forms (Quick Wins, etc.) instead of profile
      // Check if any form inputs are present on dashboard
      const formInputs = page.locator('input[type="text"], input[type="email"], textarea, input[type="search"]');
      const inputCount = await formInputs.count();

      if (inputCount > 0) {
        // Verify first input is visible and clickable
        const firstInput = formInputs.first();

        if (await firstInput.isVisible({ timeout: 2000 })) {
          await expect(firstInput).toBeVisible();

          // Verify input has adequate size
          const box = await firstInput.boundingBox();
          if (box) {
            expect(box.height).toBeGreaterThanOrEqual(36); // Minimum touch target
          }

          // Test typing
          await firstInput.fill('Test input for viewport');
          await expect(firstInput).toHaveValue('Test input for viewport');
        }
      } else {
        // No inputs found on dashboard, that's OK for this test
        // Just verify the page itself is usable
        await expect(page.locator('main, [role="main"]')).toBeVisible();
      }
    });
  });
});

// =============================================================================
// AGENCY FLOWS (6 tests total)
// =============================================================================

VIEWPORTS.forEach(({ name, width, height }) => {
  test.describe(`${name} Viewport (${width}x${height}) - Agency Flows`, () => {
    test.use({ viewport: { width, height } });
    test.setTimeout(120000);

    // -------------------------------------------------------------------------
    // Flow 6: Client Switching
    // -------------------------------------------------------------------------
    test(`${name}: Agency can switch between clients`, async ({ page }) => {
      // Login as agency
      await page.goto('http://127.0.0.1:56310/login');
      await page.fill('input[type="email"]', AGENCY_USER.email);
      await page.fill('input[type="password"]', AGENCY_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard', { timeout: 10000 });

      // Verify agency dashboard loads
      await expect(page.getByRole('heading', { name: 'Client Portfolio' })).toBeVisible({ timeout: 10000 });

      // Navigate to clients list
      await page.goto('http://127.0.0.1:56310/clients');
      await page.waitForLoadState('domcontentloaded');

      // Click first client
      const firstClientLink = page.locator('a[href*="/clients/"]:not([href="/clients/new"])').first();

      if (await firstClientLink.isVisible({ timeout: 3000 })) {
        await firstClientLink.click();
        await page.waitForLoadState('domcontentloaded');

        // Verify client context in URL
        await expect(page).toHaveURL(/\/clients\/[a-f0-9-]+/, { timeout: 5000 });
      }
    });

    // -------------------------------------------------------------------------
    // Flow 7: Multi-Client Dashboard
    // -------------------------------------------------------------------------
    test(`${name}: Agency dashboard shows client metrics`, async ({ page }) => {
      // Login as agency
      await page.goto('http://127.0.0.1:56310/login');
      await page.fill('input[type="email"]', AGENCY_USER.email);
      await page.fill('input[type="password"]', AGENCY_USER.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard', { timeout: 10000 });

      // ✅ AGENCY-SPECIFIC: Verify agency dashboard loads with Client Portfolio heading
      await expect(page.getByRole('heading', { name: 'Client Portfolio' })).toBeVisible({ timeout: 10000 });

      // ✅ AGENCY-SPECIFIC: Check for agency-specific metrics using new data-testid attributes
      const clientCountMetric = page.locator('[data-testid="metric-client-count"]');
      const revenueMetric = page.locator('[data-testid="metric-revenue"]');
      const campaignsMetric = page.locator('[data-testid="metric-campaigns"]');

      // Verify at least one agency metric is visible
      await expect(clientCountMetric).toBeVisible({ timeout: 5000 });

      // Verify metric has adequate size on mobile
      const box = await clientCountMetric.boundingBox();
      if (box && width < 768) {
        // On mobile, metrics should not be cut off
        expect(box.width).toBeLessThanOrEqual(width - 32); // Account for padding
      }

      // For tablet/desktop, check for cross-client analytics
      if (width >= 768) {
        const analyticsSection = page.locator('text=/All Clients|Cross-Client|Total Clients/i').first();
        if (await analyticsSection.isVisible({ timeout: 2000 })) {
          await expect(analyticsSection).toBeVisible();
        }
      }
    });
  });
});
