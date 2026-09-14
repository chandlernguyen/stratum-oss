/**
 * Authenticated Dashboard Header - Desktop Navigation
 *
 * Premium, editorial-style navigation for authenticated users.
 * Follows STRAŦUM brand guidelines with luxury/refined aesthetics.
 *
 * Design principles:
 * - Clear visual hierarchy with intentional spacing
 * - Gold accent hover animations
 * - Grouped utilities with subtle dividers
 * - Context-aware navigation (SME vs Agency, client context)
 */

import { Link, NavLink, useLocation, useParams } from 'react-router-dom'
import { LogOut, ChevronDown, Sparkles, User, MessageSquare, Users, Lock, CreditCard } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/auth'
import { useState, useRef, useEffect } from 'react'
import { useOrganization } from '@/hooks/data/useOrganization'
import { useUserRoles } from '@/hooks/useUserRoles'
import { useCampaign } from '@/hooks/data/useCampaigns'
import { CommandPaletteTrigger } from '@/components/command/CommandPalette'
import { Badge } from '@/components/ui/badge'
import { useDashboardMetrics } from '@/hooks/data/useDashboardMetrics'
import { useFeatureVisibility } from '@/hooks/useFeatureVisibility'
import { ROUTES } from '@/config/routes'
import { MobileNav } from './MobileNav'
import { ClientContextBreadcrumb } from './ClientContextBreadcrumb'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useUserContextEnhanced } from '@/hooks/data/useUserContextEnhanced'
import { NotificationBell } from '@/components/collaboration/NotificationBell'
import { cn } from '@/lib/utils'
import { useLocalizedRouteSwitch } from '@/hooks/useLocalizedRouteSwitch'
import { useLocalizedPath } from '@/hooks/useLocalizedPath'
import { stripLocalePrefix } from '@/lib/localePath'

// Permission mapping for each agent
const AGENT_PERMISSIONS: Record<string, string> = {
  quickStart: 'agents.quickwins.access',
  strategy: 'agents.strategy.access',
  persona: 'agents.persona.access',
  marketingStrategy: 'agents.strategy.access',
  content: 'agents.content.access',
  campaignExecution: 'agents.execution.access',
  performanceIntelligence: 'agents.analytics.access',
  competitiveIntelligence: 'agents.intelligence.access',
  clientSuccess: 'agents.success.access'
}

// Premium Dropdown Component with refined styling
function Dropdown({
  trigger,
  children,
  align = 'left',
  width = 'w-64'
}: {
  trigger: React.ReactNode
  children: React.ReactNode
  align?: 'left' | 'right'
  width?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>
      {isOpen && (
        <div className={cn(
          "absolute top-full mt-2 py-2 z-50",
          width,
          "bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl",
          "border border-slate-200/80 dark:border-slate-700/80",
          "rounded-xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50",
          "animate-in fade-in-0 zoom-in-95 duration-150",
          align === 'right' ? 'right-0' : 'left-0'
        )}>
          <div onClick={() => setIsOpen(false)}>
            {children}
          </div>
        </div>
      )}
    </div>
  )
}

// Nav link with gold underline hover effect
function NavLinkStyled({
  to,
  children,
  className
}: {
  to: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "relative px-3 py-2 text-sm font-medium transition-colors duration-200 group",
          isActive
            ? "text-amber-600 dark:text-amber-400"
            : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white",
          className
        )
      }
    >
      {({ isActive }) => (
        <>
          <span className="relative z-10">{children}</span>
          {/* Gold underline - always visible when active, animated on hover */}
          <span
            className={cn(
              "absolute bottom-1 left-3 right-3 h-0.5 rounded-full",
              "bg-gradient-to-r from-amber-500 to-amber-400",
              "transition-transform duration-300 ease-out origin-left",
              isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
            )}
          />
        </>
      )}
    </NavLink>
  )
}

// Dropdown trigger button styling
function DropdownTrigger({
  children,
  isOpen
}: {
  children: React.ReactNode
  isOpen?: boolean
}) {
  return (
    <button
      className={cn(
        "flex items-center gap-1.5 px-3 py-2 text-sm font-medium",
        "text-slate-600 dark:text-slate-300",
        "hover:text-slate-900 dark:hover:text-white",
        "transition-colors duration-200",
        "group"
      )}
    >
      <span className="relative">
        {children}
        <span
          className={cn(
            "absolute -bottom-1 left-0 right-0 h-0.5 rounded-full",
            "bg-gradient-to-r from-amber-500 to-amber-400",
            "transition-transform duration-300 ease-out origin-left",
            "scale-x-0 group-hover:scale-x-100"
          )}
        />
      </span>
      <ChevronDown className={cn(
        "h-3.5 w-3.5 opacity-50 transition-transform duration-200",
        isOpen && "rotate-180"
      )} />
    </button>
  )
}

