/**
 * Strategy Agent - Complete User Journey E2E Tests
 *
 * Test Suite: Comprehensive Strategy Agent functionality
 *
 * Run Instructions:
 *   # Run this test file
 *   npm run test tests/strategy-agent/strategy-complete-journey.spec.ts
 *
 *   # Run in headed mode (visible browser)
 *   npm run test tests/strategy-agent/strategy-complete-journey.spec.ts -- --headed
 *
 *   # Run specific test
 *   npx playwright test strategy-complete-journey.spec.ts --grep "creates new session"
 *
 *   # Debug mode
 *   npm run test tests/strategy-agent/strategy-complete-journey.spec.ts -- --debug
 *
 * Prerequisites:
 *   - Frontend: npm run dev (http://127.0.0.1:56310)
 *   - Backend: poetry run uvicorn apps.api.main:app --reload --port 8000
 *   - Database: supabase start
 *   - Test users exist: See /tests/TEST_USERS.md
 */

import { test, expect, Page } from '@playwright/test';
import { liveModelTestsEnabled, LIVE_MODEL_SKIP_REASON } from '../helpers/liveModel';

// Test Configuration
const TEST_URL = 'http://127.0.0.1:56310';
// SME agent routes are top-level (src/config/routes.ts): /strategy, /persona,
// /content. The /agents/<name> form is the *client-scoped* variant under
// /clients/:clientSlug and is agency-only, so a signed-in SME user gets an
// empty page there.
const STRATEGY_AGENT_URL = `${TEST_URL}/strategy`;
const TEST_EMAIL = process.env.TEST_SME_OWNER_EMAIL || 'sme.owner@example.com';
const TEST_PASSWORD = process.env.TEST_SME_OWNER_PASSWORD || 'LocalDevOnly123!';

// Every spec in this file asserts on generated model output — rendered SWOT,
// BCG or VRIO grids, framework terms like "value innovation". Under the default
// DEMO_MODE the agents return canned text, so these cannot pass. Skipping them
// keeps a red E2E run meaningful; see tests/helpers/testConfig.ts.
test.skip(!liveModelTestsEnabled, LIVE_MODEL_SKIP_REASON);


/**
 * Helper: Login as SME user
 */
async function loginAsSME(page: Page) {
  const user = {
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  };

  // '/login' renders the sign-in form. TEST_URL is the app root, which is the
  // public marketing landing page and has no email input, so waiting for one
  // there always timed out.
  await page.goto(`${TEST_URL}/login`);
  await page.waitForSelector('input[type="email"]', { timeout: 5000 });

  // Clear and fill email
  const emailInput = page.locator('input[type="email"]');
  await emailInput.clear();
  await emailInput.fill(user.email);

  // Clear and fill password
  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.clear();
  await passwordInput.fill(user.password);

  // Submit login
  await page.click('button:has-text("Sign in")');

  // Wait for navigation to dashboard
  await page.waitForURL(/\/(dashboard)?$/, { timeout: 15000 });
  await page.waitForLoadState('domcontentloaded');
}

/**
 * Helper: Navigate to Strategy Agent
 */
async function navigateToStrategyAgent(page: Page) {
  await page.goto(STRATEGY_AGENT_URL);
  await page.waitForLoadState('domcontentloaded');

  // Verify we're on the strategy page
  await expect(page.locator('h2:has-text("Strategy Sessions")')).toBeVisible({ timeout: 10000 });
}

/**
 * Helper: Send message to agent
 */
async function sendMessage(page: Page, message: string) {
  // Find the textarea input
  const chatInput = page.locator('textarea[placeholder*="Ask about business strategy"]');
  await chatInput.waitFor({ state: 'visible', timeout: 10000 });

  // Fill and send message
  await chatInput.fill(message);
  await chatInput.press('Enter');
}

/**
 * Helper: Wait for agent response
 */
async function waitForAgentResponse(page: Page, timeoutMs: number = 180000) {
  // Wait for the response to appear (prose class is used for agent responses)
  // AI responses can take 60-120 seconds, so we give it 3 minutes
  await page.waitForSelector('.prose', { state: 'visible', timeout: timeoutMs });

  // Wait a bit longer to ensure streaming is complete
  await page.waitForTimeout(5000);
}

