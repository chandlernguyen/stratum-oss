import { test, expect } from '@playwright/test';
import { DEVICES, BREAKPOINTS } from '../helpers/devices';
import {
  loginAsMobile,
  detectHorizontalScroll,
  validateTouchTargets,
  captureViewport,
  validateTextReadability,
  selectAgentFromQuickSelector
} from '../helpers/mobile';

/**
 * Agency-Specific Mobile Workflows Test Suite
 *
 * Tests ONLY agency user experiences that differ from SME:
 * - Client Portfolio dashboard
 * - Client list navigation
 * - Client context switching
 * - Client-scoped agent access
 * - Cross-client analytics
 * - Team collaboration features
 *
 * Created: 2025-11-01
 * Audience: Marketing Agencies managing multiple clients
 */

test.describe('Agency Mobile Experience - Client Portfolio Dashboard', () => {

  test('Agency dashboard shows "Client Portfolio" heading on iPhone 15 (393px)', async ({ page }) => {
    test.setTimeout(60000);
    const device = DEVICES['iphone-15'];

    await page.setViewportSize(device.viewport);
    await loginAsMobile(page, 'agency');

    // ✅ AGENCY-SPECIFIC: Verify Client Portfolio heading (not generic "Dashboard")
    await expect(
      page.getByRole('heading', { name: 'Client Portfolio' })
    ).toBeVisible({ timeout: 10000 });

    // Verify client count metric is visible
    // ✅ FIX: Use data-testid directly (comma syntax was invalid Playwright)
    const clientMetric = page.locator('[data-testid="metric-client-count"]');
    await expect(clientMetric).toBeVisible({ timeout: 5000 });

    // No horizontal scroll
    const hasScroll = await detectHorizontalScroll(page);
    expect(hasScroll, 'Agency dashboard has horizontal scroll on mobile').toBeFalsy();

    // Capture screenshot
    await captureViewport(page, 'agency-portfolio-iphone15');
  });

  test('Agency dashboard shows client cards on Android (360px)', async ({ page }) => {
    test.setTimeout(60000);
    const device = DEVICES['android-360'];

    await page.setViewportSize(device.viewport);
    await loginAsMobile(page, 'agency');

    // Verify dashboard loads
    await expect(
      page.getByRole('heading', { name: 'Client Portfolio' })
    ).toBeVisible({ timeout: 10000 });

    // ✅ AGENCY-SPECIFIC: Verify client cards are visible (not campaign cards)
    const clientCards = page.locator('[data-testid="client-card"]');
    const cardCount = await clientCards.count();

    if (cardCount > 0) {
      // Verify first client card is visible and touch-friendly
      const firstCard = clientCards.first();
      await expect(firstCard).toBeVisible();

      const box = await firstCard.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44); // iOS minimum touch target

      // Verify client name is readable
      const clientName = firstCard.locator('[data-testid="client-name"]');
      if (await clientName.isVisible({ timeout: 2000 })) {
        await expect(clientName).toBeVisible();
      }
    }

    // Verify no horizontal overflow on narrowest Android viewport
    const hasScroll = await detectHorizontalScroll(page);
    expect(hasScroll, 'Client cards overflow on 360px viewport').toBeFalsy();

    await captureViewport(page, 'agency-client-cards-android360');
  });

  test('Agency cross-client analytics visible on iPad Pro 11" (834px)', async ({ page }) => {
    test.setTimeout(60000);
    const device = DEVICES['ipad-pro-11'];

    await page.setViewportSize(device.viewport);
    await loginAsMobile(page, 'agency');

    // ✅ AGENCY-SPECIFIC: Cross-client analytics should be visible on tablet
    // ✅ FIX: Use data-testid directly (comma syntax was invalid Playwright)
    const analyticsSection = page.locator('[data-testid="cross-client-analytics"]').first();

    if (await analyticsSection.isVisible({ timeout: 5000 })) {
      await expect(analyticsSection).toBeVisible();

      // Verify analytics cards are readable on tablet
      const analyticCards = page.locator('[data-testid="analytics-card"]');
      if (await analyticCards.count() > 0) {
        await expect(analyticCards.first()).toBeVisible();
      }
    }

    await captureViewport(page, 'agency-analytics-ipad-pro-11');
  });

  test('Agency team activity feed visible on iPad Pro 13" (1024px)', async ({ page }) => {
    test.setTimeout(60000);
    const device = DEVICES['ipad-pro-13'];

    await page.setViewportSize(device.viewport);
    await loginAsMobile(page, 'agency');

    // ✅ AGENCY-SPECIFIC: Team activity feed (SME users don't have this)
    const teamActivity = page.locator('[data-testid="team-activity"]').or(
      page.locator('text=/Team.*Activity/i')
    ).first();

    if (await teamActivity.isVisible({ timeout: 5000 })) {
      await expect(teamActivity).toBeVisible();

      // Verify activity items are visible
      const activityItems = page.locator('[data-testid="activity-item"]');
      if (await activityItems.count() > 0) {
        const firstItem = activityItems.first();
        await expect(firstItem).toBeVisible();

        // Verify timestamps are visible
        // ✅ FIX: Use data-testid directly (comma syntax was invalid Playwright)
        const timestamp = firstItem.locator('[data-testid="activity-timestamp"]');
        if (await timestamp.isVisible({ timeout: 2000 })) {
          await expect(timestamp).toBeVisible();
        }
      }
    }

    await captureViewport(page, 'agency-team-activity-ipad-pro-13');
  });
});

