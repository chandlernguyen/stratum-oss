/**
 * Unified Output Actions Hook
 *
 * Provides unified CRUD operations across multiple output tables.
 * Routes operations to correct database functions based on table_source metadata.
 *
 * Fixes the persona deletion error by handling table routing at database level.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useUserIdentity } from './useUserIdentity';
import { toast } from 'sonner';

export interface SavedOutput {
  id: string;
  title: string;
  metadata?: {
    table_source?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface UnifiedArchiveParams {
  item: SavedOutput;
  reason?: string;
}

export interface UnifiedRestoreParams {
  item: SavedOutput;
}

export interface UnifiedDeleteParams {
  item: SavedOutput;
}

export interface UnifiedUpdateParams {
  item: SavedOutput;
  data: {
    title?: string;
    content?: any;
    metadata?: Record<string, any>;
  };
}

export interface UnifiedActionResult {
  id: string;
  title?: string;
  table_source: string;
  updated_at?: string;
}

/**
 * Unified Output Actions Hook
 *
 * Provides clean API for CRUD operations across all output types.
 * Automatically routes to correct database functions based on table_source.
 */
export function useUnifiedOutputActions() {
  const queryClient = useQueryClient();
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  /**
   * Archive Operation
   * Routes to existing specialized functions (archive_persona, etc.)
   */
  const archive = useMutation({
    mutationFn: async ({ item, reason }: UnifiedArchiveParams): Promise<UnifiedActionResult> => {
      if (!orgId) {
        throw new Error('Organization not found');
      }

      const { data, error } = await supabase.rpc('unified_archive_output', {
        p_output_id: item.id,
        p_org_id: orgId,
        p_archive_reason: reason || 'User archived'
      });

      if (error) {
        console.error('[useUnifiedOutputActions] Archive error:', error);
        throw new Error(error.message || 'Failed to archive item');
      }

      return data;
    },
    onSuccess: (result) => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['outputs-hub', orgId] });
      queryClient.invalidateQueries({ queryKey: ['agent-outputs', orgId] });
      queryClient.invalidateQueries({ queryKey: ['my-outputs'] });

      toast.success(`${result.title || 'Item'} archived successfully`);
    },
    onError: (error: Error) => {
      console.error('[useUnifiedOutputActions] Archive mutation error:', error);
      toast.error(error.message || 'Failed to archive item');
    }
  });

  /**
   * Restore Operation
   * Clears archived_at and other table-specific archive fields
   */
  const restore = useMutation({
    mutationFn: async ({ item }: UnifiedRestoreParams): Promise<UnifiedActionResult> => {
      if (!orgId) {
        throw new Error('Organization not found');
      }

      const tableSource = item.metadata?.table_source;
      if (!tableSource) {
        throw new Error(`Item missing table_source metadata - required for unified operations. Item: ${item.title}`);
      }

      const { data, error } = await supabase.rpc('unified_restore_output', {
        p_id: item.id,
        p_table_source: tableSource,
        p_org_id: orgId
      });

      if (error) {
        console.error('[useUnifiedOutputActions] Restore error:', error);
        throw new Error(error.message || 'Failed to restore item');
      }

      return data;
    },
    onSuccess: (result) => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['outputs-hub', orgId] });
      queryClient.invalidateQueries({ queryKey: ['agent-outputs', orgId] });
      queryClient.invalidateQueries({ queryKey: ['my-outputs'] });

      toast.success(`${result.title || 'Item'} restored successfully`);
    },
    onError: (error: Error) => {
      console.error('[useUnifiedOutputActions] Restore mutation error:', error);
      toast.error(error.message || 'Failed to restore item');
    }
  });

  /**
   * Update Operation
   * Updates content in the correct table based on table_source
   */
  const update = useMutation({
    mutationFn: async ({ item, data }: UnifiedUpdateParams): Promise<UnifiedActionResult> => {
      if (!orgId) {
        throw new Error('Organization not found');
      }

      const tableSource = item.metadata?.table_source;
      if (!tableSource) {
        throw new Error(`Item missing table_source metadata - required for unified operations. Item: ${item.title}`);
      }

      const { data: result, error } = await supabase.rpc('unified_update_output', {
        p_id: item.id,
        p_table_source: tableSource,
        p_org_id: orgId,
        p_data: data
      });

      if (error) {
        console.error('[useUnifiedOutputActions] Update error:', error);
        throw new Error(error.message || 'Failed to update item');
      }

      return result;
    },
    onSuccess: (data) => {
      // Strategy 1: Force immediate refetch bypassing stale time
      Promise.all([
        queryClient.refetchQueries({
          queryKey: ['outputs-hub', orgId],
          type: 'active',
          stale: true // Force refetch even if data is fresh
        }),
        queryClient.refetchQueries({
          queryKey: ['agent-outputs', orgId],
          type: 'active',
          stale: true
        }),
        queryClient.refetchQueries({
          queryKey: ['my-outputs'],
          type: 'active',
          stale: true
        })
      ]).then(() => {
        console.log('Forced cache refetch completed for update');
      });

      // Strategy 2: Also invalidate as backup
      queryClient.invalidateQueries({
        queryKey: ['outputs-hub', orgId],
        exact: false
      });
      queryClient.invalidateQueries({
        queryKey: ['agent-outputs', orgId],
        exact: false
      });
      queryClient.invalidateQueries({
        queryKey: ['my-outputs'],
        exact: false
      });

      toast.success(`${data?.title || 'Item'} updated successfully`);
    },
    onMutate: async (variables) => {
      // Strategy 3: Optimistic update - update cache immediately before request
      const { item, data } = variables;

      // Cancel outgoing queries to avoid conflicts
      await queryClient.cancelQueries({ queryKey: ['outputs-hub', orgId] });

      // Get current cache data
      const previousData = queryClient.getQueryData(['outputs-hub', orgId]);

      // Optimistically update cache
      queryClient.setQueryData(['outputs-hub', orgId], (old: any) => {
        if (!old?.agent_outputs) return old;

        return {
          ...old,
          agent_outputs: old.agent_outputs.map((output: any) => {
            if (output.id === item.id) {
              return {
                ...output,
                title: data.title || output.title,
                content: data.content || output.content,
                metadata: { ...output.metadata, ...data.metadata },
                updated_at: new Date().toISOString()
              };
            }
            return output;
          })
        };
      });

      // Return context for rollback
      return { previousData };
    },
    onError: (error, _variables, context) => {
      // Rollback optimistic update on error
      if (context?.previousData) {
        queryClient.setQueryData(['outputs-hub', orgId], context.previousData);
      }
      console.error('[useUnifiedOutputActions] Update mutation error:', error);
      toast.error(error.message || 'Failed to update item');
    }
  });

  /**
   * Delete Operation (Hard Delete)
   * Permanent deletion from correct table
   */
  const deleteItem = useMutation({
    mutationFn: async ({ item }: UnifiedDeleteParams): Promise<UnifiedActionResult> => {
      if (!orgId) {
        throw new Error('Organization not found');
      }

      const tableSource = item.metadata?.table_source;
      if (!tableSource) {
        throw new Error(`Item missing table_source metadata - required for unified operations. Item: ${item.title}`);
      }

      const { data, error } = await supabase.rpc('unified_delete_output', {
        p_id: item.id,
        p_table_source: tableSource,
        p_org_id: orgId
      });

      if (error) {
        console.error('[useUnifiedOutputActions] Delete error:', error);
        throw new Error(error.message || 'Failed to delete item');
      }

      return data;
    },
    onSuccess: (result) => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['outputs-hub', orgId] });
      queryClient.invalidateQueries({ queryKey: ['agent-outputs', orgId] });
      queryClient.invalidateQueries({ queryKey: ['my-outputs'] });

      toast.success(`${result.title || 'Item'} deleted permanently`);
    },
    onError: (error: Error) => {
      console.error('[useUnifiedOutputActions] Delete mutation error:', error);
      toast.error(error.message || 'Failed to delete item');
    }
  });

  return {
    // Individual actions
    archive,
    restore,
    update,
    delete: deleteItem,

    // Status checks
    isArchiving: archive.isPending,
    isRestoring: restore.isPending,
    isUpdating: update.isPending,
    isDeleting: deleteItem.isPending,

    // Combined loading state
    isLoading: archive.isPending || restore.isPending || update.isPending || deleteItem.isPending,

    // Action count for UI feedback
    pendingActions: [
      archive.isPending && 'archiving',
      restore.isPending && 'restoring',
      update.isPending && 'updating',
      deleteItem.isPending && 'deleting'
    ].filter(Boolean).length
  };
}

/**
 * Helper to validate if item supports unified operations
 */
export function canUseUnifiedActions(item: SavedOutput): boolean {
  return !!(item?.metadata?.table_source);
}

/**
 * Helper to get display name for table source
 * Nuclear migration: synthetic_personas removed - personas now in agent_outputs
 */
export function getTableSourceDisplayName(tableSource: string): string {
  switch (tableSource) {
    case 'agent_outputs':
      return 'Output';
    case 'strategy_intelligence':
      return 'Strategy Analysis';
    default:
      return 'Item';
  }
}