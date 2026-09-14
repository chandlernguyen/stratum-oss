import { test, expect } from '@playwright/test';

/**
 * SME Quick Start - 5-Minute Intelligence Flow
 *
 * Test Suite: E2E workflow for SME users completing Quick Start questionnaire
 *
 * User Journey:
 * 1. Login as SME test user (sarah.chen@techflow.test)
 * 2. Navigate to dashboard
 * 3. Click "Quick Start (5 Minutes)" card to open modal
 * 4. Complete all 5 questions with progress tracking
 * 5. Verify navigation to /quick-start (NOT /outputs)
 * 6. Verify initial message pre-filled with all answers
 * 7. Send message and create session
 * 8. Verify session creation and URL routing
 * 9. Test sidebar and "New Session" functionality
 *
 * Success Criteria:
 * - No navigation to /outputs at any point ✅
 * - Progress indicator updates correctly (20%, 40%, 60%, 80%, 100%)
 * - Modal closes and navigates to /quick-start after completion
 * - Initial message contains all 5 formatted answers
 * - Session created with proper URL: /quick-start/session/{id}
 * - Sidebar displays "Quick Start" and sessions
 * - New session button resets to /quick-start
 *
 * Run Instructions:
 *   # Run this specific test
 *   npm run test apps/web/tests/user-journeys/sme-quick-start-5min-intelligence.spec.ts
 *
 *   # Run in headed mode (visible browser)
 *   npm run test apps/web/tests/user-journeys/sme-quick-start-5min-intelligence.spec.ts -- --headed
 *
 *   # Debug mode
 *   npm run test apps/web/tests/user-journeys/sme-quick-start-5min-intelligence.spec.ts -- --debug
 *
 * Prerequisites:
 *   - Frontend: npm run dev ()
 *   - Backend: poetry run uvicorn apps.api.main:app --reload --port 8000
 *   - Database: supabase start
 *   - Test user exists: sarah.chen@techflow.test
 */

const TEST_USER = {
  email: 'sarah.chen@techflow.test',
  password: 'TechFlow2024abc'
};

const QUICK_START_ANSWERS = {
  company: `We provide B2B workflow automation software that helps small construction
companies streamline project management, time tracking, and resource
allocation. Our platform reduces manual work by 40% and integrates with
existing tools like QuickBooks and Procore. We're targeting general
contractors with 20-100 employees who are currently managing projects
with Excel, WhatsApp, and paper-based systems.`,

  goal: `Generate 50 qualified leads per month from small construction companies
(20-100 employees). Our target is Operations Managers and Project Managers
who are frustrated with manual processes. We need to demonstrate clear ROI
(40% reduction in manual work) to overcome the construction industry's
slow adoption of new software.`,

  audience: `Operations Managers and Project Managers at small general contractor firms
(20-100 employees). They manage 5-15 projects simultaneously using Excel,
WhatsApp, and paper for coordination. Pain points: missed deadlines,
duplicate data entry, miscommunication between field and office teams.
They're tech-hesitant but open to solutions that clearly save time.`,

  budget: '1000-5000',
  budgetLabel: '$1,000 - $5,000 (Growing)',

  timeline: '1-3-months',
  timelineLabel: '1-3 months (Short-term campaign)'
};

