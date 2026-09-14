import React, { useState, useEffect } from 'react'
import { useSearchParams, useParams, useNavigate } from 'react-router-dom'
import { useLocale } from '@/hooks/useLocale'
import { getIntlLocale } from '@/lib/locales'
import { ViewOutputDialog } from '@/components/ViewOutputDialog'
import { API_BASE_URL } from '@/lib/api'
import { authFetch } from '@/lib/authService'
import { useDeleteConfirmation, useArchiveConfirmation } from '@/hooks/useConfirmDialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useOutputsHub, useUpdateOutput } from '@/hooks/data/useAgentOutputs'
import { useUnifiedOutputActions } from '@/hooks/data/useUnifiedOutputActions'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { SavedOutput } from '@/types/agents'
import { useGroupSimilarItems } from '@/hooks/useGroupSimilarItems'
import { useUserIdentity } from '@/hooks/data/useUserIdentity'
import { useUserContextEnhanced } from '@/hooks/data/useUserContextEnhanced'
import { useClientContext } from '@/contexts/ClientContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import { FileText, Target, Sparkles, TrendingUp, Archive } from 'lucide-react'

// Extracted components
import { OutputsHeader } from './outputs/components/OutputsHeader'
import { OutputsFilter } from './outputs/components/OutputsFilter'
import { OutputsBulkActions } from './outputs/components/OutputsBulkActions'
import { OutputsList } from './outputs/components/OutputsList'

