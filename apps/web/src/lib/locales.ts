import type { Locale as DateFnsLocale } from 'date-fns';
import { de, enUS, es, fr, ja, ko, ptBR, vi, zhCN, zhHK } from 'date-fns/locale';

export const DEFAULT_LOCALE = 'en' as const;

export const ALL_LOCALES = [
  'en',
  'vi',
  'es',
  'fr',
  'ja',
  'ko',
  'zh-CN',
  'de',
  'pt-BR',
  'zh-HK',
] as const;

export type SupportedLocale = (typeof ALL_LOCALES)[number];

export const ENABLED_LOCALES = ['en', 'vi', 'es', 'fr', 'ja', 'ko', 'zh-CN', 'de', 'pt-BR', 'zh-HK'] as const satisfies readonly SupportedLocale[];
export type EnabledLocale = (typeof ENABLED_LOCALES)[number];

type LocaleConfig = {
  label: string;
  nativeLabel: string;
  flag: string;
  intlLocale: string;
  enabled: boolean;
  fallbackLocale: SupportedLocale;
  aliases: readonly string[];
};

export const LOCALE_REGISTRY: Record<SupportedLocale, LocaleConfig> = {
  en: {
    label: 'English',
    nativeLabel: 'English',
    flag: '🇺🇸',
    intlLocale: 'en-US',
    enabled: true,
    fallbackLocale: 'en',
    aliases: ['en-us', 'en-gb', 'en-au', 'en-ca'],
  },
  vi: {
    label: 'Vietnamese',
    nativeLabel: 'Tiếng Việt',
    flag: '🇻🇳',
    intlLocale: 'vi-VN',
    enabled: true,
    fallbackLocale: 'en',
    aliases: ['vi-vn'],
  },
  es: {
    label: 'Spanish',
    nativeLabel: 'Español',
    flag: '🇪🇸',
    intlLocale: 'es-ES',
    enabled: true,
    fallbackLocale: 'en',
    aliases: ['es-es', 'es-419', 'es-mx'],
  },
  fr: {
    label: 'French',
    nativeLabel: 'Français',
    flag: '🇫🇷',
    intlLocale: 'fr-FR',
    enabled: true,
    fallbackLocale: 'en',
    aliases: ['fr-fr', 'fr-ca'],
  },
  ja: {
    label: 'Japanese',
    nativeLabel: '日本語',
    flag: '🇯🇵',
    intlLocale: 'ja-JP',
    enabled: true,
    fallbackLocale: 'en',
    aliases: ['ja-jp'],
  },
  ko: {
    label: 'Korean',
    nativeLabel: '한국어',
    flag: '🇰🇷',
    intlLocale: 'ko-KR',
    enabled: true,
    fallbackLocale: 'en',
    aliases: ['ko-kr'],
  },
  'zh-CN': {
    label: 'Chinese (Mandarin)',
    nativeLabel: '简体中文',
    flag: '🇨🇳',
    intlLocale: 'zh-CN',
    enabled: true,
    fallbackLocale: 'en',
    aliases: ['zh', 'zh-cn', 'zh-sg', 'zh-hans', 'zh-hans-cn'],
  },
  de: {
    label: 'German',
    nativeLabel: 'Deutsch',
    flag: '🇩🇪',
    intlLocale: 'de-DE',
    enabled: true,
    fallbackLocale: 'en',
    aliases: ['de-de'],
  },
  'pt-BR': {
    label: 'Portuguese (Brazil)',
    nativeLabel: 'Português (Brasil)',
    flag: '🇧🇷',
    intlLocale: 'pt-BR',
    enabled: true,
    fallbackLocale: 'en',
    aliases: ['pt', 'pt-br'],
  },
  'zh-HK': {
    label: 'Chinese (Hong Kong)',
    nativeLabel: '繁體中文',
    flag: '🇭🇰',
    intlLocale: 'zh-HK',
    enabled: true,
    fallbackLocale: 'en',
    aliases: ['zh-hk', 'zh-mo'],
  },
};

const LOCALE_ALIAS_MAP = Object.entries(LOCALE_REGISTRY).reduce<Record<string, SupportedLocale>>(
  (aliases, [locale, config]) => {
    aliases[locale.toLowerCase()] = locale as SupportedLocale;
    config.aliases.forEach((alias) => {
      aliases[alias.toLowerCase()] = locale as SupportedLocale;
    });
    return aliases;
  },
  {}
);

export const LOCALE_DISPLAY_NAMES: Record<SupportedLocale, string> = Object.fromEntries(
  ALL_LOCALES.map((locale) => [locale, LOCALE_REGISTRY[locale].nativeLabel])
) as Record<SupportedLocale, string>;

export function normalizeLocale(locale?: string | null): SupportedLocale | null {
  if (!locale) return null;
  const normalized = locale.replace(/_/g, '-').trim().toLowerCase();
  return LOCALE_ALIAS_MAP[normalized] ?? null;
}

export function isSupportedLocale(locale: string): locale is SupportedLocale {
  return normalizeLocale(locale) !== null;
}

export function isEnabledLocale(locale: string): locale is EnabledLocale {
  const normalized = normalizeLocale(locale);
  return normalized !== null && ENABLED_LOCALES.includes(normalized as EnabledLocale);
}

export function getLocaleConfig(locale?: string | null): LocaleConfig {
  const normalized = normalizeLocale(locale) ?? DEFAULT_LOCALE;
  return LOCALE_REGISTRY[normalized];
}

export function getIntlLocale(locale?: string | null): string {
  return getLocaleConfig(locale).intlLocale;
}

export function getDateFnsLocale(locale?: string | null): DateFnsLocale {
  switch (normalizeLocale(locale)) {
    case 'es':
      return es;
    case 'fr':
      return fr;
    case 'ja':
      return ja;
    case 'ko':
      return ko;
    case 'vi':
      return vi;
    case 'zh-CN':
      return zhCN;
    case 'de':
      return de;
    case 'pt-BR':
      return ptBR;
    case 'zh-HK':
      return zhHK;
    default:
      return enUS;
  }
}

export function getFallbackLocale(locale?: string | null): SupportedLocale {
  return getLocaleConfig(locale).fallbackLocale;
}

export function getEnabledLocales(): readonly EnabledLocale[] {
  return ENABLED_LOCALES;
}
