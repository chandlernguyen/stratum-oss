import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { authFetch } from '@/lib/authService';
import { useUserIdentity } from './useUserIdentity'; // CORRECT: Import the new canonical hook
import { handleResourceNotFound, invalidateQueryKeys } from './utils/queryHelpers';
import { API_BASE_URL } from '@/lib/api';
import { useRealtimeSubscription } from '../useRealtimeSubscription'; // Phase 2 Task 2.3: Real-time updates

// Types for agent outputs
export interface AgentOutput {
  id: string;
  org_id: string;
  user_id?: string;
  agent_type: string;
  output_type: string;
  source_type?: string;
  session_id?: string;
  campaign_id?: string;
  title: string;
  summary?: string;
  content: Record<string, any>;
  category?: string[];
  confidence_score?: number;
  validation_status?: 'pending' | 'approved' | 'rejected' | 'auto_approved';
  validated_by?: string;
  validated_at?: string;
  rejection_reason?: string;
  impact_score?: number;
  usage_count?: number;
  last_used_at?: string;
  used_by_agents?: string[];
  status?: 'draft' | 'active' | 'archived';
  published_at?: string;
  expires_at?: string;
  finalized_at?: string;
  version?: number;
  previous_version_id?: string;
  metadata?: Record<string, any>;
  extraction_model?: string;
  extraction_cost?: number;
  archived_at?: string;
  archived_by?: string;
  archive_reason?: string;
  is_archived?: boolean;
  created_by?: string;
  updated_by?: string;
  approval_status?: 'not_submitted' | 'pending' | 'changes_needed' | 'approved' | 'rejected';  // Phase 2: Output protection
  created_at: string;
  updated_at: string;
}

export interface OutputsHubData {
  agent_outputs: AgentOutput[];
  summary: {
    total_count: number;
    by_agent: Record<string, number>;
    by_status: Record<string, number>;
  };
  nuclear_implementation: boolean;
}

interface UseAgentOutputsOptions {
  includeArchived?: boolean;
  agentType?: string;
  campaignId?: string;
  clientId?: string; // NEW: For agency multi-tenant schema routing
  status?: string;
  limit?: number;
  offset?: number;
}