export function OutputsPage() {
  const { t, locale } = useLocale('outputs');

  // Set page title for GA4 tracking and accessibility
  usePageTitle(t('title'));

  // URL params for output detail view
  const { outputId } = useParams<{ outputId?: string }>()
  const navigate = useNavigate()

  // URL search params for filtering
  const [searchParams] = useSearchParams()
  const { clientSlug: clientSlugBranded, clientId } = useClientContext()
  const clientSlug = clientSlugBranded || undefined

  const [selectedOutput, setSelectedOutput] = useState<SavedOutput | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [filterType, setFilterType] = useState<'all' | 'strategic' | 'customer' | 'content' | 'performance' | 'archived'>('all')
  const [activeStrategyId, setActiveStrategyId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [bulkActionMode, setBulkActionMode] = useState(false)
  const [groupingEnabled, setGroupingEnabled] = useState(true)

  // Simplified sort state (only date and title)
  const [sortBy, setSortBy] = useState<'date' | 'title'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Use direct database access for outputs hub data
  // Pass clientSlug for agency multi-tenant filtering (Migration 201)
  const { data: outputsHubData, isLoading, error, refetch } = useOutputsHub({
    clientSlug,
    includeArchived: filterType === 'archived'  // Fetch archived outputs when viewing Archived tab
  })

  // Separate query for archived count (always fetch to show badge)
  const { data: archivedHubData } = useOutputsHub({
    clientSlug,
    includeArchived: true
  })

  // Initialize filters from URL parameters
  useEffect(() => {
    const agentParam = searchParams.get('agent')
    const userParam = searchParams.get('user')

    if (agentParam) {
      // Map specific agent types to category filters
      const agentToCategoryMap = {
        'marketing_strategy': 'strategic',
        'persona': 'customer',
        'content': 'content',
        'analytics': 'performance'
      }

      const category = agentToCategoryMap[agentParam as keyof typeof agentToCategoryMap]
      if (category) {
        setFilterType(category as typeof filterType)
      }
    }

    // Handle user-specific filtering (for "current user" content)
    if (userParam === 'current') {
      // This will be handled in the filtering logic
    }
  }, [searchParams])

  // Hook for updating outputs
  const updateOutputMutation = useUpdateOutput()

  // Get current user for filtering
  const { data: identity } = useUserIdentity()
  const user = identity?.user

  // Get user context with permissions for Phase 2 output protection
  const { data: userContext } = useUserContextEnhanced()
  const permissions = userContext?.permissions || []

  // Permission checks for output actions
  const canDeleteOutput = React.useCallback((_output: any) => {
    // Only users with outputs.delete permission can delete
    return permissions.includes('outputs.delete')
  }, [permissions])

  const canArchiveOutput = React.useCallback((output: any) => {
    // Check if output is approved - need edit_approved permission
    if (output.approval_status === 'approved') {
      return permissions.includes('outputs.approved.edit')
    }
    // Check if user is the creator - need edit_own permission
    if (output.created_by === user?.id || output.user_id === user?.id) {
      return permissions.includes('outputs.own.edit')
    }
    // Otherwise need edit_others permission
    return permissions.includes('outputs.others.edit')
  }, [permissions, user?.id])

  // Helper function to format unified output content
  const formatOutputContent = React.useCallback((output: any) => {
    // Use the content field directly if it's already formatted
    if (typeof output.content === 'string') {
      return output.content
    }

    // Otherwise, format it as JSON for now
    return JSON.stringify(output.content, null, 2)
  }, [])

  // Helper function to format output for plain text export
  const formatForTextExport = React.useCallback((item: SavedOutput) => {
    const headerLine = '='.repeat(70);
    const contentText = typeof item.content === 'string' ? item.content : JSON.stringify(item.content, null, 2);

    return `${item.title}
${headerLine}

Agent: ${item.agent_type.replace(/_/g, ' ')}
Generated: ${new Date(item.created_at).toLocaleDateString(getIntlLocale(locale), {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}

${headerLine}

${contentText}

${headerLine}
Generated with STRAŦUM - Marketing Intelligence Platform`;
  }, [locale])

  // Convert outputs hub data to SavedOutput format
  const outputs = React.useMemo(() => {
    if (!outputsHubData) {
      return []
    }

    const formattedOutputs: SavedOutput[] = []

    // Convert agent outputs to SavedOutput format
    if ('agent_outputs' in outputsHubData && outputsHubData.agent_outputs) {
      outputsHubData.agent_outputs.forEach((output: any) => {
        formattedOutputs.push({
          id: output.id,
          title: output.title,
          content: formatOutputContent(output),
          agent_type: output.agent_type,
          created_at: output.created_at || new Date().toISOString(),
          session_id: output.session_id || output.id,
          tags: [],
          // Phase 2: Include ownership and approval fields for permission checks
          user_id: output.user_id,
          created_by: output.created_by,
          approval_status: output.approval_status,
          metadata: {
            ...output.metadata,
            framework_type: output.output_type,
            source_table: 'agent_outputs',
            archived_at: output.archived_at
          }
        })
      })
    }


    // Sort all outputs by creation date (newest first)
    const sortedOutputs = formattedOutputs.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    return sortedOutputs
  }, [outputsHubData, formatOutputContent])

  // Auto-open dialog when outputId is in URL
  useEffect(() => {
    if (outputId && outputs.length > 0) {
      const output = outputs.find(o => o.id === outputId)
      if (output) {
        setSelectedOutput(output)
        setDialogOpen(true)
      }
    }
  }, [outputId, outputs])

  // ✅ FIXED: Use unified operations for all table sources (personas, strategies, agent outputs)
  const unifiedActions = useUnifiedOutputActions();

  // ✅ NEW: Use unified confirmation hooks (promise-based, no dialog state needed)
  const { confirmDelete, dialogProps: deleteDialogProps } = useDeleteConfirmation();
  const { confirmArchive, dialogProps: archiveDialogProps } = useArchiveConfirmation();

  // Handle success callbacks
  const handleSuccess = (action: string, id: string) => {
    refetch(); // Refresh the outputs using React Query

    // If archived/deleted strategy was active, clear active status
    if ((action === 'archive' || action === 'delete') && activeStrategyId === id) {
      setActiveStrategyId(null);
    }
  };

  // ✅ NEW: Simplified archive handler using promise-based confirmation
  const openArchiveDialog = async (item: SavedOutput) => {
    const result = await confirmArchive({
      resourceName: item.title,
      resourceType: 'Output'
    });

    if (result.confirmed && result.reason) {
      try {
        await unifiedActions.archive.mutateAsync({
          item,
          reason: result.reason
        });
        handleSuccess('archive', item.id);
      } catch (error) {
        console.error('Archive failed:', error);
      }
    }
  };

  // ✅ NEW: Simplified delete handler using promise-based confirmation
  const openDeleteConfirm = async (item: SavedOutput) => {
    const confirmed = await confirmDelete({
      title: `Delete ${item.title}?`,
      description: item.metadata?.archived_at
        ? 'This will permanently delete this archived output.'
        : 'This output will be archived first. You can restore it later from the Archived tab.',
      confirmText: 'Delete Output'
    });

    if (confirmed) {
      try {
        await unifiedActions.delete.mutateAsync({ item });
        handleSuccess('delete', item.id);
      } catch (error) {
        console.error('Delete failed:', error);
      }
    }
  };

  const handleRestore = async (item: SavedOutput) => {
    try {
      // ✅ Use unified operations - automatically routes to correct table
      await unifiedActions.restore.mutateAsync({ item });
      handleSuccess('restore', item.id);
    } catch (error) {
      console.error('Restore failed:', error);
    }
  };

  // Create resourceActions object matching legacy interface (simplified)
  const resourceActions = {
    openArchiveDialog,
    openDeleteConfirm,
    restore: handleRestore,
  };

  const handleOpenOutput = (output: SavedOutput) => {
    setSelectedOutput(output)
    setDialogOpen(true)
  }

  const handleSaveOutput = async (updatedOutput: SavedOutput) => {
    try {
      console.log('Saving output:', updatedOutput.id, updatedOutput.title);

      // Convert SavedOutput to AgentOutput format for the database
      // Key difference: SavedOutput.content is string, AgentOutput.content is Record<string, any>
      let parsedContent: Record<string, any>;

      try {
        // Parse the content string back to object
        parsedContent = typeof updatedOutput.content === 'string'
          ? JSON.parse(updatedOutput.content)
          : updatedOutput.content;
      } catch (error) {
        console.error('Failed to parse content as JSON, using as-is:', error);
        // If parsing fails, wrap the string content in a generic structure
        parsedContent = { raw_content: updatedOutput.content };
      }

      // Prepare the update data with only the fields that can be updated
      const updateData = {
        title: updatedOutput.title,
        content: parsedContent,
        metadata: updatedOutput.metadata || {}
      };

      console.log('Update data:', updateData);

      // Check if this item supports unified operations
      const tableSource = updatedOutput.metadata?.table_source;
      if (tableSource) {
        // Use the unified update action for multi-table support
        await unifiedActions.update.mutateAsync({
          item: updatedOutput,
          data: updateData
        });
      } else {
        // Fallback to old update method for agent_outputs only
        await updateOutputMutation.mutateAsync({
          id: updatedOutput.id,
          data: updateData
        });
      }

      // Force immediate refetch as additional safety measure
      setTimeout(() => {
        console.log('Force refetching outputs after save');
        refetch();
      }, 100);

      console.log('Output saved successfully');
    } catch (error) {
      console.error('Error saving output:', error);
      throw error; // Re-throw to let the dialog handle the error
    }
  }

  // Smart categorization mapping
  const AGENT_CATEGORIES = {
    'strategic': ['strategy', 'competitive', 'roi_budget', 'marketing_strategy'],
    'customer': ['persona', 'client_success'],
    'content': ['content', 'campaign'],
    'performance': ['analytics', 'quick_wins']
  }

  // Simplified filter function (removed structured data complexity)
  const getFilteredOutputs = () => {
    let filtered = outputs

    // Get URL parameters for additional filtering
    const agentParam = searchParams.get('agent')
    const userParam = searchParams.get('user')

    // For archived tab, show only archived items
    if (filterType === 'archived') {
      filtered = filtered.filter(o => o.metadata?.archived_at || (o as any).archived_at || (o as any).is_archived)
    } else {
      // For non-archived tabs, exclude archived items
      filtered = filtered.filter(o => !o.metadata?.archived_at && !(o as any).archived_at && !(o as any).is_archived)
    }

    // Apply specific agent type filter from URL (takes precedence over category filter)
    if (agentParam) {
      filtered = filtered.filter(o => o.agent_type === agentParam)
    } else if (filterType !== 'all' && filterType !== 'archived') {
      // Apply smart category filter only if no specific agent is requested (and not archived)
      const agentsInCategory = AGENT_CATEGORIES[filterType as keyof typeof AGENT_CATEGORIES] || []
      filtered = filtered.filter(o =>
        agentsInCategory.includes(o.agent_type) ||
        // Also check metadata for source_table or framework_type
        agentsInCategory.includes(o.metadata?.source_table?.replace('_outputs', '')) ||
        agentsInCategory.includes(o.metadata?.framework_type)
      )
    }

    // Apply user filter (for current user's content only)
    if (userParam === 'current' && user?.id) {
      filtered = filtered.filter(o => {
        // Check if user_id exists in metadata or as a property
        return o.metadata?.user_id === user.id ||
               (o as any).user_id === user.id
      })
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(o =>
        o.title.toLowerCase().includes(query) ||
        o.content.toLowerCase().includes(query) ||
        (o.metadata?.strategy_type && o.metadata.strategy_type.toLowerCase().includes(query))
      )
    }

    // Apply sorting (simplified: only date and title)
    filtered.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'date':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
        case 'title':
          comparison = a.title.localeCompare(b.title)
          break
        default:
          comparison = 0
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }

  // Handle item selection for bulk operations
  const handleItemSelect = (id: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedItems(newSelected)
  }

  // Select all visible items
  const handleSelectAll = () => {
    const filtered = getFilteredOutputs()
    if (selectedItems.size === filtered.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(filtered.map(o => o.id)))
    }
  }

  // Bulk archive operation
  const handleBulkArchive = async () => {
    // TODO: Implement bulk archive API call
    const _itemsToArchive = Array.from(selectedItems) // TODO: Implement bulk archive
    console.log('Bulk archive not yet implemented:', _itemsToArchive.length, 'items');

    // For now, just refresh data and clear selection
    refetch()
    setSelectedItems(new Set())
    setBulkActionMode(false)
  }

  // Bulk export operation
  const handleBulkExport = () => {
    const itemsToExport = outputs.filter(o => selectedItems.has(o.id))
    const json = JSON.stringify(itemsToExport, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `selected-outputs-${Date.now()}.json`
    a.click()
  }

  // Mark a strategy as active
  const markStrategyAsActive = async (strategyId: string) => {
    try {
      const response = await authFetch(`${API_BASE_URL}/api/v1/marketing-strategies/${strategyId}/activate`, {
        method: 'POST'
      })
      
      if (response.ok) {
        // Update local state
        setActiveStrategyId(strategyId)
        // Refetch data to get updated status
        refetch()
      } else {
        console.error('Failed to activate strategy')
      }
    } catch (error) {
      console.error('Error activating strategy:', error)
    }
  }



  const exportAll = () => {
    const filtered = getFilteredOutputs()

    // Format all outputs as plain text with separators
    const textContent = filtered.map(output => formatForTextExport(output)).join('\n\n\n')

    const blob = new Blob([textContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `outputs-${filterType}-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Get counts for each smart category
  const getCounts = () => {
    // For archived tab, count archived items from the full data
    const archivedOutputs = archivedHubData?.agent_outputs || []
    const archivedCount = archivedOutputs.filter((o: any) => o.archived_at || o.is_archived).length
    const activeCount = archivedOutputs.filter((o: any) => !o.archived_at && !o.is_archived).length

    const counts: Record<string, number> = {
      all: filterType === 'archived' ? outputs.length : activeCount,
      strategic: 0,
      customer: 0,
      content: 0,
      performance: 0,
      archived: archivedCount
    }

    // Count active outputs by category (exclude archived from category counts)
    const activeOutputs = filterType === 'archived' ? [] : outputs
    activeOutputs.forEach(output => {
      Object.entries(AGENT_CATEGORIES).forEach(([category, agents]) => {
        if (
          agents.includes(output.agent_type) ||
          agents.includes(output.metadata?.source_table?.replace('_outputs', '')) ||
          agents.includes(output.metadata?.framework_type)
        ) {
          counts[category]++
        }
      })
    })

    return counts
  }


  const counts = getCounts()
  const filteredOutputs = getFilteredOutputs()

  // Group similar items across all tabs with type-specific strategies
  const {
    grouped: groupedOutputs,
    toggleGroup,
    stats: groupingStats
  } = useGroupSimilarItems(
    filteredOutputs,
    {
      getGroupKey: (item) => {
        // Type-specific grouping strategies
        switch (item.agent_type) {
          case 'marketing_strategy':
            // Group by title and content similarity
            const titleKey = item.title.substring(0, 50).toLowerCase().trim();
            const contentKey = item.content.substring(0, 100).toLowerCase().trim();
            return `ms_${titleKey}|${contentKey}`;

          case 'content':
            // Group content by title and type (if available in metadata)
            const contentTitle = item.title.substring(0, 40).toLowerCase().trim();
            const contentType = item.metadata?.content_type || 'general';
            return `content_${contentTitle}|${contentType}`;

          case 'analytics':
            // Group analytics by report type and date range
            const analyticsTitle = item.title.substring(0, 40).toLowerCase().trim();
            const reportType = item.metadata?.report_type || 'general';
            return `analytics_${analyticsTitle}|${reportType}`;

          case 'persona':
            // Group personas by demographics and psychographics
            const personaName = item.title.substring(0, 30).toLowerCase().trim();
            const demographics = item.metadata?.demographics || '';
            return `persona_${personaName}|${demographics}`;

          case 'strategy':
            // Group business strategies by framework type
            const strategyTitle = item.title.substring(0, 40).toLowerCase().trim();
            const framework = item.metadata?.framework_type || 'general';
            return `strategy_${strategyTitle}|${framework}`;

          default:
            // For other types, group by exact title match
            return `other_${item.title.toLowerCase().trim()}`;
        }
      }
    },
    {
      enabled: groupingEnabled // Enable for all tabs now
    }
  );

  return (
    <div className="container mx-auto px-3 md:px-4 py-4 md:py-8 max-w-7xl">
      <OutputsHeader
        filteredOutputsCount={filteredOutputs.length}
        groupingEnabled={groupingEnabled}
        groupingStats={groupingStats}
        filterType={filterType}
        bulkActionMode={bulkActionMode}
        onToggleGrouping={() => setGroupingEnabled(!groupingEnabled)}
        onToggleBulkMode={() => setBulkActionMode(!bulkActionMode)}
        onExportAll={exportAll}
      />

      <OutputsFilter
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        sortBy={sortBy}
        setSortBy={setSortBy}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
      />

      <OutputsBulkActions
        bulkActionMode={bulkActionMode}
        selectedItemsCount={selectedItems.size}
        filteredOutputsCount={filteredOutputs.length}
        onSelectAll={handleSelectAll}
        onBulkExport={handleBulkExport}
        onBulkArchive={handleBulkArchive}
      />

      {/* Filter - Mobile: Dropdown | Desktop: Tabs */}
      <div className="mb-6">
        {/* Mobile: Filter Dropdown (MOBILE FIRST) */}
        <div className="md:hidden">
          <label htmlFor="output-filter-mobile" className="block text-sm font-medium text-muted-foreground mb-2">
            {t('filters.byCategory')}
          </label>
          <select
            id="output-filter-mobile"
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value as any)
              const outputsPath = clientSlug ? `/clients/${clientSlug}/outputs` : '/outputs'
              navigate(outputsPath, { replace: true })
            }}
            className="w-full min-h-12 px-4 py-3 bg-background border border-input rounded-md text-base font-medium focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <option value="all">📄 {t('filters.all')} ({counts.all})</option>
            <option value="strategic">🎯 {t('filters.strategic')} ({counts.strategic})</option>
            <option value="customer">👥 {t('filters.customer')} ({counts.customer})</option>
            <option value="content">📝 {t('filters.content')} ({counts.content})</option>
            <option value="performance">⚡ {t('filters.performance')} ({counts.performance})</option>
            {counts.archived > 0 && (
              <option value="archived">📦 {t('filters.archived')} ({counts.archived})</option>
            )}
          </select>
        </div>

        {/* Desktop: Tabs (DESKTOP ENHANCEMENT) */}
        <Tabs value={filterType} onValueChange={(value: any) => {
          setFilterType(value)
          const outputsPath = clientSlug ? `/clients/${clientSlug}/outputs` : '/outputs'
          navigate(outputsPath, { replace: true })
        }} className="hidden md:block">
          <TabsList className="inline-flex w-full">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {t('filters.all')}
              {counts.all > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {counts.all}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="strategic" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              {t('filters.strategic')}
              {counts.strategic > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {counts.strategic}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="customer" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {t('filters.customer')}
              {counts.customer > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {counts.customer}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              {t('filters.content')}
              {counts.content > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {counts.content}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              {t('filters.performance')}
              {counts.performance > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {counts.performance}
                </Badge>
              )}
            </TabsTrigger>
            {counts.archived > 0 && (
              <TabsTrigger value="archived" className="flex items-center gap-2 text-muted-foreground">
                <Archive className="w-4 h-4" />
                {t('filters.archived')}
                <Badge variant="outline" className="ml-1 h-5 px-1.5">
                  {counts.archived}
                </Badge>
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>
      </div>

      <OutputsList
        isLoading={isLoading}
        error={error}
        filteredOutputsCount={filteredOutputs.length}
        filterType={filterType}
        groupedOutputs={groupedOutputs}
        groupingEnabled={groupingEnabled}
        bulkActionMode={bulkActionMode}
        selectedItems={selectedItems}
        activeStrategyId={activeStrategyId}
        currentUserId={user?.id}
        onRefetch={refetch}
        onToggleGroup={toggleGroup}
        onItemSelect={handleItemSelect}
        onOpenOutput={handleOpenOutput}
        onMarkStrategyAsActive={markStrategyAsActive}
        resourceActions={resourceActions}
        formatForTextExport={formatForTextExport}
        canArchiveOutput={canArchiveOutput}
        canDeleteOutput={canDeleteOutput}
      />
      
      <ViewOutputDialog
        output={selectedOutput}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSaveOutput}
        allowEdit={true}
        clientId={clientId ?? undefined}
      />

      {/* ✅ Unified Confirmation Dialogs */}
      <ConfirmDialog {...deleteDialogProps} />
      <ConfirmDialog {...archiveDialogProps} />
    </div>
  )
}
