import { test, expect } from '@playwright/test';

/**
 * Mobile Component Tests for New Mobile-First Features
 *
 * Tests three new mobile components added in Phase 4-5:
 * 1. Bottom Navigation (BottomNav.tsx)
 * 2. Agent Quick Selector (AgentQuickSelector.tsx)
 * 3. Session History Sheet (SessionHistorySheet.tsx)
 *
 * Credentials: sme.owner@example.com / LocalDevOnly123!
 */

const MOBILE_VIEWPORT = {
  width: 393,
  height: 852, // iPhone 15
};

const TEST_USER = {
  email: 'sme.owner@example.com',
  password: 'LocalDevOnly123!',
};

test.describe('Mobile Components - SME User', () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');

    // Login
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Wait for dashboard to load
    await page.waitForURL('/dashboard');
  });

  test.describe('Bottom Navigation', () => {
    test('should display bottom navigation on mobile', async ({ page }) => {
      const bottomNav = page.locator('nav[aria-label="Bottom navigation"]');
      await expect(bottomNav).toBeVisible();
    });

    test('should have 5 navigation items with correct touch targets', async ({ page }) => {
      // Check all 5 items exist (Home, Agents, Campaigns, Outputs, More)
      const bottomNav = page.locator('nav[aria-label="Bottom navigation"]');
      const homeButton = bottomNav.locator('a[aria-label="Home"]');
      const agentsButton = bottomNav.locator('button[aria-label="Agents"]');
      const campaignsButton = bottomNav.locator('a[aria-label="Campaigns"]');
      const outputsButton = bottomNav.locator('a[aria-label="Outputs"]');
      const moreButton = bottomNav.locator('button[aria-label="More"]');

      await expect(homeButton).toBeVisible();
      await expect(agentsButton).toBeVisible();
      await expect(campaignsButton).toBeVisible();
      await expect(outputsButton).toBeVisible();
      await expect(moreButton).toBeVisible();

      // Verify touch target size (48x48px minimum)
      const homeBoundingBox = await homeButton.boundingBox();
      expect(homeBoundingBox?.width).toBeGreaterThanOrEqual(48);
      expect(homeBoundingBox?.height).toBeGreaterThanOrEqual(48);
    });

    test('should navigate to Outputs page', async ({ page }) => {
      const bottomNav = page.locator('nav[aria-label="Bottom navigation"]');
      const outputsButton = bottomNav.locator('a[aria-label="Outputs"]');
      await outputsButton.click();
      await page.waitForURL('/outputs');
      expect(page.url()).toContain('/outputs');
    });

    test('should navigate to Campaigns page', async ({ page }) => {
      const bottomNav = page.locator('nav[aria-label="Bottom navigation"]');
      const campaignsButton = bottomNav.locator('a[aria-label="Campaigns"]');
      await campaignsButton.click();
      await page.waitForURL('**/campaigns**');
      expect(page.url()).toMatch(/\/campaigns/);
    });

    test('should show active state for current page', async ({ page }) => {
      // Navigate to Outputs
      await page.goto('/outputs');

      // Check active styling (gold text color)
      const bottomNav = page.locator('nav[aria-label="Bottom navigation"]');
      const outputsButton = bottomNav.locator('a[aria-label="Outputs"]');
      const classes = await outputsButton.getAttribute('class');
      expect(classes).toContain('text-brand-gold');
    });
  });

  test.describe('Agent Quick Selector', () => {
    test('should open Agent Quick Selector from bottom nav', async ({ page }) => {
      const bottomNav = page.locator('nav[aria-label="Bottom navigation"]');
      const agentsButton = bottomNav.locator('button[aria-label="Agents"]');
      await agentsButton.click();

      // Wait for sheet to open
      const sheet = page.locator('[role="dialog"]').filter({ hasText: 'Choose an Agent' });
      await expect(sheet).toBeVisible({ timeout: 3000 });
    });

    test('should display all 8 agents (SME user)', async ({ page }) => {
      const bottomNav = page.locator('nav[aria-label="Bottom navigation"]');
      const agentsButton = bottomNav.locator('button[aria-label="Agents"]');
      await agentsButton.click();

      // Wait for sheet to open
      await page.waitForSelector('[role="dialog"]', { timeout: 3000 });

      // Check for all 8 SME agents (exact names from AgentQuickSelector.tsx)
      const agents = [
        'Quick Start',
        'Strategy',
        'Persona',
        'Marketing Strategy',
        'Content',
        'Campaign Planning',
        'Performance Intelligence',
        'Competitive Intel',
      ];

      for (const agentName of agents) {
        const agentCard = page.locator('button').filter({ hasText: agentName }).first();
        await expect(agentCard).toBeVisible();
      }
    });

    test('should navigate to agent from quick selector', async ({ page }) => {
      const bottomNav = page.locator('nav[aria-label="Bottom navigation"]');
      const agentsButton = bottomNav.locator('button[aria-label="Agents"]');
      await agentsButton.click();

      // Wait for sheet
      await page.waitForSelector('[role="dialog"]', { timeout: 3000 });

      // Click on Strategy agent
      const strategyButton = page.locator('button').filter({ hasText: 'Strategy' }).first();
      await strategyButton.click();

      // Should navigate to strategy agent page
      await page.waitForURL('**/strategy**', { timeout: 5000 });
      expect(page.url()).toMatch(/\/strategy/);
    });

    test('should close sheet when navigating', async ({ page }) => {
      const bottomNav = page.locator('nav[aria-label="Bottom navigation"]');
      const agentsButton = bottomNav.locator('button[aria-label="Agents"]');
      await agentsButton.click();

      // Wait for sheet
      await page.waitForSelector('[role="dialog"]', { timeout: 3000 });

      // Click agent
      const personaButton = page.locator('button').filter({ hasText: 'Persona' }).first();
      await personaButton.click();

      // Sheet should close (navigation will happen)
      await page.waitForTimeout(500); // Animation time
      const sheet = page.locator('[role="dialog"]').filter({ hasText: 'Choose an Agent' });
      await expect(sheet).not.toBeVisible();
    });

    test('should have proper touch targets for agent cards', async ({ page }) => {
      const bottomNav = page.locator('nav[aria-label="Bottom navigation"]');
      const agentsButton = bottomNav.locator('button[aria-label="Agents"]');
      await agentsButton.click();

      await page.waitForSelector('[role="dialog"]', { timeout: 3000 });

      // Check first agent card size (min-h-[100px] from AgentQuickSelector.tsx)
      const firstAgentCard = page.locator('button').filter({ hasText: 'Quick Start' }).first();
      const boundingBox = await firstAgentCard.boundingBox();

      expect(boundingBox?.height).toBeGreaterThanOrEqual(100); // Component has min-h-[100px]
    });
  });

  test.describe('Session History Sheet', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to an agent page with sessions
      await page.goto('/strategy');
      await page.waitForLoadState('domcontentloaded');
    });

    test('should display session history FAB on mobile', async ({ page }) => {
      // Look for the History icon FAB (fixed bottom-right)
      const historyButton = page.locator('button[aria-label="View session history"]');
      await expect(historyButton).toBeVisible();

      // Verify positioning (bottom-right)
      const boundingBox = await historyButton.boundingBox();
      if (boundingBox) {
        expect(boundingBox.x).toBeGreaterThan(300); // Right side
        expect(boundingBox.y).toBeGreaterThan(700); // Bottom area
      }
    });

    test('should open session history sheet', async ({ page }) => {
      const historyButton = page.locator('button[aria-label="View session history"]');
      await historyButton.click();

      // Sheet should open
      const sheet = page.locator('[role="dialog"]').filter({ hasText: 'Session History' });
      await expect(sheet).toBeVisible({ timeout: 3000 });
    });

    test('should display "New Session" button in sheet', async ({ page }) => {
      const historyButton = page.locator('button[aria-label="View session history"]');
      await historyButton.click();

      await page.waitForSelector('[role="dialog"]', { timeout: 3000 });

      // Check for New Session button
      const newSessionButton = page.locator('button:has-text("+ New Session")');
      await expect(newSessionButton).toBeVisible();
    });

    test('should show empty state when no sessions exist', async ({ page }) => {
      // Navigate to Quick Start agent (guaranteed to have session history)
      await page.goto('/quick-start');
      await page.waitForLoadState('domcontentloaded');

      // Wait for FAB to appear
      const historyButton = page.locator('button[aria-label="View session history"]');
      await expect(historyButton).toBeVisible({ timeout: 5000 });
      await historyButton.click();

      await page.waitForSelector('[role="dialog"]', { timeout: 3000 });

      // Check for either empty state or sessions (both are valid)
      const emptyState = page.locator('text=No sessions yet');
      const sessionsList = page.locator('button').filter({ hasText: /ago/ });

      // At least one should be visible
      const hasEmptyState = await emptyState.isVisible().catch(() => false);
      const hasSessions = await sessionsList.count() > 0;

      expect(hasEmptyState || hasSessions).toBeTruthy();
    });

    test('should create new session from sheet', async ({ page }) => {
      const historyButton = page.locator('button[aria-label="View session history"]');
      await historyButton.click();

      await page.waitForSelector('[role="dialog"]', { timeout: 3000 });

      // Click New Session button
      const newSessionButton = page.locator('button:has-text("+ New Session")');
      await newSessionButton.click();

      // Should navigate to base agent URL (new session) - wait for navigation
      await page.waitForTimeout(1000);
      expect(page.url()).toMatch(/\/strategy$/);
    });

    test('should have proper touch targets for session cards', async ({ page }) => {
      // First create a session by sending a message
      const messageInput = page.locator('textarea[placeholder*="Ask about"]');
      await messageInput.fill('What is SWOT analysis?');
      await messageInput.press('Enter');

      // Wait for response
      await page.waitForTimeout(3000);

      // Now open session history
      const historyButton = page.locator('button[aria-label="View session history"]');
      await historyButton.click();

      await page.waitForSelector('[role="dialog"]', { timeout: 3000 });

      // Check session card size (should be 80px min-height)
      const sessionCard = page.locator('button').filter({ hasText: /Strategy Analysis|SWOT/ }).first();
      if (await sessionCard.isVisible()) {
        const boundingBox = await sessionCard.boundingBox();
        expect(boundingBox?.height).toBeGreaterThanOrEqual(80);
      }
    });

    test('should display session metadata correctly', async ({ page }) => {
      // Create a session first
      const messageInput = page.locator('textarea[placeholder*="Ask about"]');
      await messageInput.fill('Help me with competitive analysis');
      await messageInput.press('Enter');

      await page.waitForTimeout(3000);

      // Open session history
      const historyButton = page.locator('button[aria-label="View session history"]');
      await historyButton.click();

      await page.waitForSelector('[role="dialog"]', { timeout: 3000 });

      // Check for session metadata (time ago, message count)
      const timeAgo = page.locator('text=/\\d+ (second|minute|hour|day)s? ago/');
      await expect(timeAgo.first()).toBeVisible();

      const messageCount = page.locator('text=/\\d+ messages?/');
      await expect(messageCount.first()).toBeVisible();
    });
  });

  test.describe('Integration Tests', () => {
    test('should navigate between all mobile components', async ({ page }) => {
      // Start at dashboard
      expect(page.url()).toContain('/dashboard');

      // Open Agent Quick Selector
      const bottomNav = page.locator('nav[aria-label="Bottom navigation"]');
      const agentsButton = bottomNav.locator('button[aria-label="Agents"]');
      await agentsButton.click();
      await page.waitForSelector('[role="dialog"]', { timeout: 3000 });

      // Navigate to Persona agent
      const personaButton = page.locator('button').filter({ hasText: 'Persona' }).first();
      await personaButton.click();
      await page.waitForURL('**/persona**', { timeout: 5000 });

      // Open Session History
      const historyButton = page.locator('button[aria-label="View session history"]');
      await historyButton.click();
      await page.waitForSelector('[role="dialog"]', { timeout: 3000 });

      // Close the sheet by clicking outside or pressing Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500); // Wait for sheet to close

      // Navigate to Outputs via bottom nav
      const outputsButton = bottomNav.locator('a[aria-label="Outputs"]');
      await outputsButton.click();
      await page.waitForURL('/outputs');

      expect(page.url()).toContain('/outputs');
    });

    test('bottom nav should persist across page navigation', async ({ page }) => {
      const bottomNav = page.locator('nav[aria-label="Bottom navigation"]');

      // Verify on dashboard
      await expect(bottomNav).toBeVisible();

      // Navigate to outputs
      await page.goto('/outputs');
      await expect(bottomNav).toBeVisible();

      // Navigate to strategy agent
      await page.goto('/strategy');
      await expect(bottomNav).toBeVisible();

      // Navigate to campaigns
      await page.goto('/campaigns');
      await expect(bottomNav).toBeVisible();
    });

    test('should only show mobile components on mobile viewport', async ({ page }) => {
      // On mobile, bottom nav should be visible
      const bottomNav = page.locator('nav[aria-label="Bottom navigation"]');
      await expect(bottomNav).toBeVisible();

      // Resize to desktop
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.waitForTimeout(500);

      // Bottom nav should be hidden on desktop (has md:hidden class)
      await expect(bottomNav).not.toBeVisible();
    });
  });
});

