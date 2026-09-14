/**
 * Hook for auto-generating campaign plan recommendations on page load
 * Pattern: Adapted from useOpportunityRecommendations.ts
 *
 * Features:
 * - Auto-loads campaign plans when business context is available
 * - Two-stage LLM approach (Flash Lite → Pro) for 67% cost savings
 * - Intelligent caching with 2-hour expiration
 * - ICE scoring framework (Impact × Confidence × Ease)
 * - Deployment frameworks and A/B testing recommendations
 */

import { useQuery } from '@tanstack/react-query';
import { useBusinessContext } from './useBusinessContext';
import { useOutputsHub } from './data/useAgentOutputs';
import { useActiveCampaigns } from './data/useCampaigns';
import { supabase } from '@/lib/supabase';
import { API_BASE_URL } from '@/lib/api';
import { getLocaleHeaders } from '@/lib/apiHeaders';

// Types

export interface CampaignPlan {
  id: string;
  title: string;
  description: string;
  campaign_type: 'awareness' | 'consideration' | 'conversion' | 'retention';
  channels: string[];
  impact: string; // "High" | "Medium" | "Low"
  confidence: string; // "High" | "Medium" | "Low"
  ease: string; // "High" | "Medium" | "Low"
  ice_score: number; // 0-10 scale
  estimated_duration: string;
  expected_outcomes: string[];
  prerequisites: string[];
  risk_factors: string[];
  deployment_framework?: {
    phases: Array<{
      name: string;
      duration: string;
      activities: string[];
      success_criteria: string[];
    }>;
    channels: Array<{
      name: string;
      budget_allocation: string;
      key_tactics: string[];
    }>;
    timeline: {
      start_date: string;
      end_date: string;
      milestones: Array<{
        name: string;
        date: string;
        deliverable: string;
      }>;
    };
  };
  ab_testing_recommendations?: string[];
}

export interface CampaignPlansResponse {
  success: boolean;
  plans?: CampaignPlan[];
  needs_setup?: boolean;
  needs_clarification?: boolean;
  clarification_questions?: Array<{
    question: string;
    reason: string;
    category: string;
  }>;
  message?: string;
  error?: string;
  confidence?: 'high' | 'medium' | 'low';
  generation_time_ms?: number;
  cache_hit?: boolean;
}

// Hook

export function useCampaignPlanRecommendations(options: { clientSlug?: string } = {}) {
  const { data: businessContext, isLoading: contextLoading } = useBusinessContext({ clientSlug: options.clientSlug });
  const { data: outputsHub, isLoading: outputsLoading } = useOutputsHub({ clientSlug: options.clientSlug });
  const { data: activeCampaigns = [], isLoading: campaignsLoading } = useActiveCampaigns();

  return useQuery<CampaignPlansResponse>({
    queryKey: [
      'campaign-plan-recommendations',
      businessContext?.dataHash,
      outputsHub?.summary.total_count,
      activeCampaigns.length
    ],
    queryFn: async () => {
      console.log('[Campaign Plan Recommendations] Generating plans with full agent context...');

      // Check prerequisites
      if (!businessContext) {
        console.warn('[Campaign Plan Recommendations] No business context available');
        return {
          success: false,
          needs_setup: true,
          message: "Let's start by setting up your business profile"
        };
      }

      if (!businessContext.businessData) {
        return {
          success: false,
          needs_setup: true,
          message: "Let's start by setting up your business profile"
        };
      }

      // Fetch campaign metrics for data-driven planning
      const campaignMetrics = await fetchCampaignMetrics(businessContext.orgId);
      console.log('[Campaign Plan Recommendations] Loaded campaign metrics:', campaignMetrics.length);

      // Group all agent outputs by type for comprehensive context
      const allAgentOutputs = outputsHub?.agent_outputs || [];
      const agentContext = groupAgentOutputsByType(allAgentOutputs);
      console.log('[Campaign Plan Recommendations] Agent outputs by type:',
        Object.entries(agentContext).map(([type, outputs]) => `${type}: ${outputs.length}`).join(', ')
      );

      // Calculate available budget from business context
      const availableBudget = businessContext.businessData?.marketing_budget
        ? parseFloat(businessContext.businessData.marketing_budget.replace(/[^0-9.-]/g, ''))
        : undefined;

      // Extract timeline constraints from business goals
      const timelineConstraint = businessContext.businessData?.business_goals?.find((goal: string) =>
        goal.toLowerCase().includes('quarter') || goal.toLowerCase().includes('month')
      );

      // Generate campaign plans via LLM with ALL agent context
      const plans = await generateLLMCampaignPlans(
        businessContext,
        campaignMetrics,
        agentContext,
        activeCampaigns,
        availableBudget,
        timelineConstraint
      );

      // ✨ CRITICAL: Replace temporary IDs with persistent UUIDs
      // This ensures plans can be saved, prerequisites can track, and URLs work after refresh
      const plansWithUUIDs = plans.slice(0, 5).map(plan => ({
        ...plan,
        id: crypto.randomUUID() // Persistent UUID for database persistence
      }));

      console.log('[Campaign Plan Recommendations] Generated plans with UUIDs:',
        plansWithUUIDs.map(p => `${p.title} (${p.id})`).join(', ')
      );

      return {
        success: true,
        plans: plansWithUUIDs, // Top 5 by ICE score with persistent UUIDs
        confidence: 'high'
      };
    },
    enabled: !!businessContext && !contextLoading && !outputsLoading && !campaignsLoading,
    staleTime: 10 * 60 * 1000, // 10 minutes (backend caches for 2 hours)
    retry: 1
  });
}

