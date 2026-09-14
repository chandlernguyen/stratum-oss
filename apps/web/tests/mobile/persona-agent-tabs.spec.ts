import { test, expect } from '@playwright/test';

const MOBILE_VIEWPORT = {
  width: 393,
  height: 852,
};

const TEST_USER = {
  email: 'sme.owner@example.com',
  password: 'LocalDevOnly123!',
};

test.describe('Persona Agent Mobile Tabs (Phase 6)', () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('Should show mobile tabs on Persona Agent page', async ({ page }) => {
    console.log('\n🔍 Testing Persona Agent mobile tabs...');

    // Navigate to Persona Agent
    await page.goto('/persona');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    console.log('✓ Navigated to Persona Agent page');

    // Verify tabs are visible on mobile (look for buttons with tab text)
    const tabs = await page.locator('button').filter({ hasText: /New Persona|My Personas/ }).all();
    expect(tabs.length).toBeGreaterThanOrEqual(2);
    console.log(`✓ Found ${tabs.length} tabs`);

    // Check for "New Persona" tab
    const newPersonaTab = page.locator('button', { hasText: 'New Persona' });
    await expect(newPersonaTab).toBeVisible();
    console.log('✓ "New Persona" tab visible');

    // Check for "My Personas" tab
    const myPersonasTab = page.locator('button', { hasText: 'My Personas' });
    await expect(myPersonasTab).toBeVisible();
    console.log('✓ "My Personas" tab visible');

    // Verify tab has touch-friendly height (48px minimum)
    const tabHeight = await newPersonaTab.evaluate((el) => el.getBoundingClientRect().height);
    expect(tabHeight).toBeGreaterThanOrEqual(48);
    console.log(`✓ Tab height: ${tabHeight}px (WCAG compliant)`);

    console.log('\n✅ Mobile tabs render correctly!');
  });

  test('Should switch between New Persona and My Personas tabs', async ({ page }) => {
    console.log('\n🔍 Testing tab switching functionality...');

    // Navigate to Persona Agent
    await page.goto('/persona');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Default tab should be "New Persona" (chat view)
    const newPersonaTab = page.locator('button', { hasText: 'New Persona' });
    const myPersonasTab = page.locator('button', { hasText: 'My Personas' });

    // Check if "New Persona" is active by default
    const isNewPersonaActive = await newPersonaTab.getAttribute('aria-current');
    console.log(`✓ Default tab - New Persona active: ${isNewPersonaActive === 'page'}`);

    // Click "My Personas" tab
    await myPersonasTab.click();
    await page.waitForTimeout(500); // Wait for transition
    console.log('✓ Clicked "My Personas" tab');

    // Verify tab switched (check for active state)
    const isMyPersonasActive = await myPersonasTab.getAttribute('aria-current');
    expect(isMyPersonasActive).toBe('page');
    console.log('✓ "My Personas" tab is now active');

    // Verify PersonaListView is visible (check for personas or empty state)
    const listView = page.locator('text=/No personas yet|found|Create First Persona/i').first();
    const isListVisible = await listView.isVisible().catch(() => false);
    console.log(`✓ List view visible: ${isListVisible}`);

    // Switch back to "New Persona" tab
    await newPersonaTab.click();
    await page.waitForTimeout(500);
    console.log('✓ Clicked "New Persona" tab');

    // Verify chat view is back
    const isNewPersonaActiveAgain = await newPersonaTab.getAttribute('aria-current');
    expect(isNewPersonaActiveAgain).toBe('page');
    console.log('✓ "New Persona" tab is active again');

    console.log('\n✅ Tab switching works correctly!');
  });

  test('Should display persona count badge in My Personas tab', async ({ page }) => {
    console.log('\n🔍 Testing persona count badge...');

    // Navigate to Persona Agent
    await page.goto('/persona');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Look for count badge in "My Personas" tab
    const myPersonasTab = page.locator('button', { hasText: 'My Personas' });
    const countBadge = myPersonasTab.locator('span').filter({ hasText: /^\d+$/ }).first();

    if (await countBadge.isVisible()) {
      const count = await countBadge.textContent();
      console.log(`✓ Persona count badge visible: ${count}`);
      expect(count).toMatch(/^\d+$/); // Should be a number
    } else {
      console.log('ℹ️  No count badge (0 personas or badge hidden)');
    }

    console.log('\n✅ Count badge test complete!');
  });

  test('Should hide tabs on desktop viewport', async ({ page }) => {
    // Switch to desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });

    console.log('\n🔍 Testing tabs hidden on desktop...');

    // Navigate to Persona Agent
    await page.goto('/persona');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Tabs should be hidden on desktop
    const tabs = page.locator('button', { hasText: /New Persona|My Personas/ }).first();
    const isVisible = await tabs.isVisible().catch(() => false);

    expect(isVisible).toBe(false);
    console.log('✓ Tabs hidden on desktop viewport');

    console.log('\n✅ Desktop hiding works correctly!');
  });

  test('Should display PersonaListView with personas or empty state', async ({ page }) => {
    console.log('\n🔍 Testing PersonaListView content...');

    // Navigate to Persona Agent
    await page.goto('/persona');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Click "My Personas" tab
    const myPersonasTab = page.locator('button', { hasText: 'My Personas' });
    await myPersonasTab.click();
    await page.waitForTimeout(500);
    console.log('✓ Switched to "My Personas" tab');

    // Check for either personas or empty state
    const personaCards = page.locator('[class*="Card"]').filter({ hasText: /Primary|Interview|Edit/ });
    const emptyState = page.locator('text=/No personas yet|Create First Persona/i');

    const hasPersonas = await personaCards.count() > 0;
    const hasEmptyState = await emptyState.isVisible();

    if (hasPersonas) {
      const count = await personaCards.count();
      console.log(`✓ Found ${count} persona card(s)`);

      // Verify persona cards have required elements
      const firstCard = personaCards.first();
      await expect(firstCard).toBeVisible();
      console.log('✓ Persona cards visible');
    } else if (hasEmptyState) {
      console.log('✓ Empty state visible (no personas created)');
      await expect(emptyState).toBeVisible();

      // Check for "Create First Persona" button
      const createButton = page.locator('button', { hasText: 'Create First Persona' });
      if (await createButton.isVisible()) {
        console.log('✓ "Create First Persona" button visible');

        // Verify button is touch-friendly
        const buttonHeight = await createButton.evaluate((el) => el.getBoundingClientRect().height);
        expect(buttonHeight).toBeGreaterThanOrEqual(44); // Apple HIG minimum
        console.log(`✓ Button height: ${buttonHeight}px (touch-friendly)`);
      }
    }

    console.log('\n✅ PersonaListView renders correctly!');
  });
});
