import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useUserIdentity } from './useUserIdentity';

interface ClientSummary {
  client_id: string;
  client_name: string;
  campaign_count: number;
  total_spend: number;
  avg_roi: number;
}

interface OrgTotals {
  total_clients: number;
  total_campaigns: number;
  total_spend: number;
  average_roi: number;
}

interface TopPerformer {
  client_name: string;
  roi: number;
}

interface ClientAlert {
  client_name: string;
  alert_type: string;
  message: string;
}

interface CrossClientAnalyticsData {
  client_summaries: ClientSummary[] | null;
  org_totals: OrgTotals;
  top_performers: TopPerformer[] | null;
  alerts: ClientAlert[] | null;
}

/**
 * Hook to fetch cross-client analytics for agency owners
 * Calls the database function `get_cross_client_analytics`
 *
 * Returns:
 * - Client summaries (performance for all clients)
 * - Org totals (aggregate metrics across all clients)
 * - Top performers (highest ROI clients)
 * - Alerts (low-performing clients or issues)
 *
 * **Access Control**: Only available to users with 'agency_owner' role
 *
 * @returns React Query result with cross-client analytics data
 */
export function useCrossClientAnalytics() {
  const { data: identity } = useUserIdentity();

  // Check if user has agency_owner role
  // Note: Role checking will be implemented once user roles are available in useUserIdentity
  // For now, we check if organization is agency type
  const isAgency = identity?.organization?.type === 'AGENCY';

  return useQuery({
    queryKey: ['crossClientAnalytics', identity?.organization?.id],
    queryFn: async () => {
      if (!identity?.organization?.id) {
        return null;
      }

      const { data, error } = await supabase.rpc('get_cross_client_analytics', {
        p_org_id: identity.organization.id,
      });

      if (error) {
        console.error('Error fetching cross-client analytics:', error);
        throw error;
      }

      // Database function returns array with single row
      return data && data.length > 0 ? (data[0] as CrossClientAnalyticsData) : null;
    },
    enabled: !!identity?.organization?.id && isAgency,
    staleTime: 10 * 60 * 1000, // 10 minutes - expensive query, cache longer
    refetchOnWindowFocus: false, // Don't refetch on tab focus (very expensive query)
    retry: 1, // Retry once on failure
  });
}
