import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useUserIdentity } from '@/hooks/data/useUserIdentity';

export interface Session {
  id: string;
  created_at: string;
  updated_at?: string;
  session_title?: string;
  title?: string;
  message_count?: number;
  first_message?: string;
  last_message?: string;
  persona_id?: string;
  persona_name?: string;
  archived?: boolean;
  archived_at?: string;
  archived_reason?: string;
}

export interface UseSessionManagementConfig {
  endpoint: string;
  agentType: string;
  clientId?: string; // Optional: For agency client-scoped session filtering
  autoLoad?: boolean;
  sortBy?: 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

export interface UseSessionManagementReturn {
  sessions: Session[];
  loading: boolean;
  error: Error | null;
  showArchived: boolean;
  setShowArchived: (show: boolean) => void;
  toggleArchived: () => void;
  loadSessions: () => Promise<void>;
  deleteSession: (sessionId: string) => Promise<boolean>; // Now archives (soft delete)
  permanentDeleteSession: (sessionId: string) => Promise<boolean>; // Hard delete
  archiveSession: (sessionId: string, reason?: string) => Promise<boolean>;
  restoreSession: (sessionId: string) => Promise<boolean>;
  renameSession: (sessionId: string, newTitle: string) => Promise<boolean>;
  clearSessions: () => void;
}

/**
 * Shared hook for managing agent sessions across all sidebars
 * Phase 4: Hybrid approach - Database-First for simple CRUD, API for complex operations
 * Provides consistent session CRUD operations and archive management
 */
export function useSessionManagement(config: UseSessionManagementConfig): UseSessionManagementReturn {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const loadSessions = useCallback(async () => {
    if (!orgId) {
      setSessions([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Database-First: Use get_conversations_routed (Migration 222-224, fixed in 229)
      // Routes to correct schema based on organization type (SME vs Agency)
      console.log(`[useSessionManagement] Loading sessions for agent="${config.agentType}" with clientId="${config.clientId}"`);
      const { data, error } = await supabase.rpc('get_conversations_routed', {
        p_org_id: orgId,
        p_agent_type: config.agentType,
        p_client_id: config.clientId || null, // Filter by client when provided (agency use case)
        p_limit: 100,
        p_offset: 0
      });

      if (error) {
        console.error(`Error loading ${config.agentType} sessions:`, error);
        throw error;
      }

      console.log(`[useSessionManagement] Loaded ${(data || []).length} sessions from database`);

      // Filter archived sessions based on showArchived flag
      let sessions = data || [];
      if (!showArchived) {
        sessions = sessions.filter((s: any) => !s.archived_at);
      }

      // Map database results to Session interface
      // Migration 229 returns: id, org_id, agent_type, user_id, client_id, campaign_id,
      //                        title, message_count, created_at, updated_at, archived_at
      const sessionData = sessions.map((row: any) => ({
        id: row.id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        session_title: row.title, // Migration 229: computed from session_data for SME
        title: row.title,
        message_count: row.message_count, // Migration 229: always computed
        first_message: undefined, // Not returned by get_conversations_routed
        last_message: undefined, // Not returned by get_conversations_routed
        archived: !!row.archived_at,
        archived_at: row.archived_at,
        archived_reason: undefined // Not returned by get_conversations_routed
      } as Session));

      // Sort sessions
      const sorted = [...sessionData].sort((a, b) => {
        const field = config.sortBy || 'created_at';
        const order = config.sortOrder || 'desc';

        const aVal = new Date(a[field] || a.created_at).getTime();
        const bVal = new Date(b[field] || b.created_at).getTime();

        return order === 'desc' ? bVal - aVal : aVal - bVal;
      });

      setSessions(sorted);
    } catch (err) {
      console.error(`Error loading ${config.agentType} sessions:`, err);
      setError(err as Error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [orgId, config.agentType, config.clientId, config.sortBy, config.sortOrder, showArchived]); // Include clientId in deps

  const deleteSession = useCallback(async (sessionId: string): Promise<boolean> => {
    if (!orgId) return false;

    // NOTE: This is now archive (soft delete) per backend implementation
    try {
      // Phase 4: Database-First session archiving
      const { error } = await supabase.rpc('archive_agent_session', {
        p_session_id: sessionId,
        p_org_id: orgId,
        p_archive_reason: 'User deleted'
      });

      if (error) {
        console.error(`Error archiving ${config.agentType} session:`, error);
        throw error;
      }

      // Remove from current view if not showing archived
      if (!showArchived) {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
      } else {
        // Update the session to show it's archived
        setSessions(prev => prev.map(s =>
          s.id === sessionId
            ? { ...s, archived: true, archived_at: new Date().toISOString() }
            : s
        ));
      }
      return true;
    } catch (err) {
      console.error(`Error archiving ${config.agentType} session:`, err);
      setError(err as Error);
      return false;
    }
  }, [orgId, config.agentType, showArchived]);

  const permanentDeleteSession = useCallback(async (sessionId: string): Promise<boolean> => {
    // Phase 4: Complex operation remains API-based for business logic validation
    try {
      await api.delete(`${config.endpoint}/${sessionId}/permanent?confirm=true`);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      return true;
    } catch (err) {
      console.error(`Error permanently deleting ${config.agentType} session:`, err);
      setError(err as Error);
      return false;
    }
  }, [config.endpoint, config.agentType]);

  const archiveSession = useCallback(async (sessionId: string, reason?: string): Promise<boolean> => {
    if (!orgId) return false;

    try {
      // Phase 4: Database-First session archiving with reason
      const { error } = await supabase.rpc('archive_agent_session', {
        p_session_id: sessionId,
        p_org_id: orgId,
        p_archive_reason: reason || 'User archived'
      });

      if (error) {
        console.error(`Error archiving ${config.agentType} session:`, error);
        throw error;
      }

      // Remove from current view if not showing archived
      if (!showArchived) {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
      } else {
        // Update the session to show it's archived
        setSessions(prev => prev.map(s =>
          s.id === sessionId
            ? { ...s, archived: true, archived_at: new Date().toISOString(), archived_reason: reason || 'User archived' }
            : s
        ));
      }
      return true;
    } catch (err) {
      console.error(`Error archiving ${config.agentType} session:`, err);
      setError(err as Error);
      return false;
    }
  }, [orgId, config.agentType, showArchived]);

  const restoreSession = useCallback(async (sessionId: string): Promise<boolean> => {
    if (!orgId) return false;

    try {
      // Phase 4: Database-First session restoration
      const { error } = await supabase.rpc('restore_agent_session', {
        p_session_id: sessionId,
        p_org_id: orgId
      });

      if (error) {
        console.error(`Error restoring ${config.agentType} session:`, error);
        throw error;
      }

      // Remove from current view if showing archived
      if (showArchived) {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
      } else {
        // Reload to get the restored session
        await loadSessions();
      }
      return true;
    } catch (err) {
      console.error(`Error restoring ${config.agentType} session:`, err);
      setError(err as Error);
      return false;
    }
  }, [orgId, config.agentType, showArchived, loadSessions]);

  const renameSession = useCallback(async (sessionId: string, newTitle: string): Promise<boolean> => {
    if (!orgId) return false;

    try {
      // Phase 4: Database-First session renaming
      const { error } = await supabase.rpc('update_agent_session', {
        p_session_id: sessionId,
        p_org_id: orgId,
        p_session_title: newTitle,
        p_session_data: null,
        p_merge_data: true
      });

      if (error) {
        console.error(`Error renaming ${config.agentType} session:`, error);
        throw error;
      }

      setSessions(prev => prev.map(s =>
        s.id === sessionId
          ? { ...s, session_title: newTitle, title: newTitle }
          : s
      ));
      return true;
    } catch (err) {
      console.error(`Error renaming ${config.agentType} session:`, err);
      setError(err as Error);
      return false;
    }
  }, [orgId, config.agentType]);

  const toggleArchived = useCallback(() => {
    setShowArchived(prev => !prev);
  }, []);

  const clearSessions = useCallback(() => {
    setSessions([]);
  }, []);

  // Auto-load sessions on mount and when showArchived changes
  useEffect(() => {
    if (config.autoLoad !== false && orgId) {
      loadSessions();
    }
  }, [orgId, showArchived, config.autoLoad, loadSessions]);

  return {
    sessions,
    loading,
    error,
    showArchived,
    setShowArchived,
    toggleArchived,
    loadSessions,
    deleteSession,
    permanentDeleteSession,
    archiveSession,
    restoreSession,
    renameSession,
    clearSessions
  };
}