import { expect, test } from '@playwright/test';

test('Agency user login smoke', async ({ page }) => {
  await page.goto('/vi/login');
  await page.waitForLoadState('domcontentloaded');
  await page.fill('input[type="email"]', 'agency.admin@example.com');
  await page.fill('input[type="password"]', 'LocalDevOnly123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/vi/dashboard', { timeout: 10000 });
  await expect(page).toHaveURL(/\/vi\/dashboard$/);
  await expect(page.locator('main, [role="main"]').first()).toBeVisible({ timeout: 5000 });
  await page.goto('/vi/clients');
  await page.waitForLoadState('domcontentloaded');
  await expect(page).toHaveURL(/\/vi\/clients$/);
  await expect(page.locator('main, [role="main"]').first()).toBeVisible({ timeout: 5000 });
});
