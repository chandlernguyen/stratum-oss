import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  DollarSign, TrendingUp, PieChart, Calculator, Target, AlertTriangle,
  ArrowUpRight, BarChart3, Percent, Coins, CreditCard
} from 'lucide-react'
import { useLocale } from '@/hooks/useLocale'
import { renderValue } from '../shared/ViewerUtils'
import { GenericViewer } from './GenericViewer'

interface ROIBudgetViewerProps {
  content: any
  hasStructuredData: boolean
}

export function ROIBudgetViewer({ content, hasStructuredData }: ROIBudgetViewerProps) {
  const { formatNumber } = useLocale()
  // Handle empty or invalid content
  if (!content || (typeof content === 'object' && Object.keys(content).length === 0)) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No ROI/Budget data available</p>
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

  // Check if this looks like ROI/Budget data
  const hasROIBudgetData = content.budget || content.roi || content.financial ||
                          content.cost_analysis || content.revenue || content.profit ||
                          content.budget_allocation || content.financial_summary ||
                          content.spend || content.investment

  // Fallback for unknown formats
  if (!hasROIBudgetData) {
    return <GenericViewer content={content} hasStructuredData={hasStructuredData} />
  }

  return (
    <div className="space-y-6">
      {hasStructuredData && (
        <div className="flex items-center gap-2 text-sm text-yellow-600 bg-yellow-50 px-3 py-2 rounded-lg">
          <Badge variant="outline" className="bg-yellow-100 border-yellow-300 text-yellow-700">
            Enhanced Financial Data
          </Badge>
          <span className="text-xs">AI-structured ROI and budget analysis</span>
        </div>
      )}

      {/* Financial Header */}
      {(content.report_title || content.financial_summary || content.budget_period) && (
        <Card className="border-l-4 border-l-yellow-500 bg-gradient-to-r from-yellow-50 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <DollarSign className="w-6 h-6 text-yellow-600" />
              {content.report_title || 'ROI & Budget Analysis'}
            </CardTitle>
            {content.financial_summary && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {content.financial_summary}
              </p>
            )}
            {content.budget_period && (
              <Badge variant="outline" className="w-fit">
                {content.budget_period}
              </Badge>
            )}
          </CardHeader>
        </Card>
      )}

      {/* Key Financial Metrics Row */}
      <FinancialMetricsSection content={content} formatNumber={formatNumber} />

      {/* Main ROI/Budget Content */}
      <Tabs defaultValue="budget" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="roi">ROI Analysis</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="projections">Projections</TabsTrigger>
        </TabsList>

        <TabsContent value="budget" className="mt-6 space-y-4">
          <BudgetSection content={content} />
        </TabsContent>

        <TabsContent value="roi" className="mt-6 space-y-4">
          <ROISection content={content} />
        </TabsContent>

        <TabsContent value="performance" className="mt-6 space-y-4">
          <PerformanceSection content={content} />
        </TabsContent>

        <TabsContent value="projections" className="mt-6 space-y-4">
          <ProjectionsSection content={content} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Financial Metrics Dashboard Section
function FinancialMetricsSection({
  content,
  formatNumber,
}: {
  content: any
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string
}) {
  // Extract key financial metrics with fallbacks
  const totalBudget = content.total_budget || content.budget?.total || content.investment
  const totalSpend = content.total_spend || content.spend || content.cost
  const totalRevenue = content.total_revenue || content.revenue || content.income
  const roi = content.roi || content.return_on_investment

  if (!totalBudget && !totalSpend && !totalRevenue && !roi) {
    return null
  }

  // Calculate budget utilization if we have both budget and spend
  const budgetUtilization = totalBudget && totalSpend
    ? Math.round((parseFloat(totalSpend) / parseFloat(totalBudget)) * 100)
    : null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {totalBudget && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Budget</p>
                <p className="text-2xl font-bold text-slate-600 dark:text-slate-400">
                  ${formatFinancialValue(totalBudget, formatNumber)}
                </p>
              </div>
              <CreditCard className="w-8 h-8 text-slate-500 opacity-60 dark:text-slate-400" />
            </div>
            {budgetUtilization && (
              <div className="mt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span>Utilized</span>
                  <span>{budgetUtilization}%</span>
                </div>
                <Progress value={budgetUtilization} className="h-1" />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {totalSpend && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Spend</p>
                <p className="text-2xl font-bold text-orange-600">
                  ${formatFinancialValue(totalSpend, formatNumber)}
                </p>
              </div>
              <Coins className="w-8 h-8 text-orange-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
      )}

      {totalRevenue && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  ${formatFinancialValue(totalRevenue, formatNumber)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
      )}

      {roi && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">ROI</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {typeof roi === 'number' ? `${roi}%` : roi}
                </p>
              </div>
              <Target className="w-8 h-8 text-emerald-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Budget Allocation Section
function BudgetSection({ content }: { content: any }) {
  return (
    <div className="space-y-4">
      {/* Budget Breakdown */}
      {content.budget && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChart className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              Budget Allocation
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderValue(content.budget)}
          </CardContent>
        </Card>
      )}

      {/* Cost Analysis */}
      {content.cost_analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calculator className="w-4 h-4 text-orange-500" />
              Cost Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderValue(content.cost_analysis)}
          </CardContent>
        </Card>
      )}

      {/* Spending by Category */}
      {content.spending_by_category && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="w-4 h-4 text-amber-500" />
              Spending by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderValue(content.spending_by_category)}
          </CardContent>
        </Card>
      )}

      {/* Budget vs Actual */}
      {content.budget_vs_actual && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Budget vs Actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderValue(content.budget_vs_actual)}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ROI Analysis Section
function ROISection({ content }: { content: any }) {
  return (
    <div className="space-y-4">
      {/* ROI Overview */}
      {content.roi_analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="w-4 h-4 text-emerald-500" />
              ROI Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderValue(content.roi_analysis)}
          </CardContent>
        </Card>
      )}

      {/* Return on Investment */}
      {content.return_metrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowUpRight className="w-4 h-4 text-green-500" />
              Return Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderValue(content.return_metrics)}
          </CardContent>
        </Card>
      )}

      {/* Cost Per Acquisition */}
      {content.cost_per_acquisition && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calculator className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              Cost Per Acquisition
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderValue(content.cost_per_acquisition)}
          </CardContent>
        </Card>
      )}

      {/* Lifetime Value */}
      {content.lifetime_value && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              Customer Lifetime Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderValue(content.lifetime_value)}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Financial Performance Section
