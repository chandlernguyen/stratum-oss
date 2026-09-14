/**
 * Deployment Framework Display Component
 *
 * Displays detailed deployment phases, channels, and timeline for a campaign plan
 * Pattern: Structured visualization with phase-by-phase breakdown
 *
 * Features:
 * - Phase breakdown with activities and success criteria
 * - Channel allocation with budget distribution
 * - Timeline milestones with deliverables
 * - Visual progress indicators
 */

import { Calendar, Target, TrendingUp, CheckCircle, Activity, DollarSign } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { CampaignPlan } from '@/hooks/useCampaignPlanRecommendations';
import { useLocale } from '@/hooks/useLocale';
import { getIntlLocale } from '@/lib/locales';

interface DeploymentFrameworkDisplayProps {
  plan: CampaignPlan;
}

export function DeploymentFrameworkDisplay({ plan }: DeploymentFrameworkDisplayProps) {
  const { locale } = useLocale();
  const intlLocale = getIntlLocale(locale);
  const framework = plan.deployment_framework;

  if (!framework) {
    return (
      <Card className="p-6 md:p-8 text-center">
        <Activity className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-sm md:text-base text-brand-slate dark:text-gray-400">
          No deployment framework available for this plan
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header - Mobile optimized */}
      <div className="mb-4 md:mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-brand-charcoal dark:text-gray-100 flex items-center gap-2 md:gap-3">
          <Activity className="w-5 h-5 md:w-7 md:h-7 text-brand-warning" />
          Deployment Framework
        </h2>
        <p className="text-xs md:text-sm text-brand-slate dark:text-gray-400 mt-1 md:mt-2">
          Phase-by-phase execution plan for {plan.title}
        </p>
      </div>

      {/* Timeline Overview - Mobile optimized */}
      {framework.timeline && (
        <Card className="p-4 md:p-6 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-2 border-brand-gold dark:border-amber-700">
          <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
            <Calendar className="w-4 h-4 md:w-5 md:h-5 text-brand-gold" />
            <h3 className="text-base md:text-lg font-semibold text-brand-charcoal dark:text-gray-100">
              Campaign Timeline
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            <div>
              <p className="text-xs text-brand-slate dark:text-gray-400 mb-1">Start Date</p>
              <p className="text-sm font-semibold text-brand-charcoal dark:text-gray-100">
                {new Date(framework.timeline.start_date).toLocaleDateString(intlLocale)}
              </p>
            </div>
            <div>
              <p className="text-xs text-brand-slate dark:text-gray-400 mb-1">End Date</p>
              <p className="text-sm font-semibold text-brand-charcoal dark:text-gray-100">
                {new Date(framework.timeline.end_date).toLocaleDateString(intlLocale)}
              </p>
            </div>
            <div>
              <p className="text-xs text-brand-slate dark:text-gray-400 mb-1">Duration</p>
              <p className="text-sm font-semibold text-brand-charcoal dark:text-gray-100">
                {plan.estimated_duration}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Deployment Phases - Mobile optimized */}
      {framework.phases && framework.phases.length > 0 && (
        <div>
          <h3 className="text-base md:text-lg font-semibold text-brand-charcoal dark:text-gray-100 mb-3 md:mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-brand-info" />
            Deployment Phases
          </h3>
          <div className="space-y-3 md:space-y-4">
            {framework.phases.map((phase, index) => (
              <Card key={index} className="p-4 md:p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-3 md:gap-4">
                  {/* Phase Number */}
                  <div className="flex-shrink-0">
                    <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-slate-600 to-amber-600 flex items-center justify-center text-white font-bold shadow-lg text-sm md:text-base">
                      {index + 1}
                    </div>
                  </div>

                  {/* Phase Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-3">
                      <h4 className="text-base md:text-lg font-semibold text-brand-charcoal dark:text-gray-100">
                        {phase.name}
                      </h4>
                      <Badge variant="outline" className="border-slate-600 text-brand-slate text-xs md:text-sm w-fit">
                        {phase.duration}
                      </Badge>
                    </div>

                    {/* Activities */}
                    {phase.activities && phase.activities.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-semibold text-brand-slate dark:text-gray-400 mb-2">
                          Activities
                        </p>
                        <ul className="space-y-1.5">
                          {phase.activities.map((activity, actIdx) => (
                            <li key={actIdx} className="text-sm text-brand-charcoal dark:text-gray-300 flex items-start gap-2">
                              <span className="text-brand-info mt-1">•</span>
                              <span>{activity}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Success Criteria */}
                    {phase.success_criteria && phase.success_criteria.length > 0 && (
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <p className="text-xs font-semibold text-brand-success dark:text-green-400 mb-2 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Success Criteria
                        </p>
                        <ul className="space-y-1">
                          {phase.success_criteria.map((criterion, critIdx) => (
                            <li key={critIdx} className="text-xs text-brand-success dark:text-green-300 flex items-start gap-1.5">
                              <span className="text-brand-success mt-0.5">✓</span>
                              <span>{criterion}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Channel Allocation - Mobile optimized */}
      {framework.channels && framework.channels.length > 0 && (
        <div>
          <h3 className="text-base md:text-lg font-semibold text-brand-charcoal dark:text-gray-100 mb-3 md:mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 md:w-5 md:h-5 text-brand-success" />
            Channel Budget Allocation
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {framework.channels.map((channel, index) => (
              <Card key={index} className="p-4 md:p-5 hover:shadow-lg transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-0 mb-3">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 md:w-5 md:h-5 text-brand-gold" />
                    <h4 className="text-sm md:text-base font-semibold text-brand-charcoal dark:text-gray-100">
                      {channel.name}
                    </h4>
                  </div>
                  <Badge className="bg-green-600 text-white text-xs md:text-sm w-fit">
                    {channel.budget_allocation}
                  </Badge>
                </div>

                {/* Budget Progress Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-brand-slate dark:text-gray-400">Budget Share</span>
                    <span className="text-xs font-semibold text-brand-charcoal dark:text-gray-100">
                      {channel.budget_allocation}
                    </span>
                  </div>
                  <Progress
                    value={parseInt(channel.budget_allocation.replace(/[^0-9]/g, '')) || 25}
                    className="h-2"
                  />
                </div>

                {/* Key Tactics */}
                {channel.key_tactics && channel.key_tactics.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-brand-slate dark:text-gray-400 mb-2">
                      Key Tactics
                    </p>
                    <ul className="space-y-1">
                      {channel.key_tactics.map((tactic, tacticIdx) => (
                        <li key={tacticIdx} className="text-xs text-brand-charcoal dark:text-gray-300 flex items-start gap-1.5">
                          <span className="text-brand-gold mt-0.5">→</span>
                          <span>{tactic}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Timeline Milestones - Mobile optimized */}
      {framework.timeline?.milestones && framework.timeline.milestones.length > 0 && (
        <div>
          <h3 className="text-base md:text-lg font-semibold text-brand-charcoal dark:text-gray-100 mb-3 md:mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 md:w-5 md:h-5 text-brand-gold" />
            Key Milestones
          </h3>
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-3 md:left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-brand-gold to-amber-600" />

            {/* Milestones */}
            <div className="space-y-3 md:space-y-4">
              {framework.timeline.milestones.map((milestone, index) => (
                <div key={index} className="relative pl-10 md:pl-12">
                  {/* Milestone Dot */}
                  <div className="absolute left-0 top-1">
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-brand-gold to-amber-400 flex items-center justify-center shadow-lg">
                      <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-white" />
                    </div>
                  </div>

                  {/* Milestone Content */}
                  <Card className="p-3 md:p-4 hover:shadow-md transition-shadow">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                      <h4 className="text-sm md:text-base font-semibold text-brand-charcoal dark:text-gray-100">
                        {milestone.name}
                      </h4>
                      <Badge variant="outline" className="text-xs w-fit">
                        {new Date(milestone.date).toLocaleDateString(intlLocale)}
                      </Badge>
                    </div>
                    <p className="text-xs md:text-sm text-brand-slate dark:text-gray-400">
                      {milestone.deliverable}
                    </p>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
