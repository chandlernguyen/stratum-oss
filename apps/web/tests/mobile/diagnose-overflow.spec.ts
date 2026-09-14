import { test } from '@playwright/test';

test('Find horizontal scroll culprits at 360px - Landing Page', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('http://127.0.0.1:56310');

  const overflowing = await page.evaluate(() => {
    const html = document.documentElement;
    const elements = Array.from(document.querySelectorAll('*'));

    return elements
      .map(el => {
        const rect = el.getBoundingClientRect();
        const styles = window.getComputedStyle(el);

        if (rect.right > html.clientWidth + 1 || rect.left < -1) {
          return {
            tag: el.tagName,
            class: el.className,
            id: el.id,
            right: Math.round(rect.right),
            width: Math.round(rect.width),
            overflow: Math.round(rect.right - html.clientWidth),
            position: styles.position,
            display: styles.display
          };
        }
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => (b as any).overflow - (a as any).overflow)
      .slice(0, 10);
  });

  const viewportWidth = await page.evaluate(() => document.documentElement.clientWidth);
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);

  console.log('\n=== LANDING PAGE (360px) ===');
  console.log('Viewport width:', viewportWidth);
  console.log('Document scrollWidth:', scrollWidth);
  console.log('Total overflow:', scrollWidth - viewportWidth, 'px');
  console.log('\nTop 10 overflowing elements:');
  console.table(overflowing);
});

test('Find horizontal scroll culprits at 360px - SME Dashboard', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });

  // Login as SME user
  await page.goto('http://127.0.0.1:56310/login');
  await page.fill('input[type="email"]', 'sme.owner@example.com');
  await page.fill('input[type="password"]', 'LocalDevOnly123!');
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  await page.waitForTimeout(2000); // Let layout settle

  const overflowing = await page.evaluate(() => {
    const html = document.documentElement;
    const elements = Array.from(document.querySelectorAll('*'));

    return elements
      .map(el => {
        const rect = el.getBoundingClientRect();
        const styles = window.getComputedStyle(el);

        if (rect.right > html.clientWidth + 1 || rect.left < -1) {
          return {
            tag: el.tagName,
            class: el.className,
            id: el.id,
            right: Math.round(rect.right),
            width: Math.round(rect.width),
            overflow: Math.round(rect.right - html.clientWidth),
            position: styles.position,
            display: styles.display
          };
        }
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => (b as any).overflow - (a as any).overflow)
      .slice(0, 10);
  });

  const viewportWidth = await page.evaluate(() => document.documentElement.clientWidth);
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);

  console.log('\n=== SME DASHBOARD (360px) ===');
  console.log('Viewport width:', viewportWidth);
  console.log('Document scrollWidth:', scrollWidth);
  console.log('Total overflow:', scrollWidth - viewportWidth, 'px');
  console.log('\nTop 10 overflowing elements:');
  console.table(overflowing);
});

test('Find horizontal scroll culprits at 360px - Agency Dashboard', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });

  // Login as Agency user
  await page.goto('http://127.0.0.1:56310/login');
  await page.fill('input[type="email"]', 'agency.owner@example.com');
  await page.fill('input[type="password"]', 'LocalDevOnly123!');
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  await page.waitForTimeout(2000); // Let layout settle

  const overflowing = await page.evaluate(() => {
    const html = document.documentElement;
    const elements = Array.from(document.querySelectorAll('*'));

    return elements
      .map(el => {
        const rect = el.getBoundingClientRect();
        const styles = window.getComputedStyle(el);

        if (rect.right > html.clientWidth + 1 || rect.left < -1) {
          return {
            tag: el.tagName,
            class: el.className,
            id: el.id,
            right: Math.round(rect.right),
            width: Math.round(rect.width),
            overflow: Math.round(rect.right - html.clientWidth),
            position: styles.position,
            display: styles.display
          };
        }
        return null;
      })
      .filter(Boolean)
      .sort((a, b) => (b as any).overflow - (a as any).overflow)
      .slice(0, 10);
  });

  const viewportWidth = await page.evaluate(() => document.documentElement.clientWidth);
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);

  console.log('\n=== AGENCY DASHBOARD (360px) ===');
  console.log('Viewport width:', viewportWidth);
  console.log('Document scrollWidth:', scrollWidth);
  console.log('Total overflow:', scrollWidth - viewportWidth, 'px');
  console.log('\nTop 10 overflowing elements:');
  console.table(overflowing);
});
