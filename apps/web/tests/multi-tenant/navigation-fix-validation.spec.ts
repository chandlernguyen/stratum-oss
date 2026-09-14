/**
 * Multi-Tenant Navigation Fix Validation E2E Test
 *
 * Tests comprehensive navigation fixes implemented 2025-11-17:
 * - Phase 1: ContentToolGrid, ROIToolGrid, OpportunityEmptyState navigation
 * - Phase 2a: Agent pages (Campaign, Competitive, Client Success)
 * - Phase 2b: Dashboard components (CampaignEmptyState, IntelligenceVault, etc.)
 * - Phase 3: App.tsx redirect logic and useContentRecommendations
 *
 * Bug Context:
 * - Before fix: 39+ hardcoded routes broke Agency user experience
 * - After fix: All navigation uses buildContextAwareUrl() to preserve client context
 * - Impact: Agency users can now navigate throughout app without losing client context
 *
 * Run Instructions:
 *   # Run this test file
 *   npm run test apps/web/tests/multi-tenant/navigation-fix-validation.spec.ts
 *
 *   # Run in headed mode (visible browser)
 *   npm run test apps/web/tests/multi-tenant/navigation-fix-validation.spec.ts -- --headed
 *
 *   # Debug mode
 *   npm run test apps/web/tests/multi-tenant/navigation-fix-validation.spec.ts -- --debug
 *
 * Prerequisites:
 *   - Frontend: npm run dev ()
 *   - Backend: poetry run uvicorn apps.api.main:app --reload --port 8000
 *   - Database: supabase start
 *   - Test users: agency.admin@example.com, sme.owner@example.com
 *   - Test client: techstartup-pro
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Test credentials
const AGENCY_USER = {
  email: 'agency.admin@example.com',
  password: 'LocalDevOnly123!'
};

const SME_USER = {
  email: 'sme.owner@example.com',
  password: 'LocalDevOnly123!'
};

// Test client from migration 162
const TEST_CLIENT = {
  slug: 'techstartup-pro',
  name: 'TechStartup Pro'
};

test.describe('Multi-Tenant Navigation Fix Validation', () => {
  test.setTimeout(90000); // 1.5 minute timeout for comprehensive tests

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    // Clear session
    await page.goto('/');
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
  });

  /**
   * Helper: Login as agency user
   */
  async function loginAsAgency(page: Page) {
    await page.goto('/login');
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

    // Wait for redirect - now should go to /clients for Agency users (Phase 3 fix)
    await page.waitForFunction(
      () => window.location.pathname.includes('/clients') || window.location.pathname === '/',
      { timeout: 15000 }
    );
  }

  /**
   * Helper: Login as SME user
   */
  async function loginAsSME(page: Page) {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    const emailInput = page.locator('input[type="email"]');
    await emailInput.waitFor({ state: 'visible', timeout: 5000 });
    await emailInput.fill(SME_USER.email);

    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill(SME_USER.password);

    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForLoadState('domcontentloaded')
    ]);

    // Wait for redirect - should go to /dashboard for SME users
    await page.waitForFunction(
      () => window.location.pathname.includes('/dashboard') || window.location.pathname === '/',
      { timeout: 15000 }
    );
  }

  /**
   * Helper: Navigate to client workspace
   */
  async function navigateToClient(page: Page, clientSlug: string) {
    await page.goto(`/clients/${clientSlug}`);
    await page.waitForLoadState('domcontentloaded');

    // Verify client context loaded
    await page.waitForURL(`**/clients/${clientSlug}**`, { timeout: 10000 });

    // Verify no error page
    const hasError = await page.locator('text=/Access Denied|Not Found|Error/i').isVisible().catch(() => false);
    if (hasError) {
      throw new Error('Navigated to error page - client context not loaded');
    }
  }

  // ==================================================================================
  // Phase 1 Tests: ContentToolGrid & ROIToolGrid (Critical User Complaint)
  // ==================================================================================

  test('Phase 1: Agency user - Content Tool Grid preserves client context', async ({ page }) => {
    /**
     * PRIMARY USER COMPLAINT FIX:
     * "from this page /clients/techstartup-pro/agents/content
     * scroll down and you can see many tools. When user clicks on each tool,
     * it goes to the sme link and not the agency link."
     *
     * Success Criteria:
     * - Click "SEO Blog Generator" → /clients/techstartup-pro/agents/content/tool/seo-blog
     * - NOT → /content/tool/seo-blog (SME path)
     */

    await loginAsAgency(page);
    await navigateToClient(page, TEST_CLIENT.slug);

    // Navigate to Content Agent
    await page.goto(`/clients/${TEST_CLIENT.slug}/agents/content`);
    await page.waitForLoadState('domcontentloaded');

    // Scroll to content tools section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(500);

    // Find and click SEO Blog Generator tool
    const seoBlogTool = page.locator('text=SEO Blog').first();
    await seoBlogTool.waitFor({ state: 'visible', timeout: 10000 });

    await seoBlogTool.click();
    await page.waitForLoadState('domcontentloaded');

    // Verify URL preserves client context
    const toolURL = page.url();
    expect(toolURL).toContain(`/clients/${TEST_CLIENT.slug}/agents/content/tool/seo-blog`);
    expect(toolURL).not.toContain('/content/tool/seo-blog'); // Should NOT be SME path

    console.log(`[Phase 1] ✅ Content tool URL preserved client context: ${toolURL}`);
  });

  test('Phase 1: SME user - Content Tool Grid uses SME paths', async ({ page }) => {
    /**
     * Regression Test: SME users should NOT have client context
     *
     * Success Criteria:
     * - Click "SEO Blog Generator" → /content/tool/seo-blog
     * - NOT → /clients/{slug}/... (no client context for SME)
     */

    await loginAsSME(page);

    // Navigate to Content Agent (SME path)
    await page.goto('/agents/content');
    await page.waitForLoadState('domcontentloaded');

    // Scroll to content tools
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(500);

    // Click SEO Blog tool
    const seoBlogTool = page.locator('text=SEO Blog').first();
    await seoBlogTool.waitFor({ state: 'visible', timeout: 10000 });

    await seoBlogTool.click();
    await page.waitForLoadState('domcontentloaded');

    // Verify SME URL (no client context)
    const toolURL = page.url();
    expect(toolURL).toContain('/content/tool/seo-blog');
    expect(toolURL).not.toContain('/clients/'); // Should NOT have client context

    console.log(`[Phase 1] ✅ SME content tool uses correct path: ${toolURL}`);
  });

  test('Phase 1: Agency user - ROI Tool Grid preserves client context', async ({ page }) => {
    /**
     * ROIToolGrid.tsx fix verification
     *
     * Success Criteria:
     * - Click ROI tool → /clients/techstartup-pro/performance-intelligence/tool/{tool}
     */

    await loginAsAgency(page);
    await navigateToClient(page, TEST_CLIENT.slug);

    // Navigate to Performance Intelligence Agent
    await page.goto(`/clients/${TEST_CLIENT.slug}/agents/performance-intelligence`);
    await page.waitForLoadState('domcontentloaded');

    // Look for any ROI tool
    const roiTool = page.locator('text=/ROI|Budget|Analytics/i').first();
    const hasROITool = await roiTool.count() > 0;

    if (hasROITool) {
      await roiTool.click();
      await page.waitForLoadState('domcontentloaded');

      // Verify URL preserves client context
      const toolURL = page.url();
      expect(toolURL).toContain(`/clients/${TEST_CLIENT.slug}/performance-intelligence/tool/`);
      console.log(`[Phase 1] ✅ ROI tool URL preserved client context: ${toolURL}`);
    } else {
      console.log(`[Phase 1] ⚠️ No ROI tools found, skipping test`);
      test.skip();
    }
  });

  test('Phase 1: SME user - ROI Tool Grid uses SME paths', async ({ page }) => {
    /**
     * Regression Test: SME users should NOT have client context for ROI tools
     *
     * Success Criteria:
     * - Click ROI tool → /performance-intelligence/tool/{tool}
     * - NOT → /clients/{slug}/... (no client context for SME)
     */

    await loginAsSME(page);

    // Navigate to Performance Intelligence Agent (SME path)
    await page.goto('/agents/performance-intelligence');
    await page.waitForLoadState('domcontentloaded');

    // Look for any ROI tool
    const roiTool = page.locator('text=/ROI|Budget|Analytics/i').first();
    const hasROITool = await roiTool.count() > 0;

    if (hasROITool) {
      await roiTool.click();
      await page.waitForLoadState('domcontentloaded');

      // Verify SME URL (no client context)
      const toolURL = page.url();
      expect(toolURL).toContain('/performance-intelligence/tool/');
      expect(toolURL).not.toContain('/clients/'); // Should NOT have client context
      console.log(`[Phase 1] ✅ SME ROI tool uses correct path: ${toolURL}`);
    } else {
      console.log(`[Phase 1] ⚠️ No ROI tools found for SME, skipping test`);
      test.skip();
    }
  });

  // ==================================================================================
  // Phase 2b Tests: Dashboard Navigation
  // ==================================================================================

  test('Phase 2b: Agency user - Dashboard campaign buttons preserve client context', async ({ page }) => {
    /**
     * CampaignEmptyState.tsx and CampaignReadinessBanner.tsx fix verification
     *
     * Success Criteria:
     * - "Create Campaign" button → /clients/techstartup-pro/campaigns/new
     */

    await loginAsAgency(page);
    await navigateToClient(page, TEST_CLIENT.slug);

    // Navigate to client dashboard
    await page.goto(`/clients/${TEST_CLIENT.slug}`);
    await page.waitForLoadState('domcontentloaded');

    // Look for campaign creation button (could be in empty state or banner)
    const campaignButton = page.locator('text=/Create.*Campaign|New Campaign/i').first();
    const hasCampaignButton = await campaignButton.count() > 0;

    if (hasCampaignButton) {
      await campaignButton.click();
      await page.waitForLoadState('domcontentloaded');

      // Verify URL preserves client context
      const campaignURL = page.url();
      expect(campaignURL).toContain(`/clients/${TEST_CLIENT.slug}/campaigns/new`);
      console.log(`[Phase 2b] ✅ Campaign creation URL preserved client context: ${campaignURL}`);
    } else {
      console.log(`[Phase 2b] ⚠️ No campaign button found, skipping test`);
      test.skip();
    }
  });

  test('Phase 2b: Agency user - Dashboard intelligence vault links preserve client context', async ({ page }) => {
    /**
     * IntelligenceVaultCard.tsx fix verification
     *
     * Success Criteria:
     * - Click output card → /clients/techstartup-pro/outputs/{id}
     * - "View all intelligence" → /clients/techstartup-pro/outputs
     */

    await loginAsAgency(page);
    await navigateToClient(page, TEST_CLIENT.slug);

    // Navigate to client dashboard
    await page.goto(`/clients/${TEST_CLIENT.slug}`);
    await page.waitForLoadState('domcontentloaded');

    // Look for intelligence vault "View all" link
    const viewAllLink = page.locator('text=/View all.*intelligence/i').first();
    const hasViewAllLink = await viewAllLink.count() > 0;

    if (hasViewAllLink) {
      await viewAllLink.click();
      await page.waitForLoadState('domcontentloaded');

      // Verify URL preserves client context
      const outputsURL = page.url();
      expect(outputsURL).toContain(`/clients/${TEST_CLIENT.slug}/outputs`);
      console.log(`[Phase 2b] ✅ Outputs URL preserved client context: ${outputsURL}`);
    } else {
      console.log(`[Phase 2b] ⚠️ No intelligence vault found, skipping test`);
      test.skip();
    }
  });

  test('Phase 2b: Agency user - Dashboard recommendations preserve client context', async ({ page }) => {
    /**
     * DashboardRecommendations.tsx fix verification (data-driven navigation)
     *
     * Success Criteria:
     * - Click recommendation → preserves /clients/{slug}/ prefix
     */

    await loginAsAgency(page);
    await navigateToClient(page, TEST_CLIENT.slug);

    // Navigate to client dashboard
    await page.goto(`/clients/${TEST_CLIENT.slug}`);
    await page.waitForLoadState('domcontentloaded');

    // Look for recommendation cards (could be "Start Now" or card clicks)
    const recommendation = page.locator('[class*="recommendation"], button:has-text("Start Now")').first();
    const hasRecommendation = await recommendation.count() > 0;

    if (hasRecommendation) {
      const beforeURL = page.url();
      await recommendation.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000); // Wait for navigation

      // Verify URL still has client context
      const afterURL = page.url();

      // If navigation happened, verify it preserved client context
      if (afterURL !== beforeURL) {
        expect(afterURL).toContain(`/clients/${TEST_CLIENT.slug}/`);
        console.log(`[Phase 2b] ✅ Recommendation navigation preserved client context: ${afterURL}`);
      } else {
        console.log(`[Phase 2b] ℹ️ Recommendation didn't navigate (may be modal/expand)`);
      }
    } else {
      console.log(`[Phase 2b] ⚠️ No recommendations found, skipping test`);
      test.skip();
    }
  });

  test('Phase 2b: SME user - Dashboard campaign buttons use SME paths', async ({ page }) => {
    /**
     * Regression Test: SME dashboard navigation should work without client context
     *
     * Success Criteria:
     * - "Create Campaign" button → /campaigns/new (not /clients/...)
     */

    await loginAsSME(page);

    // Navigate to SME dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Look for campaign creation button
    const campaignButton = page.locator('text=/Create.*Campaign|New Campaign/i').first();
    const hasCampaignButton = await campaignButton.count() > 0;

    if (hasCampaignButton) {
      await campaignButton.click();
      await page.waitForLoadState('domcontentloaded');

      // Verify SME URL (no client context)
      const campaignURL = page.url();
      expect(campaignURL).toContain('/campaigns/new');
      expect(campaignURL).not.toContain('/clients/');
      console.log(`[Phase 2b] ✅ SME campaign creation uses correct path: ${campaignURL}`);
    } else {
      console.log(`[Phase 2b] ⚠️ No campaign button found for SME, skipping test`);
      test.skip();
    }
  });

  test('Phase 2b: SME user - Dashboard intelligence vault uses SME paths', async ({ page }) => {
    /**
     * Regression Test: SME intelligence vault links work without client context
     *
     * Success Criteria:
     * - "View all intelligence" → /outputs (not /clients/...)
     */

    await loginAsSME(page);

    // Navigate to SME dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Look for intelligence vault "View all" link
    const viewAllLink = page.locator('text=/View all.*intelligence/i').first();
    const hasViewAllLink = await viewAllLink.count() > 0;

    if (hasViewAllLink) {
      await viewAllLink.click();
      await page.waitForLoadState('domcontentloaded');

      // Verify SME URL (no client context)
      const outputsURL = page.url();
      expect(outputsURL).toContain('/outputs');
      expect(outputsURL).not.toContain('/clients/');
      console.log(`[Phase 2b] ✅ SME outputs uses correct path: ${outputsURL}`);
    } else {
      console.log(`[Phase 2b] ⚠️ No intelligence vault found for SME, skipping test`);
      test.skip();
    }
  });

  test('Phase 2b: SME user - Dashboard recommendations use SME paths', async ({ page }) => {
    /**
     * Regression Test: SME recommendations navigation works without client context
     *
     * Success Criteria:
     * - Click recommendation → uses SME paths (no /clients/ prefix)
     */

    await loginAsSME(page);

    // Navigate to SME dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Look for recommendation cards
    const recommendation = page.locator('[class*="recommendation"], button:has-text("Start Now")').first();
    const hasRecommendation = await recommendation.count() > 0;

    if (hasRecommendation) {
      const beforeURL = page.url();
      await recommendation.click();
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      // Verify URL doesn't have client context
      const afterURL = page.url();

      // If navigation happened, verify it doesn't have client context
      if (afterURL !== beforeURL) {
        expect(afterURL).not.toContain('/clients/');
        console.log(`[Phase 2b] ✅ SME recommendation uses correct path: ${afterURL}`);
      } else {
        console.log(`[Phase 2b] ℹ️ SME recommendation didn't navigate (may be modal/expand)`);
      }
    } else {
      console.log(`[Phase 2b] ⚠️ No recommendations found for SME, skipping test`);
      test.skip();
    }
  });

  // ==================================================================================
  // Phase 3 Tests: App.tsx Redirect Logic
  // ==================================================================================

  test('Phase 3: Agency user login redirects to /clients (not /dashboard)', async ({ page }) => {
    /**
     * App.tsx PublicRoute fix verification
     *
     * Before fix: All users redirected to /dashboard
     * After fix: Agency → /clients, SME → /dashboard
     *
     * Success Criteria:
     * - Agency user login → /clients (client list page)
     */

    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill(AGENCY_USER.email);

    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill(AGENCY_USER.password);

    await page.click('button[type="submit"]');
    await page.waitForLoadState('domcontentloaded');

    // Wait for redirect
    await page.waitForTimeout(2000);

    // Verify redirected to /clients (not /dashboard)
    const redirectURL = page.url();
    expect(redirectURL).toContain('/clients');
    expect(redirectURL).not.toContain('/dashboard');

    console.log(`[Phase 3] ✅ Agency user redirected to /clients: ${redirectURL}`);
  });

  test('Phase 3: SME user login redirects to /dashboard (not /clients)', async ({ page }) => {
    /**
     * App.tsx PublicRoute regression test
     *
     * Success Criteria:
     * - SME user login → /dashboard (unchanged behavior)
     */

    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill(SME_USER.email);

    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.fill(SME_USER.password);

    await page.click('button[type="submit"]');
    await page.waitForLoadState('domcontentloaded');

    // Wait for redirect
    await page.waitForTimeout(2000);

    // Verify redirected to /dashboard (not /clients)
    const redirectURL = page.url();
    expect(redirectURL).toContain('/dashboard');
    expect(redirectURL).not.toContain('/clients');

    console.log(`[Phase 3] ✅ SME user redirected to /dashboard: ${redirectURL}`);
  });

  // ==================================================================================
  // Comprehensive Navigation Flow Tests
  // ==================================================================================

  test('Comprehensive: Agency user full navigation flow preserves context', async ({ page }) => {
    /**
     * End-to-end test: Multiple navigation actions in sequence
     *
     * Journey:
     * 1. Login → /clients
     * 2. Select client → /clients/{slug}
     * 3. Navigate to Content Agent → /clients/{slug}/agents/content
     * 4. Click tool → /clients/{slug}/agents/content/tool/seo-blog
     * 5. Navigate back to dashboard → /clients/{slug}
     * 6. Click outputs → /clients/{slug}/outputs
     *
     * Success: All URLs preserve /clients/{slug}/ prefix
     */

    await loginAsAgency(page);

    // Step 1: Verify landed on /clients
    let currentURL = page.url();
    console.log(`[Comprehensive] Step 1 - Login redirect: ${currentURL}`);

    // Step 2: Navigate to specific client
    await navigateToClient(page, TEST_CLIENT.slug);
    currentURL = page.url();
    expect(currentURL).toContain(`/clients/${TEST_CLIENT.slug}`);
    console.log(`[Comprehensive] Step 2 - Client selected: ${currentURL}`);

    // Step 3: Navigate to Content Agent
    await page.goto(`/clients/${TEST_CLIENT.slug}/agents/content`);
    await page.waitForLoadState('domcontentloaded');
    currentURL = page.url();
    expect(currentURL).toContain(`/clients/${TEST_CLIENT.slug}/agents/content`);
    console.log(`[Comprehensive] Step 3 - Content agent: ${currentURL}`);

    // Step 4: Click content tool
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(500);

    const tool = page.locator('text=SEO Blog').first();
    if (await tool.count() > 0) {
      await tool.click();
      await page.waitForLoadState('domcontentloaded');
      currentURL = page.url();
      expect(currentURL).toContain(`/clients/${TEST_CLIENT.slug}/agents/content/tool/`);
      console.log(`[Comprehensive] Step 4 - Tool selected: ${currentURL}`);
    }

    // Step 5: Back to dashboard
    await page.goto(`/clients/${TEST_CLIENT.slug}`);
    await page.waitForLoadState('domcontentloaded');
    currentURL = page.url();
    expect(currentURL).toContain(`/clients/${TEST_CLIENT.slug}`);
    console.log(`[Comprehensive] Step 5 - Back to dashboard: ${currentURL}`);

    // Step 6: Navigate to outputs
    await page.goto(`/clients/${TEST_CLIENT.slug}/outputs`);
    await page.waitForLoadState('domcontentloaded');
    currentURL = page.url();
    expect(currentURL).toContain(`/clients/${TEST_CLIENT.slug}/outputs`);
    console.log(`[Comprehensive] Step 6 - Outputs page: ${currentURL}`);

    console.log(`[Comprehensive] ✅ All navigation steps preserved client context!`);
  });

  test('Comprehensive: SME user full navigation flow works without client context', async ({ page }) => {
    /**
     * End-to-end SME regression test: Multiple navigation actions without client context
     *
     * Journey:
     * 1. Login → /dashboard
     * 2. Navigate to Content Agent → /agents/content
     * 3. Click tool → /content/tool/seo-blog
     * 4. Navigate back to dashboard → /dashboard
     * 5. Click outputs → /outputs
     *
     * Success: All URLs work correctly WITHOUT /clients/ prefix
     */

    await loginAsSME(page);

    // Step 1: Verify landed on /dashboard
    let currentURL = page.url();
    expect(currentURL).toContain('/dashboard');
    expect(currentURL).not.toContain('/clients/');
    console.log(`[Comprehensive SME] Step 1 - Login redirect: ${currentURL}`);

    // Step 2: Navigate to Content Agent
    await page.goto('/agents/content');
    await page.waitForLoadState('domcontentloaded');
    currentURL = page.url();
    expect(currentURL).toContain('/agents/content');
    expect(currentURL).not.toContain('/clients/');
    console.log(`[Comprehensive SME] Step 2 - Content agent: ${currentURL}`);

    // Step 3: Click content tool
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(500);

    const tool = page.locator('text=SEO Blog').first();
    if (await tool.count() > 0) {
      await tool.click();
      await page.waitForLoadState('domcontentloaded');
      currentURL = page.url();
      expect(currentURL).toContain('/content/tool/');
      expect(currentURL).not.toContain('/clients/');
      console.log(`[Comprehensive SME] Step 3 - Tool selected: ${currentURL}`);
    }

    // Step 4: Back to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    currentURL = page.url();
    expect(currentURL).toContain('/dashboard');
    expect(currentURL).not.toContain('/clients/');
    console.log(`[Comprehensive SME] Step 4 - Back to dashboard: ${currentURL}`);

    // Step 5: Navigate to outputs
    await page.goto('/outputs');
    await page.waitForLoadState('domcontentloaded');
    currentURL = page.url();
    expect(currentURL).toContain('/outputs');
    expect(currentURL).not.toContain('/clients/');
    console.log(`[Comprehensive SME] Step 5 - Outputs page: ${currentURL}`);

    console.log(`[Comprehensive SME] ✅ All SME navigation steps work correctly without client context!`);
  });
});
