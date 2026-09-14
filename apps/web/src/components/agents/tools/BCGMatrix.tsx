import { Star, DollarSign, HelpCircle, TrendingDown, Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BCGMatrixItem {
  name: string;
  market_growth_rate: string;
  relative_market_share: string;
  category: string;
  strategy_recommendation: string;
}

interface BCGMatrix {
  context: string;
  items: BCGMatrixItem[];
  overall_portfolio_balance: string;
  investment_priorities: string;
}

interface BCGMatrixProps {
  data: BCGMatrix;
}

const getCategoryConfig = (t: (key: string) => string) => ({
  'Star': {
    icon: Star,
    color: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700',
    iconColor: 'text-brand-warning dark:text-yellow-400',
    quadrant: 'top-right',
    description: t('toolRenderers.bcgMatrix.highGrowthHighShare')
  },
  'Cash Cow': {
    icon: DollarSign,
    color: 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700',
    iconColor: 'text-brand-success dark:text-green-400',
    quadrant: 'bottom-right',
    description: t('toolRenderers.bcgMatrix.lowGrowthHighShare')
  },
  'Question Mark': {
    icon: HelpCircle,
    color: 'bg-slate-100 dark:bg-slate-900/30 border-amber-300 dark:border-slate-700',
    iconColor: 'text-brand-gold dark:text-amber-400',
    quadrant: 'top-left',
    description: t('toolRenderers.bcgMatrix.highGrowthLowShare')
  },
  'Dog': {
    icon: TrendingDown,
    color: 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700',
    iconColor: 'text-brand-slate dark:text-gray-400',
    quadrant: 'bottom-left',
    description: t('toolRenderers.bcgMatrix.lowGrowthLowShare')
  }
});

export function BCGMatrix({ data }: BCGMatrixProps) {
  const { t } = useTranslation('agents');
  const categoryConfig = getCategoryConfig(t);

  // Group items by category
  const groupedItems = data.items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, BCGMatrixItem[]>);

  return (
    <div className="w-full my-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-slate-100 dark:bg-slate-900/30 rounded-lg">
          <Package className="w-5 h-5 text-brand-gold dark:text-amber-400" />
        </div>
        <h3 className="text-xl font-semibold text-brand-charcoal dark:text-gray-100">{t('toolRenderers.bcgMatrix.title')}</h3>
      </div>

      {/* Matrix Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Question Marks - Top Left */}
        <div className="relative">
          <QuadrantSection
            title={t('toolRenderers.bcgMatrix.questionMarks')}
            items={groupedItems['Question Mark'] || []}
            config={categoryConfig['Question Mark']}
            t={t}
          />
        </div>

        {/* Stars - Top Right */}
        <div className="relative">
          <QuadrantSection
            title={t('toolRenderers.bcgMatrix.stars')}
            items={groupedItems['Star'] || []}
            config={categoryConfig['Star']}
            t={t}
          />
        </div>

        {/* Dogs - Bottom Left */}
        <div className="relative">
          <QuadrantSection
            title={t('toolRenderers.bcgMatrix.dogs')}
            items={groupedItems['Dog'] || []}
            config={categoryConfig['Dog']}
            t={t}
          />
        </div>

        {/* Cash Cows - Bottom Right */}
        <div className="relative">
          <QuadrantSection
            title={t('toolRenderers.bcgMatrix.cashCows')}
            items={groupedItems['Cash Cow'] || []}
            config={categoryConfig['Cash Cow']}
            t={t}
          />
        </div>
      </div>

      {/* Axis Labels */}
      <div className="relative h-8 mb-4">
        <div className="absolute left-0 text-sm text-gray-500 dark:text-gray-400">← {t('toolRenderers.bcgMatrix.lowMarketShare')}</div>
        <div className="absolute right-0 text-sm text-gray-500 dark:text-gray-400">{t('toolRenderers.bcgMatrix.highMarketShare')} →</div>
        <div className="absolute left-1/2 -translate-x-1/2 text-sm font-medium text-brand-charcoal dark:text-gray-300">
          {t('toolRenderers.bcgMatrix.relativeMarketShare')}
        </div>
      </div>

      {/* Portfolio Assessment */}
      <div className="space-y-4">
        <div className="p-4 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-700">
          <h4 className="font-semibold text-brand-charcoal dark:text-gray-100 mb-2">{t('toolRenderers.bcgMatrix.portfolioBalance')}</h4>
          <p className="text-sm text-brand-charcoal dark:text-gray-300">{data.overall_portfolio_balance}</p>
        </div>

        <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
          <h4 className="font-semibold text-brand-charcoal dark:text-gray-100 mb-2">{t('toolRenderers.bcgMatrix.investmentPriorities')}</h4>
          <p className="text-sm text-brand-charcoal dark:text-gray-300">{data.investment_priorities}</p>
        </div>
      </div>
    </div>
  );
}

function QuadrantSection({ title, items, config, t }: {
  title: string;
  items: BCGMatrixItem[];
  config: ReturnType<typeof getCategoryConfig>[keyof ReturnType<typeof getCategoryConfig>];
  t: (key: string) => string;
}) {
  const Icon = config.icon;

  return (
    <div className={`h-64 p-4 rounded-xl border-2 ${config.color}`}>
      {/* Quadrant Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${config.iconColor}`} />
          <h4 className="font-semibold text-sm text-brand-charcoal dark:text-gray-100">{title}</h4>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">{config.description}</span>
      </div>

      {/* Items */}
      <div className="space-y-2 overflow-y-auto max-h-48">
        {items.length > 0 ? (
          items.map((item, index) => (
            <div key={index} className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-2">
              <div className="font-medium text-sm text-brand-charcoal dark:text-gray-100">{item.name}</div>
              <div className="text-xs text-brand-slate dark:text-gray-400 mt-1">
                {t('toolRenderers.bcgMatrix.growth')}: {item.market_growth_rate} | {t('toolRenderers.bcgMatrix.share')}: {item.relative_market_share}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
                {item.strategy_recommendation}
              </div>
            </div>
          ))
        ) : (
          <div className="text-sm text-gray-500 dark:text-gray-400 italic">{t('toolRenderers.common.noItems')}</div>
        )}
      </div>
    </div>
  );
}