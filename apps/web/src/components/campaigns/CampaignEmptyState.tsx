import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Target, CheckCircle2, Circle, ArrowRight, Lightbulb } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@/config/routes';
import { useClientContext } from '@/contexts/ClientContext';
import { buildContextAwareUrl } from '@/utils/multiTenantRouting';

interface IntelligenceReadiness {
  hasStrategy: boolean;
  hasPersona: boolean;
  hasMarketingStrategy: boolean;
  hasContent: boolean;
  totalOutputs: number;
}

interface CampaignEmptyStateProps {
  readiness: IntelligenceReadiness;
  canCreateCampaigns: boolean;
}

export function CampaignEmptyState({ readiness, canCreateCampaigns }: CampaignEmptyStateProps) {
  const { clientSlug } = useClientContext();
  const { t } = useTranslation('campaigns');

  const prerequisites = [
    {
      id: 'strategy',
      title: t('emptyState.prerequisites.strategy.title'),
      description: t('emptyState.prerequisites.strategy.description'),
      completed: readiness.hasStrategy,
      route: ROUTES.agents.strategy.root,
      icon: Lightbulb,
      color: 'text-blue-600'
    },
    {
      id: 'persona',
      title: t('emptyState.prerequisites.persona.title'),
      description: t('emptyState.prerequisites.persona.description'),
      completed: readiness.hasPersona,
      route: ROUTES.agents.persona.root,
      icon: Lightbulb,
      color: 'text-amber-600'
    },
    {
      id: 'marketing',
      title: t('emptyState.prerequisites.marketing.title'),
      description: t('emptyState.prerequisites.marketing.description'),
      completed: readiness.hasMarketingStrategy,
      route: ROUTES.agents.marketingStrategy.root,
      icon: Lightbulb,
      color: 'text-green-600'
    },
    {
      id: 'content',
      title: t('emptyState.prerequisites.content.title'),
      description: t('emptyState.prerequisites.content.description'),
      completed: readiness.hasContent,
      route: ROUTES.agents.content.root,
      icon: Lightbulb,
      color: 'text-orange-600'
    }
  ];

  const completedCount = prerequisites.filter(p => p.completed).length;
  const totalCount = prerequisites.length;
  const completionPercentage = (completedCount / totalCount) * 100;
  const isReady = completedCount >= 2; // Minimum 2 prerequisites for campaign creation

  return (
    <div className="space-y-6">
      <Card className="border-dashed">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-slate-50 dark:bg-slate-950/20 flex items-center justify-center">
            <Target className="h-8 w-8 text-amber-600" />
          </div>
          <CardTitle className="text-2xl font-bold">{t('emptyState.title')}</CardTitle>
          <p className="text-muted-foreground mt-2">
            {t('emptyState.description')}
          </p>
        </CardHeader>

        <CardContent>
          {/* Progress Overview */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{t('emptyState.readinessLabel')}</span>
              <span className="text-sm text-muted-foreground">
                {t('emptyState.readinessCount', { completed: completedCount, total: totalCount })}
              </span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
            {isReady ? (
              <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {t('emptyState.readyMessage')}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-2">
                {t('emptyState.notReadyMessage')}
              </p>
            )}
          </div>

          {/* Prerequisites Checklist */}
          <div className="space-y-3 mb-6">
            {prerequisites.map((prereq) => (
              <Link
                key={prereq.id}
                to={prereq.route}
                className={`block p-4 rounded-lg border transition-all duration-200 ${
                  prereq.completed
                    ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-600 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {prereq.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-semibold text-sm">{prereq.title}</h4>
                        {prereq.completed && (
                          <Badge variant="secondary" className="text-xs">
                            {t('emptyState.completeBadge')}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {prereq.description}
                      </p>
                    </div>
                  </div>
                  {!prereq.completed && (
                    <ArrowRight className="h-4 w-4 text-gray-400 ml-2 flex-shrink-0" />
                  )}
                </div>
              </Link>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {isReady && canCreateCampaigns ? (
              <>
                <Button asChild className="flex-1">
                  <Link to={buildContextAwareUrl("/campaigns/new", clientSlug) || "/campaigns/new"}>
                    <Target className="mr-2 h-4 w-4" />
                    {t('emptyState.createFirst')}
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to={ROUTES.agents.strategy.root}>
                    {t('emptyState.continueGathering')}
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild className="flex-1">
                  <Link to={ROUTES.agents.strategy.root}>
                    <Lightbulb className="mr-2 h-4 w-4" />
                    {t('emptyState.startGathering')}
                  </Link>
                </Button>
                {canCreateCampaigns && (
                  <Button asChild variant="outline">
                    <Link to={buildContextAwareUrl("/campaigns/new", clientSlug) || "/campaigns/new"}>
                      {t('emptyState.createAnyway')}
                    </Link>
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Helper Text */}
          <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-900 dark:text-blue-100">
              <strong>💡 {t('emptyState.whyGatherTitle')}</strong> {t('emptyState.whyGatherDescription')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Total Intelligence Summary */}
      {readiness.totalOutputs > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-amber-600 mb-1">
                {readiness.totalOutputs}
              </div>
              <p className="text-sm text-muted-foreground">
                {t('emptyState.totalOutputsReady')}
              </p>
              <Button asChild variant="link" size="sm" className="mt-2">
                <Link to={buildContextAwareUrl("/outputs", clientSlug) || "/outputs"}>
                  {t('emptyState.viewAllIntelligence')} →
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
