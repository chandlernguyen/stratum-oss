import { useEffect } from 'react';

/**
 * Custom hook to set page title dynamically for GA4 tracking and accessibility.
 *
 * Updates both the browser tab title and announces the navigation to screen readers
 * via an ARIA live region for WCAG compliance.
 *
 * @param title - The page-specific title (e.g., "Content Agent", "Dashboard")
 *
 * @example
 * ```tsx
 * function ContentAgent() {
 *   usePageTitle('Content Agent');
 *   // ...rest of component
 * }
 * ```
 */
export function usePageTitle(title: string) {
  useEffect(() => {
    // Store previous title for restoration on unmount
    const prevTitle = document.title;

    // Format: "Page Name - STRAŦUM" per brand guidelines
    const fullTitle = `${title} - STRAŦUM`;

    // Update browser tab title (visible to users and tracked by GA4)
    document.title = fullTitle;

    // Announce navigation to screen readers for accessibility (WCAG best practice)
    const announcer = document.getElementById('route-announcer');
    if (announcer) {
      announcer.textContent = `Navigated to ${title}`;
    }

    // Cleanup: restore previous title on unmount
    return () => {
      document.title = prevTitle;
    };
  }, [title]);
}
