/**
 * Database-First hook for Gemini cache cost metrics
 * Queries database functions directly instead of API endpoints
 */
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useUserIdentity } from '@/hooks/data/useUserIdentity';

export interface CacheCostMetrics {
  org_id: string;
  period_days: number;
  total_cost_usd: number;
  total_savings_usd: number;
  total_requests: number;
  cached_requests: number;
  cache_hit_rate: number;
  cost_by_agent: Record<string, {
    requests: number;
    total_cost_usd: number;
    cache_savings_usd: number;
    avg_input_tokens: number;
    avg_cached_tokens: number;
  }>;
  cost_by_model: Record<string, {
    requests: number;
    total_cost_usd: number;
  }>;
  daily_trend: Array<{
    day: string;
    requests: number;
    cost_usd: number;
    savings_usd: number;
  }>;
}

export interface MonthlySavingsEstimate {
  org_id: string;
  based_on_days: number;
  avg_daily_requests: number;
  estimated_monthly_requests: number;
  estimated_monthly_cost_usd: number;
  estimated_monthly_savings_usd: number;
  has_actual_data: boolean;
  data_quality: 'excellent' | 'good' | 'fair' | 'limited' | 'no_data';
}

/**
 * Hook to fetch cache cost metrics for the current organization
 * @param days Number of days to include in metrics (default: 30)
 */
export function useCostMetrics(days: number = 30) {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;
  const [metrics, setMetrics] = useState<CacheCostMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    const fetchMetrics = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: rpcError } = await supabase.rpc('get_cache_cost_metrics', {
          p_org_id: orgId,
          p_days: days,
        });

        if (rpcError) throw rpcError;

        setMetrics(data);
      } catch (err) {
        console.error('Failed to fetch cache cost metrics:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [orgId, days]);

  return { metrics, loading, error };
}

/**
 * Hook to fetch estimated monthly savings based on actual usage
 */
export function useEstimatedMonthlySavings() {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;
  const [estimate, setEstimate] = useState<MonthlySavingsEstimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    const fetchEstimate = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: rpcError } = await supabase.rpc('get_estimated_monthly_savings', {
          p_org_id: orgId,
        });

        if (rpcError) throw rpcError;

        setEstimate(data);
      } catch (err) {
        console.error('Failed to fetch savings estimate:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch estimate');
      } finally {
        setLoading(false);
      }
    };

    fetchEstimate();
  }, [orgId]);

  return { estimate, loading, error };
}

/**
 * Hook to fetch pre-aggregated cache metrics summary
 * Uses materialized view for better performance on dashboards
 */
export function useCacheMetricsSummary() {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;
  const [summary, setSummary] = useState<{
    total_requests: number;
    cached_requests: number;
    cache_hit_rate_pct: number;
    total_input_tokens: number;
    total_cached_tokens: number;
    total_cost_usd: number;
    total_savings_usd: number;
    last_request_at: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    const fetchSummary = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: queryError } = await supabase
          .from('cache_metrics_summary')
          .select('*')
          .eq('org_id', orgId)
          .maybeSingle();

        if (queryError) throw queryError;

        setSummary(data);
      } catch (err) {
        console.error('Failed to fetch cache metrics summary:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch summary');
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [orgId]);

  return { summary, loading, error };
}
