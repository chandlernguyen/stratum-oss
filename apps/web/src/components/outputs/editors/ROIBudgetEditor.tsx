import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DollarSign, Calculator } from 'lucide-react'

interface ROIBudgetEditorProps {
  content: any
  onChange: (updatedContent: any) => void
}

export function ROIBudgetEditor({ content, onChange }: ROIBudgetEditorProps) {
  const { t } = useTranslation(['outputs', 'common'])
  const [editedContent, setEditedContent] = useState(content)

  const handleFieldChange = (field: string, value: any) => {
    const updated = { ...editedContent, [field]: value }
    setEditedContent(updated)
    onChange(updated)
  }


  const handleArrayFieldChange = (field: string, value: string) => {
    const arrayValue = value.split(',').map(v => v.trim()).filter(v => v)
    handleFieldChange(field, arrayValue)
  }

  return (
    <div className="space-y-6">
      {/* Financial Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-yellow-600" />
            {t('editors.roiBudget.financialReportInfo')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="report-title">Report Title</Label>
            <Input
              id="report-title"
              value={editedContent.report_title || ''}
              onChange={(e) => handleFieldChange('report_title', e.target.value)}
              placeholder="ROI & Budget Analysis Q4 2025"
            />
          </div>
          <div>
            <Label htmlFor="financial-summary">Financial Summary</Label>
            <Textarea
              id="financial-summary"
              value={editedContent.financial_summary || ''}
              onChange={(e) => handleFieldChange('financial_summary', e.target.value)}
              placeholder="Overview of financial performance and budget utilization"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="budget-period">Budget Period</Label>
              <Input
                id="budget-period"
                value={editedContent.budget_period || ''}
                onChange={(e) => handleFieldChange('budget_period', e.target.value)}
                placeholder="Q4 2025, Fiscal Year 2025, etc."
              />
            </div>
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                value={editedContent.currency || 'USD'}
                onChange={(e) => handleFieldChange('currency', e.target.value)}
                placeholder="USD"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Content */}
      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="budget" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="budget">{t('editors.roiBudget.tabs.budget')}</TabsTrigger>
              <TabsTrigger value="roi">{t('editors.roiBudget.tabs.roiAnalysis')}</TabsTrigger>
              <TabsTrigger value="performance">{t('editors.roiBudget.tabs.performance')}</TabsTrigger>
              <TabsTrigger value="projections">{t('editors.roiBudget.tabs.projections')}</TabsTrigger>
            </TabsList>

            <TabsContent value="budget" className="mt-6 space-y-4">
              {/* Key Budget Figures */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="total-budget">Total Budget ($)</Label>
                  <Input
                    id="total-budget"
                    type="number"
                    step="0.01"
                    value={editedContent.total_budget || ''}
                    onChange={(e) => handleFieldChange('total_budget', parseFloat(e.target.value) || 0)}
                    placeholder="100000"
                  />
                </div>
                <div>
                  <Label htmlFor="total-spend">Total Spend ($)</Label>
                  <Input
                    id="total-spend"
                    type="number"
                    step="0.01"
                    value={editedContent.total_spend || editedContent.spend || ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0
                      handleFieldChange('total_spend', value)
                      handleFieldChange('spend', value) // Also update 'spend' field for compatibility
                    }}
                    placeholder="85000"
                  />
                </div>
                <div>
                  <Label htmlFor="total-revenue">Total Revenue ($)</Label>
                  <Input
                    id="total-revenue"
                    type="number"
                    step="0.01"
                    value={editedContent.total_revenue || editedContent.revenue || ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0
                      handleFieldChange('total_revenue', value)
                      handleFieldChange('revenue', value)
                    }}
                    placeholder="120000"
                  />
                </div>
                <div>
                  <Label htmlFor="roi-percentage">ROI (%)</Label>
                  <Input
                    id="roi-percentage"
                    type="number"
                    step="0.1"
                    value={editedContent.roi || editedContent.return_on_investment || ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0
                      handleFieldChange('roi', value)
                      handleFieldChange('return_on_investment', value)
                    }}
                    placeholder="41.2"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="budget-breakdown">Budget Breakdown</Label>
                <Textarea
                  id="budget-breakdown"
                  value={typeof editedContent.budget === 'string'
                    ? editedContent.budget
                    : JSON.stringify(editedContent.budget || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value)
                      handleFieldChange('budget', parsed)
                    } catch {
                      handleFieldChange('budget', e.target.value)
                    }
                  }}
                  placeholder="Budget allocation details"
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="cost-analysis">Cost Analysis</Label>
                <Textarea
                  id="cost-analysis"
                  value={typeof editedContent.cost_analysis === 'string'
                    ? editedContent.cost_analysis
                    : JSON.stringify(editedContent.cost_analysis || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value)
                      handleFieldChange('cost_analysis', parsed)
                    } catch {
                      handleFieldChange('cost_analysis', e.target.value)
                    }
                  }}
                  placeholder="Detailed cost breakdown and analysis"
                  rows={4}
                />
              </div>
            </TabsContent>

            <TabsContent value="roi" className="mt-6 space-y-4">
              <div>
                <Label htmlFor="roi-analysis">ROI Analysis</Label>
                <Textarea
                  id="roi-analysis"
                  value={typeof editedContent.roi_analysis === 'string'
                    ? editedContent.roi_analysis
                    : JSON.stringify(editedContent.roi_analysis || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value)
                      handleFieldChange('roi_analysis', parsed)
                    } catch {
                      handleFieldChange('roi_analysis', e.target.value)
                    }
                  }}
                  placeholder="Return on investment analysis and calculations"
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="return-metrics">Return Metrics</Label>
                <Textarea
                  id="return-metrics"
                  value={typeof editedContent.return_metrics === 'string'
                    ? editedContent.return_metrics
                    : JSON.stringify(editedContent.return_metrics || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value)
                      handleFieldChange('return_metrics', parsed)
                    } catch {
                      handleFieldChange('return_metrics', e.target.value)
                    }
                  }}
                  placeholder="Detailed return metrics and KPIs"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cost-per-acquisition">Cost Per Acquisition ($)</Label>
                  <Input
                    id="cost-per-acquisition"
                    type="number"
                    step="0.01"
                    value={editedContent.cost_per_acquisition || ''}
                    onChange={(e) => handleFieldChange('cost_per_acquisition', parseFloat(e.target.value) || 0)}
                    placeholder="45.50"
                  />
                </div>
                <div>
                  <Label htmlFor="customer-lifetime-value">Customer Lifetime Value ($)</Label>
                  <Input
                    id="customer-lifetime-value"
                    type="number"
                    step="0.01"
                    value={editedContent.lifetime_value || editedContent.customer_lifetime_value || ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0
                      handleFieldChange('lifetime_value', value)
                      handleFieldChange('customer_lifetime_value', value)
                    }}
                    placeholder="1200"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="performance" className="mt-6 space-y-4">
              <div>
                <Label htmlFor="revenue-performance">Revenue Performance</Label>
                <Textarea
                  id="revenue-performance"
                  value={typeof editedContent.revenue_performance === 'string'
                    ? editedContent.revenue_performance
                    : JSON.stringify(editedContent.revenue_performance || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value)
                      handleFieldChange('revenue_performance', parsed)
                    } catch {
                      handleFieldChange('revenue_performance', e.target.value)
                    }
                  }}
                  placeholder="Revenue trends and performance analysis"
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="profit-margins">Profit Margins</Label>
                <Textarea
                  id="profit-margins"
                  value={typeof editedContent.profit_margins === 'string'
                    ? editedContent.profit_margins
                    : JSON.stringify(editedContent.profit_margins || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value)
                      handleFieldChange('profit_margins', parsed)
                    } catch {
                      handleFieldChange('profit_margins', e.target.value)
                    }
                  }}
                  placeholder="Profit margin analysis by channel/product"
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="efficiency-metrics">Efficiency Metrics</Label>
                <Textarea
                  id="efficiency-metrics"
                  value={typeof editedContent.efficiency_metrics === 'string'
                    ? editedContent.efficiency_metrics
                    : JSON.stringify(editedContent.efficiency_metrics || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value)
                      handleFieldChange('efficiency_metrics', parsed)
                    } catch {
                      handleFieldChange('efficiency_metrics', e.target.value)
                    }
                  }}
                  placeholder="Operational efficiency and productivity metrics"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="risk-assessment">Risk Assessment</Label>
                <Textarea
                  id="risk-assessment"
                  value={typeof editedContent.risk_assessment === 'string'
                    ? editedContent.risk_assessment
                    : JSON.stringify(editedContent.risk_assessment || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value)
                      handleFieldChange('risk_assessment', parsed)
                    } catch {
                      handleFieldChange('risk_assessment', e.target.value)
                    }
                  }}
                  placeholder="Financial risks and mitigation strategies"
                  rows={3}
                />
              </div>
            </TabsContent>

            <TabsContent value="projections" className="mt-6 space-y-4">
              <div>
                <Label htmlFor="forecasts">Financial Forecasts</Label>
                <Textarea
                  id="forecasts"
                  value={typeof editedContent.forecasts === 'string'
                    ? editedContent.forecasts
                    : JSON.stringify(editedContent.forecasts || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value)
                      handleFieldChange('forecasts', parsed)
                    } catch {
                      handleFieldChange('forecasts', e.target.value)
                    }
                  }}
                  placeholder="Future financial projections and forecasts"
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="budget-projections">Budget Projections</Label>
                <Textarea
                  id="budget-projections"
                  value={typeof editedContent.budget_projections === 'string'
                    ? editedContent.budget_projections
                    : JSON.stringify(editedContent.budget_projections || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value)
                      handleFieldChange('budget_projections', parsed)
                    } catch {
                      handleFieldChange('budget_projections', e.target.value)
                    }
                  }}
                  placeholder="Future budget allocations and planning"
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="growth-scenarios">Growth Scenarios</Label>
                <Textarea
                  id="growth-scenarios"
                  value={typeof editedContent.growth_scenarios === 'string'
                    ? editedContent.growth_scenarios
                    : JSON.stringify(editedContent.growth_scenarios || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value)
                      handleFieldChange('growth_scenarios', parsed)
                    } catch {
                      handleFieldChange('growth_scenarios', e.target.value)
                    }
                  }}
                  placeholder="Different growth scenarios and their financial implications"
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="investment-recommendations">Investment Recommendations (comma-separated)</Label>
                <Textarea
                  id="investment-recommendations"
                  value={Array.isArray(editedContent.investment_recommendations)
                    ? editedContent.investment_recommendations.join(', ')
                    : (typeof editedContent.investment_recommendations === 'string' ? editedContent.investment_recommendations : '')}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value.includes(',')) {
                      handleArrayFieldChange('investment_recommendations', value)
                    } else {
                      handleFieldChange('investment_recommendations', value)
                    }
                  }}
                  placeholder="Increase digital marketing budget by 20%, Invest in automation tools"
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
            <Calculator className="w-5 h-5" />
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