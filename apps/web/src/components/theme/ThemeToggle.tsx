import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';

/**
 * Dark Mode Toggle Button
 *
 * Simple Moon/Sun icon toggle for manual dark mode control.
 * Uses STRAŦUM brand colors (Gold #F59E0B for icon hover).
 *
 * @example
 * <ThemeToggle />
 *
 * Behavior:
 * - Shows Sun icon in dark mode (click to go light)
 * - Shows Moon icon in light mode (click to go dark)
 * - Persists choice to localStorage
 *
 * @see /docs/verification/DARK_MODE_OS_INTEGRATION.md - Option A
 */
export function ThemeToggle() {
  const { t } = useTranslation('common');
  const { isDark, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={isDark ? t('theme.switchToLight') : t('theme.switchToDark')}
      className="text-slate-500 hover:text-amber-500 dark:text-slate-400 dark:hover:text-amber-400 transition-colors"
    >
      {isDark ? (
        <Sun className="h-5 w-5" aria-hidden="true" />
      ) : (
        <Moon className="h-5 w-5" aria-hidden="true" />
      )}
    </Button>
  );
}
