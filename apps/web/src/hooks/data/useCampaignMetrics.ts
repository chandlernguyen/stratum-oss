import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useUserIdentity } from './useUserIdentity';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/lib/api';
import { getLocaleHeaders } from '@/lib/apiHeaders';

// Types for campaign metrics
export interface CampaignMetric {
  id: string;
  org_id: string;
  campaign_id?: string;
  campaign_name: string;
  metric_date: string;
  spend: number;
  revenue?: number;
  impressions?: number;
  clicks?: number;
  conversions?: number;
  ctr?: number;
  cpc?: number;
  source?: 'google_ads' | 'meta_ads' | 'linkedin_ads' | 'manual' | 'other';
  import_method?: 'manual' | 'csv' | 'api';
  raw_data?: Record<string, any>;
  notes?: string;
  created_at: string;
  created_by?: string;
  updated_at: string;
  updated_by?: string;

  // Phase 6: Conversion Tracking (for SMEs without revenue attribution)
  conversion_goal?: 'revenue' | 'leads' | 'calls' | 'appointments' | 'form_fills' | 'downloads' | 'signups' | 'demo_requests' | 'other';
  conversion_value?: number; // Estimated value per conversion
  leads?: number;
  qualified_leads?: number;
  calls?: number;
  appointments?: number;
  form_fills?: number;
  cost_per_lead?: number;
  cost_per_acquisition?: number;
  estimated_revenue?: number; // conversions × conversion_value

  // Phase 6.5: Engagement Tracking (for social/video marketing)
  video_views?: number;
  likes?: number;
  shares?: number;
  comments?: number;
  saves?: number;
  followers_gained?: number;
  engagement_rate?: number; // (likes + shares + comments) / impressions × 100
  watch_time_seconds?: number;
  profile_visits?: number;
  cost_per_view?: number; // spend / video_views
  cost_per_engagement?: number; // spend / (likes + shares + comments)
  cost_per_follower?: number; // spend / followers_gained
}

export interface CampaignMetricsSummary {
  total_campaigns: number;
  total_spend: number;
  total_revenue: number;
  avg_roi: number;
  campaigns_tracked: string[];
}

