import { useState, useCallback, useRef } from 'react';
import type { ConfirmDialogConfig } from '@/components/ConfirmDialog';

/**
 * Unified Confirmation Dialog Hook
 *
 * Provides a promise-based API for confirmation dialogs.
 * Replaces window.confirm() with a professional, themeable dialog.
 *
 * @example
 * ```tsx
 * import { useConfirmDialog } from '@/hooks/useConfirmDialog';
 * import { ConfirmDialog } from '@/components/ConfirmDialog';
 *
 * function MyComponent() {
 *   const { openDialog, dialogProps } = useConfirmDialog();
 *
 *   const handleDelete = async () => {
 *     const confirmed = await openDialog({
 *       variant: 'delete',
 *       title: 'Delete Item?',
 *       description: 'This action cannot be undone.',
 *       itemName: 'My Item'
 *     });
 *
 *     if (confirmed) {
 *       // Proceed with deletion
 *     }
 *   };
 *
 *   return (
 *     <>
 *       <button onClick={handleDelete}>Delete</button>
 *       <ConfirmDialog {...dialogProps} />
 *     </>
 *   );
 * }
 * ```
 */

interface ConfirmDialogData {
  reason?: string;
}

interface UseConfirmDialogReturn {
  /**
   * Opens the confirmation dialog and returns a promise that resolves
   * when the user confirms (true) or cancels (false)
   */
  openDialog: (config: ConfirmDialogConfig) => Promise<boolean>;

  /**
   * Opens the dialog for archive actions and returns the reason if confirmed,
   * or null if canceled
   */
  openArchiveDialog: (config: Omit<ConfirmDialogConfig, 'variant' | 'showReasonInput'>) => Promise<string | null>;

  /**
   * Props to spread onto the ConfirmDialog component
   */
  dialogProps: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (data?: ConfirmDialogData) => void;
    variant: ConfirmDialogConfig['variant'];
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    itemName?: string;
    isArchived?: boolean;
    showArchiveTip?: boolean;
    showReasonInput?: boolean;
    loading: boolean;
  };

  /**
   * Manually close the dialog (auto-closes on confirm/cancel)
   */
  closeDialog: () => void;

  /**
   * Current dialog configuration
   */
  config: ConfirmDialogConfig | null;
}

/**
 * Hook for managing confirmation dialogs with promise-based API
 */
