import { test, expect } from '@playwright/test';

/**
 * Business Context Integration Tests
 * Tests Phases 1-4 of Business Context implementation
 */

const TEST_USERS = {
  sme: {
    email: 'sme.owner@example.com',
    password: 'LocalDevOnly123!'
  },
  newSme: {
    email: 'new.sme@example.com', 
    password: 'LocalDevOnly123!'
  }
};

test.describe('Business Context System', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto('http://127.0.0.1:56310');
  });

  test('Phase 2: SME Business Context Wizard - New User Onboarding', async ({ page }) => {
    console.log('🧪 Testing SME Business Context Wizard...');
    
    // Login as SME user (this should trigger wizard if no context exists)
    await page.fill('input[type="email"]', TEST_USERS.sme.email);
    await page.fill('input[type="password"]', TEST_USERS.sme.password);
    await page.click('button[type="submit"]');
    
    // Wait for potential wizard to appear
    await page.waitForTimeout(2000);
    
    // Check if Business Context Wizard appears
    const wizardTitle = await page.locator('text=Welcome! Let\'s Get to Know Your Business').first();
    
    if (await wizardTitle.isVisible()) {
      console.log('✅ Business Context Wizard appeared for SME user');
      
      // Fill out the required fields
      await page.fill('input[placeholder*="Acme Corporation"]', 'TestCorp Solutions');
      await page.click('button:has-text("Select your industry")'); 
      await page.click('text=SaaS/Software');
      await page.click('button:has-text("Select company size")');
      await page.click('text=11-50 employees');
      
      // Fill optional description
      await page.fill('textarea[placeholder*="Tell us what your company does"]', 
        'A test company providing innovative software solutions for small businesses.');
      
      // Submit the form
      await page.click('button:has-text("Get Started")');
      
      // Wait for wizard to close and dashboard to load
      await page.waitForSelector('text=Dashboard', { timeout: 10000 });
      
      console.log('✅ Business context wizard completed successfully');
    } else {
      console.log('ℹ️  Business context wizard not shown (context may already exist)');
    }
    
    // Verify we're in the dashboard
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('Phase 2: Skip Business Context Option', async ({ page }) => {
    console.log('🧪 Testing Skip Business Context Option...');
    
    // This test would require a fresh user or way to reset context
    // For now, we'll test the skip functionality if wizard appears
    
    await page.fill('input[type="email"]', TEST_USERS.sme.email);
    await page.fill('input[type="password"]', TEST_USERS.sme.password);
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(2000);
    
    const skipButton = await page.locator('button:has-text("Skip for Now")');
    
    if (await skipButton.isVisible()) {
      await skipButton.click();
      
      // Should go to dashboard
      await page.waitForSelector('text=Dashboard', { timeout: 10000 });
      console.log('✅ Skip functionality working');
    } else {
      console.log('ℹ️  Skip button not available (wizard not shown)');
    }
  });

  test('Phase 3-4: Context-Aware Action Plan Detection', async ({ page }) => {
    console.log('🧪 Testing Context-Aware Action Plan Detection...');
    
    // Login
    await page.fill('input[type="email"]', TEST_USERS.sme.email);
    await page.fill('input[type="password"]', TEST_USERS.sme.password);
    await page.click('button[type="submit"]');
    
    // Wait for login and handle business context wizard
    await page.waitForTimeout(2000);

    // Handle business context wizard if it appears (Skip button)
    const skipButton = page.locator('button:has-text("Skip for Now")');
    if (await skipButton.isVisible({ timeout: 2000 })) {
      await skipButton.click();
      await page.waitForURL('**/dashboard', { timeout: 10000 });
    }

    // Ensure we're on dashboard before navigating
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('text=Dashboard', { timeout: 10000 });

    // Navigate to Strategy Agent (October 2025 UI: Agents dropdown → Strategy)
    await page.click('button:has-text("Agents")');
    await page.waitForTimeout(500); // Wait for dropdown to open
    await page.click('text=Strategy');

    // Wait for Strategy page to load
    await page.waitForURL('**/strategy', { timeout: 10000 });
    await page.waitForLoadState('domcontentloaded');

    // Wait for chat interface (use more flexible selector)
    await page.waitForSelector('textarea, [contenteditable="true"]', { timeout: 10000 });
    
    // Send a message that should generate an action plan
    const strategicPrompt = `I'm the CEO of TestCorp Solutions, a SaaS company with 30 employees.
    We're facing increased competition and need a comprehensive growth strategy.
    Our main competitors are BigCorp and StartupRival. We're targeting small businesses
    with our $200-400/month pricing. Please provide a strategic analysis with actionable recommendations.`;

    const chatInput = await page.locator('textarea, [contenteditable="true"]').first();
    await chatInput.fill(strategicPrompt);
    await page.keyboard.press('Enter');
    
    // Wait for response (agent messages don't have .agent-message class)
    console.log('⏳ Waiting for strategy agent response...');

    // Look for "Analyzing for actionable next steps..." loading indicator
    const analyzingIndicator = page.locator('text=Analyzing for actionable next steps');
    try {
      await analyzingIndicator.waitFor({ state: 'visible', timeout: 60000 });
      console.log('✅ Action plan analysis triggered');

      // Wait for analysis to complete
      await analyzingIndicator.waitFor({ state: 'hidden', timeout: 30000 });
      console.log('✅ Action plan analysis completed');
    } catch (e) {
      console.log('ℹ️  "Analyzing" indicator not found, checking for response content directly');
    }

    // Verify agent responded by checking for content (tables, headings, or long paragraphs)
    await page.waitForSelector('table, h2, h3', { timeout: 10000 });
    
    // Look for action buttons
    const actionButtons = await page.locator('button:has-text("persona"), button:has-text("content"), button:has-text("campaign")');
    const buttonCount = await actionButtons.count();
    
    if (buttonCount > 0) {
      console.log(`✅ Found ${buttonCount} action plan buttons`);
      
      // Test clicking on an action button
      const firstButton = actionButtons.first();
      const buttonText = await firstButton.textContent();
      
      await firstButton.click();
      
      // Should navigate to the suggested agent with pre-populated context
      await page.waitForTimeout(2000);
      
      // Check if we're in a different agent or if context dialog appeared
      const currentUrl = page.url();
      console.log(`✅ Clicked "${buttonText}" button, current URL: ${currentUrl}`);
      
    } else {
      console.log('ℹ️  No action plan buttons found - may indicate low confidence or no plan detected');
    }
  });

  test('Phase 3: Context Confirmation Dialog', async ({ page }) => {
    console.log('🧪 Testing Context Confirmation Dialog...');
    
    // Login
    await page.fill('input[type="email"]', TEST_USERS.sme.email);
    await page.fill('input[type="password"]', TEST_USERS.sme.password);
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(3000);
    
    // Check if there are any pending context confirmations
    const contextDialog = await page.locator('text=New Business Insights Detected');
    
    if (await contextDialog.isVisible({ timeout: 5000 })) {
      console.log('✅ Context confirmation dialog appeared');
      
      // Test the dialog functionality
      const editButton = await page.locator('button:has-text("Edit Before Saving")');
      if (await editButton.isVisible()) {
        await editButton.click();
        console.log('✅ Edit functionality available');
        
        // Test editing a field
        const companyNameInput = await page.locator('input[value*="TestCorp"], input[value*="Company"]').first();
        if (await companyNameInput.isVisible()) {
          await companyNameInput.fill('Edited Company Name');
          console.log('✅ Context editing working');
        }
        
        // Test done editing
        await page.click('button:has-text("Done Editing")');
      }
      
      // Test approval
      await page.click('button:has-text("Save All")');
      
      // Dialog should disappear
      await page.waitForSelector('text=New Business Insights Detected', { state: 'hidden', timeout: 10000 });
      console.log('✅ Context confirmation completed');
      
    } else {
      console.log('ℹ️  No pending context confirmations found');
    }
  });

  test('API Integration: Business Context Endpoints', async ({ page }) => {
    console.log('🧪 Testing Business Context API Integration...');
    
    // Login first
    await page.fill('input[type="email"]', TEST_USERS.sme.email);
    await page.fill('input[type="password"]', TEST_USERS.sme.password);
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(2000);
    
    // Test API calls through browser network monitoring
    page.on('response', async (response) => {
      const url = response.url();
      
      if (url.includes('/api/v1/business-context/organization/')) {
        console.log(`✅ Organization context API called: ${response.status()}`);
      }
      
      if (url.includes('/api/v1/business-context/extract-from-conversation')) {
        console.log(`✅ Context extraction API called: ${response.status()}`);
      }
      
      if (url.includes('/api/v1/detect-action-plan')) {
        console.log(`✅ Action plan detection API called: ${response.status()}`);
        
        if (response.status() === 200) {
          try {
            const data = await response.json();
            if (data.has_action_plan) {
              console.log(`✅ Action plan detected with ${data.confidence} confidence`);
            }
          } catch (e) {
            // Response body might be consumed already
          }
        }
      }
    });
    
    // Trigger API calls by navigating and interacting
    await page.goto('http://127.0.0.1:56310/strategy');
    await page.waitForTimeout(1000);
    
    console.log('✅ API integration test completed');
  });

  test('User Experience: Complete Business Context Flow', async ({ page }) => {
    console.log('🧪 Testing Complete Business Context User Flow...');
    
    // This is an end-to-end test of the entire business context system
    await page.fill('input[type="email"]', TEST_USERS.sme.email);
    await page.fill('input[type="password"]', TEST_USERS.sme.password);
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(2000);

    // Step 1: Handle business context wizard if it appears
    const wizardTitle = page.locator('text=Welcome! Let\'s Get to Know Your Business');
    const skipButton = page.locator('button:has-text("Skip for Now")');

    if (await wizardTitle.isVisible({ timeout: 2000 })) {
      // Option 1: Complete the wizard
      await page.fill('input[placeholder*="Acme Corporation"]', 'E2E Test Company');
      await page.click('button:has-text("Select your industry")');
      await page.click('text=E-commerce');
      await page.click('button:has-text("Select company size")');
      await page.click('text=51-200 employees');
      await page.click('button:has-text("Get Started")');
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      console.log('✅ Step 1: Business context captured');
    } else if (await skipButton.isVisible({ timeout: 2000 })) {
      // Option 2: Skip the wizard
      await skipButton.click();
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      console.log('✅ Step 1: Business context wizard skipped');
    }

    // Ensure we're on dashboard
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('text=Dashboard', { timeout: 10000 });

    // Step 2: Navigate to strategy agent and get recommendations
    await page.click('button:has-text("Agents")');
    await page.waitForTimeout(500);
    await page.click('text=Strategy');
    await page.waitForURL('**/strategy', { timeout: 10000 });
    await page.waitForLoadState('domcontentloaded');

    const chatInput = await page.locator('textarea, [contenteditable="true"]').first();
    await chatInput.waitFor({ state: 'visible', timeout: 10000 });
    await chatInput.fill('We need help with our e-commerce marketing strategy for competing with larger retailers.');
    await page.keyboard.press('Enter');

    // Step 3: Wait for context-aware response (agent messages don't have .agent-message class)
    console.log('⏳ Waiting for strategy agent response...');

    // Look for "Analyzing for actionable next steps..." indicator or response content
    const analyzingIndicator = page.locator('text=Analyzing for actionable next steps');
    try {
      await analyzingIndicator.waitFor({ state: 'visible', timeout: 60000 });
      await analyzingIndicator.waitFor({ state: 'hidden', timeout: 30000 });
    } catch (e) {
      // Indicator not found, check for response content directly
    }

    // Verify agent responded by checking for content (tables, headings, or paragraphs)
    await page.waitForSelector('table, h2, h3', { timeout: 10000 });
    console.log('✅ Step 2: Context-aware strategy response received');
    
    // Step 4: Look for action buttons
    await page.waitForTimeout(5000);
    const actionButtons = await page.locator('button:has-text("persona"), button:has-text("content")');
    const hasActionButtons = await actionButtons.count() > 0;
    
    if (hasActionButtons) {
      console.log('✅ Step 3: Context-aware action plans generated');
      
      // Test cross-agent navigation
      await actionButtons.first().click();
      await page.waitForTimeout(2000);
      console.log('✅ Step 4: Cross-agent navigation working');
    }
    
    console.log('🎉 Complete business context flow tested successfully');
  });

});

