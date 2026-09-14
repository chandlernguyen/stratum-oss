import { Page } from '@playwright/test';

/**
 * Helper function to login a user
 * Uses environment variables for credentials - never hardcode them
 */
export async function login(page: Page, emailEnvKey?: string, passwordEnvKey?: string) {
  // Default to SME owner if no specific user provided
  const email = emailEnvKey ? process.env[emailEnvKey] : process.env.TEST_SME_OWNER_EMAIL;
  const password = passwordEnvKey ? process.env[passwordEnvKey] : process.env.TEST_SME_OWNER_PASSWORD;
  
  if (!email || !password) {
    throw new Error(`Missing test credentials. Ensure ${emailEnvKey || 'TEST_SME_OWNER_EMAIL'} and ${passwordEnvKey || 'TEST_SME_OWNER_PASSWORD'} are set in .env.test`);
  }
  
  // Navigate to login page
  await page.goto('/login');
  
  // Fill login form
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  
  // Submit form
  await page.click('button[type="submit"]');
  
  // Wait for navigation (should go to dashboard)
  await page.waitForURL(/\/(dashboard)?$/, { timeout: 10000 });
}

/**
 * Login with specific test user type
 */
export async function loginAsSMEOwner(page: Page) {
  return login(page, 'TEST_SME_OWNER_EMAIL', 'TEST_SME_OWNER_PASSWORD');
}

export async function loginAsSMEAdmin(page: Page) {
  return login(page, 'TEST_SME_ADMIN_EMAIL', 'TEST_SME_ADMIN_PASSWORD');
}

export async function loginAsAgencyOwner(page: Page) {
  return login(page, 'TEST_AGENCY_OWNER_EMAIL', 'TEST_AGENCY_OWNER_PASSWORD');
}

export async function loginAsAgencyAdmin(page: Page) {
  return login(page, 'TEST_AGENCY_ADMIN_EMAIL', 'TEST_AGENCY_ADMIN_PASSWORD');
}

export async function loginAsAccountManager(page: Page) {
  return login(page, 'TEST_ACCOUNT_MANAGER_EMAIL', 'TEST_ACCOUNT_MANAGER_PASSWORD');
}

export async function loginAsGuest(page: Page) {
  return login(page, 'GUEST_EMAIL', 'GUEST_PASSWORD');
}

/**
 * Login with direct credentials (email + password) instead of env var keys.
 * Used for billing test users that have known, fixed credentials.
 */
export async function loginWithCredentials(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await Promise.all([
    page.waitForNavigation({ timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);
}

export async function loginAsBillingFree(page: Page) {
  return loginWithCredentials(page, 'billing.free@example.com', 'LocalDevOnly123!');
}

export async function loginAsBillingSoloTrial(page: Page) {
  return loginWithCredentials(page, 'billing.solo.trial@example.com', 'LocalDevOnly123!');
}

export async function loginAsBillingSolo(page: Page) {
  return loginWithCredentials(page, 'billing.solo@example.com', 'LocalDevOnly123!');
}

export async function loginAsBillingTeamTrial(page: Page) {
  return loginWithCredentials(page, 'billing.team.trial@example.com', 'LocalDevOnly123!');
}

export async function loginAsBillingTeam(page: Page) {
  return loginWithCredentials(page, 'billing.team@example.com', 'LocalDevOnly123!');
}

export async function loginAsBillingAgencyTrial(page: Page) {
  return loginWithCredentials(page, 'billing.agency.trial@example.com', 'LocalDevOnly123!');
}

export async function loginAsBillingAgency(page: Page) {
  return loginWithCredentials(page, 'billing.agency@example.com', 'LocalDevOnly123!');
}

export async function loginAsBillingExpired(page: Page) {
  return loginWithCredentials(page, 'billing.expired@example.com', 'LocalDevOnly123!');
}

export async function loginAsBillingPastDue(page: Page) {
  return loginWithCredentials(page, 'billing.pastdue@example.com', 'LocalDevOnly123!');
}