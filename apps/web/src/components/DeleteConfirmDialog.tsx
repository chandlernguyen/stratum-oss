/**
 * @deprecated Use ConfirmDialog with useDeleteConfirmation hook instead
 *
 * This component is deprecated in favor of the unified confirmation system.
 *
 * Migration guide:
 * ```tsx
 * // Old pattern:
 * import { DeleteConfirmDialog } from '@/components/DeleteConfirmDialog';
 * const [open, setOpen] = useState(false);
 * <DeleteConfirmDialog open={open} onOpenChange={setOpen} onConfirm={handleDelete} />
 *
 * // New pattern:
 * import { useDeleteConfirmation } from '@/hooks/useDeleteConfirmation';
 * const { confirmDelete, DeleteDialog } = useDeleteConfirmation();
 * const confirmed = await confirmDelete({ id, name, isArchived });
 * if (confirmed) { handleDelete(); }
 * <DeleteDialog />
 * ```
 *
 * Scheduled for removal: Next major version
 */

import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AlertTriangle } from "lucide-react"

interface DeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  title?: string
  description?: string
  itemName?: string
  isArchived?: boolean
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  itemName,
  isArchived = false
}: DeleteConfirmDialogProps) {
  const { t } = useTranslation(['common']);

  const defaultTitle = t('deleteConfirmDialog.title');
  const defaultDescription = isArchived
    ? t('deleteConfirmDialog.archivedDescription', { itemName: itemName || t('deleteConfirmDialog.item') })
    : t('deleteConfirmDialog.activeDescription', { itemName: itemName ? `"${itemName}"` : t('deleteConfirmDialog.thisItem') });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <AlertDialogTitle className="text-lg">{title || defaultTitle}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-3">
            {description || defaultDescription}
          </AlertDialogDescription>
          {!isArchived && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mt-3">
              <p className="text-sm text-yellow-800">
                {t('confirm.deleteTip')}
              </p>
            </div>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('buttons.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {t('confirm.delete.confirmButton')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}