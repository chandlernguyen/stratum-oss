/**
 * A/B Testing Framework Display Component
 *
 * Displays A/B testing recommendations and best practices for campaign optimization
 * Pattern: Structured guidance with testing methodologies
 *
 * Features:
 * - A/B test recommendations specific to campaign plan
 * - Statistical significance guidelines
 * - Test design best practices
 * - Sample size and duration estimates
 */

import { FlaskConical, TrendingUp, AlertCircle, CheckCircle, BarChart3, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { CampaignPlan } from '@/hooks/useCampaignPlanRecommendations';

interface ABTestingFrameworkDisplayProps {
  plan: CampaignPlan;
}

export function ABTestingFrameworkDisplay({ plan }: ABTestingFrameworkDisplayProps) {
  const recommendations = plan.ab_testing_recommendations;

  if (!recommendations || recommendations.length === 0) {
    return (
      <Card className="p-6 md:p-8 text-center">
        <FlaskConical className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-sm md:text-base text-brand-slate dark:text-gray-400">
          No A/B testing recommendations available for this plan
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header - Mobile optimized */}
      <div className="mb-4 md:mb-6">
        <h2 className="text-xl md:text-2xl font-bold text-brand-charcoal dark:text-gray-100 flex items-center gap-2 md:gap-3">
          <FlaskConical className="w-5 h-5 md:w-7 md:h-7 text-brand-gold" />
          A/B Testing Framework
        </h2>
        <p className="text-xs md:text-sm text-brand-slate dark:text-gray-400 mt-1 md:mt-2">
          Statistical test design for {plan.title}
        </p>
      </div>

      {/* Testing Principles - Mobile optimized */}
      <Alert className="border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/20">
        <AlertCircle className="h-4 w-4 text-brand-gold" />
        <AlertDescription className="text-xs md:text-sm text-brand-charcoal dark:text-gray-300">
          <strong>Statistical Significance Guidelines:</strong> Run tests until you reach 95% confidence level with at least 1000 conversions per variant. Avoid peeking at results early to prevent false positives.
        </AlertDescription>
      </Alert>

      {/* Test Recommendations - Mobile optimized */}
      <div>
        <h3 className="text-base md:text-lg font-semibold text-brand-charcoal dark:text-gray-100 mb-3 md:mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-brand-success" />
          Recommended Tests
        </h3>
        <div className="space-y-3 md:space-y-4">
          {recommendations.map((recommendation, index) => (
            <Card key={index} className="p-4 md:p-5 hover:shadow-lg transition-shadow border-l-4 border-l-amber-600">
              <div className="flex items-start gap-3 md:gap-4">
                <div className="flex-shrink-0">
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-slate-600 to-amber-600 flex items-center justify-center text-white font-bold text-xs md:text-sm shadow-lg">
                    {index + 1}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs md:text-sm text-brand-charcoal dark:text-gray-300 leading-relaxed">
                    {recommendation}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Testing Best Practices */}
      <div>
        <h3 className="text-lg font-semibold text-brand-charcoal dark:text-gray-100 mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-brand-info" />
          Testing Best Practices
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Sample Size */}
          <Card className="p-5 bg-slate-50 dark:bg-slate-900/20 border-2 border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-3">
              <Users className="w-5 h-5 text-brand-slate" />
              <h4 className="font-semibold text-brand-charcoal dark:text-gray-100">
                Sample Size
              </h4>
            </div>
            <ul className="space-y-2 text-sm text-brand-charcoal dark:text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-brand-info mt-1">•</span>
                <span>Minimum 1000 conversions per variant</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-info mt-1">•</span>
                <span>95% confidence level required</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-info mt-1">•</span>
                <span>Test duration: 1-2 weeks minimum</span>
              </li>
            </ul>
          </Card>

          {/* Test Design */}
          <Card className="p-5 bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800">
            <div className="flex items-center gap-3 mb-3">
              <BarChart3 className="w-5 h-5 text-brand-success" />
              <h4 className="font-semibold text-brand-charcoal dark:text-gray-100">
                Test Design
              </h4>
            </div>
            <ul className="space-y-2 text-sm text-brand-charcoal dark:text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-brand-success mt-1">•</span>
                <span>Test one variable at a time</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-success mt-1">•</span>
                <span>Split traffic 50/50 between variants</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-success mt-1">•</span>
                <span>Document hypothesis before testing</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>

      {/* Common Pitfalls */}
      <div>
        <h3 className="text-lg font-semibold text-brand-charcoal dark:text-gray-100 mb-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-brand-warning" />
          Common Pitfalls to Avoid
        </h3>
        <Card className="p-5 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800">
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="text-brand-warning mt-1 text-lg">⚠</span>
              <div>
                <p className="font-semibold text-brand-charcoal dark:text-gray-100 text-sm">
                  Peeking at Results Early
                </p>
                <p className="text-xs text-brand-slate dark:text-gray-400 mt-1">
                  Wait until you reach statistical significance before drawing conclusions. Early peeking inflates false positive rates.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-brand-warning mt-1 text-lg">⚠</span>
              <div>
                <p className="font-semibold text-brand-charcoal dark:text-gray-100 text-sm">
                  Testing Too Many Variables
                </p>
                <p className="text-xs text-brand-slate dark:text-gray-400 mt-1">
                  Multivariate tests require exponentially larger sample sizes. Start with single-variable tests.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-brand-warning mt-1 text-lg">⚠</span>
              <div>
                <p className="font-semibold text-brand-charcoal dark:text-gray-100 text-sm">
                  Ignoring Seasonality
                </p>
                <p className="text-xs text-brand-slate dark:text-gray-400 mt-1">
                  Run tests for full weeks to account for day-of-week variations. Avoid testing during holidays or special events.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-brand-warning mt-1 text-lg">⚠</span>
              <div>
                <p className="font-semibold text-brand-charcoal dark:text-gray-100 text-sm">
                  Insufficient Sample Size
                </p>
                <p className="text-xs text-brand-slate dark:text-gray-400 mt-1">
                  Small sample sizes lead to unreliable results. Calculate required sample size before starting.
                </p>
              </div>
            </li>
          </ul>
        </Card>
      </div>

      {/* Test Prioritization */}
      <div>
        <h3 className="text-lg font-semibold text-brand-charcoal dark:text-gray-100 mb-4">
          Test Prioritization
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-5 text-center border-2 border-green-200 dark:border-green-800">
            <Badge className="bg-green-600 text-white mb-3">High Priority</Badge>
            <p className="text-sm text-brand-charcoal dark:text-gray-300">
              Tests with high potential impact on primary conversion goal
            </p>
          </Card>
          <Card className="p-5 text-center border-2 border-yellow-200 dark:border-yellow-800">
            <Badge className="bg-yellow-600 text-white mb-3">Medium Priority</Badge>
            <p className="text-sm text-brand-charcoal dark:text-gray-300">
              Tests optimizing secondary metrics and engagement
            </p>
          </Card>
          <Card className="p-5 text-center border-2 border-slate-200 dark:border-slate-800">
            <Badge className="bg-slate-600 text-white mb-3">Low Priority</Badge>
            <p className="text-sm text-brand-charcoal dark:text-gray-300">
              Minor UI/UX improvements with limited expected impact
            </p>
          </Card>
        </div>
      </div>

      {/* Success Metrics */}
      <Alert className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
        <CheckCircle className="h-4 w-4 text-brand-success" />
        <AlertDescription className="text-sm text-brand-charcoal dark:text-gray-300">
          <strong>Success Criteria:</strong> A test is successful when it achieves 95% statistical significance with a meaningful lift (typically 10%+ improvement). Document all test results, both winners and losers, for future reference.
        </AlertDescription>
      </Alert>
    </div>
  );
}
