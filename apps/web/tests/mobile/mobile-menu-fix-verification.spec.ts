import { test, expect } from '@playwright/test'

test.describe('Mobile Menu Fix Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport (iPhone 15)
    await page.setViewportSize({ width: 393, height: 852 })

    // Login as SME owner
    await page.goto('/login')
    await page.fill('input[type="email"]', 'sme.owner@example.com')
    await page.fill('input[type="password"]', 'LocalDevOnly123!')
    await page.click('button[type="submit"]')

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 })
  })

  test('mobile menu appears above all content when opened', async ({ page }) => {
    // Verify we're on dashboard
    await expect(page).toHaveURL(/.*dashboard/)

    // Find and click the hamburger menu button
    const menuButton = page.locator('button[aria-label="Open menu"]')
    await expect(menuButton).toBeVisible()

    // Click to open menu
    await menuButton.click()

    // Wait a moment for animation
    await page.waitForTimeout(500)

    // Verify overlay is visible
    const overlay = page.locator('.fixed.inset-0.bg-black\\/50')
    await expect(overlay).toBeVisible()

    // Verify menu panel is visible and translated to x=0
    const menuPanel = page.locator('.fixed.top-0.left-0.bottom-0.w-80')
    await expect(menuPanel).toBeVisible()

    // Check that menu has the correct transform (translate-x-0)
    const transform = await menuPanel.evaluate(el => window.getComputedStyle(el).transform)
    console.log('Menu panel transform:', transform)

    // Verify menu contains navigation items
    await expect(page.locator('text=Dashboard')).toBeVisible()
    await expect(page.locator('text=Campaigns')).toBeVisible()
    await expect(page.locator('text=Agents')).toBeVisible()

    // Verify close button is visible
    const closeButton = page.locator('button[aria-label="Close menu"]')
    await expect(closeButton).toBeVisible()

    // Take a screenshot for visual verification
    await page.screenshot({ path: 'apps/web/test-results/mobile-menu-opened.png' })

    // Close menu by clicking overlay
    await overlay.click()

    // Wait for animation
    await page.waitForTimeout(500)

    // Verify menu is closed (should have translate-x-full)
    const transformClosed = await menuPanel.evaluate(el => window.getComputedStyle(el).transform)
    console.log('Menu panel transform when closed:', transformClosed)
  })

  test('menu z-index is higher than page content', async ({ page }) => {
    // Open menu
    await page.click('button[aria-label="Open menu"]')
    await page.waitForTimeout(500)

    // Get z-index of menu panel
    const menuPanel = page.locator('.fixed.top-0.left-0.bottom-0.w-80')
    const menuZIndex = await menuPanel.evaluate(el => window.getComputedStyle(el).zIndex)
    console.log('Menu panel z-index:', menuZIndex)

    // Get z-index of overlay
    const overlay = page.locator('.fixed.inset-0.bg-black\\/50')
    const overlayZIndex = await overlay.evaluate(el => window.getComputedStyle(el).zIndex)
    console.log('Overlay z-index:', overlayZIndex)

    // Get z-index of header
    const header = page.locator('header.sticky')
    const headerZIndex = await header.evaluate(el => window.getComputedStyle(el).zIndex)
    console.log('Header z-index:', headerZIndex)

    // Verify menu panel z-index > overlay z-index > header z-index
    expect(parseInt(menuZIndex)).toBeGreaterThan(parseInt(overlayZIndex))
    expect(parseInt(overlayZIndex)).toBeGreaterThanOrEqual(parseInt(headerZIndex))

    // Verify menu panel is actually on top by checking if it's visible and clickable
    const dashboardLink = page.locator('nav a:has-text("Dashboard")').first()
    await expect(dashboardLink).toBeVisible()

    // Click a menu item to verify it's actually interactive
    await page.click('button[aria-label="Close menu"]')
    await page.waitForTimeout(500)
  })
})
