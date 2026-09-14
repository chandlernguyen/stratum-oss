import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useUserIdentity } from './useUserIdentity';

// Enhanced marketing strategy interface matching database function
export interface MarketingStrategyEnhanced {
  id: string;
  org_id: string;
  campaign_id?: string;
  campaign_name?: string;
  title: string;
  strategy_type: string;
  status: string;
  value_propositions?: any;
  key_messages?: any;
  differentiation_points?: string[];
  elevator_pitches?: any;
  tone_of_voice?: any;
  brand_personality?: any;
  positioning_statement?: string;
  channel_mix?: any;
  budget_allocation?: any;
  content_pillars?: string[];
  estimated_reach?: number;
  estimated_cost?: number;
  priority_score?: number;
  metadata?: any;
  created_at: string;
  updated_at: string;
  created_by?: string;
  creator_email?: string;

  // Computed fields from database function
  linked_personas_count: number;
  outputs_count: number;
  brand_guidelines_count: number;
  completion_percentage: number;
  strategies_generated_at: string;
}

// Interface for marketing strategy details with comprehensive relationship data
export interface MarketingStrategyDetails {
  id: string;
  org_id: string;
  campaign_id?: string;
  campaign_info?: any;
  title: string;
  strategy_type: string;
  status: string;
  value_propositions?: any;
  key_messages?: any;
  differentiation_points?: string[];
  elevator_pitches?: any;
  tone_of_voice?: any;
  brand_personality?: any;
  positioning_statement?: string;
  channel_mix?: any;
  budget_allocation?: any;
  content_pillars?: string[];
  estimated_reach?: number;
  estimated_cost?: number;
  priority_score?: number;
  metadata?: any;
  created_at: string;
  updated_at: string;
  archived_at?: string;
  archive_reason?: string;
  creator_info?: any;

  // Comprehensive relationship data
  linked_personas?: any[];
  strategy_outputs?: any[];
  brand_guidelines?: any[];
  performance_metrics?: any;
  details_generated_at: string;
}

// Interface for marketing strategy performance analytics
export interface MarketingStrategyPerformance {
  total_strategies: number;
  active_strategies: number;
  draft_strategies: number;
  completed_strategies: number;
  avg_completion_percentage: number;
  total_outputs: number;
  avg_priority_score?: number;
  strategies_by_type: any[];
  completion_distribution: any[];
  performance_trends: any[];
}

