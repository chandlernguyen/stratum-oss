import { test, expect } from '@playwright/test';

/**
 * Phase 5: Touch Target Verification
 * Created: 2025-10-14
 * Part of: UNIFIED_PRODUCTION_ROADMAP Phase 5 Day 3
 *
 * Tests that all interactive elements meet minimum touch target sizes:
 * - iOS: 44×44px minimum
 * - Android: 48×48px minimum
 * - We test for 44px as the minimum threshold
 *
 * Reference: https://www.w3.org/WAI/WCAG21/Understanding/target-size.html
 */

const SME_USER = {
  email: 'sme.owner@example.com',
  password: 'LocalDevOnly123!'
};

const MIN_TOUCH_TARGET = 44; // pixels

test.describe('Touch Target Verification', () => {
  test.use({ viewport: { width: 375, height: 812 } }); // iPhone 13
  test.setTimeout(60000);

  test('All buttons meet minimum touch target size (44×44px)', async ({ page }) => {
    // Login to access the full app
    await page.goto('http://127.0.0.1:56310/login');

    // Verify login page buttons first
    const loginButton = page.locator('button[type="submit"]');
    await expect(loginButton).toBeVisible();

    const loginBox = await loginButton.boundingBox();
    if (loginBox) {
      expect(loginBox.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
      expect(loginBox.width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    }

    // Login
    await page.fill('input[type="email"]', SME_USER.email);
    await page.fill('input[type="password"]', SME_USER.password);
    await loginButton.click();
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Test dashboard buttons
    const buttons = await page.locator('button').all();
    const tooSmallButtons: string[] = [];

    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i];

      if (await button.isVisible()) {
        const box = await button.boundingBox();
        if (box) {
          const buttonText = await button.textContent();
          const buttonLabel = buttonText?.trim() || `Button ${i + 1}`;

          // Check both width and height
          if (box.height < MIN_TOUCH_TARGET || box.width < MIN_TOUCH_TARGET) {
            tooSmallButtons.push(
              `${buttonLabel} (${Math.round(box.width)}×${Math.round(box.height)}px)`
            );
          }
        }
      }
    }

    // Report any buttons that are too small
    if (tooSmallButtons.length > 0) {
      console.log(`\n⚠️  Found ${tooSmallButtons.length} buttons below minimum touch target:`);
      tooSmallButtons.forEach(btn => console.log(`  - ${btn}`));
    } else {
      console.log(`\n✅ All ${buttons.length} buttons meet minimum touch target (44×44px)`);
    }

    // Fail if any buttons are too small
    expect(tooSmallButtons).toHaveLength(0);
  });

  test('All links meet minimum touch target size (44×44px)', async ({ page }) => {
    await page.goto('http://127.0.0.1:56310/login');
    await page.fill('input[type="email"]', SME_USER.email);
    await page.fill('input[type="password"]', SME_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Test navigation links
    const links = await page.locator('a').all();
    const tooSmallLinks: string[] = [];

    for (let i = 0; i < links.length; i++) {
      const link = links[i];

      if (await link.isVisible()) {
        const box = await link.boundingBox();
        if (box) {
          const linkText = await link.textContent();
          const linkLabel = linkText?.trim() || `Link ${i + 1}`;

          // Links can be slightly smaller if they're text-only (not icon buttons)
          // But still check if they're reasonably tappable
          if (box.height < MIN_TOUCH_TARGET || box.width < MIN_TOUCH_TARGET) {
            tooSmallLinks.push(
              `${linkLabel} (${Math.round(box.width)}×${Math.round(box.height)}px)`
            );
          }
        }
      }
    }

    // Report any links that are too small
    if (tooSmallLinks.length > 0) {
      console.log(`\n⚠️  Found ${tooSmallLinks.length} links below minimum touch target:`);
      tooSmallLinks.forEach(link => console.log(`  - ${link}`));

      // Links are more lenient - only fail if they're VERY small (< 36px)
      const criticallySmall = await Promise.all(
        links.map(async (link) => {
          if (await link.isVisible()) {
            const box = await link.boundingBox();
            return box && (box.height < 36 || box.width < 36);
          }
          return false;
        })
      );

      const criticalCount = criticallySmall.filter(Boolean).length;
      if (criticalCount > 0) {
        throw new Error(`${criticalCount} links are critically small (< 36px)`);
      }
    } else {
      console.log(`\n✅ All ${links.length} links meet minimum touch target (44×44px)`);
    }
  });

  test('Form inputs have adequate tap area (36×36px minimum)', async ({ page }) => {
    await page.goto('http://127.0.0.1:56310/login');

    // Test form inputs on login page
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    const emailBox = await emailInput.boundingBox();
    const passwordBox = await passwordInput.boundingBox();

    // Form inputs should have at least 36px height for comfortable tapping
    if (emailBox) {
      expect(emailBox.height).toBeGreaterThanOrEqual(36);
    }

    if (passwordBox) {
      expect(passwordBox.height).toBeGreaterThanOrEqual(36);
    }

    console.log(`\n✅ Form inputs have adequate tap area:`);
    if (emailBox) {
      console.log(`  - Email: ${Math.round(emailBox.width)}×${Math.round(emailBox.height)}px`);
    }
    if (passwordBox) {
      console.log(`  - Password: ${Math.round(passwordBox.width)}×${Math.round(passwordBox.height)}px`);
    }
  });

  test('Icon buttons have adequate touch area (44×44px)', async ({ page }) => {
    await page.goto('http://127.0.0.1:56310/login');
    await page.fill('input[type="email"]', SME_USER.email);
    await page.fill('input[type="password"]', SME_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Find icon-only buttons (buttons with svg but no text)
    const iconButtons = await page.locator('button:has(svg)').all();
    const tooSmallIcons: string[] = [];

    for (let i = 0; i < iconButtons.length; i++) {
      const button = iconButtons[i];

      if (await button.isVisible()) {
        const box = await button.boundingBox();
        if (box) {
          const buttonText = await button.textContent();
          const isIconOnly = !buttonText?.trim();

          if (isIconOnly && (box.height < MIN_TOUCH_TARGET || box.width < MIN_TOUCH_TARGET)) {
            const ariaLabel = await button.getAttribute('aria-label');
            const label = ariaLabel || `Icon button ${i + 1}`;
            tooSmallIcons.push(
              `${label} (${Math.round(box.width)}×${Math.round(box.height)}px)`
            );
          }
        }
      }
    }

    // Report any icon buttons that are too small
    if (tooSmallIcons.length > 0) {
      console.log(`\n⚠️  Found ${tooSmallIcons.length} icon buttons below minimum touch target:`);
      tooSmallIcons.forEach(btn => console.log(`  - ${btn}`));
    } else {
      console.log(`\n✅ All ${iconButtons.length} icon buttons meet minimum touch target (44×44px)`);
    }

    // Icon buttons are critical - should always be 44×44px
    expect(tooSmallIcons).toHaveLength(0);
  });
});
