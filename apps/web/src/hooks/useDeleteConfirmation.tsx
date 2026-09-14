import { useConfirmDialog } from './useConfirmDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';

/**
 * Specialized Delete Confirmation Hook
 *
 * Pre-configured confirmation dialog for delete operations.
 * Automatically shows archive tip for non-archived items.
 *
 * @example
 * ```tsx
 * import { useDeleteConfirmation } from '@/hooks/useDeleteConfirmation';
 *
 * function MyComponent() {
 *   const { confirmDelete, DeleteDialog } = useDeleteConfirmation();
 *
 *   const handleDelete = async (item: any) => {
 *     const confirmed = await confirmDelete({
 *       id: item.id,
 *       name: item.name,
 *       isArchived: !!item.archived_at
 *     });
 *
 *     if (confirmed) {
 *       // Proceed with deletion
 *       await deleteItem(item.id);
 *     }
 *   };
 *
 *   return (
 *     <>
 *       <button onClick={() => handleDelete(item)}>Delete</button>
 *       <DeleteDialog />
 *     </>
 *   );
 * }
 * ```
 */

interface DeleteConfirmationItem {
  id: string;
  name?: string;
  title?: string;
  isArchived?: boolean;
}

interface UseDeleteConfirmationReturn {
  /**
   * Opens delete confirmation dialog and returns promise
   * @returns Promise<boolean> - true if confirmed, false if canceled
   */
  confirmDelete: (item: DeleteConfirmationItem) => Promise<boolean>;

  /**
   * Dialog component to render
   */
  DeleteDialog: React.ComponentType;
}

/**
 * Hook providing pre-configured delete confirmation
 */
export function useDeleteConfirmation(): UseDeleteConfirmationReturn {
  const { openDialog, dialogProps } = useConfirmDialog();

  const confirmDelete = async (item: DeleteConfirmationItem): Promise<boolean> => {
    const itemName = item.title || item.name || 'this item';
    const isArchived = item.isArchived || false;

    return await openDialog({
      variant: 'delete',
      title: 'Delete Permanently?',
      description: isArchived
        ? `This item is already archived. Deleting it will permanently remove "${itemName}" from the system. This action cannot be undone.`
        : `This will permanently delete "${itemName}" and remove all associated data. This action cannot be undone.`,
      confirmText: 'Delete Permanently',
      cancelText: 'Cancel',
      itemName,
      isArchived,
      showArchiveTip: true
    });
  };

  const DeleteDialog = () => <ConfirmDialog {...dialogProps} />;

  return {
    confirmDelete,
    DeleteDialog
  };
}
