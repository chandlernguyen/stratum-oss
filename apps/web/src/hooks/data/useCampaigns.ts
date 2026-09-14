import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useUserIdentity } from './useUserIdentity'; // CORRECT: Import the new canonical hook
import { toast } from 'sonner';
import { useRealtimeSubscription } from '../useRealtimeSubscription'; // Phase 2 Task 2.3: Real-time updates

// Types
export interface Campaign {
  id: string;
  org_id: string;
  client_id?: string;
  name: string;
  description?: string;
  campaign_type?: 'awareness' | 'acquisition' | 'retention' | 'seasonal' | 'product_launch' | 'brand_refresh';
  priority_level?: number; // 1-5
  budget?: number;
  start_date?: string;
  end_date?: string;
  marketing_channels?: string[]; // JSONB array
  geographic_target?: {
    countries?: string[];
    regions?: string[];
    cities?: string[];
  };
  target_audience?: string;
  goals?: string[];
  success_metrics?: Record<string, any>;
  status?: 'draft' | 'active' | 'paused' | 'completed' | 'planned' | 'archived';
  created_at: string;
  updated_at: string;
  archived_at?: string;
  archive_reason?: string;

  // Additional campaign fields
  content_pillars?: string[] | Record<string, any>;
  target_personas?: string[] | Record<string, any>;
  competitor_context?: string | Record<string, any>;
  tags?: string[];

  // Legacy fields for backward compatibility during migration
  objectives?: Record<string, any> | string;
  budget_cents?: number;
  spent?: number;
  spent_cents?: number;
  metrics?: Record<string, any>;
  created_by?: string;
}

interface UseCampaignsOptions {
  includeArchived?: boolean;
  clientId?: string;
  status?: 'draft' | 'active' | 'paused' | 'completed' | 'planned' | 'archived' | null;
}

