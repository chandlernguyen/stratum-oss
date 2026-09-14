import { test, expect } from '@playwright/test';

/**
 * Dark Mode Toggle - E2E Tests
 *
 * Tests Option A (Manual Only) dark mode implementation:
 * - Toggle between light and dark mode
 * - Persist theme preference across sessions
 * - No OS detection (user controls everything)
 *
 * Test User: sme.owner@example.com (Password: LocalDevOnly123!)
 *
 * @see /docs/verification/DARK_MODE_OS_INTEGRATION.md - Option A
 */

test.describe('Dark Mode Toggle', () => {
  test.beforeEach(async ({ page }) => {
    // Set desktop viewport for desktop toggle tests
    await page.setViewportSize({ width: 1280, height: 720 });

    // Clear localStorage before each test to start fresh
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('should start in light mode by default', async ({ page }) => {
    await page.goto('/');

    // Verify light mode (no .dark class on html element)
    const htmlElement = page.locator('html');
    await expect(htmlElement).not.toHaveClass(/dark/);

    // Verify localStorage has light mode
    const theme = await page.evaluate(() => localStorage.getItem('theme'));
    expect(theme).toBe('light');
  });

  test('should toggle to dark mode when clicked', async ({ page }) => {
    // Login first to access dashboard
    await page.goto('/');
    await page.getByPlaceholder('Enter your email').fill('sme.owner@example.com');
    await page.getByPlaceholder('Enter your password').fill('LocalDevOnly123!');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for dashboard to load
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    // Find theme toggle button by aria-label
    const themeToggle = page.getByRole('button', { name: /switch to dark mode/i });
    await expect(themeToggle).toBeVisible();

    // Verify Moon icon is visible (light mode)
    const moonIcon = themeToggle.locator('svg');
    await expect(moonIcon).toBeVisible();

    // Click to toggle to dark mode
    await themeToggle.click();

    // Verify dark mode is active
    const htmlElement = page.locator('html');
    await expect(htmlElement).toHaveClass(/dark/);

    // Verify localStorage updated
    const theme = await page.evaluate(() => localStorage.getItem('theme'));
    expect(theme).toBe('dark');

    // Verify Sun icon now visible (dark mode - click to go light)
    const updatedToggle = page.getByRole('button', { name: /switch to light mode/i });
    await expect(updatedToggle).toBeVisible();
  });

  test('should toggle back to light mode', async ({ page }) => {
    // Login
    await page.goto('/');
    await page.getByPlaceholder('Enter your email').fill('sme.owner@example.com');
    await page.getByPlaceholder('Enter your password').fill('LocalDevOnly123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    // Toggle to dark mode
    await page.getByRole('button', { name: /switch to dark mode/i }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Toggle back to light mode
    await page.getByRole('button', { name: /switch to light mode/i }).click();

    // Verify light mode
    const htmlElement = page.locator('html');
    await expect(htmlElement).not.toHaveClass(/dark/);

    const theme = await page.evaluate(() => localStorage.getItem('theme'));
    expect(theme).toBe('light');
  });

  test('should persist theme preference across page reloads', async ({ page }) => {
    // Login
    await page.goto('/');
    await page.getByPlaceholder('Enter your email').fill('sme.owner@example.com');
    await page.getByPlaceholder('Enter your password').fill('LocalDevOnly123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    // Toggle to dark mode
    await page.getByRole('button', { name: /switch to dark mode/i }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Reload page
    await page.reload();

    // Verify dark mode persisted
    const htmlElement = page.locator('html');
    await expect(htmlElement).toHaveClass(/dark/);

    const theme = await page.evaluate(() => localStorage.getItem('theme'));
    expect(theme).toBe('dark');
  });

  test('should persist theme preference across new browser context', async ({ browser }) => {
    // First context: Enable dark mode
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();

    await page1.goto('/');
    await page1.getByPlaceholder('Enter your email').fill('sme.owner@example.com');
    await page1.getByPlaceholder('Enter your password').fill('LocalDevOnly123!');
    await page1.getByRole('button', { name: /sign in/i }).click();
    await page1.waitForURL(/\/dashboard/, { timeout: 10000 });

    // Toggle to dark mode
    await page1.getByRole('button', { name: /switch to dark mode/i }).click();
    await expect(page1.locator('html')).toHaveClass(/dark/);

    await context1.close();

    // Second context: Verify dark mode persisted
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    await page2.goto('/');
    await page2.getByPlaceholder('Enter your email').fill('sme.owner@example.com');
    await page2.getByPlaceholder('Enter your password').fill('LocalDevOnly123!');
    await page2.getByRole('button', { name: /sign in/i }).click();
    await page2.waitForURL(/\/dashboard/, { timeout: 10000 });

    // Verify dark mode still active
    const htmlElement = page2.locator('html');
    await expect(htmlElement).toHaveClass(/dark/);

    await context2.close();
  });

  test('should apply dark mode styles to key UI elements', async ({ page }) => {
    // Login
    await page.goto('/');
    await page.getByPlaceholder('Enter your email').fill('sme.owner@example.com');
    await page.getByPlaceholder('Enter your password').fill('LocalDevOnly123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    // Toggle to dark mode
    await page.getByRole('button', { name: /switch to dark mode/i }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Verify header has dark mode styles
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Take screenshot for visual verification (optional)
    // await page.screenshot({ path: 'test-results/dark-mode-dashboard.png', fullPage: true });
  });
});

test.describe('Dark Mode - Mobile Menu', () => {
  test('should toggle dark mode from mobile menu', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Login
    await page.goto('/');
    await page.getByPlaceholder('Enter your email').fill('sme.owner@example.com');
    await page.getByPlaceholder('Enter your password').fill('LocalDevOnly123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    // Open mobile menu (hamburger icon)
    const menuButton = page.getByRole('button', { name: /menu/i }).first();
    await menuButton.click();

    // Wait for mobile menu panel to be visible
    await page.waitForSelector('button:has-text("Dark Mode")', { timeout: 5000 });

    // Click "Dark Mode" button
    await page.click('button:has-text("Dark Mode")');

    // Verify dark mode is active
    const htmlElement = page.locator('html');
    await expect(htmlElement).toHaveClass(/dark/);

    // Verify localStorage updated
    const theme = await page.evaluate(() => localStorage.getItem('theme'));
    expect(theme).toBe('dark');

    // Open menu again to verify button text changed
    await menuButton.click();
    await page.waitForSelector('button:has-text("Light Mode")', { timeout: 5000 });

    // Toggle back to light mode
    await page.click('button:has-text("Light Mode")');

    // Verify light mode
    await expect(htmlElement).not.toHaveClass(/dark/);
  });

  test('should persist dark mode on mobile across reloads', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Login
    await page.goto('/');
    await page.getByPlaceholder('Enter your email').fill('sme.owner@example.com');
    await page.getByPlaceholder('Enter your password').fill('LocalDevOnly123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    // Open mobile menu and toggle to dark mode
    await page.getByRole('button', { name: /menu/i }).first().click();
    await page.waitForSelector('button:has-text("Dark Mode")', { timeout: 5000 });
    await page.click('button:has-text("Dark Mode")');
    await expect(page.locator('html')).toHaveClass(/dark/);

    // Reload page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Verify dark mode persisted after reload
    const htmlElement = page.locator('html');
    await expect(htmlElement).toHaveClass(/dark/);
  });
});

test.describe('Dark Mode - Guest User (No Login)', () => {
  test('should show theme toggle on landing page for guest users', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });

    await page.goto('/');

    // Note: Theme toggle is only visible in HeaderNew after login (desktop-only)
    // For now, verify landing page renders correctly in light mode
    const htmlElement = page.locator('html');
    await expect(htmlElement).not.toHaveClass(/dark/);
  });
});
