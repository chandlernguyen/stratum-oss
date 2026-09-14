import { ChevronRight, Building2, Briefcase, Target, Home } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { ROUTES, parseContext, withContext } from '@/config/routes'
import { useOrganization } from '@/hooks/data/useOrganization'
import { useCampaign } from '@/hooks/data/useCampaigns'
import { useClientContext } from '@/contexts/ClientContext'
import { useClientBySlug } from '@/hooks/data/useClients'

interface BreadcrumbItem {
  label: string
  path?: string
  icon?: React.ElementType
  color?: string
}

export function Breadcrumbs() {
  const { t } = useTranslation(['common'])
  const { organization, isAgency } = useOrganization()
  const location = useLocation()
  const urlContext = parseContext(location.pathname)
  const { campaignId } = useParams<{ campaignId?: string }>()
  const { data: currentCampaign } = useCampaign(campaignId)

  // Get client context from new slug-based routing
  const { clientSlug } = useClientContext()
  const { data: currentClient } = useClientBySlug(clientSlug || undefined)

  const items: BreadcrumbItem[] = []

  // Always show organization/home
  if (organization) {
    items.push({
      label: organization.name,
      path: withContext(ROUTES.dashboard.root, urlContext),
      icon: isAgency ? Building2 : Home,
      color: 'text-gray-600'
    })
  }

  // Show client for agencies (from slug-based routing)
  if (isAgency && currentClient && clientSlug) {
    items.push({
      label: currentClient.name,
      path: `/clients/${clientSlug}`,
      icon: Briefcase,
      color: generateClientColor(currentClient.id)
    })
  }

  // Show current campaign if selected (from context or current)
  const campaignToShow = currentCampaign || (urlContext.campaignId ? { id: urlContext.campaignId, name: t('breadcrumbs.campaign') } : null)
  if (campaignToShow) {
    items.push({
      label: campaignToShow.name,
      path: withContext(ROUTES.campaigns.detail(campaignToShow.id), urlContext),
      icon: Target,
      color: 'text-blue-600'
    })
  }

  // Add current page context if on a specific page
  const pathname = location.pathname
  if (pathname.includes('/strategy')) {
    items.push({ label: t('breadcrumbs.businessStrategy'), icon: Target, color: 'text-amber-600' })
  } else if (pathname.includes('/persona')) {
    items.push({ label: t('breadcrumbs.personas'), icon: Building2, color: 'text-green-600' })
  } else if (pathname.includes('/marketing-strategy')) {
    items.push({ label: t('breadcrumbs.marketingStrategy'), icon: Target, color: 'text-indigo-600' })
  } else if (pathname.includes('/content')) {
    items.push({ label: t('breadcrumbs.content'), icon: Building2, color: 'text-orange-600' })
  } else if (pathname.includes('/analytics')) {
    items.push({ label: t('breadcrumbs.analytics'), icon: Building2, color: 'text-cyan-600' })
  } else if (pathname.includes('/roi-budget')) {
    items.push({ label: t('breadcrumbs.roiBudget'), icon: Building2, color: 'text-emerald-600' })
  } else if (pathname.includes('/campaign-execution')) {
    items.push({ label: t('breadcrumbs.campaignExecution'), icon: Building2, color: 'text-pink-600' })
  } else if (pathname.includes('/competitive-intelligence')) {
    items.push({ label: t('breadcrumbs.competitiveIntelligence'), icon: Building2, color: 'text-red-600' })
  } else if (pathname.includes('/client-success')) {
    items.push({ label: t('breadcrumbs.clientSuccess'), icon: Building2, color: 'text-teal-600' })
  } else if (pathname.includes('/quick-wins')) {
    items.push({ label: t('breadcrumbs.quickWins'), icon: Building2, color: 'text-yellow-600' })
  }

  if (items.length === 0) return null

  return (
    <nav className="flex items-center space-x-2 text-sm px-4 py-2 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 dark:from-gray-900 dark:to-gray-800 dark:border-gray-700">
      {items.map((item, index) => {
        const Icon = item.icon
        const isLast = index === items.length - 1

        return (
          <div key={index} className="flex items-center">
            {index > 0 && (
              <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />
            )}
            {item.path && !isLast ? (
              <Link
                to={item.path}
                className={cn(
                  "flex items-center space-x-1 hover:text-primary transition-colors",
                  item.color || 'text-gray-600'
                )}
              >
                {Icon && <Icon className="w-4 h-4" />}
                <span>{item.label}</span>
              </Link>
            ) : (
              <div
                className={cn(
                  "flex items-center space-x-1 font-medium",
                  item.color || 'text-gray-900'
                )}
              >
                {Icon && <Icon className="w-4 h-4" />}
                <span>{item.label}</span>
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}

// Generate consistent color for client based on ID
function generateClientColor(clientId: string): string {
  const hue = parseInt(clientId.substring(0, 8).replace(/-/g, ''), 16) % 360
  return `hsl(${hue}, 70%, 45%)`
}