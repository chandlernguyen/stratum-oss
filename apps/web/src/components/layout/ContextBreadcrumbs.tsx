import { Link, useLocation, useParams } from 'react-router-dom'
import { ChevronRight, Home, Target, Users, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useCampaign } from '@/hooks/data/useCampaigns'
import { useClientContext } from '@/contexts/ClientContext'
import { cn } from '@/lib/utils'

interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ReactNode
  current?: boolean
}

export function ContextBreadcrumbs() {
  const { t } = useTranslation(['common'])
  const location = useLocation()
  const { campaignId } = useParams<{ campaignId?: string }>()
  const { data: currentCampaign } = useCampaign(campaignId)
  const { clientData, clientSlug } = useClientContext()

  // Use clientSlug from context
  const activeClientSlug = clientSlug

  // Parse the current path to build breadcrumbs
  const pathSegments = location.pathname.split('/').filter(Boolean)

  const breadcrumbs: BreadcrumbItem[] = []

  // Always start with Dashboard
  breadcrumbs.push({
    label: t('navigation.dashboard'),
    href: '/dashboard',
    icon: <Home className="w-4 h-4" />
  })

  // Build breadcrumbs based on path
  if (pathSegments[0] === 'campaigns') {
    breadcrumbs.push({
      label: t('navigation.campaigns'),
      href: '/campaigns',
      icon: <Target className="w-4 h-4" />
    })

    if (campaignId && currentCampaign) {
      breadcrumbs.push({
        label: currentCampaign.name,
        href: `/campaigns/${campaignId}`,
        current: pathSegments.length === 2
      })

      // Add sub-pages within campaign context
      if (pathSegments.length > 2) {
        const subPage = pathSegments[2]
        const subPageLabels: Record<string, string> = {
          'content': t('breadcrumbs.contentCreation'),
          'analytics': t('breadcrumbs.analytics'),
          'strategy': t('breadcrumbs.strategy'),
          'execution': t('breadcrumbs.campaignExecution'),
          'settings': t('labels.settings')
        }

        if (subPageLabels[subPage]) {
          breadcrumbs.push({
            label: subPageLabels[subPage],
            current: true
          })
        }
      }
    }
  } else if (pathSegments[0] === 'agents' && pathSegments[1]) {
    // Agent pages
    const agentLabels: Record<string, string> = {
      'strategy': t('breadcrumbs.strategyAgent'),
      'persona': t('breadcrumbs.personaAgent'),
      'marketing-strategy': t('breadcrumbs.marketingStrategy'),
      'content': t('breadcrumbs.contentAgent'),
      'analytics': t('breadcrumbs.analyticsAgent'),
      'roi-budget': t('breadcrumbs.roiBudget'),
      'campaign-execution': t('breadcrumbs.campaignExecution'),
      'quick-wins': t('breadcrumbs.quickWins'),
      'competitive-intelligence': t('breadcrumbs.competitiveIntelligence'),
      'client-success': t('breadcrumbs.clientSuccess')
    }

    breadcrumbs.push({
      label: t('navigation.agents'),
      href: '#',
      icon: <Sparkles className="w-4 h-4" />
    })

    if (agentLabels[pathSegments[1]]) {
      breadcrumbs.push({
        label: agentLabels[pathSegments[1]],
        current: true
      })
    }
  } else if (pathSegments[0] === 'outputs') {
    breadcrumbs.push({
      label: t('navigation.library'),
      href: '/outputs',
      current: pathSegments.length === 1
    })
  } else if (pathSegments[0] === 'clients' && activeClientSlug) {
    // Agency client context: /clients/:clientSlug/*
    breadcrumbs.push({
      label: t('navigation.clients'),
      href: '/clients',
      icon: <Users className="w-4 h-4" />
    })

    // Client name from context
    const clientName = clientData?.client_info?.name || t('breadcrumbs.client')
    breadcrumbs.push({
      label: clientName,
      href: `/clients/${activeClientSlug}`,
      current: pathSegments.length === 2
    })

    // Handle nested routes under client context
    if (pathSegments[2] === 'agents' && pathSegments[3]) {
      // Agent pages under client context
      const agentLabels: Record<string, string> = {
        'strategy': t('breadcrumbs.strategyAgent'),
        'persona': t('breadcrumbs.personaAgent'),
        'marketing-strategy': t('breadcrumbs.marketingStrategy'),
        'content': t('breadcrumbs.contentAgent'),
        'analytics': t('breadcrumbs.analyticsAgent'),
        'roi-budget': t('breadcrumbs.roiBudget'),
        'campaign-planning': t('breadcrumbs.campaignPlanning'),
        'competitive-intelligence': t('breadcrumbs.competitiveIntelligence'),
        'client-success': t('breadcrumbs.clientSuccess'),
        'performance-intelligence': t('breadcrumbs.performanceIntelligence')
      }

      breadcrumbs.push({
        label: t('navigation.agents'),
        href: '#',
        icon: <Sparkles className="w-4 h-4" />
      })

      if (agentLabels[pathSegments[3]]) {
        breadcrumbs.push({
          label: agentLabels[pathSegments[3]],
          current: true
        })
      }
    } else if (pathSegments[2] === 'campaigns') {
      // Campaigns under client context
      breadcrumbs.push({
        label: t('navigation.campaigns'),
        href: `/clients/${activeClientSlug}/campaigns`,
        icon: <Target className="w-4 h-4" />
      })

      if (pathSegments[3] && currentCampaign) {
        breadcrumbs.push({
          label: currentCampaign.name,
          current: true
        })
      }
    }
  }

  // Don't show breadcrumbs if we only have Dashboard
  if (breadcrumbs.length <= 1) {
    return null
  }

  return (
    <div className="hidden md:block border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50">
      <div className="container py-2">
        <nav className="flex" aria-label={t('aria.breadcrumb')}>
          <ol className="flex items-center space-x-2">
            {breadcrumbs.map((item, index) => (
              <li key={index} className="flex items-center">
                {index > 0 && (
                  <ChevronRight className="w-4 h-4 text-gray-400 mx-2" />
                )}
                {item.href && !item.current ? (
                  <Link
                    to={item.href}
                    className={cn(
                      "flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-amber-600 transition-colors",
                      "dark:text-gray-400 dark:hover:text-amber-400"
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                ) : (
                  <span
                    className={cn(
                      "flex items-center gap-1.5 text-sm font-medium",
                      item.current
                        ? "text-gray-900 dark:text-gray-100"
                        : "text-gray-500 dark:text-gray-400"
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </div>
  )
}