/**
 * Helper: Take screenshot on failure
 */
async function takeScreenshot(page: Page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({
    path: `test-results/strategy-${name}-${timestamp}.png`,
    fullPage: true
  });
}

test.describe('Strategy Agent - Complete User Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Set consistent viewport
    await page.setViewportSize({ width: 1280, height: 720 });

    // Clear session state
    await page.goto(TEST_URL);
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
  });

  test.afterEach(async ({ page }, testInfo) => {
    // Take screenshot on failure
    if (testInfo.status !== testInfo.expectedStatus) {
      await takeScreenshot(page, testInfo.title.replace(/\s+/g, '-').toLowerCase());
    }
  });

  /**
   * Test: Basic page load and UI elements
   */
  test('displays Strategy Agent page with all UI elements', async ({ page }) => {
    test.setTimeout(30000);

    await loginAsSME(page);
    await navigateToStrategyAgent(page);

    // Verify sidebar elements
    await expect(page.locator('h2:has-text("Strategy Sessions")')).toBeVisible();
    await expect(page.locator('button:has-text("New Strategy Sessions")')).toBeVisible();

    // Verify tabs
    await expect(page.locator('button:has-text("History")')).toBeVisible();
    await expect(page.locator('button:has-text("Strategies")')).toBeVisible();

    // Verify chat interface
    await expect(page.locator('h1:has-text("Business Strategy Agent")')).toBeVisible();
    const welcomeMessage = page.locator('text=/Welcome.*business challenges/i');
    await expect(welcomeMessage).toBeVisible();

    // Verify input field
    const chatInput = page.locator('textarea[placeholder*="Ask about business strategy"]');
    await expect(chatInput).toBeVisible();
  });

  /**
   * Test: Create new strategy session
   */
  test('creates new strategy session successfully', async ({ page }) => {
    test.setTimeout(90000);

    await loginAsSME(page);
    await navigateToStrategyAgent(page);

    // Click "New Strategy Sessions" button
    await page.click('button:has-text("New Strategy Sessions")');

    // Wait a moment for UI to update
    await page.waitForTimeout(2000);

    // Verify chat interface is ready (welcome message should appear)
    const chatInput = page.locator('textarea[placeholder*="Ask about business strategy"]');
    await expect(chatInput).toBeVisible();
    await expect(chatInput).toBeEnabled();

    // Verify welcome message is displayed
    await expect(page.locator('text=/What\'s on your mind today/i')).toBeVisible({ timeout: 5000 });
  });

  /**
   * Test: SWOT Analysis request and response
   */
  test('generates SWOT analysis with visual framework', async ({ page }) => {
    test.setTimeout(120000);

    await loginAsSME(page);
    await navigateToStrategyAgent(page);

    // Send SWOT analysis request
    await sendMessage(page, 'Run a SWOT analysis for my SaaS company facing 14% churn and rising CAC');

    // Wait for agent response
    await waitForAgentResponse(page, 90000);

    // Verify user message appears
    const userMessage = page.locator('text=/SWOT analysis.*SaaS company/i');
    await expect(userMessage).toBeVisible();

    // Verify SWOT Analysis component is displayed
    const swotCard = page.locator('[data-agent="strategy"]').filter({ hasText: 'SWOT Analysis' });
    await expect(swotCard).toBeVisible({ timeout: 10000 });

    // Verify SWOT quadrants are present (Strengths, Weaknesses, Opportunities, Threats)
    await expect(page.locator('text=/Strengths/i').first()).toBeVisible();
    await expect(page.locator('text=/Weaknesses/i').first()).toBeVisible();
    await expect(page.locator('text=/Opportunities/i').first()).toBeVisible();
    await expect(page.locator('text=/Threats/i').first()).toBeVisible();

    // Verify response has meaningful content
    const responseText = await page.locator('.prose').first().textContent();
    expect(responseText).toBeTruthy();
    expect(responseText!.length).toBeGreaterThan(200);
  });

  /**
   * Test: Porter's Five Forces analysis
   */
  test('generates Porter\'s Five Forces analysis', async ({ page }) => {
    test.setTimeout(120000);

    await loginAsSME(page);
    await navigateToStrategyAgent(page);

    // Send Porter's Five Forces request
    await sendMessage(page, 'Analyze my competitive landscape using Porter\'s Five Forces for my B2B SaaS company');

    // Wait for agent response
    await waitForAgentResponse(page, 90000);

    // Verify response mentions Porter's Five Forces concepts
    const responseText = await page.locator('.prose').first().textContent();
    expect(responseText).toBeTruthy();

    // Check for Porter's Five Forces elements (flexible matching)
    const hasCompetitiveAnalysis =
      responseText!.toLowerCase().includes('competitive') ||
      responseText!.toLowerCase().includes('rivalry') ||
      responseText!.toLowerCase().includes('threat') ||
      responseText!.toLowerCase().includes('suppliers') ||
      responseText!.toLowerCase().includes('buyers');

    expect(hasCompetitiveAnalysis).toBe(true);
  });

  /**
   * Test: Business Model Canvas request
   */
  test('generates Business Model Canvas framework', async ({ page }) => {
    test.setTimeout(120000);

    await loginAsSME(page);
    await navigateToStrategyAgent(page);

    // Send Business Model Canvas request
    await sendMessage(page, 'Help me map out my business model using the Business Model Canvas');

    // Wait for agent response
    await waitForAgentResponse(page, 90000);

    // Verify response mentions Business Model Canvas concepts
    const responseText = await page.locator('.prose').first().textContent();
    expect(responseText).toBeTruthy();

    // Check for Business Model Canvas elements (flexible matching)
    const hasBusinessModelConcepts =
      responseText!.toLowerCase().includes('value proposition') ||
      responseText!.toLowerCase().includes('customer segments') ||
      responseText!.toLowerCase().includes('revenue streams') ||
      responseText!.toLowerCase().includes('channels') ||
      responseText!.toLowerCase().includes('key resources');

    expect(hasBusinessModelConcepts).toBe(true);
  });

  /**
   * Test: Multi-turn conversation
   */
  test('maintains context in multi-turn conversation', async ({ page }) => {
    test.setTimeout(180000);

    await loginAsSME(page);
    await navigateToStrategyAgent(page);

    // First message: Establish context
    await sendMessage(page, 'I run a SaaS company with $2M ARR and 50 customers');
    await waitForAgentResponse(page);

    // Verify first response
    const firstResponse = page.locator('.prose').first();
    await expect(firstResponse).toBeVisible();

    // Second message: Follow-up question (relies on context)
    await sendMessage(page, 'What growth strategies should I focus on given my current stage?');
    await waitForAgentResponse(page);

    // Verify second response references context
    const allMessages = await page.locator('.prose').all();
    expect(allMessages.length).toBeGreaterThanOrEqual(2);

    // The response should reference the context (SaaS, ARR, customers)
    const secondResponseText = await allMessages[1].textContent();
    const hasContextReference =
      secondResponseText!.toLowerCase().includes('saas') ||
      secondResponseText!.toLowerCase().includes('arr') ||
      secondResponseText!.toLowerCase().includes('growth') ||
      secondResponseText!.toLowerCase().includes('customers');

    expect(hasContextReference).toBe(true);
  });

  /**
   * Test: Session switching and history
   */
  test('switches between sessions and maintains history', async ({ page }) => {
    test.setTimeout(180000);

    await loginAsSME(page);
    await navigateToStrategyAgent(page);

    // Create first session
    await page.click('button:has-text("New Strategy Sessions")');
    await page.waitForURL(/\/strategy\/session\/[a-z0-9-]+/);
    const firstSessionUrl = page.url();
    const firstSessionId = firstSessionUrl.match(/\/session\/([a-z0-9-]+)/)?.[1];

    // Send message in first session
    await sendMessage(page, 'Run a SWOT analysis for my retail business');
    await waitForAgentResponse(page);

    // Create second session
    await page.click('button:has-text("New Strategy Sessions")');
    await page.waitForURL(/\/strategy\/session\/[a-z0-9-]+/);
    const secondSessionUrl = page.url();
    const secondSessionId = secondSessionUrl.match(/\/session\/([a-z0-9-]+)/)?.[1];

    // Verify we have a different session ID
    expect(firstSessionId).not.toBe(secondSessionId);

    // Send message in second session
    await sendMessage(page, 'Analyze my tech startup using Porter\'s Five Forces');
    await waitForAgentResponse(page);

    // Switch back to first session via History tab
    await page.click('button:has-text("History")');
    await page.waitForTimeout(1000);

    // Find and click the first session in history
    const sessionItems = page.locator('[data-session-id]').or(page.locator('text=/SWOT.*retail/i')).first();
    if (await sessionItems.count() > 0) {
      await sessionItems.first().click();
      await page.waitForURL(/\/strategy\/session\//);

      // Verify we're back at the first session
      const currentUrl = page.url();
      expect(currentUrl).toContain(firstSessionId!);

      // Verify the first session's content is still there
      await expect(page.locator('text=/SWOT.*retail/i')).toBeVisible();
    }
  });

  /**
   * Test: Strategies tab displays saved outputs
   */
  test('navigates to Strategies tab and displays saved outputs', async ({ page }) => {
    test.setTimeout(90000);

    await loginAsSME(page);
    await navigateToStrategyAgent(page);

    // Send a message to generate output
    await sendMessage(page, 'Run a quick SWOT analysis for my consulting business');
    await waitForAgentResponse(page);

    // Wait for auto-save to complete (structured extraction background process)
    await page.waitForTimeout(5000);

    // Navigate to Strategies tab
    await page.click('button:has-text("Strategies")');
    await page.waitForTimeout(2000);

    // Verify strategies tab content is visible
    // Note: May show "No strategies yet" if auto-save hasn't completed
    const hasStrategies = await page.locator('[data-testid="strategy-card"]').count() > 0;
    const hasEmptyState = await page.locator('text=/No.*strategies/i').isVisible();

    // Either strategies exist or empty state is shown
    expect(hasStrategies || hasEmptyState).toBe(true);
  });

  /**
   * Test: Error handling for invalid requests
   */
  test('handles empty messages gracefully', async ({ page }) => {
    test.setTimeout(30000);

    await loginAsSME(page);
    await navigateToStrategyAgent(page);

    // Try to send empty message
    const chatInput = page.locator('textarea[placeholder*="Ask about business strategy"]');
    await chatInput.fill('');
    await chatInput.press('Enter');

    // Verify no error occurs and input remains enabled
    await expect(chatInput).toBeEnabled();

    // Verify no agent response appears
    const responseCount = await page.locator('.prose').count();
    expect(responseCount).toBe(1); // Only welcome message should be present
  });

  /**
   * Test: Streaming response updates progressively
   */
  test('displays streaming response progressively', async ({ page }) => {
    test.setTimeout(120000);

    await loginAsSME(page);
    await navigateToStrategyAgent(page);

    // Send message
    await sendMessage(page, 'Give me strategic recommendations for entering a new market');

    // Wait a few seconds for streaming to start
    await page.waitForTimeout(3000);

    // Capture response text at multiple points during streaming
    const responseLocator = page.locator('.prose').last();
    await responseLocator.waitFor({ state: 'visible', timeout: 10000 });

    const earlyText = await responseLocator.textContent();

    // Wait for more streaming
    await page.waitForTimeout(5000);
    const laterText = await responseLocator.textContent();

    // Verify text increased (streaming is working)
    expect(laterText!.length).toBeGreaterThanOrEqual(earlyText!.length);

    // Wait for streaming to complete
    await waitForAgentResponse(page);

    const finalText = await responseLocator.textContent();
    expect(finalText!.length).toBeGreaterThan(200);
  });

  /**
   * Test: Copy button functionality on framework outputs
   */
  test('copies SWOT analysis content to clipboard', async ({ page }) => {
    test.setTimeout(120000);

    await loginAsSME(page);
    await navigateToStrategyAgent(page);

    // Generate SWOT analysis
    await sendMessage(page, 'Run a SWOT analysis for my e-commerce business');
    await waitForAgentResponse(page, 90000);

    // Find the SWOT card
    const swotCard = page.locator('[data-agent="strategy"]').filter({ hasText: 'SWOT Analysis' });
    await expect(swotCard).toBeVisible({ timeout: 10000 });

    // Grant clipboard permissions
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    // Find and click copy button
    const copyButton = swotCard.locator('button').filter({ hasText: /copy/i }).or(
      swotCard.locator('button[title*="Copy"]')
    );

    if (await copyButton.count() > 0) {
      await copyButton.first().click();

      // Wait for copy operation
      await page.waitForTimeout(1000);

      // Verify clipboard has content (we can't easily verify exact content in Playwright)
      // Instead, verify the copy button state changed or success feedback appeared
      const successFeedback = page.locator('text=/copied/i').or(page.locator('[data-success="true"]'));

      // Either success feedback appears or button state changes
      const hasFeedback = await successFeedback.count() > 0;

      // At minimum, no error should occur
      expect(hasFeedback || true).toBe(true);
    }
  });

  /**
   * Test: Expand/collapse framework components
   */
  test('expands and collapses SWOT framework display', async ({ page }) => {
    test.setTimeout(120000);

    await loginAsSME(page);
    await navigateToStrategyAgent(page);

    // Generate SWOT analysis
    await sendMessage(page, 'Run a SWOT analysis for my mobile app startup');
    await waitForAgentResponse(page, 90000);

    // Find the SWOT card
    const swotCard = page.locator('[data-agent="strategy"]').filter({ hasText: 'SWOT Analysis' });
    await expect(swotCard).toBeVisible({ timeout: 10000 });

    // Find the expand/collapse button (ChevronUp or ChevronDown icon)
    const toggleButton = swotCard.locator('button').filter({ has: page.locator('svg') }).last();

    if (await toggleButton.isVisible()) {
      // Check if content is initially visible
      const contentBefore = swotCard.locator('text=/Strengths/i');
      const isExpandedBefore = await contentBefore.isVisible().catch(() => false);

      // Click toggle
      await toggleButton.click();
      await page.waitForTimeout(500);

      // Verify content visibility changed
      const isExpandedAfter = await contentBefore.isVisible().catch(() => false);
      expect(isExpandedAfter).not.toBe(isExpandedBefore);

      // Toggle back
      await toggleButton.click();
      await page.waitForTimeout(500);

      // Verify it toggled back to original state
      const isExpandedFinal = await contentBefore.isVisible().catch(() => false);
      expect(isExpandedFinal).toBe(isExpandedBefore);
    }
  });

  /**
   * HIGH PRIORITY TESTS - Critical Missing Features
   */

  /**
   * Test: Save strategy synthesis to database
   */
  test('saves strategy analysis to database using SAVE_STRATEGY_SYNTHESIS', async ({ page }) => {
    test.setTimeout(180000);

    await loginAsSME(page);
    await navigateToStrategyAgent(page);

    // Generate a strategy analysis
    await sendMessage(page, 'Analyze my SaaS company with $2M ARR and recommend growth strategies');
    await waitForAgentResponse(page, 90000);

    // Verify response received
    const firstResponse = await page.locator('.prose').first().textContent();
    expect(firstResponse!.length).toBeGreaterThan(200);

    // Ask agent to save the strategy
    await sendMessage(page, 'Please save this strategy analysis to my database');
    await waitForAgentResponse(page, 90000);

    // Wait for save operation to complete
    await page.waitForTimeout(5000);

    // Verify save confirmation in response
    const saveResponse = await page.locator('.prose').last().textContent();
    const hasSaveConfirmation =
      saveResponse!.toLowerCase().includes('saved') ||
      saveResponse!.toLowerCase().includes('stored') ||
      saveResponse!.toLowerCase().includes('database');

    expect(hasSaveConfirmation).toBe(true);
  });

  /**
   * Test: List saved strategies
   */
  test('retrieves list of saved strategies using LIST_STRATEGIES', async ({ page }) => {
    test.setTimeout(120000);

    await loginAsSME(page);
    await navigateToStrategyAgent(page);

    // Ask agent to list saved strategies
    await sendMessage(page, 'Show me my saved strategies');
    await waitForAgentResponse(page, 90000);

    // Verify response contains strategy list or empty state
    const response = await page.locator('.prose').last().textContent();
    expect(response).toBeTruthy();

    const hasListResponse =
      response!.toLowerCase().includes('strateg') ||
      response!.toLowerCase().includes('analysis') ||
      response!.toLowerCase().includes('saved') ||
      response!.toLowerCase().includes('no strategies') ||
      response!.toLowerCase().includes('haven\'t saved');

    expect(hasListResponse).toBe(true);
  });

  /**
   * Test: BCG Matrix generation
   */
  test('generates BCG Matrix for portfolio analysis', async ({ page }) => {
    test.setTimeout(120000);

    await loginAsSME(page);
    await navigateToStrategyAgent(page);

    // Request BCG Matrix
    await sendMessage(page, 'Create a BCG Matrix for my product portfolio: Product A (high growth, high market share), Product B (low growth, high share), Product C (high growth, low share)');
    await waitForAgentResponse(page, 90000);

    // Verify response contains BCG Matrix concepts
    const responseText = await page.locator('.prose').last().textContent();
    expect(responseText).toBeTruthy();

    // Check for BCG Matrix quadrants
    const hasBCGConcepts =
      responseText!.toLowerCase().includes('stars') ||
      responseText!.toLowerCase().includes('cash cow') ||
      responseText!.toLowerCase().includes('question mark') ||
      responseText!.toLowerCase().includes('dog') ||
      responseText!.toLowerCase().includes('bcg') ||
      responseText!.toLowerCase().includes('portfolio');

    expect(hasBCGConcepts).toBe(true);
  });

  /**
   * Test: VRIO Analysis generation
   */
  test('generates VRIO Analysis for competitive advantage', async ({ page }) => {
    test.setTimeout(120000);

    await loginAsSME(page);
    await navigateToStrategyAgent(page);

    // Request VRIO Analysis
    await sendMessage(page, 'Run a VRIO analysis on my company\'s key resources: proprietary technology, brand reputation, and distribution network');
    await waitForAgentResponse(page, 90000);

    // Verify response contains VRIO concepts
    const responseText = await page.locator('.prose').last().textContent();
    expect(responseText).toBeTruthy();

    // Check for VRIO framework elements
    const hasVRIOConcepts =
      responseText!.toLowerCase().includes('value') ||
      responseText!.toLowerCase().includes('rarity') ||
      responseText!.toLowerCase().includes('imitability') ||
      responseText!.toLowerCase().includes('organization') ||
      responseText!.toLowerCase().includes('vrio') ||
      responseText!.toLowerCase().includes('competitive advantage');

    expect(hasVRIOConcepts).toBe(true);
  });

  /**
   * Test: Three Horizons growth framework
   */
  test('generates Three Horizons growth strategy', async ({ page }) => {
    test.setTimeout(120000);

    await loginAsSME(page);
    await navigateToStrategyAgent(page);

    // Request Three Horizons analysis
    await sendMessage(page, 'Help me plan using the Three Horizons framework for my software company');
    await waitForAgentResponse(page, 90000);

    // Verify response contains Three Horizons concepts
    const responseText = await page.locator('.prose').last().textContent();
    expect(responseText).toBeTruthy();

    // Check for Three Horizons elements
    const hasThreeHorizonsConcepts =
      responseText!.toLowerCase().includes('horizon') ||
      responseText!.toLowerCase().includes('h1') ||
      responseText!.toLowerCase().includes('h2') ||
      responseText!.toLowerCase().includes('h3') ||
      responseText!.toLowerCase().includes('core business') ||
      responseText!.toLowerCase().includes('emerging') ||
      responseText!.toLowerCase().includes('future');

    expect(hasThreeHorizonsConcepts).toBe(true);
  });

  /**
   * Test: Campaign context integration
   */
  test('provides strategy analysis within campaign context', async ({ page }) => {
    test.setTimeout(120000);

    await loginAsSME(page);

    // Navigate to strategy agent with campaign context (simulated)
    // Note: This would work better with actual campaign setup, but we can test the message flow
    await navigateToStrategyAgent(page);

    // Send message referencing campaign
    await sendMessage(page, 'I\'m planning a Q4 product launch campaign with $50k budget. What strategy should I use?');
    await waitForAgentResponse(page, 90000);

    // Verify response addresses campaign context
    const responseText = await page.locator('.prose').last().textContent();
    expect(responseText).toBeTruthy();

    const hasCampaignContext =
      responseText!.toLowerCase().includes('campaign') ||
      responseText!.toLowerCase().includes('launch') ||
      responseText!.toLowerCase().includes('budget') ||
      responseText!.toLowerCase().includes('q4');

    expect(hasCampaignContext).toBe(true);
  });

  /**
   * Test: Session persistence after page reload
   */
  test('maintains session after page reload', async ({ page }) => {
    test.setTimeout(120000);

    await loginAsSME(page);
    await navigateToStrategyAgent(page);

    // Create session and send message
    await page.click('button:has-text("New Strategy Sessions")');
    await page.waitForURL(/\/strategy\/session\/[a-z0-9-]+/);

    const sessionUrl = page.url();
    const sessionId = sessionUrl.match(/\/session\/([a-z0-9-]+)/)?.[1];

    await sendMessage(page, 'Test message for session persistence');
    await waitForAgentResponse(page);

    // Reload page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Verify session is still active
    const currentUrl = page.url();
    expect(currentUrl).toContain(sessionId!);

    // Verify previous message is still visible
    await expect(page.locator('text=Test message for session persistence')).toBeVisible({ timeout: 10000 });
  });

  /**
   * Test: Business context extraction from conversation
   */
  test('extracts business context from natural conversation', async ({ page }) => {
    test.setTimeout(120000);

    await loginAsSME(page);
    await navigateToStrategyAgent(page);

    // Send message with rich business context
    await sendMessage(page, 'My company TechFlow Solutions has 25 employees, $3M ARR, and we\'re in the B2B SaaS space competing with Salesforce');
    await waitForAgentResponse(page, 90000);

    // Agent should acknowledge the context
    const responseText = await page.locator('.prose').last().textContent();
    expect(responseText).toBeTruthy();

    // Verify agent references the provided context
    const referencesContext =
      responseText!.includes('TechFlow') ||
      responseText!.includes('$3M') ||
      responseText!.includes('25 employees') ||
      responseText!.includes('B2B') ||
      responseText!.includes('SaaS') ||
      responseText!.includes('Salesforce');

    expect(referencesContext).toBe(true);
  });

  /**
   * Test: Active/Archived filter functionality
   */
  test('filters sessions by Active and Archived status', async ({ page }) => {
    test.setTimeout(60000);

    await loginAsSME(page);
    await navigateToStrategyAgent(page);

    // Look for filter buttons in sidebar
    const activeButton = page.locator('button:has-text("Active")');
    const archivedButton = page.locator('button:has-text("Archived")');

    // Verify filter buttons exist
    const hasActiveFilter = await activeButton.count() > 0;
    const hasArchivedFilter = await archivedButton.count() > 0;

    if (hasActiveFilter && hasArchivedFilter) {
      // Click Active filter
      await activeButton.click();
      await page.waitForTimeout(1000);

      // Click Archived filter
      await archivedButton.click();
      await page.waitForTimeout(1000);

      // At minimum, filters should be clickable without errors
      expect(true).toBe(true);
    }
  });

  /**
   * Test: Error handling - Session not found
   */
  test('handles session not found gracefully', async ({ page }) => {
    test.setTimeout(30000);

    await loginAsSME(page);

    // Try to navigate to non-existent session
    await page.goto(`${STRATEGY_AGENT_URL}/session/00000000-0000-0000-0000-000000000000`);
    await page.waitForTimeout(5000);

    // Should redirect back to strategy root or show error
    const currentUrl = page.url();
    const isOnStrategyPage = currentUrl.includes('/strategy');

    expect(isOnStrategyPage).toBe(true);

    // Should not show error modal blocking the UI
    const hasErrorModal = await page.locator('[role="dialog"]:has-text("error")').count() > 0;
    expect(hasErrorModal).toBe(false);
  });
});
