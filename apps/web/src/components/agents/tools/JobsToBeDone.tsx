import { Wrench, Heart, Users, Target, Lightbulb, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface JobToBeDone {
  job_statement: string;
  functional_aspects: string[];
  emotional_aspects: string[];
  social_aspects: string[];
  current_solutions: string[];
  opportunity_score: number;
}

interface JobsToBeDone {
  context: string;
  primary_jobs: JobToBeDone[];
  underserved_jobs: string[];
  innovation_opportunities: string;
}

interface JobsToBeDoneProps {
  data: JobsToBeDone;
}

export function JobsToBeDone({ data }: JobsToBeDoneProps) {
  const { t } = useTranslation('agents');

  const getOpportunityColor = (score: number) => {
    if (score >= 8) return 'text-brand-success dark:text-green-400 bg-green-100 dark:bg-green-900/30';
    if (score >= 6) return 'text-brand-gold dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30';
    if (score >= 4) return 'text-brand-warning dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
    return 'text-brand-slate dark:text-gray-400 bg-gray-100 dark:bg-gray-800';
  };

  const getOpportunityLabel = (score: number) => {
    if (score >= 8) return t('toolRenderers.jtbd.highOpportunity');
    if (score >= 6) return t('toolRenderers.jtbd.goodOpportunity');
    if (score >= 4) return t('toolRenderers.jtbd.moderateOpportunity');
    return t('toolRenderers.jtbd.lowOpportunity');
  };

  return (
    <div className="w-full my-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-slate-100 dark:bg-slate-900/30 rounded-lg">
          <Wrench className="w-5 h-5 text-brand-gold dark:text-amber-400" />
        </div>
        <h3 className="text-xl font-semibold text-brand-charcoal dark:text-gray-100">{t('toolRenderers.jtbd.title')}</h3>
      </div>

      {/* Context */}
      {data.context && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-sm text-brand-charcoal dark:text-gray-300">{data.context}</p>
        </div>
      )}

      {/* Primary Jobs */}
      {data.primary_jobs && data.primary_jobs.length > 0 && (
        <div className="mb-6">
          <h4 className="font-semibold text-brand-charcoal dark:text-gray-100 mb-3">{t('toolRenderers.jtbd.primaryJobs')}</h4>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {data.primary_jobs.map((job, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Job Header with Opportunity Score */}
                <div className="bg-gradient-to-r from-slate-50 to-amber-50 dark:from-slate-900/20 dark:to-amber-900/20 p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-start justify-between mb-2">
                    <h5 className="font-semibold text-brand-charcoal dark:text-gray-100 text-sm">{t('toolRenderers.jtbd.job', { number: index + 1 })}</h5>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getOpportunityColor(job.opportunity_score)}`}>
                      {getOpportunityLabel(job.opportunity_score)} ({job.opportunity_score}/10)
                    </span>
                  </div>
                  <p className="text-sm text-brand-charcoal dark:text-gray-300 italic">{job.job_statement}</p>
                </div>

                <div className="p-4 space-y-4">
                  {/* Functional Aspects */}
                  {job.functional_aspects && job.functional_aspects.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-brand-gold dark:text-amber-400" />
                        <h6 className="text-xs font-semibold text-brand-charcoal dark:text-gray-300">{t('toolRenderers.jtbd.functional')}</h6>
                      </div>
                      <ul className="space-y-1">
                        {job.functional_aspects.map((aspect, i) => (
                          <li key={i} className="text-xs text-brand-slate dark:text-gray-400 pl-6">• {aspect}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Emotional Aspects */}
                  {job.emotional_aspects && job.emotional_aspects.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Heart className="w-4 h-4 text-brand-error dark:text-red-400" />
                        <h6 className="text-xs font-semibold text-brand-charcoal dark:text-gray-300">{t('toolRenderers.jtbd.emotional')}</h6>
                      </div>
                      <ul className="space-y-1">
                        {job.emotional_aspects.map((aspect, i) => (
                          <li key={i} className="text-xs text-brand-slate dark:text-gray-400 pl-6">• {aspect}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Social Aspects */}
                  {job.social_aspects && job.social_aspects.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-brand-gold dark:text-amber-400" />
                        <h6 className="text-xs font-semibold text-brand-charcoal dark:text-gray-300">{t('toolRenderers.jtbd.social')}</h6>
                      </div>
                      <ul className="space-y-1">
                        {job.social_aspects.map((aspect, i) => (
                          <li key={i} className="text-xs text-brand-slate dark:text-gray-400 pl-6">• {aspect}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Current Solutions */}
                  {job.current_solutions && job.current_solutions.length > 0 && (
                    <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
                      <h6 className="text-xs font-semibold text-brand-charcoal dark:text-gray-300 mb-2">{t('toolRenderers.jtbd.currentSolutions')}</h6>
                      <div className="flex flex-wrap gap-1">
                        {job.current_solutions.map((solution, i) => (
                          <span key={i} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-xs text-brand-slate dark:text-gray-400 rounded">
                            {solution}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Underserved Jobs */}
      {data.underserved_jobs && data.underserved_jobs.length > 0 && (
        <div className="mb-6">
          <div className="p-4 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <h4 className="font-semibold text-brand-charcoal dark:text-gray-100 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-brand-warning dark:text-yellow-400" />
              {t('toolRenderers.jtbd.underservedJobs')}
            </h4>
            <ul className="space-y-2">
              {data.underserved_jobs.map((job, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-brand-warning dark:text-yellow-400 mt-0.5">•</span>
                  <span className="text-sm text-brand-charcoal dark:text-gray-300">{job}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Innovation Opportunities */}
      {data.innovation_opportunities && (
        <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
          <h4 className="font-semibold text-brand-charcoal dark:text-gray-100 mb-2 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-brand-success dark:text-green-400" />
            {t('toolRenderers.jtbd.innovationOpportunities')}
          </h4>
          <p className="text-sm text-brand-charcoal dark:text-gray-300">{data.innovation_opportunities}</p>
        </div>
      )}
    </div>
  );
}
