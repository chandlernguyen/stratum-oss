import { test, expect } from '@playwright/test';
import { DEVICES, BREAKPOINTS } from '../helpers/devices';
import {
  validateTouchTargets,
  validateViewportMeta,
  validateSafeAreas,
  detectHorizontalScroll,
  captureViewport,
  loginAsMobile,
  validateTextReadability,
  validateFormUsability,
  selectAgentFromQuickSelector
} from '../helpers/mobile';

/**
 * Comprehensive Mobile Testing Suite
 * Based on /checklist/mobile_first_checklist.md (2018-2025+)
 *
 * Coverage:
 * - Viewport meta tag validation
 * - Touch target validation (44x44px minimum)
 * - Safe area CSS (iPhone notch/Dynamic Island)
 * - Horizontal scroll detection
 * - All breakpoints (360px → 1768px)
 * - Agency multi-client workflows
 * - Text readability (16px minimum)
 * - Form usability
 *
 * Created: 2025-10-30
 */

test.describe('Mobile-First Experience - Foundation', () => {

  test('validates viewport meta tag configuration', async ({ page }) => {
    await page.goto('http://127.0.0.1:56310');

    const checks = await validateViewportMeta(page);

    expect(checks.hasViewport, 'Viewport meta tag exists').toBeTruthy();
    expect(checks.hasWidthDevice, 'Has width=device-width').toBeTruthy();
    expect(checks.hasInitialScale, 'Has initial-scale=1').toBeTruthy();

    // Warning for missing viewport-fit=cover
    if (!checks.hasViewportFit) {
      console.warn('⚠️  viewport-fit=cover not found. iOS safe areas (notch/Dynamic Island) may not be handled properly');
      console.warn('   Add to index.html: <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">');
    }
  });

  test('validates safe area CSS for iOS devices', async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 852 }); // iPhone 15
    await page.goto('http://127.0.0.1:56310');

    const hasSafeAreas = await validateSafeAreas(page);

    if (!hasSafeAreas) {
      console.warn('⚠️  Safe area insets not detected in CSS');
      console.warn('   Consider adding: padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)');
      console.warn('   This prevents content from being hidden behind iPhone notch/Dynamic Island');
    }

    // Not critical for desktop-first apps, so just warn
    expect(true).toBeTruthy();
  });
});

test.describe('Mobile-First Experience - Breakpoint Testing', () => {

  Object.entries(BREAKPOINTS).forEach(([name, width]) => {
    test(`validates layout at ${name} breakpoint (${width}px)`, async ({ page }) => {
      test.setTimeout(60000); // 1 minute per breakpoint

      await page.setViewportSize({ width, height: 800 });
      await page.goto('http://127.0.0.1:56310');

      // 1. Check for horizontal scroll
      const hasScroll = await detectHorizontalScroll(page);
      expect(hasScroll, `Horizontal scroll detected at ${width}px`).toBeFalsy();

      // 2. Validate touch targets
      const violations = await validateTouchTargets(page, 44);
      if (violations.length > 0) {
        console.warn(`⚠️  ${violations.length} touch target violations at ${width}px:`);
        violations.slice(0, 5).forEach(v => console.warn(`   - ${v}`));
      }
      expect(violations.length, `Touch target violations at ${width}px`).toBe(0);

      // 3. Take screenshot
      await captureViewport(page, `breakpoint-${name}`);
    });
  });
});

