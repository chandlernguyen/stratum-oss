import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useUserIdentity } from './useUserIdentity';

// Session type matching get_conversations_routed() return structure (Migration 229)
export interface AgentSession {
  id: string;
  org_id: string;
  agent_type: string;
  user_id: string;
  client_id: string | null;    // NULL for SME, UUID for Agency
  campaign_id: string | null;  // NULL for SME, UUID for Agency
  title: string;                // Computed from session_data for SME
  message_count: number;        // Always returned (computed by database function)
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface UseAgentSessionsOptions {
  includeArchived?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Database-First hook for fetching agent conversation sessions
 *
 * Uses get_conversations_routed() database function (Migration 222-224, fixed in 229)
 * - Automatically routes based on organization type (SME vs Agency)
 * - SME: Queries public.agent_conversations
 * - Agency: Queries agency.agent_conversations
 * - Computes message_count, title, and handles schema differences
 *
 * @param agentType - Agent type (e.g., 'strategy', 'persona', 'marketing_strategy')
 * @param clientId - Optional client ID for Agency multi-tenant filtering
 * @param options - Query options (includeArchived, limit, offset)
 * @returns React Query result with agent sessions array
 *
 * @example
 * // SME user (no client filter)
 * const { data: sessions = [] } = useAgentSessions('strategy');
 *
 * @example
 * // Agency user (with client filter)
 * const { data: sessions = [] } = useAgentSessions('strategy', clientId);
 *
 * @example
 * // With options
 * const { data: sessions = [] } = useAgentSessions('persona', clientId, {
 *   includeArchived: false,
 *   limit: 50
 * });
 */
export function useAgentSessions(
  agentType: string,
  clientId?: string,
  options: UseAgentSessionsOptions = {}
): UseQueryResult<AgentSession[]> {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useQuery({
    queryKey: ['agent-sessions', orgId, agentType, clientId, options],
    queryFn: async (): Promise<AgentSession[]> => {
      if (!orgId) {
        console.log('[useAgentSessions] No org_id available');
        return [];
      }

      console.log('[useAgentSessions] Fetching sessions:', {
        orgId,
        agentType,
        clientId,
        includeArchived: options.includeArchived
      });

      // Use database-first architecture with get_conversations_routed function
      // Migration 222-224 (created), 229 (fixed bugs)
      // Routes to correct schema based on organization type
      const { data, error } = await supabase.rpc('get_conversations_routed', {
        p_org_id: orgId,
        p_agent_type: agentType,
        p_client_id: clientId || null,
        p_limit: options.limit || 50,
        p_offset: options.offset || 0
      });

      if (error) {
        console.error('[useAgentSessions] Error fetching sessions:', error);
        throw error;
      }

      console.log(`[useAgentSessions] Fetched ${data?.length || 0} sessions for agent type: ${agentType}`);

      // Filter archived sessions if requested
      let sessions = data || [];
      if (!options.includeArchived) {
        sessions = sessions.filter((s: AgentSession) => !s.archived_at);
      }

      return sessions;
    },
    enabled: !!orgId && !!agentType,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
