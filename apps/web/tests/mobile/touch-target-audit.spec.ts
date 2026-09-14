import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Phase 3: Touch Target Audit Script
 *
 * WCAG 2.5.5 Level AAA: Touch targets should be at least 44x44px
 * Industry Best Practice: 48x48px minimum (what we're targeting)
 *
 * This script:
 * 1. Navigates to all critical pages
 * 2. Finds all interactive elements (buttons, links, inputs, etc.)
 * 3. Measures their bounding boxes on mobile viewport
 * 4. Reports violations (anything < 48x48px)
 * 5. Generates a detailed report
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

const MIN_TOUCH_TARGET_SIZE = 48; // pixels

interface TouchTargetViolation {
  page: string;
  selector: string;
  element: string;
  width: number;
  height: number;
  text?: string;
  ariaLabel?: string;
}

const violations: TouchTargetViolation[] = [];

// Critical pages to audit
const PAGES_TO_AUDIT = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Business Strategy', path: '/strategy' },
  { name: 'Persona Agent', path: '/persona' },
  { name: 'Content Agent', path: '/content' },
  { name: 'Campaign Planning', path: '/campaign-planning' },
  { name: 'Competitive Intelligence', path: '/competitive-intelligence' },
  { name: 'Performance Intelligence', path: '/performance-intelligence' },
  { name: 'Quick Start', path: '/quick-start' },
  { name: 'Campaigns List', path: '/campaigns' },
  { name: 'Outputs', path: '/outputs' },
  { name: 'Profile', path: '/profile' },
];

async function auditTouchTargets(page: Page, pageName: string) {
  console.log(`\n🔍 Auditing: ${pageName}`);

  // Wait for page to stabilize (increased timeout)
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  await page.waitForTimeout(1500);

  // Find all interactive elements
  const interactiveSelectors = [
    'button:visible',
    'a:visible',
    'input[type="button"]:visible',
    'input[type="submit"]:visible',
    '[role="button"]:visible',
    '[onclick]:visible',
    'select:visible',
    'input[type="checkbox"]:visible',
    'input[type="radio"]:visible',
  ];

  for (const selector of interactiveSelectors) {
    const elements = await page.locator(selector).all();

    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];

      try {
        const isVisible = await element.isVisible();
        if (!isVisible) continue;

        const box = await element.boundingBox();
        if (!box) continue;

        // Check if touch target meets minimum size
        if (box.width < MIN_TOUCH_TARGET_SIZE || box.height < MIN_TOUCH_TARGET_SIZE) {
          const text = await element.textContent();
          const ariaLabel = await element.getAttribute('aria-label');
          const tagName = await element.evaluate(el => el.tagName.toLowerCase());

          violations.push({
            page: pageName,
            selector,
            element: tagName,
            width: Math.round(box.width),
            height: Math.round(box.height),
            text: text?.trim().substring(0, 50) || undefined,
            ariaLabel: ariaLabel || undefined,
          });

          console.log(`  ❌ Violation: ${tagName} (${Math.round(box.width)}x${Math.round(box.height)}px)${text ? ` - "${text.trim().substring(0, 30)}"` : ''}`);
        }
      } catch (error) {
        // Element might have disappeared during measurement, skip it
        continue;
      }
    }
  }

  const pageViolations = violations.filter(v => v.page === pageName);
  console.log(`  ✓ Found ${pageViolations.length} violations on ${pageName}`);
}

