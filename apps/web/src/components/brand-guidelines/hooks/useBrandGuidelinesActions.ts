import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useUserIdentity } from '@/hooks/data/useUserIdentity';
import { useClientBySlug } from '@/hooks/data/useClients';
import { useClientContext } from '@/contexts/ClientContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useDeleteConfirmation, useArchiveConfirmation } from '@/hooks/useConfirmDialog';
import type { BrandGuideline } from './useBrandGuidelines';

interface UseBrandGuidelinesActionsOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useBrandGuidelinesActions({ onSuccess, onError }: UseBrandGuidelinesActionsOptions = {}) {
  const [saving, setSaving] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Get org context and client context (for agency users)
  const { data: identity } = useUserIdentity();
  const { clientSlug: clientSlugBranded } = useClientContext();
  const clientSlug = clientSlugBranded || undefined;
  const { data: client } = useClientBySlug(clientSlug);
  const queryClient = useQueryClient();

  const orgId = identity?.organization?.id;
  const isAgency = identity?.organization?.type === 'AGENCY';
  const clientId = isAgency ? client?.id : null;

  // Confirmation dialogs
  const { confirmDelete, dialogProps: deleteDialogProps } = useDeleteConfirmation();
  const { confirmArchive, dialogProps: archiveDialogProps } = useArchiveConfirmation();

