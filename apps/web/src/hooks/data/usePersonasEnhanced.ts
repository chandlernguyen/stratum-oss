import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useUserIdentity } from './useUserIdentity';

// Enhanced persona interface matching database function
export interface PersonaEnhanced {
  id: string;
  org_id: string;
  campaign_id?: string;
  campaign_name?: string;
  name: string;
  title: string;
  company_name: string;
  industry: string;
  vertical?: string;
  company_size?: string;
  annual_revenue?: string;
  demographics?: any;
  goals?: any;
  pain_points?: any;
  jobs_to_be_done?: any;
  current_tools?: any;
  decision_criteria?: any;
  objections?: any;
  preferred_channels?: any;
  personality_traits?: any;
  customer_status?: string;
  satisfaction_score?: number;
  background_story?: string;
  key_quote?: string;
  buyer_journey?: any;
  location?: any;
  insights_summary?: any;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
  archived_at?: string;
  archive_reason?: string;
  created_by?: string;
  creator_email?: string;

  // Computed fields from database function
  linked_strategies_count: number;
  linked_campaigns_count: number;
  interaction_count: number;
  personas_generated_at: string;
}

// Interface for persona details with comprehensive relationship data
export interface PersonaDetails {
  id: string;
  org_id: string;
  campaign_id?: string;
  campaign_info?: any;
  name: string;
  title: string;
  company_name: string;
  industry: string;
  vertical?: string;
  company_size?: string;
  annual_revenue?: string;
  demographics?: any;
  goals?: any;
  pain_points?: any;
  jobs_to_be_done?: any;
  current_tools?: any;
  decision_criteria?: any;
  objections?: any;
  preferred_channels?: any;
  personality_traits?: any;
  customer_status?: string;
  satisfaction_score?: number;
  background_story?: string;
  key_quote?: string;
  buyer_journey?: any;
  location?: any;
  insights_summary?: any;
  interaction_history?: any;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
  archived_at?: string;
  archive_reason?: string;
  archived_by?: string;
  creator_info?: any;

  // Comprehensive relationship data
  linked_strategies?: any[];
  linked_campaigns?: any[];
  recent_interactions?: any[];
  persona_analytics?: any;
  details_generated_at: string;
}

// Interface for persona performance analytics
export interface PersonaPerformance {
  total_personas: number;
  active_personas: number;
  primary_personas: number;
  satisfaction_avg?: number;
  interaction_count: number;
  strategy_links: number;
  campaign_coverage: number;
  personas_by_industry: any[];
  satisfaction_distribution: any[];
  performance_trends: any[];
}

// Interface for persona list options
interface UsePersonasEnhancedOptions {
  includeArchived?: boolean;
  campaignId?: string;
  limit?: number;
  offset?: number;
}

