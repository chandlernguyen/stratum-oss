import { TrendingUp, Target, Zap, BarChart3, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ICEScore {
  item_name: string;
  impact_score: number;
  confidence_score: number;
  ease_score: number;
  total_score: number;
  rationale: string;
}

interface ICEPrioritizationData {
  context?: string;
  items: ICEScore[];
  recommendation?: string;
  resource_considerations?: string;
}

interface ICEPrioritizationProps {
  data: ICEPrioritizationData;
}

export function ICEPrioritization({ data }: ICEPrioritizationProps) {
  const { t } = useTranslation('agents');

  if (!data?.items || data.items.length === 0) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-500">{t('toolRenderers.ice.noData')}</p>
      </div>
    );
  }

  // Sort items by total score descending
  const sortedItems = [...data.items].sort((a, b) => b.total_score - a.total_score);
  const topScore = sortedItems[0]?.total_score || 0;

  const getScoreColor = (score: number) => {
    if (score >= 7) return 'text-brand-success dark:text-green-400';
    if (score >= 5) return 'text-brand-warning dark:text-yellow-400';
    return 'text-brand-error dark:text-red-400';
  };

  const getScoreBarWidth = (score: number, maxScore: number = 10) => {
    return `${(score / maxScore) * 100}%`;
  };

  const getTotalScoreColor = (score: number) => {
    if (score >= 5) return 'bg-green-500';
    if (score >= 3) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-brand-info" />
        <h3 className="text-lg font-semibold text-brand-charcoal dark:text-gray-100">{t('toolRenderers.ice.title')}</h3>
      </div>

      {/* Context */}
      {data.context && (
        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-brand-charcoal dark:text-gray-300">{data.context}</p>
        </div>
      )}

      {/* Priority Items */}
      <div className="space-y-3">
        {sortedItems.map((item, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border ${
              index === 0
                ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/20'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
            }`}
          >
            {/* Item Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                {index === 0 && <span className="px-2 py-1 text-xs font-semibold bg-green-500 text-white rounded">{t('toolRenderers.ice.topPriority')}</span>}
                <h4 className="font-semibold text-brand-charcoal dark:text-gray-100">{item.item_name}</h4>
              </div>
              <div className={`text-2xl font-bold ${getTotalScoreColor(item.total_score).replace('bg-', 'text-')}`}>
                {item.total_score.toFixed(2)}
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-gray-500" />
                  <span className="text-xs text-brand-slate dark:text-gray-400">{t('toolRenderers.ice.impact')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: getScoreBarWidth(item.impact_score) }}
                    />
                  </div>
                  <span className={`text-sm font-semibold ${getScoreColor(item.impact_score)}`}>
                    {item.impact_score}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <Target className="w-4 h-4 text-gray-500" />
                  <span className="text-xs text-brand-slate dark:text-gray-400">{t('toolRenderers.ice.confidence')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-slate-500 h-2 rounded-full transition-all"
                      style={{ width: getScoreBarWidth(item.confidence_score) }}
                    />
                  </div>
                  <span className={`text-sm font-semibold ${getScoreColor(item.confidence_score)}`}>
                    {item.confidence_score}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <Zap className="w-4 h-4 text-gray-500" />
                  <span className="text-xs text-brand-slate dark:text-gray-400">{t('toolRenderers.ice.ease')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all"
                      style={{ width: getScoreBarWidth(item.ease_score) }}
                    />
                  </div>
                  <span className={`text-sm font-semibold ${getScoreColor(item.ease_score)}`}>
                    {item.ease_score}
                  </span>
                </div>
              </div>
            </div>

            {/* Rationale */}
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-brand-slate dark:text-gray-400">{item.rationale}</p>
            </div>

            {/* Total Score Bar */}
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>{t('toolRenderers.ice.overallPriorityScore')}</span>
                <span className="font-semibold">{t('toolRenderers.ice.iceFormula')}</span>
              </div>
              <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className={`${getTotalScoreColor(item.total_score)} h-3 rounded-full transition-all relative`}
                  style={{ width: getScoreBarWidth(item.total_score, topScore || 10) }}
                >
                  <span className="absolute right-2 top-0 text-white text-xs font-bold leading-3">
                    {item.total_score.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recommendation */}
      {data.recommendation && (
        <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-brand-info mt-0.5" />
            <div>
              <h4 className="font-semibold text-brand-charcoal dark:text-gray-100 mb-1">{t('toolRenderers.ice.recommendation')}</h4>
              <p className="text-sm text-brand-charcoal dark:text-gray-300">{data.recommendation}</p>
            </div>
          </div>
        </div>
      )}

      {/* Resource Considerations */}
      {data.resource_considerations && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <h4 className="font-semibold text-brand-charcoal dark:text-gray-100 mb-1">{t('toolRenderers.ice.resourceConsiderations')}</h4>
          <p className="text-sm text-brand-charcoal dark:text-gray-300">{data.resource_considerations}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm">
          {t('toolRenderers.ice.createActionPlan')}
        </button>
        <button className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-brand-charcoal dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm">
          {t('toolRenderers.ice.exportAnalysis')}
        </button>
      </div>
    </div>
  );
}
