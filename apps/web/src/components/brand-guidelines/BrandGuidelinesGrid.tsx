import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Sparkles, Archive, Eye, Plus, AlertTriangle, Layers } from 'lucide-react';
import { BrandGuidelineCard } from './BrandGuidelineCard';
import type { BrandGuideline } from './hooks/useBrandGuidelines';

interface GroupedGuideline {
  groupKey: string;
  count: number;
  primary: BrandGuideline;
  items: BrandGuideline[];
}

interface GroupingStats {
  totalItems: number;
  totalGroups: number;
  duplicatesFound: number;
}

interface MultipleActiveAlert {
  type: 'duplicate_active' | 'multiple_active';
  count: number;
  message: string;
  recommendation: string;
  duplicateCount?: number;
}

interface BrandGuidelinesGridProps {
  groupedGuidelines: GroupedGuideline[];
  groupingStats: GroupingStats;
  multipleActiveAlert: MultipleActiveAlert | null;
  showArchived: boolean;
  onView: (guideline: BrandGuideline) => void;
  onEdit: (guideline: BrandGuideline) => void;
  onArchive: (guideline: BrandGuideline) => void;
  onRestore: (guideline: BrandGuideline) => void;
  onDelete: (guideline: BrandGuideline) => void;
  onCopy: (guideline: BrandGuideline) => void;
  onToggleArchived: (show: boolean) => void;
  onCreateNew: () => void;
}

export function BrandGuidelinesGrid({
  groupedGuidelines,
  groupingStats,
  multipleActiveAlert,
  showArchived,
  onView,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
  onCopy,
  onToggleArchived,
  onCreateNew
}: BrandGuidelinesGridProps) {
  const { t } = useTranslation('brand');

  if (groupedGuidelines.length === 0) {
    return (
      <Card className="border-2 border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          {showArchived ? (
            <>
              <Archive className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {t('guidelines.emptyStates.noArchived.title')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-md mb-4">
                {t('guidelines.emptyStates.noArchived.description')}
              </p>
              <Button
                onClick={() => onToggleArchived(false)}
                variant="outline"
                size="sm"
              >
                <Eye className="h-4 w-4 mr-2" />
                {t('guidelines.emptyStates.noArchived.viewActive')}
              </Button>
            </>
          ) : (
            <>
              <Sparkles className="h-12 w-12 text-amber-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {t('guidelines.emptyStates.noGuidelines.title')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-md mb-4">
                {t('guidelines.emptyStates.noGuidelines.description')}
              </p>
              <Button onClick={onCreateNew} variant="default" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                {t('guidelines.emptyStates.noGuidelines.createFirst')}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Multiple Active Guidelines Alert */}
      {multipleActiveAlert && (
        <Alert className={multipleActiveAlert.type === 'duplicate_active' ? 'border-red-200 bg-red-50' : 'border-orange-200 bg-orange-50'}>
          <AlertTriangle className={`h-4 w-4 ${multipleActiveAlert.type === 'duplicate_active' ? 'text-red-600' : 'text-orange-600'}`} />
          <AlertTitle>
            {multipleActiveAlert.type === 'duplicate_active' ? t('guidelines.alerts.duplicateActive') : t('guidelines.alerts.multipleActive')}
          </AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-2">{multipleActiveAlert.message}</p>
            <p className="text-sm font-medium">{multipleActiveAlert.recommendation}</p>
            {multipleActiveAlert.type === 'duplicate_active' && multipleActiveAlert.duplicateCount && (
              <p className="text-sm mt-2">
                {t('guidelines.alerts.duplicatesFound', { count: multipleActiveAlert.duplicateCount })}
              </p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Duplicate Detection Statistics */}
      {groupingStats.duplicatesFound > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-medium text-amber-900 dark:text-amber-100">
              {t('guidelines.stats.duplicatesDetected', { count: groupingStats.duplicatesFound })}
            </span>
            <span className="text-sm text-amber-700 dark:text-amber-300">
              {t('guidelines.stats.uniqueFromTotal', { unique: groupingStats.totalGroups, total: groupingStats.totalItems })}
            </span>
          </div>
        </div>
      )}

      {/* Guidelines Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {groupedGuidelines.map(group => (
          <BrandGuidelineCard
            key={group.groupKey}
            guideline={group.primary}
            duplicateCount={group.count}
            onView={onView}
            onEdit={onEdit}
            onArchive={onArchive}
            onRestore={onRestore}
            onDelete={onDelete}
            onCopy={onCopy}
            activeCount={group.items.filter(item => !item.archived_at).length}
          />
        ))}
      </div>
    </>
  );
}
