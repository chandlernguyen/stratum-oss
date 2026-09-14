/**
 * @deprecated Use ConfirmDialog with useArchiveConfirmation hook instead
 *
 * This component is deprecated in favor of the unified confirmation system.
 *
 * Migration guide:
 * ```tsx
 * // Old pattern:
 * import { ArchiveReasonDialog } from '@/components/ArchiveReasonDialog';
 * const [open, setOpen] = useState(false);
 * <ArchiveReasonDialog open={open} onOpenChange={setOpen} onConfirm={handleArchive} />
 *
 * // New pattern:
 * import { useArchiveConfirmation } from '@/hooks/useArchiveConfirmation';
 * const { confirmArchive, ArchiveDialog } = useArchiveConfirmation();
 * const reason = await confirmArchive({ id, name, displayName: 'Campaign' });
 * if (reason !== null) { handleArchive(reason); }
 * <ArchiveDialog />
 * ```
 *
 * Scheduled for removal: Next major version
 */

import { useState } from 'react';
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
} from "@/components/ui/alert-dialog";
import { Archive } from "lucide-react";

interface ArchiveReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason?: string) => void;
  resourceName: string;
  resourceDisplayName: string;
  loading?: boolean;
}

export function ArchiveReasonDialog({
  open,
  onOpenChange,
  onConfirm,
  resourceName,
  resourceDisplayName,
  loading = false
}: ArchiveReasonDialogProps) {
  const { t } = useTranslation(['common']);
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    onConfirm(reason.trim() || undefined);
    setReason(""); // Reset for next use
  };

  const handleCancel = () => {
    setReason(""); // Reset on cancel
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
              <Archive className="w-5 h-5 text-yellow-600" />
            </div>
            <AlertDialogTitle>{t('confirm.archive.title')} {resourceDisplayName}?</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-3">
            {t('archiveReasonDialog.description', { resourceName })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <label
            htmlFor="archive-reason"
            className="text-sm font-medium text-gray-900 mb-2 block"
          >
            {t('confirm.archive.reasonLabel')}
          </label>
          <textarea
            id="archive-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('confirm.archive.reasonPlaceholder')}
            className="w-full p-3 border border-gray-300 rounded-md text-sm resize-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            rows={3}
            disabled={loading}
          />
          <p className="text-xs text-gray-500 mt-1">
            {t('confirm.archive.reasonHelp')}
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
          <div className="flex items-start gap-2">
            <div className="w-4 h-4 rounded-full bg-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800">
                {t('confirm.archive.reversibleTitle')}
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                {t('confirm.archive.reversibleMessage', { itemName: resourceDisplayName.toLowerCase() })}
              </p>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={handleCancel}
            disabled={loading}
          >
            {t('buttons.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className="bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-600"
          >
            {loading ? t('archiveReasonDialog.archiving') : t('archiveReasonDialog.archiveButton', { resourceDisplayName })}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}