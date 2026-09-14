import { test, expect } from '@playwright/test';
import { loginAsMobile } from '../helpers/mobile';

/**
 * BottomNav Mobile-First Navigation Testing
 *
 * Tests the new BottomNav component (November 2025):
 * - Fixed bottom navigation with 5 items
 * - Context-aware routing (SME vs Agency)
 * - Touch target validation (48x48px minimum)
 * - "Agents" button opens AgentQuickSelector
 * - "More" button opens MobileMenuPanel
 *
 * Created: November 12, 2025
 */

test.describe('BottomNav - Mobile-First Navigation', () => {
  test.use({ viewport: { width: 393, height: 852 } }); // iPhone 15

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await loginAsMobile(page, 'sme');
  });

  test('BottomNav is visible and fixed at bottom', async ({ page }) => {
    const bottomNav = page.locator('nav[aria-label="Bottom navigation"]');
    await expect(bottomNav).toBeVisible();

    // Verify fixed positioning at bottom
    const position = await bottomNav.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        position: styles.position,
        bottom: styles.bottom,
        zIndex: styles.zIndex
      };
    });

    expect(position.position).toBe('fixed');
    expect(position.bottom).toBe('0px');
    expect(parseInt(position.zIndex)).toBeGreaterThanOrEqual(50);
  });

  test('All BottomNav items meet 48x48px touch target', async ({ page }) => {
    // Wait for BottomNav to be visible first
    const bottomNav = page.locator('nav[aria-label="Bottom navigation"]');
    await expect(bottomNav).toBeVisible();

    const navItems = page.locator('nav[aria-label="Bottom navigation"] button, nav[aria-label="Bottom navigation"] a');
    const count = await navItems.count();

    expect(count).toBe(5); // Home, Agents, Campaigns, Outputs, More

    const violations: string[] = [];
    for (let i = 0; i < count; i++) {
      const item = navItems.nth(i);
      const box = await item.boundingBox();
      const label = await item.getAttribute('aria-label');

      if (box) {
        if (box.height < 48) {
          violations.push(`${label}: height ${Math.round(box.height)}px < 48px`);
        }
        if (box.width < 48) {
          violations.push(`${label}: width ${Math.round(box.width)}px < 48px`);
        }
      }
    }

    if (violations.length > 0) {
      console.log('Touch target violations:', violations);
    }

    expect(violations).toHaveLength(0);
  });

  test('BottomNav active states highlight correctly', async ({ page }) => {
    // Click "Campaigns"
    const campaignsButton = page.locator('nav[aria-label="Bottom navigation"] a[aria-label="Campaigns"]');
    await campaignsButton.click();
    await page.waitForLoadState('domcontentloaded');

    // Verify Campaigns is active (should have gold color)
    const activeColor = await campaignsButton.evaluate(el =>
      window.getComputedStyle(el).color
    );

    // Verify not slate color (rgb(100, 116, 139))
    expect(activeColor).not.toBe('rgb(100, 116, 139)');

    // Verify URL changed
    await expect(page).toHaveURL(/\/campaigns/);
  });

  test('"Agents" button opens AgentQuickSelector', async ({ page }) => {
    const agentsButton = page.locator('nav[aria-label="Bottom navigation"] button[aria-label="Agents"]');
    await agentsButton.click();

    // Wait for AgentQuickSelector to appear
    await page.waitForTimeout(500);

    // Verify agent selector is visible (could be dialog or sheet)
    const hasDialog = await page.locator('[role="dialog"]').count() > 0;
    const hasAgentText = await page.locator('text=/Quick Start|Strategy|Persona/i').isVisible({ timeout: 2000 });

    // At least one should be true
    expect(hasDialog || hasAgentText).toBeTruthy();
  });

  test('"More" button opens MobileMenuPanel', async ({ page }) => {
    const moreButton = page.locator('nav[aria-label="Bottom navigation"] button[aria-label="More"]');
    await moreButton.click();

    // Wait for animation
    await page.waitForTimeout(300);

    // Verify MobileMenuPanel opens
    const menuPanel = page.locator('.fixed.top-0.left-0.bottom-0.w-80');
    await expect(menuPanel).toBeVisible();

    // Verify overlay is visible
    const overlay = page.locator('.fixed.inset-0.bg-black\\/50');
    await expect(overlay).toBeVisible();

    // Verify menu contains navigation items
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('BottomNav does not obstruct content (safe-bottom)', async ({ page }) => {
    // Check if safe-bottom class is applied
    const bottomNav = page.locator('nav[aria-label="Bottom navigation"]');
    const classes = await bottomNav.getAttribute('class');

    expect(classes).toContain('safe-bottom');

    // Verify bottom nav doesn't overlap main content
    const navBox = await bottomNav.boundingBox();
    const mainContent = page.locator('main, [role="main"]').first();

    if (await mainContent.isVisible()) {
      const contentBox = await mainContent.boundingBox();

      if (navBox && contentBox) {
        // Main content should not significantly overlap with bottom nav
        const overlap = (contentBox.y + contentBox.height) - navBox.y;
        expect(overlap).toBeLessThanOrEqual(64); // Allow padding/margin
      }
    }
  });

  test('BottomNav items have correct icons and labels', async ({ page }) => {
    const navItems = [
      { label: 'Home', hasIcon: true },
      { label: 'Agents', hasIcon: true },
      { label: 'Campaigns', hasIcon: true },
      { label: 'Outputs', hasIcon: true },
      { label: 'More', hasIcon: true }
    ];

    for (const item of navItems) {
      const navItem = page.locator(`nav[aria-label="Bottom navigation"] [aria-label="${item.label}"]`);
      await expect(navItem).toBeVisible();

      // Verify has icon (svg element)
      if (item.hasIcon) {
        const icon = navItem.locator('svg');
        await expect(icon).toBeVisible();
      }

      // Verify has text label
      const text = navItem.locator(`text=${item.label}`);
      await expect(text).toBeVisible();
    }
  });

  test('BottomNav only visible on mobile viewports (<768px)', async ({ page }) => {
    // BottomNav should be visible on mobile (393px)
    let bottomNav = page.locator('nav[aria-label="Bottom navigation"]');
    await expect(bottomNav).toBeVisible();

    // Resize to tablet (768px)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(300);

    // BottomNav should be hidden on tablet/desktop
    const isVisible = await bottomNav.isVisible();
    expect(isVisible).toBeFalsy();
  });
});

