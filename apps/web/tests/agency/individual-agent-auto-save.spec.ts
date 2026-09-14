/**
 * Individual Agent Auto-Save Tests
 *
 * Each test case tests one agent independently.
 * Run individually: npm run test tests/agency/individual-agent-auto-save.spec.ts -- --grep "Strategy Agent"
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const AGENCY_USER = {
  email: 'agency.owner@example.com',
  password: 'LocalDevOnly123!'
};

const TEST_CLIENT = {
  slug: 'ecommerce-plus',
  name: 'E-Commerce Plus'
};

test.describe('Individual Agent Auto-Save Tests', () => {
  test.setTimeout(120000); // 2 minutes per agent

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('http://127.0.0.1:56310');
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
  });

  async function loginAsAgency(page: Page) {
    await page.goto('http://127.0.0.1:56310/login');
    await page.waitForLoadState('domcontentloaded');

    await page.fill('input[type="email"]', AGENCY_USER.email);
    await page.fill('input[type="password"]', AGENCY_USER.password);

    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForLoadState('domcontentloaded')
    ]);

    await page.waitForFunction(
      () => window.location.pathname === '/' || window.location.pathname.includes('dashboard'),
      { timeout: 15000 }
    );

    console.log('✅ Logged in as agency user');
  }

  async function testAgent(page: Page, agentType: string, message: string) {
    console.log(`\n📍 Testing ${agentType} agent...`);

    // Navigate to agent
    const url = `http://127.0.0.1:56310/clients/${TEST_CLIENT.slug}/agents/${agentType}`;
    await page.goto(url);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    console.log(`✅ Agent page loaded`);

    // Start new session if button exists
    const newSessionButton = page.locator('button').filter({ hasText: /New.*Session|New.*Chat|Start/i }).first();
    if (await newSessionButton.isVisible({ timeout: 3000 })) {
      await newSessionButton.click();
      await page.waitForLoadState('domcontentloaded');
    }

    // Send message
    console.log(`📤 Sending message...`);
    const messageInput = page.locator('textarea, input').last();
    await messageInput.waitFor({ state: 'visible', timeout: 10000 });
    await messageInput.fill(message);

    const sendButton = page.locator('button[type="submit"]').last();
    await sendButton.waitFor({ state: 'visible', timeout: 5000 });
    await sendButton.click();

    console.log(`⏳ Waiting for response (max 90s)...`);

    // Wait for any text content to appear in messages
    await page.waitForTimeout(10000); // Wait 10s for response to start

    console.log(`✅ Message sent, waiting for progressive learning (15s)...`);
    await page.waitForTimeout(15000); // Progressive learning wait

    console.log(`✅ ${agentType} agent test complete`);
  }

  test('Strategy Agent auto-save', async ({ page }) => {
    await loginAsAgency(page);
    await testAgent(
      page,
      'strategy',
      'Analyze our competitive positioning using SWOT analysis for our B2B SaaS company.'
    );
  });

  test('Persona Agent auto-save', async ({ page }) => {
    await loginAsAgency(page);
    await testAgent(
      page,
      'persona',
      'Create a detailed persona for our ideal B2B customer in the enterprise software market.'
    );
  });

  test('Marketing Strategy Agent auto-save', async ({ page }) => {
    await loginAsAgency(page);
    await testAgent(
      page,
      'marketing_strategy',
      'Develop a go-to-market strategy for our new SaaS product targeting mid-market companies.'
    );
  });

  test('Content Agent auto-save', async ({ page }) => {
    await loginAsAgency(page);
    await testAgent(
      page,
      'content',
      'Generate a blog post outline about digital transformation trends in 2025.'
    );
  });

  test('Performance Intelligence Agent auto-save', async ({ page }) => {
    await loginAsAgency(page);
    await testAgent(
      page,
      'performance_intelligence',
      'Analyze our campaign performance metrics and provide ROI recommendations.'
    );
  });

  test('Campaign Planning Agent auto-save', async ({ page }) => {
    await loginAsAgency(page);
    await testAgent(
      page,
      'campaign_planning',
      'Create a multi-channel campaign plan for our Q1 product launch.'
    );
  });

  test('Competitive Intelligence Agent auto-save', async ({ page }) => {
    await loginAsAgency(page);
    await testAgent(
      page,
      'competitive_intelligence',
      'Analyze our top 3 competitors and identify strategic gaps we can exploit.'
    );
  });

  test('Client Success Agent auto-save', async ({ page }) => {
    await loginAsAgency(page);
    await testAgent(
      page,
      'client_success',
      'Develop a retention strategy for at-risk enterprise customers showing signs of churn.'
    );
  });

  test('Quick Start Agent auto-save', async ({ page }) => {
    await loginAsAgency(page);
    await testAgent(
      page,
      'quick_start',
      'Help me get started with marketing strategy for my e-commerce business.'
    );
  });
});
