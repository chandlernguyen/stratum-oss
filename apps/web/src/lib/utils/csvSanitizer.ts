/**
 * CSV Sanitization Utility
 * Prevents CSV injection (formula injection) attacks
 * Date: 2025-10-17
 *
 * Reference: https://owasp.org/www-community/attacks/CSV_Injection
 */

/**
 * Sanitize a single CSV cell value to prevent formula injection
 * @param value - Any value to be written to a CSV cell
 * @returns Sanitized string safe for CSV export
 */
export function sanitizeCSVCell(value: any): string {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value);

  // Prevent formula injection by escaping dangerous characters
  // Characters that can trigger formula execution: = + - @ \t \r
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`; // Prefix with single quote to treat as text
  }

  // Escape special CSV characters (quotes, commas, newlines)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Generate a safe CSV string from array of objects
 * @param data - Array of objects to export
 * @param headers - Optional array of header names (uses object keys if not provided)
 * @returns CSV string with sanitized values
 */
export function generateSafeCSV(data: any[], headers?: string[]): string {
  if (data.length === 0) {
    return '';
  }

  // Use provided headers or extract from first object
  const csvHeaders = headers || Object.keys(data[0]);

  // Create header row
  const headerRow = csvHeaders.map(sanitizeCSVCell).join(',');

  // Create data rows
  const dataRows = data.map(row =>
    csvHeaders.map(header => sanitizeCSVCell(row[header])).join(',')
  );

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Test if a string contains potential CSV injection
 * @param value - String to test
 * @returns true if value contains dangerous characters
 */
export function hasCSVInjectionRisk(value: string): boolean {
  return /^[=+\-@\t\r]/.test(value);
}
