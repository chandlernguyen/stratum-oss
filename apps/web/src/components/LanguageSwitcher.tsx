/**
 * Language Switcher Component
 *
 * A refined dropdown for switching between enabled application locales.
 * Follows STRAŦUM brand guidelines with premium styling.
 */

import { useTranslation } from 'react-i18next';
import { Globe, Check, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLocale } from '@/hooks/useLocale';
import { ENABLED_LOCALES, LOCALE_REGISTRY, type EnabledLocale } from '@/lib/locales';
import { cn } from '@/lib/utils';

const LANGUAGES = ENABLED_LOCALES.map((code) => ({
  code,
  label: LOCALE_REGISTRY[code].label,
  nativeLabel: LOCALE_REGISTRY[code].nativeLabel,
  flag: LOCALE_REGISTRY[code].flag,
}));

interface LanguageSwitcherProps {
  /** Show full language name instead of just the flag/icon */
  showLabel?: boolean;
  /** Additional CSS classes for the trigger button */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Optional callback for syncing route structure after locale changes */
  onLocaleChange?: (locale: EnabledLocale) => Promise<void> | void;
}

export function LanguageSwitcher({
  showLabel = false,
  className,
  size = 'sm',
  onLocaleChange,
}: LanguageSwitcherProps) {
  const { t } = useTranslation(['common']);
  const { locale, setLocale, isChangingLocale } = useLocale();

  const currentLanguage = LANGUAGES.find((lang) => lang.code === locale) || LANGUAGES[0];
  const compactCode = currentLanguage.code.toUpperCase();

  const handleLanguageChange = async (langCode: EnabledLocale) => {
    if (langCode !== locale) {
      await setLocale(langCode);
      await onLocaleChange?.(langCode);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          // Base styles
          'group inline-flex items-center justify-center gap-1.5 rounded-lg transition-all duration-200',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          'focus-visible:ring-brand-gold/50 focus-visible:ring-offset-background',
          // Size variants
          size === 'sm' && 'h-8 px-2.5 text-sm',
          size === 'md' && 'h-9 px-3 text-sm',
          // Default state - subtle but visible
          'bg-transparent text-muted-foreground',
          'border border-transparent',
          // Hover state - refined emphasis
          'hover:bg-muted/50 hover:text-foreground hover:border-border/50',
          // Active/open state
          'data-[state=open]:bg-muted/70 data-[state=open]:text-foreground',
          'data-[state=open]:border-border',
          // Disabled state
          'disabled:opacity-50 disabled:pointer-events-none',
          className
        )}
        disabled={isChangingLocale}
        aria-label={t('languageSwitcher.ariaLabel', { language: currentLanguage.nativeLabel })}
        data-testid="language-switcher"
      >
        <div className="relative h-4 w-4">
          <Globe
            className={cn(
              "h-4 w-4 absolute inset-0 transition-all duration-300",
              isChangingLocale
                ? "opacity-0 scale-75 rotate-180"
                : "opacity-100 scale-100 rotate-0 group-hover:text-brand-gold"
            )}
          />
          <Loader2
            className={cn(
              "h-4 w-4 absolute inset-0 text-brand-gold transition-all duration-300",
              isChangingLocale
                ? "opacity-100 scale-100 animate-spin"
                : "opacity-0 scale-75"
            )}
          />
        </div>

        <span className="font-medium">
          {showLabel ? currentLanguage.nativeLabel : compactCode}
        </span>

        {/* Subtle chevron indicator */}
        <svg
          className={cn(
            'h-3 w-3 opacity-50 transition-transform duration-200',
            'group-data-[state=open]:rotate-180'
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className={cn(
          // Glass morphism effect
          'min-w-[160px] p-1.5',
          'bg-popover/95 backdrop-blur-xl',
          'border border-border/80',
          'shadow-lg shadow-black/5 dark:shadow-black/20',
          'rounded-xl',
          // Animation
          'animate-in fade-in-0 zoom-in-95',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95'
        )}
      >
        {LANGUAGES.map((language) => {
          const isSelected = language.code === locale;

          return (
            <DropdownMenuItem
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              disabled={isChangingLocale}
              className={cn(
                // Base styles
                'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer',
                'transition-all duration-150',
                'focus:outline-none',
                // Default state
                'text-foreground/80',
                // Hover state
                'hover:bg-brand-gold/10 hover:text-foreground',
                'focus:bg-brand-gold/10 focus:text-foreground',
                // Selected state - subtle gold accent
                isSelected && [
                  'bg-brand-gold/5 text-foreground',
                  'hover:bg-brand-gold/15',
                ]
              )}
            >
              {/* Flag emoji */}
              <span className="text-base leading-none" role="img" aria-hidden="true">
                {language.flag}
              </span>

              {/* Language names */}
              <div className="flex-1 min-w-0">
                <span className="block font-medium text-sm">
                  {language.nativeLabel}
                </span>
                {language.label !== language.nativeLabel && (
                  <span className="block text-xs text-muted-foreground">
                    {language.label}
                  </span>
                )}
              </div>

              {/* Check mark for selected */}
              {isSelected && (
                <Check className="h-4 w-4 text-brand-gold flex-shrink-0" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default LanguageSwitcher;
