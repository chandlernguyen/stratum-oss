import { Target, TrendingUp, Rocket, Calendar, DollarSign } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface HorizonItem {
  name: string;
  horizon: number;
  description: string;
  time_frame: string;
  investment_level: string;
  expected_return: string;
}

interface ThreeHorizons {
  context: string;
  horizon_1: HorizonItem[];
  horizon_2: HorizonItem[];
  horizon_3: HorizonItem[];
  resource_allocation: string;
}

interface ThreeHorizonsProps {
  data: ThreeHorizons;
}

const getHorizonConfig = (t: (key: string) => string) => ({
  1: {
    title: t('toolRenderers.threeHorizons.horizon1Title'),
    subtitle: t('toolRenderers.threeHorizons.horizon1Subtitle'),
    color: 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700',
    iconColor: 'text-brand-info dark:text-amber-400',
    icon: Target,
    allocation: '70%'
  },
  2: {
    title: t('toolRenderers.threeHorizons.horizon2Title'),
    subtitle: t('toolRenderers.threeHorizons.horizon2Subtitle'),
    color: 'bg-slate-100 dark:bg-slate-900/30 border-amber-300 dark:border-slate-700',
    iconColor: 'text-brand-gold dark:text-amber-400',
    icon: TrendingUp,
    allocation: '20%'
  },
  3: {
    title: t('toolRenderers.threeHorizons.horizon3Title'),
    subtitle: t('toolRenderers.threeHorizons.horizon3Subtitle'),
    color: 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700',
    iconColor: 'text-brand-success dark:text-green-400',
    icon: Rocket,
    allocation: '10%'
  }
});

export function ThreeHorizons({ data }: ThreeHorizonsProps) {
  const { t } = useTranslation('agents');
  const horizonConfig = getHorizonConfig(t);

  const horizons = [
    { items: data.horizon_1, config: horizonConfig[1], number: 1 },
    { items: data.horizon_2, config: horizonConfig[2], number: 2 },
    { items: data.horizon_3, config: horizonConfig[3], number: 3 }
  ];

  return (
    <div className="w-full my-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
          <Rocket className="w-5 h-5 text-brand-gold dark:text-amber-400" />
        </div>
        <h3 className="text-xl font-semibold text-brand-charcoal dark:text-gray-100">{t('toolRenderers.threeHorizons.title')}</h3>
      </div>

      {/* Context */}
      {data.context && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-sm text-brand-charcoal dark:text-gray-300">{data.context}</p>
        </div>
      )}

      {/* Horizons Timeline Visual */}
      <div className="relative mb-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        <div className="relative flex justify-between">
          {horizons.map((horizon) => {
            const Icon = horizon.config.icon;
            return (
              <div key={horizon.number} className="flex flex-col items-center">
                <div className={`w-12 h-12 rounded-full ${horizon.config.color.split(' ')[0]} border-2 ${horizon.config.color.split(' ')[2]} flex items-center justify-center bg-white dark:bg-gray-900`}>
                  <Icon className={`w-6 h-6 ${horizon.config.iconColor}`} />
                </div>
                <span className="mt-2 text-xs font-medium text-brand-slate dark:text-gray-400">
                  H{horizon.number}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Horizons Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {horizons.map((horizon) => {
          const Icon = horizon.config.icon;
          return (
            <div key={horizon.number} className={`rounded-xl border-2 ${horizon.config.color} p-4`}>
              {/* Horizon Header */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${horizon.config.iconColor}`} />
                    <h4 className="font-semibold text-sm text-brand-charcoal dark:text-gray-100">
                      {horizon.config.title}
                    </h4>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${horizon.config.iconColor} ${horizon.config.color.split(' ')[0]}`}>
                    {horizon.config.allocation}
                  </span>
                </div>
                <p className="text-xs text-brand-slate dark:text-gray-400">{horizon.config.subtitle}</p>
              </div>

              {/* Horizon Items */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {horizon.items.map((item, index) => (
                  <div key={index} className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
                    <h5 className="font-medium text-sm text-brand-charcoal dark:text-gray-100 mb-1">
                      {item.name}
                    </h5>
                    <p className="text-xs text-brand-slate dark:text-gray-400 mb-2">
                      {item.description}
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                        <span className="text-brand-slate dark:text-gray-400">{item.time_frame}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                        <span className="text-brand-slate dark:text-gray-400">{item.investment_level}</span>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {t('toolRenderers.threeHorizons.expected', { value: item.expected_return })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Resource Allocation Summary */}
      <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
        <h4 className="font-semibold text-brand-charcoal dark:text-gray-100 mb-2">{t('toolRenderers.threeHorizons.resourceAllocation')}</h4>
        <p className="text-sm text-brand-charcoal dark:text-gray-300">{data.resource_allocation}</p>

        {/* Allocation Bar */}
        <div className="mt-3 h-8 flex rounded-lg overflow-hidden">
          <div className="bg-brand-gold flex items-center justify-center text-slate-900 text-xs font-semibold" style={{ width: '70%' }}>
            H1: 70%
          </div>
          <div className="bg-slate-500 flex items-center justify-center text-white text-xs font-semibold" style={{ width: '20%' }}>
            H2: 20%
          </div>
          <div className="bg-green-500 flex items-center justify-center text-white text-xs font-semibold" style={{ width: '10%' }}>
            H3: 10%
          </div>
        </div>
      </div>
    </div>
  );
}
