import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useUserIdentity } from './useUserIdentity';
import { useRealtimeSubscription } from '../useRealtimeSubscription'; // Phase 2 Task 2.3: Real-time updates

// Types matching database function outputs
export interface Client {
  id: string;
  org_id: string;
  name: string;
  slug?: string;
  industry?: string;
  website?: string;
  contact_email?: string;
  contact_phone?: string;
  status?: string;
  settings?: Record<string, any>;
  created_at: string;
  updated_at: string;
  archived_at?: string;
  archived_by?: string;
  archive_reason?: string;
  is_archived?: boolean;
  created_by?: string;
  updated_by?: string;
  // Enhanced metadata from database function
  campaigns_count: number;
  active_campaigns_count: number;
  total_budget: number;
  last_activity_at?: string;
}

export interface ClientDetails extends Client {
  // Additional detailed fields from get_client_details
  completed_campaigns_count: number;
  spent_budget: number;
  remaining_budget: number;
  personas_count: number;
  strategies_count: number;
  outputs_count: number;
  performance_score: number;
}

export interface ClientsPerformance {
  total_clients: number;
  active_clients: number;
  archived_clients: number;
  clients_with_campaigns: number;
  avg_campaigns_per_client: number;
  total_client_budget: number;
  top_performing_clients: Array<{
    client_id: string;
    name: string;
    campaigns_count: number;
    total_budget: number;
    performance_score: number;
  }>;
  clients_by_industry: Record<string, number>;
  client_activity_trends: {
    clients_created_this_period: number;
    clients_updated_this_period: number;
  };
}

interface UseClientsOptions {
  includeArchived?: boolean;
  status?: string;
  limit?: number;
  offset?: number;
}

