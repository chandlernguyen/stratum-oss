import { useEffect, useState } from 'react';

/**
 * Dark Mode Toggle Hook - Option A: Manual Only
 *
 * Simple dark mode toggle with localStorage persistence.
 * No OS detection, no automatic switching - user has full control.
 *
 * @returns {Object} - { isDark, toggleTheme }
 *
 * @example
 * const { isDark, toggleTheme } = useTheme();
 *
 * Usage:
 * - isDark: boolean (true if dark mode is active)
 * - toggleTheme: () => void (toggles between light and dark)
 *
 * @see /docs/verification/DARK_MODE_OS_INTEGRATION.md - Option A
 */
export function useTheme() {
  // Initialize from localStorage, default to light mode
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem('theme');
    return stored === 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;

    // Apply or remove .dark class
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Persist user choice
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  return { isDark, toggleTheme };
}
