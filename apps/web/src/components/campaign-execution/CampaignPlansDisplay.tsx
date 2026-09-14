/**
 * Campaign Plans Display Component
 *
 * Displays auto-generated campaign plan recommendations with ICE scoring
 * Pattern: Adapted from QuickWinsAgent.tsx opportunities display
 *
 * Features:
 * - ICE score-based ranking (Impact × Confidence × Ease)
 * - Campaign type categorization (awareness, consideration, conversion, retention)
 * - Channel breakdown and duration estimates
 * - Expected outcomes and prerequisites
 * - Risk factor analysis
 */

import { useTranslation } from 'react-i18next';
import { TrendingUp, Target, Calendar, Users, CheckCircle, AlertTriangle, Rocket, BarChart3, Save } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCampaignPlanRecommendations, type CampaignPlan } from '@/hooks/useCampaignPlanRecommendations';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '@/lib/api';
import { getLocaleHeaders } from '@/lib/apiHeaders';
import { useClientBySlug } from '@/hooks/data/useClients';
import { useUserIdentity } from '@/hooks/data/useUserIdentity';
import { useClientContext } from '@/contexts/ClientContext';

interface CampaignPlansDisplayProps {
  onOpenChat?: () => void;
  onSelectPlan?: (plan: CampaignPlan) => void;
}

