import { useQueryClient } from '@tanstack/react-query';
import { useUserIdentity } from './data/useUserIdentity';

/**
 * Universal hook for invalidating React Query caches across all agents
 *
 * Database-First Architecture Pattern:
 * When any agent saves data to the database, we invalidate the relevant query cache
 * to trigger automatic UI refresh across the entire application.
 *
 * This replaces fragile custom event patterns with React Query's built-in cache management.
 *
 * Usage:
 * ```typescript
 * const { invalidatePersonas, invalidateAgentOutputs } = useInvalidateResources();
 *
 * // After saving a persona
 * await savePersona(data);
 * invalidatePersonas(); // Automatically refreshes ALL persona lists in the app
 * ```
 */
export function useInvalidateResources() {
  const queryClient = useQueryClient();
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return {
    /**
     * Invalidate personas list (from usePersonas hook)
     * Triggers refresh in: sidebar, persona pages, persona selectors, etc.
     */
    invalidatePersonas: () => {
      if (orgId) {
        queryClient.invalidateQueries({ queryKey: ['personas', orgId] });
        console.log('[useInvalidateResources] Invalidated personas cache for org:', orgId);
      }
    },

    /**
     * Invalidate marketing strategies list (from useMarketingStrategies hook)
     * Triggers refresh in: sidebar, strategy pages, strategy selectors, etc.
     */
    invalidateStrategies: () => {
      if (orgId) {
        queryClient.invalidateQueries({ queryKey: ['marketing-strategies', orgId] });
        console.log('[useInvalidateResources] Invalidated marketing strategies cache for org:', orgId);
      }
    },

    /**
     * Invalidate agent outputs (from useAgentOutputs hook)
     * Optionally filter by agent_type to invalidate only specific agent outputs
     *
     * @param agentType - Optional: specific agent type to invalidate (e.g., 'strategy', 'content')
     */
    invalidateAgentOutputs: (agentType?: string) => {
      if (orgId) {
        if (agentType) {
          // Invalidate only queries for specific agent type
          queryClient.invalidateQueries({
            queryKey: ['agent-outputs', orgId],
            predicate: (query) => {
              const filters = query.queryKey[2] as any;
              return filters?.agent_type === agentType;
            }
          });
          console.log(`[useInvalidateResources] Invalidated ${agentType} agent outputs cache`);
        } else {
          // Invalidate all agent outputs
          queryClient.invalidateQueries({ queryKey: ['agent-outputs', orgId] });
          console.log('[useInvalidateResources] Invalidated all agent outputs cache');
        }
      }
    },

    /**
     * Invalidate campaigns list (from useCampaigns hook)
     */
    invalidateCampaigns: () => {
      if (orgId) {
        queryClient.invalidateQueries({ queryKey: ['campaigns', orgId] });
        console.log('[useInvalidateResources] Invalidated campaigns cache');
      }
    },

    /**
     * Invalidate clients list (from useClients hook)
     */
    invalidateClients: () => {
      if (orgId) {
        queryClient.invalidateQueries({ queryKey: ['clients', orgId] });
        console.log('[useInvalidateResources] Invalidated clients cache');
      }
    },

    /**
     * Invalidate brand guidelines (from useBrandGuidelines hook)
     */
    invalidateBrandGuidelines: () => {
      if (orgId) {
        queryClient.invalidateQueries({ queryKey: ['brand-guidelines', orgId] });
        console.log('[useInvalidateResources] Invalidated brand guidelines cache');
      }
    },

    /**
     * Invalidate unified outputs hub (from useUnifiedOutputsHub hook)
     */
    invalidateOutputsHub: () => {
      if (orgId) {
        queryClient.invalidateQueries({ queryKey: ['unified-outputs-hub', orgId] });
        console.log('[useInvalidateResources] Invalidated outputs hub cache');
      }
    },

    /**
     * Nuclear option: Invalidate ALL resource caches
     * Use this when you're unsure what changed or want to ensure everything is fresh
     */
    invalidateAll: () => {
      if (orgId) {
        queryClient.invalidateQueries({ queryKey: ['personas', orgId] });
        queryClient.invalidateQueries({ queryKey: ['marketing-strategies', orgId] });
        queryClient.invalidateQueries({ queryKey: ['agent-outputs', orgId] });
        queryClient.invalidateQueries({ queryKey: ['campaigns', orgId] });
        queryClient.invalidateQueries({ queryKey: ['clients', orgId] });
        queryClient.invalidateQueries({ queryKey: ['brand-guidelines', orgId] });
        queryClient.invalidateQueries({ queryKey: ['unified-outputs-hub', orgId] });
        console.log('[useInvalidateResources] Invalidated ALL resource caches (nuclear option)');
      }
    }
  };
}
