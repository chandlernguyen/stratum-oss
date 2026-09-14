/**
 * Hook for auto-generating opportunity recommendations on page load
 * Pattern: Adapted from useContentRecommendations.ts
 *
 * Features:
 * - Auto-loads opportunities when business context is available
 * - Integrates ROI & Budget agent data for data-driven insights
 * - Intelligent caching with 10-minute staleness
 * - ICE scoring framework (Impact × Confidence × Ease)
 */

import { useQuery } from '@tanstack/react-query';
import { useBusinessContext } from './useBusinessContext';
import { useOutputsHub } from './data/useAgentOutputs';
import { useActiveCampaigns } from './data/useCampaigns';
import { supabase } from '@/lib/supabase';
import { API_BASE_URL } from '@/lib/api';
import { getLocaleHeaders } from '@/lib/apiHeaders';

// Types

export interface OpportunityRecommendation {
  id: string;
  title: string;
  description: string;
  impact: 'High' | 'Medium' | 'Low';
  effort: 'Low' | 'Medium' | 'High';
  confidence: 'High' | 'Medium' | 'Low';
  ice_score: number; // 0-10 scale
  category: 'quick-fix' | 'low-hanging-fruit' | 'strategic-opportunity';
  estimated_time: string;
  expected_value: string;
  priority: 'high' | 'medium' | 'low';
  status: 'ready';
}

export interface OpportunitiesResponse {
  success: boolean;
  opportunities?: OpportunityRecommendation[];
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
}

// Hook