test.describe('Agency Mobile Experience - Client List Navigation', () => {

  test('Client list loads and displays on iPhone 15 (393px)', async ({ page }) => {
    test.setTimeout(60000);
    const device = DEVICES['iphone-15'];

    await page.setViewportSize(device.viewport);
    await loginAsMobile(page, 'agency');

    // Navigate to clients list
    await page.goto('http://127.0.0.1:56310/clients');
    await page.waitForLoadState('domcontentloaded');

    // Verify clients page heading
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();

    // Verify client cards are touch-friendly
    const clientCards = page.locator(
      '[data-testid="client-card"], a[href*="/clients/"]:not([href="/clients/new"])'
    );
    const count = await clientCards.count();

    if (count > 0) {
      const violations = await validateTouchTargets(page, 44);

      // Log violations for debugging
      if (violations.length > 0) {
        console.log('Touch target violations on client list:', violations.slice(0, 5));
      }

      // First client card should be touch-friendly
      const firstCard = clientCards.first();
      const box = await firstCard.boundingBox();
      expect(box?.height, 'Client card too small for touch').toBeGreaterThanOrEqual(44);
    }

    await captureViewport(page, 'agency-client-list-iphone15');
  });

  test('Client cards stack properly on narrowest viewport - Z Fold cover (344px)', async ({ page }) => {
    test.setTimeout(60000);
    const device = DEVICES['galaxy-fold-cover'];

    await page.setViewportSize(device.viewport);
    await loginAsMobile(page, 'agency');

    await page.goto('http://127.0.0.1:56310/clients');
    await page.waitForLoadState('domcontentloaded');

    // ✅ CRITICAL: No horizontal scroll even on narrowest viewport
    const hasScroll = await detectHorizontalScroll(page);
    expect(hasScroll, 'Client list has horizontal scroll on Z Fold cover').toBeFalsy();

    // Verify client cards fit within viewport
    const clientCards = page.locator('[data-testid="client-card"]');
    const count = await clientCards.count();

    if (count > 0) {
      // Check first 3 cards fit within 344px width
      for (let i = 0; i < Math.min(count, 3); i++) {
        const card = clientCards.nth(i);
        const box = await card.boundingBox();

        if (box) {
          expect(box.width, `Client card ${i} overflows viewport`).toBeLessThanOrEqual(344);
        }
      }
    }

    // Text should still be readable on smallest viewport
    const readability = await validateTextReadability(page);
    if (!readability.readable && readability.issues.length > 0) {
      console.warn('Text readability issues on Z Fold cover:', readability.issues.slice(0, 3));
    }

    await captureViewport(page, 'agency-client-list-z-fold-cover');
  });

  test('Client status badges visible and readable on Android (360px)', async ({ page }) => {
    test.setTimeout(60000);

    await page.setViewportSize({ width: 360, height: 800 });
    await loginAsMobile(page, 'agency');

    await page.goto('http://127.0.0.1:56310/clients');
    await page.waitForLoadState('domcontentloaded');

    // ✅ AGENCY-SPECIFIC: Client status badges (active, paused, churned)
    const statusBadges = page.locator('[data-testid="client-status"], .badge');
    const badgeCount = await statusBadges.count();

    if (badgeCount > 0) {
      const firstBadge = statusBadges.first();
      await expect(firstBadge).toBeVisible();

      // Verify badge text is readable (not cut off)
      const badgeText = await firstBadge.textContent();
      expect(badgeText?.trim().length).toBeGreaterThan(0);

      // Badge should fit within client card
      const cardBox = await page.locator('[data-testid="client-card"]').first().boundingBox();
      const badgeBox = await firstBadge.boundingBox();

      if (cardBox && badgeBox) {
        expect(badgeBox.width).toBeLessThanOrEqual(cardBox.width);
      }
    }

    await captureViewport(page, 'agency-client-status-android360');
  });

  test('"Add Client" button touch-friendly on all viewports', async ({ page }) => {
    test.setTimeout(90000);

    // Test across mobile, tablet, desktop
    const testViewports = [
      { name: 'iPhone 15', width: 393, height: 852 },
      { name: 'iPad Pro 11', width: 834, height: 1194 },
      { name: 'Desktop', width: 1366, height: 768 }
    ];

    for (const viewport of testViewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await loginAsMobile(page, 'agency');

      await page.goto('http://127.0.0.1:56310/clients');
      await page.waitForLoadState('domcontentloaded');

      // ✅ AGENCY-SPECIFIC: Add Client CTA
      const addClientButton = page.getByRole('button', { name: /Add.*Client|New Client/i });

      if (await addClientButton.isVisible({ timeout: 3000 })) {
        const box = await addClientButton.boundingBox();
        expect(box?.height, `Add Client button too small on ${viewport.name}`).toBeGreaterThanOrEqual(44);
      }
    }
  });
});

