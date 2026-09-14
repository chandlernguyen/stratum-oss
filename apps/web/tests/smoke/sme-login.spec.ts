import { expect, test } from '@playwright/test';

test('SME user login smoke', async ({ page }) => {
  await page.goto('/es/login');
  await page.waitForLoadState('domcontentloaded');
  await page.fill('input[type="email"]', 'sme.owner@example.com');
  await page.fill('input[type="password"]', 'LocalDevOnly123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/es/dashboard', { timeout: 10000 });
  await expect(page).toHaveURL(/\/es\/dashboard$/);
  await expect(page.locator('main, [role="main"]').first()).toBeVisible({ timeout: 5000 });
});
