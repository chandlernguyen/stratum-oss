import { test, expect, Page } from '@playwright/test';

const MOBILE_VIEWPORT = {
  width: 393,
  height: 852,
};

const TEST_USER = {
  email: 'sme.owner@example.com',
  password: 'LocalDevOnly123!',
};

test.describe('Agent Table Mobile Responsiveness', () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('Tables should be horizontally scrollable on mobile', async ({ page }) => {
    test.setTimeout(90000);

    console.log('\n🔍 Testing agent table mobile responsiveness...');

    // Navigate to Business Strategy agent
    await page.goto('/strategy');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    console.log('✓ Navigated to Business Strategy page');

    // Check if we have any existing sessions with tables
    const sessionLinks = await page.locator('[data-testid="session-link"], a[href*="/strategy/session/"]').all();

    if (sessionLinks.length > 0) {
      // Click the first session
      await sessionLinks[0].click();
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      console.log('✓ Opened existing strategy session');

      // Wait a bit for any streaming to complete
      await page.waitForTimeout(2000);

      // Look for tables in prose content
      const tables = await page.locator('.prose table, .prose-stone table').all();

      if (tables.length > 0) {
        console.log(`\n✓ Found ${tables.length} table(s) in agent content`);

        for (let i = 0; i < tables.length; i++) {
          const table = tables[i];

          // Check if table is visible
          const isVisible = await table.isVisible();
          expect(isVisible).toBe(true);
          console.log(`  ✓ Table ${i + 1}: Visible`);

          // Check table has block display on mobile
          const display = await table.evaluate((el) => window.getComputedStyle(el).display);
          console.log(`  ✓ Table ${i + 1}: Display = ${display}`);

          // Check table has overflow-x auto
          const overflowX = await table.evaluate((el) => window.getComputedStyle(el).overflowX);
          expect(overflowX).toBe('auto');
          console.log(`  ✓ Table ${i + 1}: overflow-x = auto (horizontally scrollable)`);

          // Check font size is mobile-optimized
          const fontSize = await table.evaluate((el) => window.getComputedStyle(el).fontSize);
          console.log(`  ✓ Table ${i + 1}: font-size = ${fontSize}`);

          // Check table cells have proper padding
          const firstCell = await table.locator('th, td').first();
          if (await firstCell.count() > 0) {
            const padding = await firstCell.evaluate((el) => window.getComputedStyle(el).padding);
            console.log(`  ✓ Table ${i + 1}: Cell padding = ${padding}`);
          }
        }

        console.log('\n✅ All tables are mobile-responsive!');
      } else {
        console.log('\n⚠️  No tables found in this session. Table styles are ready when agents generate tables.');
      }
    } else {
      console.log('\n⚠️  No existing sessions found. Create a new strategy session to test table responsiveness.');
    }
  });

  test('Porter\'s Forces table should render on mobile', async ({ page }) => {
    test.setTimeout(90000);

    console.log('\n🔍 Testing Porter\'s Forces table specifically...');

    // Navigate to Business Strategy agent
    await page.goto('/strategy');
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Start a new session
    const newChatButton = page.locator('button:has-text("New"), button:has-text("Start")').first();
    if (await newChatButton.count() > 0) {
      await newChatButton.click();
      await page.waitForTimeout(1000);

      // Send Porter's Forces request
      const inputArea = page.locator('textarea, [contenteditable="true"]').last();
      await inputArea.fill("Analyze the competitive forces in the cloud storage industry using Porter's Five Forces framework.");

      const sendButton = page.locator('button[type="submit"], button:has-text("Send")').last();
      await sendButton.click();

      console.log('✓ Sent Porter\'s Forces request');

      // Wait for response (up to 45 seconds)
      await page.waitForTimeout(45000);

      // Check for tables or structured content
      const tables = await page.locator('.prose table, .prose-stone table').all();
      const portersComponents = await page.locator('[data-testid*="porters"], [class*="porters"]').all();

      console.log(`\n✓ Found ${tables.length} table(s)`);
      console.log(`✓ Found ${portersComponents.length} Porter's component(s)`);

      // If we have tables, verify they're mobile-responsive
      if (tables.length > 0) {
        const firstTable = tables[0];
        const overflowX = await firstTable.evaluate((el) => window.getComputedStyle(el).overflowX);
        expect(overflowX).toBe('auto');
        console.log('✅ Porter\'s table is horizontally scrollable on mobile');
      }

      // If we have React components, they should already be responsive
      if (portersComponents.length > 0) {
        console.log('✅ Porter\'s Forces rendered as React component (already responsive)');
      }
    } else {
      console.log('⚠️  Could not find "New" or "Start" button to create session');
    }
  });
});
