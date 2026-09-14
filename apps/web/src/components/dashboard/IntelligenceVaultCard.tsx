import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, FileText, Users, Lightbulb } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/config/routes';
import { useClientContext } from '@/contexts/ClientContext';
import { buildContextAwareUrl } from '@/utils/multiTenantRouting';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/useLocale';

interface AgentOutput {
  id: string;
  agent_type: string;
  title: string;
  summary?: string;
  created_at: string;
}

interface IntelligenceVaultCardProps {
  recentOutputs: AgentOutput[];
  totalCount: number;
  isLoading?: boolean;
}

// Agent config with translation keys for labels
const AGENT_CONFIG = {
  strategy: { icon: Brain, color: 'text-blue-600', labelKey: 'recentIntelligence.agentLabels.strategy' },
  persona: { icon: Users, color: 'text-amber-600', labelKey: 'recentIntelligence.agentLabels.persona' },
  'marketing-strategy': { icon: Lightbulb, color: 'text-green-600', labelKey: 'recentIntelligence.agentLabels.marketingStrategy' },
  content: { icon: FileText, color: 'text-orange-600', labelKey: 'recentIntelligence.agentLabels.content' },
} as const;

export function IntelligenceVaultCard({
  recentOutputs,
  totalCount,
  isLoading = false
}: IntelligenceVaultCardProps) {
  const { clientSlug } = useClientContext();
  const { t } = useTranslation('dashboard');
  const { formatRelativeTime } = useLocale();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{t('recentIntelligence.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recentOutputs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">{t('recentIntelligence.vaultTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Brain className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t('recentIntelligence.emptyStateVault')}
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link to={ROUTES.agents.strategy.root}>
                {t('recentIntelligence.generateFirst')}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{t('recentIntelligence.title')}</CardTitle>
          <Badge variant="outline" className="text-xs">
            {t('recentIntelligence.total', { count: totalCount })}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {recentOutputs.slice(0, 5).map((output) => {
            const config = AGENT_CONFIG[output.agent_type as keyof typeof AGENT_CONFIG] || {
              icon: FileText,
              color: 'text-gray-600',
              labelKey: null
            };
            const Icon = config.icon;
            const label = config.labelKey ? t(config.labelKey) : output.agent_type;

            return (
              <Link
                key={output.id}
                to={buildContextAwareUrl(`/outputs/${output.id}`, clientSlug) || `/outputs/${output.id}`}
                className="flex items-start p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150 border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
              >
                <Icon className={`h-5 w-5 ${config.color} mt-0.5 flex-shrink-0`} />
                <div className="ml-3 flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="text-xs">
                      {label}
                    </Badge>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatRelativeTime(new Date(output.created_at))}
                    </span>
                  </div>
                  <p className="font-medium text-sm text-gray-900 dark:text-gray-100 mt-1 truncate">
                    {output.title}
                  </p>
                  {output.summary && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                      {output.summary}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        <Button variant="ghost" size="sm" className="w-full mt-3" asChild>
          <Link to={buildContextAwareUrl("/outputs", clientSlug) || "/outputs"}>
            {t('recentIntelligence.viewAllIntelligence')} →
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