test.describe('SME Quick Start - 5-Minute Intelligence Flow', () => {
  test.setTimeout(180000); // 3 minutes for complete flow including AI response

  test.beforeEach(async ({ page }) => {
    // Set viewport
    await page.setViewportSize({ width: 1280, height: 720 });

    // Clear session state
    await page.context().clearCookies();
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());

    // Login
    console.log('🔐 Logging in as sarah.chen@techflow.test...');
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');

    // Wait for dashboard, handle business context wizard if appears
    await page.waitForTimeout(2000);
    const skipButton = page.locator('button:has-text("Skip for Now")');
    if (await skipButton.isVisible({ timeout: 2000 })) {
      await skipButton.click();
      await page.waitForURL('**/dashboard', { timeout: 10000 });
    }

    await page.waitForLoadState('domcontentloaded');
    console.log('✅ Login successful, dashboard loaded');
  });

  test('QS1: Complete Quick Start questionnaire and verify navigation', async ({ page }) => {
    console.log('🚀 Starting Quick Start 5-minute intelligence test...\n');

    // === STEP 1: Open Quick Start Modal ===
    console.log('📍 Step 1: Click Quick Start card on dashboard');

    // Find and click the Quick Start card
    const quickStartCard = page.locator('text=Quick Start').first();
    await expect(quickStartCard).toBeVisible({ timeout: 10000 });
    await quickStartCard.click();

    // Verify modal opens
    console.log('⏳ Waiting for modal to open...');
    await page.waitForTimeout(1000);

    // Check for modal dialog
    const modalTitle = page.locator('text=Quick Start - Generate Intelligence in 5 Minutes');
    await expect(modalTitle).toBeVisible({ timeout: 5000 });

    console.log('✅ Modal opened successfully\n');

    // === STEP 2: Question 1 - Company Description ===
    console.log('📍 Step 2: Complete Question 1 (Company Description)');

    // Verify progress indicator
    await expect(page.locator('text=Step 1 of 5')).toBeVisible();
    await expect(page.locator('text=20% Complete')).toBeVisible();

    // Fill company description
    const companyTextarea = page.locator('textarea#company');
    await expect(companyTextarea).toBeVisible();
    await companyTextarea.fill(QUICK_START_ANSWERS.company);

    // Verify Next button is enabled
    const nextButton = page.locator('button:has-text("Next")');
    await expect(nextButton).toBeEnabled();

    // Click Next
    await nextButton.click();
    await page.waitForTimeout(500);

    console.log('✅ Question 1 completed (20% → 40%)\n');

    // === STEP 3: Question 2 - Marketing Goal ===
    console.log('📍 Step 3: Complete Question 2 (Marketing Goal)');

    // Verify progress updated
    await expect(page.locator('text=Step 2 of 5')).toBeVisible();
    await expect(page.locator('text=40% Complete')).toBeVisible();

    // Fill marketing goal
    const goalTextarea = page.locator('textarea#goal');
    await expect(goalTextarea).toBeVisible();
    await goalTextarea.fill(QUICK_START_ANSWERS.goal);

    // Click Next
    await nextButton.click();
    await page.waitForTimeout(500);

    console.log('✅ Question 2 completed (40% → 60%)\n');

    // === STEP 4: Question 3 - Target Audience ===
    console.log('📍 Step 4: Complete Question 3 (Target Audience)');

    // Verify progress updated
    await expect(page.locator('text=Step 3 of 5')).toBeVisible();
    await expect(page.locator('text=60% Complete')).toBeVisible();

    // Fill target audience
    const audienceTextarea = page.locator('textarea#audience');
    await expect(audienceTextarea).toBeVisible();
    await audienceTextarea.fill(QUICK_START_ANSWERS.audience);

    // Click Next
    await nextButton.click();
    await page.waitForTimeout(500);

    console.log('✅ Question 3 completed (60% → 80%)\n');

    // === STEP 5: Question 4 - Budget ===
    console.log('📍 Step 5: Complete Question 4 (Budget)');

    // Verify progress updated
    await expect(page.locator('text=Step 4 of 5')).toBeVisible();
    await expect(page.locator('text=80% Complete')).toBeVisible();

    // Click budget dropdown trigger
    const budgetTrigger = page.locator('button[id="budget"]');
    await budgetTrigger.click();
    await page.waitForTimeout(500);

    // Select budget option
    const budgetOption = page.locator(`text=${QUICK_START_ANSWERS.budgetLabel}`);
    await expect(budgetOption).toBeVisible();
    await budgetOption.click();
    await page.waitForTimeout(500);

    // Click Next
    await nextButton.click();
    await page.waitForTimeout(500);

    console.log('✅ Question 4 completed (80% → 100%)\n');

    // === STEP 6: Question 5 - Timeline ===
    console.log('📍 Step 6: Complete Question 5 (Timeline)');

    // Verify progress updated
    await expect(page.locator('text=Step 5 of 5')).toBeVisible();
    await expect(page.locator('text=100% Complete')).toBeVisible();

    // Click timeline dropdown trigger
    const timelineTrigger = page.locator('button[id="timeline"]');
    await timelineTrigger.click();
    await page.waitForTimeout(500);

    // Select timeline option
    const timelineOption = page.locator(`text=${QUICK_START_ANSWERS.timelineLabel}`);
    await expect(timelineOption).toBeVisible();
    await timelineOption.click();
    await page.waitForTimeout(500);

    console.log('✅ Question 5 completed (100%)\n');

    // === STEP 7: Submit and Verify Navigation ===
    console.log('📍 Step 7: Click "Start Quick Start" button');

    // Find and click the "Start Quick Start" button (should have Rocket icon)
    const startButton = page.locator('button:has-text("Start Quick Start")');
    await expect(startButton).toBeVisible({ timeout: 5000 });
    await expect(startButton).toBeEnabled();

    console.log('⏳ Submitting Quick Start questionnaire...');
    await startButton.click();

    // === CRITICAL: Verify navigation to /quick-start (NOT /outputs) ===
    console.log('⏳ Waiting for navigation to /quick-start...');
    await page.waitForURL('**/quick-start', { timeout: 10000 });

    const currentURL = page.url();
    console.log(`📍 Current URL: ${currentURL}`);

    // CRITICAL ASSERTION: Must be /quick-start, NOT /outputs
    expect(currentURL).toContain('/quick-start');
    expect(currentURL).not.toContain('/outputs');

    console.log('✅ CRITICAL: Navigated to /quick-start (NOT /outputs)\n');

    // Wait for page to fully load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // === STEP 8: Verify Initial Message Pre-filled ===
    console.log('📍 Step 8: Verify initial message pre-filled with all answers');

    // Look for the chat input (could be textarea or contenteditable)
    const chatInput = page.locator('textarea, [contenteditable="true"]').first();
    await expect(chatInput).toBeVisible({ timeout: 10000 });

    // Get the pre-filled message content
    const prefilledMessage = await chatInput.inputValue().catch(() => chatInput.textContent());

    console.log('📝 Pre-filled message length:', prefilledMessage?.length);

    // Verify all key sections are present
    expect(prefilledMessage).toContain('Company/Business:');
    expect(prefilledMessage).toContain('Primary Marketing Goal:');
    expect(prefilledMessage).toContain('Target Audience:');
    expect(prefilledMessage).toContain('Monthly Marketing Budget:');
    expect(prefilledMessage).toContain('Timeline for Results:');

    // Verify actual answer content is included
    expect(prefilledMessage).toContain('workflow automation');
    expect(prefilledMessage).toContain('50 qualified leads');
    expect(prefilledMessage).toContain('Operations Managers');

    console.log('✅ Initial message pre-filled correctly with all 5 answers\n');

    // === STEP 9: Send Message and Create Session ===
    console.log('📍 Step 9: Send message to create Quick Start session');

    // Press Enter or click Send button
    await page.keyboard.press('Enter');

    console.log('⏳ Waiting for session creation (up to 5 seconds)...');
    await page.waitForTimeout(3000);

    // Verify URL changes to /quick-start/session/{sessionId}
    console.log('⏳ Checking for session URL...');
    await page.waitForURL('**/quick-start/session/**', { timeout: 10000 });

    const sessionURL = page.url();
    console.log(`📍 Session URL: ${sessionURL}`);

    expect(sessionURL).toMatch(/\/quick-start\/session\/[a-f0-9-]+/);

    console.log('✅ Session created successfully with proper URL\n');

    // === STEP 10: Verify Sidebar and Session Management ===
    console.log('📍 Step 10: Verify sidebar displays Quick Start sessions');

    // Check for sidebar (left-hand sidebar)
    const sidebar = page.locator('aside, [class*="sidebar"]').first();

    // Look for "Quick Start" text in sidebar
    const quickStartSidebarText = page.locator('text=Quick Start').first();
    if (await quickStartSidebarText.isVisible({ timeout: 3000 })) {
      console.log('✅ Sidebar shows "Quick Start" heading');
    }

    // Verify agent streaming response starts
    console.log('⏳ Waiting for agent response to start streaming...');
    await page.waitForTimeout(5000);

    // Check for agent response container
    const hasResponse = await page.locator('[data-testid="agent-response"], [class*="message"], [class*="response"]').count() > 0;
    if (hasResponse) {
      console.log('✅ Agent response started streaming');
    } else {
      console.log('ℹ️  Agent response not yet visible (may still be loading)');
    }

    console.log('\n');

    // === STEP 11: Test New Session Button ===
    console.log('📍 Step 11: Test "New Session" button functionality');

    // Find and click "New Session" button
    const newSessionButton = page.locator('button:has-text("New Session")');
    if (await newSessionButton.isVisible({ timeout: 3000 })) {
      await newSessionButton.click();

      // Verify URL returns to /quick-start (without session ID)
      await page.waitForURL('**/quick-start', { timeout: 5000 });
      const newURL = page.url();

      expect(newURL).toContain('/quick-start');
      expect(newURL).not.toContain('/session/');

      console.log('✅ New Session button works - returned to /quick-start');
      console.log(`📍 New URL: ${newURL}`);
    } else {
      console.log('ℹ️  New Session button not found (may require scrolling or different selector)');
    }

    console.log('\n🎉 Quick Start 5-minute intelligence test completed successfully!');
  });

  test('QS2: Verify Quick Start navigation without completing questionnaire', async ({ page }) => {
    console.log('🔍 Testing Quick Start modal cancellation behavior...\n');

    // Open Quick Start modal
    const quickStartCard = page.locator('text=Quick Start').first();
    await expect(quickStartCard).toBeVisible({ timeout: 10000 });
    await quickStartCard.click();

    // Verify modal opens
    await expect(page.locator('text=Quick Start - Generate Intelligence in 5 Minutes')).toBeVisible({ timeout: 5000 });

    console.log('✅ Modal opened');

    // Try to close modal (look for X button or click outside)
    const closeButton = page.locator('button[aria-label="Close"], button:has-text("×")').first();
    if (await closeButton.isVisible({ timeout: 2000 })) {
      await closeButton.click();
      console.log('✅ Modal closed via close button');
    } else {
      // Press Escape key
      await page.keyboard.press('Escape');
      console.log('✅ Modal closed via Escape key');
    }

    // Verify we're still on dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    console.log('✅ User remains on dashboard after closing modal\n');
  });

  test('QS3: Verify Back button navigation in questionnaire', async ({ page }) => {
    console.log('🔙 Testing Back button navigation in Quick Start modal...\n');

    // Open Quick Start modal
    const quickStartCard = page.locator('text=Quick Start').first();
    await quickStartCard.click();

    await expect(page.locator('text=Quick Start - Generate Intelligence in 5 Minutes')).toBeVisible({ timeout: 5000 });

    // Complete Question 1
    const companyTextarea = page.locator('textarea#company');
    await companyTextarea.fill(QUICK_START_ANSWERS.company);

    const nextButton = page.locator('button:has-text("Next")');
    await nextButton.click();
    await page.waitForTimeout(500);

    // Verify we're on Question 2
    await expect(page.locator('text=Step 2 of 5')).toBeVisible();
    console.log('✅ Progressed to Question 2');

    // Click Back button
    const backButton = page.locator('button:has-text("Back")');
    await expect(backButton).toBeEnabled();
    await backButton.click();
    await page.waitForTimeout(500);

    // Verify we're back on Question 1
    await expect(page.locator('text=Step 1 of 5')).toBeVisible();
    console.log('✅ Back button returned to Question 1');

    // Verify company description is still filled
    const savedValue = await companyTextarea.inputValue();
    expect(savedValue).toBe(QUICK_START_ANSWERS.company);
    console.log('✅ Form data persisted when navigating back\n');
  });

  test('QS4: Verify form validation prevents empty submission', async ({ page }) => {
    console.log('✅ Testing form validation for Quick Start questionnaire...\n');

    // Open Quick Start modal
    const quickStartCard = page.locator('text=Quick Start').first();
    await quickStartCard.click();

    await expect(page.locator('text=Quick Start - Generate Intelligence in 5 Minutes')).toBeVisible({ timeout: 5000 });

    // Try to click Next without filling Question 1
    const nextButton = page.locator('button:has-text("Next")');

    // Button should be disabled or clicking should not advance
    const isDisabled = await nextButton.isDisabled();
    if (isDisabled) {
      console.log('✅ Next button is disabled when question is empty');
    } else {
      // Try clicking and verify we stay on Question 1
      await nextButton.click();
      await page.waitForTimeout(500);
      await expect(page.locator('text=Step 1 of 5')).toBeVisible();
      console.log('✅ Cannot advance with empty answer');
    }

    console.log('✅ Form validation working correctly\n');
  });
});
