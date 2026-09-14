import { useTranslation } from 'react-i18next'
import { BusinessIntelligenceTab } from '@/components/profile/BusinessIntelligenceTab'
import { useUserIdentity } from '@/hooks/data/useUserIdentity'
import { useClientContext } from '@/contexts/ClientContext'

export function BusinessIntelligence() {
  const { t } = useTranslation('intelligence')
  const { clientSlug } = useClientContext()
  const { data: identity } = useUserIdentity()
  const isAgency = identity?.organization?.type === 'AGENCY'

  // Dynamic title based on audience and context
  const title = isAgency && clientSlug
    ? t('pageTitle.clientProfile')
    : t('pageTitle.businessProfile')

  const description = isAgency && clientSlug
    ? t('pageDescription.client', { clientSlug })
    : t('pageDescription.organization')

  return (
    <div className="container mx-auto py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-muted-foreground mt-1">
          {description}
        </p>
      </div>

      {/* BusinessIntelligenceTab handles its own tab switching via URL search params */}
      <BusinessIntelligenceTab />
    </div>
  )
}
