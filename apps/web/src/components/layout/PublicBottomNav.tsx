/**
 * Public Bottom Navigation - Mobile First
 *
 * World-class mobile navigation pattern:
 * - Bottom nav with 4 items: Home, Account, Language, Theme
 * - Account opens a sheet with Sign In + Sign Up
 *
 * Follows STRAŦUM brand guidelines with premium glass morphism styling.
 */

import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Home, Moon, Sun, User, LogIn, UserPlus, X, Tag, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/hooks/useTheme'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { stripLocalePrefix } from '@/lib/localePath'
import { useLocalizedRouteSwitch } from '@/hooks/useLocalizedRouteSwitch'
import { useLocalizedPath } from '@/hooks/useLocalizedPath'

export function PublicBottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation('common')
  const { isDark, toggleTheme } = useTheme()
  const [accountSheetOpen, setAccountSheetOpen] = useState(false)
  const handleLocalizedRouteSwitch = useLocalizedRouteSwitch()
  const { localizePath } = useLocalizedPath()
  const publicPath = stripLocalePrefix(location.pathname)

  // Don't show on login/signup pages (they have their own flows)
  const isAuthPage = publicPath === '/login' || publicPath === '/signup'
  if (isAuthPage) return null

  const isHomePage = publicPath === '/'
  const isPricingPage = publicPath === '/pricing'
  const isBlogPage = publicPath.startsWith('/blog')

  return (
    <>
      {/* Account Sheet Backdrop */}
      {accountSheetOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-in fade-in-0 duration-200"
          onClick={() => setAccountSheetOpen(false)}
        />
      )}

      {/* Account Sheet */}
      <div
        className={cn(
          "lg:hidden fixed bottom-0 left-0 right-0 z-50",
          "bg-white dark:bg-slate-900",
          "rounded-t-3xl",
          "shadow-[0_-8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.4)]",
          "border-t border-slate-200/80 dark:border-slate-700/80",
          "transition-transform duration-300 ease-out",
          "safe-bottom",
          accountSheetOpen ? "translate-y-0" : "translate-y-full"
        )}
      >
        {/* Sheet Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
        </div>

        {/* Sheet Header */}
        <div className="flex items-center justify-between px-6 pb-4">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {t('navigation.account')}
          </h3>
          <button
            onClick={() => setAccountSheetOpen(false)}
            className="p-2 -mr-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sheet Content */}
        <div className="px-4 pb-6 space-y-3">
          {/* Sign In Button */}
          <button
            onClick={() => {
              navigate(localizePath('/login'))
              setAccountSheetOpen(false)
            }}
            className={cn(
              "w-full flex items-center gap-4 p-4 rounded-2xl",
              "bg-slate-50 dark:bg-slate-800/50",
              "border border-slate-200 dark:border-slate-700",
              "hover:bg-slate-100 dark:hover:bg-slate-800",
              "hover:border-slate-300 dark:hover:border-slate-600",
              "active:scale-[0.98]",
              "transition-all duration-150"
            )}
          >
            <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
              <LogIn className="w-6 h-6 text-slate-600 dark:text-slate-300" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-semibold text-slate-800 dark:text-slate-100">{t('auth.signIn')}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">{t('auth.alreadyHaveAccount')}</div>
            </div>
          </button>

          {/* Sign Up Button */}
          <button
            onClick={() => {
              navigate(localizePath('/signup'))
              setAccountSheetOpen(false)
            }}
            className={cn(
              "w-full flex items-center gap-4 p-4 rounded-2xl",
              "bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10",
              "border border-amber-200/60 dark:border-amber-700/40",
              "hover:from-amber-100 hover:to-amber-100 dark:hover:from-amber-900/30 dark:hover:to-amber-800/20",
              "hover:border-amber-300 dark:hover:border-amber-600/50",
              "active:scale-[0.98]",
              "transition-all duration-150"
            )}
          >
            <div className="w-12 h-12 rounded-xl bg-amber-200 dark:bg-amber-800/50 flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-amber-700 dark:text-amber-400" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-semibold text-slate-800 dark:text-slate-100">{t('auth.signUp')}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">{t('auth.haveInvitation')}</div>
            </div>
          </button>
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <nav
        className={cn(
          "lg:hidden fixed bottom-0 left-0 right-0 z-40",
          // Glass morphism background
          "bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl",
          // Refined border with subtle shadow
          "border-t border-slate-200/80 dark:border-slate-700/80",
          "shadow-[0_-4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)]",
          // Safe area for iOS
          "safe-bottom"
        )}
        role="navigation"
        aria-label="Public navigation"
      >
        <div className="flex justify-around items-center h-16 px-2">
          {/* Home */}
          <button
            onClick={() => navigate(localizePath('/'))}
            className={cn(
              "relative flex flex-col items-center justify-center flex-1 h-full",
              "min-w-[48px] min-h-[48px] transition-all duration-200",
              isHomePage
                ? "text-amber-600 dark:text-amber-400"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            )}
            aria-label={t('navigation.home')}
          >
            {isHomePage && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-amber-500 to-amber-400 rounded-full" />
            )}
            <Home className={cn("w-5 h-5 transition-transform duration-200", isHomePage && "scale-110")} />
            <span className={cn("text-[10px] mt-1 font-medium tracking-wide", isHomePage && "font-semibold")}>
              {t('navigation.home')}
            </span>
          </button>

          {/* Blog */}
          <button
            onClick={() => navigate(localizePath('/blog'))}
            className={cn(
              "relative flex flex-col items-center justify-center flex-1 h-full",
              "min-w-[48px] min-h-[48px] transition-all duration-200",
              isBlogPage
                ? "text-amber-600 dark:text-amber-400"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            )}
            aria-label={t('navigation.blog')}
          >
            {isBlogPage && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-amber-500 to-amber-400 rounded-full" />
            )}
            <BookOpen className={cn("w-5 h-5 transition-transform duration-200", isBlogPage && "scale-110")} />
            <span className={cn("text-[10px] mt-1 font-medium tracking-wide", isBlogPage && "font-semibold")}>
              {t('navigation.blog')}
            </span>
          </button>

          {/* Pricing */}
          <button
            onClick={() => navigate(localizePath('/pricing'))}
            className={cn(
              "relative flex flex-col items-center justify-center flex-1 h-full",
              "min-w-[48px] min-h-[48px] transition-all duration-200",
              isPricingPage
                ? "text-amber-600 dark:text-amber-400"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            )}
            aria-label={t('navigation.pricing')}
          >
            {isPricingPage && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-amber-500 to-amber-400 rounded-full" />
            )}
            <Tag className={cn("w-5 h-5 transition-transform duration-200", isPricingPage && "scale-110")} />
            <span className={cn("text-[10px] mt-1 font-medium tracking-wide", isPricingPage && "font-semibold")}>
              {t('navigation.pricing')}
            </span>
          </button>

          {/* Account - Opens Sheet */}
          <button
            onClick={() => setAccountSheetOpen(true)}
            className={cn(
              "relative flex flex-col items-center justify-center flex-1 h-full",
              "min-w-[48px] min-h-[48px] transition-all duration-200",
              accountSheetOpen
                ? "text-amber-600 dark:text-amber-400"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300",
              "active:text-amber-600 dark:active:text-amber-400"
            )}
            aria-label={t('navigation.accountOptions')}
          >
            {accountSheetOpen && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-amber-500 to-amber-400 rounded-full" />
            )}
            <User className={cn("w-5 h-5", accountSheetOpen && "scale-110")} />
            <span className={cn("text-[10px] mt-1 font-medium tracking-wide", accountSheetOpen && "font-semibold")}>
              {t('navigation.account')}
            </span>
          </button>

          <LanguageSwitcher
            onLocaleChange={handleLocalizedRouteSwitch}
            size="md"
            className={cn(
              "relative flex h-full min-h-[48px] min-w-[48px] flex-1 flex-col items-center justify-center gap-0.5",
              "border-0 bg-transparent px-0 text-slate-500 dark:text-slate-400",
              "hover:bg-transparent hover:text-slate-700 dark:hover:bg-transparent dark:hover:text-slate-300",
              "[&_svg:last-child]:hidden"
            )}
          />

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={cn(
              "relative flex flex-col items-center justify-center flex-1 h-full",
              "min-w-[48px] min-h-[48px] transition-all duration-200",
              "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300",
              "active:text-amber-600 dark:active:text-amber-400"
            )}
            aria-label={isDark ? t('theme.switchToLight') : t('theme.switchToDark')}
          >
            {isDark ? (
              <>
                <Sun className="w-5 h-5" />
                <span className="text-[10px] mt-1 font-medium tracking-wide">{t('theme.light')}</span>
              </>
            ) : (
              <>
                <Moon className="w-5 h-5" />
                <span className="text-[10px] mt-1 font-medium tracking-wide">{t('theme.dark')}</span>
              </>
            )}
          </button>
        </div>
      </nav>
    </>
  )
}

export default PublicBottomNav
