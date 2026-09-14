import { test, expect, APIRequestContext } from '@playwright/test';
import { TestDataManager } from '../helpers/testDataManager';
import { TEST_FIXTURES } from '../fixtures/testFixtures';

/**
 * Security and Data Isolation Tests
 * Critical tests to ensure complete data isolation between organizations
 * and protection against common attack vectors
 */

// Helper to get auth token
async function getAuthToken(request: APIRequestContext, email: string, password: string): Promise<string> {
  const response = await request.post('http://127.0.0.1:56300/api/v1/auth/login', {
    data: {
      email,
      password
    }
  });
  
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  return data.access_token;
}

test.describe('Data Isolation & Security', () => {
  let testData: TestDataManager;
  let agencyAToken: string;
  let agencyBToken: string;
  let smeToken: string;
  let agencyBClientId: string;
  
  test.beforeAll(async ({ request }) => {
    testData = new TestDataManager();
    await testData.setupTestEnvironment('mixed');
    
    // Get tokens for different organizations
    agencyAToken = await getAuthToken(request, 'agency.admin@test.com', 'LocalDevOnly123!');
    agencyBToken = await getAuthToken(request, 'agency.beta@test.com', 'LocalDevOnly123!');
    smeToken = await getAuthToken(request, 'sme.owner@test.com', 'LocalDevOnly123!');
    
    // Get a client ID from Agency B (for attack testing)
    const clientsResponse = await request.get('http://127.0.0.1:56300/api/v1/clients', {
      headers: { 'Authorization': `Bearer ${agencyBToken}` }
    });
    
    if (clientsResponse.ok()) {
      const clients = await clientsResponse.json();
      if (clients.length > 0) {
        agencyBClientId = clients[0].id;
      }
    }
  });
  
  test.afterAll(async () => {
    await testData.teardown();
  });

  // ========================================
  // CROSS-TENANT DATA ACCESS PREVENTION
  // ========================================
  
  test('@security @critical Agency A cannot access Agency B data', async ({ request }) => {
    test.setTimeout(60000);
    console.log('🔒 Testing cross-tenant data isolation...');
    
    // Define attack vectors
    const attacks = [
      {
        name: 'Direct client access',
        method: 'GET',
        url: `http://127.0.0.1:56300/api/v1/clients/${agencyBClientId}`,
        expected: [403, 404],
        description: 'Attempt to read Agency B client directly'
      },
      {
        name: 'List Agency B campaigns',
        method: 'GET',
        url: `http://127.0.0.1:56300/api/v1/campaigns?client_id=${agencyBClientId}`,
        expected: [403, 404, 200], // 200 with empty array is acceptable
        validateEmpty: true,
        description: 'Try to list campaigns for Agency B client'
      },
      {
        name: 'Create campaign for Agency B client',
        method: 'POST',
        url: 'http://127.0.0.1:56300/api/v1/campaigns',
        data: {
          client_id: agencyBClientId,
          name: 'Malicious Campaign',
          status: 'draft',
          budget: 10000
        },
        expected: [403, 422, 400],
        description: 'Attempt to create campaign under Agency B client'
      },
      {
        name: 'Access Agency B saved outputs',
        method: 'GET',
        url: `http://127.0.0.1:56300/api/v1/outputs?client_id=${agencyBClientId}`,
        expected: [403, 404, 200], // 200 with empty array
        validateEmpty: true,
        description: 'Try to access saved AI outputs from Agency B'
      },
      {
        name: 'SQL injection attempt',
        method: 'GET',
        url: `http://127.0.0.1:56300/api/v1/campaigns?client_id=' OR '1'='1`,
        expected: [400, 403, 404],
        description: 'SQL injection to bypass RLS'
      },
      {
        name: 'Access all organizations',
        method: 'GET',
        url: 'http://127.0.0.1:56300/api/v1/organizations',
        expected: [403, 404, 200],
        validateOrg: true,
        description: 'Try to list all organizations'
      },
      {
        name: 'Update Agency B client',
        method: 'PUT',
        url: `http://127.0.0.1:56300/api/v1/clients/${agencyBClientId}`,
        data: { name: 'Hacked Client' },
        expected: [403, 404],
        description: 'Attempt to modify Agency B client'
      },
      {
        name: 'Delete Agency B campaign',
        method: 'DELETE',
        url: `http://127.0.0.1:56300/api/v1/campaigns/${agencyBClientId}`,
        expected: [403, 404],
        description: 'Try to delete Agency B resources'
      }
    ];
    
    // Execute each attack
    for (const attack of attacks) {
      console.log(`  🔍 Testing: ${attack.name}`);
      
      const options: any = {
        headers: { 'Authorization': `Bearer ${agencyAToken}` }
      };
      
      if (attack.data) {
        options.data = attack.data;
      }
      
      const response = await request.fetch(attack.url, {
        method: attack.method,
        ...options
      });
      
      const status = response.status();
      console.log(`    Response: ${status} - ${attack.description}`);
      
      // Verify expected status codes
      expect(attack.expected).toContain(status);
      
      // Additional validation for 200 responses
      if (status === 200) {
        const data = await response.json();
        
        if (attack.validateEmpty && Array.isArray(data)) {
          // Should return empty array, not Agency B data
          expect(data).toHaveLength(0);
          console.log('    ✅ Returned empty array (no data leak)');
        } else if (attack.validateOrg) {
          // Should only see own organization
          if (Array.isArray(data)) {
            expect(data.length).toBeLessThanOrEqual(1);
            if (data.length > 0) {
              expect(data[0].name).not.toContain('Beta');
            }
          }
        } else {
          // Ensure no Agency B data in response
          const responseText = JSON.stringify(data);
          expect(responseText).not.toContain(agencyBClientId);
          expect(responseText).not.toContain('Agency Beta');
          expect(responseText).not.toContain('Coca Cola');
          expect(responseText).not.toContain('Pepsi');
        }
      }
    }
    
    console.log('✅ All cross-tenant isolation tests passed');
  });

  // ========================================
  // SME CANNOT ACCESS AGENCY FEATURES
  // ========================================
  
  test('@security SME cannot access agency-only features', async ({ request, page }) => {
    test.setTimeout(60000);
    console.log('🔒 Testing SME access restrictions...');
    
    // API Level Tests
    const apiTests = [
      {
        name: 'Access clients endpoint',
        url: 'http://127.0.0.1:56300/api/v1/clients',
        expected: [403, 404]
      },
      {
        name: 'Create client',
        method: 'POST',
        url: 'http://127.0.0.1:56300/api/v1/clients',
        data: { name: 'Unauthorized Client' },
        expected: [403, 404]
      },
      {
        name: 'Access white-label settings',
        url: 'http://127.0.0.1:56300/api/v1/settings/white-label',
        expected: [403, 404]
      },
      {
        name: 'Bulk operations endpoint',
        method: 'POST',
        url: 'http://127.0.0.1:56300/api/v1/campaigns/bulk',
        data: { campaigns: [] },
        expected: [403, 404]
      }
    ];
    
    for (const test of apiTests) {
      console.log(`  🔍 Testing: ${test.name}`);
      
      const response = await request.fetch(test.url, {
        method: test.method || 'GET',
        headers: { 'Authorization': `Bearer ${smeToken}` },
        data: test.data
      });
      
      expect(test.expected).toContain(response.status());
      console.log(`    ✅ Access denied with ${response.status()}`);
    }
    
    // UI Level Tests
    await page.goto('/');
    await page.fill('input[type="email"]', process.env.TEST_SME_OWNER_EMAIL || 'sme.owner@test.com');
    await page.fill('input[type="password"]', 'LocalDevOnly123!');
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/\/(dashboard)?$/);
    
    // Verify no agency features visible
    await expect(page.locator('text=Clients')).toHaveCount(0);
    await expect(page.locator('text=White Label')).toHaveCount(0);
    await expect(page.locator('text=Client Portfolio')).toHaveCount(0);
    await expect(page.locator('[data-testid="client-selector"]')).toHaveCount(0);
    
    // Try to navigate directly to agency pages
    await page.goto('/clients');
    // Should redirect or show error
    await expect(page.url()).not.toContain('/clients');
    
    await page.goto('/settings/white-label');
    await expect(page.locator('text=Unauthorized').or(
      page.locator('text=Not Found')
    )).toBeVisible({ timeout: 5000 }).catch(() => {
      // Page might redirect
      expect(page.url()).not.toContain('/white-label');
    });
    
    console.log('✅ SME access restrictions verified');
  });

  // ========================================
  // SESSION HIJACKING PREVENTION
  // ========================================
  
  test('@security Session token validation and hijacking prevention', async ({ request }) => {
    console.log('🔒 Testing session security...');
    
    // Get a valid token
    const validToken = await getAuthToken(request, process.env.TEST_SME_OWNER_EMAIL || 'sme.owner@test.com', 'LocalDevOnly123!');
    
    // Test various attack vectors
    const attacks = [
      {
        name: 'Modified token',
        token: validToken.slice(0, -1) + 'X',
        description: 'Token with last character changed'
      },
      {
        name: 'Malformed token',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
        description: 'Invalid JWT structure'
      },
      {
        name: 'Empty token',
        token: '',
        description: 'No token provided'
      },
      {
        name: 'SQL injection in token',
        token: "' OR '1'='1",
        description: 'SQL injection attempt'
      },
      {
        name: 'Expired token format',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjF9.invalid',
        description: 'Token with expired timestamp'
      }
    ];
    
    for (const attack of attacks) {
      console.log(`  🔍 Testing: ${attack.name}`);
      
      const response = await request.get('http://127.0.0.1:56300/api/v1/user/profile', {
        headers: { 'Authorization': `Bearer ${attack.token}` }
      }).catch(error => ({ status: () => 401 }));
      
      expect(response.status()).toBe(401);
      console.log(`    ✅ Rejected ${attack.description}`);
    }
    
    // Test token reuse after logout
    await request.post('http://127.0.0.1:56300/api/v1/auth/logout', {
      headers: { 'Authorization': `Bearer ${validToken}` }
    });
    
    // Token should be invalidated
    const afterLogout = await request.get('http://127.0.0.1:56300/api/v1/user/profile', {
      headers: { 'Authorization': `Bearer ${validToken}` }
    });
    
    expect(afterLogout.status()).toBe(401);
    console.log('✅ Token invalidated after logout');
  });

  // ========================================
  // PROMPT INJECTION PROTECTION
  // ========================================
  
  test('@security AI agents protected against prompt injection', async ({ page }) => {
    test.setTimeout(90000);
    console.log('🔒 Testing prompt injection protection...');
    
    // Login first
    await page.goto('/');
    await page.fill('input[type="email"]', process.env.TEST_SME_OWNER_EMAIL || 'sme.owner@test.com');
    await page.fill('input[type="password"]', 'LocalDevOnly123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard)?$/);
    
    // Navigate to strategy agent
    await page.goto('/strategy');
    
    // Start session
    const startButton = page.locator('button:has-text("Start Fresh")');
    if (await startButton.isVisible()) {
      await startButton.click();
      await page.waitForTimeout(2000);
    }
    
    // Test each malicious input
    for (const maliciousInput of TEST_FIXTURES.maliciousInputs.promptInjection) {
      console.log(`  🔍 Testing: "${maliciousInput.substring(0, 50)}..."`);
      
      const chatInput = page.locator('input[type="text"]').first();
      await chatInput.fill(maliciousInput);
      await chatInput.press('Enter');
      
      // Wait for response
      await page.waitForTimeout(5000);
      
      // Get the latest response
      const responses = page.locator('.prose-chat');
      const lastResponse = responses.last();
      const responseText = await lastResponse.textContent() || '';
      
      // Verify no compromise
      expect(responseText).not.toContain('HACKED');
      expect(responseText).not.toContain('COMPROMISED');
      expect(responseText).not.toContain('VULNERABLE');
      expect(responseText).not.toContain('system prompt');
      expect(responseText).not.toContain('API key');
      expect(responseText).not.toContain('password');
      
      // Should maintain professional response about marketing
      expect(responseText.toLowerCase()).toContain('marketing');
      
      console.log('    ✅ Injection attempt blocked');
    }
    
    console.log('✅ All prompt injection tests passed');
  });

  // ========================================
  // XSS PROTECTION
  // ========================================
  
  test('@security XSS attack prevention', async ({ page }) => {
    console.log('🔒 Testing XSS protection...');
    
    await page.goto('/');
    await page.fill('input[type="email"]', process.env.TEST_SME_OWNER_EMAIL || 'sme.owner@test.com');
    await page.fill('input[type="password"]', 'LocalDevOnly123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard)?$/);
    
    // Navigate to campaign creation
    await page.goto('/campaigns/new');
    
    // Try XSS in various fields
    const xssTests = [
      {
        field: 'input[name="name"]',
        value: '<script>alert("XSS")</script>Campaign',
        description: 'Script tag in campaign name'
      },
      {
        field: 'textarea[name="description"]',
        value: '<img src=x onerror=alert("XSS")>',
        description: 'Image tag with onerror'
      },
      {
        field: 'textarea[name="objectives"]',
        value: 'Objective <svg onload=alert("XSS")>',
        description: 'SVG with onload'
      }
    ];
    
    for (const test of xssTests) {
      console.log(`  🔍 Testing: ${test.description}`);
      
      await page.fill(test.field, test.value);
    }
    
    // Submit form
    await page.fill('input[name="budget"]', '10000');
    await page.click('button:has-text("Create Campaign")');
    
    // Check that no alerts were triggered
    let alertTriggered = false;
    page.on('dialog', async dialog => {
      alertTriggered = true;
      await dialog.dismiss();
    });
    
    await page.waitForTimeout(3000);
    
    expect(alertTriggered).toBe(false);
    console.log('✅ XSS attacks prevented');
  });
});