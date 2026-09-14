import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Sparkles, Clock, TrendingUp, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/config/routes';
import { useClientContext } from '@/contexts/ClientContext';
import { buildContextAwareUrl } from '@/utils/multiTenantRouting';
import { useTranslation } from 'react-i18next';

interface IntelligenceRecommendation {
  id: string;
  title: string;
  description: string;
  agent_type: string;
  estimated_time: number; // minutes
  priority: 'high' | 'medium' | 'low';
  action_url: string;
}

interface IntelligenceBriefingCardProps {
  recommendations: IntelligenceRecommendation[];
  isLoading?: boolean;
}

export function IntelligenceBriefingCard({
  recommendations,
  isLoading = false
}: IntelligenceBriefingCardProps) {
  const { clientSlug } = useClientContext();
  const [isOpen, setIsOpen] = useState(true);
  const { t } = useTranslation('dashboard');

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-slate-50 to-amber-50 dark:from-slate-950/20 dark:to-amber-950/20 border-slate-200 dark:border-slate-800">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-amber-600 animate-pulse" />
            <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {t('intelligenceBriefing.title')}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-white/50 dark:bg-gray-800/50 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-slate-50 to-amber-50 dark:from-slate-950/20 dark:to-amber-950/20 border-slate-200 dark:border-slate-800">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {t('intelligenceBriefing.title')}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {t('intelligenceBriefing.analyzing')}
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link to={ROUTES.agents.strategy.root}>
              {t('intelligenceBriefing.startStrategy')}
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="bg-gradient-to-br from-slate-50 to-amber-50 dark:from-slate-950/20 dark:to-amber-950/20 border-slate-200 dark:border-slate-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {t('intelligenceBriefing.title')}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {t('intelligenceBriefing.badge')}
              </Badge>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <ChevronDown
                    className={`h-4 w-4 text-amber-600 transition-transform duration-200 ${
                      isOpen ? '' : '-rotate-90'
                    }`}
                  />
                  <span className="sr-only">{t('intelligenceBriefing.toggleBriefing')}</span>
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t('intelligenceBriefing.subtitle')}
          </p>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <div className="space-y-3">
              {recommendations.slice(0, 3).map((rec) => (
                <Link
                  key={rec.id}
                  to={rec.action_url}
                  className="block p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-amber-300 dark:hover:border-amber-600 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge
                          variant={rec.priority === 'high' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {rec.priority === 'high' ? t('intelligenceBriefing.highImpact') : t('intelligenceBriefing.recommended')}
                        </Badge>
                        <span className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                          <Clock className="h-3 w-3 mr-1" />
                          {t('intelligenceBriefing.minutes', { time: rec.estimated_time })}
                        </span>
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        {rec.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {rec.description}
                      </p>
                    </div>
                    <TrendingUp className="h-5 w-5 text-amber-600 ml-4 flex-shrink-0" />
                  </div>
                </Link>
              ))}
            </div>

            {recommendations.length > 3 && (
              <Button variant="ghost" size="sm" className="w-full mt-3" asChild>
                <Link to={buildContextAwareUrl("/dashboard/recommendations", clientSlug) || "/dashboard/recommendations"}>
                  {t('intelligenceBriefing.viewAll', { count: recommendations.length })} →
                </Link>
              </Button>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
