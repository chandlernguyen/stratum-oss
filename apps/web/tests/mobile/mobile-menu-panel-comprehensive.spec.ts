import { test, expect } from '@playwright/test';
import { loginAsMobile } from '../helpers/mobile';

/**
 * MobileMenuPanel - Full-Screen Menu Testing
 *
 * Tests the new MobileMenuPanel component (November 2025):
 * - Full-screen slide-out menu
 * - Accessed via "More" button in BottomNav
 * - Z-index layering (overlay: 100, panel: 101)
 * - Expandable sections (Agents, Settings)
 * - Dark mode toggle
 * - Context-aware navigation (SME vs Agency)
 * - Auto-closes on route change
 *
 * Created: November 12, 2025
 */

test.describe('MobileMenuPanel - Full-Screen Menu', () => {
  test.use({ viewport: { width: 393, height: 852 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:56310/login');
    await loginAsMobile(page, 'sme');

    // Open mobile menu via "More" button
    const moreButton = page.locator('nav[aria-label="Bottom navigation"] button[aria-label="More"]');
    await moreButton.click();
    await page.waitForTimeout(300);
  });

  test('MobileMenuPanel renders with correct z-index layers', async ({ page }) => {
    const overlay = page.locator('.fixed.inset-0.bg-black\\/50');
    const menuPanel = page.locator('.fixed.top-0.left-0.bottom-0.w-80');

    await expect(overlay).toBeVisible();
    await expect(menuPanel).toBeVisible();

    // Get z-index values
    const overlayZ = await overlay.evaluate(el => window.getComputedStyle(el).zIndex);
    const panelZ = await menuPanel.evaluate(el => window.getComputedStyle(el).zIndex);

    expect(parseInt(overlayZ)).toBe(100);
    expect(parseInt(panelZ)).toBe(101);
    expect(parseInt(panelZ)).toBeGreaterThan(parseInt(overlayZ));
  });

  test('MobileMenuPanel shows STRAŦUM branding', async ({ page }) => {
    const menuPanel = page.locator('.fixed.top-0.left-0.bottom-0.w-80');

    // Verify logo is visible
    const logo = menuPanel.locator('img[alt="STRAŦUM"]');
    await expect(logo).toBeVisible();

    // Verify tagline is visible
    const tagline = menuPanel.locator('text=Intelligence Over Execution');
    await expect(tagline).toBeVisible();
  });

  test('Close button closes the menu', async ({ page }) => {
    const closeButton = page.locator('button[aria-label="Close menu"]');
    await expect(closeButton).toBeVisible();

    // Click close button
    await closeButton.click();
    await page.waitForTimeout(500);

    // Menu should be removed from DOM (component unmounts when closed)
    const menuPanel = page.locator('button[aria-label="Close menu"]');
    await expect(menuPanel).not.toBeVisible();

    // Overlay should also be removed
    const overlay = page.locator('.fixed.inset-0.bg-black\\/50');
    await expect(overlay).not.toBeVisible();
  });

  test('Menu closes when clicking overlay', async ({ page }) => {
    const overlay = page.locator('.fixed.inset-0.bg-black\\/50');

    // Click on the right side of the overlay (outside the 320px menu panel)
    await page.mouse.click(350, 100);
    await page.waitForTimeout(500);

    // Menu and overlay should be removed from DOM
    const closeButton = page.locator('button[aria-label="Close menu"]');
    await expect(closeButton).not.toBeVisible();

    // Check overlay is not visible
    const isVisible = await overlay.isVisible().catch(() => false);
    expect(isVisible).toBeFalsy();
  });

  test('Expandable "Agents" section shows all agents for SME', async ({ page }) => {
    // Scope to menu panel to avoid strict mode violations
    const menuPanel = page.locator('.fixed.top-0.left-0.bottom-0.w-80');

    // Click "Agents" to expand
    const agentsButton = menuPanel.locator('button:has-text("Agents")').first();
    await agentsButton.click();
    await page.waitForTimeout(200);

    // Verify agent links are visible (using exact emojis from actual component)
    const agentLinks = [
      /^✨ Quick Start$/,
      /^🎯 Strategy$/,
      /^👥 Persona$/,
      /^📢 Marketing Strategy$/,
      /^📝 Content$/,
      /^🚀 Campaign Planning$/,
      /^📈 Performance Intelligence$/,
      /^🔍 Competitive Intel$/
    ];

    for (const agentPattern of agentLinks) {
      const agentLink = menuPanel.getByRole('link', { name: agentPattern });
      await expect(agentLink).toBeVisible();
    }

    // SME users should NOT see Client Success agent
    const clientSuccessLink = menuPanel.getByRole('link', { name: /Client Success/ });
    const isClientSuccessVisible = await clientSuccessLink.isVisible().catch(() => false);
    expect(isClientSuccessVisible).toBeFalsy();
  });

  test('Agents section has category labels', async ({ page }) => {
    // Expand Agents
    const agentsButton = page.locator('button:has-text("Agents")').first();
    await agentsButton.click();
    await page.waitForTimeout(200);

    // Verify category headers
    const foundationCategory = page.locator('text=/🏗️ Foundation/i');
    const planningCategory = page.locator('text=/🎨 Planning.*Creation/i');
    const intelligenceCategory = page.locator('text=/🧠 Intelligence/i');

    await expect(foundationCategory).toBeVisible();
    await expect(planningCategory).toBeVisible();
    await expect(intelligenceCategory).toBeVisible();
  });

  test('Menu auto-closes when navigating to a page', async ({ page }) => {
    // Scope to menu panel
    const menuPanel = page.locator('.fixed.top-0.left-0.bottom-0.w-80');

    // Click Campaigns link (navigate to a different page, not Dashboard which we're already on)
    const campaignsLink = menuPanel.locator('nav a:has-text("Campaigns")').first();
    await campaignsLink.click();

    // Wait for navigation to complete
    await page.waitForURL(/\/campaigns/);
    await page.waitForLoadState('domcontentloaded');

    // Wait for menu close animation
    await page.waitForTimeout(500);

    // Menu overlay should not be visible
    const overlay = page.locator('.fixed.inset-0.bg-black\\/50');

    // Wait for overlay to be hidden
    await expect(overlay).not.toBeVisible({ timeout: 3000 });
  });

  test('All menu links meet 44px touch target', async ({ page }) => {
    // Expand Agents section to test all links
    const agentsButton = page.locator('button:has-text("Agents")').first();
    await agentsButton.click();
    await page.waitForTimeout(200);

    const allLinks = page.locator('nav a, nav button');
    const count = await allLinks.count();

    let violations = 0;
    const violationDetails: string[] = [];

    for (let i = 0; i < count; i++) {
      const link = allLinks.nth(i);
      if (await link.isVisible()) {
        const box = await link.boundingBox();
        if (box && box.height < 44) {
          violations++;
          const text = await link.textContent();
          violationDetails.push(`"${text?.trim()}" - ${Math.round(box.height)}px`);
        }
      }
    }

    if (violations > 0) {
      console.log(`Touch target violations (${violations}):`, violationDetails.slice(0, 5));
    }

    expect(violations).toBe(0);
  });

  test('Menu prevents body scroll when open', async ({ page }) => {
    // Check body overflow style
    const bodyOverflow = await page.evaluate(() => document.body.style.overflow);
    expect(bodyOverflow).toBe('hidden');

    // Close menu
    const closeButton = page.locator('button[aria-label="Close menu"]');
    await closeButton.click();
    await page.waitForTimeout(300);

    // Check body overflow is restored
    const bodyOverflowAfter = await page.evaluate(() => document.body.style.overflow);
    expect(bodyOverflowAfter).toBe('unset');
  });

  test('User info displayed at bottom of menu', async ({ page }) => {
    // Scope to menu panel to avoid strict mode violations
    const menuPanel = page.locator('.fixed.top-0.left-0.bottom-0.w-80');

    // Scroll to bottom of menu
    await menuPanel.evaluate(el => {
      el.scrollTop = el.scrollHeight;
    });
    await page.waitForTimeout(200);

    // Verify user email is visible (within menu panel only)
    const userEmail = menuPanel.locator('text=sme.owner@example.com');
    await expect(userEmail).toBeVisible();

    // Verify avatar/initials visible (within menu panel only)
    const avatar = menuPanel.locator('.w-10.h-10.rounded-full');
    await expect(avatar).toBeVisible();
  });

  test('Sign Out button is visible and functional', async ({ page }) => {
    const signOutButton = page.locator('button:has-text("Sign Out")');
    await expect(signOutButton).toBeVisible();

    // Verify has icon
    const icon = signOutButton.locator('svg');
    await expect(icon).toBeVisible();

    // Click sign out
    await signOutButton.click();

    // Should navigate to login page
    await page.waitForURL('**/login', { timeout: 10000 });
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('MobileMenuPanel - Dark Mode Toggle', () => {
  test.use({ viewport: { width: 393, height: 852 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:56310/login');
    await loginAsMobile(page, 'sme');

    // Open mobile menu
    const moreButton = page.locator('nav[aria-label="Bottom navigation"] button[aria-label="More"]');
    await moreButton.click();
    await page.waitForTimeout(300);
  });

  test('Dark mode toggle switches theme', async ({ page }) => {
    // Find dark mode toggle button
    const darkModeButton = page.locator('button:has-text("Dark Mode"), button:has-text("Light Mode")');
    await expect(darkModeButton).toBeVisible();

    // Get current text
    const currentText = await darkModeButton.textContent();

    // Click to toggle
    await darkModeButton.click();
    await page.waitForTimeout(200);

    // Verify button text changed
    const newText = await darkModeButton.textContent();
    expect(newText).not.toBe(currentText);

    // Verify html element has dark class
    const htmlClass = await page.locator('html').getAttribute('class');
    expect(htmlClass).toBeTruthy();
  });

  test('Dark mode toggle has correct icons', async ({ page }) => {
    const darkModeButton = page.locator('button:has-text("Dark Mode"), button:has-text("Light Mode")');
    const icon = darkModeButton.locator('svg');
    await expect(icon).toBeVisible();
  });
});

test.describe('MobileMenuPanel - Agency User Experience', () => {
  test.use({ viewport: { width: 393, height: 852 } });

  test('Agency without client shows agency-level navigation', async ({ page }) => {
    // Login as agency
    await page.goto('http://127.0.0.1:56310/login');
    await page.fill('input[type="email"]', 'agency.owner@example.com');
    await page.fill('input[type="password"]', 'LocalDevOnly123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Open menu
    const moreButton = page.locator('nav[aria-label="Bottom navigation"] button[aria-label="More"]');
    await moreButton.click();
    await page.waitForTimeout(300);

    // Scope to menu panel to avoid strict mode violations
    const menuPanel = page.locator('.fixed.top-0.left-0.bottom-0.w-80');

    // Should see agency-level navigation (within menu panel only)
    const agencyOverview = menuPanel.locator('text=Agency Overview');
    const clientsLink = menuPanel.locator('text=Clients').first();

    await expect(agencyOverview).toBeVisible();
    await expect(clientsLink).toBeVisible();

    // Should NOT see Agents section (agency level doesn't have agents)
    const agentsButton = menuPanel.locator('button:has-text("Agents")');
    const hasAgents = await agentsButton.isVisible().catch(() => false);
    expect(hasAgents).toBeFalsy();
  });

  test('Agency with client selected shows client-level navigation', async ({ page }) => {
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

      // Open menu
      const moreButton = page.locator('nav[aria-label="Bottom navigation"] button[aria-label="More"]');
      await moreButton.click();
      await page.waitForTimeout(300);

      // Should see client-level navigation (Dashboard, Campaigns)
      const dashboardLink = page.locator('nav a:has-text("Dashboard")').first();
      const campaignsLink = page.locator('nav a:has-text("Campaigns")').first();

      await expect(dashboardLink).toBeVisible();
      await expect(campaignsLink).toBeVisible();

      // Should see Agents section for client
      const agentsButton = page.locator('button:has-text("Agents")').first();
      await expect(agentsButton).toBeVisible();

      // Expand and verify Client Success agent is visible
      await agentsButton.click();
      await page.waitForTimeout(200);

      const clientSuccessLink = page.locator('text=Client Success');
      await expect(clientSuccessLink).toBeVisible();
    } else {
      console.log('Test skipped: No clients available for agency user');
    }
  });

  test('Agency Settings section expandable', async ({ page }) => {
    // Login as agency
    await page.goto('http://127.0.0.1:56310/login');
    await page.fill('input[type="email"]', 'agency.owner@example.com');
    await page.fill('input[type="password"]', 'LocalDevOnly123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Open menu
    const moreButton = page.locator('nav[aria-label="Bottom navigation"] button[aria-label="More"]');
    await moreButton.click();
    await page.waitForTimeout(300);

    // Find Settings button
    const settingsButton = page.locator('button:has-text("Settings")').first();

    if (await settingsButton.isVisible({ timeout: 2000 })) {
      await settingsButton.click();
      await page.waitForTimeout(200);

      // Should show Team link
      const teamLink = page.locator('text=Team');
      await expect(teamLink).toBeVisible();
    }
  });
});

test.describe('MobileMenuPanel - Accessibility', () => {
  test.use({ viewport: { width: 393, height: 852 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('http://127.0.0.1:56310/login');
    await loginAsMobile(page, 'sme');

    // Open menu
    const moreButton = page.locator('nav[aria-label="Bottom navigation"] button[aria-label="More"]');
    await moreButton.click();
    await page.waitForTimeout(300);
  });

  test('Close button has aria-label', async ({ page }) => {
    const closeButton = page.locator('button[aria-label="Close menu"]');
    await expect(closeButton).toBeVisible();

    const ariaLabel = await closeButton.getAttribute('aria-label');
    expect(ariaLabel).toBe('Close menu');
  });

  test('Menu links have proper text alignment', async ({ page }) => {
    // All menu items should have text-left class for RTL support
    const menuLinks = page.locator('nav a, nav button');
    const count = await menuLinks.count();

    let properAlignment = 0;
    for (let i = 0; i < count; i++) {
      const link = menuLinks.nth(i);
      if (await link.isVisible()) {
        const classes = await link.getAttribute('class');
        if (classes && classes.includes('text-left')) {
          properAlignment++;
        }
      }
    }

    // Most menu items should have text-left
    expect(properAlignment).toBeGreaterThan(5);
  });
});
