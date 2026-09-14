import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useUserIdentity } from './useUserIdentity';

// Enhanced dashboard data interface
export interface DashboardCompleteData {
  // Organization info
  org_id: string;
  org_name: string;
  org_type: string;

  // Core metrics (from cache)
  campaign_count: number;
  active_campaigns: number;
  completed_campaigns: number;
  total_budget_cents: number;
  total_spent_cents: number;
  budget_utilization_percentage: number;
  client_count: number;
  active_clients: number;
  team_member_count: number;
  new_members_30d: number;
  last_activity: string | null;

  // Recent data (top 5 each)
  recent_campaigns: Array<{
    id: string;
    name: string;
    status: string;
    budget_cents: number;
    spent_cents: number;
    client_name?: string;
    created_at: string;
    updated_at: string;
  }>;

  recent_clients: Array<{
    id: string;
    name: string;
    status: string;
    industry?: string;
    campaigns_count: number;
    created_at: string;
  }>;

  // Team summary
  team_summary: Array<{
    id: string;
    email: string;
    created_at: string;
    role_count: number;
  }>;

  // Performance indicators
  performance_indicators: {
    budget_health: 'good' | 'warning' | 'critical';
    campaign_velocity: 'high' | 'medium' | 'low';
    team_growth: 'growing' | 'stable';
  };

  // Recent activity
  recent_activity: Array<{
    type: string;
    title: string;
    created_at: string;
    created_by?: string;
  }>;

  dashboard_generated_at: string;
}

// Hook for complete dashboard data in single call
export function useDashboardComplete() {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useQuery({
    queryKey: ['dashboard-complete', orgId],
    queryFn: async (): Promise<DashboardCompleteData | null> => {
      if (!orgId) return null;

      const { data, error } = await supabase.rpc('get_dashboard_complete', {
        p_org_id: orgId
      });

      if (error) {
        console.error('[useDashboardComplete] Error fetching dashboard data:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return null;
      }

      const result = data[0];

      // Map database results to interface with proper typing
      return {
        org_id: result.org_id,
        org_name: result.org_name,
        org_type: result.org_type,
        campaign_count: result.campaign_count,
        active_campaigns: result.active_campaigns,
        completed_campaigns: result.completed_campaigns,
        total_budget_cents: result.total_budget_cents,
        total_spent_cents: result.total_spent_cents,
        budget_utilization_percentage: result.budget_utilization_percentage,
        client_count: result.client_count,
        active_clients: result.active_clients,
        team_member_count: result.team_member_count,
        new_members_30d: result.new_members_30d,
        last_activity: result.last_activity,
        recent_campaigns: result.recent_campaigns || [],
        recent_clients: result.recent_clients || [],
        team_summary: result.team_summary || [],
        performance_indicators: result.performance_indicators || {
          budget_health: 'good',
          campaign_velocity: 'medium',
          team_growth: 'stable'
        },
        recent_activity: result.recent_activity || [],
        dashboard_generated_at: result.dashboard_generated_at
      };
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000, // 2 minutes cache
    refetchOnWindowFocus: false,
  });
}

// Hook for cached dashboard metrics with enhanced performance
export function useDashboardMetricsEnhanced() {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useQuery({
    queryKey: ['dashboard-metrics-enhanced', orgId],
    queryFn: async () => {
      if (!orgId) return null;

      const { data, error } = await supabase.rpc('get_dashboard_metrics_cached', {
        p_org_id: orgId
      });

      if (error) {
        console.error('[useDashboardMetricsEnhanced] Error fetching metrics:', error);
        throw error;
      }

      return data && data.length > 0 ? data[0] : null;
    },
    enabled: !!orgId,
    staleTime: 30 * 1000, // 30 seconds cache for metrics
    refetchOnWindowFocus: false,
  });
}

// Helper hook for performance indicators
export function usePerformanceIndicators() {
  const { data: dashboardData } = useDashboardComplete();

  if (!dashboardData) {
    return {
      budgetHealth: 'good' as const,
      campaignVelocity: 'medium' as const,
      teamGrowth: 'stable' as const,
      isLoading: true
    };
  }

  return {
    budgetHealth: dashboardData.performance_indicators.budget_health,
    campaignVelocity: dashboardData.performance_indicators.campaign_velocity,
    teamGrowth: dashboardData.performance_indicators.team_growth,
    isLoading: false,
    // Computed metrics
    budgetUtilization: dashboardData.budget_utilization_percentage,
    campaignEfficiency: dashboardData.active_campaigns > 0
      ? (dashboardData.completed_campaigns / dashboardData.campaign_count) * 100
      : 0,
    teamProductivity: dashboardData.team_member_count > 0
      ? dashboardData.campaign_count / dashboardData.team_member_count
      : 0
  };
}

// Hook for real-time dashboard updates (Supabase Realtime)
export function useDashboardRealtime() {
  // TODO: Implement Supabase Realtime subscription
  // This would listen to pg_notify events from our triggers
  // Example: 'org_metrics_updated', 'org_metrics_' + orgId

  return {
    isConnected: false, // TODO: Implement real-time connection status
    lastUpdate: null,   // TODO: Implement last update timestamp
    subscribe: () => {  // TODO: Implement subscription function
      // supabase.channel(`org_metrics_${orgId}`)
      //   .on('postgres_changes', { event: '*', schema: 'public' }, payload => {
      //     // Handle real-time updates
      //   })
      //   .subscribe()
    }
  };
}