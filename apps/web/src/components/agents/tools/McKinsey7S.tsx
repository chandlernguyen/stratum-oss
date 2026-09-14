import { Network, Users, Target, Lightbulb, BookOpen, Award, Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface McKinsey7SElement {
  element: string;
  current_state: string;
  desired_state: string;
  gap_analysis: string;
  action_required: string;
}

interface McKinsey7S {
  context: string;
  elements: McKinsey7SElement[];
  alignment_score: number;
  critical_misalignments: string[];
  recommendations: string;
}

interface McKinsey7SProps {
  data: McKinsey7S;
}

const getElementConfig = (t: (key: string) => string): Record<string, {
  icon: React.ElementType;
  color: string;
  description: string;
  category: 'hard' | 'soft';
}> => ({
  'Strategy': {
    icon: Target,
    color: 'text-brand-gold dark:text-amber-400',
    description: t('toolRenderers.mckinsey7s.strategyDesc'),
    category: 'hard'
  },
  'Structure': {
    icon: Network,
    color: 'text-brand-gold dark:text-amber-400',
    description: t('toolRenderers.mckinsey7s.structureDesc'),
    category: 'hard'
  },
  'Systems': {
    icon: BookOpen,
    color: 'text-brand-success dark:text-green-400',
    description: t('toolRenderers.mckinsey7s.systemsDesc'),
    category: 'hard'
  },
  'Shared Values': {
    icon: Heart,
    color: 'text-brand-error dark:text-red-400',
    description: t('toolRenderers.mckinsey7s.sharedValuesDesc'),
    category: 'soft'
  },
  'Style': {
    icon: Award,
    color: 'text-brand-warning dark:text-yellow-400',
    description: t('toolRenderers.mckinsey7s.styleDesc'),
    category: 'soft'
  },
  'Staff': {
    icon: Users,
    color: 'text-brand-gold dark:text-amber-400',
    description: t('toolRenderers.mckinsey7s.staffDesc'),
    category: 'soft'
  },
  'Skills': {
    icon: Lightbulb,
    color: 'text-brand-warning dark:text-orange-400',
    description: t('toolRenderers.mckinsey7s.skillsDesc'),
    category: 'soft'
  }
});

export function McKinsey7S({ data }: McKinsey7SProps) {
  const { t } = useTranslation('agents');
  const elementConfig = getElementConfig(t);

  // Separate hard and soft elements
  const hardElements = data.elements.filter(e =>
    elementConfig[e.element]?.category === 'hard'
  );
  const softElements = data.elements.filter(e =>
    elementConfig[e.element]?.category === 'soft'
  );

  // Calculate alignment color based on score
  const getAlignmentColor = (score: number) => {
    if (score >= 80) return 'text-brand-success dark:text-green-400';
    if (score >= 60) return 'text-brand-warning dark:text-yellow-400';
    if (score >= 40) return 'text-brand-warning dark:text-orange-400';
    return 'text-brand-error dark:text-red-400';
  };

  const getAlignmentBg = (score: number) => {
    if (score >= 80) return 'bg-green-100 dark:bg-green-900/30';
    if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900/30';
    if (score >= 40) return 'bg-orange-100 dark:bg-orange-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
  };

  return (
    <div className="w-full my-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-slate-100 dark:bg-slate-900/30 rounded-lg">
          <Network className="w-5 h-5 text-brand-gold dark:text-amber-400" />
        </div>
        <h3 className="text-xl font-semibold text-brand-charcoal dark:text-gray-100">{t('toolRenderers.mckinsey7s.title')}</h3>
      </div>

      {/* Context */}
      {data.context && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-sm text-brand-charcoal dark:text-gray-300">{data.context}</p>
        </div>
      )}

      {/* Overall Alignment Score */}
      <div className={`mb-6 p-4 rounded-lg ${getAlignmentBg(data.alignment_score)}`}>
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-brand-charcoal dark:text-gray-100">{t('toolRenderers.mckinsey7s.organizationalAlignment')}</h4>
          <span className={`text-3xl font-bold ${getAlignmentColor(data.alignment_score)}`}>
            {data.alignment_score}%
          </span>
        </div>
        <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${
              data.alignment_score >= 80 ? 'bg-green-500' :
              data.alignment_score >= 60 ? 'bg-yellow-500' :
              data.alignment_score >= 40 ? 'bg-orange-500' : 'bg-red-500'
            }`}
            style={{ width: `${data.alignment_score}%` }}
          ></div>
        </div>
      </div>

      {/* 7S Elements Visualization */}
      <div className="mb-6">
        {/* Hard Elements */}
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-brand-slate dark:text-gray-400 mb-3">{t('toolRenderers.mckinsey7s.hardElements')}</h4>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {hardElements.map((element) => {
              const config = elementConfig[element.element];
              if (!config) return null;
              const Icon = config.icon;

              return (
                <div key={element.element} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className={`w-5 h-5 ${config.color}`} />
                    <h5 className="font-semibold text-brand-charcoal dark:text-gray-100">{element.element}</h5>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{config.description}</p>

                  <div className="space-y-2">
                    <div className="bg-gray-50 dark:bg-gray-900 rounded p-2">
                      <p className="text-xs font-medium text-brand-slate dark:text-gray-400 mb-1">{t('toolRenderers.mckinsey7s.currentState')}</p>
                      <p className="text-xs text-brand-charcoal dark:text-gray-300">{element.current_state}</p>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-950/30 rounded p-2">
                      <p className="text-xs font-medium text-brand-gold dark:text-amber-400 mb-1">{t('toolRenderers.mckinsey7s.desiredState')}</p>
                      <p className="text-xs text-brand-charcoal dark:text-gray-300">{element.desired_state}</p>
                    </div>

                    <div className="bg-yellow-50 dark:bg-yellow-950/30 rounded p-2">
                      <p className="text-xs font-medium text-brand-warning dark:text-yellow-400 mb-1">{t('toolRenderers.mckinsey7s.gapAnalysis')}</p>
                      <p className="text-xs text-brand-charcoal dark:text-gray-300">{element.gap_analysis}</p>
                    </div>

                    <div className="bg-green-50 dark:bg-green-950/30 rounded p-2">
                      <p className="text-xs font-medium text-brand-success dark:text-green-400 mb-1">{t('toolRenderers.mckinsey7s.actionRequired')}</p>
                      <p className="text-xs text-brand-charcoal dark:text-gray-300">{element.action_required}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Soft Elements */}
        <div>
          <h4 className="text-sm font-semibold text-brand-slate dark:text-gray-400 mb-3">{t('toolRenderers.mckinsey7s.softElements')}</h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {softElements.map((element) => {
              const config = elementConfig[element.element];
              if (!config) return null;
              const Icon = config.icon;

              return (
                <div key={element.element} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className={`w-5 h-5 ${config.color}`} />
                    <h5 className="font-semibold text-brand-charcoal dark:text-gray-100">{element.element}</h5>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{config.description}</p>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-50 dark:bg-gray-900 rounded p-2">
                      <p className="text-xs font-medium text-brand-slate dark:text-gray-400 mb-1">{t('toolRenderers.mckinsey7s.current')}</p>
                      <p className="text-xs text-brand-charcoal dark:text-gray-300">{element.current_state}</p>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-950/30 rounded p-2">
                      <p className="text-xs font-medium text-brand-gold dark:text-amber-400 mb-1">{t('toolRenderers.mckinsey7s.desired')}</p>
                      <p className="text-xs text-brand-charcoal dark:text-gray-300">{element.desired_state}</p>
                    </div>
                  </div>

                  <div className="mt-2 bg-yellow-50 dark:bg-yellow-950/30 rounded p-2">
                    <p className="text-xs font-medium text-brand-warning dark:text-yellow-400 mb-1">{t('toolRenderers.mckinsey7s.gap')}</p>
                    <p className="text-xs text-brand-charcoal dark:text-gray-300">{element.gap_analysis}</p>
                  </div>

                  <div className="mt-2 bg-green-50 dark:bg-green-950/30 rounded p-2">
                    <p className="text-xs font-medium text-brand-success dark:text-green-400 mb-1">{t('toolRenderers.mckinsey7s.action')}</p>
                    <p className="text-xs text-brand-charcoal dark:text-gray-300">{element.action_required}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Critical Misalignments */}
      {data.critical_misalignments && data.critical_misalignments.length > 0 && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
          <h4 className="font-semibold text-brand-charcoal dark:text-gray-100 mb-2">{t('toolRenderers.mckinsey7s.criticalMisalignments')}</h4>
          <ul className="space-y-1">
            {data.critical_misalignments.map((misalignment, index) => (
              <li key={index} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-red-400 mt-1.5 flex-shrink-0" />
                <span className="text-sm text-brand-charcoal dark:text-gray-300">{misalignment}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
        <h4 className="font-semibold text-brand-charcoal dark:text-gray-100 mb-2">{t('toolRenderers.mckinsey7s.strategicRecommendations')}</h4>
        <p className="text-sm text-brand-charcoal dark:text-gray-300">{data.recommendations}</p>
      </div>
    </div>
  );
}