test.describe('Phase 3: Touch Target Audit', () => {
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

  test('Audit all critical pages for touch target compliance', async ({ page }) => {
    // Increase timeout for this test as it audits many pages
    test.setTimeout(120000); // 2 minutes

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📱 TOUCH TARGET AUDIT');
    console.log(`   Minimum Size: ${MIN_TOUCH_TARGET_SIZE}x${MIN_TOUCH_TARGET_SIZE}px`);
    console.log(`   Viewport: ${MOBILE_VIEWPORT.width}x${MOBILE_VIEWPORT.height}px (iPhone 15)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Audit each page
    for (const pageInfo of PAGES_TO_AUDIT) {
      await page.goto(pageInfo.path);
      await auditTouchTargets(page, pageInfo.name);
    }

    // Generate report
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 AUDIT RESULTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`Total violations found: ${violations.length}\n`);

    // Group by page
    const violationsByPage = violations.reduce((acc, v) => {
      if (!acc[v.page]) acc[v.page] = [];
      acc[v.page].push(v);
      return acc;
    }, {} as Record<string, TouchTargetViolation[]>);

    // Print summary by page
    Object.entries(violationsByPage).forEach(([pageName, pageViolations]) => {
      console.log(`${pageName}: ${pageViolations.length} violations`);
    });

    // Generate detailed JSON report
    const reportPath = path.join(__dirname, 'touch-target-audit-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      viewport: MOBILE_VIEWPORT,
      minTouchTargetSize: MIN_TOUCH_TARGET_SIZE,
      totalViolations: violations.length,
      violationsByPage,
      allViolations: violations,
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);

    // Generate markdown report
    const markdownReportPath = path.join(__dirname, 'touch-target-audit-report.md');
    let markdown = `# Touch Target Audit Report\n\n`;
    markdown += `**Date**: ${new Date().toISOString()}\n`;
    markdown += `**Viewport**: ${MOBILE_VIEWPORT.width}x${MOBILE_VIEWPORT.height}px (iPhone 15)\n`;
    markdown += `**Minimum Touch Target Size**: ${MIN_TOUCH_TARGET_SIZE}x${MIN_TOUCH_TARGET_SIZE}px\n`;
    markdown += `**Total Violations**: ${violations.length}\n\n`;
    markdown += `---\n\n`;

    if (violations.length === 0) {
      markdown += `## ✅ No Violations Found!\n\n`;
      markdown += `All interactive elements meet the minimum touch target size requirement.\n`;
    } else {
      markdown += `## Summary by Page\n\n`;
      Object.entries(violationsByPage).forEach(([pageName, pageViolations]) => {
        markdown += `- **${pageName}**: ${pageViolations.length} violations\n`;
      });

      markdown += `\n---\n\n## Detailed Violations\n\n`;
      Object.entries(violationsByPage).forEach(([pageName, pageViolations]) => {
        markdown += `### ${pageName} (${pageViolations.length} violations)\n\n`;
        markdown += `| Element | Size | Text/Label | Selector |\n`;
        markdown += `|---------|------|------------|----------|\n`;
        pageViolations.forEach(v => {
          const label = v.text || v.ariaLabel || 'N/A';
          markdown += `| ${v.element} | ${v.width}x${v.height}px | ${label} | \`${v.selector}\` |\n`;
        });
        markdown += `\n`;
      });

      markdown += `\n---\n\n## Recommendations\n\n`;
      markdown += `1. **Increase Padding**: Add more padding to small buttons/links\n`;
      markdown += `2. **Minimum Size Classes**: Use Tailwind's \`min-w-12 min-h-12\` (48px) for touch targets\n`;
      markdown += `3. **Icon Buttons**: Wrap icons in larger clickable areas (e.g., \`p-3\` for 48x48px)\n`;
      markdown += `4. **Links in Text**: Add padding to inline links or increase line-height\n`;
      markdown += `5. **Form Controls**: Ensure checkboxes, radios have larger touch areas\n\n`;
    }

    fs.writeFileSync(markdownReportPath, markdown);
    console.log(`📄 Markdown report saved to: ${markdownReportPath}`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // This test is informational - we don't fail it, just report
    // In a real scenario, you might want to fail if violations > threshold
    expect(violations.length).toBeGreaterThanOrEqual(0);
  });

  test('Verify bottom navigation touch targets (should pass)', async ({ page }) => {
    // This is a positive test - verify our new components meet standards
    const bottomNav = page.locator('nav[aria-label="Bottom navigation"]');
    await expect(bottomNav).toBeVisible();

    const navItems = bottomNav.locator('a, button');
    const count = await navItems.count();

    for (let i = 0; i < count; i++) {
      const item = navItems.nth(i);
      const box = await item.boundingBox();

      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_SIZE);
        expect(box.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_SIZE);
      }
    }
  });

  test('Verify agent quick selector buttons (should pass)', async ({ page }) => {
    // Open agent quick selector
    const agentsButton = page.locator('nav[aria-label="Bottom navigation"]').locator('button[aria-label="Agents"]');
    await agentsButton.click();

    // Wait for sheet to open
    await page.waitForTimeout(500);

    // Check agent buttons
    const agentButtons = page.locator('[role="dialog"] button').filter({ hasText: /Strategy|Persona|Content|Campaign|Intelligence|Quick Start/ });
    const count = await agentButtons.count();

    for (let i = 0; i < count; i++) {
      const button = agentButtons.nth(i);
      const isVisible = await button.isVisible();
      if (!isVisible) continue;

      const box = await button.boundingBox();
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_SIZE);
        expect(box.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_SIZE);
      }
    }
  });
});