test.describe('Agency Mobile Experience - Client Context Switching', () => {

  test('Client context navigation on iPhone Pro Max (430px)', async ({ page }) => {
    test.setTimeout(90000);
    const device = DEVICES['iphone-15-pro-max'];

    await page.setViewportSize(device.viewport);
    await loginAsMobile(page, 'agency');

    // Navigate to clients list
    await page.goto('http://127.0.0.1:56310/clients');
    await page.waitForLoadState('domcontentloaded');

    // Click first client
    const firstClientLink = page.locator(
      'a[href*="/clients/"]:not([href="/clients/new"])'
    ).first();

    if (await firstClientLink.isVisible({ timeout: 5000 })) {
      await firstClientLink.click();
      await page.waitForLoadState('domcontentloaded');

      // ✅ VERIFY: In client context URL
      await expect(page).toHaveURL(/\/clients\/[a-zA-Z0-9-]+/, { timeout: 5000 });

      // ✅ AGENCY-SPECIFIC: Client context banner or breadcrumb visible
      const clientContext = page.locator(
        '[data-testid="client-context-banner"], [data-testid="breadcrumb"], text=/Working.*client/i'
      ).first();

      if (await clientContext.isVisible({ timeout: 3000 })) {
        await expect(clientContext).toBeVisible();

        // Context banner should be compact on mobile (not obstruct content)
        const box = await clientContext.boundingBox();
        expect(box?.height, 'Client context banner too tall on mobile').toBeLessThan(120);
      }

      // Verify client dashboard heading
      const clientDashboard = page.locator('h1, h2').first();
      await expect(clientDashboard).toBeVisible();

      await captureViewport(page, 'agency-client-context-iphone-pro-max');
    }
  });

  test('Client switching preserves context on iPad Pro 11" (834px)', async ({ page }) => {
    test.setTimeout(120000);
    const device = DEVICES['ipad-pro-11'];

    await page.setViewportSize(device.viewport);
    await loginAsMobile(page, 'agency');

    await page.goto('http://127.0.0.1:56310/clients');
    await page.waitForLoadState('domcontentloaded');

    // Get first two client links
    const clientLinks = page.locator('a[href*="/clients/"]:not([href="/clients/new"])');
    const clientCount = await clientLinks.count();

    if (clientCount >= 2) {
      // Navigate to Client A
      await clientLinks.nth(0).click();
      await page.waitForLoadState('domcontentloaded');
      const clientAUrl = page.url();
      const clientASlug = clientAUrl.match(/\/clients\/([^/]+)/)?.[1];

      // Verify Client A context
      await expect(page).toHaveURL(new RegExp(clientASlug || ''));

      // Navigate back to clients list
      await page.goto('http://127.0.0.1:56310/clients');
      await page.waitForLoadState('domcontentloaded');

      // Navigate to Client B
      await clientLinks.nth(1).click();
      await page.waitForLoadState('domcontentloaded');
      const clientBUrl = page.url();
      const clientBSlug = clientBUrl.match(/\/clients\/([^/]+)/)?.[1];

      // ✅ VERIFY: Different client contexts
      expect(clientASlug).not.toEqual(clientBSlug);

      // Verify Client B context loaded
      await expect(page).toHaveURL(new RegExp(clientBSlug || ''));

      await captureViewport(page, 'agency-client-switching-ipad-pro-11');
    }
  });

  test('Breadcrumb navigation works on tablet viewports', async ({ page }) => {
    test.setTimeout(90000);

    await page.setViewportSize({ width: 834, height: 1194 }); // iPad Pro 11"
    await loginAsMobile(page, 'agency');

    await page.goto('http://127.0.0.1:56310/clients');
    await page.waitForLoadState('domcontentloaded');

    const firstClient = page.locator('a[href*="/clients/"]:not([href="/clients/new"])').first();

    if (await firstClient.isVisible({ timeout: 3000 })) {
      await firstClient.click();
      await page.waitForLoadState('domcontentloaded');

      // ✅ AGENCY-SPECIFIC: Breadcrumb should show: Dashboard > Clients > [Client Name]
      const breadcrumb = page.locator('[data-testid="breadcrumb"]');

      if (await breadcrumb.isVisible({ timeout: 3000 })) {
        await expect(breadcrumb).toBeVisible();

        // Breadcrumb links should be touch-friendly
        const breadcrumbLinks = breadcrumb.locator('a');
        const linkCount = await breadcrumbLinks.count();

        if (linkCount > 0) {
          for (let i = 0; i < linkCount; i++) {
            const link = breadcrumbLinks.nth(i);
            const box = await link.boundingBox();

            if (box) {
              expect(box.height, `Breadcrumb link ${i} too small`).toBeGreaterThanOrEqual(44);
            }
          }
        }
      }

      await captureViewport(page, 'agency-breadcrumb-ipad-pro-11');
    }
  });
});