interface UseCampaignMetricsOptions {
  campaignId?: string;
  campaignName?: string;
  source?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

// Main campaign metrics list hook
export function useCampaignMetrics(options: UseCampaignMetricsOptions = {}) {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useQuery({
    queryKey: ['campaign-metrics', orgId, options],
    queryFn: async (): Promise<CampaignMetric[]> => {
      if (!orgId) {
        console.log('[useCampaignMetrics] No org_id available');
        return [];
      }

      let query = supabase
        .from('campaign_metrics')
        .select('*')
        .eq('org_id', orgId);

      if (options.campaignId) {
        query = query.eq('campaign_id', options.campaignId);
      }
      if (options.campaignName) {
        query = query.eq('campaign_name', options.campaignName);
      }
      if (options.source) {
        query = query.eq('source', options.source);
      }
      if (options.startDate) {
        query = query.gte('metric_date', options.startDate);
      }
      if (options.endDate) {
        query = query.lte('metric_date', options.endDate);
      }
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
      }

      query = query.order('metric_date', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('[useCampaignMetrics] Error fetching metrics:', error);
        throw error;
      }

      return data as CampaignMetric[];
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000, // 2 minutes cache
  });
}

// Single campaign metric hook
export function useCampaignMetric(id: string | undefined) {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useQuery({
    queryKey: ['campaign-metric', id, orgId],
    queryFn: async (): Promise<CampaignMetric | null> => {
      if (!orgId || !id) return null;

      const { data, error } = await supabase
        .from('campaign_metrics')
        .select('*')
        .eq('id', id)
        .eq('org_id', orgId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        console.error('[useCampaignMetric] Error fetching metric:', error);
        throw error;
      }

      return data as CampaignMetric;
    },
    enabled: !!orgId && !!id,
    staleTime: 5 * 60 * 1000,
  });
}

// Campaign metrics summary hook (uses database function)
export function useCampaignMetricsSummary(
  startDate?: string,
  endDate?: string
) {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useQuery({
    queryKey: ['campaign-metrics-summary', orgId, startDate, endDate],
    queryFn: async (): Promise<CampaignMetricsSummary | null> => {
      if (!orgId) {
        console.log('[useCampaignMetricsSummary] No org_id available');
        return null;
      }

      const { data, error } = await supabase.rpc('get_campaign_metrics_summary', {
        p_org_id: orgId,
        p_start_date: startDate || null,
        p_end_date: endDate || null,
      });

      if (error) {
        console.error('[useCampaignMetricsSummary] Error fetching summary:', error);
        throw error;
      }

      // Function returns array with single row
      const summary = data?.[0];
      if (!summary) {
        return {
          total_campaigns: 0,
          total_spend: 0,
          total_revenue: 0,
          avg_roi: 0,
          campaigns_tracked: [],
        };
      }

      return {
        total_campaigns: summary.total_campaigns || 0,
        total_spend: summary.total_spend || 0,
        total_revenue: summary.total_revenue || 0,
        avg_roi: summary.avg_roi || 0,
        campaigns_tracked: summary.campaigns_tracked || [],
      };
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
  });
}

// Metrics by campaign name hook (for grouping)
export function useCampaignMetricsByCampaign(campaignName: string | undefined) {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useQuery({
    queryKey: ['campaign-metrics-by-campaign', orgId, campaignName],
    queryFn: async (): Promise<CampaignMetric[]> => {
      if (!orgId || !campaignName) return [];

      const { data, error } = await supabase
        .from('campaign_metrics')
        .select('*')
        .eq('org_id', orgId)
        .eq('campaign_name', campaignName)
        .order('metric_date', { ascending: false });

      if (error) {
        console.error('[useCampaignMetricsByCampaign] Error fetching metrics:', error);
        throw error;
      }

      return data as CampaignMetric[];
    },
    enabled: !!orgId && !!campaignName,
    staleTime: 2 * 60 * 1000,
  });
}

// Mutation: Create campaign metric
export function useCreateCampaignMetric() {
  const queryClient = useQueryClient();
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;
  const userId = identity?.user?.id;

  return useMutation({
    mutationFn: async (metricData: Omit<CampaignMetric, 'id' | 'org_id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>) => {
      if (!orgId || !userId) {
        throw new Error('User or Organization not found');
      }

      const { data, error } = await supabase
        .from('campaign_metrics')
        .insert({
          ...metricData,
          org_id: orgId,
          created_by: userId,
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message || 'Failed to create campaign metric');
      }

      return data as CampaignMetric;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-metrics', orgId] });
      queryClient.invalidateQueries({ queryKey: ['campaign-metrics-summary', orgId] });
      queryClient.invalidateQueries({ queryKey: ['campaigns', orgId] }); // Refresh campaigns list to show performance indicators
      toast.success('Campaign metric created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create campaign metric');
    },
  });
}

// Mutation: Update campaign metric
export function useUpdateCampaignMetric() {
  const queryClient = useQueryClient();
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;
  const userId = identity?.user?.id;

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CampaignMetric> }) => {
      if (!orgId || !userId) {
        throw new Error('User or Organization not found');
      }

      const { data: result, error } = await supabase
        .from('campaign_metrics')
        .update({
          ...data,
          updated_by: userId,
        })
        .eq('id', id)
        .eq('org_id', orgId)
        .select()
        .single();

      if (error) {
        throw new Error(error.message || 'Failed to update campaign metric');
      }

      return result as CampaignMetric;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-metrics', orgId] });
      queryClient.invalidateQueries({ queryKey: ['campaign-metric', variables.id, orgId] });
      queryClient.invalidateQueries({ queryKey: ['campaign-metrics-summary', orgId] });
      queryClient.invalidateQueries({ queryKey: ['campaigns', orgId] }); // Refresh campaigns list to show performance indicators
      toast.success('Campaign metric updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update campaign metric');
    },
  });
}

// Mutation: Delete campaign metric
export function useDeleteCampaignMetric() {
  const queryClient = useQueryClient();
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      if (!orgId) {
        throw new Error('Organization not found');
      }

      const { error } = await supabase
        .from('campaign_metrics')
        .delete()
        .eq('id', id)
        .eq('org_id', orgId);

      if (error) {
        throw new Error(error.message || 'Failed to delete campaign metric');
      }

      return { id };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-metrics', orgId] });
      queryClient.invalidateQueries({ queryKey: ['campaign-metric', variables.id, orgId] });
      queryClient.invalidateQueries({ queryKey: ['campaign-metrics-summary', orgId] });
      toast.success('Campaign metric deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete campaign metric');
    },
  });
}

