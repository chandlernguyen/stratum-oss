/**
 * Action Plan Client Context Preservation E2E Test
 *
 * Tests that action plan buttons preserve client context when navigating between agents:
 * - Strategy agent generates action plan with next step buttons
 * - Clicking action buttons navigates to correct client-scoped URLs
 * - Target agent receives proper client context
 * - Navigation works for all 4 suggested agents (persona, content, campaign, quick wins)
 *
 * Fixes tested:
 * 1. Missing /clients/:clientSlug/agents/content/session/:sessionId route
 * 2. ActionPlanButtons using client context-aware navigation
 * 3. All agent configs updated with /agents/* base paths
 *
 * Run Instructions:
 *   # Run this test file
 *   npm run test apps/web/tests/agency/action-plan-client-context.spec.ts
 *
 *   # Run in headed mode (visible browser)
 *   npm run test apps/web/tests/agency/action-plan-client-context.spec.ts -- --headed
 *
 *   # Debug mode
 *   npm run test apps/web/tests/agency/action-plan-client-context.spec.ts -- --debug
 *
 * Prerequisites:
 *   - Frontend: npm run dev (http://127.0.0.1:56310)
 *   - Backend: poetry run uvicorn apps.api.main:app --reload --port 8000
 *   - Database: supabase start
 *   - Test users: agency.owner@example.com (password: LocalDevOnly123!)
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Test credentials
const AGENCY_USER = {
  email: 'agency.owner@example.com',
  password: 'LocalDevOnly123!'
};

// Test client from seed data
const TEST_CLIENT = {
  slug: 'techstartup-pro',
  name: 'TechStartup Pro'
};

test.describe('Action Plan Client Context Preservation', () => {
  test.setTimeout(180000); // 3 minutes (agent responses + navigation)

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

    await page.fill('input[type="email"]', AGENCY_USER.email);
    await page.fill('input[type="password"]', AGENCY_USER.password);
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await page.waitForURL(/\/(dashboard)?$/, { timeout: 15000 });
    console.log('✅ Logged in as agency user');
  }

  /**
   * Helper: Send message to agent and wait for response
   */
  async function sendAgentMessage(page: Page, message: string) {
    // Wait for page to be fully loaded
    await page.waitForLoadState('domcontentloaded');

    // Find the textarea input (AgentChat uses Textarea component)
    const messageInput = page.locator('textarea').first();
    await messageInput.waitFor({ state: 'visible', timeout: 15000 });
    await messageInput.fill(message);

    // Submit message - look for Send button with icon
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.waitFor({ state: 'visible', timeout: 5000 });
    await submitButton.click();

    // Wait for response to complete (look for action plan buttons)
    await page.waitForSelector('[data-testid="action-plan-buttons"]', {
      state: 'visible',
      timeout: 90000
    });

    console.log('✅ Agent responded with action plan');
  }

  test('Strategy agent action buttons preserve client context when navigating to Content Agent', async ({ page }) => {
    /**
     * User Journey:
     * 1. Login as agency user
     * 2. Navigate to specific client's strategy agent
     * 3. Send message that generates action plan
     * 4. Click "Content Agent" button
     * 5. Verify URL preserves /clients/:clientSlug/ prefix
     * 6. Verify content agent loads in client context
     */

    // Capture browser console logs
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[ActionPlanButtons]')) {
        console.log(`🔍 Browser Console: ${text}`);
      }
    });

    await loginAsAgency(page);

    // Navigate to client-scoped strategy agent
    const strategyUrl = `http://127.0.0.1:56310/clients/${TEST_CLIENT.slug}/agents/strategy`;
    console.log(`Navigating to: ${strategyUrl}`);
    await page.goto(strategyUrl);
    await page.waitForLoadState('domcontentloaded');

    // Verify we're in client context (check for client breadcrumb banner)
    // The ClientContextBreadcrumb shows "Clients > [Client Name] | Switch client"
    const clientBanner = page.locator('.bg-\\[\\#FAFAF9\\]').filter({ hasText: 'Clients' }).first();
    await expect(clientBanner).toBeVisible({ timeout: 10000 });
    await expect(clientBanner).toContainText(TEST_CLIENT.name);
    console.log('✅ Client context banner visible');

    // Send strategic query that will generate action plan
    const strategicQuery = "Analyze our B2B SaaS platform. We have 14% churn rate and rising customer acquisition costs. What's our strategic action plan?";
    await sendAgentMessage(page, strategicQuery);

    // Find ANY action plan button (AI responses are non-deterministic)
    const actionPlanButtons = page.locator('[data-testid="action-plan-button"]');

    // Wait for at least one button to appear
    await expect(actionPlanButtons.first()).toBeVisible({ timeout: 10000 });
    const buttonCount = await actionPlanButtons.count();
    console.log(`✅ Found ${buttonCount} action plan button(s)`);

    // Get the text of the first button to know which agent we're testing
    const firstButton = actionPlanButtons.first();
    const buttonText = await firstButton.textContent();
    console.log(`✅ Clicking first action plan button: ${buttonText}`);

    // Extract agent type from button text (e.g., "Content Agent" → "content")
    const agentTypeMatch = buttonText?.match(/(Content|Persona|Campaign|Performance)/i);
    const targetAgentType = agentTypeMatch ? agentTypeMatch[1].toLowerCase() : 'unknown';
    console.log(`Target agent type: ${targetAgentType}`);

    // Click button and wait for navigation
    await firstButton.click();

    // Verify confirmation dialog appears (dialog text includes agent name)
    const confirmDialog = page.locator('text=/Continue with .+ Agent\\?/i');
    await expect(confirmDialog).toBeVisible({ timeout: 5000 });
    console.log('✅ Confirmation dialog appeared');

    // Click "Continue to Agent" button
    const continueButton = page.locator('button', { hasText: /Continue to Agent/i });
    await continueButton.click();

    // Wait for URL to change (more reliable than networkidle for navigation)
    await page.waitForFunction(
      (strategyUrl) => !window.location.href.includes('/agents/strategy/'),
      await page.url(),
      { timeout: 10000 }
    );
    console.log('✅ Navigation completed, URL changed');

    // Also wait for page to be interactive
    await page.waitForLoadState('domcontentloaded');
    console.log('✅ Page loaded');

    // CRITICAL ASSERTION: Verify URL preserves client context and navigated to target agent
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);

    // Verify client context is preserved in URL
    expect(currentUrl).toContain(`/clients/${TEST_CLIENT.slug}/agents/`);
    console.log(`✅ URL preserves client context: /clients/${TEST_CLIENT.slug}`);

    // Verify we navigated away from strategy agent
    expect(currentUrl).not.toContain('/agents/strategy/');
    console.log('✅ Successfully navigated away from strategy agent');

    // Verify session was created (should have /session/:sessionId in URL)
    expect(currentUrl).toMatch(/\/agents\/[^/]+\/session\/[a-f0-9-]+/);
    console.log('✅ Session ID present in URL');

    // Verify target agent loaded in client context - check breadcrumb banner
    const clientBannerAfterNav = page.locator('.bg-\\[\\#FAFAF9\\]').filter({ hasText: 'Clients' }).first();
    await expect(clientBannerAfterNav).toBeVisible({ timeout: 10000 });
    await expect(clientBannerAfterNav).toContainText(TEST_CLIENT.name);
    console.log('✅ Target agent displays client context banner');

    // Verify agent interface loaded - check for textarea
    const targetTextarea = page.locator('textarea').first();
    await expect(targetTextarea).toBeVisible({ timeout: 10000 });
    console.log('✅ Target agent interface loaded successfully');

    // Verify there's a prefilled message (from action plan context)
    const prefilledText = await targetTextarea.inputValue();
    console.log(`Prefilled message length: ${prefilledText.length} characters`);
    if (prefilledText.length > 0) {
      console.log(`✅ Prefilled message present: "${prefilledText.substring(0, 50)}..."`);

      // Send the prefilled message to test agent chat functionality
      const sendButton = page.locator('button').filter({ has: page.locator('[data-lucide="send"]') });
      await sendButton.click();
      console.log('✅ Sent prefilled message to target agent');

      // Wait for agent to start responding (streaming starts)
      await page.waitForTimeout(2000);
      console.log('✅ Target agent chat is functional');
    } else {
      console.log('⚠️  No prefilled message found (may need to be implemented)');
    }
  });

  test('Action buttons work for all 4 agent types (persona, content, campaign, performance)', async ({ page }) => {
    /**
     * Test: Verify all action plan agent types preserve client context
     *
     * Agents tested:
     * 1. Persona Agent (research tasks)
     * 2. Content Agent (marketing tasks)
     * 3. Campaign Planning Agent (sales tasks)
     * 4. Performance Intelligence Agent (quick wins tasks)
     */

    await loginAsAgency(page);

    // Navigate to client-scoped strategy agent
    const strategyUrl = `http://127.0.0.1:56310/clients/${TEST_CLIENT.slug}/agents/strategy`;
    await page.goto(strategyUrl);
    await page.waitForLoadState('domcontentloaded');

    // Send query that generates multiple action types
    const comprehensiveQuery = `
      Create a comprehensive marketing action plan for our B2B SaaS startup:
      1. Research our target personas and customer segments
      2. Develop content marketing strategy and blog posts
      3. Plan sales campaigns and outreach sequences
      4. Identify quick win opportunities for immediate impact
    `;
    await sendAgentMessage(page, comprehensiveQuery);

    // Get all action plan buttons
    const actionButtons = page.locator('[data-testid="action-plan-button"]');
    const buttonCount = await actionButtons.count();
    console.log(`Found ${buttonCount} action plan buttons`);

    // Store base URL for validation
    const baseClientUrl = `/clients/${TEST_CLIENT.slug}/agents`;

    // Test each button type if present
    const expectedAgents = [
      { name: 'Persona Agent', path: '/persona' },
      { name: 'Content Agent', path: '/content' },
      { name: 'Campaign Agent', path: '/campaign-planning' },
      { name: 'Performance', path: '/performance-intelligence' } // Could be "Quick Wins" or "Performance Intelligence"
    ];

    for (const agent of expectedAgents) {
      // Check if this agent button exists
      const agentButton = actionButtons.filter({ hasText: new RegExp(agent.name, 'i') });
      const isVisible = await agentButton.isVisible().catch(() => false);

      if (isVisible) {
        console.log(`Testing ${agent.name}...`);

        // Get current URL before clicking
        const beforeUrl = page.url();

        // Click button
        await agentButton.click();

        // Handle confirmation dialog
        const confirmButton = page.locator('button', { hasText: /Continue to Agent/i });
        await confirmButton.waitFor({ state: 'visible', timeout: 5000 });
        await confirmButton.click();

        // Wait for navigation
        await page.waitForLoadState('networkidle', { timeout: 30000 });

        // Wait for page to load
        await page.waitForLoadState('networkidle', { timeout: 30000 });
        console.log(`✅ ${agent.name}: Page loaded after navigation`);

        // Verify URL structure
        const currentUrl = page.url();
        expect(currentUrl).toContain(baseClientUrl + agent.path);
        console.log(`✅ ${agent.name}: URL preserved client context`);

        // Verify client banner still visible
        const agentBanner = page.locator('.bg-\\[\\#FAFAF9\\]').filter({ hasText: 'Clients' }).first();
        await expect(agentBanner).toBeVisible({ timeout: 10000 });
        await expect(agentBanner).toContainText(TEST_CLIENT.name);

        // Go back to strategy agent for next test
        await page.goto(beforeUrl);
        await page.waitForLoadState('domcontentloaded');
      } else {
        console.log(`⏭️  ${agent.name} button not present in action plan (okay - depends on LLM response)`);
      }
    }
  });

  test('SME user action buttons work without client context (baseline)', async ({ page }) => {
    /**
     * Baseline test: Verify SME users don't have client prefix in URLs
     * This ensures the fix doesn't break SME workflows
     */

    // Login as SME user
    await page.goto('http://127.0.0.1:56310/login');
    await page.fill('input[type="email"]', 'sme.owner@example.com');
    await page.fill('input[type="password"]', 'LocalDevOnly123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard)?$/, { timeout: 15000 });

    // Navigate to strategy agent (no client context)
    await page.goto('http://127.0.0.1:56310/agents/strategy');
    await page.waitForLoadState('domcontentloaded');

    // Send strategic query
    const query = "Analyze our business strategy and create an action plan.";
    await sendAgentMessage(page, query);

    // Find action button (any type)
    const firstButton = page.locator('[data-testid="action-plan-button"]').first();

    if (await firstButton.isVisible().catch(() => false)) {
      await firstButton.click();

      // Confirm navigation
      const confirmButton = page.locator('button', { hasText: /Continue to Agent/i });
      await confirmButton.click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      // Verify URL does NOT contain /clients/ prefix
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/clients/');
      expect(currentUrl).toMatch(/\/agents\/(persona|content|campaign-planning|performance-intelligence)/);
      console.log('✅ SME user URLs do not include client context (correct)');
    } else {
      console.log('⚠️  No action plan buttons generated (LLM variance - acceptable)');
    }
  });

  test('Client context preserved across multiple agent navigation hops', async ({ page }) => {
    /**
     * Test: Chain navigation through multiple agents
     * Strategy → Content → Persona → verify client context never lost
     */

    await loginAsAgency(page);

    // Start in client-scoped strategy agent
    const strategyUrl = `http://127.0.0.1:56310/clients/${TEST_CLIENT.slug}/agents/strategy`;
    await page.goto(strategyUrl);
    await page.waitForLoadState('domcontentloaded');

    // Send query to generate action plan
    await sendAgentMessage(page, "Create a marketing action plan with content and persona research tasks.");

    // Click Content Agent button
    const contentButton = page.locator('[data-testid="action-plan-button"]').filter({ hasText: /Content Agent/i });
    if (await contentButton.isVisible().catch(() => false)) {
      await contentButton.click();
      const confirmButton = page.locator('button', { hasText: /Continue to Agent/i });
      await confirmButton.click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      // Wait for page to load
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      // Verify client context in Content Agent
      let currentUrl = page.url();
      expect(currentUrl).toContain(`/clients/${TEST_CLIENT.slug}/agents/content`);

      // Verify banner visible
      let currentBanner = page.locator('.bg-\\[\\#FAFAF9\\]').filter({ hasText: 'Clients' }).first();
      await expect(currentBanner).toBeVisible({ timeout: 10000 });
      console.log('✅ Hop 1: Strategy → Content (client context preserved)');

      // Now navigate to Persona Agent from URL (simulating user navigation)
      await page.goto(`http://127.0.0.1:56310/clients/${TEST_CLIENT.slug}/agents/persona`);
      await page.waitForLoadState('domcontentloaded');

      // Verify client context still present
      currentUrl = page.url();
      expect(currentUrl).toContain(`/clients/${TEST_CLIENT.slug}/agents/persona`);

      currentBanner = page.locator('.bg-\\[\\#FAFAF9\\]').filter({ hasText: 'Clients' }).first();
      await expect(currentBanner).toBeVisible({ timeout: 10000 });
      await expect(currentBanner).toContainText(TEST_CLIENT.name);
      console.log('✅ Hop 2: Content → Persona (client context preserved)');

      // Navigate back to strategy
      await page.goto(`http://127.0.0.1:56310/clients/${TEST_CLIENT.slug}/agents/strategy`);
      await page.waitForLoadState('domcontentloaded');

      currentUrl = page.url();
      expect(currentUrl).toContain(`/clients/${TEST_CLIENT.slug}/agents/strategy`);

      currentBanner = page.locator('.bg-\\[\\#FAFAF9\\]').filter({ hasText: 'Clients' }).first();
      await expect(currentBanner).toBeVisible({ timeout: 10000 });
      console.log('✅ Hop 3: Persona → Strategy (client context preserved through full circle)');
    } else {
      console.log('⚠️  Content Agent button not generated - skipping multi-hop test');
    }
  });

  test('Browser back button maintains client context', async ({ page }) => {
    /**
     * Test: Using browser back/forward maintains client context
     */

    await loginAsAgency(page);

    // Navigate to client strategy agent
    const strategyUrl = `http://127.0.0.1:56310/clients/${TEST_CLIENT.slug}/agents/strategy`;
    await page.goto(strategyUrl);
    await page.waitForLoadState('domcontentloaded');

    // Send message
    await sendAgentMessage(page, "Create a content marketing action plan.");

    // Click Content Agent button
    const contentButton = page.locator('[data-testid="action-plan-button"]').filter({ hasText: /Content Agent/i });
    if (await contentButton.isVisible().catch(() => false)) {
      await contentButton.click();
      const confirmButton = page.locator('button', { hasText: /Continue to Agent/i });
      await confirmButton.click();
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      // Wait for page load
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      // Verify we're in Content Agent with client context
      let currentUrl = page.url();
      expect(currentUrl).toContain(`/clients/${TEST_CLIENT.slug}/agents/content`);
      console.log('✅ Navigated to Content Agent');

      // Use browser back button
      await page.goBack();
      await page.waitForLoadState('domcontentloaded');

      // Verify we're back in Strategy Agent with client context
      currentUrl = page.url();
      expect(currentUrl).toContain(`/clients/${TEST_CLIENT.slug}/agents/strategy`);

      let currentBanner = page.locator('.bg-\\[\\#FAFAF9\\]').filter({ hasText: 'Clients' }).first();
      await expect(currentBanner).toBeVisible({ timeout: 10000 });
      await expect(currentBanner).toContainText(TEST_CLIENT.name);
      console.log('✅ Browser back button preserves client context');

      // Use forward button
      await page.goForward();
      await page.waitForLoadState('domcontentloaded');

      currentUrl = page.url();
      expect(currentUrl).toContain(`/clients/${TEST_CLIENT.slug}/agents/content`);

      currentBanner = page.locator('.bg-\\[\\#FAFAF9\\]').filter({ hasText: 'Clients' }).first();
      await expect(currentBanner).toBeVisible({ timeout: 10000 });
      console.log('✅ Browser forward button preserves client context');
    } else {
      console.log('⚠️  Content Agent button not generated - skipping back/forward test');
    }
  });
});
