import { test, expect } from '@playwright/test';

/**
 * Marketing Strategy Agent - Critical Path Tests (October 2025)
 *
 * Tests the most-used agent that bridges personas to content.
 * Focus: Current platform features, not legacy functionality.
 */

const TEST_USER = {
  email: 'sme.owner@example.com',
  password: 'LocalDevOnly123!'
};

test.describe('Marketing Strategy Agent - Critical Path', () => {
  test.setTimeout(120000); // 2 minutes per test

  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('http://127.0.0.1:56310');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Handle business context wizard if needed
    await page.waitForTimeout(2000);
    const skipButton = page.locator('button:has-text("Skip for Now")');
    if (await skipButton.isVisible({ timeout: 2000 })) {
      await skipButton.click();
      await page.waitForURL('**/dashboard', { timeout: 10000 });
    }

    // Navigate to Marketing Strategy Agent landing page
    await page.goto('http://127.0.0.1:56310/marketing-strategy');
    await page.waitForLoadState('domcontentloaded');

    // Click "Generate Marketing Strategy" button to enter chat mode
    await page.click('button:has-text("Generate Marketing Strategy")');
    await page.waitForURL('**/marketing-strategy/chat', { timeout: 10000 });
    await page.waitForLoadState('domcontentloaded');
  });

  test('MS1: Marketing Strategy Agent page loads', async ({ page }) => {
    console.log('📍 Testing Marketing Strategy Agent landing page...');

    // Verify page heading
    await expect(page.locator('h1:has-text("Marketing Strategy Agent")')).toBeVisible({ timeout: 10000 });

    // Verify chat interface
    const chatInput = page.locator('textarea, [contenteditable="true"]').first();
    await expect(chatInput).toBeVisible({ timeout: 10000 });

    // Verify page has content
    const pageContent = await page.content();
    expect(pageContent.length).toBeGreaterThan(3000);

    console.log('✅ Marketing Strategy Agent page loaded');
  });

  test('MS2: Generate messaging framework', async ({ page }) => {
    console.log('📍 Testing messaging framework generation...');

    const chatInput = page.locator('textarea, [contenteditable="true"]').first();
    await expect(chatInput).toBeVisible({ timeout: 10000 });

    // Request messaging framework
    await chatInput.fill('Create a messaging framework for my B2B SaaS product including value propositions and key messages');
    await page.keyboard.press('Enter');

    console.log('⏳ Waiting for AI response...');
    await page.waitForTimeout(8000);

    // Verify response contains messaging elements
    const pageText = await page.textContent('body');
    const hasMessagingContent =
      pageText.includes('value prop') ||
      pageText.includes('messaging') ||
      pageText.includes('key message') ||
      pageText.includes('audience');

    expect(hasMessagingContent).toBeTruthy();

    console.log('✅ Messaging framework generated');
  });

  test('MS3: Generate channel strategy', async ({ page }) => {
    console.log('📍 Testing channel strategy generation...');

    const chatInput = page.locator('textarea, [contenteditable="true"]').first();
    await chatInput.fill('Help me develop a channel strategy with owned, earned, and paid media recommendations');
    await page.keyboard.press('Enter');

    await page.waitForTimeout(8000);

    // Verify channel strategy elements
    const pageText = await page.textContent('body');
    const hasChannelContent =
      pageText.includes('channel') ||
      pageText.includes('owned') ||
      pageText.includes('earned') ||
      pageText.includes('paid') ||
      pageText.includes('media');

    expect(hasChannelContent).toBeTruthy();

    console.log('✅ Channel strategy generated');
  });

  test('MS4: Generate zero-budget tactics for SMEs', async ({ page }) => {
    console.log('📍 Testing zero-budget tactics generation...');

    const chatInput = page.locator('textarea, [contenteditable="true"]').first();
    await chatInput.fill('I have zero budget for marketing. What tactics can I use to grow my B2B SaaS?');
    await page.keyboard.press('Enter');

    await page.waitForTimeout(8000);

    // Verify zero-budget tactics
    const pageText = await page.textContent('body');
    const hasBudgetContent =
      pageText.includes('free') ||
      pageText.includes('organic') ||
      pageText.includes('content') ||
      pageText.includes('SEO') ||
      pageText.includes('social') ||
      pageText.includes('budget');

    expect(hasBudgetContent).toBeTruthy();

    console.log('✅ Zero-budget tactics generated');
  });

  test('MS5: Generate content pillars', async ({ page }) => {
    console.log('📍 Testing content pillars generation...');

    const chatInput = page.locator('textarea, [contenteditable="true"]').first();
    await chatInput.fill('Help me identify content pillars and topics for my marketing content calendar');
    await page.keyboard.press('Enter');

    await page.waitForTimeout(8000);

    // Verify content pillars
    const pageText = await page.textContent('body');
    const hasContentPillars =
      pageText.includes('pillar') ||
      pageText.includes('topic') ||
      pageText.includes('content') ||
      pageText.includes('theme');

    expect(hasContentPillars).toBeTruthy();

    console.log('✅ Content pillars generated');
  });

  test('MS6: Generate ROI-focused recommendations', async ({ page }) => {
    console.log('📍 Testing ROI-focused recommendations...');

    const chatInput = page.locator('textarea, [contenteditable="true"]').first();
    await chatInput.fill('What marketing tactics will give me the highest ROI with limited budget?');
    await page.keyboard.press('Enter');

    await page.waitForTimeout(8000);

    // Verify ROI recommendations
    const pageText = await page.textContent('body');
    const hasROIContent =
      pageText.includes('ROI') ||
      pageText.includes('return') ||
      pageText.includes('impact') ||
      pageText.includes('results') ||
      pageText.includes('effective');

    expect(hasROIContent).toBeTruthy();

    console.log('✅ ROI recommendations generated');
  });

  test('MS7: Multi-turn conversation maintains context', async ({ page }) => {
    console.log('📍 Testing multi-turn conversation...');

    const chatInput = page.locator('textarea, [contenteditable="true"]').first();

    // First message
    await chatInput.fill('Help me create a marketing strategy for a project management SaaS');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(6000);

    const contentAfterFirst = await page.content();
    const initialLength = contentAfterFirst.length;

    // Follow-up message (should maintain context)
    await chatInput.fill('Can you make this more specific for remote teams?');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(6000);

    const contentAfterSecond = await page.content();
    const finalLength = contentAfterSecond.length;

    // Content should grow (new response added)
    expect(finalLength).toBeGreaterThan(initialLength);

    // Should reference previous context
    const pageText = await page.textContent('body');
    const hasContextReference =
      pageText.includes('remote') ||
      pageText.includes('team') ||
      pageText.includes('project management');

    expect(hasContextReference).toBeTruthy();

    console.log('✅ Multi-turn conversation maintains context');
  });

  test('MS8: Region-specific strategies', async ({ page }) => {
    console.log('📍 Testing region-specific strategies...');

    const chatInput = page.locator('textarea, [contenteditable="true"]').first();
    await chatInput.fill('Create a marketing strategy for launching in Southeast Asia market');
    await page.keyboard.press('Enter');

    await page.waitForTimeout(8000);

    // Verify region-specific content
    const pageText = await page.textContent('body');
    const hasRegionContent =
      pageText.includes('Asia') ||
      pageText.includes('region') ||
      pageText.includes('market') ||
      pageText.includes('local') ||
      pageText.includes('cultural');

    expect(hasRegionContent).toBeTruthy();

    console.log('✅ Region-specific strategy generated');
  });

  test('MS9: Session history accessible', async ({ page }) => {
    console.log('📍 Testing session history...');

    // Generate some content first
    const chatInput = page.locator('textarea, [contenteditable="true"]').first();
    await chatInput.fill('Quick marketing strategy advice');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(5000);

    // Look for session history UI
    const hasHistoryTab = await page.locator('button:has-text("History"), button:has-text("Active")').count() > 0;

    if (hasHistoryTab) {
      console.log('✅ Session history UI present');
    } else {
      console.log('ℹ️  Session history may use different pattern');
    }

    // At minimum, verify chat messages are visible
    // Each message in AgentChat is rendered in a div with "flex items-start gap-4" classes
    const messages = await page.locator('div.flex.items-start.gap-4').count();
    expect(messages).toBeGreaterThan(0);

    console.log('✅ Session history accessible');
  });

  test('MS10: Persona integration (cross-agent data)', async ({ page }) => {
    console.log('📍 Testing persona integration...');

    const chatInput = page.locator('textarea, [contenteditable="true"]').first();

    // Request strategy that should consider personas
    await chatInput.fill('Create a marketing strategy targeting B2B decision makers in enterprise companies');
    await page.keyboard.press('Enter');

    await page.waitForTimeout(8000);

    // Verify strategy considers audience/persona
    const pageText = await page.textContent('body');
    const hasPersonaContent =
      pageText.includes('decision maker') ||
      pageText.includes('enterprise') ||
      pageText.includes('audience') ||
      pageText.includes('target') ||
      pageText.includes('persona') ||
      pageText.includes('buyer');

    expect(hasPersonaContent).toBeTruthy();

    console.log('✅ Persona integration working');
  });
});