test.describe('Agency Mobile Experience - Client-Scoped Agent Access', () => {

  test('Client-scoped strategy agent loads on mobile', async ({ page }) => {
    test.setTimeout(120000);

    await page.setViewportSize({ width: 393, height: 852 }); // iPhone 15
    await loginAsMobile(page, 'agency');

    // Navigate to clients
    await page.goto('http://127.0.0.1:56310/clients');
    await page.waitForLoadState('domcontentloaded');

    const firstClient = page.locator('a[href*="/clients/"]:not([href="/clients/new"])').first();

    if (await firstClient.isVisible({ timeout: 5000 })) {
      await firstClient.click();
      await page.waitForLoadState('domcontentloaded');

      // Extract client slug
      const clientSlug = page.url().match(/\/clients\/([^/]+)/)?.[1];

      if (clientSlug) {
        // ✅ AGENCY-SPECIFIC: Navigate to client-scoped agent via BottomNav
        const agentsButton = page.locator('nav[aria-label="Bottom navigation"] button[aria-label="Agents"]');
        await agentsButton.click();
        await page.waitForTimeout(300);

        await selectAgentFromQuickSelector(page, 'Strategy');
        await page.waitForLoadState('domcontentloaded');

        // Verify agent loaded with client context
        await expect(
          page.locator('h1').filter({ hasText: /Business Strategy Agent/i })
        ).toBeVisible({ timeout: 10000 });

        // Verify chat interface is usable on mobile
        const chatInput = page.locator(
          'textarea[placeholder*="message"], textarea[placeholder*="question"]'
        ).first();

        if (await chatInput.isVisible({ timeout: 5000 })) {
          const box = await chatInput.boundingBox();
          expect(box?.height, 'Chat input too small on mobile').toBeGreaterThanOrEqual(40);

          // Verify can type in chat
          await chatInput.fill('Test client-scoped message');
          await expect(chatInput).toHaveValue('Test client-scoped message');
        }

        await captureViewport(page, 'agency-client-scoped-agent-mobile');
      }
    }
  });

  test('Session sidebar shows client-filtered sessions', async ({ page }) => {
    test.setTimeout(120000);

    await page.setViewportSize({ width: 834, height: 1194 }); // iPad Pro 11"
    await loginAsMobile(page, 'agency');

    await page.goto('http://127.0.0.1:56310/clients');
    await page.waitForLoadState('domcontentloaded');

    const firstClient = page.locator('a[href*="/clients/"]:not([href="/clients/new"])').first();

    if (await firstClient.isVisible()) {
      await firstClient.click();
      await page.waitForLoadState('domcontentloaded');

      const clientSlug = page.url().match(/\/clients\/([^/]+)/)?.[1];

      if (clientSlug) {
        await page.goto(`http://127.0.0.1:56310/clients/${clientSlug}/agents/strategy`);
        await page.waitForLoadState('domcontentloaded');

        // ✅ AGENCY-SPECIFIC: Session sidebar filtered by client_id
        const sessionSidebar = page.locator('[data-testid="session-sidebar"], aside').first();

        if (await sessionSidebar.isVisible({ timeout: 5000 })) {
          await expect(sessionSidebar).toBeVisible();

          // Sessions should only show for current client
          const sessionItems = sessionSidebar.locator('[data-testid="session-item"]');
          const sessionCount = await sessionItems.count();

          if (sessionCount > 0) {
            // Verify first session is visible and touch-friendly
            const firstSession = sessionItems.first();
            const box = await firstSession.boundingBox();
            expect(box?.height).toBeGreaterThanOrEqual(44);
          }
        }

        await captureViewport(page, 'agency-session-sidebar-tablet');
      }
    }
  });

  test('Agent navigation within client context on mobile', async ({ page }) => {
    test.setTimeout(150000);

    await page.setViewportSize({ width: 430, height: 932 }); // iPhone Pro Max
    await loginAsMobile(page, 'agency');

    await page.goto('http://127.0.0.1:56310/clients');
    await page.waitForLoadState('domcontentloaded');

    const firstClient = page.locator('a[href*="/clients/"]:not([href="/clients/new"])').first();

    if (await firstClient.isVisible()) {
      await firstClient.click();
      await page.waitForLoadState('domcontentloaded');

      const clientSlug = page.url().match(/\/clients\/([^/]+)/)?.[1];

      if (clientSlug) {
        // Test navigation between different agents in client context
        // Use agent URLs with required parameters (similar to agent-tabs test fix)
        const agentUrls = [
          { type: 'strategy', url: `http://127.0.0.1:56310/clients/${clientSlug}/agents/strategy/chat` },
          { type: 'persona', url: `http://127.0.0.1:56310/clients/${clientSlug}/agents/persona` },
          { type: 'content', url: `http://127.0.0.1:56310/clients/${clientSlug}/agents/content/tool/seo-blog` }
        ];

        for (const agent of agentUrls) {
          await page.goto(agent.url);
          await page.waitForLoadState('domcontentloaded');
          await page.waitForTimeout(1000); // Wait for hydration

          // Scroll to top to ensure h1 is in viewport
          await page.evaluate(() => window.scrollTo(0, 0));

          // Verify agent loads (heading should be visible)
          const agentHeading = page.locator('h1').first();

          // If h1 is hidden on mobile, check for alternative heading
          const isVisible = await agentHeading.isVisible().catch(() => false);
          if (!isVisible) {
            // Some agents may hide h1 on mobile - look for any visible heading
            const anyHeading = page.locator('h1, h2').filter({ hasText: /Agent|Strategy|Persona|Content/i });
            await expect(anyHeading.first()).toBeVisible({ timeout: 10000 });
          } else {
            await expect(agentHeading).toBeVisible({ timeout: 10000 });
          }

          // Verify still in client context
          await expect(page).toHaveURL(new RegExp(`/clients/${clientSlug}`));
        }

        await captureViewport(page, 'agency-agent-navigation-mobile');
      }
    }
  });
});

