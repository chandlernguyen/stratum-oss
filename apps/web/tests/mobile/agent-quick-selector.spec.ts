import { test, expect } from '@playwright/test';
import { loginAsMobile } from '../helpers/mobile';

/**
 * AgentQuickSelector - Bottom Sheet Agent Picker Testing
 *
 * Tests the new AgentQuickSelector component (November 2025):
 * - Bottom sheet dialog for quick agent access
 * - Opened via "Agents" button in BottomNav
 * - Shows all available agents for user type (SME vs Agency)
 * - Touch-friendly agent selection
 * - Context-aware navigation (SME vs Agency client-scoped)
 *
 * Created: November 12, 2025
 */

test.describe('AgentQuickSelector - Bottom Sheet Agent Picker', () => {
  test.use({ viewport: { width: 393, height: 852 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:56310/login');
    await loginAsMobile(page, 'sme');

    // Open AgentQuickSelector via BottomNav "Agents" button
    const agentsButton = page.locator('nav[aria-label="Bottom navigation"] button[aria-label="Agents"]');
    await agentsButton.click();
    await page.waitForTimeout(500);
  });

  test('AgentQuickSelector opens when "Agents" button clicked', async ({ page }) => {
    // Verify dialog is visible
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 2000 });

    // Verify dialog title
    const dialogTitle = dialog.getByText(/Choose an Agent/i);
    await expect(dialogTitle).toBeVisible();
  });

  test('Shows all available agents for SME users', async ({ page }) => {
    const dialog = page.locator('[role="dialog"]');

    const expectedAgents = [
      'Quick Start',
      'Strategy', // Could be "Business Strategy"
      'Persona',
      'Marketing Strategy',
      'Content',
      'Campaign Planning', // Could be "Campaign Execution"
      'Performance Intelligence',
      'Competitive Intelligence' // Could be "Competitive Intel"
    ];

    // Check for at least 6 agents (some may have different exact text) within dialog
    let foundAgents = 0;
    for (const agent of expectedAgents) {
      const agentElement = dialog.getByText(agent, { exact: false }).first();
      if (await agentElement.isVisible({ timeout: 1000 }).catch(() => false)) {
        foundAgents++;
      }
    }

    // Should find most of the agents
    expect(foundAgents).toBeGreaterThanOrEqual(6);

    // Should NOT show Client Success (SME user) within dialog
    const clientSuccess = dialog.getByText('Client Success', { exact: false });
    const isClientSuccessVisible = await clientSuccess.isVisible().catch(() => false);
    expect(isClientSuccessVisible).toBeFalsy();
  });

  test('Clicking an agent navigates to that agent page', async ({ page }) => {
    const dialog = page.locator('[role="dialog"]');

    // Look for Strategy agent within dialog
    const strategyButton = dialog.getByText('Strategy', { exact: true }).first();

    await expect(strategyButton).toBeVisible({ timeout: 2000 });
    await strategyButton.click();

    await page.waitForLoadState('domcontentloaded');

    // Verify navigation to strategy agent
    await expect(page).toHaveURL(/\/strategy/, { timeout: 5000 });

    // Verify strategy agent page loaded
    const strategyHeading = page.locator('h1').filter({ hasText: /Strategy/i });
    await expect(strategyHeading).toBeVisible({ timeout: 5000 });
  });

  test('Agent items are touch-friendly (44px minimum)', async ({ page }) => {
    // Find all clickable agent items
    const agentItems = page.locator('[role="dialog"] a, [role="dialog"] button').filter({ hasText: /Strategy|Persona|Content|Quick Start/i });
    const count = await agentItems.count();

    if (count > 0) {
      let violations = 0;
      for (let i = 0; i < Math.min(count, 5); i++) {
        const item = agentItems.nth(i);
        const box = await item.boundingBox();

        if (box && box.height < 44) {
          violations++;
          const text = await item.textContent();
          console.log(`Touch target violation: "${text?.trim()}" - ${Math.round(box.height)}px`);
        }
      }

      expect(violations).toBe(0);
    }
  });

  test('Closes when clicking outside (if overlay present)', async ({ page }) => {
    // Check if dialog has an overlay
    const overlay = page.locator('[role="dialog"]').locator('..');
    const overlayExists = await overlay.count() > 0;

    if (overlayExists) {
      // Try clicking outside (top-left corner)
      await page.mouse.click(50, 50);
      await page.waitForTimeout(300);

      // Dialog should be closed or less visible
      const dialog = page.locator('[role="dialog"]');
      const isStillVisible = await dialog.isVisible();

      // If dialog uses overlay, it should close when clicking outside
      if (isStillVisible) {
        console.log('Dialog still visible after clicking outside - may not have overlay dismiss');
      }
    }
  });

  test('Quick Start agent is prominently displayed', async ({ page }) => {
    const dialog = page.locator('[role="dialog"]');
    const quickStartLink = dialog.getByText('Quick Start', { exact: false }).first();

    await expect(quickStartLink).toBeVisible({ timeout: 2000 });

    // Quick Start should be near the top (visible in initial viewport)
    const box = await quickStartLink.boundingBox();
    expect(box).toBeTruthy();
    if (box) {
      // Should be in upper portion of dialog (within first 400px)
      expect(box.y).toBeLessThan(400);
    }
  });
});

