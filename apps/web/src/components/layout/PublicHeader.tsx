/**
 * Public Header - Desktop Navigation
 *
 * Premium, editorial-style navigation for non-authenticated users.
 * Follows STRAŦUM brand guidelines with luxury/refined aesthetics.
 *
 * Design principles:
 * - Clear visual hierarchy: Sign In / Sign Up as primary actions
 * - Understated utility items (theme, language)
 * - Elegant hover animations with gold accent
 * - Mobile shows only logo (bottom nav handles everything else)
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { PublicBottomNav } from '@/components/layout/PublicBottomNav';
import { stripLocalePrefix } from '@/lib/localePath';
import { useLocalizedRouteSwitch } from '@/hooks/useLocalizedRouteSwitch';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';

export function PublicHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('common');
  const { isDark, toggleTheme } = useTheme();
  const handleLocalizedRouteSwitch = useLocalizedRouteSwitch();
  const { localizePath } = useLocalizedPath();
  const publicPath = stripLocalePrefix(location.pathname);

  // Don't show certain buttons on their respective pages
  const isLoginPage = publicPath === '/login';
  const isSignupPage = publicPath === '/signup';

  return (
    <>
      <nav
        className={cn(
          "sticky top-0 z-50 w-full",
          "border-b border-slate-200/60 dark:border-slate-800/60",
          "bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl",
          "safe-top"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <button
              onClick={() => navigate(localizePath('/'))}
              className="flex flex-col items-start group cursor-pointer"
            >
              <div className="font-bold text-xl md:text-2xl tracking-tight">
                <span className="text-slate-600 dark:text-slate-300">STRA</span>
                <span className="text-amber-600 dark:text-amber-500">Ŧ</span>
                <span className="text-slate-600 dark:text-slate-300">UM</span>
              </div>
              <div className="hidden sm:block text-[11px] text-slate-500 dark:text-slate-400 font-medium tracking-[0.2em] uppercase">
                Intelligence Over Execution
              </div>
            </button>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center">
              {/* Utility Group: Theme + Language */}
              <div className="flex items-center gap-1 mr-6 pr-6 border-r border-slate-200 dark:border-slate-700">
                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className={cn(
                    "relative p-2.5 rounded-lg",
                    "text-slate-500 dark:text-slate-400",
                    "hover:text-slate-600 dark:hover:text-slate-300",
                    "hover:bg-slate-100/80 dark:hover:bg-slate-800/80",
                    "transition-all duration-200",
                    "group"
                  )}
                  aria-label={isDark ? t('theme.switchToLight') : t('theme.switchToDark')}
                >
                  <div className="relative w-4 h-4">
                    <Sun
                      className={cn(
                        "w-4 h-4 absolute inset-0 transition-all duration-300",
                        isDark
                          ? "opacity-100 rotate-0 scale-100"
                          : "opacity-0 -rotate-90 scale-75"
                      )}
                    />
                    <Moon
                      className={cn(
                        "w-4 h-4 absolute inset-0 transition-all duration-300",
                        isDark
                          ? "opacity-0 rotate-90 scale-75"
                          : "opacity-100 rotate-0 scale-100"
                      )}
                    />
                  </div>
                </button>

                <LanguageSwitcher
                  onLocaleChange={handleLocalizedRouteSwitch}
                  className={cn(
                    "px-2.5 py-2 text-slate-500 dark:text-slate-400",
                    "hover:text-slate-600 dark:hover:text-slate-300",
                    "hover:bg-slate-100/80 dark:hover:bg-slate-800/80"
                  )}
                />
              </div>

              {/* Nav Links */}
              <div className="flex items-center mr-4">
                <button
                  onClick={() => navigate(localizePath('/blog'))}
                  className={cn(
                    "relative px-4 py-2 rounded-lg",
                    "text-sm font-medium",
                    publicPath.startsWith('/blog')
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white",
                    "transition-colors duration-200",
                    "group"
                  )}
                >
                  <span className="relative">
                    {t('navigation.blog')}
                    <span
                      className={cn(
                        "absolute -bottom-0.5 left-0 w-full h-px",
                        "bg-gradient-to-r from-amber-500 to-amber-400",
                        publicPath.startsWith('/blog')
                          ? "scale-x-100"
                          : "origin-left scale-x-0 group-hover:scale-x-100",
                        "transition-transform duration-300 ease-out"
                      )}
                    />
                  </span>
                </button>
                <button
                  onClick={() => navigate(localizePath('/pricing'))}
                  className={cn(
                    "relative px-4 py-2 rounded-lg",
                    "text-sm font-medium",
                    publicPath === '/pricing'
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white",
                    "transition-colors duration-200",
                    "group"
                  )}
                >
                  <span className="relative">
                    {t('navigation.pricing')}
                    <span
                      className={cn(
                        "absolute -bottom-0.5 left-0 w-full h-px",
                        "bg-gradient-to-r from-amber-500 to-amber-400",
                        publicPath === '/pricing'
                          ? "scale-x-100"
                          : "origin-left scale-x-0 group-hover:scale-x-100",
                        "transition-transform duration-300 ease-out"
                      )}
                    />
                  </span>
                </button>
              </div>

              {/* Auth Actions */}
              <div className="flex items-center gap-2">
                {/* Sign In - Understated text link */}
                {!isLoginPage && (
                  <button
                    onClick={() => navigate(localizePath('/login'))}
                    className={cn(
                      "relative px-4 py-2 rounded-lg",
                      "text-sm font-medium",
                      "text-slate-600 dark:text-slate-300",
                      "hover:text-slate-900 dark:hover:text-white",
                      "transition-colors duration-200",
                      "group"
                    )}
                  >
                    <span className="relative">
                      {t('auth.signIn')}
                      {/* Gold underline on hover */}
                      <span
                        className={cn(
                          "absolute -bottom-0.5 left-0 w-full h-px",
                          "bg-gradient-to-r from-amber-500 to-amber-400",
                          "origin-left scale-x-0 group-hover:scale-x-100",
                          "transition-transform duration-300 ease-out"
                        )}
                      />
                    </span>
                  </button>
                )}

                {/* Sign Up - Secondary link */}
                {!isSignupPage && (
                  <button
                    onClick={() => navigate(localizePath('/signup'))}
                    className={cn(
                      "relative px-4 py-2 rounded-lg",
                      "text-sm font-medium",
                      "text-slate-600 dark:text-slate-300",
                      "hover:text-slate-900 dark:hover:text-white",
                      "transition-colors duration-200",
                      "group"
                    )}
                  >
                    <span className="relative">
                      {t('auth.signUp')}
                      {/* Gold underline on hover */}
                      <span
                        className={cn(
                          "absolute -bottom-0.5 left-0 w-full h-px",
                          "bg-gradient-to-r from-amber-500 to-amber-400",
                          "origin-left scale-x-0 group-hover:scale-x-100",
                          "transition-transform duration-300 ease-out"
                        )}
                      />
                    </span>
                  </button>
                )}

              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <PublicBottomNav />
    </>
  );
}
