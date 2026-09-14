import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, Target, Calendar, BarChart3, Upload } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';
import { getIntlLocale } from '@/lib/locales';
import { useROIDashboardMetrics } from '@/hooks/data/useCampaignMetrics';
import { Link } from 'react-router-dom';
import { useClientContext } from '@/contexts/ClientContext';
import { buildContextAwareUrl } from '@/utils/multiTenantRouting';

export function ROIDashboardMetrics() {
  const { locale } = useLocale('common');
  const { clientSlug } = useClientContext();
  const { data: metrics, isLoading } = useROIDashboardMetrics();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6">
              <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // No data state - show call to action
  if (!metrics || metrics.campaigns_tracked === 0) {
    return (
      <Card className="mb-8 border-2 border-dashed border-gray-300 dark:border-gray-700">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <BarChart3 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Campaign Data Yet</h3>
            <p className="text-brand-slate dark:text-gray-400 mb-6 max-w-md mx-auto">
              Import your campaign metrics to start tracking ROI and optimizing your marketing budget
            </p>
            <div className="flex gap-3 justify-center">
              <Link to={buildContextAwareUrl("/performance-intelligence/tool/upload-v2", clientSlug) || "/performance-intelligence/tool/upload-v2"}>
                <Button>
                  <Upload className="mr-2 h-4 w-4" />
                  Import CSV Data
                </Button>
              </Link>
              <Link to={buildContextAwareUrl("/performance-intelligence/tool/manual-entry", clientSlug) || "/performance-intelligence/tool/manual-entry"}>
                <Button variant="outline">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Manual Entry
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(getIntlLocale(locale), {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const formatDateRange = () => {
    if (!metrics.earliest_date || !metrics.latest_date) return 'No data';
    const intlLocale = getIntlLocale(locale);
    const start = new Date(metrics.earliest_date).toLocaleDateString(intlLocale, { month: 'short', day: 'numeric' });
    const end = new Date(metrics.latest_date).toLocaleDateString(intlLocale, { month: 'short', day: 'numeric', year: 'numeric' });
    return `${start} - ${end}`;
  };

  // Determine which metric tier we're showing (Phase 6.5: added engagement)
  const isRevenueMode = metrics.metric_type === 'revenue';
  const isConversionMode = metrics.metric_type === 'conversions';
  // isEngagementMode is implicit via else clauses (metrics.metric_type === 'engagement')

  return (
    <div className="space-y-6 mb-8">
      {/* Main Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Spend */}
        <Card className="hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-brand-slate dark:text-gray-400">
              Total Spend
            </CardTitle>
            <DollarSign className="h-5 w-5 text-brand-error dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-brand-charcoal dark:text-gray-100">
              {formatCurrency(metrics.total_spend)}
            </div>
            <p className="text-xs text-brand-slate dark:text-gray-400 mt-1">
              Across {metrics.campaigns_tracked} campaign{metrics.campaigns_tracked !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        {/* Revenue / Leads / Video Views (dynamic based on metric_type) */}
        {isRevenueMode ? (
          <Card className="hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-brand-slate dark:text-gray-400">
                Total Revenue
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-brand-success dark:text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-brand-charcoal dark:text-gray-100">
                {formatCurrency(metrics.total_revenue || 0)}
              </div>
              <p className="text-xs text-brand-slate dark:text-gray-400 mt-1">
                {metrics.total_conversions.toLocaleString(getIntlLocale(locale))} total conversions
              </p>
            </CardContent>
          </Card>
        ) : isConversionMode ? (
          <Card className="hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-amber-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-brand-slate dark:text-gray-400">
                Total Leads
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-brand-gold dark:text-amber-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-brand-charcoal dark:text-gray-100">
                {(metrics.total_leads || 0).toLocaleString(getIntlLocale(locale))}
              </div>
              <p className="text-xs text-brand-slate dark:text-gray-400 mt-1">
                {metrics.total_calls || 0} calls, {metrics.total_appointments || 0} appointments
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-brand-slate dark:text-gray-400">
                Total Video Views
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-brand-warning dark:text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-brand-charcoal dark:text-gray-100">
                {(metrics.total_video_views || 0).toLocaleString(getIntlLocale(locale))}
              </div>
              <p className="text-xs text-brand-slate dark:text-gray-400 mt-1">
                {(metrics.total_likes || 0).toLocaleString(getIntlLocale(locale))} likes, {(metrics.total_shares || 0).toLocaleString(getIntlLocale(locale))} shares
              </p>
            </CardContent>
          </Card>
        )}

        {/* Average ROI / Cost Per Lead / Cost Per View (dynamic) */}
        {isRevenueMode ? (
          <Card className="hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-brand-slate dark:text-gray-400">
                Average ROI
              </CardTitle>
              <Target className="h-5 w-5 text-brand-info dark:text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-brand-charcoal dark:text-gray-100">
                {formatPercent(metrics.avg_roi || 0)}
              </div>
              <Badge
                variant={(metrics.avg_roi || 0) >= 100 ? 'default' : (metrics.avg_roi || 0) >= 0 ? 'secondary' : 'destructive'}
                className="mt-1"
              >
                {(metrics.avg_roi || 0) >= 100 ? 'Excellent' : (metrics.avg_roi || 0) >= 0 ? 'Positive' : 'Negative'}
              </Badge>
            </CardContent>
          </Card>
        ) : isConversionMode ? (
          <Card className="hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-indigo-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-brand-slate dark:text-gray-400">
                Cost Per Lead
              </CardTitle>
              <Target className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-brand-charcoal dark:text-gray-100">
                {formatCurrency(metrics.avg_cpl || 0)}
              </div>
              <p className="text-xs text-brand-slate dark:text-gray-400 mt-1">
                CPA: {formatCurrency(metrics.avg_cpa || 0)}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-teal-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-brand-slate dark:text-gray-400">
                Cost Per View
              </CardTitle>
              <Target className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-brand-charcoal dark:text-gray-100">
                {formatCurrency(metrics.avg_cpv || 0)}
              </div>
              <p className="text-xs text-brand-slate dark:text-gray-400 mt-1">
                CPE: {formatCurrency(metrics.avg_cpe || 0)}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Active Channels */}
        <Card className="hover:shadow-lg transition-all cursor-pointer border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-brand-slate dark:text-gray-400">
              Active Channels
            </CardTitle>
            <Calendar className="h-5 w-5 text-brand-gold dark:text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-brand-charcoal dark:text-gray-100">
              {metrics.active_channels}
            </div>
            <p className="text-xs text-brand-slate dark:text-gray-400 mt-1">
              {formatDateRange()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-gray-200 dark:border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-brand-slate dark:text-gray-400">Avg. Cost Per Click</p>
                <p className="text-xl font-bold text-brand-charcoal dark:text-gray-100 mt-1">
                  {formatCurrency(metrics.avg_cpc)}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-gray-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-brand-slate dark:text-gray-400">Data Points</p>
                  <p className="text-xl font-bold text-brand-charcoal dark:text-gray-100 mt-1">
                  {metrics.metrics_count.toLocaleString(getIntlLocale(locale))}
                  </p>
                </div>
              <BarChart3 className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        {isRevenueMode ? (
          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-brand-slate dark:text-gray-400">Profit/Loss</p>
                  <p className={`text-xl font-bold mt-1 ${
                    ((metrics.total_revenue || 0) - metrics.total_spend) >= 0
                      ? 'text-brand-success dark:text-green-400'
                      : 'text-brand-error dark:text-red-400'
                  }`}>
                    {formatCurrency((metrics.total_revenue || 0) - metrics.total_spend)}
                  </p>
                </div>
                <TrendingUp className={`h-8 w-8 ${
                  ((metrics.total_revenue || 0) - metrics.total_spend) >= 0 ? 'text-green-400' : 'text-red-400'
                }`} />
              </div>
            </CardContent>
          </Card>
        ) : isConversionMode ? (
          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-brand-slate dark:text-gray-400">Est. Revenue Value</p>
                  <p className="text-xl font-bold text-brand-charcoal dark:text-gray-100 mt-1">
                    {formatCurrency(metrics.estimated_total_revenue || 0)}
                  </p>
                  <p className="text-xs text-brand-slate dark:text-gray-400 mt-1">
                    Based on conversion values
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-gray-200 dark:border-gray-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-brand-slate dark:text-gray-400">Avg. Engagement Rate</p>
                  <p className="text-xl font-bold text-brand-charcoal dark:text-gray-100 mt-1">
                    {(metrics.avg_engagement_rate || 0).toFixed(2)}%
                  </p>
                  <p className="text-xs text-brand-slate dark:text-gray-400 mt-1">
                    {(metrics.total_comments || 0).toLocaleString(getIntlLocale(locale))} comments
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
