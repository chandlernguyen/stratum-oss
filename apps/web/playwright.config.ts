import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.test file for tests
dotenv.config({ path: path.resolve(__dirname, '.env.test') });

const useManagedWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER !== '1';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  // Specs that assert UI which has since changed (the client-switcher affordances,
  // the old Quick Start modal, October-2025 marketing copy, and the archived-state
  // multi-tenant nav fixes). Quarantined rather than deleted; run them with
  // RUN_STALE_E2E=1. See TESTING.md.
  testIgnore: [
    '**/archive/**',
    '**/archived/**',
    ...(process.env.RUN_STALE_E2E === '1'
      ? []
      : [
          '**/user-journeys/agency-client-routing.spec.ts',
          '**/user-journeys/sme-quick-start-5min-intelligence.spec.ts',
          '**/user-journeys/sme-first-time-user-complete.spec.ts',
          '**/user-journeys/agency-first-time-user-complete.spec.ts',
          '**/integration/agency-client-intelligence-tabs.spec.ts',
          '**/multi-tenant/navigation-fix-validation.spec.ts',
          '**/multi-tenant/schema-aware-router-hooks.spec.ts',
        ]),
  ],
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'], // Console output
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://127.0.0.1:56310',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Screenshot and video settings */
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: useManagedWebServer
    ? {
        command: 'npm run dev -- --host 127.0.0.1',
        url: 'http://127.0.0.1:56310',
        reuseExistingServer: !process.env.CI,
      }
    : undefined,
});
