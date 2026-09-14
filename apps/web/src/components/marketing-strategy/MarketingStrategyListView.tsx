import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/useLocale';
import { getIntlLocale } from '@/lib/locales';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Target,
  MoreVertical,
  Eye,
  Edit,
  Copy,
  Archive,
  Plus,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { type MarketingStrategy } from '@/hooks/data/useMarketingStrategies';
import { cn } from '@/lib/utils';

interface MarketingStrategyListViewProps {
  strategies: MarketingStrategy[];
  isLoading: boolean;
  selectedStrategyId?: string;
  onSelectStrategy: (strategy: MarketingStrategy) => void;
  onEditStrategy?: (strategy: MarketingStrategy) => void;
  onDuplicateStrategy?: (strategyId: string, currentName: string) => void;
  onArchiveStrategy?: (strategyId: string) => void;
  onRestoreStrategy?: (strategyId: string) => void;
  onCreateStrategy?: () => void;
}

/**
 * Mobile-optimized list view for marketing strategies
 * - Full-width cards with touch-friendly targets
 * - Shows key strategy info: name, description, type
 * - Actions menu for View, Edit, Duplicate, Archive
 * - Empty state for no strategies
 */
export function MarketingStrategyListView({
  strategies,
  isLoading,
  selectedStrategyId,
  onSelectStrategy,
  onEditStrategy,
  onDuplicateStrategy,
  onArchiveStrategy,
  onRestoreStrategy,
  onCreateStrategy,
}: MarketingStrategyListViewProps) {
  const { t } = useTranslation(['agents', 'common']);
  const { locale } = useLocale('common');

  const getStrategyTypeColor = (type?: string) => {
    const typeColors: Record<string, string> = {
      'Product Launch': 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300',
      'Brand Awareness': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      'Lead Generation': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      'Customer Retention': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
      'Market Expansion': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
    };
    return typeColors[type || ''] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(getIntlLocale(locale), { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Get a preview of key points from the strategy
  const getStrategyPreview = (strategy: MarketingStrategy) => {
    if (strategy.messaging_framework?.value_propositions?.length) {
      return strategy.messaging_framework.value_propositions[0];
    }
    if (strategy.target_audience?.primary_segments?.length) {
      return `Target: ${strategy.target_audience.primary_segments.join(', ')}`;
    }
    return strategy.description || 'No description';
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Target className="w-12 h-12 mx-auto text-gray-400 mb-3 animate-pulse" />
          <p className="text-gray-600 dark:text-gray-400">{t('agents:context.strategyList.loading')}</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (strategies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6">
        <Target className="w-16 h-16 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {t('agents:context.strategyList.empty.title')}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-6">
          {t('agents:context.strategyList.empty.description')}
        </p>
        {onCreateStrategy && (
          <Button
            onClick={onCreateStrategy}
            className="bg-gradient-to-br from-slate-600 to-amber-600 hover:from-slate-700 hover:to-amber-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('agents:context.strategyList.empty.createFirst')}
          </Button>
        )}
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-3 p-3">
      {strategies.map((strategy) => (
        <Card
          key={strategy.id}
          className={cn(
            "p-4 cursor-pointer transition-all duration-200 border-2 hover:shadow-lg active:scale-[0.98]",
            selectedStrategyId === strategy.id
              ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-400 dark:border-amber-700'
              : 'hover:bg-gray-50 dark:hover:bg-gray-800 border-gray-200 dark:border-gray-700',
            strategy.archived_at && 'opacity-60'
          )}
          onClick={() => onSelectStrategy(strategy)}
        >
          {/* Archived Badge */}
          {strategy.archived_at && (
            <Badge
              variant="secondary"
              className="absolute top-3 right-12 text-xs px-2 py-0.5"
            >
              <Archive className="w-3 h-3 mr-1" />
              {t('agents:context.strategyList.archived')}
            </Badge>
          )}

          <div className="flex items-start justify-between gap-3">
            {/* Left: Icon + Content */}
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0 mt-1">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-600 to-amber-600 flex items-center justify-center">
                  <Target className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0 space-y-1.5">
                {/* Strategy Name */}
                <p className="font-semibold text-base text-gray-900 dark:text-gray-100 break-words leading-snug">
                  {strategy.name}
                </p>

                {/* Preview/Description */}
                <p className="text-sm text-gray-600 dark:text-gray-400 break-words leading-snug line-clamp-2">
                  {getStrategyPreview(strategy)}
                </p>

                {/* Badges Row */}
                <div className="flex items-center gap-2 flex-wrap mt-2">
                  {/* Strategy Type Badge */}
                  {strategy.strategy_type && (
                    <Badge className={cn("text-xs px-2 py-0.5", getStrategyTypeColor(strategy.strategy_type))}>
                      {strategy.strategy_type}
                    </Badge>
                  )}

                  {/* Date Badge */}
                  <Badge variant="outline" className="text-xs px-2 py-0.5">
                    <Calendar className="w-3 h-3 mr-1" />
                    {formatDate(strategy.created_at)}
                  </Badge>

                  {/* Metrics Badge (if has KPIs) */}
                  {strategy.metrics?.primary_kpis && strategy.metrics.primary_kpis.length > 0 && (
                    <Badge variant="outline" className="text-xs px-2 py-0.5">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      {strategy.metrics.primary_kpis.length} KPIs
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectStrategy(strategy);
                  }}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  {t('agents:context.strategyList.actions.viewDetails')}
                </DropdownMenuItem>
                {onEditStrategy && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditStrategy(strategy);
                    }}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    {t('agents:context.strategyList.actions.edit')}
                  </DropdownMenuItem>
                )}
                {onDuplicateStrategy && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicateStrategy(strategy.id, strategy.name);
                    }}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    {t('agents:context.strategyList.actions.duplicate')}
                  </DropdownMenuItem>
                )}
                {strategy.archived_at ? (
                  onRestoreStrategy && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onRestoreStrategy(strategy.id);
                      }}
                      className="text-green-600 dark:text-green-400"
                    >
                      <Archive className="w-4 h-4 mr-2" />
                      {t('agents:context.strategyList.actions.restore')}
                    </DropdownMenuItem>
                  )
                ) : (
                  onArchiveStrategy && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onArchiveStrategy(strategy.id);
                      }}
                      className="text-red-600 dark:text-red-400"
                    >
                      <Archive className="w-4 h-4 mr-2" />
                      {t('agents:context.strategyList.actions.archive')}
                    </DropdownMenuItem>
                  )
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </Card>
      ))}
    </div>
  );
}
