import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useUserIdentity } from './useUserIdentity'; // CORRECT: Import the new canonical hook

// Types for dashboard metrics matching database function
export interface DashboardMetrics {
  campaign_count: number;
  active_campaigns: number;
  total_budget: number;
  total_spent: number;
  client_count: number;
  team_member_count: number;
  last_activity: string | null;
  organization_type: string;

  // Legacy computed metrics for backward compatibility
  campaignCount: number;
  activeCampaigns: number;
  totalBudget: number;
  totalSpent: number;
  clientCount: number;
  teamMemberCount: number;
  lastActiveDate: string | null;
  organizationType: string;

  // Additional Phase 2 metrics
  completedCampaigns?: number;
  budgetUtilizationPercentage?: number;
  newMembers30d?: number;
  documentCount?: number;
  totalAIInteractions?: number;

  // Agency-specific metrics
  activeClients?: number;
  totalRevenue?: number;
  avgClientValue?: number;
}

export interface DashboardCampaign {
  id: string;
  name: string;
  status: string;
  budget?: number;
  spent?: number;
  start_date?: string;
  end_date?: string;
  client_id?: string;
  client_name?: string;
  created_at: string;
  roi?: number;
}

export interface DashboardClient {
  id: string;
  name: string;
  slug: string;
  status: string;
  industry?: string;
  campaigns_count: number;
  active_campaigns: number;
  created_at: string;
  archived_at?: string | null;
  archive_reason?: string | null;
}

export interface RecentActivity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  action?: string;
  agent?: string;
  user_name?: string;
  user_role?: string;
  client_name?: string;
}

// Main dashboard metrics hook with direct database access (Phase 1 compatible)
export function useDashboardMetrics() {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useQuery({
    queryKey: ['dashboard-metrics', orgId],
    queryFn: async (): Promise<DashboardMetrics> => {
      if (!orgId) throw new Error('Organization ID not available');

      // Use cached version for better performance (Phase 2 enhancement)
      const { data, error } = await supabase.rpc('get_dashboard_metrics_cached', { p_org_id: orgId });

      if (error) {
        console.error('Error fetching dashboard metrics:', error);
        throw new Error('Failed to fetch dashboard metrics');
      }

      if (!data || data.length === 0) {
        // Return default values if no data found
        return {
          campaign_count: 0,
          active_campaigns: 0,
          total_budget: 0,
          total_spent: 0,
          client_count: 0,
          team_member_count: 0,
          last_activity: null,
          organization_type: 'UNKNOWN',
          // Legacy compatibility
          campaignCount: 0,
          activeCampaigns: 0,
          totalBudget: 0,
          totalSpent: 0,
          clientCount: 0,
          teamMemberCount: 0,
          lastActiveDate: null,
          organizationType: 'UNKNOWN',
          documentCount: 0,
          totalAIInteractions: 0,
          activeClients: 0,
          totalRevenue: 0,
          avgClientValue: 0
        };
      }

      const result = data[0];

      // Map database function results to interface with backward compatibility
      return {
        // New format (matches database function)
        campaign_count: result.campaign_count || 0,
        active_campaigns: result.active_campaigns || 0,
        total_budget: result.total_budget || 0,
        total_spent: result.total_spent || 0,
        client_count: result.client_count || 0,
        team_member_count: result.team_member_count || 0,
        last_activity: result.last_activity,
        organization_type: result.organization_type || 'UNKNOWN',
        // Legacy format (for backward compatibility)
        campaignCount: result.campaign_count || 0,
        activeCampaigns: result.active_campaigns || 0,
        totalBudget: result.total_budget || 0,
        totalSpent: result.total_spent || 0,
        clientCount: result.client_count || 0,
        teamMemberCount: result.team_member_count || 0,
        lastActiveDate: result.last_activity,
        organizationType: result.organization_type || 'UNKNOWN',
        // Additional Phase 2 metrics
        completedCampaigns: result.completed_campaigns || 0,
        budgetUtilizationPercentage: result.budget_utilization_percentage || 0,
        newMembers30d: result.new_members_30d || 0,
        documentCount: result.document_count || 0,
        totalAIInteractions: result.total_ai_interactions || 0,
        // Agency metrics
        activeClients: result.active_clients || 0,
        totalRevenue: result.total_revenue || 0,
        avgClientValue: result.avg_client_value || 0
      };
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
  });
}

// Hook for dashboard campaigns list (schema-aware via router function)
export function useDashboardCampaigns(limit: number = 10) {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useQuery({
    queryKey: ['dashboard-campaigns', orgId, limit],
    queryFn: async (): Promise<DashboardCampaign[]> => {
      console.log('[useDashboardCampaigns] Starting query with orgId:', orgId);

      if (!orgId) {
        console.log('[useDashboardCampaigns] No orgId, returning empty array');
        return [];
      }

      console.log('[useDashboardCampaigns] Calling get_dashboard_campaigns_routed router function');
      // Use schema-aware router function (migration 166)
      const { data, error } = await supabase.rpc('get_dashboard_campaigns_routed', {
        p_org_id: orgId,
        p_limit: limit
      });

      if (error) {
        console.error('[useDashboardCampaigns] Query error:', error);
        throw error;
      }

      console.log('[useDashboardCampaigns] Query result:', {
        rowCount: data?.length || 0,
        firstCampaign: data?.[0]?.name
      });

      // Router function returns JSONB array, already formatted
      return data || [];
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook for dashboard clients list (schema-aware via router function)
export function useDashboardClients(limit: number = 20, includeArchived: boolean = false) {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useQuery({
    queryKey: ['dashboard-clients', orgId, limit, includeArchived],
    queryFn: async (): Promise<DashboardClient[]> => {
      console.log('[useDashboardClients] Starting query with orgId:', orgId, 'includeArchived:', includeArchived);

      if (!orgId) {
        console.log('[useDashboardClients] No orgId, returning empty array');
        return [];
      }

      console.log('[useDashboardClients] Calling get_dashboard_clients router function');
      const { data, error } = await supabase.rpc('get_dashboard_clients', {
        p_org_id: orgId,
        p_limit: limit,
        p_include_archived: includeArchived
      });

      if (error) {
        console.error('[useDashboardClients] Query error:', error);
        throw error;
      }

      console.log('[useDashboardClients] Query result:', {
        rowCount: data?.length || 0,
        firstClient: data?.[0]?.name
      });

      // Router function returns JSONB array, already formatted
      return data || [];
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook for recent activity (simplified for now)
export function useRecentActivity(limit: number = 10) {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useQuery({
    queryKey: ['recent-activity', orgId, limit],
    queryFn: async (): Promise<RecentActivity[]> => {
      if (!orgId) return [];

      const { data, error } = await supabase
        .from('agent_outputs') // 🚀 NUCLEAR: Use universal agent_outputs table
        .select('id, output_type, created_at, agent_type, title')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(output => ({
        id: output.id,
        type: 'agent_session',
        description: `${output.title || output.output_type || 'Analysis'} created`,
        timestamp: output.created_at,
        agent: output.agent_type
      }));
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}