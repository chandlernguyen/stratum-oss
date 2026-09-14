/**
 * Agent Navigation Client Context Preservation E2E Test
 *
 * Tests navigation bug fixes (2025-11-01):
 * - PersonaAgent.handleInterviewPersona preserves client context
 * - ContentAgent.handleOpenStrategy preserves client context
 * - ContentAgent.handleOpenPersona preserves client context
 *
 * Bug Context:
 * - Before fix: Navigation functions used ROUTES without checking clientSlug
 * - After fix: All navigation checks `if (clientSlug)` and preserves context
 * - Impact: Agency users no longer lose client context when navigating between agents
 *
 * Run Instructions:
 *   # Run this test file
 *   npm run test apps/web/tests/agency/agent-navigation-client-context.spec.ts
 *
 *   # Run in headed mode (visible browser)
 *   npm run test apps/web/tests/agency/agent-navigation-client-context.spec.ts -- --headed
 *
 *   # Debug mode
 *   npm run test apps/web/tests/agency/agent-navigation-client-context.spec.ts -- --debug
 *
 * Prerequisites:
 *   - Frontend: npm run dev (http://127.0.0.1:56310)
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

test.describe('Agent Navigation Client Context Preservation', () => {
  test.setTimeout(60000); // 1 minute timeout

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    // Clear session
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
  }

  /**
   * Helper: Login as SME user
   */
  async function loginAsSME(page: Page) {
    await page.goto('http://127.0.0.1:56310/login');
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

    await page.waitForFunction(
      () => window.location.pathname === '/' || window.location.pathname.includes('dashboard'),
      { timeout: 15000 }
    );
  }

  /**
   * Helper: Navigate to client workspace
   */
  async function navigateToClient(page: Page, clientSlug: string) {
    await page.goto(`http://127.0.0.1:56310/clients/${clientSlug}`);
    await page.waitForLoadState('domcontentloaded');

    // Verify client context loaded by checking URL and that we're not on an error page
    await page.waitForURL(`**/clients/${clientSlug}**`, { timeout: 10000 });

    // Verify we're not seeing an error page
    const hasError = await page.locator('text=/Access Denied|Not Found|Error/i').isVisible().catch(() => false);
    if (hasError) {
      throw new Error('Navigated to error page - client context not loaded');
    }
  }

  /**
   * Test 1: PersonaAgent → Interview Persona preserves client context (Bug #1)
   */
  test('agency user: persona interview navigation preserves client context', async ({ page }) => {
    /**
     * User Journey:
     * 1. Login as agency user
     * 2. Navigate to client workspace
     * 3. Navigate to Persona Agent
     * 4. Click "Interview Persona" button (if persona exists)
     * 5. Verify URL still contains /clients/{slug}/
     *
     * Success Criteria:
     * - URL after navigation: /clients/techstartup-pro/agents/persona/interview/{id}
     * - NOT: /agents/persona/interview/{id} (client context lost)
     */

    await loginAsAgency(page);
    await navigateToClient(page, TEST_CLIENT.slug);

    // Navigate to Persona Agent
    await page.goto(`http://127.0.0.1:56310/clients/${TEST_CLIENT.slug}/agents/persona`);
    await page.waitForLoadState('domcontentloaded');

    // Verify we're in client-scoped persona agent
    const currentURL = page.url();
    expect(currentURL).toContain(`/clients/${TEST_CLIENT.slug}/agents/persona`);

    // Look for any persona cards with interview buttons
    // Note: This may not exist if no personas are created yet
    const personaCards = page.locator('[data-testid="persona-card"]');
    const personaCount = await personaCards.count();

    if (personaCount > 0) {
      console.log(`[Test] Found ${personaCount} personas, testing interview navigation`);

      // Click first persona's interview button (if exists)
      const interviewButton = personaCards.first().locator('button:has-text("Interview")');
      const hasInterviewButton = await interviewButton.count() > 0;

      if (hasInterviewButton) {
        await interviewButton.click();
        await page.waitForLoadState('domcontentloaded');

        // Verify URL preserves client context
        const interviewURL = page.url();
        expect(interviewURL).toContain(`/clients/${TEST_CLIENT.slug}/agents/persona/interview/`);
        console.log(`[Test] ✅ Interview URL preserved client context: ${interviewURL}`);
      } else {
        console.log(`[Test] ⚠️ No interview button found, checking alternative navigation`);
      }
    } else {
      console.log(`[Test] ⚠️ No personas found, skipping interview navigation test`);
      test.skip();
    }
  });

  /**
   * Test 2: ContentAgent → Strategy Outputs preserves client context (Bug #2)
   */
  test('agency user: content agent strategy navigation preserves client context', async ({ page }) => {
    /**
     * User Journey:
     * 1. Login as agency user
     * 2. Navigate to client workspace
     * 3. Navigate to Content Agent
     * 4. Click strategy stats card (navigates to /outputs?agent=marketing_strategy)
     * 5. Verify URL still contains /clients/{slug}/
     *
     * Success Criteria:
     * - URL after navigation: /clients/techstartup-pro/outputs?agent=marketing_strategy
     * - NOT: /outputs?agent=marketing_strategy (client context lost)
     */

    await loginAsAgency(page);
    await navigateToClient(page, TEST_CLIENT.slug);

    // Navigate to Content Agent
    await page.goto(`http://127.0.0.1:56310/clients/${TEST_CLIENT.slug}/agents/content`);
    await page.waitForLoadState('domcontentloaded');

    // Verify we're in client-scoped content agent
    const currentURL = page.url();
    expect(currentURL).toContain(`/clients/${TEST_CLIENT.slug}/agents/content`);

    // Look for strategy stats card with checkmark (indicates data exists and card is clickable)
    // Card shows "✓" when data exists, "0" when no data
    const strategyCardWithData = page.locator('text=Strategy').locator('..').locator('text=✓');
    const hasStrategyData = await strategyCardWithData.count() > 0;

    if (hasStrategyData) {
      // Click the strategy card to navigate to outputs
      const strategyCard = page.locator('text=Strategy').locator('..');
      await strategyCard.click();
      await page.waitForLoadState('domcontentloaded');

      // Verify URL preserves client context
      const outputsURL = page.url();
      expect(outputsURL).toContain(`/clients/${TEST_CLIENT.slug}/outputs`);
      expect(outputsURL).toContain('agent=marketing_strategy');
      console.log(`[Test] ✅ Strategy outputs URL preserved client context: ${outputsURL}`);
    } else {
      console.log(`[Test] ⚠️ No strategy data exists for client, skipping strategy navigation test`);
      test.skip();
    }
  });

  /**
   * Test 3: ContentAgent → Persona Outputs preserves client context (Bug #3)
   */
  test('agency user: content agent persona navigation preserves client context', async ({ page }) => {
    /**
     * User Journey:
     * 1. Login as agency user
     * 2. Navigate to client workspace
     * 3. Navigate to Content Agent
     * 4. Click persona stats card (navigates to /outputs?agent=persona)
     * 5. Verify URL still contains /clients/{slug}/
     *
     * Success Criteria:
     * - URL after navigation: /clients/techstartup-pro/outputs?agent=persona
     * - NOT: /outputs?agent=persona (client context lost)
     */

    await loginAsAgency(page);
    await navigateToClient(page, TEST_CLIENT.slug);

    // Navigate to Content Agent
    await page.goto(`http://127.0.0.1:56310/clients/${TEST_CLIENT.slug}/agents/content`);
    await page.waitForLoadState('domcontentloaded');

    // Verify we're in client-scoped content agent
    const currentURL = page.url();
    expect(currentURL).toContain(`/clients/${TEST_CLIENT.slug}/agents/content`);

    // Look for persona stats card with checkmark (indicates data exists and card is clickable)
    // Card shows "✓" when data exists, "0" when no data
    const personaCardWithData = page.locator('text=Personas').locator('..').locator('text=✓');
    const hasPersonaData = await personaCardWithData.count() > 0;

    if (hasPersonaData) {
      // Click the persona card to navigate to outputs
      const personaCard = page.locator('text=Personas').locator('..');
      await personaCard.click();
      await page.waitForLoadState('domcontentloaded');

      // Verify URL preserves client context
      const outputsURL = page.url();
      expect(outputsURL).toContain(`/clients/${TEST_CLIENT.slug}/outputs`);
      expect(outputsURL).toContain('agent=persona');
      console.log(`[Test] ✅ Persona outputs URL preserved client context: ${outputsURL}`);
    } else {
      console.log(`[Test] ⚠️ No persona data exists for client, skipping persona navigation test`);
      test.skip();
    }
  });

  /**
   * Test 4: SME user regression - navigation still works without client context
   */
  test('sme user: navigation works correctly without client context (regression)', async ({ page }) => {
    /**
     * User Journey:
     * 1. Login as SME user
     * 2. Navigate to Persona Agent
     * 3. Click interview persona (if exists)
     * 4. Verify URL is /agents/persona/interview/{id} (no client slug)
     *
     * Success Criteria:
     * - URL does NOT contain /clients/
     * - Navigation works correctly for SME users
     * - No client context in URL (SME users don't have multi-client context)
     */

    await loginAsSME(page);

    // Navigate to Persona Agent (SME route - no client slug)
    await page.goto('http://127.0.0.1:56310/agents/persona');
    await page.waitForLoadState('domcontentloaded');

    // Verify we're in SME persona agent (no client slug)
    const currentURL = page.url();
    expect(currentURL).not.toContain('/clients/');
    expect(currentURL).toContain('/agents/persona');

    console.log(`[Test] ✅ SME user correctly on /agents/persona without client context`);

    // Look for any persona cards with interview buttons
    const personaCards = page.locator('[data-testid="persona-card"]');
    const personaCount = await personaCards.count();

    if (personaCount > 0) {
      const interviewButton = personaCards.first().locator('button:has-text("Interview")');
      const hasInterviewButton = await interviewButton.count() > 0;

      if (hasInterviewButton) {
        await interviewButton.click();
        await page.waitForLoadState('domcontentloaded');

        // Verify SME URL does NOT have client context
        const interviewURL = page.url();
        expect(interviewURL).not.toContain('/clients/');
        expect(interviewURL).toContain('/agents/persona/interview/');
        console.log(`[Test] ✅ SME interview URL correct (no client context): ${interviewURL}`);
      }
    } else {
      console.log(`[Test] ⚠️ No personas found for SME user, basic URL check passed`);
    }
  });

  /**
   * Test 5: Direct URL access - client context enforced
   */
  test('agency user: direct URL access to client-scoped agents works', async ({ page }) => {
    /**
     * User Journey:
     * 1. Login as agency user
     * 2. Directly navigate to /clients/{slug}/agents/persona
     * 3. Verify page loads with client context
     * 4. Verify client name visible
     *
     * Success Criteria:
     * - Page loads successfully
     * - Client context visible (client name in header/breadcrumb)
     * - useAgencyRouteGuard() enforces client context
     */

    await loginAsAgency(page);

    // Direct navigation to client-scoped persona agent
    await page.goto(`http://127.0.0.1:56310/clients/${TEST_CLIENT.slug}/agents/persona`);
    await page.waitForLoadState('domcontentloaded');

    // Verify URL is correct
    expect(page.url()).toContain(`/clients/${TEST_CLIENT.slug}/agents/persona`);

    // Verify client context is visible (client name should appear somewhere)
    // This could be in breadcrumbs, header, or sidebar
    await expect(page.locator('text=' + TEST_CLIENT.name)).toBeVisible({ timeout: 10000 });

    console.log(`[Test] ✅ Direct URL access to client-scoped agent works`);
  });
});
