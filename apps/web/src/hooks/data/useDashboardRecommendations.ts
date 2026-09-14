import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useUserIdentity } from './useUserIdentity';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { API_BASE_URL } from '@/lib/api';
import { getLocaleHeaders } from '@/lib/apiHeaders';

export interface DashboardRecommendation {
  task: string;
  reason: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
  agent_id: string;
  agent_path: string;
  estimated_time: string;
  confidence: 'low' | 'medium' | 'high';
}

export interface DashboardRecommendationsData {
  type: 'recommendations' | 'clarification_needed';
  recommendations?: DashboardRecommendation[];
  overall_assessment?: string;
  confidence: 'low' | 'medium' | 'high';
  context_summary?: {
    campaign_count: number;
    document_count: number;
    total_ai_interactions: number;
  };
}

/**
 * Hook to fetch LLM-powered dashboard recommendations.
 * Pattern: Follows useROIRecommendations structure
 */
export function useDashboardRecommendations() {
  const { data: identity } = useUserIdentity();
  const { data: businessContext } = useBusinessContext();
  const orgId = identity?.organization?.id;

  return useQuery({
    queryKey: ['dashboard-recommendations', orgId, businessContext?.dataHash],
    queryFn: async (): Promise<DashboardRecommendationsData | null> => {
      if (!orgId) return null;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
          console.warn('[useDashboardRecommendations] No auth token');
          return null;
        }

        // Build request with business context
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

        const response = await fetch(`${API_BASE_URL}/api/v1/dashboard/recommendations`, {
          method: 'POST',
          headers: getLocaleHeaders({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }),
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          console.error('[useDashboardRecommendations] API error:', response.status);
          return null;
        }

        const data = await response.json();
        console.log('[useDashboardRecommendations] Received recommendations:', data);

        return data as DashboardRecommendationsData;

      } catch (error) {
        console.error('[useDashboardRecommendations] Failed to fetch:', error);
        return null;
      }
    },
    enabled: !!orgId,
    staleTime: 60 * 1000, // 1 minute (user state changes frequently)
  });
}