// Main agent outputs list hook
// FIX: Use get_unified_outputs_hub RPC for schema routing (agency vs SME)
export function useAgentOutputs(options: UseAgentOutputsOptions = {}) {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;
  // const orgType = identity?.organization?.type; // Reserved for future use

  const query = useQuery({
    queryKey: ['agent-outputs', orgId, options],
    queryFn: async (): Promise<AgentOutput[]> => {
      if (!orgId) return [];

      // FIX: Use RPC function for schema routing (agency.agent_outputs vs public.agent_outputs)
      const { data, error } = await supabase.rpc('get_unified_outputs_hub', {
        p_org_id: orgId,
        p_client_id: options.clientId || null,
        p_agent_type: options.agentType || null,
        p_campaign_id: options.campaignId || null,
        p_include_archived: options.includeArchived || false,
        p_limit: options.limit || 50,
        p_offset: options.offset || 0
      });

      if (error) {
        console.error('[useAgentOutputs] Error fetching outputs:', error);
        throw error;
      }

      // Transform RPC results to AgentOutput interface
      const outputs = (data || []).map((output: any) => ({
        id: output.id,
        org_id: output.org_id,
        user_id: output.user_id,
        agent_type: output.agent_type,
        output_type: output.output_type,
        source_type: output.source_type,
        session_id: output.session_id,
        campaign_id: output.campaign_id,
        client_id: output.client_id, // Include for agency filtering
        title: output.title,
        summary: output.summary,
        content: output.content,
        category: output.category,
        confidence_score: output.confidence_score,
        validation_status: output.validation_status,
        impact_score: output.impact_score,
        usage_count: output.usage_count,
        last_used_at: output.last_used_at,
        status: output.status,
        published_at: output.published_at,
        metadata: output.metadata,
        archived_at: output.archived_at,
        archive_reason: output.archive_reason,
        is_archived: output.is_archived,
        created_at: output.created_at,
        updated_at: output.updated_at,
        // Approval workflow fields
        approval_status: output.approval_status,
        approved_at: output.approved_at,
        approved_by: output.approved_by
      } as AgentOutput));

      return outputs;
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
  });

  // ✅ NEW: Real-time updates (Phase 2 Task 2.3)
  // Instant updates when agent outputs change
  useRealtimeSubscription({
    table: 'agent_outputs',
    queryKeys: [
      ['agent-outputs', orgId, options],
      ['outputs-hub', orgId]
    ],
    filter: orgId ? { column: 'org_id', value: orgId } : undefined,
  });

  return query;
}

// Single agent output hook
export function useAgentOutput(id: string | undefined) {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useQuery({
    queryKey: ['agent-output', id, orgId],
    queryFn: async (): Promise<AgentOutput | null> => {
      if (!orgId || !id) return null;

      const { data, error } = await supabase
        .from('agent_outputs')
        .select('*')
        .eq('id', id)
        .eq('org_id', orgId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        console.error('[useAgentOutput] Error fetching output:', error);
        throw error;
      }

      return data as AgentOutput;
    },
    enabled: !!orgId && !!id,
    staleTime: 5 * 60 * 1000,
  });
}

// Outputs Hub hook - aggregates all output types (Phase 4: Database-First)
// Hook with optional client filtering for agency multi-tenancy
export function useOutputsHub(options: { clientSlug?: string; includeArchived?: boolean } = {}) {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  // Resolve clientSlug to client_id for agency filtering
  const { data: clientData } = useQuery({
    queryKey: ['client-by-slug', orgId, options.clientSlug],
    queryFn: async () => {
      if (!orgId || !options.clientSlug) return null;

      const { data, error } = await supabase
        .from('clients')
        .select('id')
        .eq('org_id', orgId)
        .eq('slug', options.clientSlug)
        .single();

      if (error) {
        console.error('[useOutputsHub] Error resolving client slug:', error);
        return null;
      }
      return data;
    },
    enabled: !!orgId && !!options.clientSlug
  });

  const clientId = clientData?.id;

  const includeArchived = options.includeArchived ?? false;

  const query = useQuery({
    queryKey: ['outputs-hub', orgId, clientId, includeArchived],  // Include clientId and archived flag in cache key
    queryFn: async (): Promise<OutputsHubData> => {
      if (!orgId) {
        return {
          agent_outputs: [],
          summary: { total_count: 0, by_agent: {}, by_status: {} },
          nuclear_implementation: false
        };
      }

      // Phase 4: Database-First unified outputs approach with cached performance optimization
      // Migration 201: Added p_client_id for agency schema routing + client filtering
      const [outputsResult, summaryResult] = await Promise.all([
        supabase.rpc('get_unified_outputs_hub', {
          p_org_id: orgId,
          p_client_id: clientId || null,  // NEW: Pass client_id for agency filtering
          p_agent_type: null,
          p_campaign_id: null,
          p_include_archived: includeArchived,
          p_limit: 100,
          p_offset: 0
        }),
        supabase.rpc('get_output_hub_summary_cached', {
          p_org_id: orgId
        })
      ]);

      if (outputsResult.error) {
        console.error('[useOutputsHub] Error fetching outputs:', outputsResult.error);
        throw outputsResult.error;
      }

      if (summaryResult.error) {
        console.error('[useOutputsHub] Error fetching summary:', summaryResult.error);
        throw summaryResult.error;
      }

      const outputs = outputsResult.data || [];
      const summaryData = summaryResult.data?.[0];

      // Transform database results to AgentOutput interface
      const agentOutputs = outputs.map((output: any) => ({
        id: output.id,
        org_id: output.org_id,
        user_id: output.user_id,
        agent_type: output.agent_type,
        output_type: output.output_type,
        source_type: output.source_type,
        session_id: output.session_id,
        campaign_id: output.campaign_id,
        title: output.title,
        summary: output.summary,
        content: output.content,
        category: output.category,
        confidence_score: output.confidence_score,
        validation_status: output.validation_status,
        impact_score: output.impact_score,
        usage_count: output.usage_count,
        last_used_at: output.last_used_at,
        status: output.status,
        published_at: output.published_at,
        metadata: {
          ...output.metadata,
          table_source: output.table_source
        },
        archived_at: output.archived_at,
        archive_reason: output.archive_reason,
        is_archived: output.is_archived,
        created_by: output.created_by,  // Phase 2: Output protection - needed for ownership check
        updated_by: output.updated_by,
        created_at: output.created_at,
        updated_at: output.updated_at,
        approval_status: output.approval_status  // Phase 2: Output protection - needed for approved check
      } as AgentOutput));

      return {
        agent_outputs: agentOutputs,
        summary: {
          total_count: summaryData?.total_count || 0,
          by_agent: summaryData?.by_agent || {},
          by_status: summaryData?.by_status || {}
        },
        nuclear_implementation: false // Now Database-First
      };
    },
    enabled: !!orgId,
    staleTime: 10 * 1000, // Reduced from 2 minutes to 10 seconds for immediate updates
    gcTime: 30 * 1000, // Keep in memory for 30 seconds (renamed from cacheTime in React Query v5)
  });

  // ✅ NEW: Real-time updates (Phase 2 Task 2.3)
  // Instant updates for outputs hub aggregation
  useRealtimeSubscription({
    table: 'agent_outputs',
    queryKeys: [
      ['outputs-hub', orgId],
      ['agent-outputs', orgId]
    ],
    filter: orgId ? { column: 'org_id', value: orgId } : undefined,
  });

  return query;
}

// My outputs hook (user-specific)
export function useMyOutputs(options: UseAgentOutputsOptions = {}) {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;
  const userId = identity?.user?.id;

  const query = useQuery({
    queryKey: ['my-outputs', userId, orgId, options],
    queryFn: async (): Promise<AgentOutput[]> => {
      if (!orgId || !userId) return [];

      let query = supabase.from('agent_outputs').select('*').eq('org_id', orgId).eq('user_id', userId);

      if (!options.includeArchived) query = query.is('archived_at', null);
      if (options.agentType) query = query.eq('agent_type', options.agentType);
      if (options.campaignId) query = query.eq('campaign_id', options.campaignId);
      if (options.status) query = query.eq('status', options.status);
      if (options.limit) query = query.limit(options.limit);

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('[useMyOutputs] Error fetching my outputs:', error);
        throw error;
      }

      return data as AgentOutput[];
    },
    enabled: !!orgId && !!userId,
    staleTime: 2 * 60 * 1000,
  });

  // ✅ NEW: Real-time updates (Phase 2 Task 2.3)
  // Instant updates for user-specific outputs
  useRealtimeSubscription({
    table: 'agent_outputs',
    queryKeys: [
      ['my-outputs', userId, orgId, options],
      ['outputs-hub', orgId]
    ],
    filter: orgId ? { column: 'org_id', value: orgId } : undefined,
  });

  return query;
}

