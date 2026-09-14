// ✅ useState removed - no longer needed with unified confirmation hooks
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Plus,
  Calendar,
  DollarSign,
  Target,
  ChevronRight,
  Eye,
  BarChart2,
  Megaphone,
  ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { useCampaigns, type Campaign } from '@/hooks/data/useCampaigns'
import { useCampaignMetricsMapping } from '@/hooks/data/useCampaignMetrics'
import { ResourceActionsDropdown } from '@/components/ResourceActionsDropdown'
import { useDeleteConfirmation, useArchiveConfirmation } from '@/hooks/useConfirmDialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useResourceActions } from '@/hooks/data/useResourceActions'
import { RESOURCE_CONFIGS } from '@/config/resource-configs'
import { CampaignEmptyState } from '@/components/campaigns/CampaignEmptyState'
import { useIntelligenceReadiness } from '@/hooks/data/useIntelligenceReadiness'
import { useUserRoles } from '@/hooks/useUserRoles'
import { useClientContext } from '@/contexts/ClientContext'
import { useUserContextEnhanced } from '@/hooks/data/useUserContextEnhanced'
import { useAgencyRouteGuard } from '@/hooks/useAgencyRouteGuard'
import { usePageTitle } from '@/hooks/usePageTitle'
import { buildAgentRootUrl, buildContextAwareUrl } from '@/utils/multiTenantRouting'
import { getIntlLocale } from '@/lib/locales'

