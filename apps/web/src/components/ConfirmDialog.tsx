import { useState, useEffect } from 'react';
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
import { AlertTriangle, Archive, Info } from "lucide-react";

/**
 * Unified Confirmation Dialog
 *
 * Replaces:
 * - DeleteConfirmDialog
 * - ArchiveReasonDialog
 * - window.confirm()
 *
 * Supports 4 variants: delete, archive, warning, info
 *
 * @example
 * ```tsx
 * const { openDialog, dialogProps } = useConfirmDialog();
 *
 * const confirmed = await openDialog({
 *   variant: 'delete',
 *   title: 'Delete Output?',
 *   description: 'This will permanently delete...',
 *   itemName: 'Q3 Strategy'
 * });
 * ```
 */

export type ConfirmDialogVariant = 'delete' | 'archive' | 'warning' | 'info';

export interface ConfirmDialogConfig {
  variant: ConfirmDialogVariant;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  itemName?: string;
  isArchived?: boolean;
  showArchiveTip?: boolean;
  showReasonInput?: boolean; // For archive variant
}

interface ConfirmDialogProps extends ConfirmDialogConfig {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data?: { reason?: string }) => void | Promise<void>;
  loading?: boolean;
}

/**
 * Get variant-specific styling and icon
 * Returns translation keys for text that will be resolved in the component
 */
function getVariantConfig(variant: ConfirmDialogVariant) {
  switch (variant) {
    case 'delete':
      return {
        icon: AlertTriangle,
        iconBgColor: 'bg-red-100 dark:bg-red-900/20',
        iconColor: 'text-brand-error dark:text-red-400',
        buttonBgColor: 'bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800',
        buttonFocusRing: 'focus:ring-red-600 dark:focus:ring-red-500',
        defaultConfirmKey: 'confirm.delete.confirmButton'
      };
    case 'archive':
      return {
        icon: Archive,
        iconBgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
        iconColor: 'text-brand-warning dark:text-yellow-400',
        buttonBgColor: 'bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-700 dark:hover:bg-yellow-800',
        buttonFocusRing: 'focus:ring-yellow-600 dark:focus:ring-brand-warning',
        defaultConfirmKey: 'confirm.archive.confirmButton'
      };
    case 'warning':
      return {
        icon: AlertTriangle,
        iconBgColor: 'bg-orange-100 dark:bg-orange-900/20',
        iconColor: 'text-orange-600 dark:text-orange-400',
        buttonBgColor: 'bg-orange-600 hover:bg-orange-700 dark:bg-orange-700 dark:hover:bg-orange-800',
        buttonFocusRing: 'focus:ring-orange-600 dark:focus:ring-orange-500',
        defaultConfirmKey: 'confirm.warning.confirmButton'
      };
    case 'info':
      return {
        icon: Info,
        iconBgColor: 'bg-blue-100 dark:bg-blue-900/20',
        iconColor: 'text-brand-info dark:text-blue-400',
        buttonBgColor: 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800',
        buttonFocusRing: 'focus:ring-blue-600 dark:focus:ring-blue-500',
        defaultConfirmKey: 'confirm.info.confirmButton'
      };
  }
}

/**
 * Unified Confirmation Dialog Component
 *
 * Consolidates all confirmation dialog patterns into a single component.
 * Supports delete, archive, warning, and info variants with consistent styling.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  variant,
  title,
  description,
  confirmText,
  cancelText,
  itemName,
  isArchived = false,
  showArchiveTip = true,
  showReasonInput = false,
  loading = false
}: ConfirmDialogProps) {
  const { t } = useTranslation('common');
  const [reason, setReason] = useState("");
  const variantConfig = getVariantConfig(variant);
  const Icon = variantConfig.icon;

  // Use provided text or fall back to translations
  const resolvedCancelText = cancelText || t('buttons.cancel');
  const resolvedConfirmText = confirmText || t(variantConfig.defaultConfirmKey);

  // Reset reason when dialog closes
  useEffect(() => {
    if (!open) {
      setReason("");
    }
  }, [open]);

  const handleConfirm = async () => {
    if (showReasonInput) {
      await onConfirm({ reason: reason.trim() || undefined });
    } else {
      await onConfirm();
    }
  };

  const handleCancel = () => {
    setReason("");
    onOpenChange(false);
  };

  // Show archive tip only for delete variant, non-archived items, when enabled
  const shouldShowArchiveTip = variant === 'delete' && !isArchived && showArchiveTip;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full ${variantConfig.iconBgColor} flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${variantConfig.iconColor}`} />
            </div>
            <AlertDialogTitle className="text-lg">{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-3 dark:text-gray-300">
            {description}
          </AlertDialogDescription>

          {/* Archive Tip (Delete variant only, for non-archived items) */}
          {shouldShowArchiveTip && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 mt-3">
              <p className="text-sm text-brand-warning dark:text-yellow-200">
                {t('confirm.deleteTip')}
              </p>
            </div>
          )}
        </AlertDialogHeader>

        {/* Archive Reason Input (Archive variant only) */}
        {showReasonInput && variant === 'archive' && (
          <div className="py-4">
            <label
              htmlFor="archive-reason"
              className="text-sm font-medium text-brand-charcoal dark:text-gray-100 mb-2 block"
            >
              {t('confirm.archive.reasonLabel')}
            </label>
            <textarea
              id="archive-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('confirm.archive.reasonPlaceholder')}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md text-sm resize-none focus:ring-2 focus:ring-brand-warning focus:border-brand-warning dark:bg-gray-800 dark:text-gray-100"
              rows={3}
              disabled={loading}
            />
            <p className="text-xs text-brand-slate dark:text-gray-400 mt-1">
              {t('confirm.archive.reasonHelp')}
            </p>
          </div>
        )}

        {/* Reversibility Message (Archive variant only) */}
        {variant === 'archive' && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3 mb-4">
            <div className="flex items-start gap-2">
              <div className="w-4 h-4 rounded-full bg-yellow-400 dark:bg-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-brand-warning dark:text-yellow-200">
                  {t('confirm.archive.reversibleTitle')}
                </p>
                <p className="text-sm text-brand-warning dark:text-yellow-300 mt-1">
                  {t('confirm.archive.reversibleMessage', { itemName: itemName ? `"${itemName}"` : t('labels.item', 'item') })}
                </p>
              </div>
            </div>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={handleCancel}
            disabled={loading}
          >
            {resolvedCancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className={`${variantConfig.buttonBgColor} ${variantConfig.buttonFocusRing}`}
          >
            {loading ? t('confirm.processing') : resolvedConfirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
