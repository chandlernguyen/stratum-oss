import { useConfirmDialog } from './useConfirmDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';

/**
 * Specialized Archive Confirmation Hook
 *
 * Pre-configured confirmation dialog for archive operations.
 * Includes optional reason input and reversibility message.
 *
 * @example
 * ```tsx
 * import { useArchiveConfirmation } from '@/hooks/useArchiveConfirmation';
 *
 * function MyComponent() {
 *   const { confirmArchive, ArchiveDialog } = useArchiveConfirmation();
 *
 *   const handleArchive = async (item: any) => {
 *     const reason = await confirmArchive({
 *       id: item.id,
 *       name: item.name,
 *       displayName: 'Campaign'
 *     });
 *
 *     if (reason !== null) {
 *       // User confirmed (reason may be empty string or filled)
 *       await archiveItem(item.id, reason || 'User archived');
 *     }
 *   };
 *
 *   return (
 *     <>
 *       <button onClick={() => handleArchive(item)}>Archive</button>
 *       <ArchiveDialog />
 *     </>
 *   );
 * }
 * ```
 */

interface ArchiveConfirmationItem {
  id: string;
  name?: string;
  title?: string;
  displayName?: string; // e.g., "Campaign", "Persona", "Strategy"
}

interface UseArchiveConfirmationReturn {
  /**
   * Opens archive confirmation dialog with optional reason input
   * @returns Promise<string | null> - reason string if confirmed, null if canceled
   */
  confirmArchive: (item: ArchiveConfirmationItem) => Promise<string | null>;

  /**
   * Dialog component to render
   */
  ArchiveDialog: React.ComponentType;
}

/**
 * Hook providing pre-configured archive confirmation with reason input
 */
export function useArchiveConfirmation(): UseArchiveConfirmationReturn {
  const { openArchiveDialog, dialogProps } = useConfirmDialog();

  const confirmArchive = async (item: ArchiveConfirmationItem): Promise<string | null> => {
    const itemName = item.title || item.name || 'this item';
    const displayName = item.displayName || 'item';

    return await openArchiveDialog({
      title: `Archive ${displayName}?`,
      description: `This will remove "${itemName}" from active views but preserve all data. You can restore it anytime from the archived items view.`,
      confirmText: `Archive ${displayName}`,
      cancelText: 'Cancel',
      itemName
    });
  };

  const ArchiveDialog = () => <ConfirmDialog {...dialogProps} />;

  return {
    confirmArchive,
    ArchiveDialog
  };
}