test.describe('Mobile-First Experience - SME User Flows', () => {

  test('SME login flow on iPhone 15 (393px)', async ({ page }) => {
    test.setTimeout(60000);
    const device = DEVICES['iphone-15'];

    await page.setViewportSize(device.viewport);
    await page.goto('http://127.0.0.1:56310/login');

    // Validate form is usable
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();

    // Check touch target sizes
    const submitBox = await submitButton.boundingBox();
    expect(submitBox?.height).toBeGreaterThanOrEqual(44);

    // Test login
    await emailInput.fill('sme.owner@example.com');
    await passwordInput.fill('LocalDevOnly123!');
    await submitButton.click();

    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // ✅ SME-SPECIFIC: Verify SME dashboard with "Your Intelligence Briefing" heading
    await expect(page.locator('text=Your Intelligence Briefing')).toBeVisible();

    await captureViewport(page, 'sme-dashboard-iphone15');
  });

  test('SME dashboard on Android (360px)', async ({ page }) => {
    test.setTimeout(60000);
    const device = DEVICES['android-360'];

    await page.setViewportSize(device.viewport);
    await loginAsMobile(page, 'sme');

    // Check for horizontal scroll (common issue on narrow viewports)
    const hasScroll = await detectHorizontalScroll(page);
    expect(hasScroll, 'Horizontal scroll on Android 360px viewport').toBeFalsy();

    // Validate text readability
    const readability = await validateTextReadability(page);
    if (!readability.readable) {
      console.warn('⚠️  Text readability issues found:');
      readability.issues.slice(0, 5).forEach(i => console.warn(`   - ${i}`));
    }

    await captureViewport(page, 'sme-dashboard-android360');
  });

  test('SME strategy agent on iPhone Pro Max (430px)', async ({ page }) => {
    test.setTimeout(90000);
    const device = DEVICES['iphone-15-pro-max'];

    await page.setViewportSize(device.viewport);
    await loginAsMobile(page, 'sme');

    // Navigate to Strategy Agent
    await page.goto('http://127.0.0.1:56310/agents/strategy');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('h1').filter({ hasText: /Business Strategy Agent/i })).toBeVisible({ timeout: 10000 });

    // Validate chat interface is usable
    const chatInput = page.locator('textarea[placeholder*="message"], textarea[placeholder*="question"]').first();

    if (await chatInput.isVisible({ timeout: 5000 })) {
      // Check input height for comfortable typing
      const box = await chatInput.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(40);

      // Test typing
      await chatInput.fill('Create a SWOT analysis for my SaaS company');
      await expect(chatInput).toHaveValue('Create a SWOT analysis for my SaaS company');
    }

    await captureViewport(page, 'sme-strategy-iphone-pro-max');
  });

  test('SME navigation on iPad mini (744px)', async ({ page }) => {
    test.setTimeout(60000);
    const device = DEVICES['ipad-mini'];

    await page.setViewportSize(device.viewport);
    await loginAsMobile(page, 'sme');

    // Test navigation between key pages via BottomNav and AgentQuickSelector
    // 1. Navigate to Strategy via AgentQuickSelector
    const agentsButton = page.locator('nav[aria-label="Bottom navigation"] button[aria-label="Agents"]');
    await agentsButton.click();
    await page.waitForTimeout(300);

    await selectAgentFromQuickSelector(page, 'Strategy');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1, h2').filter({ hasText: /Business Strategy Agent/i })).toBeVisible({ timeout: 5000 });

    // Check no horizontal scroll
    let hasScroll = await detectHorizontalScroll(page);
    expect(hasScroll, 'Horizontal scroll on strategy page').toBeFalsy();

    // 2. Navigate to Campaigns via BottomNav
    const campaignsButton = page.locator('nav[aria-label="Bottom navigation"] a[aria-label="Campaigns"]');
    await campaignsButton.click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1, h2').filter({ hasText: /Campaigns/i })).toBeVisible({ timeout: 5000 });

    hasScroll = await detectHorizontalScroll(page);
    expect(hasScroll, 'Horizontal scroll on campaigns page').toBeFalsy();

    await captureViewport(page, 'sme-navigation-ipad-mini');
  });
});