// Main clients list hook - Database-First + Real-time
export function useClients(options: UseClientsOptions = {}) {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  const query = useQuery({
    queryKey: ['clients', orgId, options],
    queryFn: async (): Promise<Client[]> => {
      if (!orgId) {
        console.log('[useClients] No org_id available');
        return [];
      }

      // Use schema-aware router function (migration 169)
      const { data, error } = await supabase.rpc('get_clients_list_routed', {
        p_org_id: orgId,
        p_include_archived: options.includeArchived || false,
        p_status: options.status || null,
        p_limit: options.limit || 50,
        p_offset: options.offset || 0
      });

      if (error) {
        console.error('[useClients] Error fetching clients:', error);
        throw error;
      }

      return (data || []) as Client[];
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000, // 2 minutes cache
  });

  // ✅ NEW: Real-time updates (Phase 2 Task 2.3)
  // Instant updates when clients change
  useRealtimeSubscription({
    table: 'clients',
    queryKeys: [
      ['clients', orgId, options],
      ['clients-performance', orgId, undefined]
    ],
    filter: orgId ? { column: 'org_id', value: orgId } : undefined,
  });

  return query;
}

// Single client details hook - Database-First
export function useClientDetails(clientId: string | undefined) {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useQuery({
    queryKey: ['client-details', clientId, orgId],
    queryFn: async (): Promise<ClientDetails | null> => {
      if (!orgId || !clientId) return null;

      // Use schema-aware router function (migration 169)
      const { data, error } = await supabase.rpc('get_client_details_routed', {
        p_client_id: clientId,
        p_org_id: orgId
      });

      if (error) {
        console.error('[useClientDetails] Error fetching client details:', error);
        throw error;
      }

      return data && data.length > 0 ? (data[0] as ClientDetails) : null;
    },
    enabled: !!orgId && !!clientId,
    staleTime: 5 * 60 * 1000, // 5 minutes cache for detailed data
  });
}

// Organization clients performance hook - Database-First
export function useClientsPerformance(periodDays: number = 30) {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useQuery({
    queryKey: ['clients-performance', orgId, periodDays],
    queryFn: async (): Promise<ClientsPerformance | null> => {
      if (!orgId) return null;

      // Use Database-First approach for comprehensive analytics
      const { data, error } = await supabase.rpc('get_clients_performance', {
        p_org_id: orgId,
        p_period_days: periodDays
      });

      if (error) {
        console.error('[useClientsPerformance] Error fetching clients performance:', error);
        throw error;
      }

      return data && data.length > 0 ? (data[0] as ClientsPerformance) : null;
    },
    enabled: !!orgId,
    staleTime: 10 * 60 * 1000, // 10 minutes cache for performance data
  });
}

// Legacy single client hook (schema-aware via router function)
export function useClient(id: string | undefined) {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useQuery({
    queryKey: ['client', id, orgId],
    queryFn: async () => {
      if (!orgId || !id) return null;

      // Use schema-aware router function (migration 166)
      const { data, error } = await supabase.rpc('get_client_basic_routed', {
        p_org_id: orgId,
        p_client_id: id
      });

      if (error) {
        if (error.code === 'PGRST116') return null;
        console.error('[useClient] Error fetching client:', error);
        throw error;
      }

      return data as Client;
    },
    enabled: !!orgId && !!id,
    staleTime: 5 * 60 * 1000,
  });
}

// Client by slug hook (schema-aware via router function)
export function useClientBySlug(slug: string | undefined) {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useQuery({
    queryKey: ['client-by-slug', slug, orgId],
    queryFn: async () => {
      if (!orgId || !slug) return null;

      // Use schema-aware router function (migration 166)
      const { data, error } = await supabase.rpc('get_client_by_slug_routed', {
        p_org_id: orgId,
        p_slug: slug
      });

      if (error) {
        if (error.code === 'PGRST116') {
          console.log(`[useClientBySlug] Client not found for slug: ${slug}`);
          return null;
        }
        console.error('[useClientBySlug] Error fetching client:', error);
        throw error;
      }

      return data as Client;
    },
    enabled: !!orgId && !!slug,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
}

// Active clients only hook
export function useActiveClients() {
  return useClients({
    includeArchived: false,
    status: undefined
  });
}

// Mutations (keeping write operations via API for now - Phase 4 candidate)
export function useCreateClient() {
  const queryClient = useQueryClient();
  const { data: identity } = useUserIdentity();

  return useMutation({
    mutationFn: async (data: Partial<Client>) => {
      const orgId = identity?.organization?.id;
      if (!orgId) {
        throw new Error('Organization ID is required');
      }

      if (!data.name) {
        throw new Error('Client name is required');
      }

      // Use schema-aware router function (migration 156)
      const { data: result, error } = await supabase.rpc('create_client_routed', {
        p_org_id: orgId,
        p_name: data.name,
        p_industry: data.industry || null,
        p_website: data.website || null,
        p_contact_email: data.contact_email || null,
        p_contact_phone: data.contact_phone || null,
        p_status: data.status || 'active',
        p_company_size: data.settings?.company_size || null,
        p_company_stage: data.settings?.company_stage || null,
        p_business_model: data.settings?.business_model || null,
        p_target_market: data.settings?.target_market || null,
        p_key_competitors: data.settings?.key_competitors || null,
        p_unique_value_proposition: data.settings?.unique_value_proposition || null,
        p_marketing_budget: data.settings?.marketing_budget || null,
        p_current_marketing_channels: data.settings?.current_marketing_channels || null,
        p_marketing_goals: data.settings?.marketing_goals || null,
        p_settings: data.settings || null
      });

      if (error) {
        console.error('[useCreateClient] Database error:', error);
        throw new Error(error.message || 'Failed to create client');
      }

      // Router function returns JSONB, not an array
      return result as Client;
    },
    onSuccess: () => {
      const orgId = identity?.organization?.id;
      queryClient.invalidateQueries({ queryKey: ['clients', orgId] });
      queryClient.invalidateQueries({ queryKey: ['clients-performance', orgId] });
      toast.success('Client created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create client');
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  const { data: identity } = useUserIdentity();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Client> }) => {
      const orgId = identity?.organization?.id;
      if (!orgId) {
        throw new Error('Organization ID is required');
      }

      // Use schema-aware router function (migration 194)
      const { data: result, error } = await supabase.rpc('update_client_routed', {
        p_client_id: id,
        p_org_id: orgId,
        p_name: data.name || null,
        p_slug: data.slug || null,
        p_industry: data.industry || null,
        p_website: data.website || null,
        p_contact_email: data.contact_email || null,
        p_contact_phone: data.contact_phone || null,
        p_status: data.status || null,
        p_company_size: data.settings?.company_size || null,
        p_company_stage: data.settings?.company_stage || null,
        p_business_model: data.settings?.business_model || null,
        p_target_market: data.settings?.target_market || null,
        p_key_competitors: data.settings?.key_competitors || null,
        p_unique_value_proposition: data.settings?.unique_value_proposition || null,
        p_marketing_budget: data.settings?.marketing_budget || null,
        p_current_marketing_channels: data.settings?.current_marketing_channels || null,
        p_marketing_goals: data.settings?.marketing_goals || null,
        p_settings: data.settings || null
      });

      if (error) {
        console.error('[useUpdateClient] Database error:', error);
        throw new Error(error.message || 'Failed to update client');
      }

      // Router function returns JSONB, not an array
      return result as Client;
    },
    onSuccess: (_, variables) => {
      const orgId = identity?.organization?.id;
      queryClient.invalidateQueries({ queryKey: ['clients', orgId] });
      queryClient.invalidateQueries({ queryKey: ['client', variables.id, orgId] });
      queryClient.invalidateQueries({ queryKey: ['client-details', variables.id, orgId] });
      queryClient.invalidateQueries({ queryKey: ['clients-performance', orgId] });
      toast.success('Client updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update client');
    },
  });
}

export function useArchiveClient() {
  const queryClient = useQueryClient();
  const { data: identity } = useUserIdentity();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const orgId = identity?.organization?.id;
      if (!orgId) {
        throw new Error('Organization ID is required');
      }

      // Use schema-aware router function (migration 195)
      const { data: result, error } = await supabase.rpc('archive_client_routed', {
        p_client_id: id,
        p_org_id: orgId,
        p_archive_reason: reason
      });

      if (error) {
        console.error('[useArchiveClient] Database error:', error);
        throw new Error(error.message || 'Failed to archive client');
      }

      // Router function returns JSONB, not an array
      return result;
    },
    onSuccess: (_, variables) => {
      const orgId = identity?.organization?.id;
      queryClient.invalidateQueries({ queryKey: ['clients', orgId] });
      queryClient.invalidateQueries({ queryKey: ['client', variables.id, orgId] });
      queryClient.invalidateQueries({ queryKey: ['client-details', variables.id, orgId] });
      queryClient.invalidateQueries({ queryKey: ['clients-performance', orgId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-clients', orgId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', orgId] });
      toast.success('Client archived successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to archive client');
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  const { data: identity } = useUserIdentity();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const orgId = identity?.organization?.id;
      if (!orgId) {
        throw new Error('Organization ID is required');
      }

      // Use schema-aware router function (migration 197)
      const { data: result, error } = await supabase.rpc('delete_client_routed', {
        p_client_id: id,
        p_org_id: orgId
      });

      if (error) {
        console.error('[useDeleteClient] Database error:', error);
        throw new Error(error.message || 'Failed to delete client');
      }

      // Router function returns JSONB
      return result;
    },
    onSuccess: (_, variables) => {
      const orgId = identity?.organization?.id;
      queryClient.invalidateQueries({ queryKey: ['clients', orgId] });
      queryClient.invalidateQueries({ queryKey: ['client', variables.id, orgId] });
      queryClient.invalidateQueries({ queryKey: ['client-details', variables.id, orgId] });
      queryClient.invalidateQueries({ queryKey: ['clients-performance', orgId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-clients', orgId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', orgId] });
      toast.success('Client deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete client');
    },
  });
}

export function useRestoreClient() {
  const queryClient = useQueryClient();
  const { data: identity } = useUserIdentity();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const orgId = identity?.organization?.id;
      if (!orgId) {
        throw new Error('Organization ID is required');
      }

      // Use schema-aware router function (migration 268)
      const { data: result, error } = await supabase.rpc('restore_client_routed', {
        p_client_id: id,
        p_org_id: orgId
      });

      if (error) {
        console.error('[useRestoreClient] Database error:', error);
        throw new Error(error.message || 'Failed to restore client');
      }

      // Router function returns JSONB
      return result;
    },
    onSuccess: (_, variables) => {
      const orgId = identity?.organization?.id;
      queryClient.invalidateQueries({ queryKey: ['clients', orgId] });
      queryClient.invalidateQueries({ queryKey: ['client', variables.id, orgId] });
      queryClient.invalidateQueries({ queryKey: ['client-details', variables.id, orgId] });
      queryClient.invalidateQueries({ queryKey: ['clients-performance', orgId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-clients', orgId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics', orgId] });
      toast.success('Client restored successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to restore client');
    },
  });
}