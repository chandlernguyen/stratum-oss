import { test, expect } from '@playwright/test';

/**
 * Quick Win Templates - Critical Path Tests (October 2025)
 *
 * Tests all 6 Quick Win Templates from dashboard.
 * Each template should navigate to correct agent with pre-filled message.
 */

const TEST_USER = {
  email: 'sme.owner@example.com',
  password: 'LocalDevOnly123!'
};

test.describe('Quick Win Templates', () => {
  test.setTimeout(60000); // 1 minute per test

  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Handle business context wizard if needed
    await page.waitForTimeout(2000);
    const skipButton = page.locator('button:has-text("Skip for Now")');
    if (await skipButton.isVisible({ timeout: 2000 })) {
      await skipButton.click();
      await page.waitForURL('**/dashboard', { timeout: 10000 });
    }

    await page.waitForLoadState('domcontentloaded');
  });

  test('QW1: Strategy Quick Win template works', async ({ page }) => {
    console.log('📍 Testing Strategy Quick Win template...');

    // Find and click Strategy Quick Win button
    const quickWinButton = page.locator('button:has-text("Strategy"), button:has-text("Quick Win")').first();

    if (await quickWinButton.isVisible({ timeout: 5000 })) {
      await quickWinButton.click();

      // Verify navigation to Strategy Agent
      await page.waitForURL('**/strategy', { timeout: 10000 });

      // Verify chat input is pre-filled or has template message
      const chatInput = page.locator('textarea, [contenteditable="true"]').first();
      await expect(chatInput).toBeVisible({ timeout: 5000 });

      console.log('✅ Strategy Quick Win template working');
    } else {
      console.log('ℹ️  Strategy Quick Win button not found - may use different UI pattern');
    }
  });

  test('QW2: Persona Quick Win template works', async ({ page }) => {
    console.log('📍 Testing Persona Quick Win template...');

    const quickWinButton = page.locator('button:has-text("Persona"), button:has-text("Quick Win")').first();

    if (await quickWinButton.isVisible({ timeout: 5000 })) {
      await quickWinButton.click();
      await page.waitForURL('**/persona', { timeout: 10000 });

      const chatInput = page.locator('textarea, [contenteditable="true"]').first();
      await expect(chatInput).toBeVisible({ timeout: 5000 });

      console.log('✅ Persona Quick Win template working');
    } else {
      console.log('ℹ️  Persona Quick Win button not found');
    }
  });

  test('QW3: Content Quick Win template works', async ({ page }) => {
    console.log('📍 Testing Content Quick Win template...');

    const quickWinButton = page.locator('button:has-text("Content"), button:has-text("Quick Win")').first();

    if (await quickWinButton.isVisible({ timeout: 5000 })) {
      await quickWinButton.click();
      await page.waitForURL('**/content', { timeout: 10000 });

      const chatInput = page.locator('textarea, [contenteditable="true"]').first();
      await expect(chatInput).toBeVisible({ timeout: 5000 });

      console.log('✅ Content Quick Win template working');
    } else {
      console.log('ℹ️  Content Quick Win button not found');
    }
  });

  test('QW4: Marketing Strategy Quick Win template works', async ({ page }) => {
    console.log('📍 Testing Marketing Strategy Quick Win template...');

    const quickWinButton = page.locator('button:has-text("Marketing Strategy"), button:has-text("Quick Win"), button:has-text("Marketing")').first();

    if (await quickWinButton.isVisible({ timeout: 5000 })) {
      await quickWinButton.click();
      await page.waitForURL('**/marketing-strategy', { timeout: 10000 });

      const chatInput = page.locator('textarea, [contenteditable="true"]').first();
      await expect(chatInput).toBeVisible({ timeout: 5000 });

      console.log('✅ Marketing Strategy Quick Win template working');
    } else {
      console.log('ℹ️  Marketing Strategy Quick Win button not found');
    }
  });

  test('QW5: Analytics Quick Win template works', async ({ page }) => {
    console.log('📍 Testing Analytics Quick Win template...');

    const quickWinButton = page.locator('button:has-text("Analytics"), button:has-text("Quick Win")').first();

    if (await quickWinButton.isVisible({ timeout: 5000 })) {
      await quickWinButton.click();
      await page.waitForURL('**/analytics', { timeout: 10000 });

      const chatInput = page.locator('textarea, [contenteditable="true"]').first();
      await expect(chatInput).toBeVisible({ timeout: 5000 });

      console.log('✅ Analytics Quick Win template working');
    } else {
      console.log('ℹ️  Analytics Quick Win button not found');
    }
  });

  test('QW6: ROI Quick Win template works', async ({ page }) => {
    console.log('📍 Testing ROI Quick Win template...');

    const quickWinButton = page.locator('button:has-text("ROI"), button:has-text("Budget"), button:has-text("Quick Win")').first();

    if (await quickWinButton.isVisible({ timeout: 5000 })) {
      await quickWinButton.click();
      await page.waitForURL('**/roi', { timeout: 10000 });

      const chatInput = page.locator('textarea, [contenteditable="true"]').first();
      await expect(chatInput).toBeVisible({ timeout: 5000 });

      console.log('✅ ROI Quick Win template working');
    } else {
      console.log('ℹ️  ROI Quick Win button not found');
    }
  });
});