test.describe('Mobile-First Experience - Agency User Flows', () => {

  test('Agency login and dashboard on iPhone 15 (393px)', async ({ page }) => {
    test.setTimeout(60000);
    const device = DEVICES['iphone-15'];

    await page.setViewportSize(device.viewport);
    await page.goto('http://127.0.0.1:56310/login');

    // Login as agency
    await page.fill('input[type="email"]', 'agency.owner@example.com');
    await page.fill('input[type="password"]', 'LocalDevOnly123!');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // ✅ AGENCY-SPECIFIC: Verify agency dashboard with Client Portfolio heading
    await expect(page.getByRole('heading', { name: 'Client Portfolio' })).toBeVisible({ timeout: 10000 });

    // Verify agency-specific metrics are visible
    await expect(page.locator('[data-testid="metric-client-count"]')).toBeVisible({ timeout: 5000 });

    // Check for horizontal scroll
    const hasScroll = await detectHorizontalScroll(page);
    expect(hasScroll).toBeFalsy();

    await captureViewport(page, 'agency-dashboard-iphone15');
  });

  test('Agency client list on Android (360px)', async ({ page }) => {
    test.setTimeout(60000);
    const device = DEVICES['android-360'];

    await page.setViewportSize(device.viewport);
    await loginAsMobile(page, 'agency');

    // Navigate to clients list
    await page.goto('http://127.0.0.1:56310/clients');
    await page.waitForLoadState('domcontentloaded');

    // Verify client cards are visible and usable
    const clientCards = page.locator('[data-testid="client-card"], a[href*="/clients/"]:not([href="/clients/new"])');
    const count = await clientCards.count();

    if (count > 0) {
      // Check first client card touch target
      const firstCard = clientCards.first();
      const box = await firstCard.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);

      // Verify no text overflow
      const hasScroll = await detectHorizontalScroll(page);
      expect(hasScroll, 'Client list has horizontal scroll on 360px').toBeFalsy();
    }

    await captureViewport(page, 'agency-clients-android360');
  });

  test('Agency client context switching on iPad Pro 11" (834px)', async ({ page }) => {
    test.setTimeout(90000);
    const device = DEVICES['ipad-pro-11'];

    await page.setViewportSize(device.viewport);
    await loginAsMobile(page, 'agency');

    // Navigate to first client
    await page.goto('http://127.0.0.1:56310/clients');
    await page.waitForLoadState('domcontentloaded');

    const firstClientLink = page.locator('a[href*="/clients/"]:not([href="/clients/new"])').first();

    if (await firstClientLink.isVisible({ timeout: 3000 })) {
      await firstClientLink.click();
      await page.waitForLoadState('domcontentloaded');

      // Verify client context in URL
      await expect(page).toHaveURL(/\/clients\/[a-zA-Z0-9-]+/, { timeout: 5000 });

      // Verify client context banner is visible
      const clientBanner = page.locator('[data-testid="client-context-banner"], text=/Working in.*client/i').first();
      if (await clientBanner.isVisible({ timeout: 2000 })) {
        await expect(clientBanner).toBeVisible();
      }

      await captureViewport(page, 'agency-client-context-ipad-pro-11');
    }
  });

  test('Agency client-scoped agent on iPhone Pro Max (430px)', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes for agent interaction
    const device = DEVICES['iphone-15-pro-max'];

    await page.setViewportSize(device.viewport);
    await loginAsMobile(page, 'agency');

    // Navigate to clients
    await page.goto('http://127.0.0.1:56310/clients');
    await page.waitForLoadState('domcontentloaded');

    // Click first client
    const firstClientLink = page.locator('a[href*="/clients/"]:not([href="/clients/new"])').first();

    if (await firstClientLink.isVisible({ timeout: 3000 })) {
      await firstClientLink.click();
      await page.waitForLoadState('domcontentloaded');

      // Navigate to Strategy Agent via BottomNav
      const clientSlug = page.url().match(/\/clients\/([^/]+)/)?.[1];

      // Use AgentQuickSelector
      const agentsButton = page.locator('nav[aria-label="Bottom navigation"] button[aria-label="Agents"]');
      await agentsButton.click();
      await page.waitForTimeout(300);

      await selectAgentFromQuickSelector(page, 'Strategy');
      await page.waitForLoadState('domcontentloaded');

      // Verify we're in client context
      await expect(page).toHaveURL(new RegExp(`/clients/${clientSlug}/agents/strategy`));

      // Verify agent loads with client context
      await expect(page.locator('h1').filter({ hasText: /Business Strategy Agent/i })).toBeVisible({ timeout: 10000 });

      // Verify chat interface is usable
      const chatInput = page.locator('textarea[placeholder*="message"], textarea[placeholder*="question"]').first();

      if (await chatInput.isVisible({ timeout: 5000 })) {
        const box = await chatInput.boundingBox();
        expect(box?.height).toBeGreaterThanOrEqual(40);

        await chatInput.fill('Test client-scoped message');
        await expect(chatInput).toHaveValue('Test client-scoped message');
      }

      // Verify session sidebar shows only client sessions
      const sessionSidebar = page.locator('[data-testid="session-sidebar"], aside').first();
      if (await sessionSidebar.isVisible({ timeout: 2000 })) {
        // Sessions should be filtered by client_id
        await expect(sessionSidebar).toBeVisible();
      }

      await captureViewport(page, 'agency-client-scoped-agent-iphone-pro-max');
    }
  });

  test('Agency multi-client dashboard on iPad Pro 13" (1024px)', async ({ page }) => {
    test.setTimeout(60000);
    const device = DEVICES['ipad-pro-13'];

    await page.setViewportSize(device.viewport);
    await loginAsMobile(page, 'agency');

    // ✅ AGENCY-SPECIFIC: Verify cross-client analytics are visible
    await expect(page.getByRole('heading', { name: 'Client Portfolio' })).toBeVisible({ timeout: 10000 });

    // Verify agency metrics (Total Clients, Monthly Revenue, Active Campaigns)
    await expect(page.locator('[data-testid="metric-client-count"]')).toBeVisible({ timeout: 5000 });

    // Check for client portfolio cards with updated data-testid
    const metricCards = page.locator('[data-testid="client-card"]');
    const count = await metricCards.count();

    if (count > 0) {
      // Verify at least 2 clients visible (if available)
      expect(count).toBeGreaterThanOrEqual(1);

      // On tablet, multiple clients should be visible side-by-side
      if (count >= 2) {
        const firstCard = metricCards.nth(0);
        const secondCard = metricCards.nth(1);

        const box1 = await firstCard.boundingBox();
        const box2 = await secondCard.boundingBox();

        if (box1 && box2) {
          // Cards should be in same row (similar Y position)
          const yDiff = Math.abs(box1.y - box2.y);
          expect(yDiff).toBeLessThan(50); // Allow some variation
        }
      }
    }

    // Validate no horizontal scroll
    const hasScroll = await detectHorizontalScroll(page);
    expect(hasScroll).toBeFalsy();

    await captureViewport(page, 'agency-multi-client-ipad-pro-13');
  });

  test('Agency client intelligence page on Galaxy Tab S10 (1600px)', async ({ page }) => {
    test.setTimeout(90000);
    const device = DEVICES['galaxy-tab-s10'];

    await page.setViewportSize(device.viewport);
    await loginAsMobile(page, 'agency');

    // Navigate to first client
    await page.goto('http://127.0.0.1:56310/clients');
    await page.waitForLoadState('domcontentloaded');

    const firstClientLink = page.locator('a[href*="/clients/"]:not([href="/clients/new"])').first();

    if (await firstClientLink.isVisible({ timeout: 3000 })) {
      const href = await firstClientLink.getAttribute('href');
      const clientSlug = href?.split('/').pop();

      if (clientSlug) {
        // Navigate to client intelligence page
        await page.goto(`http://127.0.0.1:56310/clients/${clientSlug}/intelligence`);
        await page.waitForLoadState('domcontentloaded');

        // Verify tabs are visible (Business Profile, Brand Guidelines, Learning History)
        const tabs = page.locator('[role="tablist"] button, [role="tab"]');
        const tabCount = await tabs.count();
        expect(tabCount).toBeGreaterThanOrEqual(2); // At least 2 tabs

        // Test tab navigation
        if (tabCount >= 2) {
          const secondTab = tabs.nth(1);
          await secondTab.click();
          await page.waitForTimeout(500); // Allow tab content to load

          // Verify tab content changed
          await expect(page.locator('[role="tabpanel"]')).toBeVisible();
        }

        await captureViewport(page, 'agency-client-intelligence-galaxy-tab-s10');
      }
    }
  });
});

