import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useUserIdentity } from './useUserIdentity';

// Enhanced campaign interface matching database function
export interface CampaignEnhanced {
  id: string;
  org_id: string;
  client_id?: string;
  client_name?: string;
  name: string;
  description?: string;
  campaign_type?: string;
  priority_level?: string;
  budget_cents: number;
  spent_cents: number;
  budget_utilization_percentage: number;
  start_date?: string;
  end_date?: string;
  marketing_channels?: any;
  geographic_target?: string;
  target_audience?: string;
  success_metrics?: any;
  status: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  creator_email?: string;
  archived_at?: string;
  archive_reason?: string;

  // Computed fields from database function
  days_remaining?: number;
  progress_percentage: number;

  // Relationship counts
  strategies_count: number;
  personas_count: number;
  content_outputs_count: number;
}

// Interface for campaign list options
interface UseCampaignsEnhancedOptions {
  includeArchived?: boolean;
  clientId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

// Enhanced campaigns list hook using database function
export function useCampaignsEnhanced(options: UseCampaignsEnhancedOptions = {}) {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useQuery({
    queryKey: ['campaigns-enhanced', orgId, options],
    queryFn: async (): Promise<CampaignEnhanced[]> => {
      if (!orgId) return [];

      // Use schema-aware router function (migration 169)
      const { data, error } = await supabase.rpc('get_campaigns_list_routed', {
        p_org_id: orgId,
        p_include_archived: options.includeArchived || false,
        p_client_id: options.clientId || null,
        p_status: options.status || null,
        p_limit: options.limit || 50,
        p_offset: options.offset || 0
      });

      if (error) {
        console.error('[useCampaignsEnhanced] Error fetching campaigns:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000, // 2 minutes cache
    refetchOnWindowFocus: false,
  });
}

// Enhanced active campaigns hook
export function useActiveCampaignsEnhanced() {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useQuery({
    queryKey: ['active-campaigns-enhanced', orgId],
    queryFn: async () => {
      if (!orgId) return [];

      const { data, error } = await supabase.rpc('get_active_campaigns', {
        p_org_id: orgId
      });

      if (error) {
        console.error('[useActiveCampaignsEnhanced] Error fetching active campaigns:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!orgId,
    staleTime: 1 * 60 * 1000, // 1 minute cache for active campaigns
    refetchOnWindowFocus: false,
  });
}

// Enhanced single campaign hook using basic function
export function useCampaignEnhanced(campaignId?: string) {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useQuery({
    queryKey: ['campaign-enhanced', campaignId, orgId],
    queryFn: async () => {
      if (!orgId || !campaignId) return null;

      const { data, error } = await supabase.rpc('get_campaign_basic', {
        p_campaign_id: campaignId,
        p_org_id: orgId
      });

      if (error) {
        console.error('[useCampaignEnhanced] Error fetching campaign:', error);
        throw error;
      }

      return data && data.length > 0 ? data[0] : null;
    },
    enabled: !!orgId && !!campaignId,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: false,
  });
}

// Campaign details hook using the comprehensive function
export function useCampaignDetails(campaignId?: string) {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useQuery({
    queryKey: ['campaign-details', campaignId, orgId],
    queryFn: async () => {
      if (!orgId || !campaignId) return null;

      // Use schema-aware router function (migration 169)
      const { data, error} = await supabase.rpc('get_campaign_details_routed', {
        p_campaign_id: campaignId,
        p_org_id: orgId
      });

      if (error) {
        console.error('[useCampaignDetails] Error fetching campaign details:', error);
        throw error;
      }

      return data && data.length > 0 ? data[0] : null;
    },
    enabled: !!orgId && !!campaignId,
    staleTime: 3 * 60 * 1000, // 3 minutes cache
    refetchOnWindowFocus: false,
  });
}

// Campaign performance analytics hook with schema routing (Migration 210)
export function useCampaignPerformance(periodDays: number = 30, clientId?: string | null) {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useQuery({
    queryKey: ['campaign-performance', orgId, clientId, periodDays],
    queryFn: async () => {
      if (!orgId) return null;

      // Use schema-aware router function (migration 210)
      const { data, error } = await supabase.rpc('get_campaign_performance_routed', {
        p_org_id: orgId,
        p_client_id: clientId || null,
        p_period_days: periodDays
      });

      if (error) {
        console.error('[useCampaignPerformance] Error fetching performance:', error);
        throw error;
      }

      return data && data.length > 0 ? data[0] : null;
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: false,
  });
}

// Client-specific campaigns hook
export function useClientCampaignsEnhanced(clientId?: string) {
  return useCampaignsEnhanced({
    clientId,
    includeArchived: false,
  });
}

// Helper hook for campaign statistics
export function useCampaignStats() {
  const { data: campaigns, isLoading } = useCampaignsEnhanced();

  if (isLoading || !campaigns) {
    return {
      totalCampaigns: 0,
      activeCampaigns: 0,
      completedCampaigns: 0,
      draftCampaigns: 0,
      pausedCampaigns: 0,
      totalBudget: 0,
      totalSpent: 0,
      avgUtilization: 0,
      isLoading: true
    };
  }

  const stats = campaigns.reduce((acc, campaign) => {
    acc.totalCampaigns++;

    if (campaign.status === 'active') acc.activeCampaigns++;
    else if (campaign.status === 'completed') acc.completedCampaigns++;
    else if (campaign.status === 'draft') acc.draftCampaigns++;
    else if (campaign.status === 'paused') acc.pausedCampaigns++;

    acc.totalBudget += campaign.budget_cents;
    acc.totalSpent += campaign.spent_cents;

    return acc;
  }, {
    totalCampaigns: 0,
    activeCampaigns: 0,
    completedCampaigns: 0,
    draftCampaigns: 0,
    pausedCampaigns: 0,
    totalBudget: 0,
    totalSpent: 0
  });

  return {
    ...stats,
    avgUtilization: stats.totalBudget > 0
      ? Math.round((stats.totalSpent / stats.totalBudget) * 100)
      : 0,
    isLoading: false
  };
}