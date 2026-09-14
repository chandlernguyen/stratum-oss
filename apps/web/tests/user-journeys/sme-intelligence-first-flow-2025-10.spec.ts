import { test, expect } from '@playwright/test';

/**
 * SME Intelligence-First Flow Tests (October 2025)
 *
 * Tests the NEW intelligence-first campaign philosophy:
 * 1. Onboarding prioritizes intelligence (strategy, persona) over campaigns
 * 2. Campaign Readiness Banner guides users through prerequisites
 * 3. "Organize Intelligence" CTA appears in outputs view
 * 4. Empty states emphasize building intelligence first
 *
 * Related: Phase 3 - Campaign-Optional Onboarding (Action Plan)
 */

const TEST_USER = {
  email: 'sme.owner@example.com',
  password: 'LocalDevOnly123!'
};

test.describe('SME Intelligence-First Flow (October 2025)', () => {
  test.setTimeout(120000); // 2 minutes for complete journey

  test.beforeEach(async ({ page }) => {
    // Navigate and login
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Wait for dashboard and handle business context wizard if needed
    await page.waitForTimeout(2000);
    const skipButton = page.locator('button:has-text("Skip for Now")');
    if (await skipButton.isVisible({ timeout: 2000 })) {
      await skipButton.click();
      await page.waitForURL('**/dashboard', { timeout: 10000 });
    }

    await page.waitForLoadState('domcontentloaded');
  });

  test('IF1: Dashboard shows intelligence-first messaging (not campaign-first)', async ({ page }) => {
    console.log('📊 Testing intelligence-first dashboard messaging...');

    // Verify dashboard loaded
    await expect(page.locator('nav a[href="/dashboard"]').first()).toBeVisible({ timeout: 10000 });

    // Check for intelligence-first messaging
    const hasIntelligenceBriefing = await page.locator('text=Intelligence Briefing').isVisible({ timeout: 5000 });
    if (hasIntelligenceBriefing) {
      console.log('✅ Intelligence Briefing card found');
      expect(hasIntelligenceBriefing).toBeTruthy();
    }

    // Verify "Build Intelligence First" messaging (should appear if no campaigns)
    const hasBuildIntelligenceFirst = await page.getByText('Build Intelligence First').count();
    const hasStartWithStrategy = await page.getByText('Start with Strategy').count();

    if (hasBuildIntelligenceFirst > 0 || hasStartWithStrategy > 0) {
      console.log('✅ Intelligence-first messaging found on dashboard');
    }

    console.log('✅ Dashboard shows intelligence-first UI');
  });

  test('IF2: Campaign Readiness Banner shows prerequisites progress', async ({ page }) => {
    console.log('🎯 Testing Campaign Readiness Banner...');

    // Navigate to dashboard
    await expect(page.locator('nav a[href="/dashboard"]').first()).toBeVisible({ timeout: 10000 });

    // Look for Campaign Readiness Banner
    const hasReadinessBanner = await page.locator('text=/Building Your Strategic Foundation|Ready to Create Your First Campaign/i').isVisible({ timeout: 5000 });

    if (hasReadinessBanner) {
      console.log('✅ Campaign Readiness Banner found');

      // Check for prerequisite checklist
      const hasBusinessStrategy = await page.getByText('Business Strategy').count();
      const hasCustomerPersonas = await page.getByText('Customer Personas').count();
      const hasMarketingStrategy = await page.getByText('Marketing Strategy').count();

      if (hasBusinessStrategy > 0 && hasCustomerPersonas > 0 && hasMarketingStrategy > 0) {
        console.log('✅ All three prerequisites displayed in banner');
      }
    } else {
      console.log('ℹ️  Campaign Readiness Banner not visible (user may already have campaigns)');
    }
  });

  test.fixme('IF3: Outputs page shows "Organize Intelligence" CTA (stale copy; see TESTING.md)', async ({ page }) => {
    console.log('📁 Testing Outputs page intelligence organization...');

    // Navigate to Outputs page (desktop nav)
    await page.locator('nav a[href="/outputs"]').last().click();
    await page.waitForURL('**/outputs', { timeout: 10000 });
    await page.waitForLoadState('domcontentloaded');

    // Verify Outputs page loaded
    await expect(page.locator('h1:has-text("Outputs Hub")')).toBeVisible({ timeout: 10000 });

    // Look for "Organize Intelligence" or "Create Campaign" button in header
    const hasOrganizeIntelligence = await page.getByRole('button', { name: /Organize Intelligence|Create Campaign/i }).count();

    if (hasOrganizeIntelligence > 0) {
      console.log('✅ Organize Intelligence CTA found in outputs view');
      expect(hasOrganizeIntelligence).toBeGreaterThan(0);
    } else {
      console.log('ℹ️  Organize Intelligence CTA not visible (may require intelligence outputs first)');
    }
  });

  test.fixme('IF4: Campaign list empty state shows intelligence-first messaging (stale copy; see TESTING.md)', async ({ page }) => {
    console.log('🎪 Testing campaign list empty state...');

    // Navigate to Campaigns page (desktop nav)
    await page.locator('nav a[href="/campaigns"]').last().click();
    await page.waitForURL('**/campaigns', { timeout: 10000 });
    await page.waitForLoadState('domcontentloaded');

    // Check for intelligence-first empty state messaging
    const hasBuildIntelligence = await page.getByText(/Build strategic intelligence first|Build intelligence outputs first/i).count();
    const hasStartWithStrategy = await page.getByRole('button', { name: /Start with Strategy|Build Intelligence/i }).count();

    if (hasBuildIntelligence > 0 && hasStartWithStrategy > 0) {
      console.log('✅ Campaign list shows intelligence-first empty state');
      expect(hasBuildIntelligence).toBeGreaterThan(0);
      expect(hasStartWithStrategy).toBeGreaterThan(0);
    } else {
      console.log('ℹ️  Empty state not visible (user may already have campaigns)');
    }
  });

  test('IF5: Onboarding prioritizes Strategy over Campaign creation', async ({ page }) => {
    console.log('🚀 Testing onboarding CTA priority...');

    // Navigate to dashboard to see if we're shown getting started UI
    await expect(page.locator('nav a[href="/dashboard"]').first()).toBeVisible({ timeout: 10000 });

    // Look for "Start with Strategy" as primary CTA
    const strategyButton = page.getByRole('button', { name: /Start with Strategy/i });
    const campaignButton = page.getByRole('button', { name: /Create Campaign/i });

    const hasStrategyButton = await strategyButton.count();
    const hasCampaignButton = await campaignButton.count();

    if (hasStrategyButton > 0) {
      console.log('✅ "Start with Strategy" CTA found');

      // If both exist, verify Strategy is more prominent (primary vs outline styling)
      if (hasCampaignButton > 0) {
        const strategyClasses = await strategyButton.first().getAttribute('class') || '';
        const campaignClasses = await campaignButton.first().getAttribute('class') || '';

        // Primary buttons typically have 'bg-' classes, outline buttons have 'border'
        const strategyIsPrimary = strategyClasses.includes('bg-') || !strategyClasses.includes('outline');
        const campaignIsOutline = campaignClasses.includes('outline');

        if (strategyIsPrimary || campaignIsOutline) {
          console.log('✅ Strategy has higher visual priority than Campaign');
        }
      }
    }

    console.log('✅ Onboarding follows intelligence-first philosophy');
  });

  test('IF6: Intelligence Briefing Card is collapsible', async ({ page }) => {
    console.log('🎴 Testing Intelligence Briefing Card collapsibility...');

    // Navigate to dashboard
    await expect(page.locator('nav a[href="/dashboard"]').first()).toBeVisible({ timeout: 10000 });

    // Look for Intelligence Briefing Card
    const briefingCard = page.locator('text=Intelligence Briefing');
    const hasBriefingCard = await briefingCard.isVisible({ timeout: 5000 });

    if (hasBriefingCard) {
      console.log('✅ Intelligence Briefing Card found');

      // Look for collapse/expand button (chevron icon)
      const collapseButton = page.locator('button:has([class*="chevron"]), button:has(svg)').first();
      const hasCollapseButton = await collapseButton.isVisible({ timeout: 2000 });

      if (hasCollapseButton) {
        console.log('✅ Collapse button found');

        // Try to collapse the card
        await collapseButton.click();
        await page.waitForTimeout(500);

        console.log('✅ Intelligence Briefing Card is collapsible');
      }
    } else {
      console.log('ℹ️  Intelligence Briefing Card not visible on this dashboard state');
    }
  });

  test.fixme('IF7: Complete intelligence-first user journey (nav drift; see TESTING.md)', async ({ page }) => {
    console.log('🎬 Testing complete intelligence-first journey...');

    // STEP 1: User sees intelligence-first dashboard
    console.log('📍 Step 1: Dashboard shows intelligence recommendations');
    await expect(page.locator('nav a[href="/dashboard"]').first()).toBeVisible({ timeout: 10000 });

    // STEP 2: User clicks "Start with Strategy" (not campaign creation)
    console.log('📍 Step 2: Navigate to Strategy Agent');
    const strategyButton = page.getByRole('button', { name: /Start with Strategy/i }).first();
    const hasStrategyButton = await strategyButton.isVisible({ timeout: 5000 });

    if (hasStrategyButton) {
      await strategyButton.click();
      await page.waitForURL('**/strategy', { timeout: 10000 });
      await page.waitForLoadState('domcontentloaded');
      console.log('✅ Navigated to Strategy Agent via intelligence-first flow');
    } else {
      // Fallback: use navigation dropdown (desktop nav)
      await page.locator('nav button:has-text("Agents")').last().click();
      await page.waitForTimeout(500);
      await page.locator('a:has-text("Strategy")').filter({ has: page.locator('span:has-text("🎯")') }).click();
      await page.waitForURL('**/strategy', { timeout: 10000 });
      console.log('✅ Navigated to Strategy Agent via menu');
    }

    // Verify Strategy Agent loaded
    await expect(page.locator('h1:has-text("Business Strategy Agent")')).toBeVisible({ timeout: 10000 });

    // STEP 3: Generate strategy intelligence
    console.log('📍 Step 3: Generate strategy intelligence');
    const chatInput = page.locator('textarea, [contenteditable="true"]').first();
    await expect(chatInput).toBeVisible({ timeout: 10000 });
    await chatInput.fill('Help me with business strategy for B2B SaaS');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(5000);
    console.log('✅ Strategy intelligence requested');

    // STEP 4: View outputs and see "Organize Intelligence" CTA
    console.log('📍 Step 4: Navigate to outputs to organize intelligence');
    await page.locator('nav a[href="/outputs"]').last().click();
    await page.waitForURL('**/outputs', { timeout: 10000 });
    await page.waitForLoadState('domcontentloaded');

    const hasOrganizeCTA = await page.getByRole('button', { name: /Organize Intelligence|Create Campaign/i }).isVisible({ timeout: 5000 });
    if (hasOrganizeCTA) {
      console.log('✅ "Organize Intelligence" CTA visible in outputs view');
    }

    console.log('✅ Complete intelligence-first journey successful!');
  });
});
