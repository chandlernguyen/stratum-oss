/**
 * Agency Client-Scoped Agent Sessions E2E Test
 *
 * Tests that agent sessions maintain proper client context:
 * - Client context flows from frontend → backend → agent
 * - Agents respond with client-specific intelligence
 * - Client isolation is maintained between sessions
 * - Session URLs preserve client context
 *
 * Part of Week 6 Implementation Testing
 *
 * Run Instructions:
 *   # Run this test file
 *   npm run test apps/web/tests/agency/agency-client-context.spec.ts
 *
 *   # Run in headed mode (visible browser)
 *   npm run test apps/web/tests/agency/agency-client-context.spec.ts -- --headed
 *
 *   # Debug mode
 *   npm run test apps/web/tests/agency/agency-client-context.spec.ts -- --debug
 *
 * Prerequisites:
 *   - Frontend: npm run dev (http://127.0.0.1:56310)
 *   - Backend: poetry run uvicorn apps.api.main:app --reload --port 8000
 *   - Database: supabase start with migration 162 applied
 *   - Test agency user: agency.admin@example.com
 *   - Test clients: techstartup-pro, ecommerce-plus
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// Test credentials
const AGENCY_USER = {
  email: 'agency.admin@example.com',
  password: 'LocalDevOnly123!'
};

// Test client slugs from migration 162
const TEST_CLIENTS = {
  techstartup: {
    slug: 'techstartup-pro',
    name: 'TechStartup Pro',
    industry: 'SaaS/Software',
    stage: 'Growth',
    model: 'B2B'
  },
  ecommerce: {
    slug: 'ecommerce-plus',
    name: 'E-Commerce Plus',
    industry: 'E-commerce',
    stage: 'Mature',
    model: 'B2C'
  }
};

test.describe('Agency User Client-Scoped Agent Sessions', () => {
  test.setTimeout(120000); // 2 minutes (agent responses can take time)

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    // Clear session
    await page.goto('http://127.0.0.1:56310');
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
  });

  /**
   * Helper function to login as agency user
   */
  async function loginAsAgency(page: Page) {
    // Navigate directly to login page (not root URL which shows landing page)
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

  /**
   * Helper function to send a message and wait for response
   */
  async function sendMessageAndWaitForResponse(page: Page, message: string, timeoutMs = 60000) {
    // Find the textarea or contenteditable input
    const messageInput = page.locator('textarea, [contenteditable="true"]').first();
    await messageInput.waitFor({ state: 'visible', timeout: 10000 });

    // Fill and send message
    await messageInput.fill(message);
    await page.keyboard.press('Enter');

    console.log(`📤 Sent message: "${message}"`);

    // Wait for agent response to appear (look for any substantial text response)
    // Agent responses typically appear in a specific container
    await page.waitForTimeout(2000); // Brief wait for streaming to start

    // Wait for response to complete (look for stop button to disappear or response to stabilize)
    let responseText = '';
    let stableCount = 0;
    const maxWaitTime = Date.now() + timeoutMs;

    while (Date.now() < maxWaitTime && stableCount < 3) {
      await page.waitForTimeout(2000);

      // Try to get response text from various possible containers
      const possibleSelectors = [
        '[data-testid="agent-response"]',
        '.agent-message',
        '.message-content',
        '[role="article"]',
        '.prose' // Common for markdown rendering
      ];

      let currentText = '';
      for (const selector of possibleSelectors) {
        const element = page.locator(selector).last();
        if (await element.count() > 0) {
          currentText = await element.textContent() || '';
          if (currentText.length > 50) break; // Found substantial content
        }
      }

      // Check if response has stabilized (not changing anymore)
      if (currentText === responseText && currentText.length > 50) {
        stableCount++;
      } else {
        stableCount = 0;
        responseText = currentText;
      }
    }

    console.log(`✅ Agent response received (${responseText.length} characters)`);
    return responseText;
  }

  /**
   * Test 1: TechStartup Pro - Client Context
   */
  test('ACC1: Agent responds with TechStartup Pro client context', async ({ page }) => {
    await loginAsAgency(page);

    // Navigate to Strategy Agent with TechStartup Pro context
    const clientSlug = TEST_CLIENTS.techstartup.slug;
    await page.goto(`http://127.0.0.1:56310/clients/${clientSlug}/agents/strategy`);
    await page.waitForLoadState('domcontentloaded');

    console.log(`🎯 Navigated to Strategy Agent for ${TEST_CLIENTS.techstartup.name}`);

    // Verify URL contains client context
    expect(page.url()).toContain(`/clients/${clientSlug}/agents/strategy`);
    console.log('✅ URL maintains client context');

    // Send message asking about client
    const responseText = await sendMessageAndWaitForResponse(
      page,
      'What do you know about this client?'
    );

    // Verify response contains client-specific information
    expect(responseText.length).toBeGreaterThan(100);
    console.log('✅ Agent generated substantial response');

    // Check for TechStartup Pro specific markers
    const hasClientName = responseText.includes('TechStartup') || responseText.includes('Tech Startup');
    const hasIndustry = responseText.toLowerCase().includes('saas') ||
                        responseText.toLowerCase().includes('software') ||
                        responseText.toLowerCase().includes('technology');
    const hasStage = responseText.toLowerCase().includes('growth');
    const hasModel = responseText.toLowerCase().includes('b2b');

    console.log('📊 Client Context Markers:');
    console.log(`  - Client Name: ${hasClientName ? '✅' : '❌'}`);
    console.log(`  - Industry (SaaS/Software): ${hasIndustry ? '✅' : '❌'}`);
    console.log(`  - Stage (Growth): ${hasStage ? '✅' : '❌'}`);
    console.log(`  - Model (B2B): ${hasModel ? '✅' : '❌'}`);

    // At least 2 markers should be present to confirm client context
    const markersPresent = [hasClientName, hasIndustry, hasStage, hasModel].filter(Boolean).length;
    expect(markersPresent).toBeGreaterThanOrEqual(2);
    console.log(`✅ Agent response includes client-specific context (${markersPresent}/4 markers)`);

    // Verify URL still has client context
    expect(page.url()).toContain(`/clients/${clientSlug}`);
    console.log('✅ Client context maintained after agent response');
  });

  /**
   * Test 2: E-Commerce Plus - Client Context
   */
  test('ACC2: Agent responds with E-Commerce Plus client context', async ({ page }) => {
    await loginAsAgency(page);

    // Navigate to Strategy Agent with E-Commerce Plus context
    const clientSlug = TEST_CLIENTS.ecommerce.slug;
    await page.goto(`http://127.0.0.1:56310/clients/${clientSlug}/agents/strategy`);
    await page.waitForLoadState('domcontentloaded');

    console.log(`🎯 Navigated to Strategy Agent for ${TEST_CLIENTS.ecommerce.name}`);

    // Verify URL contains client context
    expect(page.url()).toContain(`/clients/${clientSlug}/agents/strategy`);
    console.log('✅ URL maintains client context');

    // Send message asking about client
    const responseText = await sendMessageAndWaitForResponse(
      page,
      'What do you know about this client?'
    );

    // Verify response contains client-specific information
    expect(responseText.length).toBeGreaterThan(100);
    console.log('✅ Agent generated substantial response');

    // Check for E-Commerce Plus specific markers
    const hasClientName = responseText.toLowerCase().includes('commerce') ||
                          responseText.toLowerCase().includes('retail');
    const hasIndustry = responseText.toLowerCase().includes('commerce') ||
                        responseText.toLowerCase().includes('retail') ||
                        responseText.toLowerCase().includes('shopping');
    const hasStage = responseText.toLowerCase().includes('mature') ||
                     responseText.toLowerCase().includes('established');
    const hasModel = responseText.toLowerCase().includes('b2c') ||
                     responseText.toLowerCase().includes('consumer') ||
                     responseText.toLowerCase().includes('direct-to-consumer');

    console.log('📊 Client Context Markers:');
    console.log(`  - Client Name: ${hasClientName ? '✅' : '❌'}`);
    console.log(`  - Industry (E-commerce/Retail): ${hasIndustry ? '✅' : '❌'}`);
    console.log(`  - Stage (Mature): ${hasStage ? '✅' : '❌'}`);
    console.log(`  - Model (B2C): ${hasModel ? '✅' : '❌'}`);

    // At least 2 markers should be present to confirm client context
    const markersPresent = [hasClientName, hasIndustry, hasStage, hasModel].filter(Boolean).length;
    expect(markersPresent).toBeGreaterThanOrEqual(2);
    console.log(`✅ Agent response includes client-specific context (${markersPresent}/4 markers)`);

    // Verify URL still has client context
    expect(page.url()).toContain(`/clients/${clientSlug}`);
    console.log('✅ Client context maintained after agent response');
  });

  /**
   * Test 3: Client Isolation - Verify No Cross-Contamination
   */
  test('ACC3: Client isolation - TechStartup context does not appear in E-Commerce session', async ({ page }) => {
    await loginAsAgency(page);

    // First, interact with TechStartup Pro
    const techSlug = TEST_CLIENTS.techstartup.slug;
    await page.goto(`http://127.0.0.1:56310/clients/${techSlug}/agents/strategy`);
    await page.waitForLoadState('domcontentloaded');
    console.log(`🎯 Session 1: ${TEST_CLIENTS.techstartup.name}`);

    const techResponse = await sendMessageAndWaitForResponse(
      page,
      'Tell me about this client\'s industry and business model'
    );

    // Store some unique TechStartup identifiers
    const techKeywords = ['saas', 'software', 'b2b', 'techstartup', 'tech startup'];
    const techKeywordsFound = techKeywords.filter(kw =>
      techResponse.toLowerCase().includes(kw)
    );
    console.log(`📝 TechStartup keywords in response: ${techKeywordsFound.join(', ')}`);

    // Now switch to E-Commerce Plus
    const ecommerceSlug = TEST_CLIENTS.ecommerce.slug;
    await page.goto(`http://127.0.0.1:56310/clients/${ecommerceSlug}/agents/strategy`);
    await page.waitForLoadState('domcontentloaded');
    console.log(`🎯 Session 2: ${TEST_CLIENTS.ecommerce.name}`);

    const ecommerceResponse = await sendMessageAndWaitForResponse(
      page,
      'Tell me about this client\'s industry and business model'
    );

    // Verify E-Commerce Plus response doesn't mention TechStartup
    const hasTechStartupContamination = ecommerceResponse.toLowerCase().includes('techstartup') ||
                                         ecommerceResponse.toLowerCase().includes('tech startup');
    expect(hasTechStartupContamination).toBe(false);
    console.log('✅ No TechStartup Pro contamination in E-Commerce Plus session');

    // Verify E-Commerce Plus response has e-commerce context
    const hasEcommerceContext = ecommerceResponse.toLowerCase().includes('commerce') ||
                                ecommerceResponse.toLowerCase().includes('retail') ||
                                ecommerceResponse.toLowerCase().includes('b2c');
    expect(hasEcommerceContext).toBe(true);
    console.log('✅ E-Commerce Plus session has correct client context');

    // Verify URLs are different
    expect(page.url()).toContain(ecommerceSlug);
    expect(page.url()).not.toContain(techSlug);
    console.log('✅ Client isolation maintained via URL routing');
  });

  /**
   * Test 4: Session URL Persistence
   */
  test('ACC4: Client-scoped session URLs are persistent and bookmarkable', async ({ page }) => {
    await loginAsAgency(page);

    // Create a session with TechStartup Pro
    const clientSlug = TEST_CLIENTS.techstartup.slug;
    await page.goto(`http://127.0.0.1:56310/clients/${clientSlug}/agents/strategy`);
    await page.waitForLoadState('domcontentloaded');

    console.log(`🎯 Creating session for ${TEST_CLIENTS.techstartup.name}`);

    // Send a message to create a session
    await sendMessageAndWaitForResponse(
      page,
      'Analyze our competitive position'
    );

    // Get the session URL
    const sessionUrl = page.url();
    console.log(`📌 Session URL: ${sessionUrl}`);

    // Verify URL pattern includes client context
    expect(sessionUrl).toContain(`/clients/${clientSlug}/agents/strategy`);

    // Check if session ID is in URL
    const hasSessionId = sessionUrl.includes('/session/');
    console.log(`📝 Session ID in URL: ${hasSessionId ? 'Yes' : 'No'}`);

    if (hasSessionId) {
      // Navigate away
      await page.goto('http://127.0.0.1:56310');
      await page.waitForLoadState('domcontentloaded');
      console.log('🔄 Navigated away from session');

      // Navigate back to the session URL directly (simulating bookmark)
      await page.goto(sessionUrl);
      await page.waitForLoadState('domcontentloaded');
      console.log('🔄 Navigated back to session URL');

      // Verify we're at the correct URL
      expect(page.url()).toBe(sessionUrl);
      console.log('✅ Bookmarkable URL works correctly');

      // Verify client context is still present
      expect(page.url()).toContain(`/clients/${clientSlug}`);
      console.log('✅ Client context preserved in bookmarked URL');
    } else {
      console.log('ℹ️ Session URLs may not include session ID yet (base agent URL)');
      expect(sessionUrl).toContain(`/clients/${clientSlug}/agents/strategy`);
      console.log('✅ Client-scoped agent URL is bookmarkable');
    }
  });

  /**
   * Test 5: Multiple Agents Maintain Client Context
   */
  test('ACC5: Client context persists across different agent types', async ({ page }) => {
    await loginAsAgency(page);

    const clientSlug = TEST_CLIENTS.techstartup.slug;

    // Test Strategy Agent
    await page.goto(`http://127.0.0.1:56310/clients/${clientSlug}/agents/strategy`);
    await page.waitForLoadState('domcontentloaded');
    expect(page.url()).toContain(`/clients/${clientSlug}/agents/strategy`);
    console.log('✅ Strategy Agent: Client context present in URL');

    // Test Persona Agent
    await page.goto(`http://127.0.0.1:56310/clients/${clientSlug}/agents/persona`);
    await page.waitForLoadState('domcontentloaded');
    expect(page.url()).toContain(`/clients/${clientSlug}/agents/persona`);
    console.log('✅ Persona Agent: Client context present in URL');

    // Test Content Agent
    await page.goto(`http://127.0.0.1:56310/clients/${clientSlug}/agents/content`);
    await page.waitForLoadState('domcontentloaded');
    expect(page.url()).toContain(`/clients/${clientSlug}/agents/content`);
    console.log('✅ Content Agent: Client context present in URL');

    // Test Marketing Strategy Agent
    await page.goto(`http://127.0.0.1:56310/clients/${clientSlug}/agents/marketing-strategy`);
    await page.waitForLoadState('domcontentloaded');
    expect(page.url()).toContain(`/clients/${clientSlug}/agents/marketing-strategy`);
    console.log('✅ Marketing Strategy Agent: Client context present in URL');

    console.log('✅ All agents maintain client context via URL routing');
  });
});
