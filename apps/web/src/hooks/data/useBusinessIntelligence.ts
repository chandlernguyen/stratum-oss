import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useUserIdentity } from './useUserIdentity'; // CORRECT: Import the new canonical hook
import { INDUSTRIES, COMPANY_SIZES } from '@/config/businessConstants'; // Single source of truth

// Types for business context and insights
export interface BusinessMetric {
  value: string;
  numeric_value?: number;
  value_type: string;
  unit?: string;
  current?: string;
  previous?: string;
  trend?: string;
  context?: string;
  aliases?: string[];
  confidence?: number;
  learned_by?: string;
  learned_at?: string;
}

export interface BusinessMetrics {
  financial?: Record<string, BusinessMetric>;
  marketing?: Record<string, BusinessMetric>;
  product?: Record<string, BusinessMetric>;
  operational?: Record<string, BusinessMetric>;
}

export interface BusinessContext {
  id: string;
  org_id: string;
  company_name: string;
  website?: string;
  industry?: string;
  company_size?: string;
  geography?: string[];
  business_model?: string;
  company_stage?: string;
  funding_status?: string;
  target_market?: string[];
  main_products?: string[];
  key_competitors?: string[];
  tech_stack?: string[];
  annual_revenue?: string;
  marketing_budget?: string;
  business_metrics?: BusinessMetrics;  // NEW: Categorized metrics from progressive learning
  data_completeness_score?: number;
  business_info?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AIInsight {
  id: string;
  org_id: string;
  title: string;
  content?: Record<string, any>;
  source_agent?: string;
  confidence_score: number;
  validation_status: 'pending' | 'approved' | 'rejected' | 'auto_approved';
  created_at: string;
  updated_at: string;
}

export interface PersonaPattern {
  id: string;
  org_id: string;
  pattern_type: 'pain_point' | 'goal' | 'channel' | 'preference';
  pattern_name: string;
  frequency: number;
  personas_affected?: string[];
  confidence_score: number;
  created_at: string;
}

export interface DropdownOptions {
  company_size: string[];
  industry: string[];
  business_model: string[];
  company_stage: string[];
  funding_status: string[];
  revenue_ranges: string[];
  budget_ranges: string[];
  geography: string[];
}

// Business context hook - supports client-scoped business intelligence
// Schema routing: SME uses public.core_business_data, Agency uses agency.client_intelligence
export function useBusinessContext(clientId?: string | null) {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;
  const isAgency = identity?.organization?.type === 'AGENCY';

  return useQuery({
    queryKey: ['business-context', orgId, clientId, isAgency],
    queryFn: async (): Promise<BusinessContext | null> => {
      if (!orgId) return null;

      console.log('[useBusinessContext] Fetching context:', { orgId, clientId, isAgency });

      // Schema routing based on org type
      if (isAgency) {
        if (!clientId) {
          console.warn('[useBusinessContext] Agency user without clientId - cannot fetch client intelligence');
          return null;
        }

        // AGENCY: Query public.client_intelligence view (created in migration 182)
        // This view exposes agency.client_intelligence with security_invoker=on to respect RLS
        const { data, error } = await supabase
          .from('client_intelligence')
          .select('*')
          .eq('org_id', orgId)
          .eq('client_id', clientId)
          .maybeSingle();

        if (error) {
          console.error('[useBusinessContext] Error fetching agency client intelligence:', error);
          return null;
        }

        console.log('[useBusinessContext] Agency client intelligence:', data);
        return data as BusinessContext | null;
      } else {
        // SME: Query core_business_data (public schema)
        const { data, error } = await supabase
          .from('core_business_data')
          .select('*')
          .eq('org_id', orgId)
          .is('client_id', null)
          .maybeSingle();

        if (error) {
          console.error('[useBusinessContext] Error fetching SME business context:', error);
          return null;
        }

        console.log('[useBusinessContext] SME business context:', data);
        return data as BusinessContext | null;
      }
    },
    enabled: !!orgId && (!isAgency || !!clientId),
    staleTime: 5 * 60 * 1000,
  });
}

// AI insights hook - Database-first approach using get_learning_history_intelligence function
// Support client-scoped queries for agency users viewing /clients/{slug}/intelligence
export function useAIInsights(filterAgent?: string, clientId?: string) {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;
  const isAgency = identity?.organization?.type === 'AGENCY';

  return useQuery({
    queryKey: ['ai-insights', orgId, clientId, filterAgent],
    queryFn: async (): Promise<AIInsight[]> => {
      if (!orgId) return [];

      console.log('[useAIInsights] Fetching insights:', { orgId, clientId, isAgency, filterAgent });

      // Map frontend filter values to database agent_type values
      const agentTypeMap: Record<string, string> = {
        'persona_agent': 'persona',
        'strategy_agent': 'strategy',
        'marketing_strategy_agent': 'marketing_strategy',
        'content_agent': 'content',
      };

      const agentType = filterAgent && filterAgent !== 'all'
        ? (agentTypeMap[filterAgent] || filterAgent)
        : null;

      // Call database function via RPC (Database-First approach)
      // NEW: Pass p_client_id for agency users viewing client-scoped intelligence
      const { data, error } = await supabase.rpc('get_learning_history_intelligence', {
        p_org_id: orgId,
        p_agent_type: agentType,
        p_client_id: clientId || null,  // Filter by client for agency users
        p_limit: 50,
        p_offset: 0
      });

      if (error) {
        console.error('[useAIInsights] Error fetching AI insights:', error);
        throw error;
      }

      console.log('[useAIInsights] Fetched insights:', { count: data?.length || 0 });

      // Transform to AIInsight format
      const insights = (data || []).map((output: any) => ({
        id: output.id,
        org_id: output.org_id,
        title: output.title,
        content: output.content,
        source_agent: output.agent_type,
        confidence_score: output.confidence_score || 0.8,
        validation_status: output.validation_status || 'auto_approved',
        created_at: output.created_at,
        updated_at: output.updated_at,
      }));

      return insights as AIInsight[];
    },
    // CRITICAL: For agency users, only enable when clientId is provided
    // This prevents querying without client context and caching empty results
    enabled: !!orgId && (!isAgency || !!clientId),
    staleTime: 2 * 60 * 1000,
  });
}

// Persona patterns hook
export function usePersonaPatterns(filterOrgId?: string) {
  const { data: identity } = useUserIdentity();
  const orgId = filterOrgId || identity?.organization?.id;

  return useQuery({
    queryKey: ['persona-patterns', orgId],
    queryFn: async (): Promise<PersonaPattern[]> => {
      if (!orgId) return [];

      // Note: persona_interactions table doesn't have the expected PersonaPattern fields
      // This is a placeholder query that will return empty results until the schema is updated
      const { error } = await supabase
        .from('persona_interactions')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        if (error.code === '42P01') return [];
        console.error('[usePersonaPatterns] Error fetching persona patterns:', error);
        throw error;
      }

      // Return empty array since table structure doesn't match PersonaPattern interface
      // TODO: Update PersonaPattern interface or create proper persona_patterns table
      return [];
    },
    enabled: !!orgId,
    staleTime: 10 * 60 * 1000,
  });
}