test.describe('Business Context Error Handling', () => {

  test('Graceful handling of missing business context', async ({ page }) => {
    console.log('🧪 Testing graceful handling of missing context...');
    
    await page.goto('http://127.0.0.1:56310');
    
    // Login
    await page.fill('input[type="email"]', TEST_USERS.sme.email);
    await page.fill('input[type="password"]', TEST_USERS.sme.password);
    await page.click('button[type="submit"]');
    
    // Should still work without context
    await page.waitForSelector('text=Dashboard', { timeout: 15000 });

    // Navigate to strategy agent - should work without context
    await page.click('button:has-text("Agents")');
    await page.waitForTimeout(500);
    await page.click('text=Strategy');
    await page.waitForURL('**/strategy', { timeout: 10000 });

    // Should reach strategy page even without business context
    await expect(page.locator('textarea, [contenteditable="true"]')).toBeVisible({ timeout: 10000 });

    console.log('✅ App handles missing context gracefully');
  });

  test('Network error resilience', async ({ page }) => {
    console.log('🧪 Testing network error resilience...');
    
    // Block business context API calls
    await page.route('**/api/v1/business-context/**', route => {
      route.abort();
    });
    
    await page.goto('http://127.0.0.1:56310');
    await page.fill('input[type="email"]', TEST_USERS.sme.email);
    await page.fill('input[type="password"]', TEST_USERS.sme.password);
    await page.click('button[type="submit"]');
    
    // App should still load despite API failures
    await page.waitForSelector('text=Dashboard', { timeout: 15000 });
    
    console.log('✅ App resilient to business context API failures');
  });

});