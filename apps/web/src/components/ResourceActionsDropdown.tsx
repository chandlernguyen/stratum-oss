import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreVertical,
  ExternalLink,
  Edit,
  Copy,
  Archive,
  RotateCcw,
  Trash2,
  type LucideIcon
} from 'lucide-react';
import type { ResourceConfig } from '@/config/resource-configs';
import { useResourceActions } from '@/hooks/data/useResourceActions';
import { useDeleteConfirmation } from '@/hooks/useDeleteConfirmation';
import { useArchiveConfirmation } from '@/hooks/useArchiveConfirmation';

export interface CustomAction {
  label: string;
  icon: LucideIcon;
  action: (item: any) => void;
  className?: string;
  requiresConfirm?: boolean;
  showWhen?: (item: any) => boolean;
}

export interface ResourceActionsDropdownProps {
  item: any;
  config: ResourceConfig;
  
  // Action handlers
  onArchive?: (item: any) => void;
  onRestore?: (item: any) => void;
  onDelete?: (item: any) => void;
  onView?: (item: any) => void;
  onEdit?: (item: any) => void;
  onCopy?: (item: any) => void;
  
  // Action visibility
  showArchive?: boolean;
  showRestore?: boolean;
  showDelete?: boolean;
  showView?: boolean;
  showEdit?: boolean;
  showCopy?: boolean;
  
  // Custom actions
  customActions?: CustomAction[];
  
  // Styling
  size?: 'sm' | 'default';
  variant?: 'ghost' | 'outline' | 'secondary';
  className?: string;
  
  // Accessibility
  'aria-label'?: string;
}

