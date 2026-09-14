import { Target, TrendingUp, CheckCircle, Clock, Users, Building } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface OKRItem {
  objective: string;
  key_results: string[];
  time_frame: string;
  owner: string;
  strategic_alignment: string;
}

interface OKRFramework {
  context: string;
  company_okrs: OKRItem[];
  team_okrs: OKRItem[];
  success_metrics: string;
  review_cadence: string;
}

interface OKRFrameworkProps {
  data: OKRFramework;
}

export function OKRFramework({ data }: OKRFrameworkProps) {
  const { t } = useTranslation('agents');

  return (
    <div className="w-full my-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-slate-100 dark:bg-slate-900/30 rounded-lg">
          <Target className="w-5 h-5 text-brand-gold dark:text-amber-400" />
        </div>
        <h3 className="text-xl font-semibold text-brand-charcoal dark:text-gray-100">{t('toolRenderers.okr.title')}</h3>
      </div>

      {/* Context */}
      {data.context && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-sm text-brand-charcoal dark:text-gray-300">{data.context}</p>
        </div>
      )}

      {/* Success Metrics and Review Cadence */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
          <p className="text-xs font-semibold text-brand-success dark:text-green-400 mb-1">{t('toolRenderers.okr.successMetrics')}</p>
          <p className="text-sm text-brand-charcoal dark:text-gray-300">{data.success_metrics}</p>
        </div>
        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
          <p className="text-xs font-semibold text-brand-info dark:text-amber-400 mb-1">{t('toolRenderers.okr.reviewCadence')}</p>
          <p className="text-sm text-brand-charcoal dark:text-gray-300">{data.review_cadence}</p>
        </div>
      </div>

      {/* Company OKRs */}
      {data.company_okrs && data.company_okrs.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Building className="w-5 h-5 text-brand-gold dark:text-amber-400" />
            <h4 className="font-semibold text-brand-charcoal dark:text-gray-100">{t('toolRenderers.okr.companyOkrs')}</h4>
          </div>
          <div className="space-y-4">
            {data.company_okrs.map((okr, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Objective Header */}
                <div className="bg-gradient-to-r from-slate-50 to-amber-50 dark:from-slate-900/20 dark:to-amber-900/20 p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-5 h-5 text-brand-gold dark:text-amber-400" />
                        <h4 className="font-semibold text-brand-charcoal dark:text-gray-100">
                          {t('toolRenderers.okr.objective', { number: index + 1 })}
                        </h4>
                      </div>
                      <p className="text-brand-charcoal dark:text-gray-300">{okr.objective}</p>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="flex gap-4 mt-3 text-xs">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                      <span className="text-brand-slate dark:text-gray-400">{t('toolRenderers.okr.timeFrame', { value: okr.time_frame })}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-brand-slate dark:text-gray-400">{t('toolRenderers.okr.owner', { value: okr.owner })}</span>
                    </div>
                  </div>
                </div>

                {/* Key Results */}
                <div className="p-4">
                  <h5 className="font-semibold text-sm text-brand-charcoal dark:text-gray-100 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-brand-gold dark:text-amber-400" />
                    {t('toolRenderers.okr.keyResults')}
                  </h5>
                  <div className="space-y-3">
                    {okr.key_results.map((kr, krIndex) => (
                      <div key={krIndex} className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          <CheckCircle className="w-4 h-4 text-brand-success dark:text-green-400" />
                        </div>
                        <p className="text-sm text-brand-charcoal dark:text-gray-300">{kr}</p>
                      </div>
                    ))}
                  </div>

                  {/* Strategic Alignment */}
                  {okr.strategic_alignment && (
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                      <h5 className="text-xs font-semibold text-brand-charcoal dark:text-gray-300 mb-1">{t('toolRenderers.okr.strategicAlignment')}</h5>
                      <p className="text-sm text-brand-slate dark:text-gray-400">{okr.strategic_alignment}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team OKRs */}
      {data.team_okrs && data.team_okrs.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-brand-gold dark:text-amber-400" />
            <h4 className="font-semibold text-brand-charcoal dark:text-gray-100">{t('toolRenderers.okr.teamOkrs')}</h4>
          </div>
          <div className="space-y-4">
            {data.team_okrs.map((okr, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Objective Header */}
                <div className="bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-5 h-5 text-brand-gold dark:text-amber-400" />
                        <h4 className="font-semibold text-brand-charcoal dark:text-gray-100">
                          {t('toolRenderers.okr.teamObjective', { number: index + 1 })}
                        </h4>
                      </div>
                      <p className="text-brand-charcoal dark:text-gray-300">{okr.objective}</p>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="flex gap-4 mt-3 text-xs">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                      <span className="text-brand-slate dark:text-gray-400">{t('toolRenderers.okr.timeFrame', { value: okr.time_frame })}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-brand-slate dark:text-gray-400">{t('toolRenderers.okr.owner', { value: okr.owner })}</span>
                    </div>
                  </div>
                </div>

                {/* Key Results */}
                <div className="p-4">
                  <h5 className="font-semibold text-sm text-brand-charcoal dark:text-gray-100 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-brand-gold dark:text-amber-400" />
                    {t('toolRenderers.okr.keyResults')}
                  </h5>
                  <div className="space-y-3">
                    {okr.key_results.map((kr, krIndex) => (
                      <div key={krIndex} className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          <CheckCircle className="w-4 h-4 text-brand-success dark:text-green-400" />
                        </div>
                        <p className="text-sm text-brand-charcoal dark:text-gray-300">{kr}</p>
                      </div>
                    ))}
                  </div>

                  {/* Strategic Alignment */}
                  {okr.strategic_alignment && (
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                      <h5 className="text-xs font-semibold text-brand-charcoal dark:text-gray-300 mb-1">{t('toolRenderers.okr.strategicAlignment')}</h5>
                      <p className="text-sm text-brand-slate dark:text-gray-400">{okr.strategic_alignment}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