// Mutation: Bulk import campaign metrics (for CSV upload)
export function useBulkImportCampaignMetrics() {
  const queryClient = useQueryClient();
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;
  const userId = identity?.user?.id;

  return useMutation({
    mutationFn: async (metrics: Omit<CampaignMetric, 'id' | 'org_id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>[]) => {
      if (!orgId || !userId) {
        throw new Error('User or Organization not found');
      }

      const metricsWithOrgId = metrics.map(metric => ({
        ...metric,
        org_id: orgId,
        created_by: userId,
      }));

      const { data, error } = await supabase
        .from('campaign_metrics')
        .insert(metricsWithOrgId)
        .select();

      if (error) {
        throw new Error(error.message || 'Failed to import campaign metrics');
      }

      return data as CampaignMetric[];
    },
    onSuccess: (data) => {
      // Invalidate all related queries to refresh the UI immediately
      queryClient.invalidateQueries({ queryKey: ['campaign-metrics', orgId] });
      queryClient.invalidateQueries({ queryKey: ['campaign-metrics-summary', orgId] });
      queryClient.invalidateQueries({ queryKey: ['roi-dashboard-metrics', orgId] });
      queryClient.invalidateQueries({ queryKey: ['budget-optimization-data', orgId] });
      queryClient.invalidateQueries({ queryKey: ['campaigns', orgId] }); // Refresh campaigns list to show performance indicators
      toast.success(`${data.length} campaign metrics imported successfully`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to import campaign metrics');
    },
  });
}

// Mutation: Delete all campaign metrics for organization
export function useDeleteAllCampaignMetrics() {
  const queryClient = useQueryClient();
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useMutation({
    mutationFn: async () => {
      if (!orgId) {
        throw new Error('Organization not found');
      }

      const { error, count } = await supabase
        .from('campaign_metrics')
        .delete()
        .eq('org_id', orgId)
        .select();

      if (error) {
        throw new Error(error.message || 'Failed to delete campaign metrics');
      }

      return { deleted: count || 0 };
    },
    onSuccess: (result) => {
      // Invalidate all dependent caches
      queryClient.invalidateQueries({ queryKey: ['campaign-metrics', orgId] });
      queryClient.invalidateQueries({ queryKey: ['campaign-metrics-summary', orgId] });
      queryClient.invalidateQueries({ queryKey: ['roi-dashboard-metrics', orgId] });
      queryClient.invalidateQueries({ queryKey: ['budget-optimization-data', orgId] });

      toast.success(`Deleted ${result.deleted} campaign metrics`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete campaign metrics');
    },
  });
}

// Budget Optimization Data Hook
export interface BudgetOptimizationData {
  channel: string;
  total_spend: number;
  total_revenue: number;
  total_conversions: number;
  total_impressions: number;
  total_clicks: number;
  avg_roi: number;
  avg_cpc: number;
  avg_ctr: number;
  campaign_count: number;
}

export function useBudgetOptimizationData(startDate?: string, endDate?: string) {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useQuery({
    queryKey: ['budget-optimization-data', orgId, startDate, endDate],
    queryFn: async (): Promise<BudgetOptimizationData[]> => {
      if (!orgId) return [];

      const { data, error } = await supabase.rpc('get_budget_optimization_data', {
        p_org_id: orgId,
        p_start_date: startDate || null,
        p_end_date: endDate || null,
      });

      if (error) {
        console.error('Error fetching budget optimization data:', error);
        throw error;
      }

      return data as BudgetOptimizationData[];
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ROI Dashboard Metrics Hook
export interface ROIDashboardMetrics {
  // Common metrics (always present)
  total_spend: number;
  campaigns_tracked: number;
  metrics_count: number;
  earliest_date: string | null;
  latest_date: string | null;
  active_channels: number;
  total_conversions: number;
  avg_cpc: number;

  // Metric type indicator (Phase 6.5: added 'engagement')
  metric_type: 'revenue' | 'conversions' | 'engagement';

  // Revenue-based metrics (when metric_type === 'revenue')
  total_revenue?: number;
  avg_roi?: number;

  // Conversion-based metrics (when metric_type === 'conversions')
  total_leads?: number;
  total_calls?: number;
  total_appointments?: number;
  avg_cpl?: number; // Cost Per Lead
  avg_cpa?: number; // Cost Per Acquisition
  estimated_total_revenue?: number; // Sum of estimated_revenue fields

  // Phase 6.5: Engagement metrics (present in all metric types)
  total_video_views?: number;
  total_likes?: number;
  total_shares?: number;
  total_comments?: number;
  total_saves?: number;
  total_followers_gained?: number;
  avg_engagement_rate?: number;
  total_watch_time_seconds?: number;
  total_profile_visits?: number;
  avg_cpv?: number; // Cost Per View
  avg_cpe?: number; // Cost Per Engagement
  avg_cost_per_follower?: number;
}

export function useROIDashboardMetrics() {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useQuery({
    queryKey: ['roi-dashboard-metrics', orgId],
    queryFn: async (): Promise<ROIDashboardMetrics | null> => {
      if (!orgId) return null;

      const { data, error } = await supabase.rpc('get_roi_dashboard_metrics', {
        p_org_id: orgId,
      });

      if (error) {
        console.error('Error fetching ROI dashboard metrics:', error);
        throw error;
      }

      // Database function returns object directly (not wrapped in array)
      return data ? (data as ROIDashboardMetrics) : null;
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000, // 2 minutes cache
  });
}

// Hook to get metrics count per campaign (for performance indicators on campaign cards)
export function useCampaignMetricsMapping() {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useQuery({
    queryKey: ['campaign-metrics-mapping', orgId],
    queryFn: async (): Promise<Record<string, number>> => {
      if (!orgId) return {};

      const { data, error } = await supabase
        .from('campaign_metrics')
        .select('campaign_id')
        .eq('org_id', orgId)
        .not('campaign_id', 'is', null);

      if (error) {
        console.error('[useCampaignMetricsMapping] Error fetching metrics mapping:', error);
        return {};
      }

      // Count metrics per campaign_id
      const mapping: Record<string, number> = {};
      data.forEach((item) => {
        if (item.campaign_id) {
          mapping[item.campaign_id] = (mapping[item.campaign_id] || 0) + 1;
        }
      });

      return mapping;
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000, // 2 minutes cache
  });
}

// Phase 2: Import campaign metrics with fuzzy name matching
export interface CampaignMetricRow {
  campaign_name: string;
  metric_date: string;
  spend: number;
  revenue?: number;
  impressions?: number;
  clicks?: number;
  conversions?: number;
  source?: string;
  notes?: string;
}

export interface ImportSummary {
  success: boolean;
  imported_count: number;
  skipped_count: number;
  error_count: number;
  campaigns_mapped: number;
  errors: string[];
}

export function useImportCampaignMetricsWithMapping() {
  const queryClient = useQueryClient();
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useMutation({
    mutationFn: async ({
      metrics,
      mappings
    }: {
      metrics: CampaignMetricRow[];
      mappings: Map<string, string>;
    }): Promise<ImportSummary> => {
      if (!orgId) {
        throw new Error('Organization not found');
      }

      // Get auth token for API call
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('Authentication required');
      }

      // Convert Map to plain object for JSON serialization
      const mappingsObj = Object.fromEntries(mappings);

      const response = await fetch(`${API_BASE_URL}/api/v1/campaign-metrics/import`, {
        method: 'POST',
        headers: getLocaleHeaders({
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        }),
        body: JSON.stringify({
          metrics,
          mappings: mappingsObj
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `Failed to import metrics: ${response.statusText}`);
      }

      const data = await response.json();
      return data as ImportSummary;
    },
    onSuccess: (summary) => {
      // Invalidate all related queries to refresh the UI immediately
      queryClient.invalidateQueries({ queryKey: ['campaign-metrics', orgId] });
      queryClient.invalidateQueries({ queryKey: ['campaign-metrics-summary', orgId] });
      queryClient.invalidateQueries({ queryKey: ['roi-dashboard-metrics', orgId] });
      queryClient.invalidateQueries({ queryKey: ['budget-optimization-data', orgId] });
      queryClient.invalidateQueries({ queryKey: ['campaigns', orgId] });
      queryClient.invalidateQueries({ queryKey: ['campaign-metrics-mapping', orgId] });

      if (summary.success && summary.error_count === 0) {
        toast.success(
          `Successfully imported ${summary.imported_count} metrics across ${summary.campaigns_mapped} campaigns`
        );
      } else if (summary.imported_count > 0) {
        toast.warning(
          `Imported ${summary.imported_count} metrics with ${summary.error_count} errors`,
          {
            description: summary.errors.slice(0, 3).join('; ')
          }
        );
      } else {
        toast.error('Failed to import metrics', {
          description: summary.errors.slice(0, 3).join('; ')
        });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to import campaign metrics');
    },
  });
}
