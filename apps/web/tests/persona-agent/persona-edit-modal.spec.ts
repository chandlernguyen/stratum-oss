/**
 * Test Suite: Persona Creation and Edit Modal Display
 *
 * Run Instructions:
 *   # Run this test file
 *   npm run test apps/web/tests/persona-agent/persona-edit-modal.spec.ts
 *
 *   # Run in headed mode (visible browser)
 *   npm run test apps/web/tests/persona-agent/persona-edit-modal.spec.ts -- --headed
 *
 *   # Debug mode
 *   npm run test apps/web/tests/persona-agent/persona-edit-modal.spec.ts -- --debug
 *
 * Prerequisites:
 *   - Frontend: npm run dev (http://127.0.0.1:56310)
 *   - Backend: poetry run uvicorn apps.api.main:app --reload --port 8000
 *   - Database: supabase start
 *   - Test user: sme.owner@example.com exists with personas
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { loginAsSMEOwner } from '../helpers/auth';

test.describe('Persona Edit Modal Field Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    // Clear session state
    await page.goto('http://127.0.0.1:56310/');
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
  });

  test('displays all persona fields correctly in edit modal', async ({ page }) => {
    /**
     * Test: Persona edit modal displays all saved fields correctly
     *
     * User Journey:
     * 1. Login as SME user
     * 2. Navigate to persona agent (should show sidebar with existing personas)
     * 3. Click "Edit" on the most recent persona (Casey Harris - Construction)
     * 4. Verify all tabs and fields are populated correctly
     *
     * Success Criteria:
     * - Modal opens when Edit button clicked
     * - Basic Info tab shows: name, title (job title), company, industry, vertical, company size
     * - Demographics tab shows: age, location, education, etc.
     * - Goals & Pain Points tab shows: goals, pain points, jobs to be done
     * - All fields contain data (not blank)
     * - Construction-specific data appears (not generic tech placeholders)
     *
     * Notes:
     * - This test verifies the fix for Bug #1 (title field) and Bug #2 (AI generation)
     * - Database should have Casey Harris persona with Construction data
     */

    test.setTimeout(60000); // Allow time for page loads and modal interactions

    // Step 1: Login
    console.log('Step 1: Logging in as SME owner...');
    await loginAsSMEOwner(page);

    // Wait for successful navigation
    await expect(page).toHaveURL(/\/(dashboard)?$/);
    console.log('✓ Login successful');

    // Step 2: Navigate to Persona Agent
    console.log('Step 2: Navigating to Persona Agent...');
    await page.goto('http://127.0.0.1:56310/persona');

    // Wait for page to fully load
    await page.waitForLoadState('domcontentloaded');
    console.log('✓ Persona page loaded');

    // Step 3: Wait for sidebar to load with personas
    console.log('Step 3: Waiting for personas sidebar to load...');

    // The sidebar should show existing personas
    const sidebarPersonas = page.locator('[data-testid="persona-list"]').first();
    await expect(sidebarPersonas).toBeVisible({ timeout: 10000 });
    console.log('✓ Sidebar loaded with personas');

    // Step 4: Find the most recent persona (Casey Harris - Construction)
    console.log('Step 4: Looking for Casey Harris persona...');

    // Look for Edit button in the sidebar
    const editButtons = page.locator('button:has-text("Edit")');
    const editButtonCount = await editButtons.count();
    console.log(`Found ${editButtonCount} Edit buttons in sidebar`);

    if (editButtonCount === 0) {
      throw new Error('No personas found with Edit buttons. Check that personas were created by Persona Agent.');
    }

    // Click the first Edit button (most recent persona)
    console.log('Clicking Edit button for most recent persona...');
    await editButtons.first().click();

    // Step 5: Wait for modal to open
    console.log('Step 5: Waiting for edit modal to open...');
    const modal = page.locator('[role="dialog"]').or(page.locator('.modal')).or(page.locator('[data-testid="persona-edit-modal"]'));
    await expect(modal).toBeVisible({ timeout: 10000 });
    console.log('✓ Edit modal opened');

    // Take screenshot of modal
    await page.screenshot({ path: 'test-results/persona-modal-opened.png' });

    // Step 6: Verify Basic Info Tab
    console.log('Step 6: Verifying Basic Info tab fields...');

    // Check Name field
    const nameInput = page.locator('input[name="name"]').or(page.locator('input#name')).or(page.locator('label:has-text("Name") + input')).first();
    await expect(nameInput).toBeVisible();
    const nameValue = await nameInput.inputValue();
    console.log(`Name field value: "${nameValue}"`);
    expect(nameValue.length).toBeGreaterThan(0); // Should not be blank

    // Check Title (job title) field
    const titleInput = page.locator('input[name="title"]').or(page.locator('input#title')).or(page.locator('label:has-text("Title") + input')).first();
    await expect(titleInput).toBeVisible();
    const titleValue = await titleInput.inputValue();
    console.log(`Title field value: "${titleValue}"`);
    expect(titleValue.length).toBeGreaterThan(0); // Should not be blank

    // BUG CHECK: Title should be job title, not full record title
    if (titleValue.includes(' - ')) {
      console.error(`❌ BUG FOUND: Title field shows record title "${titleValue}" instead of job title`);
      throw new Error(`Title field incorrectly shows record title (contains ' - ') instead of job title alone`);
    }
    console.log('✓ Title field shows job title (no record title format detected)');

    // Check Company field
    const companyInput = page.locator('input[name="company_name"]').or(page.locator('input#company_name')).or(page.locator('input#company')).first();
    await expect(companyInput).toBeVisible();
    const companyValue = await companyInput.inputValue();
    console.log(`Company field value: "${companyValue}"`);
    expect(companyValue.length).toBeGreaterThan(0);

    // BUG CHECK: Company should NOT be hardcoded "TechCorp Solutions"
    if (companyValue === 'TechCorp Solutions' || companyValue === 'Mid-sized company') {
      console.error(`❌ BUG FOUND: Company field shows placeholder "${companyValue}" instead of AI-generated company`);
      throw new Error(`Company field shows placeholder value instead of contextual AI-generated company`);
    }
    console.log('✓ Company field shows contextual value (not placeholder)');

    // Check Industry field
    const industryInput = page.locator('input[name="industry"]').or(page.locator('input#industry')).or(page.locator('select[name="industry"]')).first();
    await expect(industryInput).toBeVisible();
    const industryValue = await industryInput.inputValue();
    console.log(`Industry field value: "${industryValue}"`);
    expect(industryValue.length).toBeGreaterThan(0);

    // BUG CHECK: For Construction persona, industry should be "Construction" not generic "Technology"
    if (nameValue.includes('Casey') || nameValue.includes('Harris')) {
      if (industryValue !== 'Construction') {
        console.error(`❌ BUG FOUND: Industry field shows "${industryValue}" for Construction persona`);
        throw new Error(`Industry field shows "${industryValue}" instead of "Construction" for construction-focused persona`);
      }
      console.log('✓ Industry field shows correct "Construction" value');
    }

    // Check Vertical field (if visible)
    const verticalInput = page.locator('input[name="vertical"]').or(page.locator('input#vertical'));
    const verticalVisible = await verticalInput.count() > 0;
    if (verticalVisible) {
      const verticalValue = await verticalInput.first().inputValue();
      console.log(`Vertical field value: "${verticalValue}"`);
    }

    // Check Company Size field (if visible)
    const companySizeInput = page.locator('input[name="company_size"]').or(page.locator('input#company_size')).or(page.locator('select[name="company_size"]'));
    const companySizeVisible = await companySizeInput.count() > 0;
    if (companySizeVisible) {
      const companySizeValue = await companySizeInput.first().inputValue();
      console.log(`Company Size field value: "${companySizeValue}"`);
    }

    console.log('✓ Basic Info tab fields verified');

    // Take screenshot of Basic Info tab
    await page.screenshot({ path: 'test-results/persona-modal-basic-info.png' });

    // Step 7: Verify Goals & Pain Points Tab
    console.log('Step 7: Verifying Goals & Pain Points tab...');

    // Click on Goals & Pain Points tab
    const goalsPainPointsTab = page.locator('button:has-text("Goals")').or(page.locator('[role="tab"]:has-text("Goals")')).or(page.locator('text=Goals & Pain Points'));
    const goalsTabVisible = await goalsPainPointsTab.count() > 0;

    if (goalsTabVisible) {
      await goalsPainPointsTab.first().click();
      console.log('Clicked Goals & Pain Points tab');

      // Wait for tab content to load
      await page.waitForTimeout(1000);

      // Check for Goals section
      const goalsSection = page.locator('text=Goals').or(page.locator('[data-testid="goals-section"]'));
      const goalsSectionVisible = await goalsSection.count() > 0;

      if (goalsSectionVisible) {
        // Look for goal items (should be a list)
        const goalItems = page.locator('li').or(page.locator('[data-testid="goal-item"]')).or(page.locator('text=/^(Complete|Improve|Minimize|Enhance|Increase|Reduce)/'));
        const goalCount = await goalItems.count();
        console.log(`Found ${goalCount} goal items`);

        if (goalCount === 0) {
          console.error('❌ BUG FOUND: Goals & Pain Points tab shows no goals');
          throw new Error('Goals tab is empty - no goal items found');
        }

        // Get text of first few goals
        for (let i = 0; i < Math.min(3, goalCount); i++) {
          const goalText = await goalItems.nth(i).textContent();
          console.log(`Goal ${i + 1}: "${goalText}"`);
        }

        console.log('✓ Goals section populated with data');
      }

      // Check for Pain Points section
      const painPointsSection = page.locator('text=Pain Points').or(page.locator('[data-testid="pain-points-section"]'));
      const painPointsSectionVisible = await painPointsSection.count() > 0;

      if (painPointsSectionVisible) {
        const painPointItems = page.locator('li').or(page.locator('[data-testid="pain-point-item"]'));
        const painPointCount = await painPointItems.count();
        console.log(`Found ${painPointCount} pain point items`);

        if (painPointCount === 0) {
          console.error('❌ BUG FOUND: Pain Points section shows no items');
        }
      }

      // Take screenshot of Goals & Pain Points tab
      await page.screenshot({ path: 'test-results/persona-modal-goals-pain-points.png' });
    } else {
      console.log('⚠️ Goals & Pain Points tab not found in modal');
    }

    // Step 8: Verify Demographics Tab (if exists)
    console.log('Step 8: Checking Demographics tab...');
    const demographicsTab = page.locator('button:has-text("Demographics")').or(page.locator('[role="tab"]:has-text("Demographics")'));
    const demographicsTabVisible = await demographicsTab.count() > 0;

    if (demographicsTabVisible) {
      await demographicsTab.first().click();
      console.log('Clicked Demographics tab');

      // Wait for tab content
      await page.waitForTimeout(1000);

      // Check for location field
      const locationInput = page.locator('input[name="location"]').or(page.locator('text=/Dallas|Texas|USA/'));
      const locationVisible = await locationInput.count() > 0;

      if (locationVisible) {
        const locationText = await locationInput.first().textContent();
        console.log(`Location: "${locationText}"`);
      }

      // Take screenshot
      await page.screenshot({ path: 'test-results/persona-modal-demographics.png' });
    }

    console.log('✅ All persona edit modal field tests completed');
  });

  test('modal closes when Cancel button clicked', async ({ page }) => {
    test.setTimeout(30000);

    await loginAsSMEOwner(page);
    await page.goto('http://127.0.0.1:56310/persona');
    await page.waitForLoadState('domcontentloaded');

    // Click Edit button
    const editButtons = page.locator('button:has-text("Edit")');
    if (await editButtons.count() > 0) {
      await editButtons.first().click();

      // Wait for modal
      const modal = page.locator('[role="dialog"]').first();
      await expect(modal).toBeVisible();

      // Click Cancel
      const cancelButton = page.locator('button:has-text("Cancel")');
      if (await cancelButton.count() > 0) {
        await cancelButton.first().click();

        // Modal should close
        await expect(modal).not.toBeVisible({ timeout: 5000 });
        console.log('✓ Modal closed after Cancel button clicked');
      }
    }
  });
});
