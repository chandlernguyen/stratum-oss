import { test, expect, Page } from '@playwright/test';
import {
  runAxeAnalysis,
  assertNoViolations,
  setTheme,
  formatViolations,
} from '../helpers/axe';
import { loginAsMobile, navigateToAgent } from '../helpers/mobile';
import type { ViolationSummary } from '../helpers/axe';

/**
 * Comprehensive Dark Mode Accessibility Tests with axe-core
 *
 * WCAG 2.1 AA compliance testing across:
 * - All 9 AI agents + dashboard + outputs + profile
 * - Light and dark modes
 * - Mobile (375px, 393px), Tablet (768px, 1024px), Desktop (1280px, 1440px)
 * - SME and Agency (client-scoped) routes
 *
 * Test Strategy:
 * - Fails ONLY on critical and serious violations
 * - Logs moderate/minor violations for review without failing
 * - Uses parameterized tests for comprehensive coverage
 *
 * Test User: sme.owner@example.com (Password: LocalDevOnly123!)
 * Agency User: agency.owner@example.com (Password: LocalDevOnly123!)
 */

// ============================================
// Configuration
// ============================================

const AGENTS = [
  { name: 'Strategy', path: '/strategy' },
  { name: 'Persona', path: '/persona' },
  { name: 'Marketing Strategy', path: '/marketing-strategy' },
  { name: 'Content', path: '/content' },
  { name: 'Campaign Planning', path: '/campaign-planning' },
  { name: 'Competitive Intelligence', path: '/competitive-intelligence' },
  { name: 'Client Success', path: '/client-success' },
  { name: 'Performance Intelligence', path: '/performance-intelligence' },
  { name: 'Quick Start', path: '/quick-start' },
] as const;

const CORE_PAGES = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Outputs', path: '/outputs' },
  { name: 'Profile', path: '/profile' },
] as const;

const VIEWPORTS = {
  mobile: [
    { name: 'iPhone SE', width: 375, height: 667 },
    { name: 'iPhone 15', width: 393, height: 852 },
  ],
  tablet: [
    { name: 'iPad Portrait', width: 768, height: 1024 },
    { name: 'iPad Landscape', width: 1024, height: 768 },
  ],
  desktop: [
    { name: 'Desktop HD', width: 1280, height: 720 },
    { name: 'Desktop Large', width: 1440, height: 900 },
  ],
} as const;

const THEMES = ['light', 'dark'] as const;

// Animation delays
const MENU_ANIMATION_DELAY = 300;

// ============================================
// Helper Functions
// ============================================

/**
 * Run accessibility test and assert no critical/serious violations
 */
async function runA11yTest(page: Page, context: string) {
  const results = await runAxeAnalysis(page);

  // Log all violations for debugging (including filtered ones)
  if (results.originalViolationCount > 0) {
    console.log(`\n[A11Y] ${context}: ${results.violations.length} critical/serious, ${results.originalViolationCount - results.violations.length} minor/moderate`);
    if (results.violations.length > 0) {
      const formatted = formatViolations(results.violations as ViolationSummary[]);
      console.log(formatted.join('\n'));
    }
  }

  // Only fail on critical/serious violations
  assertNoViolations(results, context);
}

/**
 * Extract first client slug from the clients list page
 * Returns null if no clients are available
 */
async function getFirstClientSlug(page: Page): Promise<string | null> {
  const firstClientLink = page.locator('a[href*="/clients/"]').first();
  const href = await firstClientLink.getAttribute('href').catch(() => null);
  if (!href) return null;
  const clientSlug = href.split('/clients/')[1]?.split('/')[0];
  return clientSlug && clientSlug.length > 0 ? clientSlug : null;
}

// ============================================
// Desktop Tests (1280px, 1440px)
// ============================================

