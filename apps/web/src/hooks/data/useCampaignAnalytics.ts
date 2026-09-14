import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useUserIdentity } from './useUserIdentity';

export interface CampaignAnalytics {
  campaign_id: string;
  campaign_name: string;
  campaign_status: string;

  // Budget & Spending Analytics
  total_budget: number;
  total_spent: number;
  budget_utilization_percentage: number;
  remaining_budget: number;
  daily_spend_rate: number;
  projected_spend: number;
  budget_burn_rate: string;

  // Performance Metrics
  conversions: number;
  reach: number;
  impressions: number;
  click_through_rate: number;
  cost_per_click: number;
  cost_per_conversion: number;
  conversion_rate: number;

  // Time-based Analytics
  days_active: number;
  days_remaining: number | null;
  campaign_progress_percentage: number;

  // Related Content Analytics
  strategies_count: number;
  personas_count: number;
  outputs_count: number;
  active_outputs_count: number;

  // Engagement Insights
  avg_engagement_score: number;
  top_performing_channel: string;
  channel_performance: {
    channels: any[];
    primary_channel_performance: string;
    total_channels: number;
  };

  // Trend Analysis
  performance_trend: string;
  weekly_performance: {
    current_week_spend: number;
    daily_spend_average: number;
    performance_score: number;
    engagement_level: string;
  };

  analytics_generated_at: string;
}

