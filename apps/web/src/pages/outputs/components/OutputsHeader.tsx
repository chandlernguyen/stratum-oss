import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Layers,
  CheckSquare,
  Download,
  Library
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

interface OutputsHeaderProps {
  filteredOutputsCount: number
  groupingEnabled: boolean
  groupingStats: { duplicatesFound: number }
  filterType: string
  bulkActionMode: boolean
  onToggleGrouping: () => void
  onToggleBulkMode: () => void
  onExportAll: () => void
}

export function OutputsHeader({
  filteredOutputsCount,
  groupingEnabled,
  groupingStats,
  filterType,
  bulkActionMode,
  onToggleGrouping,
  onToggleBulkMode,
  onExportAll,
}: OutputsHeaderProps) {
  const { t } = useTranslation('outputs')

  return (
    <div className="relative mb-8">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -mx-3 md:-mx-4 -mt-4 md:-mt-8 rounded-b-3xl">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-20 w-48 h-48 bg-slate-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative">
        {/* Mobile: Stacked | Desktop: Horizontal */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            {/* Premium badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/10 to-amber-600/10 border border-amber-500/20 mb-4">
              <Library className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-xs font-medium text-amber-700 dark:text-amber-400">{t('header.badge')}</span>
            </div>

            {/* Serif heading */}
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              {t('header.title')}
            </h1>
            <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 max-w-md">
              {t('header.subtitle')}
            </p>
          </div>

          {/* Buttons: 2-column grid mobile | Horizontal desktop */}
          <div className="grid grid-cols-2 md:flex gap-2">
            {/* Show group button on all tabs when there are multiple items */}
            {filteredOutputsCount > 1 && (
              <Button
                variant="outline"
                onClick={onToggleGrouping}
                className={cn(
                  "min-h-12 md:min-h-10 transition-all duration-200",
                  "border-slate-200 dark:border-slate-700",
                  "hover:border-amber-400/50 dark:hover:border-amber-500/50",
                  "hover:shadow-md hover:shadow-amber-500/10",
                  groupingEnabled && "bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700"
                )}
              >
                <Layers className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="hidden sm:inline">{t('grouping.enable')}</span>
                <span className="sm:hidden">{t('header.groupShort')}</span>
                {groupingEnabled && groupingStats.duplicatesFound > 0 && (
                  <Badge variant="secondary" className="ml-2 hidden md:inline-flex bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    {groupingStats.duplicatesFound}
                  </Badge>
                )}
              </Button>
            )}

            <Button
              variant="outline"
              onClick={onToggleBulkMode}
              className={cn(
                "min-h-12 md:min-h-10 transition-all duration-200",
                "border-slate-200 dark:border-slate-700",
                "hover:border-amber-400/50 dark:hover:border-amber-500/50",
                "hover:shadow-md hover:shadow-amber-500/10",
                bulkActionMode && "bg-slate-100 dark:bg-slate-800"
              )}
            >
              <CheckSquare className="w-4 h-4 mr-2 flex-shrink-0" />
              {bulkActionMode ? t('header.cancel') : t('header.select')}
            </Button>

            <Button
              variant="outline"
              onClick={onExportAll}
              disabled={filteredOutputsCount === 0}
              className={cn(
                "min-h-12 md:min-h-10 transition-all duration-200",
                "border-slate-200 dark:border-slate-700",
                "hover:border-amber-400/50 dark:hover:border-amber-500/50",
                "hover:shadow-md hover:shadow-amber-500/10",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <Download className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="hidden sm:inline">{filterType === 'all' ? t('header.exportAll') : t('header.exportFiltered')}</span>
              <span className="sm:hidden">{t('header.exportShort')}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
