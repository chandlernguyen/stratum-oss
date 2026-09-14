import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useUserIdentity } from './useUserIdentity';
import { toast } from 'sonner';

// Types for opportunity intelligence
export interface OpportunityIntelligence {
  id: string;
  org_id: string;
  title: string;
  summary: string;
  content: {
    description: string;
    implementation_steps: string[];
    expected_impact: {
      metric: string;
      current_value?: string;
      target_value: string;
      estimated_increase: string;
      business_value: string;
    };
    effort_required: {
      time_estimate: string;
      resources_needed: string[];
      skills_required: string[];
    };
    implementation_time?: string;
    risk_level?: string;
  };
  metadata: {
    data_sources?: string[];
    confidence?: string;
    [key: string]: any;
  };
  priority: 'high' | 'medium' | 'low';
  category: string;
  status: 'pending' | 'ready' | 'in_progress' | 'completed' | 'deferred' | 'not_relevant';
  agent_type: 'quick_wins';
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface OpportunitySummary {
  total_opportunities: number;
  by_priority: {
    high: number;
    medium: number;
    low: number;
  };
  by_status: {
    [key: string]: number;
  };
  by_category: {
    [key: string]: number;
  };
  actionable_now: number;
  completed: number;
  average_estimated_impact?: number;
  total_estimated_value?: number;
}

interface UseOpportunityIntelligenceOptions {
  priority?: string;
  category?: string;
  status?: string;
  limit?: number;
}

// Main opportunity intelligence list hook
export function useOpportunityIntelligence(options: UseOpportunityIntelligenceOptions = {}) {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useQuery({
    queryKey: ['opportunity-intelligence', orgId, options],
    queryFn: async (): Promise<OpportunityIntelligence[]> => {
      if (!orgId) {
        console.log('[useOpportunityIntelligence] No org_id available');
        return [];
      }

      let query = supabase
        .from('agent_outputs')
        .select('*')
        .eq('agent_type', 'quick_wins')
        .eq('org_id', orgId)
        .is('archived_at', null);

      // Filter by top-level columns (not JSONB metadata)
      if (options.priority) {
        query = query.eq('priority', options.priority);
      }
      if (options.category) {
        query = query.eq('category', options.category);
      }
      if (options.status) {
        query = query.eq('status', options.status);
      }

      // Apply limit if specified
      if (options.limit) {
        query = query.limit(options.limit);
      }

      // Order by created_at desc
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('[useOpportunityIntelligence] Error fetching opportunities:', error);
        throw error;
      }

      return (data as OpportunityIntelligence[]) || [];
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000, // 2 minutes cache
  });
}

// Single opportunity hook
export function useOpportunity(id: string | undefined) {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useQuery({
    queryKey: ['opportunity', id, orgId],
    queryFn: async (): Promise<OpportunityIntelligence | null> => {
      if (!orgId || !id) return null;

      const { data, error } = await supabase
        .from('agent_outputs')
        .select('*')
        .eq('id', id)
        .eq('org_id', orgId)
        .eq('agent_type', 'quick_wins')
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        console.error('[useOpportunity] Error fetching opportunity:', error);
        throw error;
      }

      return data as OpportunityIntelligence;
    },
    enabled: !!orgId && !!id,
    staleTime: 5 * 60 * 1000,
  });
}

// Opportunity summary hook - uses database function for aggregation
export function useOpportunitySummary() {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useQuery({
    queryKey: ['opportunity-summary', orgId],
    queryFn: async (): Promise<OpportunitySummary | null> => {
      if (!orgId) return null;

      // Use database function for efficient server-side aggregation
      const { data, error } = await supabase
        .rpc('get_opportunity_summary', { p_org_id: orgId });

      if (error) {
        console.error('[useOpportunitySummary] Error fetching summary:', error);
        throw error;
      }

      return data as OpportunitySummary;
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
  });
}

// Update opportunity status mutation
export function useUpdateOpportunityStatus() {
  const queryClient = useQueryClient();
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;
  const userId = identity?.user?.id;

  return useMutation({
    mutationFn: async ({
      id,
      status,
      notes,
    }: {
      id: string;
      status: string;
      notes?: string;
    }) => {
      if (!orgId || !userId) {
        throw new Error('User or Organization not found');
      }

      const updates: any = {
        status,
        metadata: {
          status_updated_at: new Date().toISOString(),
        },
      };

      if (notes) {
        updates.metadata.status_notes = notes;
      }

      if (status === 'completed') {
        updates.metadata.completed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('agent_outputs')
        .update(updates)
        .eq('id', id)
        .eq('org_id', orgId)
        .select()
        .single();

      if (error) {
        throw new Error(error.message || 'Failed to update opportunity status');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunity-intelligence', orgId] });
      queryClient.invalidateQueries({ queryKey: ['opportunity-summary', orgId] });
      toast.success('Opportunity status updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update opportunity status');
    },
  });
}

// Check if user has campaign data (dependency check)
export function useHasCampaignData() {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useQuery({
    queryKey: ['has-campaign-data', orgId],
    queryFn: async (): Promise<boolean> => {
      if (!orgId) return false;

      try {
        const { count, error } = await supabase
          .from('campaign_metrics')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', orgId);

        // If table doesn't exist yet (ROI Agent Phase 0 not complete)
        if (error?.code === 'PGRST116') return false;
        if (error) {
          console.warn('campaign_metrics table error:', error);
          return false;
        }

        return (count ?? 0) > 0;
      } catch (e) {
        console.warn('campaign_metrics table not ready:', e);
        return false;
      }
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Actionable opportunities (ready to implement immediately)
export function useActionableOpportunities(limit: number = 10) {
  return useOpportunityIntelligence({
    status: 'ready',
    limit,
  });
}

// Opportunities by priority
export function useOpportunitiesByPriority(priority: 'high' | 'medium' | 'low') {
  return useOpportunityIntelligence({
    priority,
  });
}

// Opportunities by category
export function useOpportunitiesByCategory(category: string) {
  return useOpportunityIntelligence({
    category,
  });
}
