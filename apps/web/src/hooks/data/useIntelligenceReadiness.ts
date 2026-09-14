import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useUserIdentity } from './useUserIdentity';

export interface IntelligenceReadiness {
  hasStrategy: boolean;
  hasPersona: boolean;
  hasMarketingStrategy: boolean;
  hasContent: boolean;
  totalOutputs: number;
  readinessScore: number; // 0-100 percentage
  isReady: boolean; // true if at least 2 prerequisites complete
}

export function useIntelligenceReadiness() {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useQuery({
    queryKey: ['intelligence-readiness', orgId],
    queryFn: async (): Promise<IntelligenceReadiness> => {
      if (!orgId) {
        return {
          hasStrategy: false,
          hasPersona: false,
          hasMarketingStrategy: false,
          hasContent: false,
          totalOutputs: 0,
          readinessScore: 0,
          isReady: false
        };
      }

      // Database-First: Use database function for complex operation (single call vs multiple queries)
      const { data, error } = await supabase
        .rpc('get_intelligence_readiness', { p_org_id: orgId })
        .single<{
          has_strategy: boolean;
          has_persona: boolean;
          has_marketing_strategy: boolean;
          has_content: boolean;
          total_outputs: number;
          readiness_score: number;
          is_ready: boolean;
        }>();

      if (error) {
        console.error('Failed to fetch intelligence readiness:', error);
        throw error;
      }

      if (!data) {
        return {
          hasStrategy: false,
          hasPersona: false,
          hasMarketingStrategy: false,
          hasContent: false,
          totalOutputs: 0,
          readinessScore: 0,
          isReady: false
        };
      }

      return {
        hasStrategy: data.has_strategy,
        hasPersona: data.has_persona,
        hasMarketingStrategy: data.has_marketing_strategy,
        hasContent: data.has_content,
        totalOutputs: data.total_outputs,
        readinessScore: data.readiness_score,
        isReady: data.is_ready
      };
    },
    enabled: !!orgId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000 // 5 minutes
  });
}