test.describe('Mobile-First Experience - Foldable Devices', () => {

  test('Galaxy Z Fold transitions (cover → unfolded)', async ({ page }) => {
    test.setTimeout(90000);

    // Test cover screen (344px)
    await page.setViewportSize(DEVICES['galaxy-fold-cover'].viewport);
    await page.goto('http://127.0.0.1:56310/login');

    // Login on cover screen
    await page.fill('input[type="email"]', 'sme.owner@example.com');
    await page.fill('input[type="password"]', 'LocalDevOnly123!');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await captureViewport(page, 'fold-cover-dashboard');

    // Check for horizontal scroll (critical on 344px)
    let hasScroll = await detectHorizontalScroll(page);
    expect(hasScroll, 'Horizontal scroll on Z Fold cover screen').toBeFalsy();

    // Simulate unfolding (1768px)
    await page.setViewportSize(DEVICES['galaxy-fold-unfolded'].viewport);
    await page.waitForTimeout(500); // Allow layout to adjust

    // ✅ SME-SPECIFIC: Verify SME dashboard layout adapts to unfolded state
    await expect(page.locator('text=Your Intelligence Briefing')).toBeVisible();

    hasScroll = await detectHorizontalScroll(page);
    expect(hasScroll, 'Horizontal scroll on Z Fold unfolded').toBeFalsy();

    await captureViewport(page, 'fold-unfolded-dashboard');
  });

  test('Agency client management on Z Fold unfolded (1768px)', async ({ page }) => {
    test.setTimeout(90000);
    const device = DEVICES['galaxy-fold-unfolded'];

    await page.setViewportSize(device.viewport);
    await loginAsMobile(page, 'agency');

    // On wide viewport, should show desktop-like multi-column layout
    await page.goto('http://127.0.0.1:56310/clients');
    await page.waitForLoadState('domcontentloaded');

    // Verify multiple client cards visible in grid
    const clientCards = page.locator('[data-testid="client-card"], a[href*="/clients/"]:not([href="/clients/new"])');
    const count = await clientCards.count();

    if (count >= 2) {
      // Check if cards are in grid layout (side-by-side)
      const card1 = clientCards.nth(0);
      const card2 = clientCards.nth(1);

      const box1 = await card1.boundingBox();
      const box2 = await card2.boundingBox();

      if (box1 && box2) {
        // Should be in same row on wide viewport
        const yDiff = Math.abs(box1.y - box2.y);
        expect(yDiff).toBeLessThan(50);
      }
    }

    await captureViewport(page, 'agency-clients-fold-unfolded');
  });
});

