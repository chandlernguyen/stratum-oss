import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCampaign, useUpdateCampaign } from '@/hooks/data/useCampaigns'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Target,
  Users,
  BarChart,
  MessageSquare,
  Play,
  Pause,
  CheckCircle,
  Archive,
} from 'lucide-react'
import { CampaignAnalytics } from '@/components/campaigns/CampaignAnalytics'
import { CampaignHeader } from './campaign/components/CampaignHeader'
import { CampaignMetrics } from './campaign/components/CampaignMetrics'
import { CampaignEditForm } from './campaign/components/CampaignEditForm'
import { usePageTitle } from '@/hooks/usePageTitle'
import { CommentThread } from '@/components/collaboration/CommentThread'
import { TaskAssignmentPanel } from '@/components/collaboration/TaskAssignmentPanel'
import { getIntlLocale } from '@/lib/locales'

interface Campaign {
  id: string
  name: string
  description: string | null
  status: 'draft' | 'planned' | 'active' | 'paused' | 'completed' | 'archived'
  budget_cents: number
  spent_cents: number
  start_date: string | null
  end_date: string | null
  objectives: any
  metrics: any
  created_at: string
  updated_at: string
  // Client association (for agency multi-tenant)
  client_id?: string | null
  // New fields
  target_audience?: string | null
  campaign_type?: string | null
  marketing_channels?: string[]
  content_pillars?: string[]
  target_personas?: string[]
  success_metrics?: {
    primary_kpi?: string
    target_value?: number
    secondary_kpis?: string[]
  }
  competitor_context?: string | null
  geographic_target?: string | null
  priority_level?: string
  tags?: string[]
}

// Campaign type values (labels are translated in component)
const CAMPAIGN_TYPE_VALUES = [
  'brand_awareness',
  'lead_generation',
  'product_launch',
  'seasonal_promotion',
  'content_marketing',
  'email_nurture',
  'social_media',
  'event_promotion',
  'customer_retention',
  'referral_program',
  'other'
] as const

// Marketing channel values (labels are translated in component)
const MARKETING_CHANNEL_VALUES = [
  'email',
  'social',
  'content',
  'paid_ads',
  'seo',
  'events',
  'webinars',
  'influencer',
  'affiliate',
  'direct_mail'
] as const

// Priority level values with colors (labels are translated in component)
const PRIORITY_LEVEL_VALUES = [
  { value: 'low', color: 'text-brand-slate' },
  { value: 'medium', color: 'text-brand-info' },
  { value: 'high', color: 'text-brand-warning' },
  { value: 'critical', color: 'text-brand-error' }
] as const

