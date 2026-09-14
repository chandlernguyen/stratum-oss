import { useNavigate, useLocation, matchPath } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useClientContext } from '@/contexts/ClientContext'
import { useOrganization } from '@/hooks/data/useOrganization'
import { useUserContextEnhanced } from '@/hooks/data/useUserContextEnhanced'
import { ROUTES } from '@/config/routes'
import { cn } from '@/lib/utils'
import type { ClientSlug } from '@/types/clientContext'
import { Lock } from 'lucide-react'
import { useLocalizedPath } from '@/hooks/useLocalizedPath'
import { stripLocalePrefix } from '@/lib/localePath'

interface AgentQuickSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AgentQuickSelector({ open, onOpenChange }: AgentQuickSelectorProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation('agents')
  const { clientSlug: contextSlug } = useClientContext()
  const { isAgency } = useOrganization()
  const { data: userContext } = useUserContextEnhanced()
  const { localizePath } = useLocalizedPath()
  const normalizedPath = stripLocalePrefix(location.pathname)

  // Get user permissions for agent access filtering
  const permissions = userContext?.permissions || []

  // Permission checker helper
  const hasPermission = (permission: string) => permissions.includes(permission)

  // ✅ FIX (Bug #3): Fallback to URL parsing if not in ClientContext
  // AgentQuickSelector is rendered in BottomNav at app level, OUTSIDE ClientContextProvider
  // So we need to extract clientSlug from URL when on /clients/:slug/* routes
  const urlMatch = matchPath('/clients/:clientSlug/*', normalizedPath)
  const clientSlug = contextSlug || (urlMatch?.params.clientSlug as ClientSlug | undefined) || null

  // Context-aware route builder
  const contextRoute = (route: string) => {
    if (clientSlug) {
      if (route === '/dashboard' || route === ROUTES.dashboard.root) {
        return localizePath(`/clients/${clientSlug}`)
      }
      return localizePath(`/clients/${clientSlug}/agents${route}`)
    }
    return localizePath(route)
  }

  const handleAgentSelect = (route: string) => {
    const targetRoute = contextRoute(route)
    console.log('[AgentQuickSelector] Navigation Debug:', {
      inputRoute: route,
      clientSlug,
      isAgency,
      targetRoute,
      timestamp: new Date().toISOString()
    })
    navigate(targetRoute)
    onOpenChange(false)
  }

  // Define agents with permission requirements
  const allAgents = [
    // Foundation
    {
      categoryKey: 'foundation',
      icon: '🏗️',
      items: [
        {
          icon: '✨',
          nameKey: 'quickStart',
          descKey: 'quickStart',
          route: ROUTES.agents.quickStart.root,
          permission: 'agents.quickwins.access'
        },
        {
          icon: '🎯',
          nameKey: 'strategy',
          descKey: 'strategy',
          route: ROUTES.agents.strategy.root,
          permission: 'agents.strategy.access'
        },
        {
          icon: '👥',
          nameKey: 'persona',
          descKey: 'persona',
          route: ROUTES.agents.persona.root,
          permission: 'agents.persona.access'
        },
        {
          icon: '📢',
          nameKey: 'marketingStrategy',
          descKey: 'marketingStrategy',
          route: ROUTES.agents.marketingStrategy.root,
          permission: 'agents.strategy.access' // Uses same as strategy
        },
      ]
    },
    // Planning & Creation
    {
      categoryKey: 'execution',
      icon: '🎨',
      items: [
        {
          icon: '📝',
          nameKey: 'content',
          descKey: 'content',
          route: ROUTES.agents.content.root,
          permission: 'agents.content.access'
        },
        {
          icon: '🚀',
          nameKey: 'campaignPlanning',
          descKey: 'campaignPlanning',
          route: ROUTES.agents.campaignPlanning.root,
          permission: 'agents.execution.access'
        },
      ]
    },
    // Intelligence
    {
      categoryKey: 'intelligence',
      icon: '🧠',
      items: [
        {
          icon: '📈',
          nameKey: 'performanceIntelligence',
          descKey: 'performanceIntelligence',
          route: ROUTES.agents.performanceIntelligence.root,
          permission: 'agents.analytics.access'
        },
        {
          icon: '🔍',
          nameKey: 'competitiveIntel',
          descKey: 'competitiveIntel',
          route: ROUTES.agents.competitiveIntelligence.root,
          permission: 'agents.intelligence.access'
        },
        // Client Success is agency-only AND requires specific permission
        ...(isAgency ? [{
          icon: '🤝',
          nameKey: 'clientSuccess',
          descKey: 'clientSuccess',
          route: ROUTES.agents.clientSuccess.root,
          permission: 'agents.success.access'
        }] : [])
      ]
    }
  ]

  // Filter agents based on permissions - show all but disable those without permission
  // This gives users visibility into what's available with different roles
  const agents = allAgents.map(category => ({
    ...category,
    items: category.items.map(agent => ({
      ...agent,
      hasAccess: hasPermission(agent.permission)
    }))
  }))

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          "h-[85vh] overflow-hidden flex flex-col p-0",
          // Premium background - warm cream gradient for light, rich slate for dark
          "bg-gradient-to-b from-amber-50/30 via-white to-slate-100/50",
          "dark:from-slate-900 dark:via-slate-900 dark:to-slate-950/80"
        )}
      >
        {/* Header with refined styling - glass morphism effect */}
        <SheetHeader className={cn(
          "px-6 pt-6 pb-4",
          "border-b border-amber-200/40 dark:border-slate-700/80",
          "bg-gradient-to-r from-white/95 via-amber-50/50 to-white/95",
          "dark:from-slate-900/95 dark:via-slate-800/50 dark:to-slate-900/95",
          "backdrop-blur-md shadow-sm"
        )}>
          <SheetTitle className="font-serif text-xl text-slate-800 dark:text-slate-100">
            {t('quickSelector.title')}
          </SheetTitle>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t('quickSelector.subtitle')}
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6">
            {agents.map((category, categoryIndex) => (
              <div key={category.categoryKey}>
                {/* Category Header - Refined with warm accent */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center text-base",
                    "bg-gradient-to-br from-amber-100 to-amber-50 dark:from-slate-700 dark:to-slate-800",
                    "shadow-sm border border-amber-200/50 dark:border-slate-600/50"
                  )}>
                    {category.icon}
                  </div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                    {t(`categories.${category.categoryKey}.name`)}
                  </span>
                  <div className="flex-1 h-px bg-gradient-to-r from-amber-300/40 via-slate-200/60 to-transparent dark:from-amber-500/20 dark:via-slate-700 dark:to-transparent" />
                </div>

                {/* Agent Grid - Premium Cards with depth */}
                <div className="grid grid-cols-2 gap-3">
                  {category.items.map((agent, agentIndex) => (
                    <button
                      key={agent.nameKey}
                      onClick={() => agent.hasAccess && handleAgentSelect(agent.route)}
                      disabled={!agent.hasAccess}
                      style={{
                        animationDelay: `${(categoryIndex * 4 + agentIndex) * 50}ms`
                      }}
                      className={cn(
                        "relative flex flex-col items-start p-4 rounded-2xl transition-all duration-200",
                        "min-h-[110px] tap-target",
                        "animate-in fade-in-0 slide-in-from-bottom-2",
                        agent.hasAccess
                          ? [
                              // Accessible state - premium card with depth
                              "bg-gradient-to-br from-white via-white to-amber-50/30",
                              "dark:from-slate-800/80 dark:via-slate-800/60 dark:to-slate-900/80",
                              "border border-slate-200 dark:border-slate-700",
                              "shadow-md shadow-slate-200/50 dark:shadow-slate-900/50",
                              // Hover state
                              "hover:border-amber-400/80 dark:hover:border-amber-500/60",
                              "hover:shadow-xl hover:shadow-amber-200/30 dark:hover:shadow-amber-900/20",
                              "hover:-translate-y-0.5",
                              "active:scale-[0.98] active:shadow-md",
                              "cursor-pointer"
                            ]
                          : [
                              // Locked state
                              "bg-slate-100/50 dark:bg-slate-900/50",
                              "border border-slate-200/50 dark:border-slate-800",
                              "cursor-not-allowed opacity-50"
                            ]
                      )}
                    >
                      {/* Lock icon for restricted agents */}
                      {!agent.hasAccess && (
                        <div className="absolute top-3 right-3">
                          <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                        </div>
                      )}

                      {/* Icon with refined gradient background */}
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-3",
                        agent.hasAccess
                          ? [
                              "bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900",
                              "dark:from-slate-600 dark:via-slate-700 dark:to-slate-800",
                              "shadow-lg shadow-slate-400/30 dark:shadow-slate-900/50",
                              "ring-1 ring-white/10"
                            ]
                          : "bg-slate-300 dark:bg-slate-700"
                      )}>
                        {agent.icon}
                      </div>

                      {/* Agent name */}
                      <div className={cn(
                        "text-sm font-semibold text-left mb-1",
                        agent.hasAccess
                          ? "text-slate-800 dark:text-slate-100"
                          : "text-slate-500 dark:text-slate-500"
                      )}>
                        {t(`navigation.${agent.nameKey}`)}
                      </div>

                      {/* Description */}
                      <div className={cn(
                        "text-xs text-left leading-relaxed",
                        agent.hasAccess
                          ? "text-slate-600 dark:text-slate-400"
                          : "text-slate-400 dark:text-slate-600"
                      )}>
                        {agent.hasAccess ? t(`quickSelector.descriptions.${agent.descKey}`) : t('quickSelector.locked')}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom safe area padding */}
          <div className="h-6 safe-bottom" />
        </div>
      </SheetContent>
    </Sheet>
  )
}