export function CampaignPlansDisplay({ onOpenChat, onSelectPlan }: CampaignPlansDisplayProps) {
  const { t } = useTranslation('agents');
  // Get client context for agency users
  const { clientSlug: clientSlugBranded } = useClientContext();
  const clientSlug = clientSlugBranded || undefined;
  const { data: client } = useClientBySlug(clientSlug);
  const { data: identity } = useUserIdentity();
  const isAgency = identity?.organization?.type === 'AGENCY';
  const clientId = isAgency ? client?.id : null;
  // Auto-load campaign plan recommendations on component mount
  const { data: plansResponse, isLoading: loadingPlans } = useCampaignPlanRecommendations({ clientSlug });
  const queryClient = useQueryClient();
  const [savingPlanIds, setSavingPlanIds] = useState<Set<string>>(new Set());

  const plans = plansResponse?.plans || [];
  const needsSetup = plansResponse?.needs_setup;
  const needsClarification = plansResponse?.needs_clarification;
  const cacheHit = plansResponse?.cache_hit;
  const generationTime = plansResponse?.generation_time_ms;

  const handleSavePlan = async (plan: CampaignPlan) => {
    setSavingPlanIds(prev => new Set(prev).add(plan.id));

    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        toast.error('Authentication required. Please sign in.');
        return;
      }

      // Call new backend endpoint for dual-write (agent_outputs + campaigns)
      const response = await fetch(`${API_BASE_URL}/api/v1/campaign-plans/save`, {
        method: 'POST',
        headers: getLocaleHeaders({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }),
        body: JSON.stringify({
          plan,
          ...(clientId && { client_id: clientId }) // Include client_id for agency users
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to save campaign plan');
      }

      const result = await response.json();

      if (result.success) {
        toast.success(`Campaign plan "${plan.title}" saved successfully!`, {
          description: 'Plan is now visible in your intelligence sidebar and campaigns list'
        });

        // Invalidate queries to refresh both outputs and campaigns lists
        queryClient.invalidateQueries({ queryKey: ['outputs-hub'] });
        queryClient.invalidateQueries({ queryKey: ['campaigns'] });
        queryClient.invalidateQueries({ queryKey: ['agent-outputs'] });

        console.log(`[CampaignPlansDisplay] Saved plan with output_id=${result.output_id}, campaign_id=${result.campaign_id}`);
      } else {
        throw new Error(result.message || 'Save operation failed');
      }
    } catch (error: any) {
      console.error('[CampaignPlansDisplay] Failed to save plan:', error);
      toast.error('Failed to save campaign plan', {
        description: error.message || 'An error occurred while saving. Please try again.'
      });
    } finally {
      setSavingPlanIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(plan.id);
        return newSet;
      });
    }
  };

  // Campaign type color coding
  const getCampaignTypeColor = (type: string) => {
    switch (type) {
      case 'awareness':
        return 'text-brand-charcoal dark:text-gray-100 bg-slate-50 dark:bg-slate-900/20 border-slate-200';
      case 'consideration':
        return 'text-brand-charcoal dark:text-gray-100 bg-amber-50 dark:bg-amber-900/20 border-amber-200';
      case 'conversion':
        return 'text-brand-success dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200';
      case 'retention':
        return 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200';
      default:
        return 'text-brand-slate dark:text-gray-100 bg-gray-50 dark:bg-gray-900/20 border-gray-200';
    }
  };

  const getCampaignTypeIcon = (type: string) => {
    switch (type) {
      case 'awareness':
        return Users;
      case 'consideration':
        return Target;
      case 'conversion':
        return Rocket;
      case 'retention':
        return CheckCircle;
      default:
        return TrendingUp;
    }
  };

  // Impact/Confidence/Ease color coding
  const getScoreColor = (score: string) => {
    if (score === 'High') return 'text-brand-success bg-green-50 dark:bg-green-900/20';
    if (score === 'Medium') return 'text-brand-warning bg-yellow-50 dark:bg-yellow-900/20';
    return 'text-brand-slate bg-gray-50 dark:bg-gray-900/20';
  };

  // ICE score gradient for ranking
  const getICEGradient = (index: number) => {
    if (index === 0) return 'bg-gradient-to-br from-yellow-400 to-amber-500';
    if (index === 1) return 'bg-gradient-to-br from-gray-300 to-gray-400';
    if (index === 2) return 'bg-gradient-to-br from-amber-500 to-brand-gold';
    return 'bg-gradient-to-br from-brand-gold to-amber-400';
  };

  return (
    <div>
      {/* Header - Mobile optimized */}
      <div className="mb-6 md:mb-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="p-2 md:p-3 rounded-2xl bg-gradient-to-br from-brand-gold to-amber-300 shadow-xl">
              <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-4xl font-bold text-brand-charcoal dark:text-gray-100">
                {t('campaign_planning.page.plansDisplay.title')}
              </h1>
              <p className="text-sm md:text-lg text-brand-slate dark:text-gray-400 mt-1 md:mt-2">
                {t('campaign_planning.page.plansDisplay.subtitle')}
                {cacheHit && generationTime && ` • Loaded in ${generationTime}ms (cached)`}
              </p>
            </div>
          </div>
          {plans.length > 0 && onOpenChat && (
            <Button
              onClick={onOpenChat}
              variant="outline"
              className="border-brand-gold text-brand-gold hover:bg-amber-50 dark:hover:bg-amber-900/20 w-full md:w-auto min-h-12 md:min-h-10"
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              {t('campaign_planning.page.plansDisplay.chatForPlans')}
            </Button>
          )}
        </div>

        {/* Feature Pills - Mobile optimized with wrapping */}
        {!loadingPlans && plans.length > 0 && (
          <div className="flex flex-wrap gap-2 md:gap-3 mt-4 md:mt-6">
            <div className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-white dark:bg-gray-800 rounded-full shadow-sm border border-gray-200 dark:border-gray-700">
              <BarChart3 className="w-4 h-4 text-brand-success" />
              <span className="text-xs md:text-sm font-medium">{t('campaign_planning.page.plansDisplay.badges.iceScored')}</span>
            </div>
            <div className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-white dark:bg-gray-800 rounded-full shadow-sm border border-gray-200 dark:border-gray-700">
              <Target className="w-4 h-4 text-brand-info" />
              <span className="text-xs md:text-sm font-medium">{t('campaign_planning.page.plansDisplay.badges.multiChannel')}</span>
            </div>
            <div className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-white dark:bg-gray-800 rounded-full shadow-sm border border-gray-200 dark:border-gray-700">
              <Rocket className="w-4 h-4 text-brand-warning" />
              <span className="text-xs md:text-sm font-medium">{t('campaign_planning.page.plansDisplay.badges.deploymentReady')}</span>
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loadingPlans && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 border-4 border-brand-gold border-t-transparent rounded-full animate-spin" />
            <p className="text-lg text-brand-slate dark:text-gray-400">
              {t('campaign_planning.page.plansDisplay.loading')}
            </p>
          </div>
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-6 w-3/4 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-5/6" />
            </Card>
          ))}
        </div>
      )}

      {/* Setup Needed */}
      {!loadingPlans && needsSetup && (
        <Card className="p-6 md:p-8 text-center">
          <TrendingUp className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 text-brand-warning" />
          <h3 className="text-xl md:text-2xl font-bold mb-2">{t('campaign_planning.page.plansDisplay.setupNeeded.title')}</h3>
          <p className="text-sm md:text-base text-brand-slate dark:text-gray-400 mb-6">
            {plansResponse?.message || "Set up your business profile to receive personalized campaign plan recommendations"}
          </p>
          <Button className="bg-gradient-to-r from-brand-gold to-amber-400 hover:from-amber-600 hover:to-amber-500 text-white w-full md:w-auto min-h-12 md:min-h-10">
            {t('campaign_planning.page.plansDisplay.setupNeeded.button')}
          </Button>
        </Card>
      )}

      {/* Clarification Needed */}
      {!loadingPlans && needsClarification && (
        <Card className="p-6 md:p-8">
          <h3 className="text-xl md:text-2xl font-bold mb-4">{t('campaign_planning.page.plansDisplay.clarificationNeeded.title')}</h3>
          <p className="text-sm md:text-base text-brand-slate dark:text-gray-400 mb-6">
            {plansResponse?.message || "To provide relevant campaign plans, I need to understand your business better"}
          </p>
          <div className="space-y-4">
            {plansResponse?.clarification_questions?.map((q, i) => (
              <Card key={i} className="p-3 md:p-4 bg-gray-50 dark:bg-gray-800">
                <p className="text-sm md:text-base font-medium mb-2">{q.question}</p>
                <p className="text-xs md:text-sm text-brand-slate dark:text-gray-400">{q.reason}</p>
              </Card>
            ))}
          </div>
          {onOpenChat && (
            <Button onClick={onOpenChat} className="mt-6 bg-gradient-to-r from-brand-gold to-amber-400 hover:from-amber-600 hover:to-amber-500 text-white w-full md:w-auto min-h-12 md:min-h-10">
              <TrendingUp className="mr-2 h-4 w-4" />
              {t('campaign_planning.page.plansDisplay.clarificationNeeded.button')}
            </Button>
          )}
        </Card>
      )}

      {/* Campaign Plans Grid */}
      {!loadingPlans && !needsSetup && !needsClarification && plans.length > 0 && (
        <div className="space-y-4 md:space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0 mb-4 md:mb-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-brand-charcoal dark:text-gray-100">
                {t('campaign_planning.page.plansDisplay.recommended.title')}
              </h2>
              <p className="text-xs md:text-sm text-brand-slate dark:text-gray-400 mt-1">
                {t('campaign_planning.page.plansDisplay.recommended.sortInfo')}
              </p>
            </div>
            <Badge variant="outline" className="text-sm md:text-lg px-3 md:px-4 py-1.5 md:py-2">
              {t('campaign_planning.page.plansDisplay.recommended.plansGenerated', { count: plans.length })}
            </Badge>
          </div>

          {plans.map((plan: CampaignPlan, index: number) => {
            const TypeIcon = getCampaignTypeIcon(plan.campaign_type);

            return (
              <Card
                key={plan.id}
                className="p-4 md:p-6 hover:shadow-xl transition-all duration-300 border-2 hover:border-brand-gold dark:hover:border-amber-600 cursor-pointer group"
                onClick={() => onSelectPlan?.(plan)}
              >
                <div className="flex items-start gap-3 md:gap-4">
                  {/* Rank Badge */}
                  <div className="flex-shrink-0">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg ${getICEGradient(index)}`}>
                      #{index + 1}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-2">
                          <h3 className="text-lg md:text-xl font-bold text-brand-charcoal dark:text-gray-100 group-hover:text-brand-gold dark:group-hover:text-amber-400 transition-colors">
                            {plan.title}
                          </h3>
                          <Badge className={`${getCampaignTypeColor(plan.campaign_type)} border w-fit`}>
                            <TypeIcon className="w-3 h-3 mr-1" />
                            {plan.campaign_type.charAt(0).toUpperCase() + plan.campaign_type.slice(1)}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <Badge className={`${getScoreColor(plan.impact)} border-0 text-xs md:text-sm`}>
                            {t('campaign_planning.page.plansDisplay.scores.impact')}: {plan.impact}
                          </Badge>
                          <Badge className={`${getScoreColor(plan.confidence)} border-0 text-xs md:text-sm`}>
                            {t('campaign_planning.page.plansDisplay.scores.confidence')}: {plan.confidence}
                          </Badge>
                          <Badge className={`${getScoreColor(plan.ease)} border-0 text-xs md:text-sm`}>
                            {t('campaign_planning.page.plansDisplay.scores.ease')}: {plan.ease}
                          </Badge>
                          <Badge variant="outline" className="font-bold text-brand-gold border-brand-gold text-xs md:text-sm">
                            {t('campaign_planning.page.plansDisplay.scores.ice')}: {plan.ice_score.toFixed(1)}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <p className="text-brand-charcoal dark:text-gray-300 mb-4 leading-relaxed">
                      {plan.description}
                    </p>

                    {/* Channels & Duration */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg mb-4">
                      <div>
                        <p className="text-sm font-semibold text-brand-slate dark:text-gray-400 mb-2 flex items-center gap-2">
                          <Target className="w-4 h-4" />
                          {t('campaign_planning.page.plansDisplay.details.channels')}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {plan.channels.map((channel, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {channel}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-brand-slate dark:text-gray-400 mb-2 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {t('campaign_planning.page.plansDisplay.details.duration')}
                        </p>
                        <p className="text-sm text-brand-charcoal dark:text-gray-100">{plan.estimated_duration}</p>
                      </div>
                    </div>

                    {/* Expected Outcomes */}
                    {plan.expected_outcomes.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-semibold text-brand-slate dark:text-gray-400 mb-2 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-brand-success" />
                          {t('campaign_planning.page.plansDisplay.details.expectedOutcomes')}
                        </p>
                        <ul className="space-y-1">
                          {plan.expected_outcomes.slice(0, 3).map((outcome, idx) => (
                            <li key={idx} className="text-sm text-brand-charcoal dark:text-gray-300 flex items-start gap-2">
                              <span className="text-brand-success mt-0.5">•</span>
                              <span>{outcome}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Prerequisites & Risk Factors */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {plan.prerequisites.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-brand-slate dark:text-gray-400 mb-2">
                            {t('campaign_planning.page.plansDisplay.details.prerequisites')}
                          </p>
                          <ul className="space-y-1">
                            {plan.prerequisites.slice(0, 2).map((prereq, idx) => (
                              <li key={idx} className="text-xs text-brand-slate dark:text-gray-400 flex items-start gap-1">
                                <span className="text-brand-info mt-0.5">✓</span>
                                <span>{prereq}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {plan.risk_factors.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-brand-slate dark:text-gray-400 mb-2 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-brand-warning" />
                            {t('campaign_planning.page.plansDisplay.details.riskFactors')}
                          </p>
                          <ul className="space-y-1">
                            {plan.risk_factors.slice(0, 2).map((risk, idx) => (
                              <li key={idx} className="text-xs text-brand-slate dark:text-gray-400 flex items-start gap-1">
                                <span className="text-brand-warning mt-0.5">⚠</span>
                                <span>{risk}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons - Mobile: stacked vertical, Desktop: horizontal */}
                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-brand-gold to-amber-400 hover:from-amber-600 hover:to-amber-500 text-white w-full md:w-auto min-h-12 md:min-h-9"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPlan?.(plan);
                        }}
                      >
                        <Rocket className="w-4 h-4 mr-2" />
                        {t('campaign_planning.page.plansDisplay.actions.deployPlan')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="group-hover:border-brand-gold group-hover:text-brand-gold w-full md:w-auto min-h-12 md:min-h-9"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPlan?.(plan);
                        }}
                      >
                        {t('campaign_planning.page.plansDisplay.actions.viewDetails')}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSavePlan(plan);
                        }}
                        disabled={savingPlanIds.has(plan.id)}
                        className="w-full md:w-auto min-h-12 md:min-h-9"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {savingPlanIds.has(plan.id) ? t('campaign_planning.page.plansDisplay.actions.saving') : t('campaign_planning.page.plansDisplay.actions.savePlan')}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loadingPlans && !needsSetup && !needsClarification && plans.length === 0 && (
        <Card className="p-8 md:p-12 text-center">
          <TrendingUp className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-6 text-gray-400" />
          <h3 className="text-xl md:text-2xl font-bold mb-3">{t('campaign_planning.page.plansDisplay.emptyState.title')}</h3>
          <p className="text-sm md:text-base text-brand-slate dark:text-gray-400 mb-8 max-w-lg mx-auto">
            {t('campaign_planning.page.plansDisplay.emptyState.description')}
          </p>
          {onOpenChat && (
            <Button onClick={onOpenChat} className="bg-gradient-to-r from-brand-gold to-amber-400 hover:from-amber-600 hover:to-amber-500 text-white w-full md:w-auto min-h-12 md:min-h-10">
              <TrendingUp className="mr-2 h-4 w-4" />
              {t('campaign_planning.page.plansDisplay.emptyState.button')}
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}