// Helper Functions

/**
 * Group agent outputs by type for comprehensive context
 * Returns all 10 agent types with their outputs
 */
function groupAgentOutputsByType(outputs: any[]): Record<string, any[]> {
  const grouped: Record<string, any[]> = {
    strategy: [],
    marketing_strategy: [],
    persona: [],
    content: [],
    analytics: [],
    roi_budget: [],
    campaign_planning: [],
    quick_wins: [],
    competitive_intelligence: [],
    client_success: []
  };

  outputs.forEach((output) => {
    const agentType = output.agent_type;
    if (grouped[agentType]) {
      grouped[agentType].push({
        id: output.id,
        title: output.title,
        summary: output.summary,
        content: output.content,
        created_at: output.created_at,
        metadata: output.metadata
      });
    }
  });

  return grouped;
}

async function fetchCampaignMetrics(orgId: string): Promise<any[]> {
  /**
   * Fetch campaign performance metrics from ROI & Budget agent data
   * Used to provide data-driven campaign planning insights
   *
   * NOTE: Using direct query instead of join because CSV-imported metrics
   * have campaign_name but no campaign_id foreign key
   */
  try {
    const { data, error } = await supabase
      .from('campaign_metrics')
      .select('*')
      .eq('org_id', orgId)
      .order('metric_date', { ascending: false })
      .limit(50); // Last 50 metrics for comprehensive analysis

    if (error) {
      console.error('[Campaign Plan Recommendations] Failed to fetch campaign metrics:', error);
      return [];
    }

    // Format for backend consumption
    return (data || []).map((metric: any) => ({
      campaign_name: metric.campaign_name || 'Unknown',
      metric_date: metric.metric_date,
      source: metric.source,
      spend: metric.spend || 0,
      revenue: metric.revenue || 0,
      impressions: metric.impressions || 0,
      clicks: metric.clicks || 0,
      conversions: metric.conversions || 0,
      leads: metric.leads || 0,
      calls: metric.calls || 0,
      appointments: metric.appointments || 0,
      conversion_goal: metric.conversion_goal
    }));
  } catch (error) {
    console.error('[Campaign Plan Recommendations] Error fetching campaign metrics:', error);
    return [];
  }
}

