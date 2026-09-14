import {
  DEFAULT_LOCALE,
  ENABLED_LOCALES,
  normalizeLocale,
  type EnabledLocale,
  type SupportedLocale,
} from '@/lib/locales';

export const NON_DEFAULT_ENABLED_LOCALES = ENABLED_LOCALES.filter(
  (locale) => locale !== DEFAULT_LOCALE
) as readonly EnabledLocale[];

const LOCALE_PREFIX_SET = new Set<string>(NON_DEFAULT_ENABLED_LOCALES);

function ensureLeadingSlash(pathname: string): string {
  if (!pathname) return '/';
  return pathname.startsWith('/') ? pathname : `/${pathname}`;
}

export function getPathLocale(pathname: string): SupportedLocale {
  const normalizedPath = ensureLeadingSlash(pathname);
  const [firstSegment] = normalizedPath.split('/').filter(Boolean);
  const locale = normalizeLocale(firstSegment);

  if (locale && LOCALE_PREFIX_SET.has(locale)) {
    return locale;
  }

  return DEFAULT_LOCALE;
}

export function stripLocalePrefix(pathname: string): string {
  const normalizedPath = ensureLeadingSlash(pathname);
  const segments = normalizedPath.split('/').filter(Boolean);
  const firstSegment = segments[0];
  const locale = normalizeLocale(firstSegment);

  if (!locale || !LOCALE_PREFIX_SET.has(locale)) {
    return normalizedPath;
  }

  const stripped = `/${segments.slice(1).join('/')}`;
  return stripped === '/' ? '/' : stripped.replace(/\/{2,}/g, '/');
}

export function buildLocalizedPath(locale: SupportedLocale, pathname: string): string {
  const normalizedPath = stripLocalePrefix(pathname);
  if (locale === DEFAULT_LOCALE) {
    return normalizedPath;
  }

  return normalizedPath === '/'
    ? `/${locale}`
    : `/${locale}${normalizedPath}`;
}

export function buildLocalizedLocation(
  locale: SupportedLocale,
  location: Pick<Location, 'pathname' | 'search' | 'hash'> | { pathname: string; search?: string; hash?: string }
): string {
  return `${buildLocalizedPath(locale, location.pathname)}${location.search ?? ''}${location.hash ?? ''}`;
}

export function stripLeadingSlash(path: string): string {
  return path.replace(/^\/+/, '');
}

export function shouldBypassLocalePrefix(pathname: string): boolean {
  const normalizedPath = stripLocalePrefix(pathname);
  return normalizedPath.startsWith('/auth/callback');
}
