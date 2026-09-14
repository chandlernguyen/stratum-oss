/**
 * Multi-tenant UI contract: an SME and an agency see different workspaces, and
 * the agents an agency-scoped workspace exposes are the current set.
 *
 * Rewritten against the live app. The previous version used an unseeded
 * `test@example.com`, a login form on `/`, and expected analytics/roi_budget/
 * quick_wins agents that were removed.
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const SME = {
  email: process.env.TEST_SME_OWNER_EMAIL || 'sme.owner@example.com',
  password: process.env.TEST_SME_OWNER_PASSWORD || 'LocalDevOnly123!',
};

const AGENCY = {
  email: process.env.TEST_AGENCY_OWNER_EMAIL || 'agency.owner@example.com',
  password: process.env.TEST_AGENCY_OWNER_PASSWORD || 'LocalDevOnly123!',
};

async function login(page: Page, user: { email: string; password: string }) {
  await page.goto('/login');
  await page.waitForSelector('input[type="email"]');
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 20000 });
}

const ACTIVE_AGENTS = [
  'Quick Start',
  'Strategy',
  'Persona',
  'Marketing Strategy',
  'Content',
  'Campaign Planning',
  'Performance Intelligence',
  'Competitive Intel',
];

test.describe('Multi-tenant UI — SME', () => {
  test('SME owner gets the SME workspace with no agency surfaces', async ({ page }) => {
    await login(page, SME);

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Campaigns' }).first()).toBeVisible();
    await expect(page.getByText(/Intelligence Briefing/i).first()).toBeVisible();

    // Clients are an agency concern; an SME must not see them.
    await expect(page.getByRole('link', { name: /^Clients$/ })).toHaveCount(0);
  });

  test('Agents menu lists the current agents and not the removed trio', async ({ page }) => {
    await login(page, SME);
    await page.getByRole('button', { name: 'Agents' }).click();

    for (const name of ACTIVE_AGENTS) {
      await expect(
        page.getByRole('link', { name: new RegExp(name, 'i') }).first(),
      ).toBeVisible();
    }

    await expect(page.getByText(/Analytics Agent|ROI & Budget|Quick Wins/i)).toHaveCount(0);
  });
});

test.describe('Multi-tenant UI — Agency', () => {
  test('Agency owner gets the client portfolio', async ({ page }) => {
    await login(page, AGENCY);
    await page.goto('/clients');

    await expect(page.getByRole('heading', { name: 'Clients' })).toBeVisible();
    await expect(
      page.getByRole('link', { name: /Test Client Co|Test Startup XYZ/ }).first(),
    ).toBeVisible();
  });

  test('Opening a client keeps client context in the URL', async ({ page }) => {
    await login(page, AGENCY);
    await page.goto('/clients/test-client-co');

    await expect(page).toHaveURL(/\/clients\/test-client-co/);
    await expect(page.getByText('Test Client Co').first()).toBeVisible();
  });
});
