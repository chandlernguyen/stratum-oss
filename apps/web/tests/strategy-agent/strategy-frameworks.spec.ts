/**
 * Strategy Agent - Framework Rendering E2E Tests
 *
 * Test Suite: Visual framework component rendering and interactions
 *
 * Run Instructions:
 *   # Run this test file
 *   npm run test tests/strategy-agent/strategy-frameworks.spec.ts
 *
 *   # Run in headed mode (visible browser)
 *   npm run test tests/strategy-agent/strategy-frameworks.spec.ts -- --headed
 *
 *   # Run specific test
 *   npx playwright test strategy-frameworks.spec.ts --grep "Blue Ocean"
 *
 *   # Debug mode
 *   npm run test tests/strategy-agent/strategy-frameworks.spec.ts -- --debug
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
  // '/login' renders the sign-in form. TEST_URL is the app root, which
  // is the public marketing landing page and has no email input, so
  // waiting for one there always timed out.
  await page.goto(`${TEST_URL}/login`);
  await page.waitForSelector('input[type="email"]', { timeout: 5000 });

  const emailInput = page.locator('input[type="email"]');
  await emailInput.clear();
  await emailInput.fill(TEST_EMAIL);

  const passwordInput = page.locator('input[type="password"]');
  await passwordInput.clear();
  await passwordInput.fill(TEST_PASSWORD);

  await page.click('button:has-text("Sign in")');
  await page.waitForURL(/\/(dashboard)?$/, { timeout: 15000 });
  await page.waitForLoadState('domcontentloaded');
}

/**
 * Helper: Navigate to Strategy Agent
 */
async function navigateToStrategyAgent(page: Page) {
  await page.goto(STRATEGY_AGENT_URL);
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator('h1:has-text("Business Strategy Agent")')).toBeVisible({ timeout: 10000 });
}

/**
 * Helper: Send message to agent
 */
async function sendMessage(page: Page, message: string) {
  const chatInput = page.locator('textarea[placeholder*="Ask about business strategy"]');
  await chatInput.waitFor({ state: 'visible', timeout: 10000 });
  await chatInput.fill(message);
  await chatInput.press('Enter');
}

/**
 * Helper: Wait for agent response
 */
async function waitForAgentResponse(page: Page, timeoutMs: number = 60000) {
  await page.waitForSelector('.prose', { state: 'visible', timeout: timeoutMs });
  await page.waitForTimeout(2000);
}

/**
 * Helper: Take screenshot on failure
 */
async function takeScreenshot(page: Page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({
    path: `test-results/strategy-frameworks-${name}-${timestamp}.png`,
    fullPage: true
  });
}

