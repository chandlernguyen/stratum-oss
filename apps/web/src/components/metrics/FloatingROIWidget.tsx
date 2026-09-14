import { useState } from 'react'
import { TrendingUp, TrendingDown, Minus, X, Maximize2, Minimize2 } from 'lucide-react'
import { useRealtimeMetrics } from '@/hooks/useRealtimeMetrics'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'
import { useLocale } from '@/hooks/useLocale'
import { getIntlLocale } from '@/lib/locales'

interface FloatingROIWidgetProps {
  campaignId?: string
  className?: string
}

export function FloatingROIWidget({ campaignId, className }: FloatingROIWidgetProps) {
  const { locale } = useLocale()
  const intlLocale = getIntlLocale(locale)
  const { metrics } = useRealtimeMetrics({ campaignId, mockData: true })
  const [isMinimized, setIsMinimized] = useState(false)
  const [isHidden, setIsHidden] = useState(false)

  if (isHidden || !metrics) return null

  // Prepare data for sparkline
  const sparklineData = metrics.history.map((value, index) => ({
    index,
    value
  }))

  const getTrendIcon = () => {
    switch (metrics.roiTrend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-brand-success" />
      case 'down':
        return <TrendingDown className="w-4 h-4 text-brand-error" />
      default:
        return <Minus className="w-4 h-4 text-brand-slate" />
    }
  }

  const getHealthColor = () => {
    switch (metrics.campaignHealth) {
      case 'healthy':
        return 'text-brand-success bg-green-50 border-green-200'
      case 'warning':
        return 'text-brand-warning bg-amber-50 border-amber-200'
      case 'critical':
        return 'text-brand-error bg-red-50 border-red-200'
      default:
        return 'text-brand-slate bg-gray-50 border-gray-200'
    }
  }

  if (isMinimized) {
    return (
      <div className={cn(
        "fixed bottom-4 right-4 z-50",
        className
      )}>
        <Card className={cn(
          "shadow-lg border-2 cursor-pointer hover:shadow-xl transition-all",
          getHealthColor()
        )}
        onClick={() => setIsMinimized(false)}
        >
          <div className="p-3 flex items-center gap-3">
            <div className="flex items-center gap-2">
              {getTrendIcon()}
              <span className="font-bold text-lg">{metrics.roi.toFixed(1)}%</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation()
                setIsMinimized(false)
              }}
            >
              <Maximize2 className="w-3 h-3" />
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn(
      "fixed bottom-4 right-4 z-50",
      className
    )}>
      <Card className={cn(
        "shadow-xl border-2 w-80",
        getHealthColor()
      )}>
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-brand-gold">
              LIVE
            </Badge>
            <span className="text-sm font-medium">Campaign Performance</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsMinimized(true)}
            >
              <Minimize2 className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsHidden(true)}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Main ROI Display */}
        <div className="p-4">
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-xs text-brand-slate mb-1">Current ROI</p>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold">
                  {metrics.roi.toFixed(1)}%
                </span>
                {getTrendIcon()}
              </div>
            </div>
            <div className="text-right">
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs",
                  metrics.campaignHealth === 'healthy' && "border-brand-success text-brand-success",
                  metrics.campaignHealth === 'warning' && "border-brand-warning text-brand-warning",
                  metrics.campaignHealth === 'critical' && "border-brand-error text-brand-error"
                )}
              >
                {metrics.campaignHealth}
              </Badge>
            </div>
          </div>

          {/* Sparkline */}
          <div className="h-12 mb-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparklineData}>
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke={metrics.roiTrend === 'up' ? '#10b981' : metrics.roiTrend === 'down' ? '#ef4444' : '#6b7280'}
                  strokeWidth={2}
                  dot={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0,0,0,0.8)', 
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 8px'
                  }}
                  labelStyle={{ display: 'none' }}
                  formatter={(value) => [`${Number(value).toFixed(1)}%`, 'ROI']}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-brand-slate">Conversions</p>
              <p className="font-semibold">{metrics.conversions.toLocaleString(intlLocale)}</p>
            </div>
            <div>
              <p className="text-brand-slate">Conv. Rate</p>
              <p className="font-semibold">{metrics.conversionRate}%</p>
            </div>
            <div>
              <p className="text-brand-slate">Budget Burn</p>
              <p className="font-semibold">{metrics.budgetBurnRate}%</p>
            </div>
            <div>
              <p className="text-brand-slate">CTR</p>
              <p className="font-semibold">{metrics.ctr}%</p>
            </div>
          </div>

          {/* Active Agents */}
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-brand-slate mb-2">Active Agents</p>
            <div className="flex gap-1 flex-wrap">
              {metrics.activeAgents.map(agent => (
                <Badge key={agent} variant="secondary" className="text-xs">
                  {agent}
                </Badge>
              ))}
            </div>
          </div>

          {/* Last Update */}
          <div className="mt-3 text-xs text-gray-400 text-center">
            Last updated: {new Date(metrics.lastUpdate).toLocaleTimeString(intlLocale)}
          </div>
        </div>
      </Card>
    </div>
  )
}