// Mutations for agent outputs
/**
 * Universal save hook for all agent outputs
 * Automatically handles cache invalidation and sidebar refresh
 *
 * Usage:
 * const saveOutput = useSaveOutput();
 * saveOutput.mutate({
 *   agent_type: 'content',
 *   output_type: 'blog_post',
 *   title: 'My Blog Post',
 *   content: {...},
 *   session_id: '...',
 *   metadata: {...}
 * });
 */
export function useSaveOutput() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (outputData: {
      agent_type: string;
      output_type: string;
      title: string;
      summary?: string;
      content: Record<string, any>;
      session_id?: string;
      campaign_id?: string;
      client_id?: string;
      metadata?: Record<string, any>;
      confidence_score?: number;
    }) => {
      const response = await authFetch(`${API_BASE_URL}/api/v1/agent-outputs`, {
        method: 'POST',
        body: JSON.stringify(outputData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to save output');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate all relevant queries to refresh sidebars
      // Use queryKey prefix matching to invalidate all variants
      queryClient.invalidateQueries({
        queryKey: ['agent-outputs'],
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ queryKey: ['my-outputs'] });
      queryClient.invalidateQueries({ queryKey: ['outputs-hub'] });

      toast.success('Output saved successfully');

      return data;
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save output');
    },
  });
}

export function useUpdateOutput() {
  const queryClient = useQueryClient();
  const { data: identity } = useUserIdentity();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AgentOutput> }) => {
      const orgId = identity?.organization?.id;
      if (!orgId) throw new Error('Organization not found');

      const { data: result, error } = await supabase
        .from('agent_outputs')
        .update(data)
        .eq('id', id)
        .eq('org_id', orgId)
        .select('id, title, updated_at')
        .single();

      if (error) throw new Error(error.message || 'Failed to update output');
      return result;
    },
    onSuccess: (_, variables) => {
      const orgId = identity?.organization?.id;
      const userId = identity?.user?.id;
      queryClient.invalidateQueries({ queryKey: ['agent-outputs', orgId] });
      queryClient.invalidateQueries({ queryKey: ['agent-output', variables.id, orgId] });
      queryClient.invalidateQueries({ queryKey: ['my-outputs', userId, orgId] });
      queryClient.invalidateQueries({ queryKey: ['outputs-hub', orgId] });
      toast.success('Output updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update output');
    },
  });
}

