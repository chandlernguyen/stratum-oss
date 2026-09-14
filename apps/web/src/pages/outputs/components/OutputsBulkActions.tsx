import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Download, Archive } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface OutputsBulkActionsProps {
  bulkActionMode: boolean
  selectedItemsCount: number
  filteredOutputsCount: number
  onSelectAll: () => void
  onBulkExport: () => void
  onBulkArchive: () => void
}

export function OutputsBulkActions({
  bulkActionMode,
  selectedItemsCount,
  filteredOutputsCount,
  onSelectAll,
  onBulkExport,
  onBulkArchive,
}: OutputsBulkActionsProps) {
  const { t } = useTranslation('outputs')

  if (!bulkActionMode || selectedItemsCount === 0) {
    return null
  }

  return (
    <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Checkbox
          checked={selectedItemsCount === filteredOutputsCount && filteredOutputsCount > 0}
          onCheckedChange={onSelectAll}
        />
        <span className="text-sm font-medium">
          {t('bulk.itemsSelected', { count: selectedItemsCount })}
        </span>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onBulkExport}
        >
          <Download className="w-4 h-4 mr-2" />
          {t('bulk.exportSelected')}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onBulkArchive}
          className="text-red-600 hover:text-red-700"
        >
          <Archive className="w-4 h-4 mr-2" />
          {t('bulk.archiveSelected')}
        </Button>
      </div>
    </div>
  )
}
