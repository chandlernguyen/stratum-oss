import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useUserIdentity } from './useUserIdentity';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { API_BASE_URL } from '@/lib/api';
import { getLocaleHeaders } from '@/lib/apiHeaders';

// Phase 5: Updated interfaces to match LLM-powered backend
export interface ROIRecommendation {
  task: string;  // LLM: specific actionable task
  reason: string;  // LLM: strategic reasoning with business context
  priority: 'low' | 'medium' | 'high';
  category: string;  // LLM: channel_optimization, budget_reallocation, scale_opportunity, pause_campaign, investigate_decline, data_collection
  estimated_impact: string;  // LLM: quantified impact description
  confidence: string;  // LLM: confidence level
  data_supporting: string;  // LLM: specific metrics supporting this
  estimated_savings?: number;
  estimated_gain?: number;

  // Legacy SQL fields (for backward compatibility)
  type?: string;
  title?: string;
  description?: string;
  action?: string;
  data?: {
    campaign_name?: string;
    spend?: number;
    revenue?: number;
    roi_pct?: number;
  };
}

export interface ROIRecommendationsData {
  type: 'recommendations' | 'clarification_needed';
  recommendations?: ROIRecommendation[];
  overall_assessment?: string;  // LLM: executive summary
  confidence: 'low' | 'medium' | 'high';

  // Clarification fields
  questions?: Array<{
    question: string;
    reason: string;
    category: string;
  }>;
  message?: string;

  // Legacy context summary (optional for backward compat)
  context_summary?: {
    total_campaigns: number;
    avg_roi: number;
    total_spend: number;
    total_revenue: number;
    data_quality: 'low' | 'medium' | 'high';
  };
}

/**
 * Hook to fetch LLM-powered ROI recommendations with full business context.
 * Phase 5: Upgraded from SQL rules to intelligent, context-aware insights.
 *
 * Fallback: If LLM fails, uses SQL-based recommendations (get_roi_recommendations function).
 */
export function useROIRecommendations() {
  const { data: identity } = useUserIdentity();
  const { data: businessContext } = useBusinessContext();
  const orgId = identity?.organization?.id;

  return useQuery({
    queryKey: ['roi-recommendations', orgId, businessContext?.dataHash],
    queryFn: async (): Promise<ROIRecommendationsData | null> => {
      if (!orgId) return null;

      try {
        // Phase 5: Call LLM-powered endpoint with business context
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
          console.warn('[useROIRecommendations] No auth token, falling back to SQL');
          return fallbackToSQL(orgId);
        }

        // Build comprehensive request with business context
        const requestBody = {
          org_id: orgId,
          business_context: businessContext?.businessData || {},
          company_name: businessContext?.businessData?.company_name,
          industry: businessContext?.businessData?.industry || '',
          main_products: businessContext?.businessData?.main_products || [],
          target_market: businessContext?.businessData?.target_market || [],
          competitors: businessContext?.businessData?.key_competitors || [],
          unique_value_proposition: businessContext?.businessData?.value_proposition,
          marketing_budget: businessContext?.businessData?.marketing_budget,
          revenue_range: businessContext?.businessData?.annual_revenue,
          marketing_team_size: businessContext?.businessData?.marketing_team_size,
          primary_channels: businessContext?.businessData?.primary_channels || [],
          business_goals: businessContext?.businessData?.business_goals || [],
          strategies: businessContext?.strategies || [],
          personas: businessContext?.personas || [],
          seasonal_factors: businessContext?.businessData?.seasonal_factors,
          growth_stage: businessContext?.businessData?.growth_stage
        };

        const response = await fetch(`${API_BASE_URL}/api/v1/roi-budget/recommendations`, {
          method: 'POST',
          headers: getLocaleHeaders({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }),
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          console.error('[useROIRecommendations] API error:', response.status, await response.text());
          return fallbackToSQL(orgId);
        }

        const data = await response.json();
        console.log('[useROIRecommendations] LLM recommendations received:', data);

        return data as ROIRecommendationsData;

      } catch (error) {
        console.error('[useROIRecommendations] LLM call failed, falling back to SQL:', error);
        return fallbackToSQL(orgId);
      }
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000, // 2 minutes (LLM results are cached on backend)
  });
}

/**
 * Fallback to SQL-based recommendations when LLM is unavailable.
 */
async function fallbackToSQL(orgId: string): Promise<ROIRecommendationsData | null> {
  try {
    const { data, error } = await supabase.rpc('get_roi_recommendations', {
      p_org_id: orgId,
    });

    if (error) {
      console.error('[useROIRecommendations] SQL fallback error:', error);
      throw error;
    }

    // Convert SQL format to LLM format
    const sqlData = data as any;
    const recommendations: ROIRecommendation[] = (sqlData.recommendations || []).map((rec: any) => ({
      task: rec.title || rec.task,
      reason: rec.description || rec.reason,
      priority: rec.priority,
      category: rec.type || 'channel_optimization',
      estimated_impact: rec.reason || 'Potential improvement',
      confidence: 'medium',
      data_supporting: `Campaign: ${rec.data?.campaign_name || 'N/A'}`,
      estimated_savings: rec.estimated_savings,
      estimated_gain: rec.estimated_gain
    }));

    return {
      type: 'recommendations',
      recommendations,
      overall_assessment: 'SQL-based analysis (LLM temporarily unavailable)',
      confidence: sqlData.confidence || 'medium',
      context_summary: sqlData.context_summary
    };

  } catch (error) {
    console.error('[useROIRecommendations] SQL fallback failed:', error);
    return null;
  }
}