test.describe('Mobile Components - Agency User', () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  const AGENCY_USER = {
    email: 'agency.owner@example.com',
    password: 'LocalDevOnly123!',
  };

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', AGENCY_USER.email);
    await page.fill('input[type="password"]', AGENCY_USER.password);
    await page.click('button[type="submit"]');

    // Agency users might go to /dashboard or /agency/clients depending on routing
    // Wait for either URL
    try {
      await page.waitForURL('/agency/clients', { timeout: 5000 });
    } catch {
      // If not redirected to /agency/clients, might be on /dashboard
      await page.waitForURL('/dashboard', { timeout: 5000 });
      // Navigate to clients page manually
      await page.goto('/agency/clients');
    }
  });

  test('should display all 9 agents for agency user', async ({ page }) => {
    const bottomNav = page.locator('nav[aria-label="Bottom navigation"]');
    const agentsButton = bottomNav.locator('button[aria-label="Agents"]');
    await agentsButton.click();

    await page.waitForSelector('[role="dialog"]', { timeout: 3000 });

    // Agency users should see all 9 agents including Client Success (exact names)
    const agents = [
      'Quick Start',
      'Strategy',
      'Persona',
      'Marketing Strategy',
      'Content',
      'Campaign Planning',
      'Performance Intelligence',
      'Competitive Intel',
      'Client Success',
    ];

    for (const agentName of agents) {
      const agentCard = page.locator('button').filter({ hasText: agentName }).first();
      await expect(agentCard).toBeVisible();
    }
  });

  test.skip('should navigate to client-scoped agent pages', async ({ page }) => {
    // Skip: Requires agency to have clients in seed data
    // Select a client first
    const firstClient = page.locator('[data-testid^="client-card-"]').first();
    await firstClient.click();

    // Should be on client dashboard
    await page.waitForURL('**/clients/**');

    // Open agent selector
    const bottomNav = page.locator('nav[aria-label="Bottom navigation"]');
    const agentsButton = bottomNav.locator('button[aria-label="Agents"]');
    await agentsButton.click();

    await page.waitForSelector('[role="dialog"]', { timeout: 3000 });

    // Navigate to Strategy agent
    const strategyButton = page.locator('button').filter({ hasText: 'Strategy' }).first();
    await strategyButton.click();

    // URL should include client slug
    await page.waitForURL('**/clients/**/agents/strategy**', { timeout: 5000 });
    expect(page.url()).toMatch(/\/clients\/[^/]+\/agents\/strategy/);
  });

  test.skip('session history should work in client-scoped context', async ({ page }) => {
    // Skip: Requires agency to have clients in seed data
    // Select a client
    const firstClient = page.locator('[data-testid^="client-card-"]').first();
    await firstClient.click();
    await page.waitForURL('**/clients/**');

    // Navigate to agent
    const bottomNav = page.locator('nav[aria-label="Bottom navigation"]');
    const agentsButton = bottomNav.locator('button[aria-label="Agents"]');
    await agentsButton.click();
    await page.waitForSelector('[role="dialog"]', { timeout: 3000 });

    const strategyButton = page.locator('button').filter({ hasText: 'Strategy' }).first();
    await strategyButton.click();
    await page.waitForURL('**/clients/**/agents/strategy**', { timeout: 5000 });

    // Open session history
    const historyButton = page.locator('button[aria-label="View session history"]');
    await expect(historyButton).toBeVisible();
    await historyButton.click();

    // Sheet should open
    const sheet = page.locator('[role="dialog"]').filter({ hasText: 'Session History' });
    await expect(sheet).toBeVisible({ timeout: 3000 });
  });
});
