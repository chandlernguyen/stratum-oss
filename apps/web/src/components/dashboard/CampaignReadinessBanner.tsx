import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CheckCircle, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useClientContext } from '@/contexts/ClientContext';
import { buildContextAwareUrl } from '@/utils/multiTenantRouting';
import { useTranslation } from 'react-i18next';

interface CampaignReadinessBannerProps {
  isReady: boolean;
  completionPercentage: number;
  hasStrategy: boolean;
  hasPersona: boolean;
  hasMarketingStrategy: boolean;
}

export function CampaignReadinessBanner({
  isReady,
  completionPercentage,
  hasStrategy,
  hasPersona,
  hasMarketingStrategy
}: CampaignReadinessBannerProps) {
  const { t } = useTranslation('dashboard');
  const { clientSlug } = useClientContext();
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  if (isReady) {
    return (
      <Alert className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-amber-950/20 border-green-200 dark:border-green-800">
        <Sparkles className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-900 dark:text-green-100 font-semibold">
          {t('campaignReadiness.ready.title')}
        </AlertTitle>
        <AlertDescription className="text-sm text-gray-700 dark:text-gray-300">
          {t('campaignReadiness.ready.description')}
        </AlertDescription>
        <div className="flex items-center space-x-3 mt-3">
          <Button size="sm" asChild>
            <Link to={buildContextAwareUrl("/campaigns/new", clientSlug) || "/campaigns/new"}>
              {t('campaignReadiness.ready.createCampaign')}
            </Link>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsDismissed(true)}
          >
            {t('campaignReadiness.ready.maybeLater')}
          </Button>
        </div>
      </Alert>
    );
  }

  return (
    <Alert className="bg-gradient-to-r from-slate-50 to-amber-50 dark:from-blue-950/20 dark:to-slate-950/20 border-blue-200 dark:border-blue-800">
      <CheckCircle className="h-4 w-4 text-blue-600" />
      <AlertTitle className="text-blue-900 dark:text-blue-100 font-semibold">
        {t('campaignReadiness.building.title', { percentage: Math.round(completionPercentage) })}
      </AlertTitle>
      <AlertDescription className="text-sm text-gray-700 dark:text-gray-300 mb-3">
        {t('campaignReadiness.building.description')}
      </AlertDescription>
      <div className="flex items-center space-x-4 text-xs">
        <span className={hasStrategy ? 'text-brand-success font-medium' : 'text-muted-foreground'}>
          ✓ {t('campaignReadiness.building.businessStrategy')}
        </span>
        <span className={hasPersona ? 'text-brand-success font-medium' : 'text-muted-foreground'}>
          ✓ {t('campaignReadiness.building.customerPersonas')}
        </span>
        <span className={hasMarketingStrategy ? 'text-brand-success font-medium' : 'text-muted-foreground'}>
          ✓ {t('campaignReadiness.building.marketingStrategy')}
        </span>
      </div>
    </Alert>
  );
}
