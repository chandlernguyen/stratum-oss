import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp,
  TrendingDown,
  BarChart,
  DollarSign,
  Target,
  Eye,
  MousePointer,
  Calendar,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap
} from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';
import { getIntlLocale } from '@/lib/locales';
import { useCampaignPerformanceInsights } from '@/hooks/data/useCampaignAnalytics';
import { cn } from '@/lib/utils';

interface CampaignAnalyticsProps {
  campaignId: string;
}

export function CampaignAnalytics({ campaignId }: CampaignAnalyticsProps) {
  const { t, locale } = useLocale('campaigns');
  const intlLocale = getIntlLocale(locale);
  const { data: analytics, isLoading, error } = useCampaignPerformanceInsights(campaignId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8 text-center">
          <div>
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-lg font-medium text-red-600 mb-2">{t('analytics.error.title')}</p>
            <p className="text-sm text-muted-foreground">{t('analytics.error.message', { message: error.message })}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8 text-center">
          <div>
            <BarChart className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">{t('analytics.empty.title')}</p>
            <p className="text-sm text-muted-foreground">{t('analytics.empty.description')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getPerformanceBadgeColor = (trend: string) => {
    switch (trend) {
      case 'excellent': return 'bg-green-500';
      case 'good': return 'bg-blue-500';
      case 'average': return 'bg-yellow-500';
      case 'below_average': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getBudgetHealthColor = (burnRate: string, utilization: number) => {
    if (utilization > 90) return 'text-red-600';
    if (burnRate === 'high') return 'text-orange-600';
    if (burnRate === 'moderate') return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="space-y-6">
      {/* Key Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('analytics.cards.budgetUtilized')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.budget_utilization_percentage.toFixed(1)}%
            </div>
            <Progress
              value={Math.min(analytics.budget_utilization_percentage, 100)}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t('analytics.cards.budgetOf', { spent: `$${analytics.total_spent.toLocaleString(intlLocale)}`, total: `$${analytics.total_budget.toLocaleString(intlLocale)}` })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('analytics.cards.conversionRate')}</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.conversion_rate > 0 ? `${analytics.conversion_rate}%` : '0%'}
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {analytics.hasGoodConversionRate ? (
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
              )}
              {t('analytics.cards.conversionsFromReach', { conversions: analytics.conversions, reach: analytics.reach })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('analytics.cards.engagement')}</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.avg_engagement_score.toFixed(1)}
            </div>
            <Badge
              variant="outline"
              className={cn("mt-1", getPerformanceBadgeColor(analytics.engagementLevel))}
            >
              {t(`analytics.performanceLevels.${analytics.engagementLevel}`, analytics.engagementLevel)}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              {t('analytics.cards.ctr', { rate: analytics.click_through_rate })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('analytics.cards.performance')}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Badge
                variant="outline"
                className={getPerformanceBadgeColor(analytics.performance_trend)}
              >
                {t(`analytics.performanceLevels.${analytics.performance_trend}`, analytics.performance_trend.replace('_', ' '))}
              </Badge>
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-2">
              <Eye className="h-3 w-3 mr-1" />
              {t('analytics.cards.impressions', { count: analytics.impressions })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {t('analytics.budget.title')}
            </CardTitle>
            <CardDescription>{t('analytics.budget.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">{t('analytics.budget.dailySpendRate')}</span>
              <span className="text-lg font-bold">
                {t('analytics.budget.perDay', { amount: `$${analytics.daily_spend_rate.toFixed(2)}` })}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">{t('analytics.budget.projectedTotalSpend')}</span>
              <span className={cn("text-lg font-bold",
                analytics.projected_spend > analytics.total_budget ? 'text-red-600' : 'text-foreground'
              )}>
                ${analytics.projected_spend.toLocaleString(intlLocale)}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">{t('analytics.budget.budgetBurnRate')}</span>
              <Badge
                variant="outline"
                className={getBudgetHealthColor(analytics.budget_burn_rate, analytics.budget_utilization_percentage)}
              >
                {t(`analytics.burnRates.${analytics.budget_burn_rate}`, analytics.budget_burn_rate.replace('_', ' '))}
              </Badge>
            </div>

            {analytics.daysToEndBudget && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{t('analytics.budget.daysToEnd')}</span>
                <span className="text-lg font-bold flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {t('analytics.budget.daysCount', { days: analytics.daysToEndBudget })}
                </span>
              </div>
            )}

            {analytics.cost_per_conversion > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{t('analytics.budget.costPerConversion')}</span>
                <span className="text-lg font-bold">${analytics.cost_per_conversion.toFixed(2)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Campaign Progress & Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {t('analytics.progress.title')}
            </CardTitle>
            <CardDescription>{t('analytics.progress.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">{t('analytics.progress.campaignProgress')}</span>
                <span className="text-sm text-muted-foreground">
                  {analytics.campaign_progress_percentage.toFixed(1)}%
                </span>
              </div>
              <Progress value={analytics.campaign_progress_percentage} />
              <div className="flex justify-between items-center mt-1 text-xs text-muted-foreground">
                <span>{t('analytics.progress.daysActive', { days: analytics.days_active })}</span>
                {analytics.days_remaining && <span>{t('analytics.progress.daysLeft', { days: analytics.days_remaining })}</span>}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600">{analytics.strategies_count}</div>
                <div className="text-xs text-muted-foreground">{t('analytics.progress.strategies')}</div>
                {analytics.hasStrategies && <CheckCircle className="h-3 w-3 text-green-500 mx-auto mt-1" />}
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-600">{analytics.personas_count}</div>
                <div className="text-xs text-muted-foreground">{t('analytics.progress.personas')}</div>
                {analytics.hasPersonas && <CheckCircle className="h-3 w-3 text-green-500 mx-auto mt-1" />}
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{analytics.active_outputs_count}</div>
                <div className="text-xs text-muted-foreground">{t('analytics.progress.activeOutputs')}</div>
                {analytics.hasActiveOutputs && <CheckCircle className="h-3 w-3 text-green-500 mx-auto mt-1" />}
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t('analytics.progress.topChannel')}</span>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  {analytics.top_performing_channel}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {t('analytics.progress.channelsConfigured', { count: analytics.channel_performance.total_channels })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Alerts */}
      {(analytics.isOverBudget || analytics.isUnderperforming) && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              {t('analytics.alerts.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {analytics.isOverBudget && (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  {t('analytics.alerts.overBudget', { percentage: analytics.budget_utilization_percentage.toFixed(1) })}
                </div>
              )}
              {analytics.isUnderperforming && (
                <div className="flex items-center gap-2 text-orange-600">
                  <TrendingDown className="h-4 w-4" />
                  {t('analytics.alerts.underperforming', { trend: t(`analytics.performanceLevels.${analytics.performance_trend}`, analytics.performance_trend.replace('_', ' ')) })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="text-xs text-muted-foreground text-right">
        {t('analytics.generated', { date: new Date(analytics.analytics_generated_at).toLocaleString(getIntlLocale(locale)) })}
      </div>
    </div>
  );
}
