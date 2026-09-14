import { useEffect } from 'react'
import { AlertCircle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useRealtimeMetrics } from '@/hooks/useRealtimeMetrics'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/hooks/useLocale'
import { getIntlLocale } from '@/lib/locales'

interface MetricsAlertsProps {
  campaignId?: string
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  className?: string
}

export function MetricsAlerts({ 
  campaignId, 
  position = 'top-right',
  className 
}: MetricsAlertsProps) {
  const { locale } = useLocale()
  const intlLocale = getIntlLocale(locale)
  const { alerts, dismissAlert } = useRealtimeMetrics({ campaignId, mockData: true })

  // Auto-dismiss alerts after 5 seconds
  useEffect(() => {
    if (alerts.length > 0) {
      const timer = setTimeout(() => {
        dismissAlert(alerts[0].id)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [alerts, dismissAlert])

  if (alerts.length === 0) return null

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4'
      case 'bottom-left':
        return 'bottom-4 left-4'
      case 'bottom-right':
        return 'bottom-20 right-4' // Above ROI widget
      default:
        return 'top-20 right-4' // Below header
    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5" />
      case 'warning':
        return <AlertCircle className="w-5 h-5" />
      case 'error':
        return <XCircle className="w-5 h-5" />
      default:
        return <Info className="w-5 h-5" />
    }
  }

  const getAlertStyles = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800'
      case 'warning':
        return 'bg-amber-50 border-amber-200 text-amber-800'
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800'
      default:
        return 'bg-amber-50 border-amber-200 text-amber-800'
    }
  }

  return (
    <div className={cn(
      "fixed z-50 space-y-2",
      getPositionClasses(),
      className
    )}>
      {alerts.map((alert, index) => (
        <div
          key={alert.id}
          className={cn(
            "flex items-start gap-3 p-4 rounded-lg border shadow-lg max-w-sm",
            "animate-in slide-in-from-right duration-300",
            getAlertStyles(alert.type),
            index > 0 && "opacity-90 scale-95" // Stack effect
          )}
        >
          <div className="flex-shrink-0">
            {getAlertIcon(alert.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{alert.title}</p>
            <p className="text-xs mt-1 opacity-90">{alert.message}</p>
            <p className="text-xs mt-2 opacity-60">
              {new Date(alert.timestamp).toLocaleTimeString(intlLocale)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0"
            onClick={() => dismissAlert(alert.id)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ))}
    </div>
  )
}
