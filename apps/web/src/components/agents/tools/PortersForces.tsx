import { Package, Factory, Sword, Users, Repeat, TrendingUp, AlertTriangle, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PortersFiveForces {
  threat_of_new_entrants: string;
  bargaining_power_of_suppliers: string;
  industry_rivalry: string;
  bargaining_power_of_buyers: string;
  threat_of_substitutes: string;
}

interface PortersForcesProps {
  data: PortersFiveForces;
}

// Helper function to extract key points from text
function extractKeyPoints(text: string, maxPoints: number = 3): string[] {
  // Split by periods, semicolons, or commas for potential points
  const sentences = text.split(/[.;,]/).filter(s => s.trim().length > 10);
  return sentences.slice(0, maxPoints).map(s => s.trim());
}

// Helper function to determine threat level based on keywords
function getThreatLevel(text: string): { level: 'low' | 'moderate' | 'high'; color: string; icon: any } {
  const lowKeywords = ['low', 'minimal', 'limited', 'weak', 'little'];
  const highKeywords = ['high', 'strong', 'significant', 'intense', 'extreme', 'fierce'];

  const textLower = text.toLowerCase();

  if (highKeywords.some(keyword => textLower.includes(keyword))) {
    return { level: 'high', color: 'text-brand-error bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800', icon: AlertTriangle };
  }
  if (lowKeywords.some(keyword => textLower.includes(keyword))) {
    return { level: 'low', color: 'text-brand-success bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800', icon: Shield };
  }
  return { level: 'moderate', color: 'text-brand-warning bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800', icon: TrendingUp };
}

export function PortersForces({ data }: PortersForcesProps) {
  const { t } = useTranslation('agents');

  const forces = [
    {
      id: 'new_entrants',
      title: t('toolRenderers.porters.newEntrants'),
      icon: Package,
      content: data.threat_of_new_entrants,
      position: 'col-span-2 row-start-1'
    },
    {
      id: 'suppliers',
      title: t('toolRenderers.porters.suppliers'),
      icon: Factory,
      content: data.bargaining_power_of_suppliers,
      position: 'col-start-1 row-start-2'
    },
    {
      id: 'rivalry',
      title: t('toolRenderers.porters.rivalry'),
      icon: Sword,
      content: data.industry_rivalry,
      position: 'col-start-2 row-start-2',
      isCenter: true
    },
    {
      id: 'buyers',
      title: t('toolRenderers.porters.buyers'),
      icon: Users,
      content: data.bargaining_power_of_buyers,
      position: 'col-start-3 row-start-2'
    },
    {
      id: 'substitutes',
      title: t('toolRenderers.porters.substitutes'),
      icon: Repeat,
      content: data.threat_of_substitutes,
      position: 'col-span-2 col-start-2 row-start-3'
    }
  ];

  const getThreatLabel = (level: 'low' | 'moderate' | 'high') => {
    switch (level) {
      case 'low': return t('toolRenderers.porters.low');
      case 'moderate': return t('toolRenderers.porters.moderate');
      case 'high': return t('toolRenderers.porters.high');
    }
  };

  return (
    <div className="w-full my-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-slate-100 dark:bg-slate-900/30 rounded-lg">
          <Sword className="w-5 h-5 text-brand-gold dark:text-amber-400" />
        </div>
        <h3 className="text-xl font-semibold text-brand-charcoal dark:text-gray-100">{t('toolRenderers.porters.title')}</h3>
      </div>

      {/* Forces Grid - Mobile: 1 column, Tablet: 2 columns, Desktop: 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {forces.map((force) => {
          const threat = getThreatLevel(force.content);
          const keyPoints = extractKeyPoints(force.content);
          const Icon = force.icon;
          const ThreatIcon = threat.icon;

          return (
            <div
              key={force.id}
              className={`${force.isCenter ? 'md:order-3 lg:col-start-2 lg:row-start-2' : ''}`}
            >
              <div className={`
                relative p-4 md:p-5 rounded-xl border-2 transition-all hover:shadow-lg
                ${force.isCenter
                  ? 'bg-gradient-to-br from-slate-50 to-amber-100 dark:from-slate-900/20 dark:to-slate-800/20 border-amber-300 dark:border-slate-700'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-600'
                }
              `}>
                {/* Header with Icon and Title */}
                <div className="flex items-start justify-between mb-3 gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={`p-1.5 rounded-lg flex-shrink-0 ${force.isCenter ? 'bg-amber-200 dark:bg-slate-800' : 'bg-gray-100 dark:bg-gray-700'}`}>
                      <Icon className={`w-4 h-4 ${force.isCenter ? 'text-brand-charcoal dark:text-slate-300' : 'text-brand-slate dark:text-gray-400'}`} />
                    </div>
                    <h4 className="font-semibold text-sm md:text-base text-brand-charcoal dark:text-gray-100">
                      {force.title}
                    </h4>
                  </div>

                  {/* Threat Level Badge */}
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${threat.color}`}>
                    <ThreatIcon className="w-3 h-3" />
                    <span className="capitalize hidden sm:inline">{getThreatLabel(threat.level)}</span>
                  </div>
                </div>

                {/* Key Points */}
                <div className="space-y-2">
                  {keyPoints.slice(0, 2).map((point, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 mt-1.5 flex-shrink-0" />
                      <p className="text-xs text-brand-slate dark:text-gray-400 leading-relaxed line-clamp-2">
                        {point}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Visual Indicator for Center */}
                {force.isCenter && (
                  <div className="absolute -top-2 -right-2">
                    <div className="px-2 py-0.5 bg-amber-600 text-white text-xs font-bold rounded-full">
                      {t('toolRenderers.porters.core')}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 md:mt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0 px-2">
        <div className="flex items-center gap-3 md:gap-4 text-xs flex-wrap">
          <div className="flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-brand-success" />
            <span className="text-brand-slate dark:text-gray-400">{t('toolRenderers.porters.lowThreat')}</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-brand-warning" />
            <span className="text-brand-slate dark:text-gray-400">{t('toolRenderers.porters.moderate')}</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-brand-error" />
            <span className="text-brand-slate dark:text-gray-400">{t('toolRenderers.porters.highThreat')}</span>
          </div>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <button className="px-3 py-1.5 text-xs font-medium text-brand-slate dark:text-gray-400 hover:text-brand-gold dark:hover:text-amber-400 transition-colors">
            {t('toolRenderers.porters.viewDetails')}
          </button>
          <button className="px-3 py-1.5 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors">
            {t('toolRenderers.porters.generateStrategy')}
          </button>
        </div>
      </div>
    </div>
  );
}
