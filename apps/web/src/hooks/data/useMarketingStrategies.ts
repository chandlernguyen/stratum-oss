import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useUserIdentity } from './useUserIdentity'; // CORRECT: Import the new canonical hook

// Types
export interface MarketingStrategy {
  id: string;
  org_id: string;
  campaign_id?: string;
  name: string;
  description?: string;
  strategy_type?: string;

  // Complex nested JSONB fields
  target_audience?: {
    primary_segments?: string[];
    demographics?: Record<string, any>;
    psychographics?: Record<string, any>;
    behavioral_patterns?: Record<string, any>;
  };

  messaging_framework?: {
    value_propositions?: string[];
    key_messages?: Record<string, string[]>;
    tone_of_voice?: Record<string, any>;
    differentiation_points?: string[];
  };

  channel_strategy?: {
    owned_channels?: Array<Record<string, any>>;
    earned_channels?: Array<Record<string, any>>;
    paid_channels?: Array<Record<string, any>>;
    channel_mix_rationale?: string;
  };

  content_strategy?: {
    content_pillars?: string[];
    content_formats?: string[];
    content_calendar?: Record<string, any>;
    distribution_plan?: Record<string, any>;
  };

  metrics?: {
    primary_kpis?: Array<Record<string, any>>;
    secondary_metrics?: Array<Record<string, any>>;
    success_criteria?: Record<string, any>;
    measurement_approach?: string;
  };

  budget_allocation?: Record<string, any>;
  timeline?: Record<string, any>;
  zero_budget_tactics?: string[];
  quick_wins?: string[];
  risks_and_mitigation?: Record<string, any>;

  created_at: string;
  updated_at: string;
  archived_at?: string;
  archive_reason?: string;
}

interface UseMarketingStrategiesOptions {
  includeArchived?: boolean;
  campaignId?: string;
}

