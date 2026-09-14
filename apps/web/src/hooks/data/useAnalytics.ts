import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useUserIdentity } from './useUserIdentity'; // CORRECT: Import the new canonical hook

// Types for analytics data
export interface OutputAnalytics {
  total_outputs: number;
  by_agent_type: Record<string, number>;
  by_status: Record<string, number>;
  by_validation_status: Record<string, number>;
  by_campaign: Record<string, number>;
  recent_outputs: number; // Last 7 days
  usage_metrics: {
    most_used_outputs: Array<{
      id: string;
      title: string;
      usage_count: number;
      agent_type: string;
    }>;
    avg_confidence_score: number;
    total_usage_count: number;
  };
  performance_metrics: {
    outputs_per_day: Array<{
      date: string;
      count: number;
    }>;
    agent_activity: Record<string, number>;
    validation_rate: number;
  };
}

export interface ContentPerformance {
  output_id: string;
  title: string;
  agent_type: string;
  views: number;
  usage_count: number;
  confidence_score: number;
  validation_status: string;
  impact_score: number;
  created_at: string;
  campaign_id?: string;
}

export interface AgentProductivity {
  agent_type: string;
  outputs_count: number;
  avg_confidence_score: number;
  total_usage: number;
  validation_rate: number;
  recent_activity: number; // Last 7 days
  top_performing_outputs: Array<{
    id: string;
    title: string;
    impact_score: number;
  }>;
}

// Main analytics hook
export function useOutputAnalytics(dateRange?: { start: string; end: string }) {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useQuery({
    queryKey: ['output-analytics', orgId, dateRange],
    queryFn: async (): Promise<OutputAnalytics> => {
      if (!orgId) {
        return {
          total_outputs: 0,
          by_agent_type: {},
          by_status: {},
          by_validation_status: {},
          by_campaign: {},
          recent_outputs: 0,
          usage_metrics: { most_used_outputs: [], avg_confidence_score: 0, total_usage_count: 0 },
          performance_metrics: { outputs_per_day: [], agent_activity: {}, validation_rate: 0 }
        };
      }

      let query = supabase.from('agent_outputs').select('*').eq('org_id', orgId).is('archived_at', null);

      if (dateRange) {
        query = query.gte('created_at', dateRange.start).lte('created_at', dateRange.end);
      }

      const { data: outputs, error } = await query;

      if (error) {
        console.error('[useOutputAnalytics] Error fetching analytics:', error);
        throw error;
      }

      const totalOutputs = outputs?.length || 0;
      const byAgentType = outputs?.reduce((acc: Record<string, number>, output) => { acc[output.agent_type] = (acc[output.agent_type] || 0) + 1; return acc; }, {}) || {};
      const byStatus = outputs?.reduce((acc: Record<string, number>, output) => { const status = output.status || 'draft'; acc[status] = (acc[status] || 0) + 1; return acc; }, {}) || {};
      const byValidationStatus = outputs?.reduce((acc: Record<string, number>, output) => { const status = output.validation_status || 'pending'; acc[status] = (acc[status] || 0) + 1; return acc; }, {}) || {};
      const byCampaign = outputs?.reduce((acc: Record<string, number>, output) => { if (output.campaign_id) { acc[output.campaign_id] = (acc[output.campaign_id] || 0) + 1; } return acc; }, {}) || {};
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentOutputs = outputs?.filter(output => new Date(output.created_at) >= sevenDaysAgo).length || 0;
      const mostUsedOutputs = outputs?.filter(output => output.usage_count > 0).sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0)).slice(0, 10).map(output => ({ id: output.id, title: output.title, usage_count: output.usage_count || 0, agent_type: output.agent_type })) || [];
      const avgConfidenceScore = outputs?.length > 0 ? outputs.reduce((sum, output) => sum + (output.confidence_score || 0), 0) / outputs.length : 0;
      const totalUsageCount = outputs?.reduce((sum, output) => sum + (output.usage_count || 0), 0) || 0;
      const outputsPerDay = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const count = outputs?.filter(output => output.created_at.split('T')[0] === dateStr).length || 0;
        outputsPerDay.push({ date: dateStr, count });
      }
      const agentActivity = { ...byAgentType };
      const validatedOutputs = outputs?.filter(output => output.validation_status === 'approved' || output.validation_status === 'auto_approved').length || 0;
      const validationRate = totalOutputs > 0 ? (validatedOutputs / totalOutputs) * 100 : 0;

      return {
        total_outputs: totalOutputs,
        by_agent_type: byAgentType,
        by_status: byStatus,
        by_validation_status: byValidationStatus,
        by_campaign: byCampaign,
        recent_outputs: recentOutputs,
        usage_metrics: { most_used_outputs: mostUsedOutputs, avg_confidence_score: avgConfidenceScore, total_usage_count: totalUsageCount },
        performance_metrics: { outputs_per_day: outputsPerDay, agent_activity: agentActivity, validation_rate: validationRate }
      };
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}