  /**
   * Archive Handler - Uses router function for multi-schema support
   */
  const openArchiveDialog = async (item: BrandGuideline) => {
    const result = await confirmArchive({
      resourceName: item.name || 'Brand Guidelines',
      resourceType: 'Brand Guidelines'
    });

    if (result.confirmed && result.reason) {
      setIsArchiving(true);
      try {
        console.log('[useBrandGuidelinesActions] Archiving via router function:', {
          orgId,
          clientId,
          guidelineId: item.id,
          reason: result.reason
        });

        const { data, error } = await supabase.rpc('archive_brand_guideline_routed', {
          p_org_id: orgId!,
          p_client_id: clientId,
          p_guideline_id: item.id,
          p_reason: result.reason
        });

        if (error) {
          console.error('[useBrandGuidelinesActions] Archive error:', error);
          throw new Error(error.message || 'Failed to archive brand guidelines');
        }

        console.log('[useBrandGuidelinesActions] Archive successful:', data);
        toast.success('Brand Guidelines archived successfully');

        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ['brand_guidelines'] });
        queryClient.invalidateQueries({ queryKey: ['brand_guidelines', orgId] });

        onSuccess?.();
      } catch (error: any) {
        console.error('[useBrandGuidelinesActions] Archive failed:', error);
        toast.error(error.message || 'Failed to archive brand guidelines');
        onError?.(error);
      } finally {
        setIsArchiving(false);
      }
    }
  };

  /**
   * Delete Handler - Uses router function for multi-schema support
   */
  const openDeleteConfirm = async (item: BrandGuideline) => {
    const confirmed = await confirmDelete({
      title: `Delete ${item.name || 'Brand Guidelines'}?`,
      description: 'This action cannot be undone. The brand guidelines and all associated data will be permanently deleted.',
      confirmText: 'Delete Brand Guidelines',
      itemName: item.name || 'Brand Guidelines'
    });

    if (confirmed) {
      setIsDeleting(true);
      try {
        console.log('[useBrandGuidelinesActions] Deleting via router function:', {
          orgId,
          clientId,
          guidelineId: item.id
        });

        const { data, error } = await supabase.rpc('delete_brand_guideline_routed', {
          p_org_id: orgId!,
          p_client_id: clientId,
          p_guideline_id: item.id
        });

        if (error) {
          console.error('[useBrandGuidelinesActions] Delete error:', error);
          throw new Error(error.message || 'Failed to delete brand guidelines');
        }

        console.log('[useBrandGuidelinesActions] Delete successful:', data);
        toast.success('Brand Guidelines deleted successfully');

        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ['brand_guidelines'] });
        queryClient.invalidateQueries({ queryKey: ['brand_guidelines', orgId] });

        onSuccess?.();
      } catch (error: any) {
        console.error('[useBrandGuidelinesActions] Delete failed:', error);
        toast.error(error.message || 'Failed to delete brand guidelines');
        onError?.(error);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  /**
   * Restore Handler - Uses router function for multi-schema support
   */
  const handleRestore = async (item: BrandGuideline) => {
    setIsRestoring(true);
    try {
      console.log('[useBrandGuidelinesActions] Restoring via router function:', {
        orgId,
        clientId,
        guidelineId: item.id
      });

      const { data, error } = await supabase.rpc('restore_brand_guideline_routed', {
        p_org_id: orgId!,
        p_client_id: clientId,
        p_guideline_id: item.id
      });

      if (error) {
        console.error('[useBrandGuidelinesActions] Restore error:', error);
        throw new Error(error.message || 'Failed to restore brand guidelines');
      }

      console.log('[useBrandGuidelinesActions] Restore successful:', data);
      toast.success('Brand Guidelines restored successfully');

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['brand_guidelines'] });
      queryClient.invalidateQueries({ queryKey: ['brand_guidelines', orgId] });

      onSuccess?.();
    } catch (error: any) {
      console.error('[useBrandGuidelinesActions] Restore failed:', error);
      toast.error(error.message || 'Failed to restore brand guidelines');
      onError?.(error);
    } finally {
      setIsRestoring(false);
    }
  };

  /**
   * Save Handler (Insert/Update) - Uses router functions for multi-schema support
   */
  const handleSave = async (editedGuideline: BrandGuideline) => {
    setSaving(true);
    try {
      // Validate org context
      if (!orgId) {
        throw new Error('Organization not found');
      }

      // Validate that at least one section has content
      const hasContent = Object.values(editedGuideline.guidelines).some(section => {
        if (typeof section === 'object' && section !== null) {
          return Object.values(section).some(subsection => {
            if (typeof subsection === 'object' && subsection !== null) {
              return Object.values(subsection).some(value =>
                value !== undefined && value !== null && value !== '' &&
                (!Array.isArray(value) || value.length > 0)
              );
            }
            return subsection !== undefined && subsection !== null && subsection !== '';
          });
        }
        return section !== undefined && section !== null && section !== '';
      });

      if (!hasContent) {
        toast.error("At least one guideline field must be filled out");
        return false;
      }

      let result;
      if (editedGuideline.id) {
        // UPDATE operation - Use router function
        console.log('[useBrandGuidelinesActions] Updating via router function:', {
          orgId,
          clientId,
          guidelineId: editedGuideline.id
        });

        const { data, error } = await supabase.rpc('update_brand_guideline_routed', {
          p_org_id: orgId,
          p_client_id: clientId,
          p_guideline_id: editedGuideline.id,
          p_name: editedGuideline.name || null,
          p_description: editedGuideline.description || null,
          p_guidelines: editedGuideline.guidelines,
          p_is_default: editedGuideline.is_default || false,
          p_campaign_id: editedGuideline.campaign_id || null
        });

        if (error) {
          console.error('[useBrandGuidelinesActions] Update error:', error);
          throw new Error(error.message || 'Failed to update brand guidelines');
        }
        result = data;
      } else {
        // INSERT operation - Use router function
        console.log('[useBrandGuidelinesActions] Creating via router function:', {
          orgId,
          clientId
        });

        const { data, error } = await supabase.rpc('save_brand_guideline_routed', {
          p_org_id: orgId,
          p_client_id: clientId,
          p_name: editedGuideline.name || null,
          p_description: editedGuideline.description || null,
          p_guidelines: editedGuideline.guidelines,
          p_is_default: editedGuideline.is_default || false,
          p_campaign_id: editedGuideline.campaign_id || null
        });

        if (error) {
          console.error('[useBrandGuidelinesActions] Create error:', error);
          throw new Error(error.message || 'Failed to create brand guidelines');
        }
        result = data;
      }

      console.log('[useBrandGuidelinesActions] Save successful:', result);
      toast.success(editedGuideline.id ? "Brand guidelines updated" : "Brand guidelines created");

      // Invalidate query cache to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['brand_guidelines'] });
      queryClient.invalidateQueries({ queryKey: ['brand_guidelines', orgId] });

      onSuccess?.();
      return true;
    } catch (error) {
      console.error('[useBrandGuidelinesActions] Save failed:', error);
      toast.error(error instanceof Error ? error.message : "Failed to save brand guidelines");
      onError?.(error as Error);
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    // Save actions
    handleSave,
    saving,

    // Archive/restore/delete actions
    openArchiveDialog,
    openDeleteConfirm,
    handleRestore,

    // Dialog props for unified confirmation dialogs
    deleteDialogProps,
    archiveDialogProps,

    // Mutation states
    isArchiving,
    isDeleting,
    isRestoring,
  };
}