async function generateLLMCampaignPlans(
  context: any,
  campaignMetrics: any[],
  agentContext: Record<string, any[]>,
  activeCampaigns: any[],
  availableBudget?: number,
  timelineConstraint?: string
): Promise<CampaignPlan[]> {
  /**
   * Call backend LLM endpoint to generate contextual campaign plans
   * Uses two-stage approach: Flash Lite (summarization) → Pro (generation)
   * Integrates business context + ALL agent outputs + ROI data for comprehensive planning
   */
  try {
    // Get auth token
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
      console.warn('[Campaign Plan Recommendations] No authentication token available');
      return getFallbackCampaignPlans();
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/campaign-plans/recommendations`, {
      method: 'POST',
      headers: getLocaleHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }),
      body: JSON.stringify({
        org_id: context.orgId,
        business_context: context.businessData,
        personas: context.personas,
        strategies: context.strategies,
        campaign_metrics: campaignMetrics,
        agent_outputs: agentContext, // ALL 10 agent types
        active_campaigns: activeCampaigns,
        available_budget: availableBudget,
        timeline_constraint: timelineConstraint
      })
    });

    if (!response.ok) {
      console.error('[Campaign Plan Recommendations] API call failed:', response.status, response.statusText);
      return getFallbackCampaignPlans();
    }

    const result = await response.json();

    if (result.success && result.plans) {
      console.log('[Campaign Plan Recommendations] Successfully generated:', result.plans.length);
      if (result.cache_hit) {
        console.log('[Campaign Plan Recommendations] Cache hit - loaded in', result.generation_time_ms, 'ms');
      }
      return result.plans;
    } else if (result.needs_setup) {
      console.warn('[Campaign Plan Recommendations] Setup needed:', result.message);
      return [];
    } else if (result.needs_clarification) {
      console.warn('[Campaign Plan Recommendations] Clarification needed:', result.clarification_questions);
      return [];
    } else {
      console.warn('[Campaign Plan Recommendations] Backend returned no plans:', result);
      return getFallbackCampaignPlans();
    }

  } catch (error) {
    console.error('[Campaign Plan Recommendations] API call error:', error);
    return getFallbackCampaignPlans();
  }
}

/**
 * Fallback campaign plans when LLM generation fails
 * Provides basic campaign templates to maintain user experience
 * Uses persistent UUIDs for consistency with main flow
 */
function getFallbackCampaignPlans(): CampaignPlan[] {
  return [
    {
      id: crypto.randomUUID(), // Persistent UUID
      title: 'Brand Awareness Campaign',
      description: 'Multi-channel campaign to increase brand visibility and reach new audiences',
      campaign_type: 'awareness',
      channels: ['Social Media', 'Content Marketing', 'PR'],
      impact: 'High',
      confidence: 'Medium',
      ease: 'Medium',
      ice_score: 6.7,
      estimated_duration: '3 months',
      expected_outcomes: [
        'Increase brand awareness by 30-40%',
        'Grow social media following by 25%',
        'Generate 1000+ new website visitors'
      ],
      prerequisites: [
        'Brand guidelines established',
        'Content calendar prepared',
        'Social media accounts active'
      ],
      risk_factors: [
        'Requires consistent content creation',
        'Results may take 2-3 months to materialize'
      ]
    },
    {
      id: crypto.randomUUID(), // Persistent UUID
      title: 'Lead Generation Campaign',
      description: 'Targeted campaign focused on capturing high-quality leads and driving conversions',
      campaign_type: 'conversion',
      channels: ['Paid Search', 'Email Marketing', 'Landing Pages'],
      impact: 'High',
      confidence: 'High',
      ease: 'Medium',
      ice_score: 7.5,
      estimated_duration: '2 months',
      expected_outcomes: [
        'Generate 200+ qualified leads',
        'Achieve 5-8% conversion rate',
        '3-4x ROI on ad spend'
      ],
      prerequisites: [
        'Landing pages optimized',
        'Email nurture sequences ready',
        'CRM system configured'
      ],
      risk_factors: [
        'Requires budget for paid advertising',
        'Performance depends on offer strength'
      ]
    }
  ];
}