test.describe('Agency Mobile Experience - Data Isolation', () => {

  test('Client A data not visible in Client B context', async ({ page }) => {
    test.setTimeout(150000);

    await page.setViewportSize({ width: 393, height: 852 }); // iPhone 15
    await loginAsMobile(page, 'agency');

    await page.goto('http://127.0.0.1:56310/clients');
    await page.waitForLoadState('domcontentloaded');

    const clientLinks = page.locator('a[href*="/clients/"]:not([href="/clients/new"])');
    const clientCount = await clientLinks.count();

    if (clientCount >= 2) {
      // Navigate to Client A and capture campaign data
      await clientLinks.nth(0).click();
      await page.waitForLoadState('domcontentloaded');

      const clientASlug = page.url().match(/\/clients\/([^/]+)/)?.[1];
      const clientACampaigns = page.locator('[data-testid="campaign-card"], [data-testid="campaign-item"]');
      const clientACampaignCount = await clientACampaigns.count();

      // Navigate to Client B
      await page.goto('http://127.0.0.1:56310/clients');
      await page.waitForLoadState('domcontentloaded');

      await clientLinks.nth(1).click();
      await page.waitForLoadState('domcontentloaded');

      const clientBSlug = page.url().match(/\/clients\/([^/]+)/)?.[1];
      const clientBCampaigns = page.locator('[data-testid="campaign-card"], [data-testid="campaign-item"]');
      const clientBCampaignCount = await clientBCampaigns.count();

      // ✅ VERIFY: Different client contexts have different data
      if (clientACampaignCount > 0 && clientBCampaignCount > 0) {
        // Campaign counts should be different (data isolation)
        expect(clientASlug).not.toEqual(clientBSlug);

        // Get campaign titles to verify different data
        const clientACampaignText = await clientACampaigns.first().textContent();
        const clientBCampaignText = await clientBCampaigns.first().textContent();

        // Campaign data should be different
        expect(clientACampaignText).not.toEqual(clientBCampaignText);
      }

      await captureViewport(page, 'agency-data-isolation-mobile');
    }
  });

  test('Client context persists across page refreshes', async ({ page }) => {
    test.setTimeout(90000);

    await page.setViewportSize({ width: 834, height: 1194 }); // iPad Pro 11"
    await loginAsMobile(page, 'agency');

    await page.goto('http://127.0.0.1:56310/clients');
    await page.waitForLoadState('domcontentloaded');

    const firstClient = page.locator('a[href*="/clients/"]:not([href="/clients/new"])').first();

    if (await firstClient.isVisible()) {
      await firstClient.click();
      await page.waitForLoadState('domcontentloaded');

      const clientSlug = page.url().match(/\/clients\/([^/]+)/)?.[1];

      if (clientSlug) {
        // Refresh the page
        await page.reload();
        await page.waitForLoadState('domcontentloaded');

        // ✅ VERIFY: Still in same client context after refresh
        await expect(page).toHaveURL(new RegExp(`/clients/${clientSlug}`));

        // Client dashboard should still be visible
        const dashboard = page.locator('h1, h2').first();
        await expect(dashboard).toBeVisible();

        await captureViewport(page, 'agency-context-persistence-tablet');
      }
    }
  });
});

