import i18n from '@/lib/i18n';

/**
 * Centralized locale header helpers for all direct API calls.
 * Keeps backend locale resolution aligned with the user's in-app language.
 */
export function getLocaleHeaderValue(): string {
  return i18n.resolvedLanguage || i18n.language || 'en';
}

export function getLocaleHeaders(headers?: HeadersInit): Record<string, string> {
  const mergedHeaders = new Headers(headers);
  mergedHeaders.set('X-Locale', getLocaleHeaderValue());
  return Object.fromEntries(mergedHeaders.entries());
}