export function useArchiveOutput() {
  const queryClient = useQueryClient();
  const { data: identity } = useUserIdentity();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const orgId = identity?.organization?.id;
      const userId = identity?.user?.id;
      if (!orgId || !userId) throw new Error('User or Organization not found');

      const { data, error } = await supabase
        .from('agent_outputs')
        .update({
          archived_at: new Date().toISOString(),
          archived_by: userId,
          archive_reason: reason
        })
        .eq('id', id)
        .eq('org_id', orgId)
        .select('id, title, archived_at');

      if (error) throw new Error(error.message || 'Failed to archive output');
      if (!data || data.length === 0) {
        return handleResourceNotFound({
          queryClient,
          queryKeys: [
            ['agent-outputs', orgId],
            ['agent-output', id, orgId],
            ['my-outputs', userId, orgId],
            ['outputs-hub', orgId],
          ],
          logMessage: `[useArchiveOutput] Optimistic archive success for agent_outputs id: ${id} (already archived)`,
          payload: { id } as { id: string },
        });
      }
      return data[0]; // Return first item since we expect only one match
    },
    onSuccess: (_, variables) => {
      const orgId = identity?.organization?.id;
      const userId = identity?.user?.id;
      invalidateQueryKeys(queryClient, [
        ['agent-outputs', orgId],
        ['agent-output', variables.id, orgId],
        ['my-outputs', userId, orgId],
        ['outputs-hub', orgId],
      ]);
      toast.success('Output archived successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to archive output');
    },
  });
}

export function useRestoreOutput() {
  const queryClient = useQueryClient();
  const { data: identity } = useUserIdentity();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const orgId = identity?.organization?.id;
      const userId = identity?.user?.id;
      if (!orgId || !userId) throw new Error('User or Organization not found');

      const { data, error } = await supabase
        .from('agent_outputs')
        .update({
          archived_at: null,
          archived_by: null,
          archive_reason: null,
          restored_by: userId,
          restored_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('org_id', orgId)
        .select('id, title, restored_at');

      if (error) throw new Error(error.message || 'Failed to restore output');
      if (!data || data.length === 0) {
        return handleResourceNotFound({
          queryClient,
          queryKeys: [
            ['agent-outputs', orgId],
            ['agent-output', id, orgId],
            ['my-outputs', userId, orgId],
            ['outputs-hub', orgId],
          ],
          logMessage: `[useRestoreOutput] Optimistic restore success for agent_outputs id: ${id} (already restored)`,
          payload: { id } as { id: string },
        });
      }
      return data[0];
    },
    onSuccess: (_, variables) => {
      const orgId = identity?.organization?.id;
      const userId = identity?.user?.id;
      invalidateQueryKeys(queryClient, [
        ['agent-outputs', orgId],
        ['agent-output', variables.id, orgId],
        ['my-outputs', userId, orgId],
        ['outputs-hub', orgId],
      ]);
      toast.success('Output restored successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to restore output');
    },
  });
}

export function useDeleteOutput() {
  const queryClient = useQueryClient();
  const { data: identity } = useUserIdentity();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const orgId = identity?.organization?.id;
      const userId = identity?.user?.id;
      if (!orgId || !userId) throw new Error('User or Organization not found');

      const { data, error } = await supabase
        .from('agent_outputs')
        .delete()
        .eq('id', id)
        .eq('org_id', orgId)
        .select('id, title');

      if (error) throw new Error(error.message || 'Failed to delete output');
      if (!data || data.length === 0) {
        return handleResourceNotFound({
          queryClient,
          queryKeys: [
            ['agent-outputs', orgId],
            ['agent-output', id, orgId],
            ['my-outputs', userId, orgId],
            ['outputs-hub', orgId],
          ],
          logMessage: `[useDeleteOutput] Optimistic delete success for agent_outputs id: ${id} (already deleted)`,
          payload: { id, message: 'Output was already deleted', warning: 'Item was already deleted from the database' },
        });
      }
      return { id, message: `${data[0].title} deleted successfully` };
    },
    onSuccess: (_, variables) => {
      const orgId = identity?.organization?.id;
      const userId = identity?.user?.id;
      invalidateQueryKeys(queryClient, [
        ['agent-outputs', orgId],
        ['agent-output', variables.id, orgId],
        ['my-outputs', userId, orgId],
        ['outputs-hub', orgId],
      ]);
      toast.success('Output deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete output');
    },
  });
}