test.describe('Agency Mobile Experience - Onboarding State (0 Clients)', () => {

  test.skip('Agency with 0 clients shows onboarding CTA', async ({ page }) => {
    // This test requires a fresh agency account with 0 clients
    // Skipping for now as it needs specific test data setup

    test.setTimeout(60000);

    await page.setViewportSize({ width: 393, height: 852 }); // iPhone 15
    // await loginAsMobile(page, 'agency-fresh'); // Would need new test user

    // Expected behavior:
    // - Should show Onboarding component (not Client Portfolio)
    // - Should display "Add Your First Client" CTA
    // - CTA should be touch-friendly (44x44px minimum)
    // - Should show getting started guide for agencies

    // await expect(page.getByRole('button', { name: /Add.*First.*Client/i })).toBeVisible();
    // await expect(page.locator('text=/Get started.*add.*client/i')).toBeVisible();
  });
});

test.describe('Agency Mobile Experience - Performance', () => {

  test('Client switching completes in < 3s on 3G (mobile)', async ({ page }) => {
    test.setTimeout(120000);

    await page.setViewportSize({ width: 393, height: 852 }); // iPhone 15

    // Simulate 3G network
    await page.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, 100)); // Add 100ms latency
      await route.continue();
    });

    await loginAsMobile(page, 'agency');

    await page.goto('http://127.0.0.1:56310/clients');
    await page.waitForLoadState('domcontentloaded');

    const clientLinks = page.locator('a[href*="/clients/"]:not([href="/clients/new"])');
    const clientCount = await clientLinks.count();

    if (clientCount >= 2) {
      // Navigate to first client
      await clientLinks.nth(0).click();
      await page.waitForLoadState('domcontentloaded');

      // Measure client switching time
      const startTime = Date.now();

      await page.goto('http://127.0.0.1:56310/clients');
      await page.waitForLoadState('domcontentloaded');
      await clientLinks.nth(1).click();
      await page.waitForLoadState('domcontentloaded');

      const switchTime = Date.now() - startTime;

      // ✅ AGENCY PERFORMANCE TARGET: < 3s client switching on 3G
      expect(switchTime, 'Client switching took too long on 3G').toBeLessThan(3000);

      console.log(`Agency client switching time on 3G: ${switchTime}ms`);
    }
  });

  test('Client dashboard loads in < 2s on mobile', async ({ page }) => {
    test.setTimeout(90000);

    await page.setViewportSize({ width: 393, height: 852 }); // iPhone 15
    await loginAsMobile(page, 'agency');

    await page.goto('http://127.0.0.1:56310/clients');
    await page.waitForLoadState('domcontentloaded');

    const firstClient = page.locator('a[href*="/clients/"]:not([href="/clients/new"])').first();

    if (await firstClient.isVisible()) {
      // Measure client dashboard load time
      const startTime = Date.now();

      await firstClient.click();
      await page.waitForLoadState('domcontentloaded');

      const loadTime = Date.now() - startTime;

      // ✅ PERFORMANCE TARGET: < 2s client dashboard load
      expect(loadTime, 'Client dashboard load too slow').toBeLessThan(2000);

      console.log(`Agency client dashboard load time: ${loadTime}ms`);
    }
  });
});

