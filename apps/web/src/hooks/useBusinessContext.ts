import { useQuery } from '@tanstack/react-query';
import { useOutputsHub } from '@/hooks/data/useAgentOutputs';
import { useUserIdentity } from '@/hooks/data/useUserIdentity';
import { supabase } from '@/lib/supabase';

export interface BusinessContext {
  orgId: string;
  businessData: any;
  personas: any[];
  strategies: any[];
  content: any[];
  dataHash: string;
}

/**
 * Database-First business context hook for LLM recommendations
 * Leverages existing architecture to gather comprehensive business intelligence
 *
 * @param options - Optional configuration
 * @param options.clientSlug - For Agency users: filter data by specific client
 */
export function useBusinessContext(options: { clientSlug?: string } = {}) {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  // ✅ FIX: Resolve clientSlug to client_id for client-specific business data
  const { data: clientData, isLoading: clientLoading } = useQuery({
    queryKey: ['client-by-slug', orgId, options.clientSlug],
    queryFn: async () => {
      if (!orgId || !options.clientSlug) return null;

      const { data, error } = await supabase.rpc('get_client_by_slug_routed', {
        p_org_id: orgId,
        p_slug: options.clientSlug
      });

      if (error) {
        console.error('Error fetching client by slug:', error);
        return null;
      }

      return data;
    },
    enabled: !!orgId && !!options.clientSlug,
    staleTime: 10 * 60 * 1000,
  });

  const clientId = clientData?.id;

  // Get business data: client_intelligence for agency clients, core_business_data for SME
  const { data: businessData, isLoading: businessLoading } = useQuery({
    queryKey: ['business-context', orgId, clientId],
    queryFn: async () => {
      if (!orgId) return null;

      // Agency users with client context: query client_intelligence view
      if (clientId) {
        const { data, error } = await supabase
          .from('client_intelligence')
          .select('*')
          .eq('org_id', orgId)
          .eq('client_id', clientId)
          .maybeSingle();

        if (error) {
          console.error('Error fetching client intelligence:', error);
          return null;
        }
        return data;
      }

      // SME users: query core_business_data (org-level, no client_id)
      const { data, error } = await supabase
        .from('core_business_data')
        .select('*')
        .eq('org_id', orgId)
        .is('client_id', null)
        .maybeSingle();

      if (error) {
        console.error('Error fetching business context:', error);
        return null;
      }
      return data;
    },
    enabled: !!orgId && (!options.clientSlug || !!clientId),
    staleTime: 10 * 60 * 1000, // 10 minutes - business data changes rarely
  });

  // ✅ FIX: Use client-scoped outputs when clientSlug is provided (Agency users)
  // For SME users (no clientSlug), this returns org-level data
  const { data: outputsHubData, isLoading: outputsLoading } = useOutputsHub({ clientSlug: options.clientSlug });
  const allOutputs = outputsHubData?.agent_outputs || [];

  // Extract personas from outputs
  const personas = allOutputs
    .filter(o => o.agent_type === 'persona' && o.output_type === 'persona')
    .map((item: any) => {
      const content = item.content || {};
      const metadata = item.metadata || {};
      return {
        id: item.id,
        org_id: item.org_id,
        campaign_id: item.campaign_id,
        name: content.name,
        title: content.title,
        company_name: content.company_name,
        industry: content.industry,
        demographics: content.demographics || {},
        personality_traits: content.personality_traits || {},
        goals: content.goals || [],
        pain_points: content.pain_points || [],
        jobs_to_be_done: content.jobs_to_be_done || [],
        decision_criteria: content.decision_criteria || {},
        objections: content.objections || [],
        customer_status: content.customer_status,
        background_story: content.background_story,
        key_quote: content.key_quote,
        is_primary: metadata.is_primary || false,
        created_at: item.created_at,
        updated_at: item.updated_at,
      };
    });

  // Extract strategies (both marketing_strategy and strategy types)
  const strategies = allOutputs.filter(o =>
    o.agent_type === 'marketing_strategy' || o.agent_type === 'strategy'
  );

  // Extract content
  const content = allOutputs.filter(o => o.agent_type === 'content');

  // Generate data hash for cache invalidation (include clientSlug for client-specific caching)
  const dataHash = generateDataHash({
    business: businessData,
    personas: personas?.length || 0,
    strategies: strategies?.length || 0,
    content: content?.length || 0,
    clientSlug: options.clientSlug
  });

  // Include client slug resolution in loading state for agency users
  const isLoading = businessLoading || outputsLoading || (!!options.clientSlug && clientLoading);

  const businessContext: BusinessContext | null = orgId && !isLoading ? {
    orgId,
    businessData,
    personas: personas || [],
    strategies: strategies || [],
    content: content || [],
    dataHash
  } : null;

  return {
    data: businessContext,
    isLoading,
    error: null
  };
}

/**
 * Generate hash for cache invalidation
 * Changes when key business data is updated
 */
function generateDataHash(data: any): string {
  const hashData = {
    businessUpdated: data.business?.updated_at,
    personasCount: data.personas,
    strategiesCount: data.strategies,
    contentCount: data.content,
    timestamp: Math.floor(Date.now() / (1000 * 60 * 60)) // Hour-based for cache
  };

  return btoa(JSON.stringify(hashData)).slice(0, 16);
}