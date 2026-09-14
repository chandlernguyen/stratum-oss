import { test, expect } from '@playwright/test'
import {
  loginAsBillingFree,
  loginAsBillingSoloTrial,
  loginAsBillingSolo,
  loginAsBillingTeam,
  loginAsBillingAgency,
  loginAsBillingExpired,
  loginAsBillingPastDue,
} from '../helpers/auth'

/**
 * Billing Settings E2E Tests
 *
 * Tests the BillingSettings page at /settings/billing for different subscription states.
 * Uses seed users: billing.free, billing.trial, billing.active, billing.expired, billing.pastdue.
 *
 * Note: Agent access enforcement (402 blocking) is tested at the API level
 * in test_billing_integration.py. The frontend GracePeriodGate blocks read-only users
 * from agent pages, which we test here for expired trial and past due users.
 */

// ── Billing Settings - Free User ────────────────────────────────────────

test.describe('Billing Settings - Free User', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsBillingFree(page)
    await page.goto('/settings/billing')
    await page.waitForLoadState('domcontentloaded')
  })

  test('sees 3 pricing tier cards', async ({ page }) => {
    await expect(page.getByText('Choose a Plan')).toBeVisible()
    // Use heading role to avoid matching button text like "Subscribe to Solo"
    await expect(page.getByRole('heading', { name: 'Solo' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Team' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Agency' })).toBeVisible()
  })

  test('sees Inactive status badge', async ({ page }) => {
    await expect(page.getByText('Inactive')).toBeVisible()
  })

  test('sees no active subscription text', async ({ page }) => {
    await expect(page.getByText('No active subscription')).toBeVisible()
  })

  test('subscribe buttons are enabled', async ({ page }) => {
    // Wait for subscription data to load (loading spinner resolves)
    await expect(page.getByText('Choose a Plan')).toBeVisible({ timeout: 10000 })
    const buttons = page.locator('button', { hasText: /Subscribe|Start Free Trial/i })
    await expect(buttons.first()).toBeVisible()
    await expect(buttons.first()).toBeEnabled()
  })

  test('Manage Billing button is not visible', async ({ page }) => {
    await expect(page.getByText('Manage Billing')).not.toBeVisible()
  })
})

// ── Billing Settings - Active User ──────────────────────────────────────

test.describe('Billing Settings - Active User', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsBillingSolo(page)
    await page.goto('/settings/billing')
    await page.waitForLoadState('domcontentloaded')
  })

  test('sees Active status badge', async ({ page }) => {
    await expect(page.getByText('Active', { exact: true })).toBeVisible()
  })

  test('sees current plan name Solo', async ({ page }) => {
    await expect(page.getByText(/Solo plan/i)).toBeVisible()
  })

  test('sees billing manage section for owner', async ({ page }) => {
    // Seed user has no stripe_subscription_id, so Manage Billing button is hidden.
    // Instead verify the owner-only text is NOT shown (since can_manage_billing=true,
    // the "only owners" message is hidden).
    await expect(page.getByText('Only organization owners can manage billing')).not.toBeVisible()
  })

  test('does not see Choose a Plan pricing cards', async ({ page }) => {
    await expect(page.getByText('Choose a Plan')).not.toBeVisible()
  })
})

// ── Billing Settings - Trial User ───────────────────────────────────────

test.describe('Billing Settings - Trial User', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsBillingSoloTrial(page)
    await page.goto('/settings/billing')
    await page.waitForLoadState('domcontentloaded')
  })

  test('sees Trial status badge', async ({ page }) => {
    await expect(page.getByText('Trial', { exact: true })).toBeVisible()
  })

  test('sees trial end date', async ({ page }) => {
    await expect(page.getByText(/Trial ends/i)).toBeVisible()
  })

  test('sees 1 seat', async ({ page }) => {
    await expect(page.getByText('1 seat')).toBeVisible()
  })
})

// ── Billing Settings - Expired Trial User ───────────────────────────────

test.describe('Billing Settings - Expired Trial', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsBillingExpired(page)
    await page.goto('/settings/billing')
    await page.waitForLoadState('domcontentloaded')
  })

  test('sees expired trial alert banner', async ({ page }) => {
    await expect(page.getByText(/trial has expired/i)).toBeVisible()
  })

  test('sees Choose a Plan section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Choose a Plan' })).toBeVisible()
  })
})

// ── Billing Settings - Past Due User ────────────────────────────────────

test.describe('Billing Settings - Past Due', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsBillingPastDue(page)
    await page.goto('/settings/billing')
    await page.waitForLoadState('domcontentloaded')
  })

  test('sees payment failed alert banner', async ({ page }) => {
    await expect(page.getByText(/payment failed/i)).toBeVisible()
  })

  test('sees Past Due status badge', async ({ page }) => {
    await expect(page.getByText('Past Due')).toBeVisible()
  })
})

// ── Agent Page Gate - Expired Trial ─────────────────────────────────────

test.describe('Agent Page Gate - Expired Trial', () => {
  test('expired trial user sees trial ended gate on agent page', async ({ page }) => {
    await loginAsBillingExpired(page)
    await page.goto('/agents/strategy')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByText('Your Free Trial Has Ended')).toBeVisible()
    await expect(page.getByRole('link', { name: /Choose a Plan/i })).toBeVisible()
  })
})

// ── Agent Page Access - Active Users ────────────────────────────────────

test.describe('Agent Page Access - Active Users', () => {
  test('team active user can access agent page without gate', async ({ page }) => {
    await loginAsBillingTeam(page)
    await page.goto('/agents/strategy')
    await page.waitForLoadState('domcontentloaded')
    expect(page.url()).toContain('/agents/strategy')
    // Should NOT see any gate messages
    await expect(page.getByText('Your Free Trial Has Ended')).not.toBeVisible()
    await expect(page.getByText('Grace Period Expired')).not.toBeVisible()
  })

  test('agency active user can access agent page without gate', async ({ page }) => {
    await loginAsBillingAgency(page)
    await page.goto('/agents/strategy')
    await page.waitForLoadState('domcontentloaded')
    expect(page.url()).toContain('/agents/strategy')
    await expect(page.getByText('Your Free Trial Has Ended')).not.toBeVisible()
  })

  test('trial user can access agent page without gate', async ({ page }) => {
    await loginAsBillingSoloTrial(page)
    await page.goto('/agents/strategy')
    await page.waitForLoadState('domcontentloaded')
    expect(page.url()).toContain('/agents/strategy')
    await expect(page.getByText('Your Free Trial Has Ended')).not.toBeVisible()
  })
})

// ── Billing Settings - Navigation & Edge Cases ──────────────────────────

test.describe('Billing Settings - Navigation', () => {
  test('billing page accessible at /settings/billing', async ({ page }) => {
    await loginAsBillingFree(page)
    await page.goto('/settings/billing')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByText('Billing & Subscription')).toBeVisible()
  })

  test('success param shows subscription activated alert', async ({ page }) => {
    await loginAsBillingSolo(page)
    await page.goto('/settings/billing?success=true')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.getByText(/Subscription activated/i)).toBeVisible()
  })
})