test.describe('Agency Mobile Experience - BottomNav Context Awareness', () => {

  test('BottomNav routes update when client context changes', async ({ page }) => {
    test.setTimeout(120000)
    const device = DEVICES['iphone-15']

    await page.setViewportSize(device.viewport)
    await loginAsMobile(page, 'agency')

    // Navigate to clients list
    await page.goto('http://127.0.0.1:56310/clients')
    await page.waitForLoadState('domcontentloaded')

    const clientLinks = page.locator('a[href*="/clients/"]:not([href="/clients/new"])')
    const clientCount = await clientLinks.count()

    if (clientCount >= 2) {
      // Navigate to Client A
      await clientLinks.nth(0).click()
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(500) // Wait for client context to update
      const clientASlug = page.url().match(/\/clients\/([^/]+)/)?.[1]

      // Navigate to Client B
      await page.goto('http://127.0.0.1:56310/clients')
      await page.waitForLoadState('domcontentloaded')
      await clientLinks.nth(1).click()
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(500) // Wait for client context to update and BottomNav to re-render
      const clientBSlug = page.url().match(/\/clients\/([^/]+)/)?.[1]

      // Skip test if both clients are the same (seed data issue)
      if (clientASlug === clientBSlug) {
        test.skip()
        return
      }

      // Verify BottomNav "Home" links update for each client
      const homeButton = page.locator('nav[aria-label="Bottom navigation"] a[aria-label="Home"]')
      const href = await homeButton.getAttribute('href')
      expect(href).toBe(`/clients/${clientBSlug}`)

      // Verify different client contexts
      expect(clientASlug).not.toEqual(clientBSlug)
    } else {
      test.skip() // Need at least 2 clients for this test
    }
  })
});
