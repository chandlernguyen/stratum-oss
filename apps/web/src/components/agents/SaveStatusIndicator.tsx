import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SaveStatusIndicatorProps {
  status?: 'saving' | 'saved' | 'error' | 'draft' | null;
  outputId?: string;
  onFinalize?: (outputId: string) => Promise<void>;
  className?: string;
  showToast?: boolean;
}

export function SaveStatusIndicator({
  status = null,
  outputId,
  onFinalize,
  className,
  showToast = false
}: SaveStatusIndicatorProps) {
  const { t } = useTranslation(['agents']);
  const [isFinalized, setIsFinalized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (showToast && status === 'saved') {
      toast.success(t('agents:context.saveStatus.toast.saved'), {
        description: t('agents:context.saveStatus.toast.savedDescription'),
        duration: 3000
      });
    }
  }, [status, showToast, t]);

  const handleFinalize = async () => {
    if (!outputId || !onFinalize) return;

    setIsLoading(true);
    try {
      await onFinalize(outputId);
      setIsFinalized(true);
      toast.success(t('agents:context.saveStatus.toast.finalized'), {
        description: t('agents:context.saveStatus.toast.finalizedDescription'),
        action: {
          label: t('agents:context.saveStatus.toast.viewOutputs'),
          onClick: () => window.location.href = '/outputs'
        }
      });
    } catch (error) {
      console.error('Failed to finalize output:', error);
      toast.error(t('agents:context.saveStatus.toast.failedFinalize'));
    } finally {
      setIsLoading(false);
    }
  };

  if (!status) return null;

  return (
    <div className={cn('flex items-center gap-2 text-sm', className)}>
      {/* Status Icon and Text */}
      <div className="flex items-center gap-1.5">
        {status === 'saving' && (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">{t('agents:context.saveStatus.saving')}</span>
          </>
        )}

        {status === 'saved' && !isFinalized && (
          <>
            <CheckCircle className="h-3.5 w-3.5 text-green-500" />
            <span className="text-green-600 dark:text-green-400">{t('agents:context.saveStatus.autoSaved')}</span>
          </>
        )}

        {status === 'draft' && !isFinalized && (
          <>
            <Clock className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-blue-600 dark:text-blue-400">{t('agents:context.saveStatus.draftSaved')}</span>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle className="h-3.5 w-3.5 text-red-500" />
            <span className="text-red-600 dark:text-red-400">{t('agents:context.saveStatus.saveFailed')}</span>
          </>
        )}

        {isFinalized && (
          <>
            <CheckCircle className="h-3.5 w-3.5 text-primary" />
            <span className="text-primary font-medium">{t('agents:context.saveStatus.finalized')}</span>
          </>
        )}
      </div>

      {/* Mark as Final Button */}
      {outputId && onFinalize && !isFinalized && status !== 'error' && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleFinalize}
          disabled={isLoading}
          className="h-7 px-2 text-xs"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              {t('agents:context.saveStatus.finalizing')}
            </>
          ) : (
            t('agents:context.saveStatus.markAsFinal')
          )}
        </Button>
      )}
    </div>
  );
}