// Business intelligence hook (combines core business data with metadata)
// Schema routing: SME uses public.core_business_data, Agency uses public.client_intelligence
export function useBusinessIntelligence(clientId?: string | null) {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;
  const isAgency = identity?.organization?.type === 'AGENCY';

  return useQuery({
    queryKey: ['business-intelligence', orgId, clientId, isAgency],
    queryFn: async () => {
      if (!orgId) return null;

      console.log('[useBusinessIntelligence] Fetching intelligence:', { orgId, clientId, isAgency });

      let businessContext: any = null;
      let contextError: any = null;

      // Schema routing based on org type (same pattern as useBusinessContext)
      if (isAgency) {
        if (!clientId) {
          console.warn('[useBusinessIntelligence] Agency user without clientId - cannot fetch client intelligence');
          // Return default structure for agency without client context
          return {
            core_data: {
              id: '',
              org_id: orgId,
              company_name: '',
              website: '',
              industry: '',
              company_size: '',
              geography: [],
              business_model: '',
              company_stage: '',
              funding_status: '',
              target_market: [],
              main_products: [],
              key_competitors: [],
              tech_stack: [],
              annual_revenue: '',
              marketing_budget: '',
              data_completeness_score: 0,
              business_info: {},
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
          };
        }

        // AGENCY: Query public.client_intelligence view (created in migration 182)
        const { data, error } = await supabase
          .from('client_intelligence')
          .select('*')
          .eq('org_id', orgId)
          .eq('client_id', clientId)
          .maybeSingle();

        businessContext = data;
        contextError = error;
        console.log('[useBusinessIntelligence] Agency client intelligence:', data);
      } else {
        // SME: Query core_business_data (public schema)
        const { data, error } = await supabase
          .from('core_business_data')
          .select('*')
          .eq('org_id', orgId)
          .is('client_id', null)
          .maybeSingle();

        businessContext = data;
        contextError = error;
        console.log('[useBusinessIntelligence] SME business intelligence:', data);
      }

      if (contextError) {
        console.error('[useBusinessIntelligence] Error fetching business context:', contextError);
        // Don't throw on errors - return default data structure instead
        return {
          core_data: {
            id: '',
            org_id: orgId,
            company_name: '',
            website: '',
            industry: '',
            company_size: '',
            geography: [],
            business_model: '',
            company_stage: '',
            funding_status: '',
            target_market: [],
            main_products: [],
            key_competitors: [],
            tech_stack: [],
            annual_revenue: '',
            marketing_budget: '',
            data_completeness_score: 0,
            business_info: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        };
      }

      return {
        core_data: businessContext || {
          id: '',
          org_id: orgId,
          company_name: '',
          website: '',
          industry: '',
          company_size: '',
          geography: [],
          business_model: '',
          company_stage: '',
          funding_status: '',
          target_market: [],
          main_products: [],
          key_competitors: [],
          tech_stack: [],
          annual_revenue: '',
          marketing_budget: '',
          data_completeness_score: 0,
          business_info: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      };
    },
    enabled: !!orgId && (!isAgency || !!clientId),
    staleTime: 5 * 60 * 1000,
  });
}

// Dropdown options hook (static data)
// IMPORTANT: These values MUST match the database enum values exactly
// Single source of truth: /apps/web/src/config/businessConstants.ts
export function useBusinessDropdownOptions() {
  return useQuery({
    queryKey: ['dropdown-options'],
    queryFn: async (): Promise<DropdownOptions> => {
      return {
        // Matches company_size_enum in database
        company_size: [...COMPANY_SIZES],
        // Matches industry_enum in database (updated in migration 265)
        industry: [...INDUSTRIES],
        // Matches business_model_enum in database
        business_model: [
          'B2B',
          'B2C',
          'B2B2C',
          'Subscription',
          'Marketplace',
          'Freemium',
          'Transaction-based',
          'Advertising',
          'Hybrid'
        ],
        // Matches company_stage_enum in database
        company_stage: [
          'Idea',
          'MVP',
          'Early Traction',
          'Growth',
          'Scale',
          'Mature'
        ],
        // Matches funding_status_enum in database
        funding_status: [
          'Bootstrapped',
          'Pre-seed',
          'Seed',
          'Series A',
          'Series B',
          'Series C+',
          'Public',
          'Acquired'
        ],
        // These are stored as VARCHAR, not enums - can be any value
        revenue_ranges: ['Pre-revenue', 'Under $100K', '$100K - $1M', '$1M - $10M', '$10M - $50M', '$50M - $100M', '$100M+'],
        budget_ranges: ['Under $1K/month', '$1K - $5K/month', '$5K - $10K/month', '$10K - $25K/month', '$25K - $50K/month', '$50K+/month'],
        geography: ['North America', 'South America', 'Europe', 'Asia Pacific', 'Middle East', 'Africa', 'Global']
      };
    },
    staleTime: 60 * 60 * 1000,
  });
}

// Mutations for business intelligence data - Database-First Architecture ✅
// Schema routing: SME uses public.core_business_data, Agency uses agency.client_intelligence + agency.clients
export function useUpdateBusinessData() {
  const queryClient = useQueryClient();
  const { data: identity } = useUserIdentity();
  const isAgency = identity?.organization?.type === 'AGENCY';

  return useMutation({
    mutationFn: async (data: any) => {
      if (!identity?.organization?.id) {
        throw new Error('Organization not found');
      }

      console.log('[useUpdateBusinessData] Starting update:', { isAgency, data });

      // Extract client_id for routing
      const client_id = data.client_id;

      // Use router function for all updates (handles schema routing at database level)
      console.log('[useUpdateBusinessData] Calling update_business_data_routed:', {
        org_id: identity.organization.id,
        client_id,
        isAgency,
        dataKeys: Object.keys(data)
      });

      const { data: result, error } = await supabase.rpc('update_business_data_routed', {
        p_org_id: identity.organization.id,
        p_client_id: client_id || null,
        p_data: data
      });

      if (error) {
        console.error('[useUpdateBusinessData] Router function error:', error);
        throw new Error(error.message || 'Failed to update business data');
      }

      console.log('[useUpdateBusinessData] Update successful via router function');
      return result;
    },
    onSuccess: () => {
      const orgId = identity?.organization?.id;
      queryClient.invalidateQueries({ queryKey: ['business-intelligence', orgId] });
      queryClient.invalidateQueries({ queryKey: ['business-context', orgId] });
      queryClient.invalidateQueries({ queryKey: ['client-by-slug'] }); // Refresh client name
      toast.success('Business data updated successfully');
    },
    onError: (error: Error) => {
      console.error('[useUpdateBusinessData] Mutation error:', error);
      toast.error(error.message || 'Failed to update business data');
    },
  });
}

export function useUpdateBusinessContext() {
  const queryClient = useQueryClient();
  const { data: identity } = useUserIdentity();

  return useMutation({
    mutationFn: async (data: Partial<BusinessContext>) => {
      if (!identity?.organization?.id) {
        throw new Error('Organization not found');
      }

      // Filter out read-only/generated columns
      const {
        id,
        org_id,
        created_at,
        created_by,
        is_archived, // Generated column - cannot be updated
        ...updateData
      } = data as any;

      // Direct Supabase update - Database-First Architecture
      const { data: result, error } = await supabase
        .from('core_business_data')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('org_id', identity.organization.id) // Ensure RLS compliance
        .select('*')
        .single();

      if (error) {
        console.error('[useUpdateBusinessContext] Database error:', error);
        throw new Error(error.message || 'Failed to update business context');
      }

      return result;
    },
    onSuccess: () => {
      const orgId = identity?.organization?.id;
      queryClient.invalidateQueries({ queryKey: ['business-context', orgId] });
      toast.success('Business context updated successfully');
    },
    onError: (error: Error) => {
      console.error('[useUpdateBusinessContext] Mutation error:', error);
      toast.error(error.message || 'Failed to update business context');
    },
  });
}

export function useValidateInsight() {
  const queryClient = useQueryClient();
  const { data: identity } = useUserIdentity();

  return useMutation({
    mutationFn: async ({ insightId, status }: { insightId: string; status: 'approved' | 'rejected' }) => {
      if (!identity?.organization?.id) {
        throw new Error('Organization not found');
      }

      // Direct Supabase update - Database-First Architecture
      const { data, error } = await supabase
        .from('ai_insights')
        .update({
          validation_status: status,
          validated_by: identity.user.id,
          validated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', insightId)
        .eq('org_id', identity.organization.id) // Ensure RLS compliance
        .select('*')
        .single();

      if (error) {
        console.error('[useValidateInsight] Database error:', error);
        throw new Error(error.message || 'Failed to validate insight');
      }

      return data;
    },
    onSuccess: () => {
      const orgId = identity?.organization?.id;
      queryClient.invalidateQueries({ queryKey: ['ai-insights', orgId] });
      queryClient.invalidateQueries({ queryKey: ['business-context', orgId] });
      toast.success('Insight validated successfully');
    },
    onError: (error: Error) => {
      console.error('[useValidateInsight] Mutation error:', error);
      toast.error(error.message || 'Failed to validate insight');
    },
  });
}

export function useUpdateInsight() {
  const queryClient = useQueryClient();
  const { data: identity } = useUserIdentity();

  return useMutation({
    mutationFn: async ({ insightId, content }: { insightId: string; content: Record<string, any> }) => {
      if (!identity?.organization?.id) {
        throw new Error('Organization not found');
      }

      // Direct Supabase update - Database-First Architecture
      const { data, error } = await supabase
        .from('ai_insights')
        .update({
          content,
          updated_at: new Date().toISOString()
        })
        .eq('id', insightId)
        .eq('org_id', identity.organization.id) // Ensure RLS compliance
        .select('*')
        .single();

      if (error) {
        console.error('[useUpdateInsight] Database error:', error);
        throw new Error(error.message || 'Failed to update insight');
      }

      return data;
    },
    onSuccess: () => {
      const orgId = identity?.organization?.id;
      queryClient.invalidateQueries({ queryKey: ['ai-insights', orgId] });
      toast.success('Insight updated successfully');
    },
    onError: (error: Error) => {
      console.error('[useUpdateInsight] Mutation error:', error);
      toast.error(error.message || 'Failed to update insight');
    },
  });
}

export function useDeleteInsight() {
  const queryClient = useQueryClient();
  const { data: identity } = useUserIdentity();

  return useMutation({
    mutationFn: async ({ insightId, sourceAgent }: { insightId: string; sourceAgent?: string }) => {
      if (!identity?.organization?.id) {
        throw new Error('Organization not found');
      }

      // Soft delete by archiving - Database-First Architecture
      // Learning history displays 3 types:
      // - PART 1: agent_outputs (persona, strategy, content, etc.) → Real IDs, CAN DELETE
      // - PART 2: SME learning_metadata (business_profile) → Ephemeral IDs, CANNOT DELETE
      // - PART 3: Agency learning_metadata (business_profile) → Ephemeral IDs, CANNOT DELETE

      // CRITICAL: Check if this is a business_profile record (learning_metadata)
      if (sourceAgent === 'business_profile') {
        console.warn('[useDeleteInsight] Business profile record - cannot delete:', insightId);
        throw new Error('This learning history item cannot be deleted. It represents your business profile knowledge and is automatically managed by the AI.');
      }

      // Agent output record - proceed with archival
      const { data, error } = await supabase
        .from('agent_outputs')
        .update({
          archived_at: new Date().toISOString(),
          archived_by: identity.user.id
        })
        .eq('id', insightId)
        .eq('org_id', identity.organization.id)
        .select('*')
        .maybeSingle(); // Use maybeSingle() for safety

      if (error) {
        console.error('[useDeleteInsight] Database error:', error);
        throw new Error(error.message || 'Failed to delete insight');
      }

      if (!data) {
        console.warn('[useDeleteInsight] Insight not found or already archived:', insightId);
        throw new Error('Insight not found or already deleted');
      }

      return data;
    },
    onSuccess: () => {
      // Invalidate all learning history queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['ai-insights'] });
      toast.success('Insight archived successfully');
    },
    onError: (error: Error) => {
      console.error('[useDeleteInsight] Mutation error:', error);
      toast.error(error.message || 'Failed to delete insight');
    },
  });
}