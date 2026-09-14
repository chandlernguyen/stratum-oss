import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useUserIdentity } from './useUserIdentity';

interface ClientInfo {
  id: string;
  name: string;
  brand_kit: any;
  org_id: string;
  created_at: string;
  archived_at: string | null;
}

interface MetricsSummary {
  total_spend: number;
  total_roi: number;
}

interface ClientDashboardData {
  client_info: ClientInfo;
  campaign_count: number;
  active_campaigns: any[] | null;
  team_members: any[] | null;
  recent_activity: any[] | null;
  metrics_summary: MetricsSummary;
}

/**
 * Hook to fetch comprehensive dashboard data for a specific client
 * Calls the database function `get_client_dashboard`
 *
 * @param clientId - The client ID to fetch dashboard for (from URL params)
 * @returns React Query result with client dashboard data
 */
export function useClientDashboard(clientId: string | null) {
  const { data: identity } = useUserIdentity();

  return useQuery({
    queryKey: ['clientDashboard', clientId, identity?.organization?.id],
    queryFn: async () => {
      if (!clientId || !identity?.organization?.id) {
        return null;
      }

      // Use schema-aware router function (migration 168)
      const { data, error } = await supabase.rpc('get_client_dashboard_routed', {
        p_client_id: clientId,
        p_org_id: identity.organization.id,
      });

      if (error) {
        console.error('Error fetching client dashboard:', error);
        throw error;
      }

      // Database function returns array with single row
      return data && data.length > 0 ? (data[0] as ClientDashboardData) : null;
    },
    enabled: !!clientId && !!identity?.organization?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes - dashboard data doesn't change frequently
    refetchOnWindowFocus: false, // Don't refetch on tab focus (expensive query)
    retry: 1, // Retry once on failure
  });
}
