/**
 * Hook for managing cross-agent intelligence data and operations
 */

import { useState, useEffect } from 'react';
import { useUserIdentity } from '@/hooks/data/useUserIdentity'; // CORRECT: Use the new canonical hook
import { API_BASE_URL } from '@/lib/api';
import { getLocaleHeaders } from '@/lib/apiHeaders';

export interface CrossAgentInsight {
  insight_type: string;
  title: string;
  description: string;
  contributing_agents: string[];
  confidence_score: number;
  actionable_recommendations: string[];
  potential_impact: string;
  priority: 'high' | 'medium' | 'low';
}

export interface IntelligenceDataSummary {
  domain_data: {
    strategy_outputs: number;
    customer_personas: number;
    content_pieces: number;
    marketing_campaigns: number;
  };
  specialized_intelligence: {
    completeness_score: number;
    available_agents: string[];
  };
  total_domain_records: number;
  analysis_ready: boolean;
}

interface CrossAgentIntelligenceResponse {
  success: boolean;
  insights: CrossAgentInsight[];
  total_insights: number;
  analysis_period_days: number;
  campaign_id?: string;
}

interface LatestInsightsResponse {
  success: boolean;
  insights: any[];
  total_insights: number;
}

export const useCrossAgentIntelligence = (campaignId?: string) => {
  const { data: identity } = useUserIdentity(); // CORRECT: Use the new hook
  const [insights, setInsights] = useState<CrossAgentInsight[]>([]);
  const [dataSummary, setDataSummary] = useState<IntelligenceDataSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAnalysis, setLastAnalysis] = useState<Date | null>(null);

  const orgId = identity?.organization?.id; // CORRECT: Get orgId from the reliable source

  // Build API URL with proper base
  const getApiUrl = (endpoint: string) => {
    return `${API_BASE_URL}${endpoint}`;
  };

  // Get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('supabase.auth.token');
    return getLocaleHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    });
  };

  // Fetch data availability summary
  const fetchDataSummary = async () => {
    if (!orgId) return;

    try {
      setLoading(true);
      const response = await fetch(
        getApiUrl(`/api/v1/cross-agent-intelligence/${orgId}/data-summary`),
        {
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setDataSummary(data.data_summary);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data summary');
    } finally {
      setLoading(false);
    }
  };

  // Fetch latest insights
  const fetchLatestInsights = async (limit: number = 10) => {
    if (!orgId) return;

    try {
      setLoading(true);
      const response = await fetch(
        getApiUrl(`/api/v1/cross-agent-intelligence/${orgId}/latest?limit=${limit}`),
        {
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        const data: LatestInsightsResponse = await response.json();
        if (data.success) {
          // Transform stored insights to match our interface
          const transformedInsights: CrossAgentInsight[] = data.insights.map(insight => ({
            insight_type: insight.content?.insight_type || 'general',
            title: insight.title || 'Untitled Insight',
            description: insight.content?.description || 'No description available',
            contributing_agents: insight.content?.contributing_agents || [],
            confidence_score: insight.confidence_score || 0,
            actionable_recommendations: insight.content?.actionable_recommendations || [],
            potential_impact: insight.content?.potential_impact || 'Unknown impact',
            priority: insight.content?.priority || 'medium',
          }));
          setInsights(transformedInsights);
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch insights');
    } finally {
      setLoading(false);
    }
  };

  // Generate fresh insights
  const generateInsights = async (lookbackDays: number = 30) => {
    if (!orgId) return;

    try {
      setLoading(true);
      setError(null);
      
      const url = campaignId 
        ? getApiUrl(`/api/v1/cross-agent-intelligence/${orgId}?campaign_id=${campaignId}&lookback_days=${lookbackDays}`)
        : getApiUrl(`/api/v1/cross-agent-intelligence/${orgId}?lookback_days=${lookbackDays}`);

      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data: CrossAgentIntelligenceResponse = await response.json();
        if (data.success) {
          setInsights(data.insights);
          setLastAnalysis(new Date());
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate insights');
    } finally {
      setLoading(false);
    }
  };

  // Trigger manual analysis
  const triggerAnalysis = async () => {
    if (!orgId) return;

    try {
      setLoading(true);
      const response = await fetch(
        getApiUrl(`/api/v1/cross-agent-intelligence/${orgId}/trigger-analysis`),
        {
          method: 'POST',
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.insights.length > 0) {
          setInsights(data.insights);
          setLastAnalysis(new Date());
        }
        return data.message;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger analysis');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch data summary on mount
  useEffect(() => {
    if (orgId) {
      fetchDataSummary();
      fetchLatestInsights();
    }
  }, [orgId]);

  // Calculate intelligence readiness
  const isAnalysisReady = dataSummary?.analysis_ready && dataSummary?.total_domain_records > 0;

  return {
    insights,
    dataSummary,
    loading,
    error,
    lastAnalysis,
    isAnalysisReady,
    actions: {
      fetchDataSummary,
      fetchLatestInsights,
      generateInsights,
      triggerAnalysis,
    },
  };
};