test.describe('Desktop Accessibility - WCAG 2.1 AA', () => {
  for (const viewport of VIEWPORTS.desktop) {
    test.describe(`${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } });

      test.beforeEach(async ({ page }) => {
        await loginAsMobile(page, 'sme');
      });

      // Core Pages
      for (const pageConfig of CORE_PAGES) {
        for (const theme of THEMES) {
          test(`${pageConfig.name} - ${theme} mode`, async ({ page }) => {
            await page.goto(pageConfig.path);
            await page.waitForLoadState('domcontentloaded');
            await setTheme(page, theme);

            await runA11yTest(page, `${pageConfig.name} (${viewport.name}, ${theme})`);
          });
        }
      }

      // All Agents
      for (const agent of AGENTS) {
        for (const theme of THEMES) {
          test(`${agent.name} Agent - ${theme} mode`, async ({ page }) => {
            await page.goto(agent.path);
            await page.waitForLoadState('domcontentloaded');
            await setTheme(page, theme);

            await runA11yTest(page, `${agent.name} Agent (${viewport.name}, ${theme})`);
          });
        }
      }
    });
  }
});

// ============================================
// Tablet Tests (768px, 1024px)
// ============================================

test.describe('Tablet Accessibility - WCAG 2.1 AA', () => {
  for (const viewport of VIEWPORTS.tablet) {
    test.describe(`${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } });

      test.beforeEach(async ({ page }) => {
        await loginAsMobile(page, 'sme');
      });

      // Core Pages (both themes)
      for (const pageConfig of CORE_PAGES) {
        for (const theme of THEMES) {
          test(`${pageConfig.name} - ${theme} mode`, async ({ page }) => {
            await page.goto(pageConfig.path);
            await page.waitForLoadState('domcontentloaded');
            await setTheme(page, theme);

            await runA11yTest(page, `${pageConfig.name} (${viewport.name}, ${theme})`);
          });
        }
      }

      // Key Agents (dark mode only to reduce test count)
      const keyAgents = AGENTS.filter((a) =>
        ['Strategy', 'Persona', 'Content', 'Performance Intelligence'].includes(a.name)
      );

      for (const agent of keyAgents) {
        test(`${agent.name} Agent - dark mode`, async ({ page }) => {
          await page.goto(agent.path);
          await page.waitForLoadState('domcontentloaded');
          await setTheme(page, 'dark');

          await runA11yTest(page, `${agent.name} Agent (${viewport.name}, dark)`);
        });
      }
    });
  }
});

// ============================================
// Mobile Tests (375px, 393px)
// ============================================

