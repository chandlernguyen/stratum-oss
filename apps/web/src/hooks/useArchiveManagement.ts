import { useState, useCallback } from 'react';

export interface ArchiveableResource {
  id: string;
  archived_at?: string;
  archived_reason?: string;
  archived_by?: string;
}

export interface UseArchiveManagementConfig {
  resourceType: string;
  onArchive?: (resourceId: string, reason?: string) => Promise<boolean>;
  onRestore?: (resourceId: string) => Promise<boolean>;
}

export interface UseArchiveManagementReturn {
  showArchived: boolean;
  setShowArchived: (show: boolean) => void;
  toggleArchived: () => void;
  isArchived: (resource: ArchiveableResource) => boolean;
  archiveResource: (resourceId: string, reason?: string) => Promise<boolean>;
  restoreResource: (resourceId: string) => Promise<boolean>;
  filterByArchiveState: <T extends ArchiveableResource>(resources: T[]) => T[];
}

/**
 * Shared hook for managing archive state and operations
 * Provides consistent archive/restore functionality across all components
 */
export function useArchiveManagement(config: UseArchiveManagementConfig): UseArchiveManagementReturn {
  const [showArchived, setShowArchived] = useState(false);

  const toggleArchived = useCallback(() => {
    setShowArchived(prev => !prev);
  }, []);

  const isArchived = useCallback((resource: ArchiveableResource): boolean => {
    return !!resource.archived_at;
  }, []);

  const filterByArchiveState = useCallback(<T extends ArchiveableResource>(resources: T[]): T[] => {
    return resources.filter(resource => {
      const archived = isArchived(resource);
      return showArchived ? archived : !archived;
    });
  }, [showArchived, isArchived]);

  const archiveResource = useCallback(async (resourceId: string, reason?: string): Promise<boolean> => {
    if (config.onArchive) {
      try {
        const success = await config.onArchive(resourceId, reason);
        if (success) {
          console.log(`${config.resourceType} archived successfully:`, resourceId);
        }
        return success;
      } catch (error) {
        console.error(`Error archiving ${config.resourceType}:`, error);
        return false;
      }
    }
    console.warn(`No archive handler provided for ${config.resourceType}`);
    return false;
  }, [config.onArchive, config.resourceType]);

  const restoreResource = useCallback(async (resourceId: string): Promise<boolean> => {
    if (config.onRestore) {
      try {
        const success = await config.onRestore(resourceId);
        if (success) {
          console.log(`${config.resourceType} restored successfully:`, resourceId);
        }
        return success;
      } catch (error) {
        console.error(`Error restoring ${config.resourceType}:`, error);
        return false;
      }
    }
    console.warn(`No restore handler provided for ${config.resourceType}`);
    return false;
  }, [config.onRestore, config.resourceType]);

  return {
    showArchived,
    setShowArchived,
    toggleArchived,
    isArchived,
    archiveResource,
    restoreResource,
    filterByArchiveState
  };
}