/**
 * Real-time Metrics Widget
 *
 * Displays live campaign metrics with real-time updates from Supabase.
 * Shows budget utilization, performance scores, and connection status.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  Target,
  Activity,
  RefreshCw,
  Wifi,
  WifiOff,
  AlertTriangle
} from 'lucide-react';
import { useRealtimeMetrics } from '@/hooks/useRealtimeMetrics';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocale } from '@/hooks/useLocale';
import { getIntlLocale } from '@/lib/locales';

// =============================================================================
// TYPES
// =============================================================================

interface RealtimeMetricsWidgetProps {
  campaignId?: string;
  enableRealtime?: boolean;
  mockData?: boolean;
  showDebugInfo?: boolean;
  className?: string;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down' | 'stable';
  variant?: 'default' | 'success' | 'warning' | 'destructive';
  progress?: number;
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  progress
}: MetricCardProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'success': return 'border-green-200 bg-green-50';
      case 'warning': return 'border-orange-200 bg-orange-50';
      case 'destructive': return 'border-red-200 bg-red-50';
      default: return '';
    }
  };

  return (
    <Card className={`${getVariantStyles()}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              {title}
            </span>
          </div>
          {trend && getTrendIcon()}
        </div>

        <div className="mt-2">
          <div className="text-2xl font-bold">{value}</div>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>

        {progress !== undefined && (
          <div className="mt-3">
            <Progress value={progress} className="h-2" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function RealtimeMetricsWidget({
  campaignId,
  enableRealtime = true,
  mockData = false,
  showDebugInfo = false,
  className = ''
}: RealtimeMetricsWidgetProps) {
  const { locale } = useLocale();
  const intlLocale = getIntlLocale(locale);
  const {
    metrics,
    alerts,
    isConnected,
    isLoading,
    error,
    refetch,
    realtimeStatus
  } = useRealtimeMetrics({
    campaignId,
    enableRealtime,
    mockData
  });

  // Handle loading state
  if (isLoading && !metrics) {
    return <LoadingSkeleton />;
  }

  // Handle error state
  if (error && !metrics) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">Error loading metrics</span>
          </div>
          <p className="text-sm text-red-600 mt-1">
            {error.message || 'Failed to fetch real-time metrics'}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="mt-2"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Handle no data state
  if (!metrics) {
    return (
      <Card>
        <CardContent className="p-4 text-center">
          <p className="text-muted-foreground">No metrics available</p>
          {campaignId && (
            <p className="text-sm text-muted-foreground mt-1">
              Campaign: {campaignId}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(intlLocale, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getHealthVariant = (health: string) => {
    switch (health) {
      case 'critical': return 'destructive';
      case 'warning': return 'warning';
      case 'healthy': return 'success';
      default: return 'default';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Connection Status */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Real-time Metrics</h3>
          {metrics.lastUpdate && (
            <p className="text-sm text-muted-foreground">
              Last updated: {metrics.lastUpdate.toLocaleTimeString(intlLocale)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <Wifi className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-600">Live</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-orange-500" />
                <span className="text-sm text-orange-600">Offline</span>
              </>
            )}
          </div>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* ROI */}
        <MetricCard
          title="ROI"
          value={`${metrics.roi}%`}
          subtitle="Return on Investment"
          icon={TrendingUp}
          trend={metrics.roiTrend}
          variant={metrics.roi > 100 ? 'success' : metrics.roi > 50 ? 'default' : 'warning'}
        />

        {/* Budget Burn Rate */}
        <MetricCard
          title="Budget Utilization"
          value={`${Math.round(metrics.budgetBurnRate)}%`}
          subtitle={formatCurrency(metrics.budgetRemaining) + ' remaining'}
          icon={DollarSign}
          variant={
            metrics.budgetBurnRate >= 90 ? 'destructive' :
            metrics.budgetBurnRate >= 75 ? 'warning' : 'default'
          }
          progress={metrics.budgetBurnRate}
        />

        {/* Campaign Health */}
        <MetricCard
          title="Campaign Health"
          value={metrics.campaignHealth.charAt(0).toUpperCase() + metrics.campaignHealth.slice(1)}
          subtitle="Overall performance"
          icon={Activity}
          variant={getHealthVariant(metrics.campaignHealth)}
        />

        {/* Conversion Rate */}
        <MetricCard
          title="Conversion Rate"
          value={`${metrics.conversionRate}%`}
          subtitle={`${metrics.conversions.toLocaleString(intlLocale)} conversions`}
          icon={Target}
          trend={metrics.conversionRate > 3 ? 'up' : metrics.conversionRate < 1 ? 'down' : 'stable'}
        />
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Active Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.slice(0, 3).map((alert) => (
              <div
                key={alert.id}
                className="flex items-start justify-between p-3 bg-muted rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={
                      alert.type === 'error' ? 'destructive' :
                      alert.type === 'warning' ? 'secondary' : 'default'
                    }>
                      {alert.type}
                    </Badge>
                    <span className="font-medium text-sm">{alert.title}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{alert.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {alert.timestamp.toLocaleTimeString(intlLocale)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Debug Information */}
      {showDebugInfo && process.env.NODE_ENV === 'development' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-3 rounded overflow-auto">
              {JSON.stringify({
                campaignId,
                isConnected,
                isLoading,
                hasError: !!error,
                enableRealtime,
                mockData,
                realtimeStatus,
                metricsLastUpdate: metrics?.lastUpdate,
                alertsCount: alerts.length
              }, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default RealtimeMetricsWidget;