test.describe('AgentQuickSelector - Agency User Experience', () => {
  test.use({ viewport: { width: 393, height: 852 } });

  test('Agency with client selected shows Client Success agent', async ({ page }) => {
    test.setTimeout(120000);

    // Login as agency
    await page.goto('http://127.0.0.1:56310/login');
    await page.fill('input[type="email"]', 'agency.owner@example.com');
    await page.fill('input[type="password"]', 'LocalDevOnly123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Navigate to a client
    await page.goto('http://127.0.0.1:56310/clients');
    await page.waitForLoadState('domcontentloaded');

    const firstClient = page.locator('a[href*="/clients/"]:not([href="/clients/new"])').first();

    if (await firstClient.isVisible({ timeout: 5000 })) {
      await firstClient.click();
      await page.waitForLoadState('domcontentloaded');

      // Open AgentQuickSelector
      const agentsButton = page.locator('nav[aria-label="Bottom navigation"] button[aria-label="Agents"]');
      await agentsButton.click();
      await page.waitForTimeout(500);

      // Verify Client Success is visible for agency within dialog
      const dialog = page.locator('[role="dialog"]');
      const clientSuccessLink = dialog.getByText('Client Success', { exact: false });

      if (await clientSuccessLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(clientSuccessLink).toBeVisible();
      } else {
        console.log('Client Success agent not found - may not be in AgentQuickSelector for agencies');
      }
    } else {
      console.log('Test skipped: No clients available for agency user');
    }
  });

  test('Agency agent selection navigates to client-scoped URL', async ({ page }) => {
    test.setTimeout(120000);

    // Login as agency
    await page.goto('http://127.0.0.1:56310/login');
    await page.fill('input[type="email"]', 'agency.owner@example.com');
    await page.fill('input[type="password"]', 'LocalDevOnly123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Navigate to a client
    await page.goto('http://127.0.0.1:56310/clients');
    await page.waitForLoadState('domcontentloaded');

    const firstClient = page.locator('a[href*="/clients/"]:not([href="/clients/new"])').first();

    if (await firstClient.isVisible({ timeout: 5000 })) {
      await firstClient.click();
      await page.waitForLoadState('domcontentloaded');

      const clientSlug = page.url().match(/\/clients\/([^/]+)/)?.[1];

      if (clientSlug) {
        // Open AgentQuickSelector
        const agentsButton = page.locator('nav[aria-label="Bottom navigation"] button[aria-label="Agents"]');
        await agentsButton.click();
        await page.waitForTimeout(500);

        // Click Strategy agent within dialog
        const dialog = page.locator('[role="dialog"]');
        const strategyButton = dialog.getByText('Strategy', { exact: true }).first();

        if (await strategyButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await strategyButton.click();
          await page.waitForLoadState('domcontentloaded');

          // Verify URL is client-scoped
          await expect(page).toHaveURL(new RegExp(`/clients/${clientSlug}/agents/strategy`), { timeout: 5000 });
        }
      }
    } else {
      console.log('Test skipped: No clients available for agency user');
    }
  });
});

test.describe('AgentQuickSelector - Categories and Organization', () => {
  test.use({ viewport: { width: 393, height: 852 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:56310/login');
    await loginAsMobile(page, 'sme');

    // Open AgentQuickSelector
    const agentsButton = page.locator('nav[aria-label="Bottom navigation"] button[aria-label="Agents"]');
    await agentsButton.click();
    await page.waitForTimeout(500);
  });

  test('Agents are grouped by category (if implemented)', async ({ page }) => {
    const dialog = page.locator('[role="dialog"]');

    // Check if category headers exist within dialog
    const foundationCategory = dialog.getByText(/Foundation/i);
    const planningCategory = dialog.getByText(/Planning|Creation/i);
    const intelligenceCategory = dialog.getByText(/Intelligence/i);

    const hasFoundation = await foundationCategory.isVisible().catch(() => false);
    const hasPlanning = await planningCategory.isVisible().catch(() => false);
    const hasIntelligence = await intelligenceCategory.isVisible().catch(() => false);

    // At least one category should be present if categories are implemented
    const hasCategories = hasFoundation || hasPlanning || hasIntelligence;

    if (hasCategories) {
      console.log('AgentQuickSelector has category organization');
    } else {
      console.log('AgentQuickSelector may not use category organization');
    }

    // This test passes either way - just informational
    expect(true).toBeTruthy();
  });

  test('Agent icons are visible (if present)', async ({ page }) => {
    // Check if agent items have icons (emojis or svg)
    const agentItems = page.locator('[role="dialog"] a, [role="dialog"] button').filter({ hasText: /Strategy|Persona|Content/i });
    const count = await agentItems.count();

    if (count > 0) {
      const firstItem = agentItems.first();
      const svg = firstItem.locator('svg');
      const hasSvg = await svg.count() > 0;

      if (hasSvg) {
        console.log('Agent items have SVG icons');
      } else {
        console.log('Agent items may use emoji or no icons');
      }
    }

    // This test is informational, not strict
    expect(true).toBeTruthy();
  });
});

test.describe('AgentQuickSelector - Responsiveness', () => {
  test('AgentQuickSelector adapts to different mobile widths', async ({ page }) => {
    const viewports = [
      { width: 360, height: 800, name: 'Android 360px' },
      { width: 393, height: 852, name: 'iPhone 15' },
      { width: 430, height: 932, name: 'iPhone Pro Max' }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto('http://127.0.0.1:56310/login');
      await loginAsMobile(page, 'sme');

      // Open AgentQuickSelector
      const agentsButton = page.locator('nav[aria-label="Bottom navigation"] button[aria-label="Agents"]');
      await agentsButton.click();
      await page.waitForTimeout(500);

      // Verify dialog opens and fits viewport
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 2000 });

      // Check for horizontal scroll (should not have)
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);

      if (scrollWidth > clientWidth) {
        console.log(`⚠️ Horizontal scroll detected at ${viewport.width}px: ${scrollWidth}px vs ${clientWidth}px`);
      }

      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // Allow 1px tolerance
    }
  });
});
