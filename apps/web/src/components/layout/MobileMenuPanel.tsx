import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import {
  X,
  ChevronDown,
  ChevronRight,
  LogOut,
  User,
  MessageSquare,
  Sparkles,
  Users,
  Search,
  Mail,
  FileText,
  Shield,
  Moon,
  Sun,
  Lock,
  CreditCard,
  ListTodo,
  CheckCircle,
  Home,
  Target,
  Library,
  Brain,
  Building2
} from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import { useOrganization } from '@/hooks/data/useOrganization'
import { useFeatureVisibility } from '@/hooks/useFeatureVisibility'
import { useDashboardMetrics } from '@/hooks/data/useDashboardMetrics'
import { useUserContextEnhanced } from '@/hooks/data/useUserContextEnhanced'
import { ROUTES } from '@/config/routes'
import { cn } from '@/lib/utils'
import { useMobileMenu } from '@/contexts/MobileMenuContext'
import { useTheme } from '@/hooks/useTheme'
import { useLocale } from '@/hooks/useLocale'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useTranslation } from 'react-i18next'
import { useLocalizedRouteSwitch } from '@/hooks/useLocalizedRouteSwitch'
import { useLocalizedPath } from '@/hooks/useLocalizedPath'
import { stripLocalePrefix } from '@/lib/localePath'

// Permission to agent route mapping
const AGENT_PERMISSIONS: Record<string, string> = {
  quickStart: 'agents.quickwins.access',
  strategy: 'agents.strategy.access',
  persona: 'agents.persona.access',
  marketingStrategy: 'agents.strategy.access', // Uses same as strategy
  content: 'agents.content.access',
  campaignExecution: 'agents.execution.access',
  performanceIntelligence: 'agents.analytics.access',
  competitiveIntelligence: 'agents.intelligence.access',
  clientSuccess: 'agents.success.access'
}

