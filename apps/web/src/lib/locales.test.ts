import { describe, expect, it } from 'vitest';
import {
  ENABLED_LOCALES,
  LOCALE_REGISTRY,
  getDateFnsLocale,
  getIntlLocale,
  isEnabledLocale,
  normalizeLocale,
} from './locales';

describe('locale registry', () => {
  it('keeps Spanish and French enabled in the rollout registry', () => {
    expect(ENABLED_LOCALES).toContain('es');
    expect(ENABLED_LOCALES).toContain('fr');
    expect(LOCALE_REGISTRY.es.enabled).toBe(true);
    expect(LOCALE_REGISTRY.fr.enabled).toBe(true);
    expect(isEnabledLocale('es')).toBe(true);
    expect(isEnabledLocale('es-MX')).toBe(true);
    expect(isEnabledLocale('fr')).toBe(true);
    expect(isEnabledLocale('fr-CA')).toBe(true);
  });

  it('normalizes locale aliases to canonical values', () => {
    expect(normalizeLocale('es-ES')).toBe('es');
    expect(normalizeLocale('es_mx')).toBe('es');
    expect(normalizeLocale('zh-HK')).toBe('zh-HK');
  });

  it('returns locale-specific Intl and date-fns config for enabled non-English locales', () => {
    expect(getIntlLocale('es')).toBe('es-ES');
    expect(getDateFnsLocale('es').code).toBe('es');
    expect(getIntlLocale('fr')).toBe('fr-FR');
    expect(getDateFnsLocale('fr').code).toBe('fr');
  });
});