// Interface for marketing strategy list options
interface UseMarketingStrategiesEnhancedOptions {
  includeArchived?: boolean;
  campaignId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

// Enhanced marketing strategies list hook using database function
export function useMarketingStrategiesEnhanced(options: UseMarketingStrategiesEnhancedOptions = {}) {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useQuery({
    queryKey: ['marketing-strategies-enhanced', orgId, options],
    queryFn: async (): Promise<MarketingStrategyEnhanced[]> => {
      if (!orgId) return [];

      const { data, error } = await supabase.rpc('get_marketing_strategies_list', {
        p_org_id: orgId,
        p_include_archived: options.includeArchived || false,
        p_campaign_id: options.campaignId || null,
        p_status: options.status || null,
        p_limit: options.limit || 50,
        p_offset: options.offset || 0
      });

      if (error) {
        console.error('[useMarketingStrategiesEnhanced] Error fetching strategies:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000, // 2 minutes cache
    refetchOnWindowFocus: false,
  });
}

// Enhanced active marketing strategies hook
export function useActiveMarketingStrategiesEnhanced() {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useQuery({
    queryKey: ['active-marketing-strategies-enhanced', orgId],
    queryFn: async () => {
      if (!orgId) return [];

      const { data, error } = await supabase.rpc('get_active_marketing_strategies', {
        p_org_id: orgId
      });

      if (error) {
        console.error('[useActiveMarketingStrategiesEnhanced] Error fetching active strategies:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!orgId,
    staleTime: 1 * 60 * 1000, // 1 minute cache for active strategies
    refetchOnWindowFocus: false,
  });
}

// Enhanced single marketing strategy details hook
export function useMarketingStrategyDetails(strategyId?: string) {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useQuery({
    queryKey: ['marketing-strategy-details', strategyId, orgId],
    queryFn: async (): Promise<MarketingStrategyDetails | null> => {
      if (!orgId || !strategyId) return null;

      const { data, error } = await supabase.rpc('get_marketing_strategy_details', {
        p_strategy_id: strategyId,
        p_org_id: orgId
      });

      if (error) {
        console.error('[useMarketingStrategyDetails] Error fetching strategy details:', error);
        throw error;
      }

      return data && data.length > 0 ? data[0] : null;
    },
    enabled: !!orgId && !!strategyId,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: false,
  });
}

// Marketing strategy performance analytics hook
export function useMarketingStrategyPerformance(periodDays: number = 30) {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useQuery({
    queryKey: ['marketing-strategy-performance', orgId, periodDays],
    queryFn: async (): Promise<MarketingStrategyPerformance | null> => {
      if (!orgId) return null;

      const { data, error } = await supabase.rpc('get_marketing_strategies_performance', {
        p_org_id: orgId,
        p_period_days: periodDays
      });

      if (error) {
        console.error('[useMarketingStrategyPerformance] Error fetching performance:', error);
        throw error;
      }

      return data && data.length > 0 ? data[0] : null;
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: false,
  });
}

// Campaign-specific marketing strategies hook
export function useCampaignMarketingStrategiesEnhanced(campaignId?: string) {
  return useMarketingStrategiesEnhanced({
    campaignId,
    includeArchived: false,
  });
}

// Helper hook for marketing strategy statistics
export function useMarketingStrategyStats() {
  const { data: strategies, isLoading } = useMarketingStrategiesEnhanced();

  if (isLoading || !strategies) {
    return {
      totalStrategies: 0,
      activeStrategies: 0,
      draftStrategies: 0,
      avgCompletion: 0,
      totalOutputs: 0,
      linkedPersonas: 0,
      byType: {},
      byStatus: {},
      isLoading: true
    };
  }

  const stats = strategies.reduce((acc, strategy) => {
    acc.totalStrategies++;

    if (strategy.status === 'active') acc.activeStrategies++;
    if (strategy.status === 'draft') acc.draftStrategies++;

    acc.totalOutputs += strategy.outputs_count;
    acc.linkedPersonas += strategy.linked_personas_count;
    acc.completionSum += strategy.completion_percentage;

    // Group by type
    const type = strategy.strategy_type || 'Other';
    acc.byType[type] = (acc.byType[type] || 0) + 1;

    // Group by status
    const status = strategy.status || 'Unknown';
    acc.byStatus[status] = (acc.byStatus[status] || 0) + 1;

    return acc;
  }, {
    totalStrategies: 0,
    activeStrategies: 0,
    draftStrategies: 0,
    totalOutputs: 0,
    linkedPersonas: 0,
    completionSum: 0,
    byType: {} as Record<string, number>,
    byStatus: {} as Record<string, number>
  });

  return {
    totalStrategies: stats.totalStrategies,
    activeStrategies: stats.activeStrategies,
    draftStrategies: stats.draftStrategies,
    avgCompletion: stats.totalStrategies > 0
      ? Math.round((stats.completionSum / stats.totalStrategies) * 10) / 10
      : 0,
    totalOutputs: stats.totalOutputs,
    linkedPersonas: stats.linkedPersonas,
    byType: stats.byType,
    byStatus: stats.byStatus,
    isLoading: false
  };
}

// Primary marketing strategy hook for quick access
export function usePrimaryMarketingStrategy(campaignId?: string) {
  const { data: strategies } = useMarketingStrategiesEnhanced({
    campaignId,
    status: 'active',
    limit: 10
  });

  const primaryStrategy = strategies?.find(s => s.priority_score && s.priority_score > 80) ||
                         strategies?.[0];

  return {
    data: primaryStrategy || null,
    isLoading: !strategies,
    hasPrimary: !!primaryStrategy
  };
}

// Hook for strategy completion analytics
export function useStrategyCompletionAnalytics() {
  const { data: strategies } = useMarketingStrategiesEnhanced();

  if (!strategies) {
    return {
      completionRanges: {},
      avgCompletion: 0,
      incompleteStrategies: [],
      isLoading: true
    };
  }

  const completionRanges = strategies.reduce((acc, strategy) => {
    const completion = strategy.completion_percentage;
    let range;

    if (completion >= 80) range = 'High (80-100%)';
    else if (completion >= 60) range = 'Medium (60-79%)';
    else if (completion >= 20) range = 'Low (20-59%)';
    else range = 'Minimal (0-19%)';

    acc[range] = (acc[range] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const incompleteStrategies = strategies.filter(s => s.completion_percentage < 80);
  const avgCompletion = strategies.length > 0
    ? strategies.reduce((sum, s) => sum + s.completion_percentage, 0) / strategies.length
    : 0;

  return {
    completionRanges,
    avgCompletion: Math.round(avgCompletion * 10) / 10,
    incompleteStrategies,
    isLoading: false
  };
}