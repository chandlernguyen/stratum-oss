import { useQuery } from '@tanstack/react-query';
import { useUserIdentity } from './useUserIdentity';
import { supabase } from '@/lib/supabase';

interface ContentStats {
  has_strategy: boolean;
  has_personas: boolean;
  content_count: number;
  strategy_count: number;
  persona_count: number;
  recommendations_count: number;
}

/**
 * Database-First approach for instant content statistics
 * Uses lightweight count queries for < 50ms response time
 */
export function useContentStats() {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useQuery<ContentStats>({
    queryKey: ['content-stats', orgId],
    queryFn: async () => {
      if (!orgId) {
        return {
          has_strategy: false,
          has_personas: false,
          content_count: 0,
          strategy_count: 0,
          persona_count: 0,
          recommendations_count: 0,
        };
      }

      console.log('[useContentStats] Fetching stats for org:', orgId);

      // Parallel database queries for maximum speed
      const [strategiesResult, personasResult, contentResult] = await Promise.all([
        // Count marketing strategies
        supabase
          .from('agent_outputs')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .eq('agent_type', 'marketing_strategy')
          .is('archived_at', null),

        // Count personas (nuclear migration: agent_outputs table)
        supabase
          .from('agent_outputs')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .eq('agent_type', 'persona')
          .eq('output_type', 'persona')
          .is('archived_at', null),

        // Count content outputs
        supabase
          .from('agent_outputs')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .eq('agent_type', 'content')
          .is('archived_at', null)
      ]);

      // Handle errors gracefully
      if (strategiesResult.error) {
        console.error('[useContentStats] Error fetching strategies:', strategiesResult.error);
      }
      if (personasResult.error) {
        console.error('[useContentStats] Error fetching personas:', personasResult.error);
      }
      if (contentResult.error) {
        console.error('[useContentStats] Error fetching content:', contentResult.error);
      }

      const strategyCount = strategiesResult.count ?? 0;
      const personaCount = personasResult.count ?? 0;
      const contentCount = contentResult.count ?? 0;

      // Calculate recommendations based on available context
      // Simple heuristic: If you have both strategy and personas, show 5 recommendations
      // If missing one, show fewer recommendations
      let recommendationsCount = 0;
      if (strategyCount > 0 && personaCount > 0) {
        recommendationsCount = 5;
      } else if (strategyCount > 0 || personaCount > 0) {
        recommendationsCount = 3;
      }

      const stats = {
        has_strategy: strategyCount > 0,
        has_personas: personaCount > 0,
        content_count: contentCount,
        strategy_count: strategyCount,
        persona_count: personaCount,
        recommendations_count: recommendationsCount,
      };

      console.log('[useContentStats] Stats fetched:', stats);

      return stats;
    },
    enabled: !!orgId,
    staleTime: 30000, // Cache for 30 seconds - stats don't change frequently
    refetchOnWindowFocus: false, // Don't refetch when user switches tabs
  });
}
