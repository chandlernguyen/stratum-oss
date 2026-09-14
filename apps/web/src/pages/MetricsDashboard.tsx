import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FloatingROIWidget } from '@/components/metrics/FloatingROIWidget'
import { CampaignHealthBar } from '@/components/metrics/CampaignHealthBar'
import { MetricsAlerts } from '@/components/metrics/MetricsAlerts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useRealtimeMetrics } from '@/hooks/useRealtimeMetrics'
import { getIntlLocale } from '@/lib/locales'
import {
  Activity,
  DollarSign,
  TrendingUp,
  Users,
  MousePointer,
  Eye,
  Zap,
  Target
} from 'lucide-react'
import { LineChart, Line, AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'

export function MetricsDashboard() {
  const { t, i18n } = useTranslation('metrics')
  const intlLocale = getIntlLocale(i18n.language)
  const { metrics } = useRealtimeMetrics({ mockData: true })
  const [showROIWidget, setShowROIWidget] = useState(true)

  if (!metrics) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
      </div>
    )
  }

  // Generate mock time series data
  const timeSeriesData = metrics.history.map((value, index) => ({
    time: `${index * 5}m`,
    roi: value,
    conversions: Math.floor(Math.random() * 100 + 50),
    spend: Math.floor(Math.random() * 1000 + 500)
  }))

  const metricsCards = [
    {
      title: t('cards.totalROI'),
      value: `${metrics.roi}%`,
      change: metrics.roiTrend,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: t('cards.conversions'),
      value: metrics.conversions.toLocaleString(intlLocale),
      change: 'up',
      icon: Target,
      color: 'text-slate-600',
      bgColor: 'bg-slate-50'
    },
    {
      title: t('cards.conversionRate'),
      value: `${metrics.conversionRate}%`,
      change: metrics.conversionRate > 3 ? 'up' : 'stable',
      icon: Users,
      color: 'text-amber-600',
      bgColor: 'bg-slate-50'
    },
    {
      title: t('cards.clickThroughRate'),
      value: `${metrics.ctr}%`,
      change: metrics.ctr > 2 ? 'up' : 'down',
      icon: MousePointer,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: t('cards.impressions'),
      value: (metrics.impressions / 1000).toFixed(1) + 'K',
      change: 'up',
      icon: Eye,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    },
    {
      title: t('cards.budgetRemaining'),
      value: `$${metrics.budgetRemaining.toLocaleString(intlLocale)}`,
      change: metrics.budgetBurnRate > 80 ? 'down' : 'stable',
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50'
    }
  ]

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <Activity className="w-8 h-8 text-slate-600 dark:text-slate-400" />
              {t('title')}
            </h1>
            <p className="text-muted-foreground">
              {t('subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-green-600 text-white animate-pulse">
              <Zap className="w-3 h-3 mr-1" />
              {t('live')}
            </Badge>
            <Button
              variant="outline"
              onClick={() => setShowROIWidget(!showROIWidget)}
            >
              {showROIWidget ? t('widget.hide') : t('widget.show')}
            </Button>
          </div>
        </div>
      </div>

      {/* Campaign Health Bar */}
      <div className="mb-6">
        <CampaignHealthBar showDetails={false} className="bg-white p-4 rounded-lg shadow-sm" />
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {metricsCards.map((metric) => {
          const Icon = metric.icon
          return (
            <Card key={metric.title} className="hover:shadow-lg transition-all">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                    <Icon className={`w-4 h-4 ${metric.color}`} />
                  </div>
                  {metric.change === 'up' && (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  )}
                  {metric.change === 'down' && (
                    <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{metric.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{metric.title}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* ROI Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t('charts.roiTrend.title')}</CardTitle>
            <CardDescription>{t('charts.roiTrend.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="roi" 
                    stroke="#3B82F6" 
                    fill="#3B82F6" 
                    fillOpacity={0.2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Conversions Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t('charts.conversionsSpend.title')}</CardTitle>
            <CardDescription>{t('charts.conversionsSpend.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="conversions"
                    stroke="#10B981"
                    strokeWidth={2}
                    name={t('charts.legends.conversions')}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="spend"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    name={t('charts.legends.spend')}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Health Monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CampaignHealthBar showDetails={true} />
        </div>
        <div>
          <Card>
            <CardHeader>
              <CardTitle>{t('agents.title')}</CardTitle>
              <CardDescription>{t('agents.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics.activeAgents.map(agent => (
                  <div key={agent} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-sm font-medium capitalize">{agent}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {t('agents.status')}
                    </Badge>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <p className="text-xs text-amber-900 dark:text-amber-100">
                  <strong>Tip:</strong> {t('agents.tip')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Floating Widgets */}
      {showROIWidget && <FloatingROIWidget />}
      <MetricsAlerts position="top-right" />
    </div>
  )
}