export function HeaderNew() {
  const { t } = useTranslation('common')
  const { t: tAgents } = useTranslation('agents')
  const { signOut, user } = useAuthStore()
  const handleLocalizedRouteSwitch = useLocalizedRouteSwitch()
  const { localizePath } = useLocalizedPath()
  const { isAgency, isLoading: orgLoading } = useOrganization()
  const { isLoading: rolesLoading } = useUserRoles()
  const { data: metrics } = useDashboardMetrics()
  const features = useFeatureVisibility(metrics)
  const location = useLocation()
  const { campaignId } = useParams<{ campaignId?: string }>()
  const { data: currentCampaign } = useCampaign(campaignId)
  const { data: userContext } = useUserContextEnhanced()

  // Permission checking
  const permissions = userContext?.permissions || []
  const hasPermission = (permission: string) => permissions.includes(permission)
  const hasAgentAccess = (agentKey: keyof typeof AGENT_PERMISSIONS) =>
    hasPermission(AGENT_PERMISSIONS[agentKey])

  const loading = orgLoading || rolesLoading

  // Extract clientSlug from URL if we're in a client context
  const normalizedPath = stripLocalePrefix(location.pathname)
  const pathParts = normalizedPath.split('/')
  const clientSlug = normalizedPath.startsWith('/clients/') && pathParts[2]
    ? !['new', 'list'].includes(pathParts[2])
      ? pathParts[2]
      : null
    : null

  // Helper function to make routes context-aware
  const contextRoute = (route: string) => {
    if (clientSlug) {
      if (route === '/dashboard' || route === ROUTES.dashboard.root) {
        return localizePath(`/clients/${clientSlug}`)
      }

      const agentRoutes = [
        '/strategy', '/persona', '/marketing-strategy', '/content',
        '/campaign-planning', '/performance-intelligence',
        '/competitive-intelligence', '/client-success', '/quick-start'
      ]

      if (agentRoutes.some(agentRoute => route.startsWith(agentRoute))) {
        return localizePath(`/clients/${clientSlug}/agents${route}`)
      }

      return localizePath(`/clients/${clientSlug}${route}`)
    }
    return localizePath(route)
  }

  // Determine if we're in a campaign context based on URL
  const isInCampaignContext = normalizedPath.includes('/campaigns/') && campaignId

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 w-full safe-top",
          "bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl",
          "border-b border-slate-200/60 dark:border-slate-800/60"
        )}
      >
        <div className="max-w-[1600px] mx-auto px-4 lg:px-6">
          <div className="flex h-16 items-center justify-between">
            {/* Left Section: Mobile Nav + Logo + Main Nav */}
            <div className="flex items-center">
              {/* Mobile Navigation */}
              <MobileNav />

              {/* Logo */}
              <Link
                to={user ? contextRoute(ROUTES.dashboard.root) : localizePath('/')}
                className="flex items-center gap-2.5 mr-8 group"
              >
                <img
                  src="/logo-icon.svg"
                  alt="STRAŦUM"
                  className="w-8 h-8 transition-transform duration-300 group-hover:scale-105"
                />
                <div className="hidden sm:flex flex-col">
                  <span className="text-lg font-bold tracking-tight">
                    <span className="text-slate-600 dark:text-slate-300">STRA</span>
                    <span className="text-amber-600 dark:text-amber-500">Ŧ</span>
                    <span className="text-slate-600 dark:text-slate-300">UM</span>
                  </span>
                  <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium tracking-[0.15em] uppercase -mt-0.5">
                    Intelligence
                  </span>
                </div>
              </Link>

              {/* Campaign Context Badge */}
              {!loading && isInCampaignContext && currentCampaign && (
                <div className="hidden lg:flex items-center mr-6 pl-6 border-l border-slate-200 dark:border-slate-700">
                  <Badge
                    variant="outline"
                    className="px-3 py-1 text-xs border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/20"
                  >
                    <span className="text-slate-500 dark:text-slate-400 mr-1.5">Campaign:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">{currentCampaign.name}</span>
                  </Badge>
                </div>
              )}

              {/* Main Navigation */}
              <nav className="hidden lg:flex items-center gap-1">
                {/* Agency-Level Navigation (when not in client context) */}
                {isAgency && !clientSlug ? (
                  <>
                    <NavLinkStyled to={contextRoute(ROUTES.dashboard.root)}>
                      {t('navigation.overview')}
                    </NavLinkStyled>
                    <NavLinkStyled to={contextRoute(ROUTES.clients.list)}>
                      {t('navigation.clients')}
                    </NavLinkStyled>
                    {/* Settings dropdown */}
                    {(hasPermission('users.invite') || hasPermission('users.manage')) && (
                      <Dropdown
                        trigger={<DropdownTrigger>{t('navigation.settings')}</DropdownTrigger>}
                      >
                        <NavLink to={contextRoute(ROUTES.settings.team)} className="dropdown-item">
                          <Users className="dropdown-item-icon" />
                          <span className="font-medium">{t('navigation.team')}</span>
                        </NavLink>
                        <NavLink to={contextRoute(ROUTES.settings.billing)} className="dropdown-item">
                          <CreditCard className="dropdown-item-icon" />
                          <span className="font-medium">{t('navigation.billing')}</span>
                        </NavLink>
                        {features.whiteLabel && (
                          <NavLink to={contextRoute(ROUTES.settings.whiteLabel)} className="dropdown-item">
                            <Sparkles className="dropdown-item-icon" />
                            <span className="font-medium">{t('navigation.whiteLabel')}</span>
                          </NavLink>
                        )}
                      </Dropdown>
                    )}
                  </>
                ) : (
                  <>
                    {/* Client-Level Navigation (when in client context) OR SME Navigation */}
                    <NavLinkStyled to={contextRoute(ROUTES.dashboard.root)}>
                      {t('navigation.dashboard')}
                    </NavLinkStyled>
                    <NavLinkStyled to={contextRoute(ROUTES.campaigns.list)}>
                      {t('navigation.campaigns')}
                    </NavLinkStyled>
                  </>
                )}

                {/* Agents Dropdown */}
                {(!isAgency || clientSlug) && (
                  <Dropdown
                    trigger={<DropdownTrigger>{t('navigation.agents')}</DropdownTrigger>}
                    width="w-72"
                  >
                    {/* Foundation Category */}
                    <div className="px-3 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {tAgents('categories.foundation.name')}
                    </div>
                    {hasAgentAccess('quickStart') ? (
                      <NavLink to={contextRoute(ROUTES.agents.quickStart.root)} className="dropdown-item-agent">
                        <span className="agent-icon">✨</span>
                        <span className="font-medium">{tAgents('navigation.quickStart')}</span>
                      </NavLink>
                    ) : (
                      <div className="dropdown-item-agent-locked">
                        <div className="flex items-center">
                          <span className="agent-icon">✨</span>
                          <span className="font-medium">{tAgents('navigation.quickStart')}</span>
                        </div>
                        <Lock className="h-4 w-4" />
                      </div>
                    )}
                    {hasAgentAccess('strategy') ? (
                      <NavLink to={contextRoute(ROUTES.agents.strategy.root)} className="dropdown-item-agent">
                        <span className="agent-icon">🎯</span>
                        <span className="font-medium">{tAgents('navigation.strategy')}</span>
                      </NavLink>
                    ) : (
                      <div className="dropdown-item-agent-locked">
                        <div className="flex items-center">
                          <span className="agent-icon">🎯</span>
                          <span className="font-medium">{tAgents('navigation.strategy')}</span>
                        </div>
                        <Lock className="h-4 w-4" />
                      </div>
                    )}
                    {hasAgentAccess('persona') ? (
                      <NavLink to={contextRoute(ROUTES.agents.persona.root)} className="dropdown-item-agent">
                        <span className="agent-icon">👥</span>
                        <span className="font-medium">{tAgents('navigation.persona')}</span>
                      </NavLink>
                    ) : (
                      <div className="dropdown-item-agent-locked">
                        <div className="flex items-center">
                          <span className="agent-icon">👥</span>
                          <span className="font-medium">{tAgents('navigation.persona')}</span>
                        </div>
                        <Lock className="h-4 w-4" />
                      </div>
                    )}
                    {hasAgentAccess('marketingStrategy') ? (
                      <NavLink to={contextRoute(ROUTES.agents.marketingStrategy.root)} className="dropdown-item-agent">
                        <span className="agent-icon">📢</span>
                        <span className="font-medium">{tAgents('navigation.marketingStrategy')}</span>
                      </NavLink>
                    ) : (
                      <div className="dropdown-item-agent-locked">
                        <div className="flex items-center">
                          <span className="agent-icon">📢</span>
                          <span className="font-medium">{tAgents('navigation.marketingStrategy')}</span>
                        </div>
                        <Lock className="h-4 w-4" />
                      </div>
                    )}

                    {/* Planning & Creation Category */}
                    <div className="my-2 mx-3 border-t border-slate-100 dark:border-slate-800" />
                    <div className="px-3 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {tAgents('navigation.planningCreation')}
                    </div>
                    {hasAgentAccess('content') ? (
                      <NavLink to={contextRoute(ROUTES.agents.content.root)} className="dropdown-item-agent">
                        <span className="agent-icon">📝</span>
                        <span className="font-medium">{tAgents('navigation.content')}</span>
                      </NavLink>
                    ) : (
                      <div className="dropdown-item-agent-locked">
                        <div className="flex items-center">
                          <span className="agent-icon">📝</span>
                          <span className="font-medium">{tAgents('navigation.content')}</span>
                        </div>
                        <Lock className="h-4 w-4" />
                      </div>
                    )}
                    {hasAgentAccess('campaignExecution') ? (
                      <NavLink to={contextRoute(ROUTES.agents.campaignExecution.root)} className="dropdown-item-agent">
                        <span className="agent-icon">🚀</span>
                        <span className="font-medium">{tAgents('navigation.campaignPlanning')}</span>
                      </NavLink>
                    ) : (
                      <div className="dropdown-item-agent-locked">
                        <div className="flex items-center">
                          <span className="agent-icon">🚀</span>
                          <span className="font-medium">{tAgents('navigation.campaignPlanning')}</span>
                        </div>
                        <Lock className="h-4 w-4" />
                      </div>
                    )}

                    {/* Intelligence Category */}
                    <div className="my-2 mx-3 border-t border-slate-100 dark:border-slate-800" />
                    <div className="px-3 py-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {tAgents('categories.intelligence.name')}
                    </div>
                    {hasAgentAccess('performanceIntelligence') ? (
                      <NavLink to={contextRoute(ROUTES.agents.performanceIntelligence.root)} className="dropdown-item-agent">
                        <span className="agent-icon">📈</span>
                        <span className="font-medium">{tAgents('navigation.performanceIntelligence')}</span>
                      </NavLink>
                    ) : (
                      <div className="dropdown-item-agent-locked">
                        <div className="flex items-center">
                          <span className="agent-icon">📈</span>
                          <span className="font-medium">{tAgents('navigation.performanceIntelligence')}</span>
                        </div>
                        <Lock className="h-4 w-4" />
                      </div>
                    )}
                    {hasAgentAccess('competitiveIntelligence') ? (
                      <NavLink to={contextRoute(ROUTES.agents.competitiveIntelligence.root)} className="dropdown-item-agent">
                        <span className="agent-icon">🔍</span>
                        <span className="font-medium">{tAgents('navigation.competitiveIntel')}</span>
                      </NavLink>
                    ) : (
                      <div className="dropdown-item-agent-locked">
                        <div className="flex items-center">
                          <span className="agent-icon">🔍</span>
                          <span className="font-medium">{tAgents('navigation.competitiveIntel')}</span>
                        </div>
                        <Lock className="h-4 w-4" />
                      </div>
                    )}
                    {/* Client Success - Agency Only */}
                    {isAgency && (
                      hasAgentAccess('clientSuccess') ? (
                        <NavLink to={contextRoute(ROUTES.agents.clientSuccess.root)} className="dropdown-item-agent">
                          <span className="agent-icon">🤝</span>
                          <span className="font-medium">{tAgents('navigation.clientSuccess')}</span>
                        </NavLink>
                      ) : (
                        <div className="dropdown-item-agent-locked">
                          <div className="flex items-center">
                            <span className="agent-icon">🤝</span>
                            <span className="font-medium">{tAgents('navigation.clientSuccess')}</span>
                          </div>
                          <Lock className="h-4 w-4" />
                        </div>
                      )
                    )}
                  </Dropdown>
                )}

                {/* Library */}
                {(!isAgency || clientSlug) && (
                  <NavLinkStyled to={contextRoute(ROUTES.outputs.root)}>
                    {t('navigation.library')}
                  </NavLinkStyled>
                )}

                {/* Approved */}
                {(!isAgency || clientSlug) && (
                  <NavLinkStyled to={contextRoute(ROUTES.collaboration.approvals)}>
                    {t('navigation.approved')}
                  </NavLinkStyled>
                )}

                {/* Business Intelligence - SME users (top-level, key USP) */}
                {!isAgency && !clientSlug && (
                  <NavLinkStyled to={contextRoute(ROUTES.intelligence.root)}>
                    {t('navigation.intelligence')}
                  </NavLinkStyled>
                )}

                {/* Team link for SME users */}
                {!isAgency && !clientSlug && (hasPermission('users.invite') || hasPermission('users.manage')) && (
                  <NavLinkStyled to={contextRoute(ROUTES.settings.team)}>
                    {t('navigation.team')}
                  </NavLinkStyled>
                )}

                {/* Client Intelligence link - Agency only when client is selected */}
                {isAgency && clientSlug && (
                  <NavLinkStyled to={contextRoute(ROUTES.intelligence.root)}>
                    {t('navigation.intelligence')}
                  </NavLinkStyled>
                )}
              </nav>
            </div>

            {/* Right Section: Utilities + User */}
            <div className="hidden lg:flex items-center">
              {/* Search */}
              <div className="mr-4">
                <CommandPaletteTrigger />
              </div>

              {/* Divider */}
              <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mr-4" />

              {/* Utility Group */}
              <div className="flex items-center gap-1 mr-4">
                <NotificationBell />
                <LanguageSwitcher onLocaleChange={handleLocalizedRouteSwitch} />
                <ThemeToggle />
              </div>

              {/* Divider */}
              <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mr-4" />

              {/* User Dropdown */}
              <Dropdown
                align="right"
                width="w-56"
                trigger={
                  <button
                    className={cn(
                      "flex items-center gap-3 px-2 py-1.5 rounded-full",
                      "hover:bg-slate-100/80 dark:hover:bg-slate-800/80",
                      "transition-all duration-200",
                      "group"
                    )}
                  >
                    {/* Avatar */}
                    <div
                      className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center",
                        "bg-gradient-to-br from-slate-600 to-amber-600",
                        "text-white font-semibold text-sm",
                        "ring-2 ring-white dark:ring-slate-900",
                        "shadow-md",
                        "transition-transform duration-200 group-hover:scale-105"
                      )}
                    >
                      {user?.email?.charAt(0).toUpperCase()}
                    </div>
                    {/* Email + Chevron */}
                    <div className="hidden xl:flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-300 max-w-[140px] truncate">
                        {user?.email}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 text-slate-400 transition-transform duration-200 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
                    </div>
                  </button>
                }
              >
                {/* User info header */}
                <div className="px-3 py-2 mb-1 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                    {user?.email}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {isAgency ? t('navigation.accountTypes.agency') : t('navigation.accountTypes.sme')}
                  </p>
                </div>

                <NavLink to={contextRoute(ROUTES.profile)} className="dropdown-item">
                  <User className="dropdown-item-icon" />
                  <span className="font-medium">{t('navigation.myProfile')}</span>
                </NavLink>
                <NavLink to={contextRoute(ROUTES.settings.billing)} className="dropdown-item">
                  <CreditCard className="dropdown-item-icon" />
                  <span className="font-medium">{t('navigation.billing')}</span>
                </NavLink>
                <NavLink to={contextRoute('/feedback')} className="dropdown-item">
                  <MessageSquare className="dropdown-item-icon" />
                  <span className="font-medium">{t('navigation.feedback')}</span>
                </NavLink>
                <div className="my-1 mx-3 border-t border-slate-100 dark:border-slate-800" />
                <button
                  onClick={signOut}
                  className={cn(
                    "flex items-center gap-3 w-full px-3 py-2 text-sm",
                    "text-red-600 dark:text-red-400",
                    "hover:bg-red-50 dark:hover:bg-red-900/20",
                    "rounded-lg mx-1 transition-colors duration-150"
                  )}
                >
                  <LogOut className="h-4 w-4" />
                  <span className="font-medium">{t('navigation.signOut')}</span>
                </button>
              </Dropdown>
            </div>
          </div>
        </div>
      </header>

      {/* Client Context Breadcrumb - Show when agency user is in client context */}
      {isAgency && clientSlug && <ClientContextBreadcrumb clientSlug={clientSlug} />}
    </>
  )
}
