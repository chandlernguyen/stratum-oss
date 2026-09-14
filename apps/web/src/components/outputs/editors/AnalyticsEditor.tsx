import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart3, TrendingUp } from 'lucide-react'

interface AnalyticsEditorProps {
  content: any
  onChange: (updatedContent: any) => void
}

export function AnalyticsEditor({ content, onChange }: AnalyticsEditorProps) {
  const { t } = useTranslation(['outputs', 'common'])
  const [editedContent, setEditedContent] = useState(content)

  const handleFieldChange = (field: string, value: any) => {
    const updated = { ...editedContent, [field]: value }
    setEditedContent(updated)
    onChange(updated)
  }

  const handleNestedFieldChange = (parent: string, field: string, value: any) => {
    const updated = {
      ...editedContent,
      [parent]: {
        ...editedContent[parent],
        [field]: value
      }
    }
    setEditedContent(updated)
    onChange(updated)
  }

  const handleArrayFieldChange = (field: string, value: string) => {
    const arrayValue = value.split(',').map(v => v.trim()).filter(v => v)
    handleFieldChange(field, arrayValue)
  }

  return (
    <div className="space-y-6">
      {/* Analytics Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            {t('editors.analytics.reportInfo')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="report-title">{t('editors.analytics.reportTitle')}</Label>
            <Input
              id="report-title"
              value={editedContent.report_title || ''}
              onChange={(e) => handleFieldChange('report_title', e.target.value)}
              placeholder={t('editors.analytics.reportTitlePlaceholder')}
            />
          </div>
          <div>
            <Label htmlFor="analytics-summary">{t('editors.analytics.analyticsSummary')}</Label>
            <Textarea
              id="analytics-summary"
              value={editedContent.analytics_summary || ''}
              onChange={(e) => handleFieldChange('analytics_summary', e.target.value)}
              placeholder={t('editors.analytics.analyticsSummaryPlaceholder')}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="period">{t('editors.analytics.reportPeriod')}</Label>
              <Input
                id="period"
                value={editedContent.period || ''}
                onChange={(e) => handleFieldChange('period', e.target.value)}
                placeholder={t('editors.analytics.reportPeriodPlaceholder')}
              />
            </div>
            <div>
              <Label htmlFor="target-audience">{t('editors.analytics.targetAudience')}</Label>
              <Input
                id="target-audience"
                value={editedContent.target_audience || ''}
                onChange={(e) => handleFieldChange('target_audience', e.target.value)}
                placeholder={t('editors.analytics.targetAudiencePlaceholder')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Content */}
      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="metrics" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="metrics">{t('editors.analytics.tabs.keyMetrics')}</TabsTrigger>
              <TabsTrigger value="performance">{t('editors.analytics.tabs.performance')}</TabsTrigger>
              <TabsTrigger value="traffic">{t('editors.analytics.tabs.traffic')}</TabsTrigger>
              <TabsTrigger value="insights">{t('editors.analytics.tabs.insights')}</TabsTrigger>
            </TabsList>

            <TabsContent value="metrics" className="mt-6 space-y-4">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="page-views">{t('editors.analytics.pageViews')}</Label>
                  <Input
                    id="page-views"
                    type="number"
                    value={editedContent.metrics?.page_views || editedContent.page_views || ''}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0
                      if (editedContent.metrics) {
                        handleNestedFieldChange('metrics', 'page_views', value)
                      } else {
                        handleFieldChange('page_views', value)
                      }
                    }}
                    placeholder="10000"
                  />
                </div>
                <div>
                  <Label htmlFor="conversion-rate">{t('editors.analytics.conversionRate')}</Label>
                  <Input
                    id="conversion-rate"
                    type="number"
                    step="0.1"
                    value={editedContent.metrics?.conversion_rate || editedContent.conversion_rate || ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0
                      if (editedContent.metrics) {
                        handleNestedFieldChange('metrics', 'conversion_rate', value)
                      } else {
                        handleFieldChange('conversion_rate', value)
                      }
                    }}
                    placeholder="2.5"
                  />
                </div>
                <div>
                  <Label htmlFor="bounce-rate">{t('editors.analytics.bounceRate')}</Label>
                  <Input
                    id="bounce-rate"
                    type="number"
                    step="0.1"
                    value={editedContent.metrics?.bounce_rate || editedContent.bounce_rate || ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0
                      if (editedContent.metrics) {
                        handleNestedFieldChange('metrics', 'bounce_rate', value)
                      } else {
                        handleFieldChange('bounce_rate', value)
                      }
                    }}
                    placeholder="35.2"
                  />
                </div>
                <div>
                  <Label htmlFor="avg-session">{t('editors.analytics.avgSession')}</Label>
                  <Input
                    id="avg-session"
                    value={editedContent.metrics?.avg_session_duration || editedContent.avg_session_duration || ''}
                    onChange={(e) => {
                      if (editedContent.metrics) {
                        handleNestedFieldChange('metrics', 'avg_session_duration', e.target.value)
                      } else {
                        handleFieldChange('avg_session_duration', e.target.value)
                      }
                    }}
                    placeholder="2m 45s"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="performance" className="mt-6 space-y-4">
              <div>
                <Label htmlFor="performance-overview">{t('editors.analytics.performanceOverview')}</Label>
                <Textarea
                  id="performance-overview"
                  value={typeof editedContent.performance === 'string'
                    ? editedContent.performance
                    : JSON.stringify(editedContent.performance || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value)
                      handleFieldChange('performance', parsed)
                    } catch {
                      // If not valid JSON, store as string
                      handleFieldChange('performance', e.target.value)
                    }
                  }}
                  placeholder={t('editors.analytics.performanceOverviewPlaceholder')}
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="kpis">{t('editors.analytics.kpis')}</Label>
                <Textarea
                  id="kpis"
                  value={typeof editedContent.kpis === 'string'
                    ? editedContent.kpis
                    : JSON.stringify(editedContent.kpis || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value)
                      handleFieldChange('kpis', parsed)
                    } catch {
                      handleFieldChange('kpis', e.target.value)
                    }
                  }}
                  placeholder={t('editors.analytics.kpisPlaceholder')}
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="trends">{t('editors.analytics.growthTrends')}</Label>
                <Textarea
                  id="trends"
                  value={typeof editedContent.trends === 'string'
                    ? editedContent.trends
                    : JSON.stringify(editedContent.trends || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value)
                      handleFieldChange('trends', parsed)
                    } catch {
                      handleFieldChange('trends', e.target.value)
                    }
                  }}
                  placeholder={t('editors.analytics.growthTrendsPlaceholder')}
                  rows={3}
                />
              </div>
            </TabsContent>

            <TabsContent value="traffic" className="mt-6 space-y-4">
              <div>
                <Label htmlFor="traffic-analysis">{t('editors.analytics.trafficAnalysis')}</Label>
                <Textarea
                  id="traffic-analysis"
                  value={typeof editedContent.traffic === 'string'
                    ? editedContent.traffic
                    : JSON.stringify(editedContent.traffic || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value)
                      handleFieldChange('traffic', parsed)
                    } catch {
                      handleFieldChange('traffic', e.target.value)
                    }
                  }}
                  placeholder={t('editors.analytics.trafficAnalysisPlaceholder')}
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="channels">{t('editors.analytics.channelPerformance')}</Label>
                <Textarea
                  id="channels"
                  value={typeof editedContent.channels === 'string'
                    ? editedContent.channels
                    : JSON.stringify(editedContent.channels || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value)
                      handleFieldChange('channels', parsed)
                    } catch {
                      handleFieldChange('channels', e.target.value)
                    }
                  }}
                  placeholder={t('editors.analytics.channelPerformancePlaceholder')}
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="user-behavior">{t('editors.analytics.userBehavior')}</Label>
                <Textarea
                  id="user-behavior"
                  value={typeof editedContent.user_behavior === 'string'
                    ? editedContent.user_behavior
                    : JSON.stringify(editedContent.user_behavior || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value)
                      handleFieldChange('user_behavior', parsed)
                    } catch {
                      handleFieldChange('user_behavior', e.target.value)
                    }
                  }}
                  placeholder={t('editors.analytics.userBehaviorPlaceholder')}
                  rows={3}
                />
              </div>
            </TabsContent>

            <TabsContent value="insights" className="mt-6 space-y-4">
              <div>
                <Label htmlFor="insights">{t('editors.analytics.keyInsights')}</Label>
                <Textarea
                  id="insights"
                  value={Array.isArray(editedContent.insights)
                    ? editedContent.insights.join(', ')
                    : (typeof editedContent.insights === 'string' ? editedContent.insights : '')}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value.includes(',')) {
                      // Treat as comma-separated list
                      handleArrayFieldChange('insights', value)
                    } else {
                      // Treat as single string
                      handleFieldChange('insights', value)
                    }
                  }}
                  placeholder={t('editors.analytics.keyInsightsPlaceholder')}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="recommendations">{t('editors.analytics.recommendations')}</Label>
                <Textarea
                  id="recommendations"
                  value={Array.isArray(editedContent.recommendations)
                    ? editedContent.recommendations.join(', ')
                    : (typeof editedContent.recommendations === 'string' ? editedContent.recommendations : '')}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value.includes(',')) {
                      handleArrayFieldChange('recommendations', value)
                    } else {
                      handleFieldChange('recommendations', value)
                    }
                  }}
                  placeholder={t('editors.analytics.recommendationsPlaceholder')}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="action-items">{t('editors.analytics.actionItems')}</Label>
                <Textarea
                  id="action-items"
                  value={Array.isArray(editedContent.action_items)
                    ? editedContent.action_items.join(', ')
                    : (typeof editedContent.action_items === 'string' ? editedContent.action_items : '')}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value.includes(',')) {
                      handleArrayFieldChange('action_items', value)
                    } else {
                      handleFieldChange('action_items', value)
                    }
                  }}
                  placeholder={t('editors.analytics.actionItemsPlaceholder')}
                  rows={3}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Advanced Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            {t('editors.common.advancedSettings')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="raw-json">{t('editors.common.completeJson')}</Label>
            <Textarea
              id="raw-json"
              value={JSON.stringify(editedContent, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value)
                  setEditedContent(parsed)
                  onChange(parsed)
                } catch {
                  // Invalid JSON, don't update
                }
              }}
              rows={12}
              className="font-mono text-xs"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}