/**
 * Client Session Isolation in Agent Sidebar E2E Test
 *
 * Tests that agent session history in the sidebar properly isolates sessions by client:
 * - Agency users viewing /clients/ecommerce-plus/agents/strategy see ONLY ecommerce-plus sessions
 * - Agency users viewing /clients/techstartup-pro/agents/strategy see ONLY techstartup-pro sessions
 * - Sessions from different clients never appear in the wrong sidebar
 * - SME users see all their sessions (no client filtering)
 *
 * This test validates the fix for the critical data isolation bug where sessions
 * from one client were appearing in another client's sidebar view.
 *
 * Run Instructions:
 *   # Run this test file
 *   npm run test apps/web/tests/agency/client-session-isolation.spec.ts
 *
 *   # Run in headed mode (visible browser)
 *   npm run test apps/web/tests/agency/client-session-isolation.spec.ts -- --headed
 *
 *   # Debug mode
 *   npm run test apps/web/tests/agency/client-session-isolation.spec.ts -- --debug
 *
 * Prerequisites:
 *   - Frontend: npm run dev (http://127.0.0.1:56310)
 *   - Backend: poetry run uvicorn apps.api.main:app --reload --port 8000
 *   - Database: supabase start with migration 199 applied (client_id filtering)
 *   - Test users: agency.owner@example.com, sme.owner@example.com
 *   - Test clients: techstartup-pro, ecommerce-plus (seeded in database)
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Test credentials from /tests/TEST_USERS.md
const AGENCY_USER = {
  email: 'agency.owner@example.com',
  password: 'LocalDevOnly123!'
};

const SME_USER = {
  email: 'sme.owner@example.com',
  password: 'LocalDevOnly123!'
};

// Test client slugs (from seed.sql)
const TEST_CLIENTS = {
  techstartup: {
    slug: 'techstartup-pro',
    name: 'TechStartup Pro',
    displayName: 'TechStartup Pro' // For sidebar verification
  },
  ecommerce: {
    slug: 'ecommerce-plus',
    name: 'E-Commerce Plus',
    displayName: 'E-Commerce Plus'
  }
};

test.describe('Client Session Isolation in Agent Sidebar', () => {
  test.setTimeout(180000); // 3 minutes total (multiple agent interactions)

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    // Clear session state
    await page.goto('http://127.0.0.1:56310');
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
  });

  /**
   * Helper: Login as agency user
   */
  async function loginAsAgency(page: Page) {
    await page.goto('http://127.0.0.1:56310/login');
    await page.waitForLoadState('domcontentloaded');

    await page.fill('input[type="email"]', AGENCY_USER.email);
    await page.fill('input[type="password"]', AGENCY_USER.password);

    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForLoadState('domcontentloaded')
    ]);

    // Wait for dashboard
    await page.waitForFunction(
      () => window.location.pathname === '/' || window.location.pathname.includes('dashboard'),
      { timeout: 15000 }
    );

    console.log('✅ Logged in as agency user:', AGENCY_USER.email);
  }

  /**
   * Helper: Login as SME user
   */
  async function loginAsSME(page: Page) {
    await page.goto('http://127.0.0.1:56310/login');
    await page.waitForLoadState('domcontentloaded');

    await page.fill('input[type="email"]', SME_USER.email);
    await page.fill('input[type="password"]', SME_USER.password);

    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForLoadState('domcontentloaded')
    ]);

    await page.waitForFunction(
      () => window.location.pathname === '/' || window.location.pathname.includes('dashboard'),
      { timeout: 15000 }
    );

    console.log('✅ Logged in as SME user:', SME_USER.email);
  }

  /**
   * Helper: Create a strategy session for a client
   * Returns the session title for verification
   */
  async function createStrategySession(
    page: Page,
    clientSlug: string,
    clientName: string,
    queryText: string
  ): Promise<string> {
    // Navigate to client-scoped strategy agent
    const strategyUrl = `http://127.0.0.1:56310/clients/${clientSlug}/agents/strategy`;
    await page.goto(strategyUrl);
    await page.waitForLoadState('domcontentloaded');

    console.log(`📍 Navigated to: ${strategyUrl}`);

    // Verify client context banner is visible
    const clientBanner = page.locator('text=Clients').first();
    await expect(clientBanner).toBeVisible({ timeout: 10000 });
    console.log(`✅ Client context banner visible for: ${clientName}`);

    // Click "New Strategy" button to start a session
    const newSessionButton = page.locator('button', { hasText: /New|Start/ }).first();
    if (await newSessionButton.count() > 0) {
      await newSessionButton.click();
      await page.waitForLoadState('domcontentloaded');
      console.log('🆕 Started new strategy session');
    }

    // Send a unique query to create identifiable session
    const textarea = page.locator('textarea').first();
    await textarea.waitFor({ state: 'visible', timeout: 10000 });
    await textarea.fill(queryText);
    await page.keyboard.press('Enter');

    console.log(`📤 Sent query: "${queryText}"`);

    // Wait for agent to respond (streaming)
    await page.waitForTimeout(3000); // Brief wait for response to start

    // Wait for response to stabilize (check for substantial content)
    let responseStableCount = 0;
    let previousLength = 0;
    const maxWait = Date.now() + 60000; // 60 second max wait

    while (Date.now() < maxWait && responseStableCount < 3) {
      await page.waitForTimeout(2000);

      // Try to find response content
      const responseSelectors = ['.prose', '[role="article"]', '.message-content'];
      let currentLength = 0;

      for (const selector of responseSelectors) {
        const elements = page.locator(selector);
        if (await elements.count() > 0) {
          const text = await elements.last().textContent();
          currentLength = text?.length || 0;
          if (currentLength > 100) break;
        }
      }

      // Check if response has stabilized
      if (currentLength === previousLength && currentLength > 100) {
        responseStableCount++;
      } else {
        responseStableCount = 0;
        previousLength = currentLength;
      }
    }

    console.log(`✅ Agent response received (${previousLength} chars)`);

    // Return the query text as session identifier
    return queryText.substring(0, 50); // First 50 chars as session title
  }

  /**
   * Helper: Get session titles from sidebar
   */
  async function getSidebarSessionTitles(page: Page): Promise<string[]> {
    // Wait for sidebar to be visible
    await page.waitForSelector('[data-testid="sidebar"], .glass-sidebar', { timeout: 5000 });

    // Look for session cards in the sidebar
    const sessionCards = page.locator('.glass-sidebar').locator('[role="button"], .cursor-pointer').filter({
      has: page.locator('p') // Session cards have title paragraphs
    });

    const count = await sessionCards.count();
    const titles: string[] = [];

    for (let i = 0; i < count; i++) {
      const card = sessionCards.nth(i);
      const titleElement = card.locator('p').first();
      const title = await titleElement.textContent();
      if (title && title.trim()) {
        titles.push(title.trim());
      }
    }

    console.log(`📋 Found ${titles.length} sessions in sidebar:`, titles);
    return titles;
  }

  // ==================== TEST 1: E-Commerce Sessions Only ====================

  test('agency user sees only ecommerce-plus sessions when viewing ecommerce-plus strategy', async ({ page }) => {
    /**
     * Critical Path Test: Verify client session isolation
     *
     * Steps:
     * 1. Login as agency user
     * 2. Create session for ecommerce-plus client
     * 3. Create session for techstartup-pro client
     * 4. Navigate to ecommerce-plus strategy page
     * 5. Verify sidebar shows ONLY ecommerce-plus sessions
     *
     * Success Criteria:
     * - Ecommerce session appears in sidebar
     * - Techstartup session does NOT appear
     * - Client context banner shows correct client
     */

    await loginAsAgency(page);

    // Create session for ecommerce-plus
    const ecommerceQuery = `Analyze e-commerce growth strategies for ${TEST_CLIENTS.ecommerce.name}`;
    await createStrategySession(
      page,
      TEST_CLIENTS.ecommerce.slug,
      TEST_CLIENTS.ecommerce.name,
      ecommerceQuery
    );

    // Create session for techstartup-pro
    const techstartupQuery = `Analyze SaaS growth strategies for ${TEST_CLIENTS.techstartup.name}`;
    await createStrategySession(
      page,
      TEST_CLIENTS.techstartup.slug,
      TEST_CLIENTS.techstartup.name,
      techstartupQuery
    );

    // Navigate back to ecommerce-plus strategy
    await page.goto(`http://127.0.0.1:56310/clients/${TEST_CLIENTS.ecommerce.slug}/agents/strategy`);
    await page.waitForLoadState('domcontentloaded');

    // Get sidebar sessions
    const sidebarSessions = await getSidebarSessionTitles(page);

    // Assertions: Ecommerce session should be visible
    const hasEcommerceSession = sidebarSessions.some(title =>
      title.toLowerCase().includes('e-commerce') ||
      title.toLowerCase().includes('ecommerce') ||
      title.includes(TEST_CLIENTS.ecommerce.name)
    );
    expect(hasEcommerceSession).toBeTruthy();
    console.log('✅ Ecommerce session found in sidebar');

    // Assertions: Techstartup session should NOT be visible
    const hasTechstartupSession = sidebarSessions.some(title =>
      title.toLowerCase().includes('saas') ||
      title.toLowerCase().includes('techstartup') ||
      title.includes(TEST_CLIENTS.techstartup.name)
    );
    expect(hasTechstartupSession).toBeFalsy();
    console.log('✅ Techstartup session NOT in sidebar (correct isolation)');

    // Verify client banner shows correct client (use .first() to avoid matching session titles)
    const clientBanner = page.locator('text=' + TEST_CLIENTS.ecommerce.displayName).first();
    await expect(clientBanner).toBeVisible();
    console.log('✅ Client context banner shows correct client');
  });

  // ==================== TEST 2: TechStartup Sessions Only ====================

  test('agency user sees only techstartup-pro sessions when viewing techstartup-pro strategy', async ({ page }) => {
    /**
     * Critical Path Test: Verify reverse client session isolation
     *
     * Steps:
     * 1. Login as agency user
     * 2. Create session for techstartup-pro client
     * 3. Create session for ecommerce-plus client
     * 4. Navigate to techstartup-pro strategy page
     * 5. Verify sidebar shows ONLY techstartup-pro sessions
     */

    await loginAsAgency(page);

    // Create session for techstartup-pro
    const techstartupQuery = `Product-market fit analysis for ${TEST_CLIENTS.techstartup.name}`;
    await createStrategySession(
      page,
      TEST_CLIENTS.techstartup.slug,
      TEST_CLIENTS.techstartup.name,
      techstartupQuery
    );

    // Create session for ecommerce-plus
    const ecommerceQuery = `Conversion optimization for ${TEST_CLIENTS.ecommerce.name}`;
    await createStrategySession(
      page,
      TEST_CLIENTS.ecommerce.slug,
      TEST_CLIENTS.ecommerce.name,
      ecommerceQuery
    );

    // Navigate back to techstartup-pro strategy
    await page.goto(`http://127.0.0.1:56310/clients/${TEST_CLIENTS.techstartup.slug}/agents/strategy`);
    await page.waitForLoadState('domcontentloaded');

    // Get sidebar sessions
    const sidebarSessions = await getSidebarSessionTitles(page);

    // Assertions: Techstartup session should be visible
    const hasTechstartupSession = sidebarSessions.some(title =>
      title.toLowerCase().includes('product-market') ||
      title.toLowerCase().includes('techstartup') ||
      title.includes(TEST_CLIENTS.techstartup.name)
    );
    expect(hasTechstartupSession).toBeTruthy();
    console.log('✅ Techstartup session found in sidebar');

    // Assertions: Ecommerce session should NOT be visible
    const hasEcommerceSession = sidebarSessions.some(title =>
      title.toLowerCase().includes('conversion') ||
      title.toLowerCase().includes('ecommerce') ||
      title.includes(TEST_CLIENTS.ecommerce.name)
    );
    expect(hasEcommerceSession).toBeFalsy();
    console.log('✅ Ecommerce session NOT in sidebar (correct isolation)');

    // Verify client banner shows correct client (use .first() to avoid matching session titles)
    const clientBanner = page.locator('text=' + TEST_CLIENTS.techstartup.displayName).first();
    await expect(clientBanner).toBeVisible();
    console.log('✅ Client context banner shows correct client');
  });

  // ==================== TEST 3: SME Users See All Sessions ====================

  test('SME user sees all their sessions without client filtering', async ({ page }) => {
    /**
     * Baseline Test: SME users should not be affected by client filtering
     *
     * Steps:
     * 1. Login as SME user
     * 2. Create multiple strategy sessions
     * 3. Verify all sessions appear in sidebar (no filtering)
     *
     * Success Criteria:
     * - All created sessions visible
     * - No client context banner (SME direct access)
     * - No session filtering applied
     */

    await loginAsSME(page);

    // Create first session
    const query1 = 'Analyze growth opportunities for Q4 2025';
    await page.goto('http://127.0.0.1:56310/agents/strategy');
    await page.waitForLoadState('domcontentloaded');

    const newSessionButton = page.locator('button', { hasText: /New|Start/ }).first();
    if (await newSessionButton.count() > 0) {
      await newSessionButton.click();
      await page.waitForLoadState('domcontentloaded');
    }

    const textarea = page.locator('textarea').first();
    await textarea.fill(query1);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(5000); // Wait for response

    console.log(`📤 Sent query 1: "${query1}"`);

    // Create second session
    await page.goto('http://127.0.0.1:56310/agents/strategy');
    await page.waitForLoadState('domcontentloaded');

    if (await newSessionButton.count() > 0) {
      await newSessionButton.click();
      await page.waitForLoadState('domcontentloaded');
    }

    const query2 = 'Content marketing strategy for lead generation';
    await textarea.fill(query2);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(5000);

    console.log(`📤 Sent query 2: "${query2}"`);

    // Get sidebar sessions
    const sidebarSessions = await getSidebarSessionTitles(page);

    // Assertions: Should see multiple sessions
    expect(sidebarSessions.length).toBeGreaterThanOrEqual(2);
    console.log(`✅ SME user sees ${sidebarSessions.length} sessions (no filtering)`);

    // Verify NO client context banner (SME direct access)
    const clientBanner = page.locator('text=Clients');
    await expect(clientBanner).not.toBeVisible();
    console.log('✅ No client context banner (correct for SME users)');

    // Verify URL does not contain /clients/ prefix
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/clients/');
    console.log('✅ URL is /agents/strategy (no client prefix)');
  });

  // ==================== TEST 4: Session Count Verification ====================

  test('session counts remain accurate after client switching', async ({ page }) => {
    /**
     * Edge Case Test: Verify session counts update correctly when switching clients
     *
     * Steps:
     * 1. Create 2 sessions for ecommerce-plus
     * 2. Create 1 session for techstartup-pro
     * 3. Switch between clients
     * 4. Verify session counts are accurate for each client
     */

    await loginAsAgency(page);

    // Create 2 sessions for ecommerce-plus
    await createStrategySession(
      page,
      TEST_CLIENTS.ecommerce.slug,
      TEST_CLIENTS.ecommerce.name,
      'Session 1 for ecommerce'
    );

    await createStrategySession(
      page,
      TEST_CLIENTS.ecommerce.slug,
      TEST_CLIENTS.ecommerce.name,
      'Session 2 for ecommerce'
    );

    // Navigate to ecommerce-plus and check count
    await page.goto(`http://127.0.0.1:56310/clients/${TEST_CLIENTS.ecommerce.slug}/agents/strategy`);
    await page.waitForLoadState('domcontentloaded');

    let sidebarSessions = await getSidebarSessionTitles(page);
    expect(sidebarSessions.length).toBeGreaterThanOrEqual(2);
    console.log(`✅ Ecommerce client shows ${sidebarSessions.length} sessions`);

    // Create 1 session for techstartup-pro
    await createStrategySession(
      page,
      TEST_CLIENTS.techstartup.slug,
      TEST_CLIENTS.techstartup.name,
      'Session 1 for techstartup'
    );

    // Navigate to techstartup and verify isolation (no ecommerce sessions)
    await page.goto(`http://127.0.0.1:56310/clients/${TEST_CLIENTS.techstartup.slug}/agents/strategy`);
    await page.waitForLoadState('domcontentloaded');

    sidebarSessions = await getSidebarSessionTitles(page);
    expect(sidebarSessions.length).toBeGreaterThanOrEqual(1);

    // Verify NO ecommerce sessions are visible
    const hasEcommerce = sidebarSessions.some(title =>
      title.toLowerCase().includes('ecommerce') ||
      title.toLowerCase().includes('e-commerce') ||
      title.toLowerCase().includes('conversion')
    );
    expect(hasEcommerce).toBeFalsy();
    console.log(`✅ Techstartup client shows ${sidebarSessions.length} session(s), all isolated correctly`);

    // Switch back to ecommerce and verify isolation (no techstartup sessions)
    await page.goto(`http://127.0.0.1:56310/clients/${TEST_CLIENTS.ecommerce.slug}/agents/strategy`);
    await page.waitForLoadState('domcontentloaded');

    sidebarSessions = await getSidebarSessionTitles(page);
    expect(sidebarSessions.length).toBeGreaterThanOrEqual(2);

    // Verify NO techstartup sessions are visible
    const hasTechstartup = sidebarSessions.some(title =>
      title.toLowerCase().includes('saas') ||
      title.toLowerCase().includes('techstartup') ||
      title.toLowerCase().includes('pmf')
    );
    expect(hasTechstartup).toBeFalsy();
    console.log(`✅ Ecommerce shows ${sidebarSessions.length} sessions after switching, all isolated correctly`);
  });
});