test.describe('Mobile Accessibility - WCAG 2.1 AA', () => {
  for (const viewport of VIEWPORTS.mobile) {
    test.describe(`${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } });

      test.beforeEach(async ({ page }) => {
        await loginAsMobile(page, 'sme');
      });

      // Core Pages (both themes)
      for (const pageConfig of CORE_PAGES) {
        for (const theme of THEMES) {
          test(`${pageConfig.name} - ${theme} mode`, async ({ page }) => {
            // Navigate using direct URL (already on dashboard from login)
            if (pageConfig.path !== '/dashboard') {
              await page.goto(pageConfig.path);
            }
            await page.waitForLoadState('domcontentloaded');
            await setTheme(page, theme);

            await runA11yTest(page, `${pageConfig.name} (${viewport.name}, ${theme})`);
          });
        }
      }

      // Key Agents via mobile navigation
      const keyAgents = ['Strategy', 'Persona', 'Content'];

      for (const agentName of keyAgents) {
        test(`${agentName} Agent - dark mode`, async ({ page }) => {
          await navigateToAgent(page, agentName, viewport.width);
          await page.waitForLoadState('domcontentloaded');
          await setTheme(page, 'dark');

          await runA11yTest(page, `${agentName} Agent (${viewport.name}, dark)`);
        });
      }
    });
  }
});

// ============================================
// Agency Client-Scoped Routes
// ============================================

test.describe('Agency Multi-Tenant Accessibility - WCAG 2.1 AA', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test.beforeEach(async ({ page }) => {
    await loginAsMobile(page, 'agency');
  });

  test.describe('Client List and Navigation', () => {
    for (const theme of THEMES) {
      test(`Clients List - ${theme} mode`, async ({ page }) => {
        await page.goto('/clients');
        await page.waitForLoadState('domcontentloaded');
        await setTheme(page, theme);

        await runA11yTest(page, `Clients List (${theme})`);
      });
    }
  });

  test.describe('Client-Scoped Pages', () => {
    test('Client Dashboard - dark mode', async ({ page }) => {
      await page.goto('/clients');
      await page.waitForLoadState('domcontentloaded');

      const clientSlug = await getFirstClientSlug(page);
      if (!clientSlug) {
        test.skip(true, 'No clients available in test environment');
        return;
      }

      await page.goto(`/clients/${clientSlug}`);
      await page.waitForLoadState('domcontentloaded');
      await setTheme(page, 'dark');

      await runA11yTest(page, `Client Dashboard (${clientSlug}, dark)`);
    });

    test('Client Strategy Agent - dark mode', async ({ page }) => {
      await page.goto('/clients');
      await page.waitForLoadState('domcontentloaded');

      const clientSlug = await getFirstClientSlug(page);
      if (!clientSlug) {
        test.skip(true, 'No clients available in test environment');
        return;
      }

      await page.goto(`/clients/${clientSlug}/agents/strategy`);
      await page.waitForLoadState('domcontentloaded');
      await setTheme(page, 'dark');

      await runA11yTest(page, `Client Strategy Agent (${clientSlug}, dark)`);
    });

    test('Client Outputs - dark mode', async ({ page }) => {
      await page.goto('/clients');
      await page.waitForLoadState('domcontentloaded');

      const clientSlug = await getFirstClientSlug(page);
      if (!clientSlug) {
        test.skip(true, 'No clients available in test environment');
        return;
      }

      await page.goto(`/clients/${clientSlug}/outputs`);
      await page.waitForLoadState('domcontentloaded');
      await setTheme(page, 'dark');

      await runA11yTest(page, `Client Outputs (${clientSlug}, dark)`);
    });
  });

  test.describe('Mobile Agency View', () => {
    test.use({ viewport: { width: 393, height: 852 } });

    test('Clients List Mobile - dark mode', async ({ page }) => {
      await page.goto('/clients');
      await page.waitForLoadState('domcontentloaded');
      await setTheme(page, 'dark');

      await runA11yTest(page, 'Clients List (Mobile, dark)');
    });
  });
});

// ============================================
// Specific Component Tests
// ============================================

test.describe('Component-Specific Accessibility', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test.beforeEach(async ({ page }) => {
    await loginAsMobile(page, 'sme');
  });

  test('Mobile Navigation Menu - dark mode', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await setTheme(page, 'dark');

    // Open mobile menu (More button in bottom nav)
    const moreButton = page.locator('button:has-text("More")').first();
    if (await moreButton.isVisible()) {
      await moreButton.click();
      await page.waitForTimeout(MENU_ANIMATION_DELAY);
    }

    await runA11yTest(page, 'Mobile Navigation Menu (dark)');
  });

  test('Agent Quick Selector Dialog - dark mode', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await setTheme(page, 'dark');

    // Open agent quick selector
    const agentsButton = page.locator('nav[aria-label="Bottom navigation"] button[aria-label="Agents"]');
    if (await agentsButton.isVisible()) {
      await agentsButton.click();
      await page.waitForTimeout(MENU_ANIMATION_DELAY);

      // Wait for dialog
      await page.locator('[role="dialog"]').waitFor({ state: 'visible', timeout: 5000 });

      await runA11yTest(page, 'Agent Quick Selector (dark)');
    } else {
      test.skip(true, 'Bottom navigation not visible at this viewport');
    }
  });

  test('Theme Toggle Button - accessibility', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Find theme toggle button
    const themeToggle = page.getByRole('button', { name: /switch to (dark|light) mode/i });
    await expect(themeToggle).toBeVisible();

    // Verify it has proper aria-label
    const ariaLabel = await themeToggle.getAttribute('aria-label');
    expect(ariaLabel).toMatch(/switch to (dark|light) mode/i);

    // Run full page accessibility check
    await runA11yTest(page, 'Dashboard with Theme Toggle');
  });
});

// ============================================
// Regression Tests for Known Issues
// ============================================

test.describe('Dark Mode Regression Tests', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test.beforeEach(async ({ page }) => {
    await loginAsMobile(page, 'sme');
    await setTheme(page, 'dark');
  });

  test('Header navigation has sufficient contrast', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    // Check header specifically
    const results = await runAxeAnalysis(page, {
      include: ['header'],
    });

    assertNoViolations(results, 'Header (dark mode)');
  });

  test('Form inputs have visible focus states', async ({ page }) => {
    await page.goto('/strategy');
    await page.waitForLoadState('domcontentloaded');

    // Check form elements
    const results = await runAxeAnalysis(page, {
      include: ['form', 'input', 'textarea', 'button'],
    });

    assertNoViolations(results, 'Form Elements (dark mode)');
  });

  test('Cards and containers have readable text', async ({ page }) => {
    await page.goto('/outputs');
    await page.waitForLoadState('domcontentloaded');

    // Check main content area
    const results = await runAxeAnalysis(page, {
      include: ['main'],
    });

    assertNoViolations(results, 'Main Content (dark mode)');
  });
});