export function useOpportunityRecommendations() {
  const { data: businessContext, isLoading: contextLoading } = useBusinessContext();
  const { data: outputsHub, isLoading: outputsLoading } = useOutputsHub();
  const { data: activeCampaigns = [], isLoading: campaignsLoading } = useActiveCampaigns();

  return useQuery<OpportunitiesResponse>({
    queryKey: [
      'opportunity-recommendations',
      businessContext?.dataHash,
      outputsHub?.summary.total_count,
      activeCampaigns.length
    ],
    queryFn: async () => {
      console.log('[Opportunity Recommendations] Generating opportunities with full agent context...');

      // Check prerequisites
      if (!businessContext) {
        console.warn('[Opportunity Recommendations] No business context available');
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

      // Fetch campaign metrics from ROI agent
      const campaignMetrics = await fetchCampaignMetrics(businessContext.orgId);
      console.log('[Opportunity Recommendations] Loaded campaign metrics:', campaignMetrics.length);

      // Fetch existing opportunities to avoid duplicates
      const existingOpportunities = await fetchExistingOpportunities(businessContext.orgId);
      console.log('[Opportunity Recommendations] Found existing opportunities:', existingOpportunities.length);

      // Group all agent outputs by type for comprehensive context
      const allAgentOutputs = outputsHub?.agent_outputs || [];
      const agentContext = groupAgentOutputsByType(allAgentOutputs);
      console.log('[Opportunity Recommendations] Agent outputs by type:',
        Object.entries(agentContext).map(([type, outputs]) => `${type}: ${outputs.length}`).join(', ')
      );

      // Generate opportunities via LLM with ALL agent context
      const opportunities = await generateLLMOpportunities(
        businessContext,
        campaignMetrics,
        existingOpportunities,
        agentContext,
        activeCampaigns
      );

      return {
        success: true,
        opportunities: opportunities.slice(0, 6), // Top 6 by ICE score
        confidence: 'high'
      };
    },
    enabled: !!businessContext && !contextLoading && !outputsLoading && !campaignsLoading,
    staleTime: 10 * 60 * 1000, // 10 minutes
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
   * Used to provide data-driven opportunity insights
   */
  try {
    const { data, error } = await supabase
      .from('campaign_metrics')
      .select(`
        *,
        campaign:campaigns!inner (
          id,
          name,
          org_id
        )
      `)
      .eq('campaign.org_id', orgId)
      .order('metric_date', { ascending: false })
      .limit(50); // Last 50 metrics for comprehensive analysis

    if (error) {
      console.error('[Opportunity Recommendations] Failed to fetch campaign metrics:', error);
      return [];
    }

    // Format for backend consumption
    return (data || []).map((metric: any) => ({
      campaign_name: metric.campaign?.name || 'Unknown',
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
    console.error('[Opportunity Recommendations] Error fetching campaign metrics:', error);
    return [];
  }
}

async function fetchExistingOpportunities(orgId: string): Promise<any[]> {
  /**
   * Fetch already-identified opportunities to avoid duplicates
   * Helps LLM focus on net-new opportunities
   */
  try {
    const { data, error } = await supabase
      .from('agent_outputs')
      .select('id, title, content, created_at')
      .eq('org_id', orgId)
      .eq('agent_type', 'quick_wins')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[Opportunity Recommendations] Failed to fetch existing opportunities:', error);
      return [];
    }

    return (data || []).map((output: any) => {
      // Parse content JSONB if it contains structured opportunity data
      let content = output.content;
      if (typeof content === 'string') {
        try {
          content = JSON.parse(content);
        } catch {
          content = { title: output.title };
        }
      }

      return {
        id: output.id,
        title: output.title,
        category: content?.category || 'unknown',
        created_at: output.created_at
      };
    });
  } catch (error) {
    console.error('[Opportunity Recommendations] Error fetching existing opportunities:', error);
    return [];
  }
}

async function generateLLMOpportunities(
  context: any,
  campaignMetrics: any[],
  existingOpportunities: any[],
  agentContext: Record<string, any[]>,
  activeCampaigns: any[]
): Promise<OpportunityRecommendation[]> {
  /**
   * Call backend LLM endpoint to generate contextual opportunities
   * Integrates business context + ALL agent outputs + ROI data for comprehensive insights
   */
  try {
    // Get auth token
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
      console.warn('[Opportunity Recommendations] No authentication token available');
      return getFallbackOpportunities();
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/opportunities/recommendations`, {
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
        existing_opportunities: existingOpportunities,
        agent_outputs: agentContext, // ALL 10 agent types
        active_campaigns: activeCampaigns
      })
    });

    if (!response.ok) {
      console.error('[Opportunity Recommendations] API call failed:', response.status, response.statusText);
      return getFallbackOpportunities();
    }

    const result = await response.json();

    if (result.success && result.opportunities) {
      console.log('[Opportunity Recommendations] Successfully generated:', result.opportunities.length);
      return result.opportunities;
    } else if (result.needs_setup) {
      console.warn('[Opportunity Recommendations] Setup needed:', result.message);
      return [];
    } else if (result.needs_clarification) {
      console.warn('[Opportunity Recommendations] Clarification needed:', result.clarification_questions);
      return [];
    } else {
      console.warn('[Opportunity Recommendations] Backend returned no opportunities:', result);
      return getFallbackOpportunities();
    }

  } catch (error) {
    console.error('[Opportunity Recommendations] API call error:', error);
    return getFallbackOpportunities();
  }
}

/**
 * Fallback opportunities when LLM generation fails
 * Provides basic quick wins to maintain user experience
 */
function getFallbackOpportunities(): OpportunityRecommendation[] {
  return [
    {
      id: 'fallback_1',
      title: 'Optimize High-Performing Campaign Budget',
      description: 'Analyze top-performing campaigns and reallocate budget from underperformers to maximize ROI',
      impact: 'High',
      effort: 'Low',
      confidence: 'High',
      ice_score: 8.1,
      category: 'quick-fix',
      estimated_time: '1-2 weeks',
      expected_value: 'Increase overall campaign ROI by 15-25% through budget optimization',
      priority: 'high',
      status: 'ready'
    },
    {
      id: 'fallback_2',
      title: 'Audit Underperforming Campaign Channels',
      description: 'Review campaigns with high spend but low conversions and identify optimization opportunities',
      impact: 'High',
      effort: 'Medium',
      confidence: 'High',
      ice_score: 7.2,
      category: 'low-hanging-fruit',
      estimated_time: '2-3 weeks',
      expected_value: 'Reduce wasted ad spend by 20-30% by pausing or optimizing ineffective channels',
      priority: 'high',
      status: 'ready'
    },
    {
      id: 'fallback_3',
      title: 'Implement Conversion Tracking for All Campaigns',
      description: 'Ensure all active campaigns have proper conversion tracking to enable data-driven decisions',
      impact: 'Medium',
      effort: 'Low',
      confidence: 'High',
      ice_score: 6.3,
      category: 'quick-fix',
      estimated_time: '1 week',
      expected_value: 'Gain visibility into campaign performance and enable accurate ROI measurement',
      priority: 'medium',
      status: 'ready'
    }
  ];
}
