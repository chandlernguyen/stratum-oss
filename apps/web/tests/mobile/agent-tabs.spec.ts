/**
 * Mobile Agent Tab Navigation Tests
 *
 * Tests Phase 6 implementation: Mobile List Views with Tab Navigation
 * - Marketing Strategy Agent tabs
 * - Content Agent tabs
 * - Persona Interview Mode tabs
 *
 * Requirements:
 * - Tabs visible on mobile (<768px), hidden on desktop
 * - Touch targets 48x48px minimum
 * - No nested scrolls
 * - No horizontal scroll
 * - Tab switching preserves context
 */

import { test, expect, Page } from '@playwright/test';
import { loginAsMobile, validateTouchTargets, detectHorizontalScroll } from '../helpers/mobile';
import { DEVICES } from '../helpers/devices';

test.describe('Mobile Agent Tab Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Login as SME user for agent access
    await loginAsMobile(page, 'sme');
  });

  test.describe('Marketing Strategy Agent', () => {
    test('shows tabs on mobile viewport (iPhone 15)', async ({ page }) => {
      // Set mobile viewport
      const device = DEVICES['iphone-15'];
      await page.setViewportSize(device.viewport);

      // Navigate to Marketing Strategy agent with chat mode (tabs only show when mode is selected)
      await page.goto('http://127.0.0.1:56310/marketing-strategy/chat');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000); // Wait for hydration

      // Verify tabs container is visible - look for border-b container (AgentTabs component)
      const tabsContainer = page.locator('.border-b').filter({ has: page.locator('button').filter({ hasText: /New Strategy/i }) }).first();
      await expect(tabsContainer).toBeVisible({ timeout: 10000 });

      // Verify both tab buttons exist
      const newStrategyTab = page.locator('button').filter({ hasText: /New Strategy/i });
      const myStrategiesTab = page.locator('button').filter({ hasText: /My Strategies/i });

      await expect(newStrategyTab).toBeVisible();
      await expect(myStrategiesTab).toBeVisible();
    });

    test('hides tabs on desktop viewport', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1280, height: 720 });

      // Navigate to Marketing Strategy agent with chat mode
      await page.goto('http://127.0.0.1:56310/marketing-strategy/chat');
      await page.waitForLoadState('domcontentloaded');

      // Tabs should be hidden on desktop (md:hidden class means hidden at md breakpoint and above)
      const newStrategyTab = page.locator('button').filter({ hasText: /New Strategy/i });
      const isVisible = await newStrategyTab.isVisible().catch(() => false);

      expect(isVisible).toBe(false);
    });

    test('switches between New Strategy and My Strategies tabs', async ({ page }) => {
      // Set mobile viewport
      const device = DEVICES['iphone-15'];
      await page.setViewportSize(device.viewport);

      await page.goto('http://127.0.0.1:56310/marketing-strategy/chat');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000); // Wait for hydration

      // Default tab should be "New Strategy" (chat view)
      const newStrategyTab = page.locator('button').filter({ hasText: /New Strategy/i });
      await expect(newStrategyTab).toBeVisible({ timeout: 10000 });
      await expect(newStrategyTab).toHaveClass(/border-amber-600|text-amber-600/);

      // Click "My Strategies" tab
      const myStrategiesTab = page.locator('button').filter({ hasText: /My Strategies/i });
      await myStrategiesTab.click();
      await page.waitForTimeout(500); // Wait for tab transition

      // Verify "My Strategies" tab is active (amber brand color)
      await expect(myStrategiesTab).toHaveClass(/border-amber-600|text-amber-600/);

      // Click back to "New Strategy"
      await newStrategyTab.click();
      await page.waitForTimeout(500);

      // Verify "New Strategy" tab is active again
      await expect(newStrategyTab).toHaveClass(/border-amber-600|text-amber-600/);
    });

    test('validates touch targets meet 48x48px minimum', async ({ page }) => {
      const device = DEVICES['iphone-15'];
      await page.setViewportSize(device.viewport);

      await page.goto('http://127.0.0.1:56310/marketing-strategy/chat');
      await page.waitForLoadState('domcontentloaded');

      // Check tab button touch targets
      const tabs = page.locator('button').filter({ hasText: /New Strategy|My Strategies/i });
      const tabCount = await tabs.count();

      for (let i = 0; i < tabCount; i++) {
        const tab = tabs.nth(i);
        const box = await tab.boundingBox();

        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(48);
          // Width can be flexible for horizontal tabs
        }
      }
    });

    test('detects no horizontal scroll on narrow viewport', async ({ page }) => {
      // Use narrowest device (Android 360px)
      const device = DEVICES['android-360'];
      await page.setViewportSize(device.viewport);

      await page.goto('http://127.0.0.1:56310/marketing-strategy/chat');
      await page.waitForLoadState('domcontentloaded');

      // Check for horizontal scroll
      const hasHorizontalScroll = await detectHorizontalScroll(page);
      expect(hasHorizontalScroll).toBe(false);
    });

    test('verifies no nested scroll containers', async ({ page }) => {
      const device = DEVICES['iphone-15'];
      await page.setViewportSize(device.viewport);

      await page.goto('http://127.0.0.1:56310/marketing-strategy/chat');
      await page.waitForLoadState('domcontentloaded');

      // Check for overflow-y-auto on main content container
      const mainContent = page.locator('.flex-1').first();
      const overflowY = await mainContent.evaluate(el => getComputedStyle(el).overflowY);

      // Should NOT be 'auto' or 'scroll' (allows natural page scroll)
      expect(overflowY).not.toBe('auto');
      expect(overflowY).not.toBe('scroll');
    });
  });

  test.describe('Content Agent', () => {
    test('shows tabs on mobile viewport (iPhone 15)', async ({ page }) => {
      const device = DEVICES['iphone-15'];
      await page.setViewportSize(device.viewport);

      // Navigate to Content agent with a tool selected (tabs only show when tool is selected)
      await page.goto('http://127.0.0.1:56310/content/tool/seo-blog');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000); // Wait for hydration

      // Verify tabs are visible
      const generateTab = page.locator('button').filter({ hasText: /Generate Content/i });
      const myContentTab = page.locator('button').filter({ hasText: /My Content/i });

      await expect(generateTab).toBeVisible({ timeout: 10000 });
      await expect(myContentTab).toBeVisible();
    });

    test('switches between Generate Content and My Content tabs', async ({ page }) => {
      const device = DEVICES['iphone-15'];
      await page.setViewportSize(device.viewport);

      await page.goto('http://127.0.0.1:56310/content/tool/seo-blog');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000); // Wait for hydration

      // Default tab should be "Generate Content"
      const generateTab = page.locator('button').filter({ hasText: /Generate Content/i });
      await expect(generateTab).toBeVisible({ timeout: 10000 });
      await expect(generateTab).toHaveClass(/border-amber-600|text-amber-600/);

      // Click "My Content" tab
      const myContentTab = page.locator('button').filter({ hasText: /My Content/i });
      await myContentTab.click();
      await page.waitForTimeout(500);

      // Verify "My Content" tab is active (amber brand color)
      await expect(myContentTab).toHaveClass(/border-amber-600|text-amber-600/);

      // Click back to "Generate Content"
      await generateTab.click();
      await page.waitForTimeout(500);

      // Verify "Generate Content" tab is active again
      await expect(generateTab).toHaveClass(/border-amber-600|text-amber-600/);
    });

    test('validates touch targets for Content Agent tabs', async ({ page }) => {
      const device = DEVICES['iphone-15'];
      await page.setViewportSize(device.viewport);

      await page.goto('http://127.0.0.1:56310/content/tool/seo-blog');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000); // Wait for hydration

      // Check tab button touch targets
      const tabs = page.locator('button').filter({ hasText: /Generate Content|My Content/i });
      const tabCount = await tabs.count();

      for (let i = 0; i < tabCount; i++) {
        const tab = tabs.nth(i);
        const box = await tab.boundingBox();

        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(48);
        }
      }
    });

    test('verifies no nested scroll in Content Agent', async ({ page }) => {
      const device = DEVICES['iphone-15'];
      await page.setViewportSize(device.viewport);

      await page.goto('http://127.0.0.1:56310/content/tool/seo-blog');
      await page.waitForLoadState('domcontentloaded');

      // Check for overflow-y-auto on main content container
      const mainContent = page.locator('.flex-1').first();
      const overflowY = await mainContent.evaluate(el => getComputedStyle(el).overflowY);

      expect(overflowY).not.toBe('auto');
      expect(overflowY).not.toBe('scroll');
    });
  });

  test.describe('Persona Interview Mode', () => {
    test('shows Interview and Live Insights tabs on mobile', async ({ page }) => {
      const device = DEVICES['iphone-15'];
      await page.setViewportSize(device.viewport);

      // First, navigate to Persona agent and start interview
      await page.goto('http://127.0.0.1:56310/persona');
      await page.waitForLoadState('domcontentloaded');

      // Click interview button on first persona (if exists)
      // Note: This test assumes at least one persona exists
      const interviewButton = page.locator('button').filter({ hasText: /Interview/i }).first();
      const hasInterview = await interviewButton.isVisible().catch(() => false);

      if (hasInterview) {
        await interviewButton.click();
        await page.waitForLoadState('domcontentloaded');

        // Verify Interview and Live Insights tabs are visible
        const interviewTab = page.locator('button').filter({ hasText: /^Interview$/i });
        const insightsTab = page.locator('button').filter({ hasText: /Live Insights/i });

        await expect(interviewTab).toBeVisible({ timeout: 5000 });
        await expect(insightsTab).toBeVisible();
      } else {
        // Skip test if no personas exist
        test.skip();
      }
    });

    test('switches between Interview and Live Insights tabs', async ({ page }) => {
      const device = DEVICES['iphone-15'];
      await page.setViewportSize(device.viewport);

      await page.goto('http://127.0.0.1:56310/persona');
      await page.waitForLoadState('domcontentloaded');

      // Start interview on first persona
      const interviewButton = page.locator('button').filter({ hasText: /Interview/i }).first();
      const hasInterview = await interviewButton.isVisible().catch(() => false);

      if (hasInterview) {
        await interviewButton.click();
        await page.waitForLoadState('domcontentloaded');

        // Default tab should be "Interview"
        const interviewTab = page.locator('button').filter({ hasText: /^Interview$/i });
        await expect(interviewTab).toHaveClass(/border-blue-600|text-blue-600/);

        // Click "Live Insights" tab
        const insightsTab = page.locator('button').filter({ hasText: /Live Insights/i });
        await insightsTab.click();
        await page.waitForTimeout(500);

        // Verify "Live Insights" tab is active
        await expect(insightsTab).toHaveClass(/border-blue-600|text-blue-600/);

        // Click back to "Interview"
        await interviewTab.click();
        await page.waitForTimeout(500);

        // Verify "Interview" tab is active again
        await expect(interviewTab).toHaveClass(/border-blue-600|text-blue-600/);
      } else {
        test.skip();
      }
    });

    test('validates touch targets for Interview tabs', async ({ page }) => {
      const device = DEVICES['iphone-15'];
      await page.setViewportSize(device.viewport);

      await page.goto('http://127.0.0.1:56310/persona');
      await page.waitForLoadState('domcontentloaded');

      const interviewButton = page.locator('button').filter({ hasText: /Interview/i }).first();
      const hasInterview = await interviewButton.isVisible().catch(() => false);

      if (hasInterview) {
        await interviewButton.click();
        await page.waitForLoadState('domcontentloaded');

        // Check tab button touch targets
        const tabs = page.locator('button').filter({ hasText: /^Interview$|Live Insights/i });
        const tabCount = await tabs.count();

        for (let i = 0; i < tabCount; i++) {
          const tab = tabs.nth(i);
          const box = await tab.boundingBox();

          if (box) {
            expect(box.height).toBeGreaterThanOrEqual(48);
          }
        }
      } else {
        test.skip();
      }
    });
  });

  test.describe('Cross-Device Tab Navigation', () => {
    test('works on smallest viewport (Android 360px)', async ({ page }) => {
      const device = DEVICES['android-360'];
      await page.setViewportSize(device.viewport);

      await page.goto('http://127.0.0.1:56310/marketing-strategy/chat');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000); // Wait for hydration

      // Tabs should still be visible and functional
      const tabs = page.locator('button').filter({ hasText: /New Strategy|My Strategies/i });
      await expect(tabs.first()).toBeVisible({ timeout: 10000 });

      // Should be able to switch tabs
      const myStrategiesTab = page.locator('button').filter({ hasText: /My Strategies/i });
      await myStrategiesTab.click();
      await page.waitForTimeout(500);

      await expect(myStrategiesTab).toHaveClass(/border-amber-600|text-amber-600/);
    });

    test('works on large phone (iPhone Pro Max 430px)', async ({ page }) => {
      const device = DEVICES['iphone-15-pro-max'];
      await page.setViewportSize(device.viewport);

      await page.goto('http://127.0.0.1:56310/content/tool/seo-blog');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000); // Wait for hydration

      // Tabs should be visible
      const tabs = page.locator('button').filter({ hasText: /Generate Content|My Content/i });
      await expect(tabs.first()).toBeVisible({ timeout: 10000 });

      // Switch tabs
      const myContentTab = page.locator('button').filter({ hasText: /My Content/i });
      await myContentTab.click();
      await page.waitForTimeout(500);

      await expect(myContentTab).toHaveClass(/border-amber-600|text-amber-600/);
    });

    test('tabs hidden on tablet viewport (iPad 768px)', async ({ page }) => {
      // Set tablet viewport (768px - at md: breakpoint)
      await page.setViewportSize({ width: 768, height: 1024 });

      await page.goto('http://127.0.0.1:56310/marketing-strategy/chat');
      await page.waitForLoadState('domcontentloaded');

      // Tabs should be hidden on tablet (md:hidden means hidden at md breakpoint and above)
      const newStrategyTab = page.locator('button').filter({ hasText: /New Strategy/i });
      const isVisible = await newStrategyTab.isVisible().catch(() => false);

      // At exactly 768px, md: breakpoint activates, so tabs should be hidden
      expect(isVisible).toBe(false);
    });
  });

  test.describe('Tab Navigation Accessibility', () => {
    test('tabs have proper ARIA roles and labels', async ({ page }) => {
      const device = DEVICES['iphone-15'];
      await page.setViewportSize(device.viewport);

      await page.goto('http://127.0.0.1:56310/marketing-strategy/chat');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000); // Wait for hydration

      // Check tab buttons have role="button" or proper button element
      const newStrategyTab = page.locator('button').filter({ hasText: /New Strategy/i });
      await expect(newStrategyTab).toBeVisible({ timeout: 10000 });

      const tagName = await newStrategyTab.evaluate(el => el.tagName.toLowerCase());
      expect(tagName).toBe('button');

      // Verify text content is accessible
      const tabText = await newStrategyTab.textContent();
      expect(tabText).toMatch(/New Strategy/i);
    });

    test('keyboard navigation works for tabs', async ({ page }) => {
      const device = DEVICES['iphone-15'];
      await page.setViewportSize(device.viewport);

      await page.goto('http://127.0.0.1:56310/marketing-strategy/chat');
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000); // Wait for hydration

      // Focus first tab
      const newStrategyTab = page.locator('button').filter({ hasText: /New Strategy/i });
      await expect(newStrategyTab).toBeVisible({ timeout: 10000 });
      await newStrategyTab.focus();

      // Verify focused
      const isFocused = await newStrategyTab.evaluate(el => el === document.activeElement);
      expect(isFocused).toBe(true);

      // Press Tab key to move to next tab
      await page.keyboard.press('Tab');

      // Next tab should be focusable
      const myStrategiesTab = page.locator('button').filter({ hasText: /My Strategies/i });
      const isFocused2 = await myStrategiesTab.evaluate(el => el === document.activeElement);
      expect(isFocused2).toBe(true);
    });
  });
});