export function CampaignDetail() {
  const { t, i18n } = useTranslation('campaigns')
  const intlLocale = getIntlLocale(i18n.language)

  // Create translated arrays for dropdowns
  const CAMPAIGN_TYPES = CAMPAIGN_TYPE_VALUES.map(value => ({
    value,
    label: t(`campaignTypes.${value}`)
  }))

  const MARKETING_CHANNELS = MARKETING_CHANNEL_VALUES.map(value => ({
    value,
    label: t(`marketingChannels.${value}`)
  }))

  const PRIORITY_LEVELS = PRIORITY_LEVEL_VALUES.map(({ value, color }) => ({
    value,
    label: t(`priorityLevels.${value}`),
    color
  }))

  // Set page title for GA4 tracking and accessibility
  usePageTitle(t('detail.pageTitle'));

  const { id, campaignId } = useParams<{ id?: string; campaignId?: string }>()
  const navigate = useNavigate()
  // Support both route patterns: /campaigns/:id and /clients/:slug/campaigns/:campaignId
  const activeCampaignId = campaignId || id
  const { data: campaign, isLoading: loading } = useCampaign(activeCampaignId)
  const updateCampaign = useUpdateCampaign()
  const [isEditing, setIsEditing] = useState(false)
  const [editedCampaign, setEditedCampaign] = useState<Campaign | null>(null)
  const [showAdvancedFields, setShowAdvancedFields] = useState(false)

  useEffect(() => {
    if (campaign) {
      // Initialize arrays if they don't exist
      const normalizedData = {
        ...campaign,
        marketing_channels: campaign.marketing_channels || [],
        content_pillars: campaign.content_pillars || [],
        target_personas: campaign.target_personas || [],
        tags: campaign.tags || [],
        success_metrics: campaign.success_metrics || {},
        priority_level: campaign.priority_level || 'medium'
      }
      setEditedCampaign(normalizedData)

      // Auto-show advanced fields if any contain data
      const hasAdvancedData =
        (campaign.content_pillars && campaign.content_pillars.length > 0) ||
        (campaign.success_metrics && Object.keys(campaign.success_metrics).length > 0) ||
        campaign.competitor_context ||
        campaign.geographic_target ||
        (campaign.tags && campaign.tags.length > 0)

      if (hasAdvancedData) {
        setShowAdvancedFields(true)
      }
    }
  }, [campaign])

  const handleSave = () => {
    if (!editedCampaign || !activeCampaignId) return

    // Prepare all editable fields for update
    const updateData: Record<string, any> = {
      name: editedCampaign.name,
      description: editedCampaign.description || null,
      objectives: editedCampaign.objectives || null,
      budget_cents: editedCampaign.budget_cents,
      status: editedCampaign.status === 'archived' ? 'draft' : editedCampaign.status,
      target_audience: editedCampaign.target_audience || null,
      campaign_type: editedCampaign.campaign_type || null,
      marketing_channels: editedCampaign.marketing_channels || [],
      content_pillars: editedCampaign.content_pillars || [],
      target_personas: editedCampaign.target_personas || [],
      success_metrics: editedCampaign.success_metrics || {},
      competitor_context: editedCampaign.competitor_context || null,
      geographic_target: editedCampaign.geographic_target || null,
      priority_level: editedCampaign.priority_level || 'medium',
      tags: editedCampaign.tags || [],
    }

    console.log('Saving campaign with data:', updateData) // Debug log

    updateCampaign.mutate({
      id: activeCampaignId,
      data: updateData
    }, {
      onSuccess: () => {
        setIsEditing(false)
      }
    })
  }

  const handleStatusChange = (newStatus: Campaign['status']) => {
    if (!activeCampaignId) return

    // Database-First: Use direct Supabase update via mutation hook
    updateCampaign.mutate({
      id: activeCampaignId,
      data: { status: newStatus }
    }, {
      onSuccess: (updatedCampaign) => {
        // Update local state with the returned campaign data
        if (updatedCampaign) {
          setEditedCampaign(updatedCampaign as Campaign)
        }
      }
    })
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat(intlLocale, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100)
  }

  const calculateProgress = (spent: number, budget: number) => {
    if (!budget || budget === 0) return 0
    return Math.min(100, (spent / budget) * 100)
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default'
      case 'draft': return 'secondary'
      case 'planned': return 'outline' // Orange styling applied separately
      case 'paused': return 'outline'
      case 'completed': return 'default'
      case 'archived': return 'secondary'
      default: return 'secondary'
    }
  }

  const getStatusActions = (status: Campaign['status']) => {
    switch (status) {
      case 'draft':
        return [
          { label: t('statusActions.activate'), icon: Play, status: 'active' as const, variant: 'default' as const }
        ]
      case 'planned':
        return [
          { label: t('statusActions.activateCampaign'), icon: Play, status: 'active' as const, variant: 'default' as const }
        ]
      case 'active':
        return [
          { label: t('statusActions.pause'), icon: Pause, status: 'paused' as const, variant: 'outline' as const },
          { label: t('statusActions.complete'), icon: CheckCircle, status: 'completed' as const, variant: 'secondary' as const }
        ]
      case 'paused':
        return [
          { label: t('statusActions.resume'), icon: Play, status: 'active' as const, variant: 'default' as const },
          { label: t('statusActions.archive'), icon: Archive, status: 'archived' as const, variant: 'destructive' as const }
        ]
      case 'completed':
        return [
          { label: t('statusActions.archive'), icon: Archive, status: 'archived' as const, variant: 'destructive' as const }
        ]
      default:
        return []
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <h3 className="text-lg font-semibold mb-2">{t('detail.notFound')}</h3>
            <Button onClick={() => navigate('/campaigns')}>
              {t('detail.backToCampaigns')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const hasUnsavedChanges = editedCampaign ? JSON.stringify(editedCampaign) !== JSON.stringify(campaign) : false

  return (
    <div className="container mx-auto px-3 md:px-4 py-4 md:py-8">
      {/* Header */}
      <CampaignHeader
        campaign={campaign}
        isEditing={isEditing}
        hasUnsavedChanges={hasUnsavedChanges}
        onToggleEdit={() => setIsEditing(!isEditing)}
        onSave={handleSave}
        onCancelEdit={() => {
          setIsEditing(false)
          setEditedCampaign(campaign)
        }}
        onStatusChange={handleStatusChange}
        onArchive={() => handleStatusChange('archived')}
        getStatusBadgeVariant={getStatusBadgeVariant}
        getStatusActions={getStatusActions}
      />

      {/* Key Metrics & Progress */}
      <CampaignMetrics
        campaign={campaign}
        formatCurrency={formatCurrency}
        calculateProgress={() => calculateProgress(campaign.spent_cents, campaign.budget_cents || 0)}
      />

      {/* Campaign Details */}
      <div className="space-y-4">
        <CampaignEditForm
          campaign={campaign}
          editedCampaign={editedCampaign}
          setEditedCampaign={setEditedCampaign}
          isEditing={isEditing}
          showAdvancedFields={showAdvancedFields}
          setShowAdvancedFields={setShowAdvancedFields}
          CAMPAIGN_TYPES={CAMPAIGN_TYPES}
          PRIORITY_LEVELS={PRIORITY_LEVELS}
          MARKETING_CHANNELS={MARKETING_CHANNELS}
        />

        {/* AI Agents */}
        <Card>
          <CardHeader>
            <CardTitle>{t('detail.aiAgents.title')}</CardTitle>
            <CardDescription>{t('detail.aiAgents.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Mobile: Single column | Tablet: 2 columns | Desktop: 2 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              {[
                { key: 'strategy', icon: Target, path: '/strategy' },
                { key: 'persona', icon: Users, path: '/persona' },
                { key: 'content', icon: MessageSquare, path: '/content' },
                { key: 'analytics', icon: BarChart, path: '/analytics' },
              ].map((agent) => (
                <Card
                  key={agent.key}
                  className="cursor-pointer hover:shadow-lg transition-shadow min-h-20 md:min-h-24"
                  onClick={() => navigate(agent.path, { state: { campaignId: campaign.id } })}
                >
                  <CardHeader className="p-4 md:p-6">
                    <div className="flex items-center gap-3">
                      <agent.icon className="h-5 w-5 md:h-6 md:w-6 text-primary flex-shrink-0" />
                      <div className="min-w-0">
                        <CardTitle className="text-sm md:text-base truncate">{t(`detail.aiAgents.agents.${agent.key}.name`)}</CardTitle>
                        <CardDescription className="text-xs line-clamp-2">{t(`detail.aiAgents.agents.${agent.key}.description`)}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Campaign Analytics */}
        <CampaignAnalytics campaignId={id || ''} />

        {/* Collaboration Section - Comments & Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                {t('detail.collaboration.discussion.title')}
              </CardTitle>
              <CardDescription>
                {t('detail.collaboration.discussion.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CommentThread
                resourceType="campaign"
                resourceId={campaign.id}
                clientId={campaign.client_id || undefined}
              />
            </CardContent>
          </Card>

          {/* Tasks */}
          <Card>
            <CardHeader>
              <CardTitle>{t('detail.collaboration.tasks.title')}</CardTitle>
              <CardDescription>
                {t('detail.collaboration.tasks.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TaskAssignmentPanel
                resourceType="campaign"
                resourceId={campaign.id}
                clientId={campaign.client_id || undefined}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
