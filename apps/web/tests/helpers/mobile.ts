import { Page } from '@playwright/test';

/**
 * Mobile testing utilities
 * Validates mobile-first checklist requirements
 */

/**
 * Validate touch targets meet minimum size requirements
 * iOS: 44x44px minimum, Android: 48x48px minimum
 */
export async function validateTouchTargets(page: Page, minSize = 44) {
  const interactiveElements = await page.locator('button, a, input, [role="button"]').all();

  const violations: string[] = [];

  for (const element of interactiveElements) {
    const box = await element.boundingBox();
    if (box && (box.width < minSize || box.height < minSize)) {
      const text = await element.textContent();
      violations.push(`Element "${text?.substring(0, 30)}" is ${box.width}x${box.height}px (minimum: ${minSize}x${minSize}px)`);
    }
  }

  return violations;
}

/**
 * Check viewport meta tag configuration
 */
export async function validateViewportMeta(page: Page) {
  const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');

  const checks = {
    hasViewport: !!viewport,
    hasWidthDevice: viewport?.includes('width=device-width'),
    hasInitialScale: viewport?.includes('initial-scale=1'),
    hasViewportFit: viewport?.includes('viewport-fit=cover'),
  };

  return checks;
}

/**
 * Test horizontal scrolling (should not exist on mobile)
 */
export async function detectHorizontalScroll(page: Page) {
  const hasScroll = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });

  return hasScroll;
}

/**
 * Login helper for mobile testing
 * Supports both SME and Agency user types
 */
export async function loginAsMobile(page: Page, userType: 'sme' | 'agency') {
  const credentials = {
    sme: { email: 'sme.owner@example.com', password: 'LocalDevOnly123!' },
    agency: { email: 'agency.owner@example.com', password: 'LocalDevOnly123!' }
  };

  const user = credentials[userType];
  await page.goto('/login');

  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

/**
 * Validate safe area insets for iOS devices
 */
export async function validateSafeAreas(page: Page) {
  const hasSafeAreas = await page.evaluate(() => {
    const body = document.body;
    const styles = window.getComputedStyle(body);
    const padding = styles.paddingTop + styles.paddingBottom;
    return padding.includes('env(safe-area-inset');
  });

  return hasSafeAreas;
}

/**
 * Capture viewport screenshot for visual testing
 */
export async function captureViewport(page: Page, name: string) {
  await page.screenshot({
    path: `test-results/screenshots/${name}.png`,
    fullPage: false
  });
}

/**
 * Validate text readability (minimum font size)
 */
export async function validateTextReadability(page: Page) {
  const textElements = await page.locator('p, span, a, button, h1, h2, h3, h4, h5, h6').all();
  const violations: string[] = [];

  for (const element of textElements.slice(0, 50)) { // Check first 50 elements
    try {
      const fontSize = await element.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return parseFloat(styles.fontSize);
      });

      if (fontSize < 14) { // Minimum 14px for body text on mobile
        const text = await element.textContent();
        violations.push(`Text "${text?.substring(0, 30)}" is ${fontSize}px (minimum: 14px)`);
      }
    } catch (e) {
      // Element might not be visible or attached, skip
    }
  }

  return violations;
}

/**
 * Validate form usability on mobile
 */
export async function validateFormUsability(page: Page) {
  const formInputs = await page.locator('input, textarea, select').all();
  const violations: string[] = [];

  for (const input of formInputs) {
    const box = await input.boundingBox();
    if (box && box.height < 44) { // Minimum touch target
      const name = await input.getAttribute('name');
      violations.push(`Input "${name}" is ${box.height}px tall (minimum: 44px)`);
    }
  }

  return violations;
}

/**
 * Select an agent from the AgentQuickSelector dialog
 * @param page - Playwright page
 * @param agentName - Name of the agent (e.g., "Strategy", "Persona", "Content")
 */
export async function selectAgentFromQuickSelector(page: Page, agentName: string) {
  // Wait for the dialog to be visible
  await page.locator('[role="dialog"]').waitFor({ state: 'visible', timeout: 5000 });

  // Find and click the agent button within the dialog
  const agentButton = page.locator(`[role="dialog"] button:has-text("${agentName}")`).first();
  await agentButton.click();
}

/**
 * Navigate to an agent page using viewport-appropriate navigation
 * Mobile (<768px): Uses BottomNav + AgentQuickSelector
 * Tablet/Desktop (≥768px): Uses direct link navigation or sidebar
 * @param page - Playwright page
 * @param agentName - Name of the agent (e.g., "Strategy", "Persona", "Content")
 * @param viewportWidth - Current viewport width
 */
export async function navigateToAgent(page: Page, agentName: string, viewportWidth: number) {
  const agentPath = agentName.toLowerCase().replace(/\s+/g, '-');

  if (viewportWidth < 768) {
    // Mobile: Use BottomNav + AgentQuickSelector
    const agentsButton = page.locator('nav[aria-label="Bottom navigation"] button[aria-label="Agents"]');
    await agentsButton.click();
    await page.waitForTimeout(300);
    await selectAgentFromQuickSelector(page, agentName);
  } else {
    // Tablet/Desktop: Direct navigation to agent page
    await page.goto(`/${agentPath}`);
  }

  await page.waitForLoadState('networkidle');
}

/**
 * Navigate to campaigns page using viewport-appropriate navigation
 * Mobile (<768px): Uses BottomNav
 * Tablet/Desktop (≥768px): Uses direct link navigation
 * @param page - Playwright page
 * @param viewportWidth - Current viewport width
 */
export async function navigateToCampaigns(page: Page, viewportWidth: number) {
  if (viewportWidth < 768) {
    // Mobile: Use BottomNav
    const campaignsButton = page.locator('nav[aria-label="Bottom navigation"] a[aria-label="Campaigns"]');
    await campaignsButton.click();
  } else {
    // Tablet/Desktop: Direct navigation
    await page.goto('/campaigns');
  }

  await page.waitForLoadState('networkidle');
}