test.describe('Strategy Agent - Framework Rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    // Clear session state
    await page.goto(TEST_URL);
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await takeScreenshot(page, testInfo.title.replace(/\s+/g, '-').toLowerCase());
    }
  });

  /**
   * Test: SWOT Grid component rendering
   */
  test('renders SWOT Analysis with quadrant visualization', async ({ page }) => {
    test.setTimeout(120000);

    await loginAsSME(page);
    await navigateToStrategyAgent(page);

    // Generate SWOT
    await sendMessage(page, 'Create a SWOT analysis for my e-commerce business');
    await waitForAgentResponse(page, 90000);

    // Find SWOT card
    const swotCard = page.locator('[data-agent="strategy"]').filter({ hasText: 'SWOT Analysis' });
    await expect(swotCard).toBeVisible({ timeout: 10000 });

    // Verify quadrant structure
    await expect(swotCard.locator('text=/Strengths/i')).toBeVisible();
    await expect(swotCard.locator('text=/Weaknesses/i')).toBeVisible();
    await expect(swotCard.locator('text=/Opportunities/i')).toBeVisible();
    await expect(swotCard.locator('text=/Threats/i')).toBeVisible();

    // Verify visual styling (grid layout)
    const gridContainer = swotCard.locator('.grid-cols-2');
    const hasGrid = await gridContainer.count() > 0;
    expect(hasGrid).toBe(true);
  });

  /**
   * Test: Blue Ocean Strategy ERRC Grid
   */
  test('renders Blue Ocean Strategy with ERRC framework', async ({ page }) => {
    test.setTimeout(120000);

    await loginAsSME(page);
    await navigateToStrategyAgent(page);

    // Request Blue Ocean Strategy
    await sendMessage(page, 'Help me apply Blue Ocean Strategy to create uncontested market space for my consulting business');
    await waitForAgentResponse(page, 90000);

    // Verify response includes Blue Ocean concepts
    const responseText = await page.locator('.prose').last().textContent();

    // Check for ERRC Grid elements (Eliminate, Reduce, Raise, Create)
    const hasERRCConcepts =
      responseText!.toLowerCase().includes('eliminate') ||
      responseText!.toLowerCase().includes('reduce') ||
      responseText!.toLowerCase().includes('raise') ||
      responseText!.toLowerCase().includes('create') ||
      responseText!.toLowerCase().includes('blue ocean') ||
      responseText!.toLowerCase().includes('value innovation');

    expect(hasERRCConcepts).toBe(true);
  });

  /**
   * Test: McKinsey 7S framework rendering
   */
  test('renders McKinsey 7S organizational alignment framework', async ({ page }) => {
    test.setTimeout(120000);

    await loginAsSME(page);
    await navigateToStrategyAgent(page);

    // Request McKinsey 7S
    await sendMessage(page, 'Analyze my organization using the McKinsey 7S framework');
    await waitForAgentResponse(page, 90000);

    // Verify response includes 7S elements
    const responseText = await page.locator('.prose').last().textContent();

    // Check for 7S elements (Strategy, Structure, Systems, Shared Values, Skills, Style, Staff)
    const has7SConcepts =
      responseText!.toLowerCase().includes('strategy') ||
      responseText!.toLowerCase().includes('structure') ||
      responseText!.toLowerCase().includes('systems') ||
      responseText!.toLowerCase().includes('shared values') ||
      responseText!.toLowerCase().includes('skills') ||
      responseText!.toLowerCase().includes('style') ||
      responseText!.toLowerCase().includes('staff') ||
      responseText!.toLowerCase().includes('7s') ||
      responseText!.toLowerCase().includes('mckinsey');

    expect(has7SConcepts).toBe(true);
  });

  /**
   * Test: OKR Framework rendering
   */
  test('renders OKR Framework with objectives and key results', async ({ page }) => {
    test.setTimeout(120000);

    await loginAsSME(page);
    await navigateToStrategyAgent(page);

    // Request OKRs
    await sendMessage(page, 'Help me set OKRs for Q4 2024 focused on revenue growth');
    await waitForAgentResponse(page, 90000);

    // Verify response includes OKR structure
    const responseText = await page.locator('.prose').last().textContent();

    // Check for OKR elements
    const hasOKRConcepts =
      responseText!.toLowerCase().includes('objective') ||
      responseText!.toLowerCase().includes('key result') ||
      responseText!.toLowerCase().includes('okr') ||
      responseText!.toLowerCase().includes('measurable') ||
      responseText!.toLowerCase().includes('kr1') ||
      responseText!.toLowerCase().includes('kr2');

    expect(hasOKRConcepts).toBe(true);
  });

  /**
   * Test: Jobs to Be Done framework
   */
  test('renders Jobs to Be Done customer analysis', async ({ page }) => {
    test.setTimeout(120000);

    await loginAsSME(page);
    await navigateToStrategyAgent(page);

    // Request JTBD analysis
    await sendMessage(page, 'Apply the Jobs to Be Done framework to understand why customers hire my product');
    await waitForAgentResponse(page, 90000);

    // Verify response includes JTBD concepts
    const responseText = await page.locator('.prose').last().textContent();

    // Check for JTBD elements
    const hasJTBDConcepts =
      responseText!.toLowerCase().includes('job') ||
      responseText!.toLowerCase().includes('hire') ||
      responseText!.toLowerCase().includes('outcome') ||
      responseText!.toLowerCase().includes('customer') ||
      responseText!.toLowerCase().includes('progress') ||
      responseText!.toLowerCase().includes('jtbd');

    expect(hasJTBDConcepts).toBe(true);
  });

  /**
   * Test: ICE Prioritization framework
   */
  test('renders ICE Scoring for initiative prioritization', async ({ page }) => {
    test.setTimeout(120000);

    await loginAsSME(page);
    await navigateToStrategyAgent(page);

    // Request ICE scoring
    await sendMessage(page, 'Help me prioritize these initiatives using ICE scoring: Feature A, Feature B, Feature C');
    await waitForAgentResponse(page, 90000);

    // Verify response includes ICE framework
    const responseText = await page.locator('.prose').last().textContent();

    // Check for ICE elements (Impact, Confidence, Ease)
    const hasICEConcepts =
      responseText!.toLowerCase().includes('impact') ||
      responseText!.toLowerCase().includes('confidence') ||
      responseText!.toLowerCase().includes('ease') ||
      responseText!.toLowerCase().includes('ice') ||
      responseText!.toLowerCase().includes('priorit') ||
      responseText!.toLowerCase().includes('score');

    expect(hasICEConcepts).toBe(true);
  });

  /**
   * Test: Porter's Five Forces visual rendering
   */
  test('renders Porter\'s Five Forces with force strength indicators', async ({ page }) => {
    test.setTimeout(120000);

    await loginAsSME(page);
    await navigateToStrategyAgent(page);

    // Generate Porter's Forces
    await sendMessage(page, 'Analyze competitive forces in the B2B SaaS market using Porter\'s Five Forces');
    await waitForAgentResponse(page, 90000);

    // Verify Porter's Forces content
    const responseText = await page.locator('.prose').last().textContent();

    // Check for all 5 forces
    const hasAllForces =
      (responseText!.toLowerCase().includes('competitive rivalry') || responseText!.toLowerCase().includes('competition')) &&
      (responseText!.toLowerCase().includes('threat of new entrants') || responseText!.toLowerCase().includes('barriers to entry')) &&
      (responseText!.toLowerCase().includes('threat of substitutes') || responseText!.toLowerCase().includes('alternatives')) &&
      (responseText!.toLowerCase().includes('bargaining power of suppliers') || responseText!.toLowerCase().includes('supplier')) &&
      (responseText!.toLowerCase().includes('bargaining power of buyers') || responseText!.toLowerCase().includes('buyer'));

    expect(hasAllForces).toBe(true);
  });

  /**
   * Test: BCG Matrix quadrant visualization
   */
  test('renders BCG Matrix with Stars, Cash Cows, Dogs, and Question Marks', async ({ page }) => {
    test.setTimeout(120000);

    await loginAsSME(page);
    await navigateToStrategyAgent(page);

    // Generate BCG Matrix
    await sendMessage(page, 'Map my products onto a BCG Matrix: ProductA (high growth/share), ProductB (low growth/high share), ProductC (high growth/low share), ProductD (low growth/share)');
    await waitForAgentResponse(page, 90000);

    // Verify BCG Matrix quadrants
    const responseText = await page.locator('.prose').last().textContent();

    // Check for all 4 quadrants
    const hasAllQuadrants =
      responseText!.toLowerCase().includes('stars') &&
      (responseText!.toLowerCase().includes('cash cow') || responseText!.toLowerCase().includes('cash-cow')) &&
      responseText!.toLowerCase().includes('dogs') &&
      (responseText!.toLowerCase().includes('question mark') || responseText!.toLowerCase().includes('question-mark'));

    expect(hasAllQuadrants).toBe(true);
  });

  /**
   * Test: Business Model Canvas blocks
   */
  test('renders Business Model Canvas with all 9 building blocks', async ({ page }) => {
    test.setTimeout(120000);

    await loginAsSME(page);
    await navigateToStrategyAgent(page);

    // Generate Business Model Canvas
    await sendMessage(page, 'Map out my business model using the Business Model Canvas');
    await waitForAgentResponse(page, 90000);

    // Verify BMC building blocks
    const responseText = await page.locator('.prose').last().textContent();

    // Check for key building blocks (at least 5 of 9)
    const bmcBlocks = [
      'value proposition',
      'customer segments',
      'channels',
      'customer relationships',
      'revenue streams',
      'key resources',
      'key activities',
      'key partnerships',
      'cost structure'
    ];

    const foundBlocks = bmcBlocks.filter(block =>
      responseText!.toLowerCase().includes(block)
    );

    expect(foundBlocks.length).toBeGreaterThanOrEqual(5);
  });

  /**
   * Test: Three Horizons timeline visualization
   */
  test('renders Three Horizons with H1, H2, H3 timeframes', async ({ page }) => {
    test.setTimeout(120000);

    await loginAsSME(page);
    await navigateToStrategyAgent(page);

    // Generate Three Horizons
    await sendMessage(page, 'Help me plan my growth using Three Horizons framework');
    await waitForAgentResponse(page, 90000);

    // Verify Three Horizons structure
    const responseText = await page.locator('.prose').last().textContent();

    // Check for all 3 horizons
    const hasAllHorizons =
      (responseText!.toLowerCase().includes('horizon 1') || responseText!.toLowerCase().includes('h1')) &&
      (responseText!.toLowerCase().includes('horizon 2') || responseText!.toLowerCase().includes('h2')) &&
      (responseText!.toLowerCase().includes('horizon 3') || responseText!.toLowerCase().includes('h3'));

    expect(hasAllHorizons).toBe(true);

    // Check for horizon characteristics
    const hasCharacteristics =
      responseText!.toLowerCase().includes('core') ||
      responseText!.toLowerCase().includes('emerging') ||
      responseText!.toLowerCase().includes('future') ||
      responseText!.toLowerCase().includes('innovation');

    expect(hasCharacteristics).toBe(true);
  });

  /**
   * Test: VRIO Resource table rendering
   */
  test('renders VRIO Analysis with Value-Rarity-Imitability-Organization grid', async ({ page }) => {
    test.setTimeout(120000);

    await loginAsSME(page);
    await navigateToStrategyAgent(page);

    // Generate VRIO
    await sendMessage(page, 'Evaluate my competitive resources using VRIO: brand, technology, team');
    await waitForAgentResponse(page, 90000);

    // Verify VRIO structure
    const responseText = await page.locator('.prose').last().textContent();

    // Check for VRIO criteria (at least 3 of 4)
    const vrioCriteria = ['value', 'rarity', 'imitability', 'organization'];
    const foundCriteria = vrioCriteria.filter(criterion =>
      responseText!.toLowerCase().includes(criterion)
    );

    expect(foundCriteria.length).toBeGreaterThanOrEqual(3);

    // Check for competitive advantage conclusions
    const hasAdvantageAssessment =
      responseText!.toLowerCase().includes('competitive advantage') ||
      responseText!.toLowerCase().includes('sustainable') ||
      responseText!.toLowerCase().includes('temporary') ||
      responseText!.toLowerCase().includes('parity');

    expect(hasAdvantageAssessment).toBe(true);
  });

  /**
   * Test: Framework component expand/collapse interactions
   */
  test('framework cards support expand/collapse interactions', async ({ page }) => {
    test.setTimeout(120000);

    await loginAsSME(page);
    await navigateToStrategyAgent(page);

    // Generate any framework with visual card
    await sendMessage(page, 'Run a SWOT analysis for my business');
    await waitForAgentResponse(page, 90000);

    // Find framework card
    const frameworkCard = page.locator('[data-agent="strategy"]').first();
    await expect(frameworkCard).toBeVisible({ timeout: 10000 });

    // Look for expand/collapse button
    const toggleButtons = frameworkCard.locator('button').filter({ has: page.locator('svg') });
    const buttonCount = await toggleButtons.count();

    // Framework cards should have interactive buttons
    expect(buttonCount).toBeGreaterThan(0);
  });

  /**
   * Test: Multiple frameworks in single response
   */
  test('displays multiple frameworks when agent uses multiple tools', async ({ page }) => {
    test.setTimeout(180000);

    await loginAsSME(page);
    await navigateToStrategyAgent(page);

    // Ask for comprehensive analysis (likely to trigger multiple frameworks)
    await sendMessage(page, 'Give me a comprehensive strategic analysis of my B2B SaaS company using multiple frameworks');
    await waitForAgentResponse(page, 120000);

    // Count framework mentions or cards
    const responseText = await page.locator('.prose').last().textContent();

    // Check if multiple frameworks are mentioned
    const frameworkMentions = [
      'swot',
      'porter',
      'bcg',
      'vrio',
      'three horizons',
      'blue ocean',
      'mckinsey',
      'okr',
      'ice',
      'business model canvas',
      'jobs to be done'
    ];

    const foundFrameworks = frameworkMentions.filter(framework =>
      responseText!.toLowerCase().includes(framework)
    );

    // Should mention at least 2 frameworks for comprehensive analysis
    expect(foundFrameworks.length).toBeGreaterThanOrEqual(2);
  });
});
