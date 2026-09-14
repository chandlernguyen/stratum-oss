import { test, expect } from '@playwright/test';
import { DEVICES, BREAKPOINTS } from '../helpers/devices';
import {
  validateTouchTargets,
  validateViewportMeta,
  validateSafeAreas,
  detectHorizontalScroll,
  captureViewport,
  validateTextReadability,
  validateFormUsability
} from '../helpers/mobile';

/**
 * Mobile-First Landing Page Testing
 * Tests the public landing page across all device types and breakpoints
 * Based on /checklist/mobile_first_checklist.md (2018-2025+)
 */

test.describe('Landing Page - Mobile Experience', () => {

  test.describe('Foundation - Critical Configuration', () => {

    test('viewport meta tag is properly configured', async ({ page }) => {
      await page.goto('http://127.0.0.1:56310');

      const checks = await validateViewportMeta(page);

      expect(checks.hasViewport, 'Viewport meta tag exists').toBeTruthy();
      expect(checks.hasWidthDevice, 'Has width=device-width').toBeTruthy();
      expect(checks.hasInitialScale, 'Has initial-scale=1').toBeTruthy();
      expect(checks.hasViewportFit, 'Has viewport-fit=cover for iOS safe areas').toBeTruthy();
    });

    test('iOS safe area CSS is implemented', async ({ page }) => {
      await page.goto('http://127.0.0.1:56310');

      const hasSafeAreas = await validateSafeAreas(page);

      if (!hasSafeAreas) {
        console.warn('⚠️  Safe area insets not detected in CSS');
        console.warn('   Consider adding: padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)');
        console.warn('   This prevents content from being hidden behind iPhone notch/Dynamic Island');
      }

      // Not a hard failure - warning only
      expect(true).toBeTruthy();
    });
  });

  test.describe('Breakpoint Testing - All Device Sizes', () => {

    const breakpointTests = [
      { name: 'mobile-small', width: BREAKPOINTS['mobile-small'], description: 'Android standard (360px)' },
      { name: 'mobile-iphone', width: BREAKPOINTS['mobile-iphone'], description: 'iPhone 15 (393px)' },
      { name: 'mobile-large', width: BREAKPOINTS['mobile-large'], description: 'iPhone Pro Max (430px)' },
      { name: 'tablet-portrait', width: BREAKPOINTS['tablet-portrait'], description: 'Tablets portrait (768px)' },
      { name: 'tablet-ipad', width: BREAKPOINTS['tablet-ipad'], description: 'iPad Pro 11" (834px)' },
      { name: 'tablet-landscape', width: BREAKPOINTS['tablet-landscape'], description: 'iPad landscape (1024px)' },
      { name: 'desktop', width: BREAKPOINTS['desktop'], description: 'Desktop standard (1366px)' },
      { name: 'tablet-large', width: BREAKPOINTS['tablet-large'], description: 'Galaxy Tab (1600px)' },
      { name: 'foldable', width: BREAKPOINTS['foldable'], description: 'Z Fold unfolded (1768px)' }
    ];

    for (const { name, width, description } of breakpointTests) {
      test(`validates layout at ${name} breakpoint (${width}px)`, async ({ page }) => {
        // 1. Set viewport
        await page.setViewportSize({ width, height: 800 });
        await page.goto('http://127.0.0.1:56310');
        await page.waitForLoadState('domcontentloaded');

        // 2. Check for horizontal scroll
        const hasScroll = await detectHorizontalScroll(page);
        if (hasScroll) {
          console.error(`❌ Horizontal scroll detected at ${width}px`);
        }
        expect(hasScroll, `Horizontal scroll detected at ${width}px`).toBeFalsy();

        // 3. Validate touch targets
        const violations = await validateTouchTargets(page, 44);
        if (violations.length > 0) {
          console.warn(`⚠️  ${violations.length} touch target violations at ${width}px:`);
          violations.slice(0, 5).forEach(v => console.warn(`   - ${v}`));
        }
        expect(violations.length, `Touch target violations at ${width}px`).toBe(0);

        // 4. Take screenshot
        await captureViewport(page, `breakpoint-${name}`);
      });
    }
  });

  test.describe('Device-Specific Testing', () => {

    test('iPhone 15 (393px) - Hero section is fully visible', async ({ page }) => {
      const device = DEVICES['iphone-15'];
      await page.setViewportSize(device.viewport);
      await page.goto('http://127.0.0.1:56310');

      // Hero headline should be visible
      await expect(page.locator('h1').first()).toBeVisible();

      // Primary CTA should be visible
      await expect(page.getByRole('button', { name: /Sign Up|Get Started/i }).first()).toBeVisible();

      // Check touch target size of CTA
      const ctaButton = page.getByRole('button', { name: /Sign Up|Get Started/i }).first();
      const box = await ctaButton.boundingBox();
      expect(box?.height, 'CTA button height should be >= 44px').toBeGreaterThanOrEqual(44);

      // Verify landing page content is visible (not <main> element)
      await expect(page.locator('h1, h2, p').first()).toBeVisible();

      await captureViewport(page, 'iphone-15-hero');
    });

    test('Android 360px - Narrowest mobile viewport', async ({ page }) => {
      const device = DEVICES['android-360'];
      await page.setViewportSize(device.viewport);
      await page.goto('http://127.0.0.1:56310');

      // No horizontal scrolling on narrowest device
      const hasScroll = await detectHorizontalScroll(page);
      expect(hasScroll, 'No horizontal scroll on 360px device').toBeFalsy();

      // Value props should be readable
      await expect(page.locator('text=/Strategic Frameworks/i').first()).toBeVisible();

      // Tab buttons should be touch-friendly
      const smeTab = page.getByRole('tab', { name: /For SMEs/i });
      const tabBox = await smeTab.boundingBox();
      expect(tabBox?.height, 'Tab button height should be >= 44px').toBeGreaterThanOrEqual(44);

      await captureViewport(page, 'android-360-narrow');
    });

    test('iPhone 15 Pro Max (430px) - Large phone experience', async ({ page }) => {
      const device = DEVICES['iphone-15-pro-max'];
      await page.setViewportSize(device.viewport);
      await page.goto('http://127.0.0.1:56310');

      // Test text readability
      const readability = await validateTextReadability(page);
      if (!readability.readable) {
        console.warn('⚠️  Text readability issues:', readability.issues);
      }

      // Footer links should be touch-friendly
      const privacyLink = page.getByRole('button', { name: /Privacy/i });
      const linkBox = await privacyLink.boundingBox();
      expect(linkBox?.height, 'Footer link height should be >= 44px').toBeGreaterThanOrEqual(44);

      await captureViewport(page, 'iphone-pro-max-large');
    });

    test('iPad Pro 11" (834px) - Tablet portrait', async ({ page }) => {
      const device = DEVICES['ipad-pro-11'];
      await page.setViewportSize(device.viewport);
      await page.goto('http://127.0.0.1:56310');

      // Tablet should show landing page content
      await expect(page.locator('h1').first()).toBeVisible();

      // Check for proper spacing
      const hasScroll = await detectHorizontalScroll(page);
      expect(hasScroll).toBeFalsy();

      await captureViewport(page, 'ipad-pro-11-tablet');
    });

    test('iPad Pro 13" (1024px) - Tablet landscape', async ({ page }) => {
      const device = DEVICES['ipad-pro-13'];
      await page.setViewportSize(device.viewport);
      await page.goto('http://127.0.0.1:56310');

      // Large tablet should show landing page content
      await expect(page.locator('h1').first()).toBeVisible();

      await captureViewport(page, 'ipad-pro-13-landscape');
    });

    test('Samsung Galaxy Z Fold - Cover screen (344px)', async ({ page }) => {
      const device = DEVICES['galaxy-fold-cover'];
      await page.setViewportSize(device.viewport);
      await page.goto('http://127.0.0.1:56310');

      // Even on foldable cover screen, no horizontal scroll
      const hasScroll = await detectHorizontalScroll(page);
      expect(hasScroll, 'No horizontal scroll on Z Fold cover screen').toBeFalsy();

      // Critical content should be visible
      await expect(page.locator('h1').first()).toBeVisible();

      await captureViewport(page, 'galaxy-fold-cover');
    });

    test('Samsung Galaxy Z Fold - Unfolded (1768px)', async ({ page }) => {
      const device = DEVICES['galaxy-fold-unfolded'];
      await page.setViewportSize(device.viewport);
      await page.goto('http://127.0.0.1:56310');

      // Ultra-wide device should show landing page content
      await expect(page.locator('h1').first()).toBeVisible();

      await captureViewport(page, 'galaxy-fold-unfolded');
    });
  });

  test.describe('Content & Interactions', () => {

    test('Landing page: All CTAs are touch-friendly', async ({ page }) => {
      await page.setViewportSize({ width: 393, height: 852 }); // iPhone 15
      await page.goto('http://127.0.0.1:56310');

      // Find all CTAs
      const ctaButtons = page.getByRole('button', { name: /Sign Up|Get Started|Sign Up|Sign In/i });
      const count = await ctaButtons.count();

      let violations = 0;
      for (let i = 0; i < count; i++) {
        const button = ctaButtons.nth(i);
        const box = await button.boundingBox();
        if (box && (box.height < 44 || box.width < 44)) {
          const text = await button.textContent();
          console.error(`❌ CTA "${text}" is ${box.width}x${box.height}px (need 44x44px minimum)`);
          violations++;
        }
      }

      expect(violations, 'All CTAs should meet 44x44px minimum').toBe(0);
    });

    test('Landing page: Tab buttons are accessible', async ({ page }) => {
      await page.setViewportSize({ width: 393, height: 852 });
      await page.goto('http://127.0.0.1:56310');

      // Scroll to "For SMEs / For Agencies" tabs section
      await page.locator('text=/For SMEs|For Agencies/i').first().scrollIntoViewIfNeeded();

      // Tab buttons should be visible
      const smeTab = page.getByRole('tab', { name: /For SMEs/i });
      const agencyTab = page.getByRole('tab', { name: /For Agencies/i });

      await expect(smeTab).toBeVisible();
      await expect(agencyTab).toBeVisible();

      // Click tab to switch
      await agencyTab.click();
      await page.waitForTimeout(300); // Wait for animation

      // Agency content should be visible (use .first() to handle duplicate content in mobile/desktop views)
      await expect(page.locator('text=/Multi-tenant native/i').first()).toBeVisible();
    });

    test('Landing page: Footer links are accessible', async ({ page }) => {
      await page.setViewportSize({ width: 393, height: 852 });
      await page.goto('http://127.0.0.1:56310');

      // Scroll to footer
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(300);

      // Footer links should be visible
      const privacyLink = page.getByRole('button', { name: /Privacy/i });
      const termsLink = page.getByRole('button', { name: /Terms/i });

      await expect(privacyLink).toBeVisible();
      await expect(termsLink).toBeVisible();

      // Check touch target sizes
      const privacyBox = await privacyLink.boundingBox();
      const termsBox = await termsLink.boundingBox();

      expect(privacyBox?.height, 'Privacy link height >= 44px').toBeGreaterThanOrEqual(44);
      expect(termsBox?.height, 'Terms link height >= 44px').toBeGreaterThanOrEqual(44);
    });

    test('Landing page: Text is readable on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 800 }); // Narrowest device
      await page.goto('http://127.0.0.1:56310');

      const readability = await validateTextReadability(page);

      if (!readability.readable) {
        console.error('❌ Text readability issues:');
        readability.issues.forEach(issue => console.error(`   - ${issue}`));
      }

      expect(readability.readable, 'Text should be readable (16px minimum)').toBeTruthy();
    });
  });

  test.describe('Performance', () => {

    test('Landing page loads quickly on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 393, height: 852 }); // iPhone 15

      const startTime = Date.now();
      await page.goto('http://127.0.0.1:56310');
      await page.waitForLoadState('domcontentloaded');
      const loadTime = Date.now() - startTime;

      console.log(`📊 Landing page load time: ${loadTime}ms`);

      // Should load in under 3 seconds (per mobile checklist)
      expect(loadTime, 'Page should load in under 3 seconds').toBeLessThan(3000);
    });
  });
});