// Main list hook (Phase 3: Enhanced with database function)
export function useMarketingStrategies(options: UseMarketingStrategiesOptions = {}) {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useQuery({
    queryKey: ['marketing-strategies', orgId, options],
    queryFn: async (): Promise<MarketingStrategy[]> => {
      if (!orgId) {
        console.log('[useMarketingStrategies] No org_id available');
        return [];
      }

      // Use enhanced database function for better performance (Phase 3)
      const { data, error } = await supabase.rpc('get_marketing_strategies_list', {
        p_org_id: orgId,
        p_include_archived: options.includeArchived || false,
        p_campaign_id: options.campaignId || null,
        p_status: null,
        p_limit: 100,
        p_offset: 0
      });

      if (error) {
        console.error('[useMarketingStrategies] Error fetching strategies:', error);
        throw error;
      }

      // Map enhanced results to backward-compatible interface
      return (data || []).map((strategy: any) => ({
        id: strategy.id,
        org_id: strategy.org_id,
        campaign_id: strategy.campaign_id,
        name: strategy.title || '', // Map title to name for backward compatibility
        description: strategy.positioning_statement || '',
        strategy_type: strategy.strategy_type,
        target_audience: {
          primary_segments: [],
          demographics: {},
          psychographics: {},
          behavioral_patterns: {}
        },
        messaging_framework: {
          value_propositions: strategy.value_propositions?.value_propositions || [],
          key_messages: strategy.key_messages || {},
          tone_of_voice: strategy.tone_of_voice || {},
          differentiation_points: strategy.differentiation_points || []
        },
        channel_strategy: {
          owned_channels: [],
          earned_channels: [],
          paid_channels: [],
          channel_mix_rationale: ''
        },
        content_strategy: {
          content_pillars: strategy.content_pillars || [],
          content_formats: [],
          content_calendar: {},
          distribution_plan: {}
        },
        metrics: {
          primary_kpis: [],
          secondary_metrics: [],
          success_criteria: {},
          measurement_approach: ''
        },
        budget_allocation: strategy.budget_allocation || {},
        timeline: {},
        zero_budget_tactics: [],
        quick_wins: [],
        risks_and_mitigation: {},
        created_at: strategy.created_at,
        updated_at: strategy.updated_at,
        archived_at: strategy.archived_at,
        archive_reason: strategy.archive_reason
      } as MarketingStrategy));
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000, // 2 minutes cache
  });
}

// Single strategy hook
export function useMarketingStrategy(id: string | undefined) {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useQuery({
    queryKey: ['marketing-strategy', id, orgId],
    queryFn: async () => {
      if (!orgId || !id) return null;

      const { data, error } = await supabase
        .from('marketing_strategies')
        .select('*')
        .eq('id', id)
        .eq('org_id', orgId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        console.error('[useMarketingStrategy] Error fetching strategy:', error);
        throw error;
      }

      return data as MarketingStrategy;
    },
    enabled: !!orgId && !!id,
    staleTime: 5 * 60 * 1000,
  });
}

// Campaign strategies hook
export function useCampaignStrategies(campaignId: string | undefined) {
  return useMarketingStrategies({
    campaignId,
    includeArchived: false,
  });
}

// Mutations (keeping write operations in API for now)
export function useCreateMarketingStrategy() {
  const queryClient = useQueryClient();
  const { data: identity } = useUserIdentity();

  return useMutation({
    mutationFn: async (data: Partial<MarketingStrategy>) => {
      const orgId = identity?.organization?.id;
      if (!orgId) {
        throw new Error('Organization ID is required');
      }

      // Use Database-First approach with create_marketing_strategy function
      const { data: result, error } = await supabase.rpc('create_marketing_strategy', {
        p_org_id: orgId,
        p_campaign_id: data.campaign_id || null,
        p_title: data.name || null,
        p_strategy_type: data.strategy_type || null,
        p_positioning_statement: data.description || null,
        p_value_propositions: data.messaging_framework?.value_propositions ?
          { value_propositions: data.messaging_framework.value_propositions } : null,
        p_key_messages: data.messaging_framework?.key_messages || null,
        p_differentiation_points: data.messaging_framework?.differentiation_points || null,
        p_tone_of_voice: data.messaging_framework?.tone_of_voice || null,
        p_channel_mix: data.channel_strategy || null,
        p_budget_allocation: data.budget_allocation || null,
        p_content_pillars: data.content_strategy?.content_pillars || null
      });

      if (error) {
        console.error('[useCreateMarketingStrategy] Database error:', error);
        throw new Error(error.message || 'Failed to create marketing strategy');
      }

      return result && result.length > 0 ? result[0] : null;
    },
    onSuccess: () => {
      const orgId = identity?.organization?.id;
      queryClient.invalidateQueries({ queryKey: ['marketing-strategies', orgId] });
      toast.success('Marketing strategy created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create marketing strategy');
    },
  });
}

export function useUpdateMarketingStrategy() {
  const queryClient = useQueryClient();
  const { data: identity } = useUserIdentity();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MarketingStrategy> }) => {
      const orgId = identity?.organization?.id;
      if (!orgId) {
        throw new Error('Organization ID is required');
      }

      // Use Database-First approach with update_marketing_strategy function
      const { data: result, error } = await supabase.rpc('update_marketing_strategy', {
        p_strategy_id: id,
        p_org_id: orgId,
        p_title: data.name || null,
        p_strategy_type: data.strategy_type || null,
        p_positioning_statement: data.description || null,
        p_value_propositions: data.messaging_framework?.value_propositions ?
          { value_propositions: data.messaging_framework.value_propositions } : null,
        p_key_messages: data.messaging_framework?.key_messages || null,
        p_differentiation_points: data.messaging_framework?.differentiation_points || null,
        p_tone_of_voice: data.messaging_framework?.tone_of_voice || null,
        p_channel_mix: data.channel_strategy || null,
        p_budget_allocation: data.budget_allocation || null,
        p_content_pillars: data.content_strategy?.content_pillars || null
      });

      if (error) {
        console.error('[useUpdateMarketingStrategy] Database error:', error);
        throw new Error(error.message || 'Failed to update marketing strategy');
      }

      return result && result.length > 0 ? result[0] : null;
    },
    onSuccess: (_, variables) => {
      const orgId = identity?.organization?.id;
      queryClient.invalidateQueries({ queryKey: ['marketing-strategies', orgId] });
      queryClient.invalidateQueries({ queryKey: ['marketing-strategy', variables.id, orgId] });
      toast.success('Marketing strategy updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update marketing strategy');
    },
  });
}

export function useArchiveMarketingStrategy() {
  const queryClient = useQueryClient();
  const { data: identity } = useUserIdentity();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const orgId = identity?.organization?.id;
      if (!orgId) {
        throw new Error('Organization ID is required');
      }

      // Use Database-First approach with unified_archive_output function (nuclear migration)
      const { data: result, error } = await supabase.rpc('unified_archive_output', {
        p_output_id: id,
        p_org_id: orgId,
        p_archive_reason: reason
      });

      if (error) {
        console.error('[useArchiveMarketingStrategy] Database error:', error);
        throw new Error(error.message || 'Failed to archive marketing strategy');
      }

      return result && result.length > 0 ? result[0] : null;
    },
    onSuccess: (_, variables) => {
      const orgId = identity?.organization?.id;
      queryClient.invalidateQueries({ queryKey: ['marketing-strategies', orgId] });
      queryClient.invalidateQueries({ queryKey: ['marketing-strategy', variables.id, orgId] });
      toast.success('Marketing strategy archived successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to archive marketing strategy');
    },
  });
}