import { Activity, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRealtimeMetrics } from '@/hooks/useRealtimeMetrics'
import { cn } from '@/lib/utils'

interface CampaignHealthBarProps {
  campaignId?: string
  showDetails?: boolean
  className?: string
}

export function CampaignHealthBar({ 
  campaignId, 
  showDetails = true,
  className 
}: CampaignHealthBarProps) {
  const { metrics } = useRealtimeMetrics({ campaignId, mockData: true })

  if (!metrics) return null

  const getHealthScore = (): number => {
    // Calculate health score based on multiple factors
    let score = 0
    
    // ROI contribution (40%)
    if (metrics.roi >= 200) score += 40
    else if (metrics.roi >= 150) score += 35
    else if (metrics.roi >= 100) score += 30
    else if (metrics.roi >= 50) score += 20
    else score += 10
    
    // Conversion rate contribution (30%)
    if (metrics.conversionRate >= 5) score += 30
    else if (metrics.conversionRate >= 3) score += 25
    else if (metrics.conversionRate >= 2) score += 20
    else if (metrics.conversionRate >= 1) score += 15
    else score += 5
    
    // CTR contribution (20%)
    if (metrics.ctr >= 3) score += 20
    else if (metrics.ctr >= 2) score += 15
    else if (metrics.ctr >= 1) score += 10
    else score += 5
    
    // Budget efficiency (10%)
    if (metrics.budgetBurnRate <= 50) score += 10
    else if (metrics.budgetBurnRate <= 70) score += 8
    else if (metrics.budgetBurnRate <= 90) score += 5
    else score += 2
    
    return score
  }

  const healthScore = getHealthScore()
  
  const getHealthStatus = () => {
    if (healthScore >= 80) return { label: 'Excellent', color: 'green', icon: CheckCircle }
    if (healthScore >= 60) return { label: 'Good', color: 'amber', icon: Activity }
    if (healthScore >= 40) return { label: 'Warning', color: 'amber', icon: AlertTriangle }
    return { label: 'Critical', color: 'red', icon: XCircle }
  }

  const healthStatus = getHealthStatus()
  const HealthIcon = healthStatus.icon

  const getProgressColor = () => {
    if (healthScore >= 80) return 'bg-green-500'
    if (healthScore >= 60) return 'bg-amber-500'
    if (healthScore >= 40) return 'bg-amber-500'
    return 'bg-red-500'
  }

  if (!showDetails) {
    // Compact version for header/sidebar
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <div className="flex items-center gap-2">
          <HealthIcon className={cn(
            "w-5 h-5",
            healthStatus.color === 'green' && "text-brand-success",
            healthStatus.color === 'amber' && "text-brand-gold dark:text-amber-400",
            healthStatus.color === 'red' && "text-brand-error"
          )} />
          <span className="text-sm font-medium">Campaign Health</span>
        </div>
        <div className="flex-1 max-w-[200px]">
          <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={cn("h-full transition-all", getProgressColor())}
              style={{ width: `${healthScore}%` }}
            />
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "text-xs",
            healthStatus.color === 'green' && "border-brand-success text-brand-success",
            healthStatus.color === 'amber' && "border-brand-gold text-brand-gold dark:border-amber-400 dark:text-amber-400",
            healthStatus.color === 'red' && "border-brand-error text-brand-error"
          )}
        >
          {healthScore}%
        </Badge>
      </div>
    )
  }

  // Full card version
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Campaign Health Monitor
          </div>
          <Badge
            className={cn(
              healthStatus.color === 'green' && "bg-green-100 text-brand-success",
              healthStatus.color === 'amber' && "bg-amber-100 text-brand-gold dark:bg-amber-900/30 dark:text-amber-400",
              healthStatus.color === 'red' && "bg-red-100 text-brand-error"
            )}
          >
            {healthStatus.label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Overall Health Score */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-brand-slate">Overall Score</span>
            <span className="text-2xl font-bold">{healthScore}%</span>
          </div>
          <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={cn("h-full transition-all", getProgressColor())}
              style={{ width: `${healthScore}%` }}
            />
          </div>
        </div>

        {/* Individual Metrics */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-brand-slate">ROI Performance</span>
              <span className="text-xs font-medium">{metrics.roi.toFixed(1)}%</span>
            </div>
            <div className="relative h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-gold transition-all"
                style={{ width: `${Math.min(100, (metrics.roi / 200) * 100)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-brand-slate">Conversion Rate</span>
              <span className="text-xs font-medium">{metrics.conversionRate}%</span>
            </div>
            <div className="relative h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-slate-500 transition-all"
                style={{ width: `${Math.min(100, (metrics.conversionRate / 5) * 100)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-brand-slate">Click-Through Rate</span>
              <span className="text-xs font-medium">{metrics.ctr}%</span>
            </div>
            <div className="relative h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all"
                style={{ width: `${Math.min(100, (metrics.ctr / 3) * 100)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-brand-slate">Budget Efficiency</span>
              <span className="text-xs font-medium">{100 - metrics.budgetBurnRate}%</span>
            </div>
            <div className="relative h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all"
                style={{ width: `${100 - metrics.budgetBurnRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {healthScore < 60 && (
          <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
            <p className="text-xs font-medium text-brand-warning mb-1">
              Improvement Suggestions:
            </p>
            <ul className="text-xs text-brand-warning space-y-1">
              {metrics.roi < 100 && (
                <li>• Review targeting to improve ROI</li>
              )}
              {metrics.conversionRate < 2 && (
                <li>• Optimize landing pages for better conversions</li>
              )}
              {metrics.ctr < 1 && (
                <li>• Test new ad creatives to boost CTR</li>
              )}
              {metrics.budgetBurnRate > 80 && (
                <li>• Adjust budget pacing to improve efficiency</li>
              )}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}