test.describe('BottomNav - Context-Aware Routing (Agency)', () => {
  test.use({ viewport: { width: 393, height: 852 } });

  test('Agency BottomNav updates routes when client context changes', async ({ page }) => {
    test.setTimeout(120000);

    // Login as agency
    await page.goto('/login');
    await page.fill('input[type="email"]', 'agency.owner@example.com');
    await page.fill('input[type="password"]', 'LocalDevOnly123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Navigate to clients list
    await page.goto('/clients');
    await page.waitForLoadState('domcontentloaded');

    const clientLinks = page.locator('a[href*="/clients/"]:not([href="/clients/new"])');
    const clientCount = await clientLinks.count();

    if (clientCount >= 2) {
      // Navigate to Client A
      await clientLinks.nth(0).click();
      await page.waitForLoadState('domcontentloaded');
      const clientASlug = page.url().match(/\/clients\/([^/]+)/)?.[1];

      // Verify BottomNav "Home" links to Client A dashboard
      const homeButton = page.locator('nav[aria-label="Bottom navigation"] a[aria-label="Home"]');
      let href = await homeButton.getAttribute('href');
      expect(href).toBe(`/clients/${clientASlug}`);

      // Navigate to Client B
      await page.goto('/clients');
      await page.waitForLoadState('domcontentloaded');
      await clientLinks.nth(1).click();
      await page.waitForLoadState('domcontentloaded');
      const clientBSlug = page.url().match(/\/clients\/([^/]+)/)?.[1];

      // Verify BottomNav "Home" now links to Client B dashboard
      href = await homeButton.getAttribute('href');
      expect(href).toBe(`/clients/${clientBSlug}`);

      // Verify different client contexts
      expect(clientASlug).not.toEqual(clientBSlug);
    } else {
      console.log('Test skipped: Need at least 2 clients for context switching test');
    }
  });

  test('Agency BottomNav links to client-scoped pages', async ({ page }) => {
    test.setTimeout(90000);

    // Login as agency
    await page.goto('/login');
    await page.fill('input[type="email"]', 'agency.owner@example.com');
    await page.fill('input[type="password"]', 'LocalDevOnly123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Navigate to a client
    await page.goto('/clients');
    await page.waitForLoadState('domcontentloaded');

    const firstClient = page.locator('a[href*="/clients/"]:not([href="/clients/new"])').first();

    if (await firstClient.isVisible({ timeout: 5000 })) {
      await firstClient.click();
      await page.waitForLoadState('domcontentloaded');

      const clientSlug = page.url().match(/\/clients\/([^/]+)/)?.[1];

      if (clientSlug) {
        // Verify all BottomNav links are client-scoped
        const homeButton = page.locator('nav[aria-label="Bottom navigation"] a[aria-label="Home"]');
        const campaignsButton = page.locator('nav[aria-label="Bottom navigation"] a[aria-label="Campaigns"]');
        const outputsButton = page.locator('nav[aria-label="Bottom navigation"] a[aria-label="Outputs"]');

        const homeHref = await homeButton.getAttribute('href');
        const campaignsHref = await campaignsButton.getAttribute('href');
        const outputsHref = await outputsButton.getAttribute('href');

        expect(homeHref).toBe(`/clients/${clientSlug}`);
        expect(campaignsHref).toBe(`/clients/${clientSlug}/campaigns`);
        expect(outputsHref).toBe(`/clients/${clientSlug}/outputs`);
      }
    } else {
      console.log('Test skipped: No clients available for agency user');
    }
  });
});

test.describe('BottomNav - SME User Experience', () => {
  test.use({ viewport: { width: 393, height: 852 } });

  test('SME BottomNav uses direct routes (not client-scoped)', async ({ page }) => {
    // Login as SME
    await page.goto('/login');
    await loginAsMobile(page, 'sme');

    // Verify BottomNav links are NOT client-scoped
    const homeButton = page.locator('nav[aria-label="Bottom navigation"] a[aria-label="Home"]');
    const campaignsButton = page.locator('nav[aria-label="Bottom navigation"] a[aria-label="Campaigns"]');
    const outputsButton = page.locator('nav[aria-label="Bottom navigation"] a[aria-label="Outputs"]');

    const homeHref = await homeButton.getAttribute('href');
    const campaignsHref = await campaignsButton.getAttribute('href');
    const outputsHref = await outputsButton.getAttribute('href');

    // Should be direct routes, not /clients/:slug/...
    expect(homeHref).not.toContain('/clients/');
    expect(campaignsHref).not.toContain('/clients/');
    expect(outputsHref).not.toContain('/clients/');

    // Should match standard routes
    expect(homeHref).toMatch(/^\/(dashboard)?$/);
    expect(campaignsHref).toBe('/campaigns');
    expect(outputsHref).toBe('/outputs');
  });
});