export function CampaignsList() {
  // Enforce client context for agency users
  useAgencyRouteGuard();

  const { t, i18n } = useTranslation('campaigns');
  const intlLocale = getIntlLocale(i18n.language);

  // Set page title for GA4 tracking and accessibility
  usePageTitle(t('title'));

  const navigate = useNavigate()
  const { clientSlug, clientId } = useClientContext()
  const [searchParams, setSearchParams] = useSearchParams()

  // Permission checks for campaign actions
  const { data: userContext } = useUserContextEnhanced()
  const permissions = userContext?.permissions || []
  const canCreateCampaign = permissions.includes('campaigns.campaign.create')
  const canEditCampaign = permissions.includes('campaigns.campaign.edit')
  const canDeleteCampaign = permissions.includes('campaigns.campaign.delete')
  const canArchiveCampaign = permissions.includes('campaigns.campaign.archive')

  // Check if user has ANY action permissions (for showing/hiding actions dropdown)
  const hasAnyActionPermission = canEditCampaign || canDeleteCampaign || canArchiveCampaign

  // Get status from URL or default to 'active'
  const selectedStatus = (searchParams.get('status') || 'active') as 'active' | 'draft' | 'planned' | 'paused' | 'completed' | 'all'

  // Fetch filtered campaigns based on selected tab
  // Include archived campaigns when viewing "all"
  const { data: campaigns = [], isLoading: loading, refetch } = useCampaigns({
    includeArchived: selectedStatus === 'all',
    status: selectedStatus === 'all' ? null : selectedStatus,
    clientId: clientId || undefined
  })

  // Fetch all campaigns to calculate counts for each tab
  const { data: allCampaigns = [] } = useCampaigns({
    includeArchived: true, // Include archived for accurate counts
    status: null,
    clientId: clientId || undefined
  })

  // Calculate counts for each status (exclude archived campaigns from status counts)
  const nonArchivedCampaigns = allCampaigns.filter(c => !c.archived_at);
  const statusCounts = {
    active: nonArchivedCampaigns.filter(c => c.status === 'active').length,
    draft: nonArchivedCampaigns.filter(c => c.status === 'draft').length,
    planned: nonArchivedCampaigns.filter(c => c.status === 'planned').length,
    paused: nonArchivedCampaigns.filter(c => c.status === 'paused').length,
    completed: nonArchivedCampaigns.filter(c => c.status === 'completed').length,
    all: allCampaigns.length // All includes archived
  }

  // Fetch metrics mapping for performance indicators
  const { data: metricsMap = {} } = useCampaignMetricsMapping()

  // Intelligence readiness for empty state
  const { data: readiness } = useIntelligenceReadiness()
  const { canCreateCampaigns } = useUserRoles()

  // Database-First approach using generic hook with local state management
  const mutations = useResourceActions(RESOURCE_CONFIGS.campaign);

  // ✅ NEW: Use unified confirmation hooks (promise-based, no dialog state needed)
  const { confirmDelete, dialogProps: deleteDialogProps } = useDeleteConfirmation();
  const { confirmArchive, dialogProps: archiveDialogProps } = useArchiveConfirmation();

  // ✅ NEW: Simplified archive handler using promise-based confirmation
  const openArchiveDialog = async (item: Campaign) => {
    const result = await confirmArchive({
      resourceName: item.name,
      resourceType: 'Campaign'
    });

    if (result.confirmed && result.reason) {
      try {
        await mutations.archive.mutateAsync({ id: item.id, reason: result.reason });
        refetch(); // Refresh campaigns using React Query
      } catch (error: any) {
        console.error('Campaign archive failed:', error);
        alert(`Failed to archive campaign: ${error.message || error}`);
      }
    }
  };

  // ✅ NEW: Simplified delete handler using promise-based confirmation
  const openDeleteConfirm = async (item: Campaign) => {
    const confirmed = await confirmDelete({
      title: `Delete ${item.name}?`,
      description: item.archived_at
        ? 'This will permanently delete this archived campaign.'
        : 'This campaign will be archived first. You can restore it later.',
      confirmText: 'Delete Campaign',
      itemName: item.name,
      isArchived: !!item.archived_at
    });

    if (confirmed) {
      try {
        await mutations.delete.mutateAsync({ id: item.id });
        refetch(); // Refresh campaigns using React Query
      } catch (error: any) {
        console.error('Campaign delete failed:', error);
        alert(`Failed to delete campaign: ${error.message || error}`);
      }
    }
  };

  const handleRestore = async (item: Campaign) => {
    try {
      await mutations.restore.mutateAsync({ id: item.id });
      refetch(); // Refresh campaigns using React Query
    } catch (error: any) {
      console.error('Campaign restore failed:', error);
      alert(`Failed to restore campaign: ${error.message || error}`);
    }
  };

  // Create resourceActions object matching legacy interface (simplified)
  const resourceActions = {
    openArchiveDialog,
    openDeleteConfirm,
    restore: handleRestore,
  };

  // Data loading now handled by React Query hook

  const getStatusBadgeVariant = (status?: string) => {
    switch (status) {
      case 'active': return 'default'
      case 'draft': return 'secondary'
      case 'planned': return 'outline' // New: AI-generated plans
      case 'paused': return 'outline'
      case 'completed': return 'default'
      default: return 'secondary'
    }
  }

  const getStatusBadgeColor = (status?: string) => {
    // Add special color for planned campaigns
    if (status === 'planned') {
      return 'border-orange-500 text-orange-600 bg-orange-50 dark:bg-orange-900/20'
    }
    return ''
  }

  const formatCurrency = (amount?: number) => {
    if (!amount) return '$0'
    return new Intl.NumberFormat(intlLocale, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // calculateProgress removed - spent tracking not in current schema

  const handleViewCampaign = (campaign: Campaign) => {
    navigate(buildContextAwareUrl(`/campaigns/${campaign.id}`, clientSlug) || `/campaigns/${campaign.id}`)
  }

  const handleEditCampaign = (campaign: Campaign) => {
    navigate(buildContextAwareUrl(`/campaigns/${campaign.id}?edit=true`, clientSlug) || `/campaigns/${campaign.id}?edit=true`)
  }

  const handleCopyCampaign = (campaign: Campaign) => {
    const campaignInfo = `Name: ${campaign.name}\nStatus: ${campaign.status}\nBudget: ${formatCurrency(campaign.budget)}`;
    navigator.clipboard.writeText(campaignInfo);
    console.log('Campaign info copied to clipboard');
  }

  const handleTabChange = (value: string) => {
    setSearchParams({ status: value })
  }

  // Smart empty state based on current tab and available campaigns
  const getEmptyStateConfig = () => {
    if (selectedStatus === 'active' && statusCounts.draft > 0) {
      return {
        title: "No active campaigns",
        description: `You have ${statusCounts.draft} draft campaign${statusCounts.draft === 1 ? '' : 's'} ready to launch`,
        action: (
          <Button onClick={() => handleTabChange('draft')} className="min-h-12 md:min-h-10 w-full md:w-auto">
            View Drafts
          </Button>
        )
      }
    }

    if (selectedStatus === 'active') {
      return {
        title: "No campaigns yet",
        description: "Build strategic intelligence first, then organize into campaigns",
        action: (
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <Button onClick={() => navigate(buildAgentRootUrl('strategy', clientSlug))} className="min-h-12 md:min-h-10 w-full md:w-auto">
              <Target className="mr-2 h-4 w-4" />
              Start with Strategy
            </Button>
            {canCreateCampaigns && (
              <Button variant="outline" onClick={() => navigate(buildContextAwareUrl('/campaigns/new', clientSlug) || '/campaigns/new')} className="min-h-12 md:min-h-10 w-full md:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Create Campaign
              </Button>
            )}
          </div>
        )
      }
    }

    if (selectedStatus === 'planned') {
      return {
        title: "No planned campaigns yet",
        description: "Generate campaign plans from the Campaign Planning agent and save them to see them here",
        action: (
          <Button onClick={() => navigate(buildAgentRootUrl('campaign_planning', clientSlug))} className="min-h-12 md:min-h-10 w-full md:w-auto">
            <Target className="mr-2 h-4 w-4" />
            Generate Campaign Plans
          </Button>
        )
      }
    }

    if (selectedStatus === 'paused') {
      return {
        title: "No paused campaigns",
        description: statusCounts.active > 0
          ? `You have ${statusCounts.active} active campaign${statusCounts.active === 1 ? '' : 's'} running`
          : "Paused campaigns will appear here when you pause an active campaign",
        action: statusCounts.active > 0 ? (
          <Button onClick={() => handleTabChange('active')} className="min-h-12 md:min-h-10 w-full md:w-auto">
            View Active Campaigns
          </Button>
        ) : null
      }
    }

    if (selectedStatus === 'draft' && statusCounts.active > 0) {
      return {
        title: "No draft campaigns",
        description: `You have ${statusCounts.active} active campaign${statusCounts.active === 1 ? '' : 's'} running`,
        action: (
          <Button onClick={() => handleTabChange('active')} className="min-h-12 md:min-h-10 w-full md:w-auto">
            View Active Campaigns
          </Button>
        )
      }
    }

    if (selectedStatus === 'completed' && statusCounts.active > 0) {
      return {
        title: "No completed campaigns",
        description: `You have ${statusCounts.active} active campaign${statusCounts.active === 1 ? '' : 's'} in progress`,
        action: (
          <Button onClick={() => handleTabChange('active')} className="min-h-12 md:min-h-10 w-full md:w-auto">
            View Active Campaigns
          </Button>
        )
      }
    }

    return {
      title: `No ${selectedStatus} campaigns`,
      description: "Build intelligence outputs first, then create campaigns to organize them",
      action: (
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          <Button onClick={() => navigate(buildAgentRootUrl('strategy', clientSlug))} className="min-h-12 md:min-h-10 w-full md:w-auto">
            <Target className="mr-2 h-4 w-4" />
            Build Intelligence
          </Button>
          {canCreateCampaigns && (
            <Button variant="outline" onClick={() => navigate(buildContextAwareUrl('/campaigns/new', clientSlug) || '/campaigns/new')} className="min-h-12 md:min-h-10 w-full md:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Create Campaign
            </Button>
          )}
        </div>
      )
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-3 md:px-4 py-4 md:py-8 max-w-7xl">
        <div className="mb-8">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-48 mb-2 animate-pulse" />
          <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-72 animate-pulse" />
        </div>
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className={cn(
              "overflow-hidden",
              "border-slate-200/80 dark:border-slate-700/80",
              "animate-pulse"
            )}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-700" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                    <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/3" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded" />
                  <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded" />
                  <div className="h-12 bg-slate-100 dark:bg-slate-800 rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-3 md:px-4 py-4 md:py-8 max-w-7xl">
      {/* Header - Refined Authority styling */}
      <div className="relative mb-8">
        {/* Decorative background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none -mx-3 md:-mx-4 -mt-4 md:-mt-8 rounded-b-3xl">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-20 w-48 h-48 bg-slate-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative flex flex-col md:flex-row md:justify-between md:items-end gap-6">
          <div>
            {/* Premium badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/10 to-amber-600/10 border border-amber-500/20 mb-4">
              <Megaphone className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-xs font-medium text-amber-700 dark:text-amber-400">{t('list.managementBadge')}</span>
            </div>

            {/* Serif heading */}
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              {t('list.pageTitle')}
            </h1>
            <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 max-w-md">
              {t('list.pageSubtitle')}
            </p>
          </div>
          {canCreateCampaign && (
            <Button
              onClick={() => navigate(buildContextAwareUrl('/campaigns/new', clientSlug) || '/campaigns/new')}
              className={cn(
                "min-h-12 md:min-h-10 w-full md:w-auto",
                "bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800",
                "shadow-lg shadow-slate-900/20",
                "transition-all duration-200 hover:-translate-y-0.5",
                "group"
              )}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('list.newCampaign')}
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          )}
        </div>
      </div>

      {/* Status Filter - Mobile: Dropdown | Desktop: Tabs */}
      <div className="mb-6">
        {/* Mobile: Status Dropdown (MOBILE FIRST) */}
        <div className="md:hidden">
          <label htmlFor="campaign-status-mobile" className="block text-sm font-medium text-muted-foreground mb-2">
            {t('list.filterByStatus')}
          </label>
          <select
            id="campaign-status-mobile"
            value={selectedStatus}
            onChange={(e) => handleTabChange(e.target.value)}
            className="w-full min-h-12 px-4 py-3 bg-background border border-input rounded-md text-base font-medium focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="active">✅ {t('status.active')} ({statusCounts.active})</option>
            <option value="planned">📋 {t('status.planned')} ({statusCounts.planned})</option>
            <option value="paused">⏸️ {t('status.paused')} ({statusCounts.paused})</option>
            <option value="draft">📝 {t('filters.draft')} ({statusCounts.draft})</option>
            <option value="completed">✔️ {t('status.completed')} ({statusCounts.completed})</option>
            <option value="all">📊 {t('filters.all')} ({statusCounts.all})</option>
          </select>
        </div>

        {/* Desktop: Tabs (DESKTOP ENHANCEMENT) */}
        <Tabs value={selectedStatus} onValueChange={handleTabChange} className="hidden md:block">
          <TabsList>
            <TabsTrigger value="active">
              {t('status.active')}
              {statusCounts.active > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {statusCounts.active}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="planned">
              {t('status.planned')}
              {statusCounts.planned > 0 && (
                <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-700 border-orange-300">
                  {statusCounts.planned}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="paused">
              {t('status.paused')} ({statusCounts.paused})
            </TabsTrigger>
            <TabsTrigger value="draft">
              {t('filters.draft')} ({statusCounts.draft})
            </TabsTrigger>
            <TabsTrigger value="completed">
              {t('status.completed')} ({statusCounts.completed})
            </TabsTrigger>
            <TabsTrigger value="all">
              {t('filters.all')}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {campaigns.length === 0 ? (
        // Show intelligence-first empty state when user has NO campaigns at all
        statusCounts.all === 0 && readiness ? (
          <CampaignEmptyState
            readiness={readiness}
            canCreateCampaigns={canCreateCampaigns}
          />
        ) : (
          // Show simple empty state for filtered views with no results
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Target className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">{getEmptyStateConfig().title}</h3>
              <p className="text-muted-foreground mb-6">{getEmptyStateConfig().description}</p>
              {getEmptyStateConfig().action}
            </CardContent>
          </Card>
        )
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign) => (
            <Card
              key={campaign.id}
              className={cn(
                "relative overflow-hidden cursor-pointer group transition-all duration-300",
                "border-slate-200/80 dark:border-slate-700/80",
                "hover:border-amber-400/50 dark:hover:border-amber-500/50",
                "hover:shadow-xl hover:shadow-amber-500/10",
                "hover:-translate-y-0.5"
              )}
              onClick={() => handleViewCampaign(campaign)}
            >
              {/* Grain texture */}
              <div className="absolute inset-0 opacity-[0.01] pointer-events-none">
                <div className="w-full h-full" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }} />
              </div>

              <CardHeader className="relative p-4 md:p-6">
                {/* Mobile: Stacked | Desktop: Horizontal */}
                <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3 md:gap-0">
                  <div className="flex-1">
                    <CardTitle className="text-lg md:text-xl text-slate-900 dark:text-slate-100 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                      {campaign.name}
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs md:text-sm text-slate-500 dark:text-slate-400">
                      Created {format(new Date(campaign.created_at), 'MMM dd, yyyy')}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant={getStatusBadgeVariant(campaign.status)}
                      className={getStatusBadgeColor(campaign.status)}
                    >
                      {campaign.status || 'draft'}
                    </Badge>

                    {/* Performance Indicator Badge */}
                    {metricsMap[campaign.id] ? (
                      <Badge variant="outline" className="text-xs">
                        <BarChart2 className="w-3 h-3 mr-1" />
                        {t('list.metricsCount', { count: metricsMap[campaign.id] })}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        {t('list.noData')}
                      </Badge>
                    )}

                    {/* Unified Actions Dropdown - only show if user has permissions */}
                    {hasAnyActionPermission && (
                      <ResourceActionsDropdown
                        item={campaign}
                        config={RESOURCE_CONFIGS.campaign}
                        onArchive={resourceActions.openArchiveDialog}
                        onRestore={resourceActions.restore}
                        onDelete={resourceActions.openDeleteConfirm}
                        onView={handleViewCampaign}
                        onEdit={handleEditCampaign}
                        onCopy={handleCopyCampaign}
                        showView={true}
                        showEdit={canEditCampaign && !campaign.archived_at}
                        showCopy={true}
                        showArchive={canArchiveCampaign && !campaign.archived_at}
                        showRestore={canArchiveCampaign && !!campaign.archived_at}
                        showDelete={canDeleteCampaign}
                        customActions={[
                          {
                            label: 'View Details',
                            icon: Eye,
                            action: handleViewCampaign,
                            className: 'text-brand-info'
                          }
                        ]}
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative p-4 md:p-6">
                {/* Campaign Info Grid - Premium styling */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  {/* Budget */}
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      "bg-emerald-100 dark:bg-emerald-900/30"
                    )}>
                      <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{t('list.fields.budget')}</p>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {campaign.budget ? formatCurrency(campaign.budget) : t('list.fields.notSet')}
                      </p>
                    </div>
                  </div>

                  {/* Campaign Type */}
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      "bg-blue-100 dark:bg-blue-900/30"
                    )}>
                      <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{t('list.fields.type')}</p>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {campaign.campaign_type || t('list.fields.notSet')}
                      </p>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      "bg-amber-100 dark:bg-amber-900/30"
                    )}>
                      <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{t('list.fields.duration')}</p>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        {campaign.start_date && campaign.end_date ? (
                          <>
                            {format(new Date(campaign.start_date), 'MMM dd')} - {format(new Date(campaign.end_date), 'MMM dd')}
                          </>
                        ) : (
                          t('list.fields.notScheduled')
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                {campaign.description && (
                  <div className="mt-2">
                    <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                      {campaign.description}
                    </p>
                  </div>
                )}

                <div className="flex justify-end mt-4">
                  <ChevronRight className={cn(
                    "h-5 w-5 transition-all duration-300",
                    "text-slate-300 dark:text-slate-600",
                    "group-hover:text-amber-500 group-hover:translate-x-1"
                  )} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ✅ Unified Confirmation Dialogs */}
      <ConfirmDialog {...deleteDialogProps} />
      <ConfirmDialog {...archiveDialogProps} />
    </div>
  )
}
