import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, Archive, RotateCcw, Layers } from 'lucide-react';
import { ResourceActionsDropdown } from '@/components/ResourceActionsDropdown';
import { RESOURCE_CONFIGS } from '@/config/resource-configs';
import type { BrandGuideline } from './hooks/useBrandGuidelines';

interface BrandGuidelineCardProps {
  guideline: BrandGuideline;
  duplicateCount?: number;
  onView: (guideline: BrandGuideline) => void;
  onEdit: (guideline: BrandGuideline) => void;
  onArchive: (guideline: BrandGuideline) => void;
  onRestore: (guideline: BrandGuideline) => void;
  onDelete: (guideline: BrandGuideline) => void;
  onCopy: (guideline: BrandGuideline) => void;
  activeCount?: number;
}

export function BrandGuidelineCard({
  guideline,
  duplicateCount,
  onView,
  onEdit,
  onArchive,
  onRestore,
  onDelete,
  onCopy,
  activeCount
}: BrandGuidelineCardProps) {
  const { t } = useTranslation('brand');

  return (
    <div className="relative">
      {/* Show stack indicator if there are duplicates */}
      {duplicateCount && duplicateCount > 1 && (
        <div className="absolute -top-2 -right-2 z-10">
          <Badge className="bg-amber-600 text-white border-0 shadow-lg">
            <Layers className="h-3 w-3 mr-1" />
            {t('guidelines.similar', { count: duplicateCount })}
          </Badge>
        </div>
      )}

      <Card
        className={`cursor-pointer hover:shadow-lg transition-shadow border-2 ${
          guideline.archived_at
            ? 'opacity-75 hover:border-gray-300 bg-gray-50 dark:bg-gray-800'
            : 'hover:border-slate-200'
        }`}
        onClick={() => onView(guideline)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                {guideline.archived_at ? (
                  <Archive className="h-5 w-5 text-gray-500" />
                ) : (
                  <Sparkles className="h-5 w-5 text-amber-600" />
                )}
                {guideline.name || t('guidelines.untitled')}
              </CardTitle>
              {guideline.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                  {guideline.description}
                </p>
              )}
            </div>
            <ResourceActionsDropdown
              item={guideline}
              config={RESOURCE_CONFIGS.brand_guidelines}
              onEdit={() => onEdit(guideline)}
              onArchive={() => onArchive(guideline)}
              onRestore={() => onRestore(guideline)}
              onDelete={() => onDelete(guideline)}
              onCopy={() => onCopy(guideline)}
              showEdit={true}
              showArchive={true}
              showRestore={true}
              showDelete={true}
              showCopy={true}
              size="sm"
            />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              {guideline.archived_at ? (
                <>
                  <Badge className="bg-gray-500 text-white">{t('guidelines.status.archived')}</Badge>
                </>
              ) : (
                <>
                  {guideline.is_default && <Badge variant="secondary">{t('guidelines.status.default')}</Badge>}
                  {!guideline.archived_at && <Badge variant="outline" className="text-green-600 border-green-600">{t('guidelines.status.active')}</Badge>}
                  {activeCount && activeCount > 1 && (
                    <Badge variant="outline" className="text-orange-600 border-orange-600">
                      {t('guidelines.activeCount', { count: activeCount })}
                    </Badge>
                  )}
                </>
              )}
              <Badge variant="outline" className="text-xs">
                {t('guidelines.clickToView')}
              </Badge>
            </div>

            {/* Quick Restore Button for Archived Items */}
            {guideline.archived_at && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  onRestore(guideline);
                }}
              >
                <RotateCcw className="h-3 w-3 mr-2" />
                {t('guidelines.actions.restore')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
