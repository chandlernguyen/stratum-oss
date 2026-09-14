import { test, expect } from '@playwright/test'

const TEST_URL = 'http://localhost:56310'

test.describe('OAuth Buttons', () => {
  test('login page shows Google and Apple OAuth buttons', async ({ page }) => {
    await page.goto(`${TEST_URL}/login`)
    await page.waitForLoadState('domcontentloaded')

    // Google button should be visible
    const googleBtn = page.locator('button', { hasText: /Continue with Google/i })
    await expect(googleBtn).toBeVisible()

    // Apple button should be visible
    const appleBtn = page.locator('button', { hasText: /Continue with Apple/i })
    await expect(appleBtn).toBeVisible()

    // Divider text should be visible
    await expect(page.locator('text=/Or continue with/i')).toBeVisible()
  })

  test('signup page shows Google and Apple OAuth buttons', async ({ page }) => {
    await page.goto(`${TEST_URL}/signup`)
    await page.waitForLoadState('domcontentloaded')

    // Google button should be visible
    const googleBtn = page.locator('button', { hasText: /Continue with Google/i })
    await expect(googleBtn).toBeVisible()

    // Apple button should be visible
    const appleBtn = page.locator('button', { hasText: /Continue with Apple/i })
    await expect(appleBtn).toBeVisible()
  })

  test('login page does NOT have Turnstile captcha', async ({ page }) => {
    await page.goto(`${TEST_URL}/login`)
    await page.waitForLoadState('domcontentloaded')

    // Turnstile iframe should not be present on login
    const turnstile = page.locator('iframe[src*="turnstile"]')
    await expect(turnstile).toHaveCount(0)
  })

  test('auth callback route exists and redirects when no code', async ({ page }) => {
    // Visiting /auth/callback without a valid code should redirect to login
    await page.goto(`${TEST_URL}/auth/callback`)
    // Should redirect to login since there's no valid code
    await page.waitForURL('**/login', { timeout: 10000 })
  })

  test('auth callback with PKCE verifier in sessionStorage redirects to login when Supabase rejects', async ({ page }) => {
    const PKCE_VERIFIER = 'test_pkce_verifier_' + crypto.randomUUID().replace(/-/g, '')

    // Pre-seed sessionStorage with PKCE state before navigating to callback
    await page.goto(`${TEST_URL}/login`)
    await page.evaluate((verifier) => {
      sessionStorage.setItem('stratum_pkce_verifier', verifier)
      sessionStorage.setItem('stratum_pkce_provider', 'apple')
    }, PKCE_VERIFIER)

    // Navigate to callback with a fake auth code — Supabase will reject it
    await page.goto(`${TEST_URL}/auth/callback?code=fake_auth_code_12345`)

    // Should redirect to login since Supabase rejects the fake code
    await page.waitForURL('**/login', { timeout: 10000 })
  })

  test('auth callback with PKCE verifier sets supabase localStorage key', async ({ page }) => {
    const PKCE_VERIFIER = 'test_pkce_verifier_' + crypto.randomUUID().replace(/-/g, '')

    await page.goto(`${TEST_URL}/login`)
    await page.evaluate((verifier) => {
      sessionStorage.setItem('stratum_pkce_verifier', verifier)
      sessionStorage.setItem('stratum_pkce_provider', 'apple')
    }, PKCE_VERIFIER)

    await page.goto(`${TEST_URL}/auth/callback?code=fake_auth_code_12345`)

    // Wait for redirect
    await page.waitForURL('**/login', { timeout: 10000 })

    // Navigate back to login page to check localStorage state in the same origin
    const storedVerifier = await page.evaluate(() => {
      return localStorage.getItem('supabase.auth.token-code-verifier')
    })

    // The PKCE state should be cleaned up after exchange attempt
    expect(storedVerifier).toBeNull()
  })

  test('auth callback cleans up sessionStorage PKCE state after exchange attempt', async ({ page }) => {
    const PKCE_VERIFIER = 'test_pkce_verifier_' + crypto.randomUUID().replace(/-/g, '')

    await page.goto(`${TEST_URL}/login`)
    await page.evaluate((verifier) => {
      sessionStorage.setItem('stratum_pkce_verifier', verifier)
      sessionStorage.setItem('stratum_pkce_provider', 'apple')
    }, PKCE_VERIFIER)

    await page.goto(`${TEST_URL}/auth/callback?code=fake_auth_code_12345`)
    await page.waitForURL('**/login', { timeout: 10000 })

    // Navigate to a page on same origin to check sessionStorage
    await page.goto(`${TEST_URL}/login`)
    const pkceState = await page.evaluate(() => ({
      verifier: sessionStorage.getItem('stratum_pkce_verifier'),
      provider: sessionStorage.getItem('stratum_pkce_provider'),
    }))

    expect(pkceState.verifier).toBeNull()
    expect(pkceState.provider).toBeNull()
  })

  test('auth callback without PKCE verifier redirects to login with error', async ({ page }) => {
    // Listen for console errors
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto(`${TEST_URL}/auth/callback?code=fake_auth_code_12345`)
    await page.waitForURL('**/login', { timeout: 10000 })

    // Should have logged the missing verifier error
    expect(consoleErrors.some((e) => e.includes('missing PKCE code verifier'))).toBeTruthy()
  })
})
