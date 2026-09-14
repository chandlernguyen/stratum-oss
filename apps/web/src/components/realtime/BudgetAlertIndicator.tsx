/**
 * Real-time Budget Alert Indicator
 *
 * Displays real-time budget alerts using Supabase Realtime subscriptions.
 * Shows critical budget thresholds and provides actionable recommendations.
 */

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Eye,
  Pause,
  Settings,
  X,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useBudgetAlerts } from '@/hooks/data/useRealtimeSubscriptions';
import { Card, CardContent } from '@/components/ui/card';
import { useLocale } from '@/hooks/useLocale';
import { getIntlLocale } from '@/lib/locales';

// =============================================================================
// TYPES
// =============================================================================

interface BudgetAlertIndicatorProps {
  campaignId?: string;
  showConnectionStatus?: boolean;
  onAlertAction?: (action: string, alertId: string) => void;
  className?: string;
}

interface AlertAction {
  type: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: 'default' | 'outline' | 'destructive' | 'secondary';
}

// =============================================================================
// COMPONENT
// =============================================================================

export function BudgetAlertIndicator({
  campaignId,
  showConnectionStatus = true,
  onAlertAction,
  className = ''
}: BudgetAlertIndicatorProps) {
  const { locale } = useLocale();
  const intlLocale = getIntlLocale(locale);
  const { latestAlert, isConnected, hasNewAlert, allAlerts } = useBudgetAlerts();

  // Filter alerts for specific campaign if provided
  const relevantAlert = campaignId
    ? allAlerts.find(alert => alert.data?.campaign_id === campaignId) || latestAlert
    : latestAlert;

  if (!relevantAlert && !showConnectionStatus) {
    return null;
  }

  // Determine alert variant based on severity
  const getAlertVariant = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      default: return 'default';
    }
  };

  // Get alert icon based on severity
  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return AlertTriangle;
      case 'high': return AlertTriangle;
      case 'medium': return DollarSign;
      default: return TrendingUp;
    }
  };

  // Get action buttons for the alert
  const getActionButtons = (alert: any): AlertAction[] => {
    const actions = alert.data?.actions || [];

    const defaultActions: AlertAction[] = [
      {
        type: 'view_campaign',
        label: 'View Campaign',
        icon: Eye,
        variant: 'outline'
      },
      {
        type: 'pause_campaign',
        label: 'Pause Campaign',
        icon: Pause,
        variant: 'secondary'
      },
      {
        type: 'adjust_budget',
        label: 'Adjust Budget',
        icon: Settings,
        variant: 'default'
      }
    ];

    // Merge API actions with defaults
    return actions.length > 0
      ? actions.map((action: any) => ({
          ...action,
          icon: defaultActions.find(da => da.type === action.type)?.icon || Settings,
          variant: 'outline' as const
        }))
      : defaultActions;
  };

  const handleAction = (action: string, alertId: string) => {
    console.log(`[BudgetAlert] Action triggered: ${action} for alert ${alertId}`);
    onAlertAction?.(action, alertId);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Connection Status */}
      {showConnectionStatus && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {isConnected ? (
            <>
              <Wifi className="h-4 w-4 text-green-500" />
              <span>Real-time alerts connected</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-orange-500" />
              <span>Real-time alerts disconnected</span>
            </>
          )}
        </div>
      )}

      {/* Budget Alert */}
      {relevantAlert && (
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <Alert variant={getAlertVariant(relevantAlert.severity)}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {React.createElement(getAlertIcon(relevantAlert.severity), {
                    className: "h-5 w-5 mt-0.5"
                  })}

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertTitle className="text-base font-semibold">
                        {relevantAlert.title}
                      </AlertTitle>
                      <Badge
                        variant={
                          relevantAlert.severity === 'critical' ? 'destructive' :
                          relevantAlert.severity === 'high' ? 'destructive' :
                          'secondary'
                        }
                      >
                        {relevantAlert.severity.toUpperCase()}
                      </Badge>
                      {hasNewAlert && (
                        <Badge variant="outline" className="animate-pulse">
                          NEW
                        </Badge>
                      )}
                    </div>

                    <AlertDescription className="text-sm">
                      {relevantAlert.message}
                    </AlertDescription>

                    {/* Budget Utilization Progress */}
                    {relevantAlert.data?.utilization && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Budget Utilization</span>
                          <span className="font-medium">
                            {Math.round(relevantAlert.data.utilization)}%
                          </span>
                        </div>
                        <Progress
                          value={relevantAlert.data.utilization}
                          className="h-2"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>
                            Spent: ${relevantAlert.data.spent?.toLocaleString(intlLocale) || '0'}
                          </span>
                          <span>
                            Budget: ${relevantAlert.data.budget?.toLocaleString(intlLocale) || '0'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Recommendations */}
                    {relevantAlert.data?.recommendations && relevantAlert.data.recommendations.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Recommendations:</p>
                        <ul className="text-sm space-y-1">
                          {relevantAlert.data.recommendations.map((rec: string, index: number) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-muted-foreground">•</span>
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {getActionButtons(relevantAlert).map((action) => (
                        <Button
                          key={action.type}
                          variant={action.variant}
                          size="sm"
                          onClick={() => handleAction(action.type, relevantAlert.id)}
                          className="flex items-center gap-2"
                        >
                          {action.icon && (
                            <action.icon className="h-4 w-4" />
                          )}
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Dismiss Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAction('dismiss', relevantAlert.id)}
                  className="flex-shrink-0 ml-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Debug Info (Development Only) */}
      {process.env.NODE_ENV === 'development' && relevantAlert && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">Debug Info</summary>
          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
            {JSON.stringify({
              alertId: relevantAlert.id,
              severity: relevantAlert.severity,
              campaignId: relevantAlert.data?.campaign_id,
              utilization: relevantAlert.data?.utilization,
              isConnected,
              hasNewAlert,
              timestamp: relevantAlert.created_at
            }, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

export default BudgetAlertIndicator;
