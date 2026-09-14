import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';
import { toast } from 'sonner';
import { useUserIdentity } from './useUserIdentity'; // CORRECT: Import the new canonical hook
import { API_BASE_URL } from '@/lib/api';
import { getLocaleHeaders } from '@/lib/apiHeaders';
import { useRealtimeSubscription } from '../useRealtimeSubscription'; // Phase 2 Task 2.3: Real-time updates

// Types
export interface Persona {
  id: string;
  org_id: string;
  campaign_id?: string;
  name: string;
  title: string;
  company_name: string;
  industry: string;
  is_primary: boolean;
  archived_at?: string;
  archive_reason?: string;
  created_at: string;
  updated_at: string;

  // Additional fields for database functions
  vertical?: string;
  company_size?: string;
  annual_revenue?: string;
  customer_status?: string;
  background_story?: string;
  key_quote?: string;

  // JSONB fields
  demographics?: {
    age?: number;
    age_range?: string;
    location?: string;
    education?: string;
    income_level?: string;
  };
  personality_traits?: {
    personality_type?: string;
    communication_style?: string;
    decision_making_style?: string;
    work_preferences?: string[];
  };
  buyer_journey?: {
    awareness_triggers?: string[];
    research_behavior?: string[];
    evaluation_criteria?: string[];
    decision_factors?: string[];
    post_purchase?: string[];
  };
  decision_criteria?: Record<string, any>;
  domain_expertise?: Record<string, any>;

  // Array fields
  goals?: string[];
  pain_points?: string[];
  jobs_to_be_done?: string[];
  current_tools?: string[];
  objections?: string[];
  preferred_channels?: string[];
  tags?: string[];
}

interface UsePersonasOptions {
  includeArchived?: boolean;
  campaignId?: string;
  clientId?: string; // For agency client filtering
  primaryOnly?: boolean;
}

