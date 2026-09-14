/**
 * i18n Configuration for STRAŦUM
 *
 * Supports enabled locales from the canonical registry.
 *
 * Language detection priority:
 * 1. User preference (localStorage/DB)
 * 2. Browser language (navigator.language)
 * 3. Default to English
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import {
  DEFAULT_LOCALE,
  ENABLED_LOCALES,
  LOCALE_DISPLAY_NAMES,
  ALL_LOCALES,
  getIntlLocale,
  isEnabledLocale,
  isSupportedLocale as isKnownLocale,
  normalizeLocale,
  type SupportedLocale,
} from '@/lib/locales';
import { BRAND_NAME, CONTACT_EMAIL } from '@/config/brand';

export const SUPPORTED_LOCALES = ALL_LOCALES;
export { DEFAULT_LOCALE, ENABLED_LOCALES, LOCALE_DISPLAY_NAMES };

// Default namespace loaded on init
export const DEFAULT_NS = 'common';

// All namespaces available for lazy loading
export const NAMESPACES = [
  'common',       // Buttons, labels, errors, shared UI
  'landing',      // Public pages (landing, pricing, etc.)
  'auth',         // Login, signup, MFA, password reset
  'dashboard',    // Dashboard states and components
  'agents',       // Agent UI strings, hints, descriptions
  'educational',  // Educational copy, onboarding
  'campaigns',    // Campaign management
  'personas',     // Persona forms and cards
  'outputs',      // Outputs hub
  'settings',     // Settings pages (including white-label)
  'team',         // Team management, invitations
  'validation',   // Form validation messages
  'agency',       // Agency guide best practices
  'profile',      // Profile settings
  'tasks',        // Task management
  'intelligence', // Business intelligence page
  'legal',        // Privacy policy and terms pages
  'pricing',      // Public pricing page
  'blog',         // Blog chrome and content hub UI
] as const;

export type Namespace = (typeof NAMESPACES)[number];

// Initialize i18next
i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // Default language
    fallbackLng: DEFAULT_LOCALE,

    // Supported languages — exact match only (no base-language stripping)
    // nonExplicitSupportedLngs MUST be false: with true, i18next strips
    // region codes (zh-CN→zh, pt-BR→pt, zh-HK→zh) and fails to load
    // translations from the correct /locales/<locale>/ directories.
    supportedLngs: ENABLED_LOCALES,
    nonExplicitSupportedLngs: false,
    load: 'currentOnly' as const,

    // Default namespace
    defaultNS: DEFAULT_NS,
    ns: [DEFAULT_NS],

    // Language detection options
    detection: {
      // Order of detection methods
      order: ['localStorage', 'navigator', 'htmlTag'],
      // Cache user language in localStorage
      caches: ['localStorage'],
      // localStorage key
      lookupLocalStorage: 'stratum_locale',
      // Normalize browser languages (fr-CA→fr, zh-Hans→zh-CN, etc.)
      // using our canonical alias map instead of i18next's base-language stripping
      convertDetectedLanguage: (lng: string) => normalizeLocale(lng) || DEFAULT_LOCALE,
    },

    // Backend options for loading translations
    backend: {
      // Path to translation files
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },

    // Interpolation options
    interpolation: {
      // React already escapes values
      escapeValue: false,
      // Brand and site values are available to every translation string, so
      // locale files never hardcode an operator's contact address or brand name.
      defaultVariables: {
        brandName: BRAND_NAME,
        contactEmail: CONTACT_EMAIL,
      },
      // Format function for dates, numbers, etc.
      format: (value, format, lng) => {
        if (format === 'date') {
          return formatDate(value, lng as SupportedLocale);
        }
        if (format === 'currency') {
          return formatCurrency(value, lng as SupportedLocale);
        }
        if (format === 'number') {
          return formatNumber(value, lng as SupportedLocale);
        }
        return value;
      },
    },

    // React options
    react: {
      // Wait for translations to load before rendering
      useSuspense: true,
    },

    // Debug mode (disable in production)
    debug: import.meta.env.DEV,
  });

function syncDocumentLanguage(locale?: string | null) {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = normalizeLocale(locale) || DEFAULT_LOCALE;
}

i18n.on('languageChanged', syncDocumentLanguage);
syncDocumentLanguage(i18n.resolvedLanguage || i18n.language);

/**
 * Format a date according to locale conventions
 * EN: MM/DD/YYYY
 * VI: DD/MM/YYYY
 */
export function formatDate(
  date: Date | string | number,
  locale: SupportedLocale = DEFAULT_LOCALE,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };

  return d.toLocaleDateString(getIntlLocale(locale), options ?? defaultOptions);
}

/**
 * Format a date with time according to locale conventions
 */
export function formatDateTime(
  date: Date | string | number,
  locale: SupportedLocale = DEFAULT_LOCALE
): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  };

  return d.toLocaleString(getIntlLocale(locale), options);
}

/**
 * Format currency according to locale conventions
 * EN: $1,234.56
 * VI: 1.234.567 VND or $1,234.56 (for USD)
 */
export function formatCurrency(
  amount: number,
  locale: SupportedLocale = DEFAULT_LOCALE,
  currency: string = 'USD'
): string {
  // Vietnamese dong uses different formatting
  if (locale === 'vi' && currency === 'VND') {
    return new Intl.NumberFormat(getIntlLocale(locale), {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(amount);
  }

  // Default to USD formatting
  return new Intl.NumberFormat(getIntlLocale(locale), {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

/**
 * Format a number according to locale conventions
 * EN: 1,234.56
 * VI: 1.234,56
 */
export function formatNumber(
  num: number,
  locale: SupportedLocale = DEFAULT_LOCALE,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(getIntlLocale(locale), options).format(num);
}

/**
 * Format a percentage according to locale conventions
 */
export function formatPercent(
  value: number,
  locale: SupportedLocale = DEFAULT_LOCALE,
  decimals: number = 0
): string {
  return new Intl.NumberFormat(getIntlLocale(locale), {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Get relative time string (e.g., "2 hours ago", "in 3 days")
 */
export function formatRelativeTime(
  date: Date | string | number,
  locale: SupportedLocale = DEFAULT_LOCALE
): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);

  const rtf = new Intl.RelativeTimeFormat(getIntlLocale(locale), { numeric: 'auto' });

  if (Math.abs(diffSec) < 60) {
    return rtf.format(diffSec, 'second');
  }
  if (Math.abs(diffMin) < 60) {
    return rtf.format(diffMin, 'minute');
  }
  if (Math.abs(diffHour) < 24) {
    return rtf.format(diffHour, 'hour');
  }
  return rtf.format(diffDay, 'day');
}

/**
 * Change the current language
 */
export async function changeLanguage(locale: SupportedLocale): Promise<void> {
  const nextLocale = normalizeLocale(locale);
  await i18n.changeLanguage(nextLocale && isEnabledLocale(nextLocale) ? nextLocale : DEFAULT_LOCALE);
}

/**
 * Get the current language
 */
export function getCurrentLanguage(): SupportedLocale {
  return normalizeLocale(i18n.resolvedLanguage || i18n.language) || DEFAULT_LOCALE;
}

/**
 * Check if a locale is supported
 */
export function isLocaleSupported(locale: string): locale is SupportedLocale {
  return isKnownLocale(locale);
}

export default i18n;
