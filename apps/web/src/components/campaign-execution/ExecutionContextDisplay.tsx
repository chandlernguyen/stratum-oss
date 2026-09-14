/**
 * Execution Context Display Component
 *
 * Displays execution readiness, prerequisites, and risk factors for campaign deployment
 * Pattern: Readiness assessment with actionable checklist
 *
 * Features:
 * - Prerequisites checklist
 * - Risk factor analysis
 * - Readiness score calculation
 * - Mitigation strategies
 * - Resource requirements
 */

import { Shield, CheckCircle, AlertTriangle, XCircle, Info, TrendingUp, Users, DollarSign } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { usePrerequisiteCompletion } from '@/hooks/usePrerequisiteCompletion';
import type { CampaignPlan } from '@/hooks/useCampaignPlanRecommendations';

interface ExecutionContextDisplayProps {
  plan: CampaignPlan;
}

export function ExecutionContextDisplay({ plan }: ExecutionContextDisplayProps) {
  // Use prerequisite completion hook for dynamic readiness tracking
  const {
    completedItems,
    togglePrerequisite,
    readinessScore,
    completionRate
  } = usePrerequisiteCompletion(plan.id, plan.prerequisites || []);

  // Check if we have various data
  const hasPrerequisites = plan.prerequisites && plan.prerequisites.length > 0;
  const hasRiskFactors = plan.risk_factors && plan.risk_factors.length > 0;

  const getReadinessColor = (score: number) => {
    if (score >= 75) return 'text-green-600 bg-green-50 dark:bg-green-900/20 border-green-600';
    if (score >= 50) return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-600';
    return 'text-red-600 bg-red-50 dark:bg-red-900/20 border-red-600';
  };

  const getReadinessLabel = (score: number) => {
    if (score >= 75) return 'Ready to Deploy';
    if (score >= 50) return 'Needs Preparation';
    return 'High Risk';
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header - Mobile optimized */}
      <div className="mb-4 md:mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-brand-charcoal dark:text-gray-100 flex items-center gap-2 md:gap-3">
          <Shield className="w-5 h-5 md:w-7 md:h-7 text-brand-gold" />
          Execution Context & Readiness
        </h2>
        <p className="text-xs md:text-sm text-brand-slate dark:text-gray-400 mt-1 md:mt-2">
          Assessment for {plan.title}
        </p>
      </div>

      {/* Readiness Score - Mobile optimized */}
      <Card className={`p-4 md:p-6 border-2 ${getReadinessColor(readinessScore)}`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4">
          <div>
            <h3 className="text-base md:text-lg font-semibold text-brand-charcoal dark:text-gray-100 mb-1">
              Deployment Readiness
            </h3>
            <Badge className={`text-xs md:text-sm ${readinessScore >= 75 ? 'bg-green-600 text-white' : readinessScore >= 50 ? 'bg-yellow-600 text-white' : 'bg-red-600 text-white'}`}>
              {getReadinessLabel(readinessScore)}
            </Badge>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-3xl md:text-4xl font-bold text-brand-charcoal dark:text-gray-100">
              {readinessScore}%
            </div>
            <p className="text-xs text-brand-slate dark:text-gray-400">Readiness Score</p>
          </div>
        </div>
        <Progress value={readinessScore} className="h-2 md:h-3" />
        <p className="text-xs md:text-sm text-brand-slate dark:text-gray-400 mt-3">
          {readinessScore >= 75 && 'All prerequisites met. This campaign is ready for deployment.'}
          {readinessScore >= 50 && readinessScore < 75 && 'Some preparation needed before deployment. Review prerequisites and risk factors.'}
          {readinessScore < 50 && 'Significant preparation required. Address critical prerequisites and high-risk factors first.'}
        </p>
      </Card>

      {/* ICE Score Breakdown - Mobile optimized */}
      <div>
        <h3 className="text-base md:text-lg font-semibold text-brand-charcoal dark:text-gray-100 mb-3 md:mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-brand-gold" />
          ICE Score Analysis
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          <Card className="p-4 md:p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-brand-slate dark:text-gray-400">Impact</p>
              <Badge variant={plan.impact === 'High' ? 'default' : 'secondary'}>
                {plan.impact}
              </Badge>
            </div>
            <p className="text-xs text-brand-slate dark:text-gray-400">
              Expected business impact on key metrics
            </p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-brand-slate dark:text-gray-400">Confidence</p>
              <Badge variant={plan.confidence === 'High' ? 'default' : 'secondary'}>
                {plan.confidence}
              </Badge>
            </div>
            <p className="text-xs text-brand-slate dark:text-gray-400">
              Certainty in achieving expected results
            </p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-brand-slate dark:text-gray-400">Ease</p>
              <Badge variant={plan.ease === 'High' ? 'default' : 'secondary'}>
                {plan.ease}
              </Badge>
            </div>
            <p className="text-xs text-brand-slate dark:text-gray-400">
              Implementation difficulty and resource needs
            </p>
          </Card>
        </div>
        <Alert className="mt-4 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/20">
          <Info className="h-4 w-4 text-brand-slate" />
          <AlertDescription className="text-sm text-brand-charcoal dark:text-gray-300">
            <strong>ICE Score: {plan.ice_score.toFixed(1)}/10</strong> - This score prioritizes campaigns based on Impact × Confidence × Ease. Scores above 7.0 are considered high-priority opportunities.
          </AlertDescription>
        </Alert>
      </div>

      {/* Prerequisites Checklist */}
      {hasPrerequisites && (
        <div>
          <h3 className="text-lg font-semibold text-brand-charcoal dark:text-gray-100 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Prerequisites Checklist
          </h3>
          <Card className="p-5">
            <ul className="space-y-3">
              {plan.prerequisites.map((prereq, index) => {
                const isCompleted = completedItems.has(prereq);

                return (
                  <li
                    key={index}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg transition-all duration-200",
                      "hover:bg-gray-100 dark:hover:bg-gray-700",
                      isCompleted ? "bg-green-50 dark:bg-green-900/20" : "bg-gray-50 dark:bg-gray-800"
                    )}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <Checkbox
                        checked={isCompleted}
                        onCheckedChange={() => togglePrerequisite(prereq)}
                        className={cn(
                          isCompleted && "data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                        )}
                      />
                    </div>
                    <div
                      className={cn(
                        "flex-1 text-sm select-none",
                        isCompleted
                          ? "line-through text-gray-500 dark:text-gray-400"
                          : "text-brand-charcoal dark:text-gray-300"
                      )}
                    >
                      {prereq}
                    </div>
                    {isCompleted && (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
                        ✓ Done
                      </Badge>
                    )}
                  </li>
                );
              })}
            </ul>

            {/* Dynamic Progress Indicator */}
            <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900/20 rounded-lg border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-brand-slate dark:text-gray-400">
                  Prerequisites Progress
                </span>
                <span className="text-sm font-bold text-brand-charcoal dark:text-gray-100">
                  {completedItems.size} / {plan.prerequisites.length}
                </span>
              </div>
              <Progress value={completionRate * 100} className="h-2" />
              <p className="text-xs text-brand-slate dark:text-gray-400 mt-2">
                {completionRate === 1
                  ? "All prerequisites completed! You're ready to proceed."
                  : `Complete ${plan.prerequisites.length - completedItems.size} more to unlock framework generation.`}
              </p>
            </div>

            <Alert className="mt-4 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-sm text-brand-charcoal dark:text-gray-300">
                <strong>Tip:</strong> Click on checkboxes to track your progress. Your completion state is saved automatically.
              </AlertDescription>
            </Alert>
          </Card>
        </div>
      )}

      {/* Risk Factors & Mitigation */}
      {hasRiskFactors && (
        <div>
          <h3 className="text-lg font-semibold text-brand-charcoal dark:text-gray-100 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            Risk Factors & Mitigation
          </h3>
          <div className="space-y-3">
            {plan.risk_factors.map((risk, index) => (
              <Card key={index} className="p-5 border-l-4 border-l-yellow-600">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-brand-charcoal dark:text-gray-100 mb-2">
                      Risk #{index + 1}
                    </p>
                    <p className="text-sm text-brand-charcoal dark:text-gray-300">
                      {risk}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <Alert className="mt-4 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-sm text-brand-charcoal dark:text-gray-300">
              <strong>Risk Mitigation:</strong> Document contingency plans for each risk factor. Monitor early indicators and be prepared to adjust strategy if risks materialize.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Resource Requirements */}
      <div>
        <h3 className="text-lg font-semibold text-brand-charcoal dark:text-gray-100 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-amber-600" />
          Resource Requirements
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-5 bg-slate-50 dark:bg-slate-900/20 border-2 border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-3">
              <Users className="w-5 h-5 text-amber-600" />
              <h4 className="font-semibold text-brand-charcoal dark:text-gray-100">Team</h4>
            </div>
            <p className="text-sm text-brand-charcoal dark:text-gray-300">
              Based on campaign complexity ({plan.ease} ease rating), estimated team size:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-brand-charcoal dark:text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-amber-600">•</span>
                <span>{plan.ease === 'High' ? '1-2 team members' : plan.ease === 'Medium' ? '2-3 team members' : '3-5 team members'}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600">•</span>
                <span>Marketing strategist/coordinator</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-600">•</span>
                <span>Content creator (if applicable)</span>
              </li>
              {plan.channels.some(c => c.toLowerCase().includes('paid') || c.toLowerCase().includes('ads')) && (
                <li className="flex items-start gap-2">
                  <span className="text-amber-600">•</span>
                  <span>Paid media specialist</span>
                </li>
              )}
            </ul>
          </Card>

          <Card className="p-5 bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-3 mb-3">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <h4 className="font-semibold text-brand-charcoal dark:text-gray-100">Timeline</h4>
            </div>
            <p className="text-sm text-brand-charcoal dark:text-gray-300 mb-2">
              Estimated campaign duration:
            </p>
            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
              <p className="text-lg font-bold text-brand-charcoal dark:text-gray-100">
                {plan.estimated_duration}
              </p>
              <p className="text-xs text-brand-slate dark:text-gray-400 mt-1">
                {plan.campaign_type === 'awareness' && 'Brand building takes time to show results'}
                {plan.campaign_type === 'consideration' && 'Allow time for audience education'}
                {plan.campaign_type === 'conversion' && 'Results typically visible within first month'}
                {plan.campaign_type === 'retention' && 'Ongoing optimization recommended'}
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Deployment Recommendation */}
      <Alert className={`border-2 ${readinessScore >= 75 ? 'border-green-600 bg-green-50 dark:bg-green-900/20' : readinessScore >= 50 ? 'border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' : 'border-red-600 bg-red-50 dark:bg-red-900/20'}`}>
        {readinessScore >= 75 ? (
          <>
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-sm text-brand-charcoal dark:text-gray-300">
              <strong>Recommendation: Proceed with Deployment</strong> - This campaign has a high readiness score ({readinessScore}%) and strong ICE score ({plan.ice_score.toFixed(1)}/10). All prerequisites should be reviewed and confirmed before launch.
            </AlertDescription>
          </>
        ) : readinessScore >= 50 ? (
          <>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-sm text-brand-charcoal dark:text-gray-300">
              <strong>Recommendation: Prepare Before Deployment</strong> - Complete all prerequisites and develop mitigation strategies for identified risk factors. Consider piloting on a small scale first.
            </AlertDescription>
          </>
        ) : (
          <>
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-sm text-brand-charcoal dark:text-gray-300">
              <strong>Recommendation: Defer Deployment</strong> - Significant preparation needed. Address critical prerequisites and high-risk factors before proceeding. Consider consulting with the agent for a revised plan.
            </AlertDescription>
          </>
        )}
      </Alert>
    </div>
  );
}
