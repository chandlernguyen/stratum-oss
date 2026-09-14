import { useState } from 'react'
import { Home, Sparkles, Target, FileText, Menu as MenuIcon } from 'lucide-react'
import { NavLink, useLocation, matchPath } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useClientContext } from '@/contexts/ClientContext'
import { useMobileMenu } from '@/contexts/MobileMenuContext'
import { ROUTES } from '@/config/routes'
import { AgentQuickSelector } from '@/components/agents/AgentQuickSelector'
import type { ClientSlug } from '@/types/clientContext'
import { useVirtualKeyboard } from '@/hooks/useVirtualKeyboard'
import { useLocale } from '@/hooks/useLocale'
import { useLocalizedPath } from '@/hooks/useLocalizedPath'
import { stripLocalePrefix } from '@/lib/localePath'

export function BottomNav() {
  const location = useLocation()
  const { clientSlug: contextSlug } = useClientContext()
  const { setIsOpen } = useMobileMenu()
  const [agentSelectorOpen, setAgentSelectorOpen] = useState(false)
  const { isKeyboardOpen } = useVirtualKeyboard()
  const { t } = useLocale('common')
  const { localizePath } = useLocalizedPath()
  const normalizedPath = stripLocalePrefix(location.pathname)

  // ✅ FIX (Bug #3): Fallback to URL parsing if not in ClientContext
  // BottomNav is rendered at app level, OUTSIDE ClientContextProvider
  // So we need to extract clientSlug from URL when on /clients/:slug/* routes
  const urlMatch = matchPath('/clients/:clientSlug/*', normalizedPath)
  const clientSlug = contextSlug || (urlMatch?.params.clientSlug as ClientSlug | undefined) || null

  // Context-aware route builder
  const contextRoute = (route: string) => {
    if (clientSlug) {
      if (route === '/dashboard' || route === ROUTES.dashboard.root) {
        return localizePath(`/clients/${clientSlug}`)
      }
      return localizePath(`/clients/${clientSlug}${route}`)
    }
    return localizePath(route)
  }

  // ✅ FIX: Compute navItems inside render cycle so hrefs update when clientSlug changes
  // Previously this was a constant array, so contextRoute() was called once and never updated
  const navItems = [
    {
      icon: Home,
      label: t('navigation.home'),
      href: contextRoute(ROUTES.dashboard.root),
      match: (path: string) =>
        path === '/dashboard' ||
        path === '/' ||
        (path.startsWith('/clients/') && path.split('/').length === 3)
    },
    {
      icon: Sparkles,
      label: t('navigation.agents'),
      action: 'agents' as const
    },
    {
      icon: Target,
      label: t('navigation.campaigns'),
      href: contextRoute(ROUTES.campaigns.list),
      match: (path: string) => path.includes('/campaigns')
    },
    {
      icon: FileText,
      label: t('navigation.library'),
      href: contextRoute(ROUTES.outputs.root),
      match: (path: string) => path.includes('/outputs')
    },
    {
      icon: MenuIcon,
      label: t('navigation.more'),
      action: 'menu' as const
    },
  ]

  const handleItemClick = (item: typeof navItems[0]) => {
    if (item.action === 'agents') {
      // Open Agent Quick Selector bottom sheet
      setAgentSelectorOpen(true)
    } else if (item.action === 'menu') {
      // Open full mobile menu
      setIsOpen(true)
    }
  }

  // Hide bottom nav when keyboard is open (mobile)
  if (isKeyboardOpen) {
    return null
  }

  return (
    <>
      <nav
        className={cn(
          "lg:hidden fixed bottom-0 left-0 right-0 z-50",
          // Glass effect background
          "bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl",
          // Refined border with subtle shadow
          "border-t border-slate-200/80 dark:border-slate-700/80",
          "shadow-[0_-4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)]",
          // Safe area for iOS
          "safe-bottom"
        )}
        role="navigation"
        aria-label={t('aria.bottomNavigation')}
      >
        <div className="flex justify-around items-center h-16">
          {navItems.map(item => {
            const isActive = item.match ? item.match(normalizedPath) : false

            if (item.action) {
              return (
                <button
                  key={item.label}
                  onClick={() => handleItemClick(item)}
                  className={cn(
                    "relative flex flex-col items-center justify-center flex-1 h-full",
                    "min-w-[48px] min-h-[48px] transition-all duration-200",
                    isActive
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 active:text-amber-600 dark:active:text-amber-400"
                  )}
                  aria-label={item.label}
                >
                  {/* Active indicator - gold bar at top */}
                  {isActive && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-amber-500 to-amber-400 rounded-full" />
                  )}
                  <item.icon className={cn(
                    "w-5 h-5 transition-transform duration-200",
                    isActive && "scale-110"
                  )} />
                  <span className={cn(
                    "text-[10px] mt-1 font-medium tracking-wide",
                    isActive && "font-semibold"
                  )}>
                    {item.label}
                  </span>
                </button>
              )
            }

            return (
              <NavLink
                key={item.label}
                to={item.href!}
                className={({ isActive: routeActive }) => {
                  const active = routeActive || isActive
                  return cn(
                    "relative flex flex-col items-center justify-center flex-1 h-full",
                    "min-w-[48px] min-h-[48px] transition-all duration-200",
                    active
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 active:text-amber-600 dark:active:text-amber-400"
                  )
                }}
                aria-label={item.label}
              >
                {({ isActive: routeActive }) => {
                  const active = routeActive || isActive
                  return (
                    <>
                      {/* Active indicator - gold bar at top */}
                      {active && (
                        <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-amber-500 to-amber-400 rounded-full" />
                      )}
                      <item.icon className={cn(
                        "w-5 h-5 transition-transform duration-200",
                        active && "scale-110"
                      )} />
                      <span className={cn(
                        "text-[10px] mt-1 font-medium tracking-wide",
                        active && "font-semibold"
                      )}>
                        {item.label}
                      </span>
                    </>
                  )
                }}
              </NavLink>
            )
          })}
        </div>
      </nav>

      {/* Agent Quick Selector Bottom Sheet */}
      <AgentQuickSelector
        open={agentSelectorOpen}
        onOpenChange={setAgentSelectorOpen}
      />
    </>
  )
}
