import { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Axe-core accessibility testing utilities
 *
 * WCAG 2.1 AA compliance with focus on critical/serious violations.
 * Designed for dark mode accessibility testing across viewports.
 *
 * @see https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright
 */

export interface AxeConfig {
  /** Impact levels to include in violation checks */
  includedImpacts?: ('critical' | 'serious' | 'moderate' | 'minor')[];
  /** Specific rules to enable/disable */
  rules?: Record<string, { enabled: boolean }>;
  /** CSS selectors to include in the scan */
  include?: string[];
  /** CSS selectors to exclude from the scan */
  exclude?: string[];
}

export interface ViolationSummary {
  id: string;
  impact: string;
  description: string;
  help: string;
  helpUrl: string;
  nodes: {
    html: string;
    target: string[];
    failureSummary: string;
  }[];
}

/**
 * Run axe accessibility analysis on the current page
 *
 * Default configuration:
 * - WCAG 2.1 AA compliance
 * - Only reports critical and serious violations
 *
 * @param page - Playwright Page object
 * @param config - Optional configuration overrides
 * @returns axe-core analysis results
 */
export async function runAxeAnalysis(page: Page, config: AxeConfig = {}) {
  const {
    includedImpacts = ['critical', 'serious'],
    rules = {},
    include = [],
    exclude = [],
  } = config;

  let builder = new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .options({ rules });

  // Include specific selectors if provided
  if (include.length > 0) {
    for (const selector of include) {
      builder = builder.include(selector);
    }
  }

  // Exclude specific selectors if provided
  if (exclude.length > 0) {
    for (const selector of exclude) {
      builder = builder.exclude(selector);
    }
  }

  const results = await builder.analyze();

  // Filter violations by impact level (handle null/undefined impact)
  const filteredViolations = results.violations.filter((violation) =>
    violation.impact &&
    includedImpacts.includes(violation.impact as 'critical' | 'serious' | 'moderate' | 'minor')
  );

  return {
    ...results,
    violations: filteredViolations,
    originalViolationCount: results.violations.length,
  };
}

/**
 * Format violations into readable strings for test output
 *
 * @param violations - Array of axe violations
 * @returns Formatted violation strings
 */
export function formatViolations(
  violations: ViolationSummary[]
): string[] {
  return violations.map((violation) => {
    const nodes = violation.nodes
      .slice(0, 3) // Limit to first 3 nodes
      .map((node) => `    - ${node.html.substring(0, 100)}${node.html.length > 100 ? '...' : ''}`)
      .join('\n');

    const moreNodes =
      violation.nodes.length > 3
        ? `\n    ... and ${violation.nodes.length - 3} more elements`
        : '';

    return `
[${violation.impact?.toUpperCase()}] ${violation.id}
  ${violation.help}
  ${violation.helpUrl}
  Affected elements (${violation.nodes.length}):
${nodes}${moreNodes}
`.trim();
  });
}

/**
 * Assert no critical/serious accessibility violations
 *
 * Throws an error with detailed violation information if violations are found.
 *
 * @param results - axe-core analysis results
 * @param context - Description of what was tested (e.g., "Dashboard (Dark Mode)")
 */
export function assertNoViolations(
  results: Awaited<ReturnType<typeof runAxeAnalysis>>,
  context: string
) {
  const { violations, originalViolationCount } = results;

  if (violations.length > 0) {
    const formatted = formatViolations(violations as ViolationSummary[]);
    const summary = `${context} has ${violations.length} critical/serious accessibility violation(s)`;
    const details = formatted.join('\n\n');
    const note =
      originalViolationCount > violations.length
        ? `\n\nNote: ${originalViolationCount - violations.length} minor/moderate violations were filtered out.`
        : '';

    throw new Error(`${summary}\n\n${details}${note}`);
  }
}

/**
 * Enable dark mode on the page
 *
 * Sets the .dark class on the document element and persists to localStorage.
 * Matches the implementation in useTheme.ts hook.
 *
 * @param page - Playwright Page object
 */
export async function enableDarkMode(page: Page) {
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
  });
}

/**
 * Enable light mode on the page
 *
 * Removes the .dark class from the document element and persists to localStorage.
 * Matches the implementation in useTheme.ts hook.
 *
 * @param page - Playwright Page object
 */
export async function enableLightMode(page: Page) {
  await page.evaluate(() => {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  });
}

/**
 * Set theme without reloading (faster for tests that are already on the page)
 *
 * @param page - Playwright Page object
 * @param theme - 'light' or 'dark'
 */
export async function setTheme(page: Page, theme: 'light' | 'dark') {
  if (theme === 'dark') {
    await enableDarkMode(page);
  } else {
    await enableLightMode(page);
  }
  // Wait for CSS to apply by verifying the class change
  await page.waitForFunction(
    (expectedTheme) => {
      const isDark = document.documentElement.classList.contains('dark');
      return expectedTheme === 'dark' ? isDark : !isDark;
    },
    theme,
    { timeout: 5000 }
  );
}

/**
 * Set theme and reload page to ensure proper CSS application
 *
 * @param page - Playwright Page object
 * @param theme - 'light' or 'dark'
 */
export async function setThemeAndReload(page: Page, theme: 'light' | 'dark') {
  if (theme === 'dark') {
    await enableDarkMode(page);
  } else {
    await enableLightMode(page);
  }
  await page.reload();
  await page.waitForLoadState('networkidle');
}

/**
 * Get current theme from page
 *
 * @param page - Playwright Page object
 * @returns 'light' or 'dark'
 */
export async function getCurrentTheme(page: Page): Promise<'light' | 'dark'> {
  return await page.evaluate(() => {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });
}