export function MobileMenuPanel() {
  const { isOpen, setIsOpen } = useMobileMenu()
  const [agentsExpanded, setAgentsExpanded] = useState(false)
  const [settingsExpanded, setSettingsExpanded] = useState(false)
  const { signOut, user } = useAuthStore()
  const { isAgency } = useOrganization()
  const { data: metrics } = useDashboardMetrics()
  const { data: userContext } = useUserContextEnhanced()
  const features = useFeatureVisibility(metrics)
  const location = useLocation()
  const { isDark, toggleTheme } = useTheme()
  const { t } = useLocale('common')
  const { t: tAgents } = useTranslation('agents')
  const handleLocalizedRouteSwitch = useLocalizedRouteSwitch()
  const { localizePath } = useLocalizedPath()
  const normalizedPath = stripLocalePrefix(location.pathname)

  // Permission checking
  const permissions = userContext?.permissions || []
  const hasPermission = (permission: string) => permissions.includes(permission)
  const hasAgentAccess = (agentKey: keyof typeof AGENT_PERMISSIONS) =>
    hasPermission(AGENT_PERMISSIONS[agentKey])

  // Extract clientSlug from URL if we're in a client context
  // MobileNav needs to be context-aware for agency users
  const clientSlug = normalizedPath.startsWith('/clients/')
    ? normalizedPath.split('/')[2]
    : null

  // Helper function to make routes context-aware
  // If in client context, prefix with /clients/:clientSlug
  const contextRoute = (route: string) => {
    if (clientSlug) {
      // Dashboard maps to client index route (no /dashboard suffix)
      if (route === '/dashboard' || route === ROUTES.dashboard.root) {
        return localizePath(`/clients/${clientSlug}`)
      }

      // Agent routes need /agents/ prefix in client context
      // Routes like /strategy, /persona, /content, etc. become /agents/strategy
      const agentRoutes = [
        '/strategy', '/persona', '/marketing-strategy', '/content',
        '/campaign-planning', '/performance-intelligence',
        '/competitive-intelligence', '/client-success', '/quick-start'
      ]

      if (agentRoutes.some(agentRoute => route.startsWith(agentRoute))) {
        return localizePath(`/clients/${clientSlug}/agents${route}`)
      }

      // All other routes get prepended with client context
      return localizePath(`/clients/${clientSlug}${route}`)
    }
    return localizePath(route)
  }

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false)
    setAgentsExpanded(false)
    setSettingsExpanded(false)
  }, [location.pathname, setIsOpen])

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center justify-start px-4 py-3 text-base font-medium transition-colors rounded-lg text-left w-full",
      isActive
        ? "text-brand-gold dark:text-amber-400 font-semibold"
        : "text-slate-800 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
    )

  // Don't render anything if menu is not open
  if (!isOpen) return null

  return (
    <>
      {/* Overlay - z-[100] to ensure it's above everything */}
      <div
        className="fixed inset-0 bg-black/50 z-[100] md:hidden"
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* Slide-out Menu - z-[101] to be above overlay */}
      <div
        className={cn(
          "fixed top-0 left-0 bottom-0 w-80 bg-white dark:bg-gray-900 z-[101] transform transition-transform duration-300 ease-in-out md:hidden overflow-y-auto safe-top safe-bottom shadow-2xl",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 safe-top-min">
          <Link to={contextRoute(ROUTES.dashboard.root)} className="flex flex-col">
            <div className="flex items-center space-x-2">
              <img
                src="/logo-icon.svg"
                alt="STRAŦUM"
                className="w-8 h-8 drop-shadow-lg"
              />
              <span className="text-lg font-bold bg-gradient-to-r from-slate-600 to-amber-600 bg-clip-text text-transparent">
                STRAŦUM
              </span>
            </div>
            <div className="text-xs text-brand-slate font-medium tracking-wide ml-0.5 mt-0.5">
              Intelligence Over Execution
            </div>
          </Link>
          <button
            onClick={() => setIsOpen(false)}
            className="p-3 min-w-[48px] min-h-[48px] flex items-center justify-center text-brand-slate hover:bg-gray-100 rounded-lg transition-colors active:bg-gray-200 dark:hover:bg-gray-800 dark:active:bg-gray-700"
            aria-label="Close menu"
          >
            <X className="h-7 w-7" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {/* Agency-Level Navigation (when not in client context) */}
          {isAgency && !clientSlug ? (
            <>
              <NavLink to={contextRoute(ROUTES.dashboard.root)} className={navLinkClasses}>
                <Building2 className="h-5 w-5 mr-3" />
                {t('navigation.agencyOverview')}
              </NavLink>
              <NavLink to={contextRoute(ROUTES.clients.list)} className={navLinkClasses}>
                <Users className="h-5 w-5 mr-3" />
                {t('navigation.clients')}
              </NavLink>

              {/* Settings (Expandable) - Agency only, requires team management permissions */}
              {(hasPermission('users.invite') || hasPermission('users.manage')) && (
                <div>
                  <button
                    onClick={() => setSettingsExpanded(!settingsExpanded)}
                    className="flex items-center justify-between w-full px-4 py-3 text-base font-medium text-slate-800 hover:bg-gray-50 rounded-lg transition-colors dark:text-gray-300 dark:hover:bg-gray-800 text-left"
                  >
                    <span className="text-left">{t('navigation.settings')}</span>
                    {settingsExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>

                  {settingsExpanded && (
                    <div className="ml-2 mt-2 space-y-1 border-l-2 border-gray-200 dark:border-gray-700">
                      <NavLink
                        to={contextRoute(ROUTES.settings.team)}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center justify-start gap-2 px-4 py-2 text-sm text-left w-full",
                            isActive
                              ? "text-brand-gold dark:text-amber-400"
                              : "text-slate-800 hover:text-brand-gold dark:text-gray-300 dark:hover:text-amber-400"
                          )
                        }
                      >
                        <Users className="h-4 w-4" />
                        {t('navigation.team')}
                      </NavLink>
                      <NavLink
                        to={contextRoute(ROUTES.settings.billing)}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center justify-start gap-2 px-4 py-2 text-sm text-left w-full",
                            isActive
                              ? "text-brand-gold dark:text-amber-400"
                              : "text-slate-800 hover:text-brand-gold dark:text-gray-300 dark:hover:text-amber-400"
                          )
                        }
                      >
                        <CreditCard className="h-4 w-4" />
                        {t('navigation.billing')}
                      </NavLink>
                      {features.whiteLabel && (
                        <NavLink
                          to={contextRoute(ROUTES.settings.whiteLabel)}
                          className={({ isActive }) =>
                            cn(
                              "flex items-center justify-start gap-2 px-4 py-2 text-sm text-left w-full",
                              isActive
                                ? "text-brand-gold dark:text-amber-400"
                                : "text-brand-charcoal hover:text-brand-gold dark:text-gray-300"
                            )
                          }
                        >
                          <Sparkles className="h-4 w-4" />
                          {tAgents('navigation.whiteLabel')}
                        </NavLink>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Client-Level Navigation (when in client context) OR SME Navigation */}
              <NavLink to={contextRoute(ROUTES.dashboard.root)} className={navLinkClasses}>
                <Home className="h-5 w-5 mr-3" />
                {t('navigation.dashboard')}
              </NavLink>

              <NavLink to={contextRoute(ROUTES.campaigns.list)} className={navLinkClasses}>
                <Target className="h-5 w-5 mr-3" />
                {t('navigation.campaigns')}
              </NavLink>
            </>
          )}

          {/* Agents (Expandable) - only show for SME or when agency has client selected */}
          {(!isAgency || clientSlug) && (
          <div>
            <button
              onClick={() => setAgentsExpanded(!agentsExpanded)}
              className="flex items-center justify-between w-full px-4 py-3 text-base font-medium text-foreground hover:bg-gray-50 rounded-lg transition-colors dark:hover:bg-gray-800 text-left"
            >
              <span className="flex items-center gap-3"><Sparkles className="h-5 w-5" />{t('navigation.agents')}</span>
              {agentsExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>

            {agentsExpanded && (
              <div className="ml-2 mt-2 space-y-1 border-l-2 border-gray-200 dark:border-gray-700">
                {/* Foundation Category */}
                <div className="px-4 py-2 text-xs font-semibold text-brand-slate uppercase tracking-wider text-left">
                  🏗️ {tAgents('categories.foundation.name')}
                </div>
                {hasAgentAccess('quickStart') ? (
                  <NavLink
                    to={contextRoute(ROUTES.agents.quickStart.root)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center justify-start px-4 py-2 text-sm text-left w-full",
                        isActive
                          ? "text-brand-gold dark:text-amber-400"
                          : "text-slate-800 hover:text-brand-gold dark:text-gray-300 dark:hover:text-amber-400"
                      )
                    }
                  >
                    <span className="mr-2">✨</span>
                    {tAgents('navigation.quickStart')}
                  </NavLink>
                ) : (
                  <div className="flex items-center justify-between px-4 py-2 text-sm text-gray-400 dark:text-gray-600 cursor-not-allowed">
                    <div className="flex items-center">
                      <span className="mr-2 opacity-50">✨</span>
                      {tAgents('navigation.quickStart')}
                    </div>
                    <Lock className="h-3 w-3" />
                  </div>
                )}
                {hasAgentAccess('strategy') ? (
                  <NavLink
                    to={contextRoute(ROUTES.agents.strategy.root)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center justify-start px-4 py-2 text-sm text-left w-full",
                        isActive
                          ? "text-brand-gold dark:text-amber-400"
                          : "text-slate-800 hover:text-brand-gold dark:text-gray-300 dark:hover:text-amber-400"
                      )
                    }
                  >
                    <span className="mr-2">🎯</span>
                    {tAgents('navigation.strategy')}
                  </NavLink>
                ) : (
                  <div className="flex items-center justify-between px-4 py-2 text-sm text-gray-400 dark:text-gray-600 cursor-not-allowed">
                    <div className="flex items-center">
                      <span className="mr-2 opacity-50">🎯</span>
                      {tAgents('navigation.strategy')}
                    </div>
                    <Lock className="h-3 w-3" />
                  </div>
                )}
                {hasAgentAccess('persona') ? (
                  <NavLink
                    to={contextRoute(ROUTES.agents.persona.root)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center justify-start px-4 py-2 text-sm text-left w-full",
                        isActive
                          ? "text-brand-gold dark:text-amber-400"
                          : "text-slate-800 hover:text-brand-gold dark:text-gray-300 dark:hover:text-amber-400"
                      )
                    }
                  >
                    <span className="mr-2">👥</span>
                    {tAgents('navigation.persona')}
                  </NavLink>
                ) : (
                  <div className="flex items-center justify-between px-4 py-2 text-sm text-gray-400 dark:text-gray-600 cursor-not-allowed">
                    <div className="flex items-center">
                      <span className="mr-2 opacity-50">👥</span>
                      {tAgents('navigation.persona')}
                    </div>
                    <Lock className="h-3 w-3" />
                  </div>
                )}
                {hasAgentAccess('marketingStrategy') ? (
                  <NavLink
                    to={contextRoute(ROUTES.agents.marketingStrategy.root)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center justify-start px-4 py-2 text-sm text-left w-full",
                        isActive
                          ? "text-brand-gold dark:text-amber-400"
                          : "text-slate-800 hover:text-brand-gold dark:text-gray-300 dark:hover:text-amber-400"
                      )
                    }
                  >
                    <span className="mr-2">📢</span>
                    {tAgents('navigation.marketingStrategy')}
                  </NavLink>
                ) : (
                  <div className="flex items-center justify-between px-4 py-2 text-sm text-gray-400 dark:text-gray-600 cursor-not-allowed">
                    <div className="flex items-center">
                      <span className="mr-2 opacity-50">📢</span>
                      {tAgents('navigation.marketingStrategy')}
                    </div>
                    <Lock className="h-3 w-3" />
                  </div>
                )}

                {/* Planning & Creation Category */}
                <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
                <div className="px-4 py-2 text-xs font-semibold text-brand-slate uppercase tracking-wider text-left">
                  🎨 {tAgents('navigation.planningCreation')}
                </div>
                {hasAgentAccess('content') ? (
                  <NavLink
                    to={contextRoute(ROUTES.agents.content.root)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center justify-start px-4 py-2 text-sm text-left w-full",
                        isActive
                          ? "text-green-600 dark:text-green-400"
                          : "text-slate-800 hover:text-green-600 dark:text-gray-300 dark:hover:text-green-400"
                      )
                    }
                  >
                    <span className="mr-2">📝</span>
                    {tAgents('navigation.content')}
                  </NavLink>
                ) : (
                  <div className="flex items-center justify-between px-4 py-2 text-sm text-gray-400 dark:text-gray-600 cursor-not-allowed">
                    <div className="flex items-center">
                      <span className="mr-2 opacity-50">📝</span>
                      {tAgents('navigation.content')}
                    </div>
                    <Lock className="h-3 w-3" />
                  </div>
                )}
                {hasAgentAccess('campaignExecution') ? (
                  <NavLink
                    to={contextRoute(ROUTES.agents.campaignExecution.root)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center justify-start px-4 py-2 text-sm text-left w-full",
                        isActive
                          ? "text-green-600 dark:text-green-400"
                          : "text-slate-800 hover:text-green-600 dark:text-gray-300 dark:hover:text-green-400"
                      )
                    }
                  >
                    <span className="mr-2">🚀</span>
                    {tAgents('navigation.campaignPlanning')}
                  </NavLink>
                ) : (
                  <div className="flex items-center justify-between px-4 py-2 text-sm text-gray-400 dark:text-gray-600 cursor-not-allowed">
                    <div className="flex items-center">
                      <span className="mr-2 opacity-50">🚀</span>
                      {tAgents('navigation.campaignPlanning')}
                    </div>
                    <Lock className="h-3 w-3" />
                  </div>
                )}

                {/* Intelligence Category */}
                <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
                <div className="px-4 py-2 text-xs font-semibold text-brand-slate uppercase tracking-wider text-left">
                  🧠 {tAgents('categories.intelligence.name')}
                </div>
                {hasAgentAccess('performanceIntelligence') ? (
                  <NavLink
                    to={contextRoute(ROUTES.agents.performanceIntelligence.root)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center justify-start px-4 py-2 text-sm text-left w-full",
                        isActive
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-slate-800 hover:text-amber-600 dark:text-gray-300 dark:hover:text-amber-400"
                      )
                    }
                  >
                    <span className="mr-2">📈</span>
                    {tAgents('navigation.performanceIntelligence')}
                  </NavLink>
                ) : (
                  <div className="flex items-center justify-between px-4 py-2 text-sm text-gray-400 dark:text-gray-600 cursor-not-allowed">
                    <div className="flex items-center">
                      <span className="mr-2 opacity-50">📈</span>
                      {tAgents('navigation.performanceIntelligence')}
                    </div>
                    <Lock className="h-3 w-3" />
                  </div>
                )}
                {hasAgentAccess('competitiveIntelligence') ? (
                  <NavLink
                    to={contextRoute(ROUTES.agents.competitiveIntelligence.root)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center justify-start px-4 py-2 text-sm text-left w-full",
                        isActive
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-slate-800 hover:text-amber-600 dark:text-gray-300 dark:hover:text-amber-400"
                      )
                    }
                  >
                    <span className="mr-2">🔍</span>
                    {tAgents('navigation.competitiveIntel')}
                  </NavLink>
                ) : (
                  <div className="flex items-center justify-between px-4 py-2 text-sm text-gray-400 dark:text-gray-600 cursor-not-allowed">
                    <div className="flex items-center">
                      <span className="mr-2 opacity-50">🔍</span>
                      {tAgents('navigation.competitiveIntel')}
                    </div>
                    <Lock className="h-3 w-3" />
                  </div>
                )}
                {/* Client Success - Agency only AND requires permission */}
                {isAgency && (
                  hasAgentAccess('clientSuccess') ? (
                    <NavLink
                      to={contextRoute(ROUTES.agents.clientSuccess.root)}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center justify-start px-4 py-2 text-sm text-left w-full",
                          isActive
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-brand-charcoal hover:text-amber-600 dark:text-gray-300"
                        )
                      }
                    >
                      <span className="mr-2">🤝</span>
                      {tAgents('navigation.clientSuccess')}
                    </NavLink>
                  ) : (
                    <div className="flex items-center justify-between px-4 py-2 text-sm text-gray-400 dark:text-gray-600 cursor-not-allowed">
                      <div className="flex items-center">
                        <span className="mr-2 opacity-50">🤝</span>
                        {tAgents('navigation.clientSuccess')}
                      </div>
                      <Lock className="h-3 w-3" />
                    </div>
                  )
                )}
              </div>
            )}
          </div>
          )}

          {/* Library (formerly Outputs) - only show for SME or when agency has client selected */}
          {(!isAgency || clientSlug) && (
            <NavLink to={contextRoute(ROUTES.outputs.root)} className={navLinkClasses}>
              <Library className="h-5 w-5 mr-3" />
              {t('navigation.library')}
            </NavLink>
          )}

          {/* Approved - source of truth for approved content/strategies */}
          {(!isAgency || clientSlug) && (
            <NavLink to={contextRoute(ROUTES.collaboration.approvals)} className={navLinkClasses}>
              <CheckCircle className="h-5 w-5 mr-3" />
              {t('navigation.approved')}
            </NavLink>
          )}

          {/* Business Intelligence - SME users (top-level, key USP) */}
          {!isAgency && !clientSlug && (
            <NavLink to={contextRoute(ROUTES.intelligence.root)} className={navLinkClasses}>
              <Brain className="h-5 w-5 mr-3" />
              {t('navigation.intelligence')}
            </NavLink>
          )}

          {/* Team link for SME users with team management permissions - placed after Outputs */}
          {!isAgency && !clientSlug && (hasPermission('users.invite') || hasPermission('users.manage')) && (
            <NavLink to={contextRoute(ROUTES.settings.team)} className={navLinkClasses}>
              <Users className="h-5 w-5 mr-3" />
              {t('navigation.team')}
            </NavLink>
          )}

          {/* Tasks - Team collaboration tasks */}
          <NavLink to={contextRoute(ROUTES.collaboration.tasks)} className={navLinkClasses}>
            <ListTodo className="h-5 w-5 mr-3" />
            {t('navigation.tasks')}
          </NavLink>

          {/* Client Intelligence link - Agency only when client is selected */}
          {isAgency && clientSlug && (
            <NavLink to={contextRoute(ROUTES.intelligence.root)} className={navLinkClasses}>
              <Brain className="h-5 w-5 mr-3" />
              {t('navigation.intelligence')}
            </NavLink>
          )}

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>

          {/* Search (triggers Command Palette) */}
          <button
            onClick={() => {
              window.dispatchEvent(new Event('openCommandPalette'))
              setIsOpen(false)
            }}
            className="flex items-center justify-start gap-3 w-full px-4 py-3 text-base font-medium text-slate-800 hover:bg-gray-50 rounded-lg transition-colors dark:text-gray-300 dark:hover:bg-gray-800 text-left"
          >
            <Search className="h-5 w-5" />
            {t('navigation.search')}
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center justify-start gap-3 w-full px-4 py-3 text-base font-medium text-slate-800 hover:bg-gray-50 rounded-lg transition-colors dark:text-gray-300 dark:hover:bg-gray-800 text-left"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? (
              <>
                <Sun className="h-5 w-5" />
                {t('navigation.lightMode')}
              </>
            ) : (
              <>
                <Moon className="h-5 w-5" />
                {t('navigation.darkMode')}
              </>
            )}
          </button>

          {/* Language Switcher */}
          <LanguageSwitcher
            onLocaleChange={handleLocalizedRouteSwitch}
            showLabel
            size="md"
            className="flex h-auto w-full items-center justify-start gap-3 rounded-lg border-0 bg-transparent px-4 py-3 text-left text-base font-medium text-slate-800 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800 [&_svg:last-child]:ml-auto"
          />

          {/* User Actions */}
          <NavLink
            to={contextRoute(ROUTES.profile)}
            className={({ isActive }) =>
              cn(
                "flex items-center justify-start gap-3 px-4 py-3 text-base font-medium rounded-lg transition-colors text-left w-full",
                isActive
                  ? "text-brand-gold dark:text-amber-400 font-semibold"
                  : "text-slate-800 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
              )
            }
          >
            <User className="h-5 w-5" />
            {t('navigation.myProfile')}
          </NavLink>

          <NavLink
            to={contextRoute(ROUTES.settings.billing)}
            className={({ isActive }) =>
              cn(
                "flex items-center justify-start gap-3 px-4 py-3 text-base font-medium rounded-lg transition-colors text-left w-full",
                isActive
                  ? "text-brand-gold dark:text-amber-400 font-semibold"
                  : "text-slate-800 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
              )
            }
          >
            <CreditCard className="h-5 w-5" />
            {t('navigation.billing')}
          </NavLink>

          <NavLink
            to={contextRoute('/feedback')}
            className={({ isActive }) =>
              cn(
                "flex items-center justify-start gap-3 px-4 py-3 text-base font-medium rounded-lg transition-colors text-left w-full",
                isActive
                  ? "text-brand-gold dark:text-amber-400 font-semibold"
                  : "text-slate-800 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
              )
            }
          >
            <MessageSquare className="h-5 w-5" />
            {t('navigation.feedback')}
          </NavLink>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>

          {/* Legal & Support */}
          <NavLink
            to={contextRoute('/contact')}
            className={({ isActive }) =>
              cn(
                "flex items-center justify-start gap-3 px-4 py-3 text-base font-medium rounded-lg transition-colors text-left w-full",
                isActive
                  ? "text-brand-gold dark:text-amber-400 font-semibold"
                  : "text-slate-800 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
              )
            }
          >
            <Mail className="h-5 w-5" />
            {t('navigation.contactUs')}
          </NavLink>

          <NavLink
            to={contextRoute('/privacy')}
            className={({ isActive }) =>
              cn(
                "flex items-center justify-start gap-3 px-4 py-3 text-base font-medium rounded-lg transition-colors text-left w-full",
                isActive
                  ? "text-brand-gold dark:text-amber-400 font-semibold"
                  : "text-slate-800 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
              )
            }
          >
            <FileText className="h-5 w-5" />
            {t('navigation.privacyPolicy')}
          </NavLink>

          <NavLink
            to={contextRoute('/terms')}
            className={({ isActive }) =>
              cn(
                "flex items-center justify-start gap-3 px-4 py-3 text-base font-medium rounded-lg transition-colors text-left w-full",
                isActive
                  ? "text-brand-gold dark:text-amber-400 font-semibold"
                  : "text-slate-800 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
              )
            }
          >
            <Shield className="h-5 w-5" />
            {t('navigation.termsConditions')}
          </NavLink>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>

          {/* Sign Out */}
          <button
            onClick={signOut}
            className="flex items-center justify-start gap-3 w-full px-4 py-3 text-base font-medium text-slate-800 hover:bg-gray-50 rounded-lg transition-colors dark:text-gray-300 dark:hover:bg-gray-800 text-left"
          >
            <LogOut className="h-5 w-5" />
            {t('navigation.signOut')}
          </button>

          {/* User Info */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 px-4 py-2">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-amber-600 flex items-center justify-center text-white font-semibold text-sm shadow-lg">
                {user?.email?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-gray-100 truncate">
                  {user?.email}
                </p>
              </div>
            </div>
          </div>
        </nav>
      </div>
    </>
  )
}
