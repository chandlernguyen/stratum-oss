import { useTranslation } from 'react-i18next';
import { Info, Calendar, Building2, Target, ChevronRight } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate, useParams } from 'react-router-dom';
import { useOrganization } from '@/hooks/data/useOrganization';
import { useCampaign } from '@/hooks/data/useCampaigns';
import { formatCampaignBudgetValue, formatCampaignTimelineValue } from './campaignContext';

interface ContextAlertProps {
  className?: string;
  showSwitcher?: boolean;
}

export function ContextAlert({ className = "mb-6", showSwitcher = true }: ContextAlertProps) {
  const { t } = useTranslation(['agents']);
  const { isAgency } = useOrganization();
  const { campaignId } = useParams<{ campaignId?: string }>();
  const { data: currentCampaign } = useCampaign(campaignId);
  const navigate = useNavigate();
  // For now, currentClient is not available - will be handled via URL routing
  const currentClient: any = null;

  // Don't show if no context
  if (!currentCampaign && !currentClient) {
    return null;
  }

  return (
    <Alert className={`border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 ${className}`}>
      <Info className="h-4 w-4" />
      <AlertDescription>
        <div className="flex items-center justify-between">
          <div>
            {isAgency && currentClient && (
              <>
                <Building2 className="h-3 w-3 inline mr-1" />
                <strong className="text-amber-900 dark:text-amber-100">{t('agents:context.alert.client')}</strong>{' '}
                <span className="text-amber-800 dark:text-amber-200">{currentClient.name}</span>
                {currentCampaign && (
                  <span className="mx-2 text-amber-600 dark:text-amber-400">•</span>
                )}
              </>
            )}
            {currentCampaign && (
              <>
                <Target className="h-3 w-3 inline mr-1" />
                <strong className="text-amber-900 dark:text-amber-100">{t('agents:context.alert.campaign')}</strong>{' '}
                <span className="text-amber-800 dark:text-amber-200">{currentCampaign.name}</span>
                {currentCampaign.budget && (
                  <Badge variant="secondary" className="ml-2">
                    {t('agents:context.alert.budget')} ${formatCampaignBudgetValue(currentCampaign.budget)}
                  </Badge>
                )}
                {currentCampaign.start_date && currentCampaign.end_date && (
                  <Badge variant="outline" className="ml-2">
                    <Calendar className="h-3 w-3 mr-1" />
                    {formatCampaignTimelineValue(currentCampaign.start_date, currentCampaign.end_date).replace(' to ', ' - ')}
                  </Badge>
                )}
              </>
            )}
          </div>
        </div>
        {currentCampaign?.goals && (
          <div className="mt-2 text-sm text-amber-800 dark:text-amber-200">
            <strong>{t('agents:context.alert.objectives')}</strong> {Array.isArray(currentCampaign.goals) ? currentCampaign.goals.join(', ') : currentCampaign.goals || ''}
          </div>
        )}
        {showSwitcher && (
          <div className="mt-3 flex gap-2">
            {isAgency && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/campaigns')}
                className="text-xs"
              >
                {t('agents:context.alert.switchClient')}
                <ChevronRight className="ml-1 h-3 w-3" />
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/campaigns')}
              className="text-xs"
            >
              {t('agents:context.alert.switchCampaign')}
              <ChevronRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
