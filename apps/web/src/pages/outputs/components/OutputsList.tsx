import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { UnifiedOutputCard } from '@/components/outputs/UnifiedOutputCard'
import { FileText, ChevronDown, ChevronRight, Layers, Sparkles, AlertCircle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SavedOutput } from '@/types/agents'
import { useTranslation } from 'react-i18next'

interface GroupedOutput {
  groupKey: string
  primary: any
  items: any[]
  count: number
  isExpanded?: boolean
}

interface OutputsListProps {
  isLoading: boolean
  error: Error | null
  filteredOutputsCount: number
  filterType: string
  groupedOutputs: GroupedOutput[]
  groupingEnabled: boolean
  bulkActionMode: boolean
  selectedItems: Set<string>
  activeStrategyId: string | null
  currentUserId?: string
  onRefetch: () => void
  onToggleGroup: (groupKey: string) => void
  onItemSelect: (id: string) => void
  onOpenOutput: (output: any) => void
  onMarkStrategyAsActive: (id: string) => void
  resourceActions: {
    openArchiveDialog: (item: any) => void
    restore: (item: any) => void
    openDeleteConfirm: (item: any) => void
  }
  formatForTextExport: (item: SavedOutput) => string
  // Permission callbacks for Phase 2 output protection
  canArchiveOutput?: (output: any) => boolean
  canDeleteOutput?: (output: any) => boolean
}

