import { test, expect, Page } from '@playwright/test';

const MOBILE_VIEWPORT = {
  width: 393,
  height: 852,
};

const TEST_USER = {
  email: 'sme.owner@example.com',
  password: 'LocalDevOnly123!',
};

const MIN_TOUCH_TARGET_SIZE = 48;

interface TouchTargetViolation {
  page: string;
  selector: string;
  element: string;
  width: number;
  height: number;
  text?: string;
  ariaLabel?: string;
}

const violations: TouchTargetViolation[] = [];

async function auditTouchTargets(page: Page, pageName: string) {
  console.log(`\n🔍 Auditing: ${pageName}`);

  await page.waitForLoadState('networkidle', { timeout: 15000 });
  await page.waitForTimeout(1500);

  const interactiveSelectors = [
    'button:visible',
    'a:visible',
    'input[type="button"]:visible',
    'input[type="submit"]:visible',
    '[role="button"]:visible',
    '[onclick]:visible',
  ];

  for (const selector of interactiveSelectors) {
    const elements = await page.locator(selector).all();

    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];

      try {
        const isVisible = await element.isVisible();
        if (!isVisible) continue;

        const box = await element.boundingBox();
        if (!box) continue;

        if (box.width < MIN_TOUCH_TARGET_SIZE || box.height < MIN_TOUCH_TARGET_SIZE) {
          const text = await element.textContent();
          const ariaLabel = await element.getAttribute('aria-label');
          const tagName = await element.evaluate(el => el.tagName.toLowerCase());

          // Get additional debug info
          const className = await element.getAttribute('class');
          const role = await element.getAttribute('role');
          const position = `x:${Math.round(box.x)}, y:${Math.round(box.y)}`;

          violations.push({
            page: pageName,
            selector,
            element: tagName,
            width: Math.round(box.width),
            height: Math.round(box.height),
            text: text?.trim().substring(0, 50) || undefined,
            ariaLabel: ariaLabel || undefined,
          });

          console.log(`  ❌ Violation: ${tagName} (${Math.round(box.width)}x${Math.round(box.height)}px)`);
          console.log(`     Position: ${position}`);
          console.log(`     Text: ${text?.trim().substring(0, 50) || 'N/A'}`);
          console.log(`     Aria-label: ${ariaLabel || 'N/A'}`);
          console.log(`     Role: ${role || 'N/A'}`);
          console.log(`     Classes: ${className?.substring(0, 150) || 'N/A'}`);
        }
      } catch (error) {
        continue;
      }
    }
  }

  const pageViolations = violations.filter(v => v.page === pageName);
  console.log(`  ✓ Found ${pageViolations.length} violations on ${pageName}`);
}

test.describe('Focused Touch Target Audit', () => {
  test.use({ viewport: MOBILE_VIEWPORT });

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('Audit Business Strategy and Persona Agent pages', async ({ page }) => {
    test.setTimeout(60000);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📱 FOCUSED TOUCH TARGET AUDIT');
    console.log(`   Pages: Business Strategy, Persona Agent`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Audit Business Strategy
    await page.goto('/strategy');
    await auditTouchTargets(page, 'Business Strategy');

    // Audit Persona Agent
    await page.goto('/persona');
    await auditTouchTargets(page, 'Persona Agent');

    // Print results
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 AUDIT RESULTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`Total violations found: ${violations.length}\n`);

    violations.forEach(v => {
      console.log(`${v.page}: ${v.element} (${v.width}x${v.height}px)${v.text ? ` - "${v.text}"` : ''}${v.ariaLabel ? ` [${v.ariaLabel}]` : ''}`);
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Test passes if 0 violations
    expect(violations.length).toBe(0);
  });
});