// Enhanced personas list hook using database function
export function usePersonasEnhanced(options: UsePersonasEnhancedOptions = {}) {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useQuery({
    queryKey: ['personas-enhanced', orgId, options],
    queryFn: async (): Promise<PersonaEnhanced[]> => {
      if (!orgId) return [];

      // Use schema-aware router function (migration 169)
      const { data, error } = await supabase.rpc('get_personas_list_routed', {
        p_org_id: orgId,
        p_include_archived: options.includeArchived || false,
        p_campaign_id: options.campaignId || null,
        p_limit: options.limit || 50,
        p_offset: options.offset || 0
      });

      if (error) {
        console.error('[usePersonasEnhanced] Error fetching personas:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000, // 2 minutes cache
    refetchOnWindowFocus: false,
  });
}

// Enhanced active personas hook
export function useActivePersonasEnhanced() {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useQuery({
    queryKey: ['active-personas-enhanced', orgId],
    queryFn: async () => {
      if (!orgId) return [];

      const { data, error } = await supabase.rpc('get_active_personas', {
        p_org_id: orgId
      });

      if (error) {
        console.error('[useActivePersonasEnhanced] Error fetching active personas:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!orgId,
    staleTime: 1 * 60 * 1000, // 1 minute cache for active personas
    refetchOnWindowFocus: false,
  });
}

// Enhanced single persona details hook
export function usePersonaDetails(personaId?: string) {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useQuery({
    queryKey: ['persona-details', personaId, orgId],
    queryFn: async (): Promise<PersonaDetails | null> => {
      if (!orgId || !personaId) return null;

      // Use schema-aware router function (migration 169)
      const { data, error } = await supabase.rpc('get_persona_details_routed', {
        p_persona_id: personaId,
        p_org_id: orgId
      });

      if (error) {
        console.error('[usePersonaDetails] Error fetching persona details:', error);
        throw error;
      }

      return data && data.length > 0 ? data[0] : null;
    },
    enabled: !!orgId && !!personaId,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: false,
  });
}

// Persona performance analytics hook
export function usePersonaPerformance(periodDays: number = 30) {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useQuery({
    queryKey: ['persona-performance', orgId, periodDays],
    queryFn: async (): Promise<PersonaPerformance | null> => {
      if (!orgId) return null;

      const { data, error } = await supabase.rpc('get_personas_performance', {
        p_org_id: orgId,
        p_period_days: periodDays
      });

      if (error) {
        console.error('[usePersonaPerformance] Error fetching performance:', error);
        throw error;
      }

      return data && data.length > 0 ? data[0] : null;
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: false,
  });
}

// Campaign-specific personas hook
export function useCampaignPersonasEnhanced(campaignId?: string) {
  return usePersonasEnhanced({
    campaignId,
    includeArchived: false,
  });
}

// Helper hook for persona statistics
export function usePersonaStats() {
  const { data: personas, isLoading } = usePersonasEnhanced();

  if (isLoading || !personas) {
    return {
      totalPersonas: 0,
      activePersonas: 0,
      primaryPersonas: 0,
      avgSatisfaction: 0,
      strategyLinks: 0,
      interactionCount: 0,
      byIndustry: {},
      isLoading: true
    };
  }

  const stats = personas.reduce((acc, persona) => {
    acc.totalPersonas++;

    if (!persona.archived_at) acc.activePersonas++;
    if (persona.is_primary) acc.primaryPersonas++;

    acc.strategyLinks += persona.linked_strategies_count;
    acc.interactionCount += persona.interaction_count;

    if (persona.satisfaction_score) {
      acc.satisfactionSum += persona.satisfaction_score;
      acc.satisfactionCount++;
    }

    // Group by industry
    const industry = persona.industry || 'Other';
    acc.byIndustry[industry] = (acc.byIndustry[industry] || 0) + 1;

    return acc;
  }, {
    totalPersonas: 0,
    activePersonas: 0,
    primaryPersonas: 0,
    strategyLinks: 0,
    interactionCount: 0,
    satisfactionSum: 0,
    satisfactionCount: 0,
    byIndustry: {} as Record<string, number>
  });

  return {
    totalPersonas: stats.totalPersonas,
    activePersonas: stats.activePersonas,
    primaryPersonas: stats.primaryPersonas,
    avgSatisfaction: stats.satisfactionCount > 0
      ? Math.round((stats.satisfactionSum / stats.satisfactionCount) * 10) / 10
      : 0,
    strategyLinks: stats.strategyLinks,
    interactionCount: stats.interactionCount,
    byIndustry: stats.byIndustry,
    isLoading: false
  };
}

// Primary persona hook for quick access
export function usePrimaryPersona(campaignId?: string) {
  const { data: personas } = usePersonasEnhanced({
    campaignId,
    limit: 10
  });

  const primaryPersona = personas?.find(p => p.is_primary);

  return {
    data: primaryPersona || null,
    isLoading: !personas,
    hasPrimary: !!primaryPersona
  };
}