export function ResourceActionsDropdown({
  item,
  config,
  onArchive,
  onRestore,
  onDelete,
  onView,
  onEdit,
  onCopy,
  showArchive = true,
  showRestore = true,
  showDelete = true,
  showView = false,
  showEdit = false,
  showCopy = false,
  customActions = [],
  size = 'default',
  variant = 'ghost',
  className = '',
  'aria-label': ariaLabel,
  ...props
}: ResourceActionsDropdownProps) {
  const { t } = useTranslation(['common']);

  // Database-First resource actions
  const {
    archive,
    restore,
    delete: deleteResource,
    isArchiving,
    isRestoring,
    isDeleting,
    isLoading
  } = useResourceActions(config);

  // Unified confirmation dialogs
  const { confirmDelete, DeleteDialog } = useDeleteConfirmation();
  const { confirmArchive, ArchiveDialog } = useArchiveConfirmation();

  // Helper function to check if item is archived
  const isArchived = item && item.archived_at !== null && item.archived_at !== undefined;
  
  // Get item name for display (try common name fields)
  const getItemName = (item: any): string => {
    return item.title || item.name || item.session_title || item.first_message || `${config.displayName} ${item.id}`;
  };

  const itemName = getItemName(item);

  // Filter custom actions based on showWhen condition
  const visibleCustomActions = customActions.filter(action => 
    !action.showWhen || action.showWhen(item)
  );

  // Determine if we have any actions to show
  const hasStandardActions = showView || showEdit || showCopy || 
    (showArchive && !isArchived) || (showRestore && isArchived) || showDelete;
  const hasActions = hasStandardActions || visibleCustomActions.length > 0;

  if (!hasActions) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size === 'sm' ? 'icon' : 'icon'}
          className={`h-8 w-8 ${className}`}
          onClick={(e) => e.stopPropagation()}
          aria-label={ariaLabel || t('resourceActions.actionsFor', { name: itemName })}
          {...props}
        >
          <MoreVertical className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        {/* View Action */}
        {showView && onView && (
          <DropdownMenuItem onClick={(e) => {
            e.stopPropagation();
            onView(item);
          }}>
            <ExternalLink className="w-4 h-4 mr-2" />
            {t('resourceActions.view', { name: config.displayName })}
          </DropdownMenuItem>
        )}

        {/* Edit Action - only show for non-archived items */}
        {showEdit && onEdit && !isArchived && (
          <DropdownMenuItem onClick={(e) => {
            e.stopPropagation();
            onEdit(item);
          }}>
            <Edit className="w-4 h-4 mr-2" />
            {t('resourceActions.edit', { name: config.displayName })}
          </DropdownMenuItem>
        )}

        {/* Copy Action */}
        {showCopy && onCopy && (
          <DropdownMenuItem onClick={(e) => {
            e.stopPropagation();
            onCopy(item);
          }}>
            <Copy className="w-4 h-4 mr-2" />
            {t('resourceActions.copyContent')}
          </DropdownMenuItem>
        )}
        
        {/* Custom Actions */}
        {visibleCustomActions.map((action, index) => (
          <DropdownMenuItem 
            key={`custom-${index}`}
            className={action.className}
            onClick={(e) => {
              e.stopPropagation();
              action.action(item);
            }}
          >
            <action.icon className="w-4 h-4 mr-2" />
            {action.label}
          </DropdownMenuItem>
        ))}
        
        {/* Separator before archive/delete actions */}
        {(hasStandardActions && visibleCustomActions.length > 0) ||
         ((showArchive && !isArchived) || (showRestore && isArchived) || showDelete) ? (
          <DropdownMenuSeparator />
        ) : null}
        
        {/* Restore Action - only show for archived items */}
        {showRestore && isArchived && (
          <DropdownMenuItem
            className="text-green-600 focus:text-green-600"
            disabled={isRestoring || isLoading}
            onClick={async (e) => {
              e.stopPropagation();

              // If custom onRestore handler is provided, use it directly (for schema routing)
              if (onRestore) {
                onRestore(item);
                return;
              }

              // Otherwise, use default generic restore behavior
              try {
                await restore.mutateAsync({ id: item.id });
              } catch (error) {
                // Error handling is done in the mutation
                console.error('[ResourceActionsDropdown] Restore failed:', error);
              }
            }}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {isRestoring ? t('resourceActions.restoring') : t('resourceActions.restore', { name: config.displayName })}
          </DropdownMenuItem>
        )}

        {/* Archive Action - only show for non-archived items */}
        {showArchive && !isArchived && (
          <DropdownMenuItem
            className="text-yellow-600 focus:text-yellow-600"
            disabled={isArchiving || isLoading}
            onClick={async (e) => {
              e.stopPropagation();

              // If custom onArchive handler is provided, use it directly (for schema routing)
              if (onArchive) {
                onArchive(item);
                return;
              }

              // Otherwise, use default generic archive behavior
              // Show confirmation dialog with reason input
              const reason = await confirmArchive({
                id: item.id,
                name: itemName,
                displayName: config.displayName
              });

              // User canceled
              if (reason === null) return;

              try {
                await archive.mutateAsync({
                  id: item.id,
                  reason: reason || 'User archived'
                });
              } catch (error) {
                // Error handling is done in the mutation
                console.error('[ResourceActionsDropdown] Archive failed:', error);
              }
            }}
          >
            <Archive className="w-4 h-4 mr-2" />
            {isArchiving ? t('resourceActions.archiving') : t('resourceActions.archive', { name: config.displayName })}
          </DropdownMenuItem>
        )}

        {/* Delete Action */}
        {showDelete && (
          <DropdownMenuItem
            className="text-red-600 focus:text-red-600"
            disabled={isDeleting || isLoading}
            onClick={async (e) => {
              e.stopPropagation();

              // If custom onDelete handler is provided, use it directly (for schema routing)
              if (onDelete) {
                onDelete(item);
                return;
              }

              // Otherwise, use default generic delete behavior
              // Show confirmation dialog with archive tip
              const confirmed = await confirmDelete({
                id: item.id,
                name: itemName,
                isArchived
              });

              // User canceled
              if (!confirmed) return;

              try {
                await deleteResource.mutateAsync({ id: item.id, permanent: true });
              } catch (error) {
                // Error handling is done in the mutation
                console.error('[ResourceActionsDropdown] Delete failed:', error);
              }
            }}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {isDeleting ? t('resourceActions.deleting') : t('confirm.delete.confirmButton')}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>

      {/* Confirmation Dialogs */}
      <DeleteDialog />
      <ArchiveDialog />
    </DropdownMenu>
  );
}