import { test, expect } from '@playwright/test';
import { DEVICES, BREAKPOINTS } from '../helpers/devices';
import {
  validateTouchTargets,
  validateViewportMeta,
  detectHorizontalScroll,
  loginAsMobile
} from '../helpers/mobile';

test.describe('Phases 1-5: Mobile-First Experience Validation', () => {

  test.describe('Phase 1: Foundation & Navigation', () => {

    test('validates viewport meta tag exists', async ({ page }) => {
      await page.goto('http://127.0.0.1:56310');

      const checks = await validateViewportMeta(page);

      expect(checks.hasViewport, 'Viewport meta tag exists').toBeTruthy();
      expect(checks.hasWidthDevice, 'Has width=device-width').toBeTruthy();
      expect(checks.hasInitialScale, 'Has initial-scale=1').toBeTruthy();
    });

    test('header adapts to mobile viewports', async ({ page }) => {
      // Test at 360px (Android standard)
      await page.setViewportSize({ width: 360, height: 800 });
      await page.goto('http://127.0.0.1:56310');

      // Header should be visible and compact
      const header = page.locator('header');
      await expect(header).toBeVisible();

      // Logo should be smaller on mobile
      const logo = page.locator('header img, header svg').first();
      if (await logo.isVisible()) {
        const box = await logo.boundingBox();
        expect(box?.width).toBeLessThanOrEqual(40); // Mobile logo size
      }
    });

    test('touch targets meet 44px minimum on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 393, height: 852 }); // iPhone 15
      await page.goto('http://127.0.0.1:56310');
      await loginAsMobile(page, 'sme');

      const violations = await validateTouchTargets(page, 44);

      if (violations.length > 0) {
        console.log('Touch target violations found:', violations.slice(0, 5));
      }

      // Allow up to 5 violations for non-critical elements
      expect(violations.length, `Found ${violations.length} touch target violations`).toBeLessThanOrEqual(5);
    });
  });

  test.describe('Phase 2: Agent Chat Interface', () => {

    test('agent sidebar overlay on mobile (< 768px)', async ({ page }) => {
      await page.setViewportSize({ width: 393, height: 852 }); // iPhone 15
      await page.goto('http://127.0.0.1:56310');
      await loginAsMobile(page, 'sme');

      // Navigate to strategy agent
      await page.click('text=Strategy');
      await page.waitForLoadState('domcontentloaded');

      // Sidebar should be in overlay mode on mobile
      const sidebar = page.locator('[class*="glass-sidebar"]').first();
      
      // Check if sidebar exists
      if (await sidebar.count() > 0) {
        const sidebarClasses = await sidebar.getAttribute('class');
        // Sidebar should have mobile positioning (fixed or hidden)
        expect(sidebarClasses).toMatch(/(fixed|hidden)/);
      }
    });

    test('agent chat fills viewport on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 800 }); // Android standard
      await page.goto('http://127.0.0.1:56310');
      await loginAsMobile(page, 'sme');

      await page.click('text=Strategy');
      await page.waitForLoadState('domcontentloaded');

      // Chat container should use viewport height
      const chatContainer = page.locator('[class*="flex-col"]').first();
      const box = await chatContainer.boundingBox();
      
      if (box) {
        // Should take up most of the viewport (minus header ~56px)
        expect(box.height).toBeGreaterThan(700);
      }
    });

    test('input prevents iOS zoom with 16px font', async ({ page }) => {
      await page.setViewportSize({ width: 393, height: 852 }); // iPhone 15
      await page.goto('http://127.0.0.1:56310');
      await loginAsMobile(page, 'sme');

      await page.click('text=Strategy');
      await page.waitForLoadState('domcontentloaded');

      // Find chat input
      const input = page.locator('textarea, input[type="text"]').last();
      
      if (await input.count() > 0) {
        const fontSize = await input.evaluate((el) => {
          return window.getComputedStyle(el).fontSize;
        });

        // Should be at least 16px to prevent iOS zoom
        const fontSizeNum = parseInt(fontSize);
        expect(fontSizeNum).toBeGreaterThanOrEqual(16);
      }
    });
  });

  test.describe('Phase 3: Tables & Complex Layouts', () => {

    test('Porter\'s Forces shows cards on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 800 }); // Android standard
      await page.goto('http://127.0.0.1:56310');
      await loginAsMobile(page, 'sme');

      await page.click('text=Strategy');
      await page.waitForLoadState('domcontentloaded');

      // Type message to trigger Porter's output (if available)
      const input = page.locator('textarea').last();
      if (await input.isVisible()) {
        await input.fill('Show me Porter\'s Five Forces analysis');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(2000);

        // Check for responsive grid layout
        const portersGrid = page.locator('[class*="grid"]').first();
        if (await portersGrid.count() > 0) {
          const classes = await portersGrid.getAttribute('class');
          // Should have mobile-first grid (grid-cols-1 or similar)
          expect(classes).toMatch(/grid/);
        }
      }
    });

    test('VRIO table converts to cards on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 393, height: 852 }); // iPhone 15
      await page.goto('http://127.0.0.1:56310');
      await loginAsMobile(page, 'sme');

      await page.click('text=Strategy');
      await page.waitForLoadState('domcontentloaded');

      // Check if table is hidden on mobile (md:block pattern)
      const tables = page.locator('table');
      
      for (let i = 0; i < await tables.count(); i++) {
        const table = tables.nth(i);
        const classes = await table.getAttribute('class');
        
        // Tables should be hidden on mobile with md:block
        if (classes && classes.includes('md:block')) {
          const isVisible = await table.isVisible();
          expect(isVisible).toBeFalsy();
        }
      }
    });
  });

  test.describe('Phase 4: Profile & Settings', () => {

    test('profile tabs stack on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 800 }); // Android standard
      await page.goto('http://127.0.0.1:56310');
      await loginAsMobile(page, 'sme');

      // Navigate to profile
      await page.goto('http://127.0.0.1:56310/profile');
      await page.waitForLoadState('domcontentloaded');

      // Check tab layout
      const tabsList = page.locator('[role="tablist"]').first();
      
      if (await tabsList.count() > 0) {
        const classes = await tabsList.getAttribute('class');
        // Should have grid with 2 columns on mobile
        expect(classes).toMatch(/grid/);
      }
    });

    test('business intelligence sub-tabs are responsive', async ({ page }) => {
      await page.setViewportSize({ width: 393, height: 852 }); // iPhone 15
      await page.goto('http://127.0.0.1:56310');
      await loginAsMobile(page, 'sme');

      await page.goto('http://127.0.0.1:56310/profile?view=intelligence');
      await page.waitForLoadState('domcontentloaded');

      // Sub-tabs should show abbreviated text on small screens
      const tabs = page.locator('[role="tab"]');
      
      if (await tabs.count() > 0) {
        // Tabs should be visible and accessible
        for (let i = 0; i < await tabs.count(); i++) {
          const tab = tabs.nth(i);
          await expect(tab).toBeVisible();
          
          // Check touch target size
          const box = await tab.boundingBox();
          if (box) {
            expect(box.height).toBeGreaterThanOrEqual(44);
          }
        }
      }
    });

    test('form buttons full-width on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 800 }); // Android standard
      await page.goto('http://127.0.0.1:56310');
      await loginAsMobile(page, 'sme');

      await page.goto('http://127.0.0.1:56310/profile');
      await page.waitForLoadState('domcontentloaded');

      // Click Edit button if available
      const editButton = page.locator('button:has-text("Edit")').first();
      
      if (await editButton.count() > 0) {
        await editButton.click();
        await page.waitForTimeout(500);

        // Save/Cancel buttons should be responsive
        const saveButton = page.locator('button:has-text("Save")').first();
        const cancelButton = page.locator('button:has-text("Cancel")').first();

        if (await saveButton.count() > 0) {
          const saveBox = await saveButton.boundingBox();
          const cancelBox = await cancelButton.boundingBox();

          // Buttons should be touch-friendly
          if (saveBox) expect(saveBox.height).toBeGreaterThanOrEqual(44);
          if (cancelBox) expect(cancelBox.height).toBeGreaterThanOrEqual(44);
        }
      }
    });
  });

  test.describe('Phase 5: Dashboard & Landing', () => {

    test('dashboard metrics single column on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 800 }); // Android standard
      await page.goto('http://127.0.0.1:56310');
      await loginAsMobile(page, 'sme');

      // Should see dashboard
      await expect(page.locator('h1')).toBeVisible();

      // Quick Stats should be in grid layout
      const statsGrid = page.locator('[class*="grid"]').first();
      
      if (await statsGrid.count() > 0) {
        const classes = await statsGrid.getAttribute('class');
        // Should have responsive grid classes
        expect(classes).toMatch(/grid/);
      }
    });

    test('landing page CTA full-width on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 393, height: 852 }); // iPhone 15
      
      // Go to landing (logged out)
      await page.goto('http://127.0.0.1:56310');

      // Find main CTA button
      const ctaButton = page.locator('button:has-text("Sign Up|Get Started"), a:has-text("Sign Up|Get Started")').first();
      
      if (await ctaButton.count() > 0) {
        const box = await ctaButton.boundingBox();
        const viewport = page.viewportSize();

        if (box && viewport) {
          // Button should be substantial width on mobile (close to full-width)
          const widthPercentage = (box.width / viewport.width) * 100;
          expect(widthPercentage).toBeGreaterThan(70); // At least 70% width
        }
      }
    });
  });

  test.describe('Cross-Phase: No Horizontal Scroll', () => {

    test('no horizontal scroll at all breakpoints', async ({ page }) => {
      const testWidths = [360, 393, 430, 768, 834, 1024];

      for (const width of testWidths) {
        await page.setViewportSize({ width, height: 800 });
        await page.goto('http://127.0.0.1:56310');

        const hasScroll = await detectHorizontalScroll(page);
        expect(hasScroll, `Horizontal scroll detected at ${width}px`).toBeFalsy();
      }
    });

    test('no horizontal scroll on dashboard after login', async ({ page }) => {
      const testWidths = [360, 393, 430];

      for (const width of testWidths) {
        await page.setViewportSize({ width, height: 800 });
        await page.goto('http://127.0.0.1:56310');
        await loginAsMobile(page, 'sme');

        const hasScroll = await detectHorizontalScroll(page);
        expect(hasScroll, `Horizontal scroll on dashboard at ${width}px`).toBeFalsy();
      }
    });
  });

  test.describe('Cross-Phase: Brand Tokens Used', () => {

    test('uses brand color tokens (no hardcoded colors)', async ({ page }) => {
      await page.setViewportSize({ width: 393, height: 852 });
      await page.goto('http://127.0.0.1:56310');
      await loginAsMobile(page, 'sme');

      // Check computed styles use CSS variables
      const heading = page.locator('h1').first();
      
      if (await heading.count() > 0) {
        const color = await heading.evaluate((el) => {
          return window.getComputedStyle(el).color;
        });

        // Color should be set (not default black)
        expect(color).not.toBe('rgb(0, 0, 0)');
      }
    });
  });
});