export function useConfirmDialog(): UseConfirmDialogReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<ConfirmDialogConfig | null>(null);

  // Store resolve function for promise-based API
  // Using any here since the actual type depends on which dialog was opened
  const resolveRef = useRef<((value: any) => void) | null>(null);

  /**
   * Opens a standard confirmation dialog
   */
  const openDialog = useCallback((dialogConfig: ConfirmDialogConfig): Promise<boolean> => {
    setConfig(dialogConfig);
    setIsOpen(true);
    setLoading(false);

    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  /**
   * Opens an archive dialog with reason input
   */
  const openArchiveDialog = useCallback((
    dialogConfig: Omit<ConfirmDialogConfig, 'variant' | 'showReasonInput'>
  ): Promise<string | null> => {
    const archiveConfig: ConfirmDialogConfig = {
      ...dialogConfig,
      variant: 'archive',
      showReasonInput: true
    };

    setConfig(archiveConfig);
    setIsOpen(true);
    setLoading(false);

    return new Promise<string | null>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  /**
   * Handle confirmation
   */
  const handleConfirm = useCallback(async (data?: ConfirmDialogData) => {
    if (!resolveRef.current) return;

    try {
      setLoading(true);

      // For archive dialogs with reason input, return the reason
      if (config?.variant === 'archive' && config?.showReasonInput) {
        resolveRef.current(data?.reason || '');
      } else {
        // For all other dialogs, return true
        resolveRef.current(true);
      }
    } finally {
      setLoading(false);
      setIsOpen(false);
      resolveRef.current = null;
    }
  }, [config]);

  /**
   * Handle cancellation
   */
  const handleCancel = useCallback(() => {
    if (resolveRef.current) {
      // For archive dialogs with reason, return null
      // For standard dialogs, return false
      if (config?.variant === 'archive' && config?.showReasonInput) {
        resolveRef.current(null);
      } else {
        resolveRef.current(false);
      }
      resolveRef.current = null;
    }
    setIsOpen(false);
    setLoading(false);
  }, [config]);

  /**
   * Close dialog programmatically
   */
  const closeDialog = useCallback(() => {
    handleCancel();
  }, [handleCancel]);

  return {
    openDialog,
    openArchiveDialog,
    closeDialog,
    config,
    dialogProps: {
      open: isOpen,
      onOpenChange: (open: boolean) => {
        if (!open) {
          handleCancel();
        }
      },
      onConfirm: handleConfirm,
      variant: config?.variant || 'info',
      title: config?.title || '',
      description: config?.description || '',
      confirmText: config?.confirmText,
      cancelText: config?.cancelText,
      itemName: config?.itemName,
      isArchived: config?.isArchived,
      showArchiveTip: config?.showArchiveTip,
      showReasonInput: config?.showReasonInput,
      loading
    }
  };
}

// ===========================
// Convenience Hooks
// ===========================

/**
 * Pre-configured hook for delete confirmations
 *
 * @example
 * ```tsx
 * import { useDeleteConfirmation } from '@/hooks/useConfirmDialog';
 * import { ConfirmDialog } from '@/components/ConfirmDialog';
 *
 * function MyComponent() {
 *   const { confirmDelete, dialogProps } = useDeleteConfirmation();
 *
 *   const handleDelete = async () => {
 *     const confirmed = await confirmDelete({
 *       title: 'Delete Item?',
 *       description: 'This action cannot be undone.',
 *       itemName: 'My Item'
 *     });
 *     if (confirmed) {
 *       // Proceed with deletion
 *     }
 *   };
 *
 *   return (
 *     <>
 *       <button onClick={handleDelete}>Delete</button>
 *       <ConfirmDialog {...dialogProps} />
 *     </>
 *   );
 * }
 * ```
 */
export function useDeleteConfirmation() {
  const { openDialog, dialogProps } = useConfirmDialog();

  const confirmDelete = useCallback((config: Omit<ConfirmDialogConfig, 'variant'>) => {
    return openDialog({
      ...config,
      variant: 'delete',
      confirmText: config.confirmText || 'Delete',
      showArchiveTip: config.showArchiveTip !== false // Show archive tip by default
    });
  }, [openDialog]);

  return { confirmDelete, dialogProps };
}

/**
 * Pre-configured hook for archive confirmations with reason input
 *
 * @example
 * ```tsx
 * import { useArchiveConfirmation } from '@/hooks/useConfirmDialog';
 * import { ConfirmDialog } from '@/components/ConfirmDialog';
 *
 * function MyComponent() {
 *   const { confirmArchive, dialogProps } = useArchiveConfirmation();
 *
 *   const handleArchive = async () => {
 *     const result = await confirmArchive({
 *       resourceName: 'My Item',
 *       resourceType: 'Campaign'
 *     });
 *     if (result.confirmed && result.reason) {
 *       // Proceed with archiving
 *     }
 *   };
 *
 *   return (
 *     <>
 *       <button onClick={handleArchive}>Archive</button>
 *       <ConfirmDialog {...dialogProps} />
 *     </>
 *   );
 * }
 * ```
 */
export function useArchiveConfirmation() {
  const { openArchiveDialog, dialogProps } = useConfirmDialog();

  const confirmArchive = useCallback(async (config: {
    resourceName: string;
    resourceType?: string;
    title?: string;
    description?: string;
  }) => {
    const reason = await openArchiveDialog({
      title: config.title || `Archive ${config.resourceType || 'Item'}`,
      description: config.description || `Provide a reason for archiving "${config.resourceName}".`,
      itemName: config.resourceName,
      confirmText: 'Archive'
    });

    return {
      confirmed: reason !== null,
      reason: reason || undefined
    };
  }, [openArchiveDialog]);

  return { confirmArchive, dialogProps };
}
