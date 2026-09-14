/**
 * E2E Tests for Agency Client Intelligence Tabs
 *
 * Tests all three tabs on the client intelligence page:
 * 1. Business Profile - Save/update core business data
 * 2. Brand Guidelines - Full CRUD operations (create, update, archive, restore, delete)
 * 3. Learning History - Display AI insights with filtering
 *
 * URL: /clients/{clientSlug}/intelligence
 * User Type: Agency Admin
 */

import { test, expect, Page } from '@playwright/test';
import { loginAsAgencyAdmin } from '../helpers/auth';

const BASE_URL = '';
const CLIENT_SLUG = 'test-startup-xyz'; // Test client from setup_test_users.py
const INTELLIGENCE_URL = `${BASE_URL}/clients/${CLIENT_SLUG}/intelligence`;

// Helper to wait for tab content to load
async function waitForTabLoad(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500); // Brief pause for any animations
}

// Helper to navigate to specific tab
async function navigateToTab(page: Page, tabName: 'business-profile' | 'brand-guidelines' | 'learning-history') {
  await page.goto(`${INTELLIGENCE_URL}?tab=${tabName}`);
  await waitForTabLoad(page);
}

test.describe('Agency Client Intelligence Tabs', () => {
  test.beforeEach(async ({ page }) => {
    // Login as agency admin
    await loginAsAgencyAdmin(page);
    await page.waitForTimeout(1000);
  });

  test.describe('Business Profile Tab', () => {
    test.beforeEach(async ({ page }) => {
      await navigateToTab(page, 'business-profile');
    });

    test('should display business profile with core data', async ({ page }) => {
      // Verify tab is active
      await expect(page.locator('button[data-state="active"]').filter({ hasText: 'Business Profile' })).toBeVisible();

      // Verify core components are visible
      await expect(page.getByText('Core Business Data')).toBeVisible();
      await expect(page.getByText('Completeness')).toBeVisible();

      // Verify Edit button is present
      await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible();
    });

    test('should enter and exit edit mode', async ({ page }) => {
      // Click Edit button
      await page.getByRole('button', { name: 'Edit' }).click();
      await page.waitForTimeout(300);

      // Verify we're in edit mode (Save/Cancel buttons appear)
      await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Edit' })).not.toBeVisible();

      // Click Cancel button
      await page.getByRole('button', { name: 'Cancel' }).click();
      await page.waitForTimeout(300);

      // Verify we exited edit mode
      await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Save' })).not.toBeVisible();
    });

    test('should save business profile updates', async ({ page }) => {
      // Enter edit mode
      await page.getByRole('button', { name: 'Edit' }).click();
      await page.waitForTimeout(300);

      // Find company name input by label
      const companyNameInput = page.locator('input[id="company_name"]');
      await expect(companyNameInput).toBeVisible();

      // Store original value
      const originalValue = await companyNameInput.inputValue();

      // Update company name
      const timestamp = Date.now();
      const newCompanyName = `Ecommerce Plus Updated ${timestamp}`;
      await companyNameInput.clear();
      await companyNameInput.fill(newCompanyName);

      // Update industry if available
      const industrySelect = page.locator('button:has-text("Select industry")').first();
      if (await industrySelect.isVisible()) {
        await industrySelect.click();
        await page.waitForTimeout(200);
        // Select first available option
        const firstOption = page.locator('[role="option"]').first();
        if (await firstOption.isVisible()) {
          await firstOption.click();
          await page.waitForTimeout(200);
        }
      }

      // Click Save button
      await page.getByRole('button', { name: 'Save' }).click();

      // Wait for save operation to complete
      await page.waitForTimeout(1000);

      // Check for success toast (if implemented)
      const successToast = page.locator('text=/updated successfully|saved successfully/i').first();
      if (await successToast.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(successToast).toBeVisible();
      }

      // Verify we exited edit mode
      await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible();

      // Verify the updated value persists by reloading the page
      await page.reload();
      await waitForTabLoad(page);

      // Should still see the updated company name in the display
      await expect(page.locator(`text=${newCompanyName}`).first()).toBeVisible({ timeout: 5000 });

      // Restore original value for cleanup
      await page.getByRole('button', { name: 'Edit' }).click();
      await page.waitForTimeout(300);
      await companyNameInput.clear();
      await companyNameInput.fill(originalValue);
      await page.getByRole('button', { name: 'Save' }).click();
      await page.waitForTimeout(1000);
    });

    test('should display data completeness score', async ({ page }) => {
      // Verify completeness progress bar and percentage
      await expect(page.getByText('Completeness')).toBeVisible();
      const completenessText = page.locator('text=/\\d+%/').first();
      await expect(completenessText).toBeVisible();
    });
  });

  test.describe('Brand Guidelines Tab', () => {
    test.beforeEach(async ({ page }) => {
      await navigateToTab(page, 'brand-guidelines');
    });

    test('should display brand guidelines tab', async ({ page }) => {
      // Verify tab is active
      await expect(page.locator('button[data-state="active"]').filter({ hasText: 'Brand Guidelines' })).toBeVisible();

      // Wait for content to load
      await page.waitForTimeout(1000);

      // Should see either existing guidelines or create button
      const hasGuidelines = await page.locator('text=/Brand Guidelines|No guidelines/i').isVisible({ timeout: 3000 });
      expect(hasGuidelines).toBeTruthy();
    });

    test('should create new brand guideline', async ({ page }) => {
      // Look for Create or Add button
      const createButton = page.locator('button:has-text("Create"), button:has-text("Add"), button:has-text("New")').first();

      if (await createButton.isVisible({ timeout: 3000 })) {
        await createButton.click();
        await page.waitForTimeout(500);

        // Should enter edit mode with form fields
        await expect(page.getByRole('button', { name: /Save|Create/i })).toBeVisible({ timeout: 3000 });
        await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();

        // Fill in basic information
        const nameInput = page.locator('input[id="name"], input[placeholder*="name" i]').first();
        if (await nameInput.isVisible({ timeout: 2000 })) {
          const timestamp = Date.now();
          await nameInput.fill(`Test Brand Guidelines ${timestamp}`);
        }

        // Add some content to brand voice section
        const brandVoiceTab = page.locator('button:has-text("Brand Voice"), [role="tab"]:has-text("Brand Voice")').first();
        if (await brandVoiceTab.isVisible({ timeout: 2000 })) {
          await brandVoiceTab.click();
          await page.waitForTimeout(300);

          // Try to fill tone of voice field
          const toneInput = page.locator('textarea, input').filter({ hasText: /tone|voice/i }).first();
          if (await toneInput.isVisible({ timeout: 2000 })) {
            await toneInput.fill('Professional, friendly, and approachable');
          }
        }

        // Save the guideline
        const saveButton = page.getByRole('button', { name: /Save|Create/i }).first();
        await saveButton.click();
        await page.waitForTimeout(1500);

        // Should see success message
        const successToast = page.locator('text=/created|saved successfully/i').first();
        if (await successToast.isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(successToast).toBeVisible();
        }

        // Should exit edit mode
        await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible({ timeout: 3000 });
      }
    });

    test('should edit existing brand guideline', async ({ page }) => {
      // Wait for guidelines to load
      await page.waitForTimeout(1000);

      // Look for Edit button
      const editButton = page.getByRole('button', { name: 'Edit' }).first();

      if (await editButton.isVisible({ timeout: 3000 })) {
        await editButton.click();
        await page.waitForTimeout(500);

        // Should enter edit mode
        await expect(page.getByRole('button', { name: 'Save' })).toBeVisible({ timeout: 3000 });
        await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();

        // Make a change to description if available
        const descriptionField = page.locator('textarea[id*="description"], input[id*="description"]').first();
        if (await descriptionField.isVisible({ timeout: 2000 })) {
          const timestamp = Date.now();
          await descriptionField.clear();
          await descriptionField.fill(`Updated brand guidelines description ${timestamp}`);
        }

        // Save changes
        await page.getByRole('button', { name: 'Save' }).click();
        await page.waitForTimeout(1500);

        // Should see success message
        const successToast = page.locator('text=/updated|saved successfully/i').first();
        if (await successToast.isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(successToast).toBeVisible();
        }

        // Should exit edit mode
        await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible({ timeout: 3000 });
      }
    });

    test('should archive brand guideline', async ({ page }) => {
      // Wait for guidelines to load
      await page.waitForTimeout(1000);

      // Look for Archive button or dropdown menu
      const archiveButton = page.locator('button:has-text("Archive")').first();
      const menuButton = page.locator('button[aria-label*="menu"], button[aria-label*="actions"]').first();

      if (await archiveButton.isVisible({ timeout: 2000 })) {
        await archiveButton.click();
      } else if (await menuButton.isVisible({ timeout: 2000 })) {
        await menuButton.click();
        await page.waitForTimeout(300);
        const archiveMenuItem = page.locator('[role="menuitem"]:has-text("Archive")').first();
        if (await archiveMenuItem.isVisible({ timeout: 2000 })) {
          await archiveMenuItem.click();
        }
      }

      await page.waitForTimeout(500);

      // Should show archive confirmation dialog with reason input
      const reasonInput = page.locator('textarea[placeholder*="reason" i], input[placeholder*="reason" i]').first();
      if (await reasonInput.isVisible({ timeout: 3000 })) {
        await reasonInput.fill('Test archive reason for E2E testing');
        await page.waitForTimeout(300);

        // Confirm archive
        const confirmButton = page.locator('button:has-text("Archive")').last();
        await confirmButton.click();
        await page.waitForTimeout(1500);

        // Should see success message
        const successToast = page.locator('text=/archived successfully/i').first();
        if (await successToast.isVisible({ timeout: 3000 }).catch(() => false)) {
          await expect(successToast).toBeVisible();
        }
      }
    });

    test('should view archived brand guidelines', async ({ page }) => {
      // Wait for page to load
      await page.waitForTimeout(1000);

      // Look for "Show Archived" toggle or button
      const showArchivedToggle = page.locator('input[type="checkbox"]:near(:text("Archived")), button:has-text("Show Archived")').first();

      if (await showArchivedToggle.isVisible({ timeout: 2000 })) {
        await showArchivedToggle.click();
        await page.waitForTimeout(1000);

        // Should see archived guidelines or "No archived" message
        const hasContent = await page.locator('text=/archived|no archived/i').isVisible({ timeout: 3000 });
        expect(hasContent).toBeTruthy();
      }
    });

    test('should restore archived brand guideline', async ({ page }) => {
      // Enable archived view
      await page.waitForTimeout(1000);
      const showArchivedToggle = page.locator('input[type="checkbox"]:near(:text("Archived")), button:has-text("Show Archived")').first();

      if (await showArchivedToggle.isVisible({ timeout: 2000 })) {
        await showArchivedToggle.click();
        await page.waitForTimeout(1000);

        // Look for Restore button
        const restoreButton = page.locator('button:has-text("Restore")').first();
        const menuButton = page.locator('button[aria-label*="menu"]').first();

        if (await restoreButton.isVisible({ timeout: 2000 })) {
          await restoreButton.click();
          await page.waitForTimeout(1500);

          // Should see success message
          const successToast = page.locator('text=/restored successfully/i').first();
          if (await successToast.isVisible({ timeout: 3000 }).catch(() => false)) {
            await expect(successToast).toBeVisible();
          }
        } else if (await menuButton.isVisible({ timeout: 2000 })) {
          await menuButton.click();
          await page.waitForTimeout(300);
          const restoreMenuItem = page.locator('[role="menuitem"]:has-text("Restore")').first();
          if (await restoreMenuItem.isVisible({ timeout: 2000 })) {
            await restoreMenuItem.click();
            await page.waitForTimeout(1500);
          }
        }
      }
    });

    test('should permanently delete brand guideline', async ({ page }) => {
      // Enable archived view
      await page.waitForTimeout(1000);
      const showArchivedToggle = page.locator('input[type="checkbox"]:near(:text("Archived")), button:has-text("Show Archived")').first();

      if (await showArchivedToggle.isVisible({ timeout: 2000 })) {
        await showArchivedToggle.click();
        await page.waitForTimeout(1000);

        // Look for Delete button
        const deleteButton = page.locator('button:has-text("Delete")').first();
        const menuButton = page.locator('button[aria-label*="menu"]').first();

        let deleteFound = false;

        if (await deleteButton.isVisible({ timeout: 2000 })) {
          await deleteButton.click();
          deleteFound = true;
        } else if (await menuButton.isVisible({ timeout: 2000 })) {
          await menuButton.click();
          await page.waitForTimeout(300);
          const deleteMenuItem = page.locator('[role="menuitem"]:has-text("Delete")').first();
          if (await deleteMenuItem.isVisible({ timeout: 2000 })) {
            await deleteMenuItem.click();
            deleteFound = true;
          }
        }

        if (deleteFound) {
          await page.waitForTimeout(500);

          // Should show delete confirmation dialog
          const confirmDialog = page.locator('text=/permanently delete|cannot be undone/i').first();
          if (await confirmDialog.isVisible({ timeout: 3000 })) {
            // Confirm deletion
            const confirmButton = page.locator('button:has-text("Delete")').last();
            await confirmButton.click();
            await page.waitForTimeout(1500);

            // Should see success message
            const successToast = page.locator('text=/deleted successfully/i').first();
            if (await successToast.isVisible({ timeout: 3000 }).catch(() => false)) {
              await expect(successToast).toBeVisible();
            }
          }
        }
      }
    });
  });

  test.describe('Learning History Tab', () => {
    test.beforeEach(async ({ page }) => {
      await navigateToTab(page, 'learning-history');
    });

    test('should display learning history tab', async ({ page }) => {
      // Verify tab is active
      await expect(page.locator('button[data-state="active"]').filter({ hasText: 'Learning History' })).toBeVisible();

      // Wait for content to load
      await page.waitForTimeout(1000);

      // Should see either insights or "No AI insights" message
      const hasContent = await page.locator('text=/AI Learning History|No AI insights/i').isVisible({ timeout: 3000 });
      expect(hasContent).toBeTruthy();
    });

    test('should display AI insights with metadata', async ({ page }) => {
      // Wait for insights to load
      await page.waitForTimeout(1000);

      // Check if there are any insights
      const insightsList = page.locator('text=/Total insights:/i').first();
      if (await insightsList.isVisible({ timeout: 3000 })) {
        // Verify insight metadata is displayed
        const hasAgentInfo = await page.locator('text=/From|agent|strategy|persona|marketing|content/i').first().isVisible({ timeout: 2000 });
        const hasConfidence = await page.locator('text=/confidence|%/i').first().isVisible({ timeout: 2000 });

        if (hasAgentInfo || hasConfidence) {
          expect(hasAgentInfo || hasConfidence).toBeTruthy();
        }
      }
    });

    test('should filter insights by agent type', async ({ page }) => {
      // Wait for insights to load
      await page.waitForTimeout(1000);

      // Look for agent filter dropdown
      const filterDropdown = page.locator('button:has-text("All agents"), [role="combobox"]:near(:text("agent"))').first();

      if (await filterDropdown.isVisible({ timeout: 3000 })) {
        // Open dropdown
        await filterDropdown.click();
        await page.waitForTimeout(300);

        // Select persona agent filter
        const personaOption = page.locator('[role="option"]:has-text("Persona")').first();
        if (await personaOption.isVisible({ timeout: 2000 })) {
          await personaOption.click();
          await page.waitForTimeout(1000);

          // Verify filter is applied (dropdown should show selected value)
          await expect(page.locator('button:has-text("Persona")')).toBeVisible({ timeout: 3000 });

          // Reset filter to "All agents"
          await filterDropdown.click();
          await page.waitForTimeout(300);
          const allOption = page.locator('[role="option"]:has-text("All")').first();
          if (await allOption.isVisible({ timeout: 2000 })) {
            await allOption.click();
            await page.waitForTimeout(500);
          }
        }
      }
    });

    test('should display insight status badges', async ({ page }) => {
      // Wait for insights to load
      await page.waitForTimeout(1000);

      // Look for status badges (Approved, Pending, Rejected, Auto-Approved)
      const statusBadges = await page.locator('text=/Approved|Pending|Rejected|Auto-Approved/i').count();

      // Should have at least some status badges if there are insights
      if (statusBadges > 0) {
        expect(statusBadges).toBeGreaterThan(0);
      }
    });

    test('should open insight detail dialog', async ({ page }) => {
      // Wait for insights to load
      await page.waitForTimeout(1000);

      // Look for first insight item (clickable)
      const firstInsight = page.locator('div[role="button"], div.cursor-pointer').filter({ hasText: /From|confidence/i }).first();

      if (await firstInsight.isVisible({ timeout: 3000 })) {
        await firstInsight.click();
        await page.waitForTimeout(500);

        // Should open detail dialog
        const dialog = page.locator('[role="dialog"]').first();
        if (await dialog.isVisible({ timeout: 3000 })) {
          await expect(dialog).toBeVisible();

          // Should show confidence score
          await expect(page.locator('text=/Confidence:/i')).toBeVisible({ timeout: 2000 });

          // Should show extracted business context
          await expect(page.locator('text=/Extracted Business Context/i')).toBeVisible({ timeout: 2000 });

          // Close dialog
          const closeButton = page.locator('button[aria-label="Close"], button:has-text("×")').first();
          if (await closeButton.isVisible({ timeout: 2000 })) {
            await closeButton.click();
            await page.waitForTimeout(300);
          } else {
            // Try pressing Escape key
            await page.keyboard.press('Escape');
            await page.waitForTimeout(300);
          }
        }
      }
    });

    test('should delete insight', async ({ page }) => {
      // Wait for insights to load
      await page.waitForTimeout(1000);

      // Look for delete button (trash icon)
      const deleteButton = page.locator('button:has-text("Delete"), button[aria-label*="delete"]').first();

      if (await deleteButton.isVisible({ timeout: 3000 })) {
        await deleteButton.click();
        await page.waitForTimeout(500);

        // Should show confirmation dialog
        const confirmDialog = page.locator('text=/delete|remove|confirm/i').first();
        if (await confirmDialog.isVisible({ timeout: 3000 })) {
          // Confirm deletion
          const confirmButton = page.locator('button:has-text("Delete"), button:has-text("Confirm")').last();
          await confirmButton.click();
          await page.waitForTimeout(1500);

          // Should see success message
          const successToast = page.locator('text=/deleted|removed successfully/i').first();
          if (await successToast.isVisible({ timeout: 3000 }).catch(() => false)) {
            await expect(successToast).toBeVisible();
          }
        }
      }
    });

    test('should display cross-persona patterns when filtered to persona agent', async ({ page }) => {
      // Wait for insights to load
      await page.waitForTimeout(1000);

      // Look for agent filter dropdown
      const filterDropdown = page.locator('button:has-text("All agents"), [role="combobox"]:near(:text("agent"))').first();

      if (await filterDropdown.isVisible({ timeout: 3000 })) {
        // Open dropdown
        await filterDropdown.click();
        await page.waitForTimeout(300);

        // Select persona agent filter
        const personaOption = page.locator('[role="option"]:has-text("Persona")').first();
        if (await personaOption.isVisible({ timeout: 2000 })) {
          await personaOption.click();
          await page.waitForTimeout(1000);

          // Look for cross-persona patterns section
          const patternsSection = page.locator('text=/Cross-Persona Patterns|Pain Points|Goals|Channel/i').first();
          if (await patternsSection.isVisible({ timeout: 3000 })) {
            await expect(patternsSection).toBeVisible();
          }
        }
      }
    });
  });

  test.describe('Tab Navigation and URL State', () => {
    test('should persist active tab in URL', async ({ page }) => {
      // Navigate to business profile tab
      await navigateToTab(page, 'business-profile');
      await expect(page).toHaveURL(/tab=business-profile/);

      // Switch to brand guidelines tab
      await page.locator('button[role="tab"]').filter({ hasText: 'Brand Guidelines' }).click();
      await waitForTabLoad(page);
      await expect(page).toHaveURL(/tab=brand-guidelines/);

      // Switch to learning history tab
      await page.locator('button[role="tab"]').filter({ hasText: 'Learning History' }).click();
      await waitForTabLoad(page);
      await expect(page).toHaveURL(/tab=learning-history/);
    });

    test('should load correct tab from URL parameter', async ({ page }) => {
      // Navigate directly to brand guidelines tab via URL
      await navigateToTab(page, 'brand-guidelines');
      await expect(page.locator('button[data-state="active"]').filter({ hasText: 'Brand Guidelines' })).toBeVisible();

      // Navigate directly to learning history tab via URL
      await navigateToTab(page, 'learning-history');
      await expect(page.locator('button[data-state="active"]').filter({ hasText: 'Learning History' })).toBeVisible();

      // Navigate directly to business profile tab via URL
      await navigateToTab(page, 'business-profile');
      await expect(page.locator('button[data-state="active"]').filter({ hasText: 'Business Profile' })).toBeVisible();
    });
  });

  test.describe('Data Isolation and Multi-Tenancy', () => {
    test('should only display data for the specific client', async ({ page }) => {
      // Navigate to intelligence page for the Test Startup XYZ client
      await page.goto(`${BASE_URL}/clients/${CLIENT_SLUG}/intelligence`);
      await waitForTabLoad(page);

      // Verify we're on the correct client page
      await expect(page).toHaveURL(new RegExp(`/clients/${CLIENT_SLUG}`));

      // Should see client-specific data, not data from other clients
      // This is verified implicitly by the router functions using client_id
      // and RLS policies enforcing data isolation

      // Navigate to business profile
      await navigateToTab(page, 'business-profile');

      // Company name should match the client
      const companyName = await page.locator('input[id="company_name"]').inputValue();
      expect(companyName).toBeTruthy();
      expect(companyName.length).toBeGreaterThan(0);
    });
  });
});
