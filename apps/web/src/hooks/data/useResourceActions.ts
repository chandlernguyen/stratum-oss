/**
 * Database-First Resource Actions Hook
 *
 * Replaces API-based resource-actions.ts with direct Supabase operations.
 * Provides consistent archive, restore, and delete operations across all resources.
 *
 * 🔒 SECURITY: All operations automatically enforce RLS policies
 * ⚡ PERFORMANCE: Direct database calls eliminate API layer overhead
 * 🎯 CONSISTENCY: Unified pattern for all resource management
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useUserIdentity } from './useUserIdentity';
import { toast } from 'sonner';
import type { ResourceConfig } from '@/config/resource-configs';
import { handleResourceNotFound, invalidateQueryKeys } from './utils/queryHelpers';

export interface ArchiveResourceParams {
  id: string;
  reason?: string;
}

export interface BulkArchiveParams {
  ids: string[];
  reason?: string;
}

export interface RestoreResourceParams {
  id: string;
}

export interface DeleteResourceParams {
  id: string;
  permanent?: boolean;
}

export interface ResourceActionResult {
  success: boolean;
  message: string;
  id: string;
}

export interface BulkActionResult {
  success: boolean;
  message: string;
  count: number;
  failed: string[];
}

/**
 * Helper function to determine which columns to select based on table schema
 */
function getSelectColumns(tableName: string): string {
  // Strip schema prefix for column detection
  const baseTableName = tableName.includes('.') ? tableName.split('.')[1] : tableName;

  // Tables that only have 'title' column (no 'name')
  const titleOnlyTables = ['agent_outputs', 'marketing_strategies', 'ai_insights', 'active_insights'];

  // Tables that have both 'name' and 'title' columns (personas removed - now in agent_outputs with JSONB)
  const bothColumnTables = ['active_personas'];

  // Tables that have neither 'name' nor 'title' (data in JSONB or other fields)
  const idOnlyTables = ['agent_conversations'];

  if (titleOnlyTables.includes(baseTableName)) {
    return 'id, title';
  } else if (bothColumnTables.includes(baseTableName)) {
    return 'id, name, title';
  } else if (idOnlyTables.includes(baseTableName)) {
    return 'id';
  } else {
    // Default to 'name' for most tables (campaigns, clients, organizations, etc.)
    return 'id, name';
  }
}

/**
 * Database-First Resource Actions Hook
 *
 * Provides CRUD operations with automatic org_id scoping and RLS enforcement.
 * Replaces the API-based ResourceActionsAPI class.
 */
