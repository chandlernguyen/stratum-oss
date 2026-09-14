import { test, expect } from '@playwright/test';

test.describe('Strategy Agent UI', () => {
  // Test credentials from environment variables
  const TEST_EMAIL = process.env.SME_OWNER_EMAIL || 'sme.owner@example.com';
  const TEST_PASSWORD = process.env.SME_OWNER_PASSWORD || 'LocalDevOnly123!';
  
  // Helper function to login
  async function login(page) {
    // '/login' is where the sign-in form renders. The app root is the public
    // marketing landing page and has no email input, so navigating there and
    // waiting for one always timed out.
    await page.goto('http://127.0.0.1:56310/login');
    
    // Wait for the login page to load
    await page.waitForSelector('button:has-text("Sign in")', { timeout: 5000 });
    
    // Use the "Use Test Credentials" button if available
    const testCredButton = page.locator('button:has-text("Use Test Credentials")');
    if (await testCredButton.isVisible()) {
      await testCredButton.click();
      // Wait a moment for credentials to be filled
      await page.waitForTimeout(500);
    } else {
      // Fill in test credentials manually
      await page.fill('input[type="email"]', TEST_EMAIL);
      await page.fill('input[type="password"]', TEST_PASSWORD);
    }
    
    // Submit the form
    await page.click('button:has-text("Sign in")');
    
    // Wait for navigation away from login page
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
    
    // Additional wait to ensure dashboard is loaded
    await page.waitForLoadState('domcontentloaded');
  }
  
  test('should display Strategy Agent page with proper styling', async ({ page }) => {
    // First login
    await login(page);

    // Navigate to the Strategy Agent page
    await page.goto('http://127.0.0.1:56310/strategy')

    // Wait for the page to load
    await page.waitForLoadState('domcontentloaded');

    // The agent page heading. This used to assert a "Strategy Sessions" sidebar
    // and a "New Strategy Sessions" button, neither of which exists in the
    // current UI — the page is now a chat surface with a "Business Strategy
    // Agent" heading, and it has no session sidebar.
    await expect(page.getByText('Business Strategy Agent').first()).toBeVisible();

    // The message composer, identified by its placeholder rather than by
    // position, so adding another input does not silently break this.
    const chatInput = page.getByPlaceholder(/ask about business strategy/i);
    await expect(chatInput).toBeVisible();

    // The page has interactive controls beyond navigation chrome.
    expect(await page.locator('button').count()).toBeGreaterThan(1);

    // Verify CSS is loaded by checking that a real control carries classes.
    const hasClass = await chatInput.evaluate(el => el.className.length > 0);
    expect(hasClass).toBe(true);
  });

  test('should send a message to strategy agent', async ({ page }) => {
    // First login
    await login(page);

    await page.goto('http://127.0.0.1:56310/strategy')
    await page.waitForLoadState('domcontentloaded');

    // Type a message into the composer.
    const chatInput = page.getByPlaceholder(/ask about business strategy/i);
    await expect(chatInput).toBeVisible();
    await chatInput.fill('Run a SWOT analysis for my business');

    // Press Enter to send (often easier than finding the button)
    await chatInput.press('Enter');

    // Wait for the response to start appearing
    await page.waitForTimeout(2000);

    // Check if the user message appears in the chat
    const userMessage = page.locator('text="Run a SWOT analysis for my business"');
    await expect(userMessage).toBeVisible();

    // Check if there's a response from the agent (looking for any response indicator)
    // The agent should start responding with some text
    const agentResponse = page.locator('.prose').first();
    await expect(agentResponse).toBeVisible({ timeout: 10000 });
  });
});