// Content performance hook
export function useContentPerformance(limit: number = 20) {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useQuery({
    queryKey: ['content-performance', orgId, limit],
    queryFn: async (): Promise<ContentPerformance[]> => {
      if (!orgId) return [];

      const { data, error } = await supabase
        .from('agent_outputs')
        .select('id, title, agent_type, usage_count, confidence_score, validation_status, impact_score, created_at, campaign_id')
        .eq('org_id', orgId)
        .is('archived_at', null)
        .order('impact_score', { ascending: false })
        .order('usage_count', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[useContentPerformance] Error fetching content performance:', error);
        throw error;
      }

      return data.map(item => ({
        ...item,
        output_id: item.id,
        views: item.usage_count || 0,
        confidence_score: item.confidence_score || 0,
        impact_score: item.impact_score || 0
      })) as ContentPerformance[];
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}

// Agent productivity hook
export function useAgentProductivity() {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useQuery({
    queryKey: ['agent-productivity', orgId],
    queryFn: async (): Promise<AgentProductivity[]> => {
      if (!orgId) return [];

      const { data: outputs, error } = await supabase.from('agent_outputs').select('*').eq('org_id', orgId).is('archived_at', null);

      if (error) {
        console.error('[useAgentProductivity] Error fetching agent productivity:', error);
        throw error;
      }

      const agentGroups = outputs?.reduce((acc: Record<string, any[]>, output) => { if (!acc[output.agent_type]) { acc[output.agent_type] = []; } acc[output.agent_type].push(output); return acc; }, {}) || {};
      const productivity: AgentProductivity[] = Object.entries(agentGroups).map(([agentType, agentOutputs]) => {
        const outputsCount = agentOutputs.length;
        const avgConfidenceScore = agentOutputs.length > 0 ? agentOutputs.reduce((sum, output) => sum + (output.confidence_score || 0), 0) / agentOutputs.length : 0;
        const totalUsage = agentOutputs.reduce((sum, output) => sum + (output.usage_count || 0), 0);
        const validatedOutputs = agentOutputs.filter(output => output.validation_status === 'approved' || output.validation_status === 'auto_approved').length;
        const validationRate = outputsCount > 0 ? (validatedOutputs / outputsCount) * 100 : 0;
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentActivity = agentOutputs.filter(output => new Date(output.created_at) >= sevenDaysAgo).length;
        const topPerformingOutputs = agentOutputs.sort((a, b) => (b.impact_score || 0) - (a.impact_score || 0)).slice(0, 5).map(output => ({ id: output.id, title: output.title, impact_score: output.impact_score || 0 }));

        return { agent_type: agentType, outputs_count: outputsCount, avg_confidence_score: avgConfidenceScore, total_usage: totalUsage, validation_rate: validationRate, recent_activity: recentActivity, top_performing_outputs: topPerformingOutputs };
      });

      return productivity.sort((a, b) => b.outputs_count - a.outputs_count);
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}

// Analytics mutations
export function useTrackOutputUsage() {
  const queryClient = useQueryClient();
  const { data: identity } = useUserIdentity();

  return useMutation({
    mutationFn: async ({ outputId, agentType }: { outputId: string; agentType?: string }) => {
      const orgId = identity?.organization?.id;
      if (!orgId) throw new Error('Organization not found');

      const { data, error } = await supabase
        .from('agent_outputs')
        .update({
          usage_count: supabase.rpc('increment_usage_count', { output_id: outputId }),
          last_used_at: new Date().toISOString(),
          used_by_agents: agentType ? supabase.rpc('add_to_used_by_agents', { output_id: outputId, agent_type: agentType }) : undefined
        })
        .eq('id', outputId)
        .eq('org_id', orgId)
        .select('id, usage_count, last_used_at')
        .single();

      if (error) throw new Error(error.message || 'Failed to track output usage');
      return data;
    },
    onSuccess: () => {
      const orgId = identity?.organization?.id;
      queryClient.invalidateQueries({ queryKey: ['output-analytics', orgId] });
      queryClient.invalidateQueries({ queryKey: ['content-performance', orgId] });
      queryClient.invalidateQueries({ queryKey: ['agent-productivity', orgId] });
    },
    onError: (error: Error) => {
      console.error('Failed to track output usage:', error);
    },
  });
}

export function useUpdateImpactScore() {
  const queryClient = useQueryClient();
  const { data: identity } = useUserIdentity();

  return useMutation({
    mutationFn: async ({ outputId, impactScore }: { outputId: string; impactScore: number }) => {
      const orgId = identity?.organization?.id;
      if (!orgId) throw new Error('Organization not found');

      const { data, error } = await supabase
        .from('agent_outputs')
        .update({ impact_score: impactScore })
        .eq('id', outputId)
        .eq('org_id', orgId)
        .select('id, impact_score, updated_at')
        .single();

      if (error) throw new Error(error.message || 'Failed to update impact score');
      return data;
    },
    onSuccess: () => {
      const orgId = identity?.organization?.id;
      queryClient.invalidateQueries({ queryKey: ['output-analytics', orgId] });
      queryClient.invalidateQueries({ queryKey: ['content-performance', orgId] });
      queryClient.invalidateQueries({ queryKey: ['agent-productivity', orgId] });
      toast.success('Impact score updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update impact score');
    },
  });
}