// Main list hook (Phase 3: Enhanced with database function)
export function usePersonas(options: UsePersonasOptions = {}) {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  const query = useQuery({
    queryKey: ['personas', orgId, options],
    queryFn: async (): Promise<Persona[]> => {
      if (!orgId) {
        console.log('[usePersonas] No org_id available');
        return [];
      }

      // Use schema-aware router function (migration 20251102)
      // Routes to 'public' schema for SME, 'agency' schema for Agency orgs
      // Filters by output_type to exclude interview insights
      const { data, error } = await supabase.rpc('get_personas_list_routed', {
        p_org_id: orgId,
        p_include_archived: options.includeArchived || false,
        p_campaign_id: options.campaignId || null,
        p_client_id: options.clientId || null,  // ✅ Agency client filtering
        p_limit: 100,
        p_offset: 0
      });

      if (error) {
        console.error('[usePersonas] Error fetching personas:', error);
        throw error;
      }

      // Map enhanced results to backward-compatible interface
      let personas = (data || []).map((persona: any) => ({
        id: persona.id,
        org_id: persona.org_id,
        campaign_id: persona.campaign_id,
        name: persona.name,
        title: persona.title,
        company_name: persona.company_name,
        industry: persona.industry,
        vertical: persona.vertical, // ✅ FIX: Include vertical field
        company_size: persona.company_size, // ✅ FIX: Include company_size field
        location: persona.location, // ✅ FIX: Include location field
        annual_revenue: persona.annual_revenue,
        customer_status: persona.customer_status, // ✅ FIX: Include customer_status field
        satisfaction_score: persona.satisfaction_score, // ✅ FIX: Include satisfaction_score field
        background_story: persona.background_story, // ✅ FIX: Include background_story field
        key_quote: persona.key_quote, // ✅ FIX: Include key_quote field
        is_primary: persona.is_primary,
        archived_at: persona.archived_at,
        archive_reason: persona.archive_reason,
        created_at: persona.created_at,
        updated_at: persona.updated_at,
        demographics: persona.demographics,
        personality_traits: persona.personality_traits,
        buyer_journey: persona.buyer_journey,
        decision_criteria: persona.decision_criteria,
        domain_expertise: persona.domain_expertise,
        goals: persona.goals,
        pain_points: persona.pain_points,
        jobs_to_be_done: persona.jobs_to_be_done,
        current_tools: persona.current_tools,
        objections: persona.objections,
        preferred_channels: persona.preferred_channels,
        tags: [] // Default empty array for backward compatibility
      } as Persona));

      // Apply primary filter if requested (since database function doesn't have this filter)
      if (options.primaryOnly) {
        personas = personas.filter((p: any) => p.is_primary);
      }

      return personas;
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });

  // ✅ NEW: Real-time updates (Phase 2 Task 2.3)
  // Personas are stored in agent_outputs table (nuclear migration)
  useRealtimeSubscription({
    table: 'agent_outputs',
    queryKeys: [
      ['personas', orgId, options],
      ['agent-outputs', orgId]
    ],
    filter: orgId ? { column: 'org_id', value: orgId } : undefined,
  });

  return query;
}

// Single persona hook (Nuclear Migration compatible with Agency multi-tenant routing)
export function usePersona(id: string | undefined) {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useQuery({
    queryKey: ['persona', id, orgId],
    queryFn: async () => {
      if (!orgId || !id) return null;

      // ✅ Database-first: Use schema-aware router function
      // For Agency orgs, routes to agency.agent_outputs
      // For SME orgs, routes to public.agent_outputs
      const { data, error } = await supabase.rpc('get_persona_details_routed', {
        p_persona_id: id,
        p_org_id: orgId
      });

      if (error) {
        console.error('[usePersona] Error fetching persona:', error);
        throw error;
      }

      if (!data) return null;

      // Router function returns complete data, extract content field
      const content = data.content || {};
      const metadata = data.metadata || {};

      return {
        id: data.id,
        org_id: data.org_id,
        campaign_id: data.campaign_id,
        name: content.name,
        title: content.title,
        company_name: content.company_name,
        industry: content.industry,
        is_primary: metadata.is_primary || false,
        archived_at: data.archived_at,
        archive_reason: data.archive_reason,
        created_at: data.created_at,
        updated_at: data.updated_at,
        vertical: content.vertical,
        company_size: content.company_size,
        annual_revenue: content.annual_revenue,
        customer_status: content.customer_status,
        background_story: content.background_story,
        key_quote: content.key_quote,
        demographics: content.demographics,
        personality_traits: content.personality_traits,
        buyer_journey: content.buyer_journey,
        decision_criteria: content.decision_criteria,
        domain_expertise: content.domain_expertise,
        goals: content.goals,
        pain_points: content.pain_points,
        jobs_to_be_done: content.jobs_to_be_done,
        current_tools: content.current_tools,
        objections: content.objections,
        preferred_channels: content.preferred_channels,
        tags: []
      } as Persona;
    },
    enabled: !!orgId && !!id,
    staleTime: 5 * 60 * 1000,
  });
}

// Campaign personas hook
export function useCampaignPersonas(campaignId: string | undefined) {
  return usePersonas({
    campaignId,
    includeArchived: false,
  });
}

// Primary personas hook
export function usePrimaryPersonas(campaignId?: string) {
  return usePersonas({
    campaignId,
    primaryOnly: true,
    includeArchived: false,
  });
}

// Mutations (keeping write operations in API for now)
export function useCreatePersona() {
  const queryClient = useQueryClient();
  const { data: identity } = useUserIdentity();

  return useMutation({
    mutationFn: async (data: Partial<Persona>) => {
      const orgId = identity?.organization?.id;
      if (!orgId) {
        throw new Error('Organization ID is required');
      }

      if (!data.name || !data.title || !data.company_name || !data.industry) {
        throw new Error('Name, title, company name, and industry are required');
      }

      // Use Database-First approach with create_persona function
      const { data: result, error } = await supabase.rpc('create_persona', {
        p_org_id: orgId,
        p_name: data.name,
        p_title: data.title,
        p_company_name: data.company_name,
        p_industry: data.industry,
        p_campaign_id: data.campaign_id || null,
        p_vertical: data.vertical || null,
        p_company_size: data.company_size || null,
        p_annual_revenue: data.annual_revenue || null,
        p_demographics: data.demographics || null,
        p_goals: data.goals || null,
        p_pain_points: data.pain_points || null,
        p_customer_status: data.customer_status || null,
        p_background_story: data.background_story || null,
        p_key_quote: data.key_quote || null,
        p_is_primary: data.is_primary || false
      });

      if (error) {
        console.error('[useCreatePersona] Database error:', error);
        throw new Error(error.message || 'Failed to create persona');
      }

      return result && result.length > 0 ? result[0] : null;
    },
    onSuccess: () => {
      const orgId = identity?.organization?.id;
      queryClient.invalidateQueries({ queryKey: ['personas', orgId] });
      toast.success('Persona created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create persona');
    },
  });
}

export function useUpdatePersona() {
  const queryClient = useQueryClient();
  const { data: identity } = useUserIdentity();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Persona> }) => {
      const orgId = identity?.organization?.id;
      if (!orgId) {
        throw new Error('Organization ID is required');
      }

      // Use Database-First approach with update_persona function (simplified version)
      const { data: result, error } = await supabase.rpc('update_persona', {
        p_persona_id: id,
        p_org_id: orgId,
        p_name: data.name || null,
        p_title: data.title || null,
        p_company_name: data.company_name || null,
        p_industry: data.industry || null,
        p_vertical: data.vertical || null,
        p_company_size: data.company_size || null,
        p_demographics: data.demographics || null,
        p_goals: data.goals || null,
        p_pain_points: data.pain_points || null,
        p_customer_status: data.customer_status || null,
        p_background_story: data.background_story || null,
        p_key_quote: data.key_quote || null,
        p_is_primary: data.is_primary || null
      });

      if (error) {
        console.error('[useUpdatePersona] Database error:', error);
        throw new Error(error.message || 'Failed to update persona');
      }

      return result && result.length > 0 ? result[0] : null;
    },
    onSuccess: (_, variables) => {
      const orgId = identity?.organization?.id;
      queryClient.invalidateQueries({ queryKey: ['personas', orgId] });
      queryClient.invalidateQueries({ queryKey: ['persona', variables.id, orgId] });
      toast.success('Persona updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update persona');
    },
  });
}

