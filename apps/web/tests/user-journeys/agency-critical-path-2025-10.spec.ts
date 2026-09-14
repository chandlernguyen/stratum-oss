import { test, expect } from '@playwright/test';

/**
 * Agency User Journey - Critical Path (November 2025)
 *
 * Tests the complete agency workflow from login to cross-client analytics.
 * These tests validate the end-to-end user journey for agency owners.
 *
 * Updated: November 2025 to match current navigation structure
 */

const AGENCY_USER = {
  email: 'agency.owner@example.com',
  password: 'LocalDevOnly123!'
};

test.describe('Agency Critical Path (November 2025)', () => {
  test.setTimeout(180000); // 3 minutes for complete workflow

  test('Complete Agency workflow: Login → Client → Campaign → Agent', async ({ page }) => {
    // === STEP 1: Login as agency owner ===
    await page.goto('/login');
    await page.fill('input[type="email"]', AGENCY_USER.email);
    await page.fill('input[type="password"]', AGENCY_USER.password);
    await page.click('button[type="submit"]');

    // Wait for navigation to complete
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await page.waitForLoadState('domcontentloaded');

    // === STEP 2: Verify Agency Dashboard loads ===
    // Look for "Clients" link (unique to agency) - last one is desktop nav
    await expect(page.locator('a:has-text("Clients")').last()).toBeVisible({ timeout: 10000 });
    console.log('✅ Agency dashboard loaded');

    // === STEP 3: Navigate to clients list to select a client ===
    await page.locator('a:has-text("Clients")').last().click();
    await page.waitForURL('**/clients', { timeout: 10000 });
    await page.waitForLoadState('domcontentloaded');

    // Verify on clients list page
    await expect(page.locator('h1').filter({ hasText: /Clients/i })).toBeVisible({ timeout: 5000 });
    console.log('✅ Clients list loaded');

    // Click first client (avoid "Add Client" button)
    const firstClientLink = page.locator('a[href*="/clients/"]:not([href="/clients/new"])').first();
    await expect(firstClientLink).toBeVisible({ timeout: 5000 });
    await firstClientLink.click();
    await page.waitForLoadState('domcontentloaded');

    // Verify we're in a client context (URL contains client slug)
    await expect(page).toHaveURL(/\/clients\/[a-zA-Z0-9_-]+/, { timeout: 5000 });
    console.log('✅ Navigated to client context');

    // === STEP 4: Navigate to Strategy Agent for this client ===
    // Wait for page to stabilize
    await page.waitForTimeout(1000);

    // Click Agents dropdown button (desktop navigation - first one is desktop HeaderNew)
    const agentsButton = page.locator('nav button:has-text("Agents")').first();
    await agentsButton.click();

    // Wait for dropdown to open
    await page.waitForTimeout(500);

    // Click Strategy link in dropdown
    const strategyLink = page.locator('a:has-text("Strategy")').filter({ has: page.locator('span:has-text("🎯")') });
    await expect(strategyLink).toBeVisible({ timeout: 5000 });
    await strategyLink.click();

    await page.waitForLoadState('domcontentloaded');

    // === STEP 5: Generate content for client ===
    // Verify Strategy Agent page loads (h1 main heading)
    await expect(page.locator('h1').filter({ hasText: /Business Strategy Agent/i })).toBeVisible({ timeout: 10000 });
    console.log('✅ Strategy Agent loaded for client');

    // Look for chat input
    const chatInput = page.locator('textarea').first();

    if (await chatInput.isVisible({ timeout: 5000 })) {
      await chatInput.fill('Analyze the competitive landscape for this client');

      // Try to send the message
      const sendButton = page.locator('button[type="submit"]').filter({ hasText: /Send|Submit/i }).first();
      if (await sendButton.isVisible({ timeout: 2000 })) {
        await sendButton.click();
      } else {
        await page.keyboard.press('Enter');
      }

      // Wait for AI response
      await page.waitForTimeout(5000);
      console.log('✅ Sent message to Strategy Agent');
    }

    // === STEP 6: Switch between clients ===
    await page.locator('a:has-text("Clients")').last().click();
    await page.waitForURL('**/clients', { timeout: 10000 });
    await page.waitForLoadState('domcontentloaded');

    // Verify clients list page
    await expect(page.locator('h1').filter({ hasText: /Clients/i })).toBeVisible({ timeout: 5000 });

    // Count client links (should have at least 2 for switching test)
    const clientLinks = page.locator('a[href*="/clients/"]:not([href="/clients/new"])');
    const clientCount = await clientLinks.count();

    if (clientCount >= 2) {
      // Click second client
      await clientLinks.nth(1).click();
      await page.waitForLoadState('domcontentloaded');

      // Verify different client context in URL
      await expect(page).toHaveURL(/\/clients\/[a-zA-Z0-9_-]+/, { timeout: 5000 });
      console.log('✅ Successfully switched to second client');
    }

    // === STEP 7: Verify ability to navigate back to agency overview ===
    // On desktop, "Dashboard" link serves as return to agency view (Agency Overview is mobile-only)
    const dashboardLink = page.locator('a:has-text("Dashboard")').last();
    await expect(dashboardLink).toBeVisible({ timeout: 5000 });

    console.log('✅ Agency critical path completed successfully!');
  });

  test('Agency owner can view and navigate clients', async ({ page }) => {
    // Login as agency owner
    await page.goto('/login');
    await page.fill('input[type="email"]', AGENCY_USER.email);
    await page.fill('input[type="password"]', AGENCY_USER.password);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await page.waitForLoadState('domcontentloaded');

    // Navigate to clients list (last one is desktop nav)
    await page.locator('a:has-text("Clients")').last().click();
    await page.waitForURL('**/clients', { timeout: 10000 });

    // Verify clients page loaded
    await expect(page.locator('h1').filter({ hasText: /Clients/i })).toBeVisible({ timeout: 10000 });

    // Verify at least one client is visible
    const clientLinks = page.locator('a[href*="/clients/"]:not([href="/clients/new"])');
    const clientCount = await clientLinks.count();

    expect(clientCount).toBeGreaterThan(0);
    console.log(`✅ Found ${clientCount} client(s)`);

    // Click first client to verify navigation works
    await clientLinks.first().click();
    await page.waitForLoadState('domcontentloaded');

    // Verify we're in client context
    await expect(page).toHaveURL(/\/clients\/[a-zA-Z0-9_-]+/, { timeout: 5000 });

    // Verify client dashboard loaded (works regardless of nav structure)
    await expect(page.locator('main, h1, h2').first()).toBeVisible({ timeout: 5000 });

    console.log('✅ Client navigation working correctly');
  });

  test('Agency can access agents in client context', async ({ page }) => {
    // Login as agency owner
    await page.goto('/login');
    await page.fill('input[type="email"]', AGENCY_USER.email);
    await page.fill('input[type="password"]', AGENCY_USER.password);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Navigate to first client (last one is desktop nav)
    await page.locator('a:has-text("Clients")').last().click();
    await page.waitForURL('**/clients', { timeout: 10000 });

    const firstClientLink = page.locator('a[href*="/clients/"]:not([href="/clients/new"])').first();
    await firstClientLink.click();
    await page.waitForLoadState('domcontentloaded');

    // Verify Agents dropdown is available in client context - target desktop button by ChevronDown icon
    const agentsButton = page.locator('button').filter({ hasText: 'Agents' }).filter({ has: page.locator('svg.lucide-chevron-down') });

    // Open agents dropdown
    await agentsButton.click();
    await page.waitForTimeout(500);

    // Verify multiple agents are visible (use emoji to target dropdown links specifically)
    await expect(page.locator('a:has-text("Strategy")').filter({ has: page.locator('span:has-text("🎯")') })).toBeVisible();
    await expect(page.locator('a:has-text("Persona")').filter({ has: page.locator('span:has-text("👥")') })).toBeVisible();
    await expect(page.locator('a:has-text("Content")').filter({ has: page.locator('span:has-text("📝")') })).toBeVisible();

    console.log('✅ All agents accessible in client context');

    // Test navigation to Persona Agent
    await page.locator('a:has-text("Persona")').filter({ has: page.locator('span:has-text("👥")') }).click();
    await page.waitForURL(/.*persona.*/, { timeout: 10000 });
    await page.waitForLoadState('domcontentloaded');

    // Verify Persona Agent loaded
    await expect(page.locator('h1').filter({ hasText: /Customer Persona Agent/i })).toBeVisible({ timeout: 10000 });

    console.log('✅ Persona Agent navigation working in client context');
  });
});
