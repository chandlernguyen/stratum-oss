import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  BarChart3, TrendingUp, Target, Users, DollarSign,
  Activity, Eye, MousePointer, Clock, ArrowUpRight
} from 'lucide-react'
import { useLocale } from '@/hooks/useLocale'
import { renderValue } from '../shared/ViewerUtils'
import { GenericViewer } from './GenericViewer'

interface AnalyticsViewerProps {
  content: any
  hasStructuredData: boolean
}

export function AnalyticsViewer({ content, hasStructuredData }: AnalyticsViewerProps) {
  const { formatNumber } = useLocale()
  // Handle empty or invalid content
  if (!content || (typeof content === 'object' && Object.keys(content).length === 0)) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No analytics data available</p>
      </div>
    )
  }

  // Handle string content
  if (typeof content === 'string') {
    return (
      <div className="prose prose-sm max-w-none">
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    )
  }

  // Check if this looks like analytics data
  const hasAnalyticsData = content.metrics || content.performance || content.kpis ||
                          content.conversion_rate || content.traffic || content.engagement ||
                          content.analytics_summary || content.reports

  // Fallback for unknown formats
  if (!hasAnalyticsData) {
    return <GenericViewer content={content} hasStructuredData={hasStructuredData} />
  }

  return (
    <div className="space-y-6">
      {hasStructuredData && (
        <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
          <Badge variant="outline" className="bg-emerald-100 border-emerald-300 text-emerald-700">
            Enhanced Analytics Data
          </Badge>
          <span className="text-xs">AI-structured performance insights</span>
        </div>
      )}

      {/* Analytics Header */}
      {(content.report_title || content.analytics_summary || content.period) && (
        <Card className="border-l-4 border-l-emerald-500 bg-gradient-to-r from-emerald-50 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <BarChart3 className="w-6 h-6 text-emerald-600" />
              {content.report_title || 'Analytics Report'}
            </CardTitle>
            {content.analytics_summary && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {content.analytics_summary}
              </p>
            )}
            {content.period && (
              <Badge variant="outline" className="w-fit">
                {content.period}
              </Badge>
            )}
          </CardHeader>
        </Card>
      )}

      {/* Key Metrics Row */}
      <KeyMetricsSection content={content} formatNumber={formatNumber} />

      {/* Main Analytics Content */}
      <Tabs defaultValue="performance" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="traffic">Traffic</TabsTrigger>
          <TabsTrigger value="conversion">Conversion</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="mt-6 space-y-4">
          <PerformanceSection content={content} />
        </TabsContent>

        <TabsContent value="traffic" className="mt-6 space-y-4">
          <TrafficSection content={content} />
        </TabsContent>

        <TabsContent value="conversion" className="mt-6 space-y-4">
          <ConversionSection content={content} />
        </TabsContent>

        <TabsContent value="insights" className="mt-6 space-y-4">
          <InsightsSection content={content} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Key Metrics Dashboard Section
function KeyMetricsSection({
  content,
  formatNumber,
}: {
  content: any
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string
}) {
  const metrics = content.metrics || content.kpis || {}

  // Common metric fields with fallbacks
  const pageViews = metrics.page_views || metrics.views || content.page_views
  const conversionRate = metrics.conversion_rate || content.conversion_rate
  const bounceRate = metrics.bounce_rate || content.bounce_rate
  const avgSessionDuration = metrics.avg_session_duration || content.avg_session_duration

  if (!pageViews && !conversionRate && !bounceRate && !avgSessionDuration) {
    return null
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {pageViews && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Page Views</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {typeof pageViews === 'number' ? formatNumber(pageViews) : pageViews}
                </p>
              </div>
              <Eye className="w-8 h-8 text-emerald-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
      )}

      {conversionRate && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold text-slate-600 dark:text-slate-400">
                  {typeof conversionRate === 'number' ? `${conversionRate}%` : conversionRate}
                </p>
              </div>
              <Target className="w-8 h-8 text-slate-500 opacity-60 dark:text-slate-400" />
            </div>
          </CardContent>
        </Card>
      )}

      {bounceRate && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Bounce Rate</p>
                <p className="text-2xl font-bold text-orange-600">
                  {typeof bounceRate === 'number' ? `${bounceRate}%` : bounceRate}
                </p>
              </div>
              <MousePointer className="w-8 h-8 text-orange-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
      )}

      {avgSessionDuration && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg. Session</p>
                <p className="text-2xl font-bold text-amber-600">
                  {avgSessionDuration}
                </p>
              </div>
              <Clock className="w-8 h-8 text-amber-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Performance Metrics Section
function PerformanceSection({ content }: { content: any }) {
  return (
    <div className="space-y-4">
      {/* Performance Overview */}
      {content.performance && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="w-4 h-4 text-emerald-500" />
              Performance Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderValue(content.performance)}
          </CardContent>
        </Card>
      )}

      {/* Key Performance Indicators */}
      {content.kpis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              Key Performance Indicators
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderValue(content.kpis)}
          </CardContent>
        </Card>
      )}

      {/* Growth Trends */}
      {content.trends && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-4 h-4 text-green-500" />
              Growth Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderValue(content.trends)}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Traffic Analysis Section
function TrafficSection({ content }: { content: any }) {
  return (
    <div className="space-y-4">
      {/* Traffic Sources */}
      {content.traffic && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-4 h-4 text-indigo-500" />
              Traffic Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderValue(content.traffic)}
          </CardContent>
        </Card>
      )}

      {/* Channel Performance */}
      {content.channels && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="w-4 h-4 text-amber-500" />
              Channel Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderValue(content.channels)}
          </CardContent>
        </Card>
      )}

      {/* User Behavior */}
      {content.user_behavior && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MousePointer className="w-4 h-4 text-orange-500" />
              User Behavior
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderValue(content.user_behavior)}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Conversion Analytics Section
function ConversionSection({ content }: { content: any }) {
  return (
    <div className="space-y-4">
      {/* Conversion Funnel */}
      {content.conversion_funnel && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="w-4 h-4 text-green-500" />
              Conversion Funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderValue(content.conversion_funnel)}
          </CardContent>
        </Card>
      )}

      {/* Revenue Analytics */}
      {content.revenue && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="w-4 h-4 text-green-500" />
              Revenue Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderValue(content.revenue)}
          </CardContent>
        </Card>
      )}

      {/* Goal Completions */}
      {content.goals && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowUpRight className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              Goal Completions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderValue(content.goals)}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Insights and Recommendations Section
function InsightsSection({ content }: { content: any }) {
  return (
    <div className="space-y-4">
      {/* Key Insights */}
      {content.insights && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Key Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Array.isArray(content.insights) ? (
              <ul className="space-y-2">
                {content.insights.map((insight: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <ArrowUpRight className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            ) : (
              renderValue(content.insights)
            )}
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {content.recommendations && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Array.isArray(content.recommendations) ? (
              <ul className="space-y-2">
                {content.recommendations.map((rec: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Target className="w-4 h-4 text-slate-600 dark:text-slate-400 mt-0.5 flex-shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            ) : (
              renderValue(content.recommendations)
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Items */}
      {content.action_items && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="w-4 h-4 text-orange-500" />
              Action Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Array.isArray(content.action_items) ? (
              <ul className="space-y-2">
                {content.action_items.map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Activity className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              renderValue(content.action_items)
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
