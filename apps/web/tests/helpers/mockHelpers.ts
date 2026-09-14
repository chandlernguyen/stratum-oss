import { Page } from '@playwright/test';

/**
 * Mock helper functions for Playwright tests
 */

// Mock agent API responses
export async function mockAgentResponse(page: Page, agentType: string, response: any) {
  await page.route(`**/api/v1/direct-agents/${agentType}/chat`, async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response)
    });
  });
}

// Mock session creation
export async function mockSessionCreation(page: Page) {
  await page.route('**/api/v1/direct-agents/sessions', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        session_id: 'test-session-123',
        created_at: new Date().toISOString()
      })
    });
  });
}

// Mock authentication
export async function mockAuth(page: Page, userType: 'sme' | 'agency' | 'guest' = 'sme') {
  const userData = {
    sme: {
      id: 'user-sme-123',
      email: 'sme.owner@example.com',
      role: 'owner',
      organization: {
        id: 'org-sme-123',
        name: 'Test SME',
        type: 'SME'
      }
    },
    agency: {
      id: 'user-agency-123',
      email: 'agency.admin@example.com',
      role: 'agency_admin',
      organization: {
        id: 'org-agency-123',
        name: 'Test Agency',
        type: 'AGENCY'
      },
      clients: [
        { id: 'client-1', name: 'Acme Corp', brand_kit: { primary_color: '#FF5722' } },
        { id: 'client-2', name: 'Beta Industries', brand_kit: { primary_color: '#2196F3' } }
      ]
    },
    guest: {
      id: 'user-guest-123',
      email: 'guest@example.com',
      role: 'viewer',
      organization: {
        id: 'org-guest-123',
        name: 'Guest Org',
        type: 'SME'
      }
    }
  };

  // Mock the auth check
  await page.route('**/api/v1/auth/me', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(userData[userType])
    });
  });

  // Set auth token in localStorage
  await page.evaluate((user) => {
    localStorage.setItem('supabase.auth.token', JSON.stringify({
      currentSession: {
        access_token: 'mock-token-123',
        user: user
      }
    }));
  }, userData[userType]);
}

// Mock workspace data
export async function mockWorkspaceData(page: Page, data: any) {
  await page.route('**/api/v1/organizations/current', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(data)
    });
  });
}

// Helper to wait for agent response
export async function waitForAgentResponse(page: Page, timeout = 10000) {
  await page.waitForSelector('.agent-message:last-child', { timeout });
  // Wait a bit for animations to complete
  await page.waitForTimeout(500);
}

// Helper to wait for tool visualization
export async function waitForToolVisualization(page: Page, toolClass: string, timeout = 10000) {
  await page.waitForSelector(`.${toolClass}`, { timeout });
  await page.waitForTimeout(500); // Wait for render completion
}

// Set Expert Mode preference
export async function setExpertMode(page: Page, enabled: boolean) {
  await page.evaluate((isExpert) => {
    localStorage.setItem('expertMode', isExpert.toString());
    window.dispatchEvent(new CustomEvent('expertModeChanged', { 
      detail: { isExpert } 
    }));
  }, enabled);
}

// Set expertise level
export async function setExpertiseLevel(page: Page, level: 'beginner' | 'intermediate' | 'expert') {
  const select = page.locator('select').filter({ hasText: level });
  if (await select.count() > 0) {
    await select.selectOption(level);
  }
}

// Mock network delay
export async function simulateSlowNetwork(page: Page, delayMs = 2000) {
  await page.route('**/*', async route => {
    await page.waitForTimeout(delayMs);
    await route.continue();
  });
}

// Mock API error
export async function mockApiError(page: Page, endpoint: string, errorMessage = 'Internal Server Error') {
  await page.route(endpoint, async route => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        detail: errorMessage,
        error: true
      })
    });
  });
}

// Helper to take debug screenshot
export async function takeDebugScreenshot(page: Page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({
    path: `tests/screenshots/${name}-${timestamp}.png`,
    fullPage: true
  });
}

// Check if element is in viewport
export async function isInViewport(page: Page, selector: string) {
  return await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (!element) return false;
    
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth
    );
  }, selector);
}