// Main list hook (Phase 2: Enhanced with database function + real-time updates)
export function useCampaigns(options: UseCampaignsOptions = {}) {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  const query = useQuery({
    queryKey: ['campaigns', orgId, options],
    queryFn: async (): Promise<Campaign[]> => {
      if (!orgId) {
        console.log('[useCampaigns] No org_id available');
        return [];
      }

      // Use schema-aware router function (migration 169)
      const { data, error } = await supabase.rpc('get_campaigns_list_routed', {
        p_org_id: orgId,
        p_include_archived: options.includeArchived || false,
        p_client_id: options.clientId || null,
        p_status: options.status || null,
        p_limit: 100,
        p_offset: 0
      });

      if (error) {
        console.error('[useCampaigns] Error fetching campaigns:', error);
        throw error;
      }

      // Map enhanced results to backward-compatible interface
      return (data || []).map((campaign: any) => ({
        id: campaign.id,
        org_id: campaign.org_id,
        client_id: campaign.client_id,
        name: campaign.name,
        description: campaign.description,
        campaign_type: campaign.campaign_type as any,
        priority_level: parseInt(campaign.priority_level || '0'),
        budget: campaign.budget_cents ? campaign.budget_cents / 100 : undefined, // Convert cents to dollars for compatibility
        budget_cents: campaign.budget_cents,
        spent: campaign.spent_cents ? campaign.spent_cents / 100 : undefined,
        spent_cents: campaign.spent_cents,
        start_date: campaign.start_date,
        end_date: campaign.end_date,
        marketing_channels: campaign.marketing_channels as string[],
        geographic_target: { regions: [campaign.geographic_target] },
        target_audience: campaign.target_audience,
        goals: campaign.goals || [], // Add missing goals field
        success_metrics: campaign.success_metrics,
        status: campaign.status as any,
        created_at: campaign.created_at,
        updated_at: campaign.updated_at,
        created_by: campaign.created_by,
        // Additional fields for backward compatibility
        objectives: campaign.target_audience,
        metrics: campaign.success_metrics
      } as Campaign));
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000, // 2 minutes cache (improved from 5 minutes)
  });

  // ✅ NEW: Real-time updates (Phase 2 Task 2.3)
  // Instant updates when campaigns change, no 30-second polling
  useRealtimeSubscription({
    table: 'campaigns',
    queryKeys: [
      ['campaigns', orgId, options],
      ['campaigns-active', orgId]
    ],
    filter: orgId ? { column: 'org_id', value: orgId } : undefined,
  });

  return query;
}

// Single campaign hook
export function useCampaign(id: string | undefined) {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useQuery({
    queryKey: ['campaign', id, orgId],
    queryFn: async () => {
      if (!orgId || !id) {
        return null;
      }

      // Use schema-aware router function (migration 169)
      const { data, error } = await supabase.rpc('get_campaign_details_routed', {
        p_campaign_id: id,
        p_org_id: orgId
      });

      if (error) {
        console.error('[useCampaign] Error fetching campaign details:', error);
        throw error;
      }

      // Function returns single JSONB object, not a table
      return data || null;
    },
    enabled: !!orgId && !!id,
    staleTime: 5 * 60 * 1000,
  });
}

// Client campaigns hook
export function useClientCampaigns(clientId: string | undefined) {
  return useCampaigns({
    clientId,
    includeArchived: false,
  });
}

// Active campaigns hook (schema-aware via router function)
export function useActiveCampaigns() {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useQuery({
    queryKey: ['campaigns-active', orgId],
    queryFn: async () => {
      if (!orgId) {
        return [];
      }

      // Use schema-aware router function (migration 166)
      const { data, error } = await supabase.rpc('get_active_campaigns_routed', {
        p_org_id: orgId
      });

      if (error) {
        console.error('[useActiveCampaigns] Error fetching active campaigns:', error);
        throw error;
      }

      return (data || []) as Campaign[];
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}

// Mutations - Database-First approach
export function useCreateCampaign() {
  const queryClient = useQueryClient();
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;
  const userId = identity?.user?.id;

  return useMutation({
    mutationFn: async (campaignData: Partial<Campaign>) => {
      if (!orgId || !userId) {
        throw new Error('User or Organization not found');
      }

      // Database-First: Use router function for schema routing (SME → public, Agency → agency)
      const { data, error } = await supabase.rpc('create_campaign_routed', {
        p_org_id: orgId,
        p_name: campaignData.name!,
        p_client_id: campaignData.client_id || null,
        p_description: campaignData.description || null,
        p_objectives: campaignData.objectives || null,
        p_target_audience: campaignData.target_audience || null,
        p_budget_cents: campaignData.budget_cents || null,
        p_start_date: campaignData.start_date || null,
        p_end_date: campaignData.end_date || null,
        p_status: campaignData.status || 'draft',
        p_success_metrics: campaignData.success_metrics || {},
        p_created_by: userId,
      });

      if (error) {
        console.error('[useCreateCampaign] Error:', error);
        throw new Error(error.message || 'Failed to create campaign');
      }

      return data as Campaign;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', orgId] });
      queryClient.invalidateQueries({ queryKey: ['campaigns-active', orgId] });
      // Invalidate client-specific campaigns for agency users
      if (data.client_id) {
        queryClient.invalidateQueries({ queryKey: ['campaigns', orgId, data.client_id] });
      }
      toast.success('Campaign created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create campaign');
    },
  });
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Campaign> }) => {
      if (!orgId) {
        throw new Error('Organization ID is required');
      }

      // Use Database-First approach with update_campaign_routed function
      // Routes to agency.campaigns for AGENCY orgs, public.campaigns for SME orgs (migration 258)
      const { data: result, error } = await supabase.rpc('update_campaign_routed', {
        p_campaign_id: id,
        p_org_id: orgId,
        p_name: data.name || null,
        p_description: data.description || null,
        p_objectives: data.objectives || null,
        p_budget_cents: data.budget_cents || null,
        p_status: data.status || null,
        p_target_audience: data.target_audience || null,
        p_campaign_type: data.campaign_type || null,
        p_marketing_channels: data.marketing_channels || null,
        p_content_pillars: data.content_pillars || null,
        p_target_personas: data.target_personas || null,
        p_success_metrics: data.success_metrics || null,
        p_competitor_context: data.competitor_context || null,
        p_geographic_target: data.geographic_target || null,
        p_priority_level: data.priority_level || null,
        p_tags: data.tags || null,
        p_start_date: data.start_date || null,
        p_end_date: data.end_date || null
      });

      if (error) {
        console.error('[useUpdateCampaign] Database error:', error);
        throw new Error(error.message || 'Failed to update campaign');
      }

      // update_campaign_routed returns JSONB object directly
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', orgId] });
      queryClient.invalidateQueries({ queryKey: ['campaigns-active', orgId] });
      queryClient.invalidateQueries({ queryKey: ['campaign', variables.id, orgId] });
      toast.success('Campaign updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update campaign');
    },
  });
}

// Archive campaign - Database-First using direct Supabase
export function useArchiveCampaign() {
  const queryClient = useQueryClient();
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;
  const userId = identity?.user?.id;

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      if (!orgId || !userId) {
        throw new Error('User or Organization not found');
      }

      // Database-First: Direct archive update
      const { data, error } = await supabase
        .from('campaigns')
        .update({
          archived_at: new Date().toISOString(),
          archived_by: userId,
          archive_reason: reason || 'User archived',
        })
        .eq('id', id)
        .eq('org_id', orgId)
        .select()
        .single();

      if (error) {
        throw new Error(error.message || 'Failed to archive campaign');
      }

      return data as Campaign;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', orgId] });
      queryClient.invalidateQueries({ queryKey: ['campaigns-active', orgId] });
      queryClient.invalidateQueries({ queryKey: ['campaign', variables.id, orgId] });
      toast.success('Campaign archived successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to archive campaign');
    },
  });
}

// useLaunchCampaign removed - dead code calling non-existent /launch endpoint
// If needed in future, use /activate endpoint from campaigns_v2 router