function PerformanceSection({ content }: { content: any }) {
  return (
    <div className="space-y-4">
      {/* Revenue Performance */}
      {content.revenue_performance && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-4 h-4 text-green-500" />
              Revenue Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderValue(content.revenue_performance)}
          </CardContent>
        </Card>
      )}

      {/* Profit Margins */}
      {content.profit_margins && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Percent className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              Profit Margins
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderValue(content.profit_margins)}
          </CardContent>
        </Card>
      )}

      {/* Financial Efficiency */}
      {content.efficiency_metrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="w-4 h-4 text-indigo-500" />
              Efficiency Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderValue(content.efficiency_metrics)}
          </CardContent>
        </Card>
      )}

      {/* Risk Assessment */}
      {content.risk_assessment && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              Risk Assessment
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderValue(content.risk_assessment)}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Financial Projections Section
function ProjectionsSection({ content }: { content: any }) {
  return (
    <div className="space-y-4">
      {/* Financial Forecasts */}
      {content.forecasts && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Financial Forecasts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderValue(content.forecasts)}
          </CardContent>
        </Card>
      )}

      {/* Budget Projections */}
      {content.budget_projections && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calculator className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              Budget Projections
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderValue(content.budget_projections)}
          </CardContent>
        </Card>
      )}

      {/* Growth Scenarios */}
      {content.growth_scenarios && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowUpRight className="w-4 h-4 text-green-500" />
              Growth Scenarios
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderValue(content.growth_scenarios)}
          </CardContent>
        </Card>
      )}

      {/* Investment Recommendations */}
      {content.investment_recommendations && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="w-4 h-4 text-amber-500" />
              Investment Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Array.isArray(content.investment_recommendations) ? (
              <ul className="space-y-2">
                {content.investment_recommendations.map((rec: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Target className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            ) : (
              renderValue(content.investment_recommendations)
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Helper function to format financial values
function formatFinancialValue(
  value: any,
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string
): string {
  if (typeof value === 'string') {
    // If already formatted, return as-is
    if (value.includes('$') || value.includes(',')) {
      return value.replace('$', '')
    }
    // Try to parse as number
    const numValue = parseFloat(value)
    if (!isNaN(numValue)) {
      return formatNumber(numValue)
    }
    return value
  }

  if (typeof value === 'number') {
    return formatNumber(value)
  }

  return String(value)
}