export function useCampaignAnalytics(campaignId: string, periodDays: number = 30) {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useQuery({
    queryKey: ['campaign-analytics', campaignId, orgId, periodDays],
    queryFn: async (): Promise<CampaignAnalytics | null> => {
      if (!campaignId || !orgId) {
        return null;
      }

      // Fetch both campaign details and performance metrics in parallel
      // Use schema-aware router functions (migrations 169, 259)
      const [detailsResponse, performanceResponse] = await Promise.all([
        supabase.rpc('get_campaign_details_routed', {
          p_campaign_id: campaignId,
          p_org_id: orgId
        }),
        supabase.rpc('get_campaign_performance_summary_routed', {
          p_campaign_id: campaignId,
          p_org_id: orgId
        })
      ]);

      if (detailsResponse.error) {
        console.error('Campaign details fetch error:', detailsResponse.error);
        return null;
      }

      // get_campaign_details_routed returns single JSONB object, not array
      if (!detailsResponse.data) {
        return null;
      }

      const details = detailsResponse.data;  // Direct access, not [0]
      const performance = performanceResponse.data?.[0] || null;

      // Calculate time-based metrics (with null safety for start_date)
      const daysActive = details.start_date
        ? Math.max(0, Math.floor((new Date().getTime() - new Date(details.start_date).getTime()) / (1000 * 60 * 60 * 24)))
        : (performance?.days_active || 0);

      const daysRemaining = details.end_date
        ? Math.max(0, Math.floor((new Date(details.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
        : null;

      const totalDays = details.start_date && details.end_date
        ? Math.floor((new Date(details.end_date).getTime() - new Date(details.start_date).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      const campaignProgressPercentage = totalDays && totalDays > 0
        ? Math.min(100, (daysActive / totalDays) * 100)
        : 0;

      // Calculate budget metrics
      const totalSpent = performance?.total_spend ? Number(performance.total_spend) : (details.spent_cents / 100);
      const totalBudget = details.budget_cents / 100;
      const budgetUtilization = details.budget_utilization_percentage || 0;
      const remainingBudget = totalBudget - totalSpent;

      const dailySpendRate = daysActive > 0 ? totalSpent / daysActive : 0;
      const projectedSpend = totalDays && totalDays > 0 && dailySpendRate > 0
        ? dailySpendRate * totalDays
        : totalSpent;

      // Determine budget burn rate
      let budgetBurnRate = 'normal';
      if (budgetUtilization > 90) budgetBurnRate = 'critical';
      else if (budgetUtilization > 75) budgetBurnRate = 'high';
      else if (budgetUtilization > 50) budgetBurnRate = 'moderate';
      else budgetBurnRate = 'low';

      // Performance metrics from campaign_metrics table
      const totalImpressions = performance?.total_impressions ? Number(performance.total_impressions) : 0;
      // const totalClicks = performance?.total_clicks ? Number(performance.total_clicks) : 0; // Unused
      const totalConversions = performance?.total_conversions ? Number(performance.total_conversions) : 0;
      const ctr = performance?.avg_ctr ? Number(performance.avg_ctr) : 0;
      const cpc = performance?.avg_cpc ? Number(performance.avg_cpc) : 0;
      const conversionRate = performance?.conversion_rate ? Number(performance.conversion_rate) : 0;
      const costPerConversion = totalConversions > 0 ? totalSpent / totalConversions : 0;

      // Engagement score (based on CTR and conversion rate)
      const avgEngagementScore = ((ctr * 10) + (conversionRate * 20)) / 2;

      // Performance trend analysis
      let performanceTrend = 'normal';
      if (conversionRate > 5) performanceTrend = 'excellent';
      else if (conversionRate > 2.5) performanceTrend = 'good';
      else if (conversionRate > 1) performanceTrend = 'average';
      else if (performance?.has_data) performanceTrend = 'below_average';
      else performanceTrend = 'no_data';

      // Engagement level
      let engagementLevel = 'normal';
      if (avgEngagementScore > 50) engagementLevel = 'excellent';
      else if (avgEngagementScore > 25) engagementLevel = 'good';
      else if (avgEngagementScore > 10) engagementLevel = 'average';
      else if (performance?.has_data) engagementLevel = 'below_average';

      // Map to CampaignAnalytics interface with real data
      return {
        campaign_id: details.id,
        campaign_name: details.name,
        campaign_status: details.status,

        // Budget & Spending (real data from both sources)
        total_budget: totalBudget,
        total_spent: totalSpent,
        budget_utilization_percentage: budgetUtilization,
        remaining_budget: remainingBudget,
        daily_spend_rate: dailySpendRate,
        projected_spend: projectedSpend,
        budget_burn_rate: budgetBurnRate,

        // Performance Metrics (real data from campaign_metrics)
        conversions: totalConversions,
        reach: totalImpressions, // Using impressions as reach proxy
        impressions: totalImpressions,
        click_through_rate: ctr,
        cost_per_click: cpc,
        cost_per_conversion: costPerConversion,
        conversion_rate: conversionRate,

        // Time-based Analytics
        days_active: daysActive,
        days_remaining: daysRemaining,
        campaign_progress_percentage: campaignProgressPercentage,

        // Related Content Analytics (from campaign details)
        strategies_count: details.strategies_count || 0,
        personas_count: details.personas_count || 0,
        outputs_count: details.content_outputs_count || 0,
        active_outputs_count: details.content_outputs_count || 0,

        // Engagement Insights
        avg_engagement_score: avgEngagementScore,
        top_performing_channel: details.marketing_channels?.[0] || 'unknown',
        channel_performance: {
          channels: details.marketing_channels || [],
          primary_channel_performance: performanceTrend,
          total_channels: details.marketing_channels?.length || 0
        },

        // Trend Analysis
        performance_trend: performanceTrend,
        weekly_performance: {
          current_week_spend: totalSpent,
          daily_spend_average: dailySpendRate,
          performance_score: avgEngagementScore,
          engagement_level: engagementLevel
        },

        analytics_generated_at: new Date().toISOString()
      };
    },
    enabled: !!campaignId && !!orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes - analytics don't change frequently
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
    retryDelay: 1000,
  });
}

// Convenience hook for multiple campaigns analytics
export function useCampaignsAnalyticsSummary(campaignIds: string[], periodDays: number = 30) {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useQuery({
    queryKey: ['campaigns-analytics-summary', campaignIds, orgId, periodDays],
    queryFn: async () => {
      if (!campaignIds.length || !orgId) {
        return [];
      }

      // Fetch analytics for all campaigns in parallel using schema-aware router (migration 169)
      const analyticsPromises = campaignIds.map(async (campaignId) => {
        const { data, error } = await supabase.rpc('get_campaign_details_routed', {
          p_campaign_id: campaignId,
          p_org_id: orgId
        });

        // get_campaign_details_routed returns single JSONB object, not array
        if (error || !data) {
          console.warn(`Failed to fetch analytics for campaign ${campaignId}:`, error);
          return null;
        }

        const details = data;  // Direct access, not [0]

        // Map to CampaignAnalytics interface
        return {
          campaign_id: details.id,
          campaign_name: details.name,
          campaign_status: details.status,
          total_budget: details.budget_cents / 100,
          total_spent: details.spent_cents / 100,
          budget_utilization_percentage: details.budget_utilization_percentage || 0,
          remaining_budget: (details.budget_cents - details.spent_cents) / 100,
          daily_spend_rate: 0,
          projected_spend: details.spent_cents / 100,
          budget_burn_rate: 'normal',
          conversions: 0,
          reach: 0,
          impressions: 0,
          click_through_rate: 0,
          cost_per_click: 0,
          cost_per_conversion: 0,
          conversion_rate: 0,
          days_active: details.start_date ? Math.floor((new Date().getTime() - new Date(details.start_date).getTime()) / (1000 * 60 * 60 * 24)) : 0,
          days_remaining: details.end_date ? Math.floor((new Date(details.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null,
          campaign_progress_percentage: 0,
          strategies_count: details.strategies_count || 0,
          personas_count: details.personas_count || 0,
          outputs_count: details.content_outputs_count || 0,
          active_outputs_count: details.content_outputs_count || 0,
          avg_engagement_score: 0,
          top_performing_channel: details.marketing_channels?.[0] || 'unknown',
          channel_performance: {
            channels: details.marketing_channels || [],
            primary_channel_performance: 'unknown',
            total_channels: details.marketing_channels?.length || 0
          },
          performance_trend: 'normal',
          weekly_performance: {
            current_week_spend: details.spent_cents / 100,
            daily_spend_average: 0,
            performance_score: 0,
            engagement_level: 'normal'
          },
          analytics_generated_at: new Date().toISOString()
        };
      });

      const results = await Promise.allSettled(analyticsPromises);
      return results
        .map(result => result.status === 'fulfilled' ? result.value : null)
        .filter((analytics): analytics is CampaignAnalytics => analytics !== null);
    },
    enabled: !!campaignIds.length && !!orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Helper hook for campaign performance insights
export function useCampaignPerformanceInsights(campaignId: string) {
  const analytics = useCampaignAnalytics(campaignId);

  return {
    ...analytics,
    data: analytics.data ? {
      ...analytics.data,
      // Add computed insights
      budgetHealth: analytics.data.budget_burn_rate,
      performanceRating: analytics.data.performance_trend,
      engagementLevel: analytics.data.weekly_performance?.engagement_level || 'unknown',
      isOverBudget: analytics.data.budget_utilization_percentage > 100,
      isUnderperforming: analytics.data.performance_trend === 'below_average' || analytics.data.performance_trend === 'no_data',

      // Budget insights
      daysToEndBudget: analytics.data.remaining_budget > 0 && analytics.data.daily_spend_rate > 0
        ? Math.floor(analytics.data.remaining_budget / analytics.data.daily_spend_rate)
        : null,

      // Performance insights
      hasGoodConversionRate: analytics.data.conversion_rate > 2.5,
      hasGoodEngagement: analytics.data.click_through_rate > 1.5,

      // Content insights
      hasStrategies: analytics.data.strategies_count > 0,
      hasPersonas: analytics.data.personas_count > 0,
      hasActiveOutputs: analytics.data.active_outputs_count > 0,
    } : null
  };
}