export function OutputsList({
  isLoading,
  error,
  filteredOutputsCount,
  filterType,
  groupedOutputs,
  groupingEnabled,
  bulkActionMode,
  selectedItems,
  activeStrategyId,
  currentUserId: _currentUserId,
  onRefetch,
  onToggleGroup,
  onItemSelect,
  onOpenOutput,
  onMarkStrategyAsActive,
  resourceActions,
  formatForTextExport,
  canArchiveOutput,
  canDeleteOutput,
}: OutputsListProps) {
  const { t } = useTranslation('outputs')

  // Loading state - Premium skeleton
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className={cn(
            "overflow-hidden",
            "border-slate-200/80 dark:border-slate-700/80",
            "animate-pulse"
          )}>
            <CardContent className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded" />
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-5/6" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // Error state - Premium styling
  if (error) {
    return (
      <Card className={cn(
        "overflow-hidden",
        "border-red-200/80 dark:border-red-800/50",
        "bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-800/10"
      )}>
        <CardContent className="text-center py-12">
          <div className={cn(
            "inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6",
            "bg-gradient-to-br from-red-500 to-red-600",
            "shadow-lg shadow-red-500/20"
          )}>
            <AlertCircle className="w-8 h-8 text-white" />
          </div>
          <h3 className="font-serif text-xl font-semibold mb-2 text-red-700 dark:text-red-300">
            {t('list.errorTitle')}
          </h3>
          <p className="text-red-600/80 dark:text-red-400/80 mb-6 max-w-md mx-auto">
            {t('list.errorDescription')}
          </p>
          <Button
            onClick={onRefetch}
            variant="outline"
            className={cn(
              "border-red-300 dark:border-red-700",
              "text-red-700 dark:text-red-300",
              "hover:bg-red-100 dark:hover:bg-red-900/50"
            )}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('list.retry')}
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Empty state - Premium styling
  if (filteredOutputsCount === 0) {
    return (
      <Card className={cn(
        "relative overflow-hidden",
        "border-slate-200/80 dark:border-slate-700/80",
        "shadow-xl shadow-slate-900/5 dark:shadow-black/20"
      )}>
        {/* Grain texture */}
        <div className="absolute inset-0 opacity-[0.015] pointer-events-none">
          <div className="w-full h-full" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }} />
        </div>

        <CardContent className="relative text-center py-16">
          <div className={cn(
            "inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6",
            "bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800",
            "shadow-lg shadow-slate-900/10 dark:shadow-black/20"
          )}>
            <FileText className="w-10 h-10 text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="font-serif text-2xl font-semibold mb-3 text-slate-900 dark:text-slate-100">
            {filterType === 'all'
              ? t('list.emptyTitle')
              : t('list.emptyTitleFiltered', { filterType: filterType.replace('_', ' ') })}
          </h3>
          <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            {filterType === 'all'
              ? t('list.emptyDescription')
              : t('list.emptyDescriptionFiltered', { filterType: filterType.replace('_', ' ') })}
          </p>
          {filterType === 'all' && (
            <div className="mt-8 flex items-center justify-center gap-2 text-sm text-amber-600 dark:text-amber-400">
              <Sparkles className="w-4 h-4" />
              <span>{t('list.emptyHint')}</span>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  // Output grid
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {groupedOutputs.map((group) => {
        // Check if this is actually a grouped item (multiple similar items)
        const isGrouped = group.count > 1 && groupingEnabled;

        // For groups with multiple items, show the primary with a count badge
        if (isGrouped) {
          return (
            <div key={group.groupKey} className="relative">
              {/* Group header with expand/collapse - Premium styling */}
              <div className="mb-3 flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleGroup(group.groupKey)}
                  className={cn(
                    "h-7 px-2 transition-all duration-200",
                    "hover:bg-amber-50 dark:hover:bg-amber-900/30"
                  )}
                >
                  {group.isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  )}
                </Button>
                <Badge
                  variant="secondary"
                  className={cn(
                    "px-3 py-1",
                    "bg-amber-50 dark:bg-amber-900/20",
                    "text-amber-700 dark:text-amber-400",
                    "border border-amber-200/50 dark:border-amber-700/50"
                  )}
                >
                  <Layers className="w-3 h-3 mr-1.5" />
                  {group.primary.agent_type === 'marketing_strategy'
                    ? t('list.similarStrategies', { count: group.count })
                    : t('list.similarItems', { count: group.count })}
                </Badge>
              </div>

              {/* Show primary item */}
              <div className="relative">
                {bulkActionMode && (
                  <div className="absolute top-3 left-3 z-10">
                    <Checkbox
                      checked={selectedItems.has(group.primary.id)}
                      onCheckedChange={() => onItemSelect(group.primary.id)}
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      className="border-slate-300 dark:border-slate-600"
                    />
                  </div>
                )}
                <UnifiedOutputCard
                  output={group.primary}
                  isActive={group.primary.id === activeStrategyId}
                  isArchived={!!group.primary.metadata?.archived_at}
                  isSelected={selectedItems.has(group.primary.id)}
                  showCheckbox={false}
                  onView={onOpenOutput}
                  onActivate={group.primary.agent_type === 'marketing_strategy' ? () => onMarkStrategyAsActive(group.primary.id) : undefined}
                  onArchive={canArchiveOutput?.(group.primary) !== false ? resourceActions.openArchiveDialog : undefined}
                  onRestore={resourceActions.restore}
                  onDelete={canDeleteOutput?.(group.primary) !== false ? resourceActions.openDeleteConfirm : undefined}
                  onCopy={(item) => navigator.clipboard.writeText(
                    typeof item.content === 'string' ? item.content : JSON.stringify(item.content)
                  )}
                  onExport={(item) => {
                    const textContent = formatForTextExport(item)
                    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `${item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'output'}-${Date.now()}.txt`
                    a.click()
                  }}
                />
              </div>

              {/* Show other items in group if expanded */}
              {group.isExpanded && (
                <div className="mt-3 ml-8 space-y-3 border-l-2 border-amber-200/50 dark:border-amber-700/30 pl-4">
                  {group.items.slice(1).map((output) => (
                    <div key={output.id} className="relative opacity-80 hover:opacity-100 transition-opacity">
                      {bulkActionMode && (
                        <div className="absolute top-3 left-3 z-10">
                          <Checkbox
                            checked={selectedItems.has(output.id)}
                            onCheckedChange={() => onItemSelect(output.id)}
                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                            className="border-slate-300 dark:border-slate-600"
                          />
                        </div>
                      )}
                      <UnifiedOutputCard
                        output={output}
                        isActive={output.id === activeStrategyId}
                        isArchived={!!output.metadata?.archived_at}
                        isSelected={selectedItems.has(output.id)}
                        showCheckbox={false}
                        onView={onOpenOutput}
                        onActivate={output.agent_type === 'marketing_strategy' ? () => onMarkStrategyAsActive(output.id) : undefined}
                        onArchive={canArchiveOutput?.(output) !== false ? resourceActions.openArchiveDialog : undefined}
                        onRestore={resourceActions.restore}
                        onDelete={canDeleteOutput?.(output) !== false ? resourceActions.openDeleteConfirm : undefined}
                        onCopy={(item) => navigator.clipboard.writeText(
                          typeof item.content === 'string' ? item.content : JSON.stringify(item.content)
                        )}
                        onExport={(item) => {
                          const textContent = formatForTextExport(item)
                          const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' })
                          const url = URL.createObjectURL(blob)
                          const a = document.createElement('a')
                          a.href = url
                          a.download = `${item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'output'}-${Date.now()}.txt`
                          a.click()
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        }

        // Single item - Use UnifiedOutputCard for all types
        const output = group.primary;

        return (
          <UnifiedOutputCard
            key={output.id}
            output={output}
            isActive={output.id === activeStrategyId}
            isArchived={!!output.metadata?.archived_at}
            isSelected={selectedItems.has(output.id)}
            showCheckbox={bulkActionMode}
            onView={onOpenOutput}
            onActivate={output.agent_type === 'marketing_strategy' ? () => onMarkStrategyAsActive(output.id) : undefined}
            onArchive={canArchiveOutput?.(output) !== false ? resourceActions.openArchiveDialog : undefined}
            onRestore={resourceActions.restore}
            onDelete={canDeleteOutput?.(output) !== false ? resourceActions.openDeleteConfirm : undefined}
            onCopy={(item) => navigator.clipboard.writeText(
              typeof item.content === 'string' ? item.content : JSON.stringify(item.content)
            )}
            onExport={(item) => {
              const textContent = formatForTextExport(item)
              const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `${item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'output'}-${Date.now()}.txt`
              a.click()
            }}
            onSelect={() => onItemSelect(output.id)}
          />
        )
      })}
    </div>
  )
}