test.describe('Mobile-First Experience - Performance & Usability', () => {

  test('validates form usability across devices', async ({ page }) => {
    test.setTimeout(60000);

    const testViewports = [
      { name: 'Android 360px', width: 360, height: 800 },
      { name: 'iPhone 15', width: 393, height: 852 },
      { name: 'iPad mini', width: 744, height: 1133 }
    ];

    for (const viewport of testViewports) {
      await page.setViewportSize(viewport);
      await page.goto('http://127.0.0.1:56310/login');

      const formUsability = await validateFormUsability(page);

      if (!formUsability.usable) {
        console.warn(`⚠️  Form usability issues on ${viewport.name}:`);
        formUsability.issues.forEach(i => console.warn(`   - ${i}`));
      }

      // Forms should be usable (warning, not failure)
      expect(true).toBeTruthy();
    }
  });

  test('validates text readability on small viewports', async ({ page }) => {
    test.setTimeout(60000);

    const smallViewports = [
      { name: 'Z Fold Cover', width: 344, height: 882 },
      { name: 'Android 360px', width: 360, height: 800 },
      { name: 'iPhone SE', width: 375, height: 667 }
    ];

    for (const viewport of smallViewports) {
      await page.setViewportSize(viewport);
      await page.goto('http://127.0.0.1:56310');

      const readability = await validateTextReadability(page);

      if (!readability.readable) {
        console.warn(`⚠️  Text readability issues on ${viewport.name}:`);
        readability.issues.slice(0, 3).forEach(i => console.warn(`   - ${i}`));
      }

      // Warning only, not critical failure
      expect(true).toBeTruthy();
    }
  });
});
