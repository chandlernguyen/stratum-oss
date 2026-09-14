import { Waves, TrendingUp, TrendingDown, Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BlueOceanFactors {
  eliminate: string[];
  reduce: string[];
  raise_factors: string[];
  create: string[];
}

interface BlueOceanStrategy {
  context: string;
  current_red_ocean: string;
  blue_ocean_opportunity: string;
  four_actions_framework: BlueOceanFactors;
  value_innovation: string;
}

interface BlueOceanStrategyProps {
  data: BlueOceanStrategy;
}

const getActionConfig = (t: (key: string) => string) => ({
  'Eliminate': {
    color: 'bg-red-100 dark:bg-red-900/30 text-brand-error dark:text-red-300',
    icon: X,
    label: t('toolRenderers.blueOcean.eliminate'),
    description: t('toolRenderers.blueOcean.removeCompletely')
  },
  'Reduce': {
    color: 'bg-amber-50 dark:bg-amber-950/30 text-brand-warning dark:text-amber-300',
    icon: TrendingDown,
    label: t('toolRenderers.blueOcean.reduce'),
    description: t('toolRenderers.blueOcean.belowIndustry')
  },
  'Raise': {
    color: 'bg-amber-50 dark:bg-amber-950/30 text-brand-gold dark:text-amber-300',
    icon: TrendingUp,
    label: t('toolRenderers.blueOcean.raise'),
    description: t('toolRenderers.blueOcean.aboveIndustry')
  },
  'Create': {
    color: 'bg-green-100 dark:bg-green-900/30 text-brand-success dark:text-green-300',
    icon: Plus,
    label: t('toolRenderers.blueOcean.create'),
    description: t('toolRenderers.blueOcean.industryNeverOffered')
  }
});

export function BlueOceanStrategy({ data }: BlueOceanStrategyProps) {
  const { t } = useTranslation('agents');
  const actionConfig = getActionConfig(t);
  const { four_actions_framework } = data;

  // Create structured data for the ERRC grid
  const actionData = [
    { action: 'Eliminate' as const, items: four_actions_framework.eliminate, config: actionConfig['Eliminate'] },
    { action: 'Reduce' as const, items: four_actions_framework.reduce, config: actionConfig['Reduce'] },
    { action: 'Raise' as const, items: four_actions_framework.raise_factors, config: actionConfig['Raise'] },
    { action: 'Create' as const, items: four_actions_framework.create, config: actionConfig['Create'] }
  ];

  return (
    <div className="w-full my-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-slate-100 dark:bg-slate-900/30 rounded-lg">
          <Waves className="w-5 h-5 text-brand-gold dark:text-amber-400" />
        </div>
        <h3 className="text-xl font-semibold text-brand-charcoal dark:text-gray-100">{t('toolRenderers.blueOcean.title')}</h3>
      </div>

      {/* Context */}
      {data.context && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-sm text-brand-charcoal dark:text-gray-300">{data.context}</p>
        </div>
      )}

      {/* ERRC Grid - Eliminate, Reduce, Raise, Create */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {actionData.map(({ action, items, config }) => {
          const Icon = config.icon;

          return (
            <div key={action} className={`rounded-lg border p-4 ${config.color}`}>
              <div className="flex items-center gap-2 mb-3">
                <Icon className="w-5 h-5" />
                <h4 className="font-semibold text-sm text-brand-charcoal dark:text-gray-100">{config.label}</h4>
              </div>
              <p className="text-xs opacity-75 mb-3">{config.description}</p>
              <div className="space-y-2">
                {items.length > 0 ? (
                  items.map((item, index) => (
                    <div key={index} className="bg-white/50 dark:bg-gray-800/50 rounded p-2">
                      <p className="text-xs font-medium">{item}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs opacity-50 italic">{t('toolRenderers.common.noFactors')}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Current vs Blue Ocean */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
          <h4 className="font-semibold text-brand-charcoal dark:text-gray-100 mb-2 flex items-center gap-2">
            <X className="w-4 h-4 text-brand-error dark:text-red-400" />
            {t('toolRenderers.blueOcean.currentRedOcean')}
          </h4>
          <p className="text-sm text-brand-charcoal dark:text-gray-300">{data.current_red_ocean}</p>
        </div>

        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
          <h4 className="font-semibold text-brand-charcoal dark:text-gray-100 mb-2 flex items-center gap-2">
            <Waves className="w-4 h-4 text-brand-gold dark:text-amber-400" />
            {t('toolRenderers.blueOcean.blueOceanOpportunity')}
          </h4>
          <p className="text-sm text-brand-charcoal dark:text-gray-300">{data.blue_ocean_opportunity}</p>
        </div>
      </div>

      {/* Value Innovation */}
      <div className="p-4 bg-slate-50 dark:bg-slate-950/30 rounded-lg border border-slate-200 dark:border-slate-800">
        <h4 className="font-semibold text-brand-charcoal dark:text-gray-100 mb-2 flex items-center gap-2">
          <Plus className="w-4 h-4 text-brand-gold dark:text-amber-400" />
          {t('toolRenderers.blueOcean.valueInnovation')}
        </h4>
        <p className="text-sm text-brand-charcoal dark:text-gray-300">{data.value_innovation}</p>
      </div>
    </div>
  );
}