export function useResourceActions(config: ResourceConfig) {
  const queryClient = useQueryClient();
  const { data: identity } = useUserIdentity();

  const orgId = identity?.organization?.id;

  /**
   * Archive Resource (Soft Delete)
   *
   * Uses archived_at pattern instead of status='archived'
   * Automatically includes org_id filtering for security
   */
  const archiveResource = useMutation({
    mutationFn: async ({ id, reason }: ArchiveResourceParams): Promise<ResourceActionResult> => {
      if (!orgId) {
        throw new Error('Organization not found');
      }

      // Use router functions for multi-tenant tables (campaigns, clients)
      const baseTableName = config.tableName.includes('.') ? config.tableName.split('.')[1] : config.tableName;
      const multiTenantTables = ['campaigns', 'clients'];

      if (multiTenantTables.includes(baseTableName)) {
        // Call appropriate router function
        const routerFunctionName = `archive_${baseTableName.slice(0, -1)}_routed`; // e.g., archive_campaign_routed

        const { data, error } = await supabase.rpc(routerFunctionName, {
          [`p_${baseTableName.slice(0, -1)}_id`]: id, // e.g., p_campaign_id
          p_org_id: orgId,
          p_archive_reason: reason || null
        });

        if (error) {
          console.error(`[useResourceActions] Archive error for ${config.tableName}:`, error);
          throw new Error(error.message || `Failed to archive ${config.displayName.toLowerCase()}`);
        }

        if (!data) {
          return handleResourceNotFound({
            queryClient,
            queryKeys: [
              [config.tableName],
              [config.tableName, orgId],
            ],
            logMessage: `[useResourceActions] Optimistic archive success for ${config.tableName} id: ${id} (already archived/deleted)`,
            payload: {
              success: true,
              message: `${config.displayName} archived successfully`,
              id,
            },
          });
        }

        return {
          success: true,
          message: `${config.displayName} archived successfully`,
          id: data.id
        };
      }

      // For non-multi-tenant tables, use direct table update
      const updateData: Record<string, any> = {
        archived_at: new Date().toISOString(),
        archived_by: identity?.user.id,
        updated_at: new Date().toISOString()
      };

      if (reason) {
        updateData.archive_reason = reason;
      }

      // Select only columns that exist for this table
      const selectColumns = getSelectColumns(config.tableName);

      const { data, error } = await supabase
        .from(config.tableName)
        .update(updateData)
        .eq('id', id)
        .eq('org_id', orgId) // Explicit org_id check for security
        .select(selectColumns)
        .single();

      if (error) {
        console.error(`[useResourceActions] Archive error for ${config.tableName}:`, error);
        throw new Error(error.message || `Failed to archive ${config.displayName.toLowerCase()}`);
      }

      if (!data) {
        return handleResourceNotFound({
          queryClient,
          queryKeys: [
            [config.tableName],
            [config.tableName, orgId],
          ],
          logMessage: `[useResourceActions] Optimistic archive success for ${config.tableName} id: ${id} (already archived/deleted)`,
          payload: {
            success: true,
            message: `${config.displayName} archived successfully`,
            id,
          },
        });
      }

      return {
        success: true,
        message: `${config.displayName} archived successfully`,
        id: (data as any).id
      };
    },
    onSuccess: (result) => {
      invalidateQueryKeys(queryClient, [
        [config.tableName],
        [config.tableName, orgId],
      ]);
      toast.success(result.message);
    },
    onError: (error: Error) => {
      console.error(`[useResourceActions] Archive mutation error:`, error);
      toast.error(error.message || `Failed to archive ${config.displayName.toLowerCase()}`);
    }
  });

  /**
   * Restore Archived Resource
   *
   * Clears archived_at and related metadata
   */
  const restoreResource = useMutation({
    mutationFn: async ({ id }: RestoreResourceParams): Promise<ResourceActionResult> => {
      if (!orgId) {
        throw new Error('Organization not found');
      }

      // Use router functions for multi-tenant tables (campaigns, clients)
      const baseTableName = config.tableName.includes('.') ? config.tableName.split('.')[1] : config.tableName;
      const multiTenantTables = ['campaigns', 'clients'];

      if (multiTenantTables.includes(baseTableName)) {
        // Call appropriate router function
        const routerFunctionName = `restore_${baseTableName.slice(0, -1)}_routed`; // e.g., restore_campaign_routed

        const { data, error } = await supabase.rpc(routerFunctionName, {
          [`p_${baseTableName.slice(0, -1)}_id`]: id, // e.g., p_campaign_id
          p_org_id: orgId
        });

        if (error) {
          console.error(`[useResourceActions] Restore error for ${config.tableName}:`, error);
          throw new Error(error.message || `Failed to restore ${config.displayName.toLowerCase()}`);
        }

        if (!data) {
          return handleResourceNotFound({
            queryClient,
            queryKeys: [
              [config.tableName],
              [config.tableName, orgId],
            ],
            logMessage: `[useResourceActions] Optimistic restore success for ${config.tableName} id: ${id} (already restored/deleted)`,
            payload: {
              success: true,
              message: `${config.displayName} restored successfully`,
              id,
            },
          });
        }

        return {
          success: true,
          message: `${config.displayName} restored successfully`,
          id: data.id
        };
      }

      // For non-multi-tenant tables, use direct table update
      // Select only columns that exist for this table
      const selectColumns = getSelectColumns(config.tableName);

      const { data, error } = await supabase
        .from(config.tableName)
        .update({
          archived_at: null,
          archived_by: null,
          archive_reason: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('org_id', orgId) // Explicit org_id check for security
        .select(selectColumns)
        .single();

      if (error) {
        console.error(`[useResourceActions] Restore error for ${config.tableName}:`, error);
        throw new Error(error.message || `Failed to restore ${config.displayName.toLowerCase()}`);
      }

      if (!data) {
        return handleResourceNotFound({
          queryClient,
          queryKeys: [
            [config.tableName],
            [config.tableName, orgId],
          ],
          logMessage: `[useResourceActions] Optimistic restore success for ${config.tableName} id: ${id} (already restored/deleted)`,
          payload: {
            success: true,
            message: `${config.displayName} restored successfully`,
            id,
          },
        });
      }

      return {
        success: true,
        message: `${config.displayName} restored successfully`,
        id: (data as any).id
      };
    },
    onSuccess: (result) => {
      invalidateQueryKeys(queryClient, [
        [config.tableName],
        [config.tableName, orgId],
      ]);
      toast.success(result.message);
    },
    onError: (error: Error) => {
      console.error(`[useResourceActions] Restore mutation error:`, error);
      toast.error(error.message || `Failed to restore ${config.displayName.toLowerCase()}`);
    }
  });

  /**
   * Delete Resource (Hard Delete)
   *
   * Permanent deletion - use with caution
   * Only allowed for certain resource types and user roles
   */
  const deleteResource = useMutation({
    mutationFn: async ({ id, permanent = false }: DeleteResourceParams): Promise<ResourceActionResult> => {
      if (!orgId) {
        throw new Error('Organization not found');
      }

      if (!permanent) {
        // Default behavior is soft delete (archive)
        return archiveResource.mutateAsync({ id });
      }

      // Use router functions for multi-tenant tables (campaigns, clients)
      const baseTableName = config.tableName.includes('.') ? config.tableName.split('.')[1] : config.tableName;
      const multiTenantTables = ['campaigns', 'clients'];

      if (multiTenantTables.includes(baseTableName)) {
        // Call appropriate router function
        const routerFunctionName = `delete_${baseTableName.slice(0, -1)}_routed`; // e.g., delete_campaign_routed

        const { data, error } = await supabase.rpc(routerFunctionName, {
          [`p_${baseTableName.slice(0, -1)}_id`]: id, // e.g., p_campaign_id
          p_org_id: orgId
        });

        if (error) {
          console.error(`[useResourceActions] Delete error for ${config.tableName}:`, error);
          throw new Error(error.message || `Failed to delete ${config.displayName.toLowerCase()}`);
        }

        if (!data) {
          return handleResourceNotFound({
            queryClient,
            queryKeys: [
              [config.tableName],
              [config.tableName, orgId],
            ],
            logMessage: `[useResourceActions] Optimistic delete success for ${config.tableName} id: ${id} (already deleted)`,
            payload: {
              success: true,
              message: `${config.displayName} deleted permanently`,
              id,
            },
          });
        }

        return {
          success: true,
          message: `${config.displayName} deleted permanently`,
          id: data.id
        };
      }

      // For non-multi-tenant tables, use direct table deletion
      // First get the record we're about to delete for the response
      const { data: recordToDelete, error: fetchError } = await supabase
        .from(config.tableName)
        .select('id')
        .eq('id', id)
        .eq('org_id', orgId)
        .single();

      if (fetchError || !recordToDelete) {
        return handleResourceNotFound({
          queryClient,
          queryKeys: [
            [config.tableName],
            [config.tableName, orgId],
          ],
          logMessage: `[useResourceActions] Optimistic delete success for ${config.tableName} id: ${id} (already deleted)`,
          payload: {
            success: true,
            message: `${config.displayName} deleted permanently`,
            id,
          },
        });
      }

      // Now perform the deletion
      const { error } = await supabase
        .from(config.tableName)
        .delete()
        .eq('id', id)
        .eq('org_id', orgId);

      if (error) {
        console.error(`[useResourceActions] Delete error for ${config.tableName}:`, error);
        throw new Error(error.message || `Failed to delete ${config.displayName.toLowerCase()}`);
      }

      return {
        success: true,
        message: `${config.displayName} deleted permanently`,
        id: recordToDelete.id
      };
    },
    onSuccess: (result) => {
      invalidateQueryKeys(queryClient, [
        [config.tableName],
        [config.tableName, orgId],
      ]);
      toast.success(result.message);
    },
    onError: (error: Error) => {
      console.error(`[useResourceActions] Delete mutation error:`, error);
      toast.error(error.message || `Failed to delete ${config.displayName.toLowerCase()}`);
    }
  });

  /**
   * Bulk Archive Resources
   *
   * Archives multiple resources in a single transaction
   */
  const bulkArchiveResources = useMutation({
    mutationFn: async ({ ids, reason }: BulkArchiveParams): Promise<BulkActionResult> => {
      if (!orgId) {
        throw new Error('Organization not found');
      }

      if (ids.length === 0) {
        throw new Error('No resources selected for archiving');
      }

      const updateData: Record<string, any> = {
        archived_at: new Date().toISOString(),
        archived_by: identity?.user.id,
        updated_at: new Date().toISOString()
      };

      if (reason) {
        updateData.archive_reason = reason;
      }

      const { data, error } = await supabase
        .from(config.tableName)
        .update(updateData)
        .in('id', ids)
        .eq('org_id', orgId) // Explicit org_id check for security
        .select('id');

      if (error) {
        console.error(`[useResourceActions] Bulk archive error for ${config.tableName}:`, error);
        throw new Error(error.message || `Failed to archive ${config.displayName.toLowerCase()}s`);
      }

      const successCount = data?.length || 0;
      const failedIds = ids.filter(id => !data?.some(item => item.id === id));

      return {
        success: successCount > 0,
        message: `${successCount} ${config.displayName.toLowerCase()}${successCount === 1 ? '' : 's'} archived successfully`,
        count: successCount,
        failed: failedIds
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [config.tableName] });
      queryClient.invalidateQueries({ queryKey: [config.tableName, orgId] });

      toast.success(result.message);

      if (result.failed.length > 0) {
        toast.warning(`${result.failed.length} items could not be archived`);
      }
    },
    onError: (error: Error) => {
      console.error(`[useResourceActions] Bulk archive mutation error:`, error);
      toast.error(error.message || `Failed to archive ${config.displayName.toLowerCase()}s`);
    }
  });

  return {
    // Individual actions
    archive: archiveResource,
    restore: restoreResource,
    delete: deleteResource,

    // Bulk actions
    bulkArchive: bulkArchiveResources,

    // Status checks
    isArchiving: archiveResource.isPending,
    isRestoring: restoreResource.isPending,
    isDeleting: deleteResource.isPending,
    isBulkArchiving: bulkArchiveResources.isPending,

    // Combined loading state
    isLoading: archiveResource.isPending || restoreResource.isPending ||
               deleteResource.isPending || bulkArchiveResources.isPending
  };
}

/**
 * Convenience hooks for specific resource types
 * Provides pre-configured hooks for common resources
 */

export function useCampaignActions() {
  return useResourceActions({
    type: 'campaign',
    tableName: 'campaigns',
    displayName: 'Campaign',
    pluralDisplayName: 'Campaigns',
    apiBasePath: '/api/v1/campaigns' // Legacy - not used in Database-First
  });
}

export function usePersonaActions() {
  return useResourceActions({
    type: 'persona', // Nuclear migration: changed from 'synthetic_persona'
    tableName: 'agent_outputs', // Nuclear migration: personas now in agent_outputs
    displayName: 'Persona',
    pluralDisplayName: 'Personas',
    apiBasePath: '/api/v1/personas' // Legacy - not used in Database-First
  });
}

export function useMarketingStrategyActions() {
  return useResourceActions({
    type: 'marketing_strategy',
    tableName: 'marketing_strategies',
    displayName: 'Marketing Strategy',
    pluralDisplayName: 'Marketing Strategies',
    apiBasePath: '/api/v1/marketing-strategies' // Legacy - not used in Database-First
  });
}

export function useAgentOutputActions() {
  return useResourceActions({
    type: 'agent_output',
    tableName: 'agent_outputs',
    displayName: 'Output',
    pluralDisplayName: 'Outputs',
    apiBasePath: '/api/v1/outputs' // Legacy - not used in Database-First
  });
}

/**
 * Security Verification Function
 *
 * Validates that RLS policies are properly configured for a table
 * Used in development/testing to ensure security boundaries
 */
export async function validateTableSecurity(tableName: string, orgId: string): Promise<boolean> {
  try {
    // Attempt to query with explicit org_id filter
    const { error } = await supabase
      .from(tableName)
      .select('id, org_id')
      .eq('org_id', orgId)
      .limit(1);

    if (error) {
      console.error(`[validateTableSecurity] Error querying ${tableName}:`, error);
      return false;
    }

    // Check that RLS is working by ensuring we can't see other orgs' data
    const { data: crossOrgData } = await supabase
      .from(tableName)
      .select('id, org_id')
      .neq('org_id', orgId)
      .limit(1);

    // If we can see other orgs' data, RLS is not working properly
    if (crossOrgData && crossOrgData.length > 0) {
      console.error(`[validateTableSecurity] RLS breach detected on ${tableName}:`, crossOrgData);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`[validateTableSecurity] Security validation failed for ${tableName}:`, error);
    return false;
  }
}
