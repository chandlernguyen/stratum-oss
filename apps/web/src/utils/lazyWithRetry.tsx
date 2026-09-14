import { lazy } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';

/**
 * Enhanced lazy loading with retry logic for failed chunks
 * This helps with users on flaky connections or when deploying new versions
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  componentImport: () => Promise<{ default: T }>
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      return await componentImport();
    } catch (error) {
      // Retry once after a brief delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      try {
        return await componentImport();
      } catch (retryError) {
        // If retry fails, reload the page once to get fresh assets
        const hasRefreshed = window.sessionStorage.getItem('chunk_failed_refresh');

        if (!hasRefreshed) {
          window.sessionStorage.setItem('chunk_failed_refresh', 'true');
          window.location.reload();
        }

        throw retryError;
      }
    }
  });
}