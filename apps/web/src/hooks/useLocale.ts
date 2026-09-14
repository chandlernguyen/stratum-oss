/**
 * useLocale Hook - Centralized locale management
 *
 * Provides:
 * - Current locale state
 * - setLocale() to change language (updates DB + i18next)
 * - Formatting utilities
 *
 * Syncs with useUserIdentity() for persistent user preferences.
 */

import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';
import { toast } from 'sonner';
import type { EnabledLocale, SupportedLocale } from '@/lib/locales';
import {
  ENABLED_LOCALES,
  LOCALE_DISPLAY_NAMES,
  changeLanguage,
  getCurrentLanguage,
  formatDate,
  formatDateTime,
  formatCurrency,
  formatNumber,
  formatPercent,
  formatRelativeTime,
} from '@/lib/i18n';

export interface UseLocaleReturn {
  // Current locale
  locale: SupportedLocale;

  // Change locale (persists to DB)
  setLocale: (locale: EnabledLocale) => Promise<void>;
  isChangingLocale: boolean;

  // All supported locales
  supportedLocales: readonly EnabledLocale[];
  localeDisplayNames: Record<SupportedLocale, string>;

  // Translation function (shorthand)
  t: ReturnType<typeof useTranslation>['t'];

  // Formatting utilities bound to current locale
  formatDate: (date: Date | string | number) => string;
  formatDateTime: (date: Date | string | number) => string;
  formatCurrency: (amount: number, currency?: string) => string;
  formatNumber: (num: number, options?: Intl.NumberFormatOptions) => string;
  formatPercent: (value: number, decimals?: number) => string;
  formatRelativeTime: (date: Date | string | number) => string;
}

/**
 * Hook for managing application locale
 *
 * @param namespace - Optional namespace for translation function
 * @returns Locale utilities and state
 */
export function useLocale(namespace?: string): UseLocaleReturn {
  const { t, i18n } = useTranslation(namespace);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const locale = useMemo(
    () => (getCurrentLanguage() as SupportedLocale) || 'en',
    [i18n.language]
  );

  // Mutation to persist locale to database
  const localeMutation = useMutation({
    mutationFn: async (newLocale: EnabledLocale) => {
      // Always update i18next immediately for UI responsiveness
      await changeLanguage(newLocale);

      // Only persist to DB if user is authenticated
      if (user?.id) {
        const { error } = await supabase
          .from('users')
          .update({
            locale: newLocale,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (error) {
          console.error('[useLocale] Failed to persist locale:', error);
          // Don't throw - UI change already applied
        }
      }

      return newLocale;
    },
    onSuccess: () => {
      // Invalidate user-related queries to refresh with new locale
      queryClient.invalidateQueries({ queryKey: ['user-identity'] });
    },
    onError: (error: Error) => {
      console.error('[useLocale] Error changing locale:', error);
      toast.error('Failed to change language');
    },
  });

  const setLocale = useCallback(
    async (newLocale: EnabledLocale) => {
      if (newLocale === locale) return;
      if (!ENABLED_LOCALES.includes(newLocale as EnabledLocale)) {
        console.warn(`[useLocale] Unsupported locale: ${newLocale}`);
        return;
      }
      await localeMutation.mutateAsync(newLocale);
    },
    [locale, localeMutation]
  );

  // Memoized formatting functions bound to current locale
  const boundFormatDate = useCallback(
    (date: Date | string | number) => formatDate(date, locale),
    [locale]
  );

  const boundFormatDateTime = useCallback(
    (date: Date | string | number) => formatDateTime(date, locale),
    [locale]
  );

  const boundFormatCurrency = useCallback(
    (amount: number, currency: string = 'USD') =>
      formatCurrency(amount, locale, currency),
    [locale]
  );

  const boundFormatNumber = useCallback(
    (num: number, options?: Intl.NumberFormatOptions) =>
      formatNumber(num, locale, options),
    [locale]
  );

  const boundFormatPercent = useCallback(
    (value: number, decimals: number = 0) =>
      formatPercent(value, locale, decimals),
    [locale]
  );

  const boundFormatRelativeTime = useCallback(
    (date: Date | string | number) => formatRelativeTime(date, locale),
    [locale]
  );

  return {
    locale,
    setLocale,
    isChangingLocale: localeMutation.isPending,
    supportedLocales: ENABLED_LOCALES,
    localeDisplayNames: LOCALE_DISPLAY_NAMES,
    t,
    formatDate: boundFormatDate,
    formatDateTime: boundFormatDateTime,
    formatCurrency: boundFormatCurrency,
    formatNumber: boundFormatNumber,
    formatPercent: boundFormatPercent,
    formatRelativeTime: boundFormatRelativeTime,
  };
}

export default useLocale;