export function useArchivePersona() {
  const queryClient = useQueryClient();
  const { data: identity } = useUserIdentity();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const orgId = identity?.organization?.id;
      if (!orgId) {
        throw new Error('Organization ID is required');
      }


      // Use Database-First approach with unified_archive_output function (nuclear migration)
      const { data: result, error } = await supabase.rpc('unified_archive_output', {
        p_output_id: id,
        p_org_id: orgId,
        p_archive_reason: reason
      });

      if (error) {
        console.error('[useArchivePersona] Database error:', error);
        throw new Error(error.message || 'Failed to archive persona');
      }

      return result && result.length > 0 ? result[0] : null;
    },
    onSuccess: (_, variables) => {
      const orgId = identity?.organization?.id;
      queryClient.invalidateQueries({ queryKey: ['personas', orgId] });
      queryClient.invalidateQueries({ queryKey: ['persona', variables.id, orgId] });
      toast.success('Persona archived successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to archive persona');
    },
  });
}

export function useSetPrimaryPersona() {
  const queryClient = useQueryClient();
  const { data: identity } = useUserIdentity();
  const { session } = useAuthStore();

  return useMutation({
    mutationFn: async ({ id, campaignId }: { id: string; campaignId?: string }) => {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/personas/${id}/set-primary`,
        {
          method: 'PATCH',
          headers: getLocaleHeaders({
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          }),
          body: JSON.stringify({ campaign_id: campaignId }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to set primary persona');
      }

      return response.json();
    },
    onSuccess: () => {
      const orgId = identity?.organization?.id;
      queryClient.invalidateQueries({ queryKey: ['personas', orgId] });
      toast.success('Primary persona updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to set primary persona');
    },
  });
}
