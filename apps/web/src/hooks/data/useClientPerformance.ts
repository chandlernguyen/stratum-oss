import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useUserIdentity } from './useUserIdentity';

interface CampaignPerformance {
  id: string;
  name: string;
  spend: number;
  roi: number;
  status: string;
}

interface ChannelBreakdown {
  [channel: string]: {
    spend: number;
    campaigns: number;
  };
}

interface TrendDataPoint {
  month: string;
  spend: number;
  roi: number;
}

interface ROISummary {
  total_roi: number;
  total_spend: number;
  campaign_count: number;
}

interface ClientPerformanceData {
  campaign_performance: CampaignPerformance[] | null;
  channel_breakdown: ChannelBreakdown | null;
  trend_data: TrendDataPoint[] | null;
  roi_summary: ROISummary;
}

/**
 * Hook to fetch performance metrics for a specific client
 * Calls the database function `get_client_performance`
 *
 * Returns:
 * - Campaign performance (spend, ROI, status)
 * - Channel breakdown (spend per channel)
 * - Trend data (monthly performance)
 * - ROI summary (totals and averages)
 *
 * @param clientId - The client ID to fetch performance for
 * @returns React Query result with client performance data
 */
export function useClientPerformance(clientId: string | null) {
  const { data: identity } = useUserIdentity();

  return useQuery({
    queryKey: ['clientPerformance', clientId, identity?.organization?.id],
    queryFn: async () => {
      if (!clientId || !identity?.organization?.id) {
        return null;
      }

      const { data, error } = await supabase.rpc('get_client_performance', {
        p_client_id: clientId,
        p_org_id: identity.organization.id,
      });

      if (error) {
        console.error('Error fetching client performance:', error);
        throw error;
      }

      // Database function returns array with single row
      return data && data.length > 0 ? (data[0] as ClientPerformanceData) : null;
    },
    enabled: !!clientId && !!identity?.organization?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes - performance metrics don't change frequently
    refetchOnWindowFocus: false, // Don't refetch on tab focus (expensive query)
    retry: 1, // Retry once on failure
  });
}
