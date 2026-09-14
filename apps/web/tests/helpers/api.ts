import { Page } from '@playwright/test';

/**
 * Wait for an API response
 */
export async function waitForAPIResponse(page: Page, urlPattern: string | RegExp, timeout: number = 10000) {
  return page.waitForResponse(
    response => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern) && response.status() === 200;
      } else {
        return urlPattern.test(url) && response.status() === 200;
      }
    },
    { timeout }
  );
}

/**
 * Wait for SSE stream to complete
 */
export async function waitForSSEComplete(page: Page, urlPattern: string | RegExp, timeout: number = 30000) {
  // For SSE streams, we typically wait for the stream to start and then some content to appear
  await waitForAPIResponse(page, urlPattern, timeout);
  // Give some time for the stream to complete
  await page.waitForTimeout(2000);
}