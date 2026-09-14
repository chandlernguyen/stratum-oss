import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Target, MessageSquare, DollarSign, TrendingUp, Lightbulb, BarChart,
  Users, Calendar, CheckCircle, AlertCircle, Zap, PieChart
} from 'lucide-react'
import { renderValue } from '../shared/ViewerUtils'
import { GenericViewer } from './GenericViewer'

interface MarketingStrategyViewerProps {
  content: any
  hasStructuredData: boolean
}

export function MarketingStrategyViewer({ content, hasStructuredData }: MarketingStrategyViewerProps) {
  // Handle empty or invalid content
  if (!content || (typeof content === 'object' && Object.keys(content).length === 0)) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No marketing strategy data available</p>
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

  // Check if this looks like a structured marketing strategy
  const hasMarketingData = content.campaign_name || content.executive_summary ||
                          content.messaging_framework || content.channel_strategy ||
                          content.budget_allocation || content.strategy_reasoning

  // Fallback for unknown formats
  if (!hasMarketingData) {
    return <GenericViewer content={content} hasStructuredData={hasStructuredData} />
  }

  return (
    <div className="space-y-6">
      {hasStructuredData && (
        <div className="flex items-center gap-2 text-sm text-amber-600 bg-slate-50 px-3 py-2 rounded-lg">
          <Badge variant="outline" className="bg-slate-100 border-amber-300 text-slate-700">
            Enhanced Strategy Data
          </Badge>
          <span className="text-xs">AI-structured marketing strategy</span>
        </div>
      )}

      {/* Campaign Header */}
      {(content.campaign_name || content.executive_summary) && (
        <Card className="border-l-4 border-l-amber-500 bg-gradient-to-r from-slate-50 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Target className="w-6 h-6 text-amber-600" />
              {content.campaign_name || 'Marketing Strategy'}
            </CardTitle>
            {content.executive_summary && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {content.executive_summary}
              </p>
            )}
          </CardHeader>
        </Card>
      )}

      {/* Key Metrics Row */}
      {(content.total_budget || content.campaign_duration || content.target_verticals) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {content.total_budget && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Budget</p>
                    <p className="text-2xl font-bold text-green-600">${content.total_budget}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-500 opacity-60" />
                </div>
              </CardContent>
            </Card>
          )}

          {content.campaign_duration && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Duration</p>
                    <p className="text-2xl font-bold text-blue-600">{content.campaign_duration}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-blue-500 opacity-60" />
                </div>
              </CardContent>
            </Card>
          )}

          {content.target_verticals && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Target Verticals</p>
                    <p className="text-lg font-bold text-amber-600">
                      {Array.isArray(content.target_verticals)
                        ? content.target_verticals.join(', ')
                        : content.target_verticals}
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-amber-500 opacity-60" />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Main Strategy Content */}
      <Tabs defaultValue="messaging" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="messaging">Messaging</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="execution">Execution</TabsTrigger>
        </TabsList>

        <TabsContent value="messaging" className="mt-6 space-y-4">
          <MessagingSection content={content} />
        </TabsContent>

        <TabsContent value="channels" className="mt-6 space-y-4">
          <ChannelSection content={content} />
        </TabsContent>

        <TabsContent value="budget" className="mt-6 space-y-4">
          <BudgetSection content={content} />
        </TabsContent>

        <TabsContent value="execution" className="mt-6 space-y-4">
          <ExecutionSection content={content} />
        </TabsContent>
      </Tabs>

      {/* Strategy Reasoning */}
      {content.strategy_reasoning && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="w-4 h-4 text-yellow-500" />
              Strategic Reasoning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground italic">
              {content.strategy_reasoning}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Messaging Framework Section
function MessagingSection({ content }: { content: any }) {
  return (
    <div className="space-y-4">
      {/* Value Propositions */}
      {content.value_propositions && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="w-4 h-4 text-yellow-500" />
              Value Propositions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderValue(content.value_propositions)}
          </CardContent>
        </Card>
      )}

      {/* Messaging Framework */}
      {content.messaging_framework && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="w-4 h-4 text-blue-500" />
              Messaging Framework
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderValue(content.messaging_framework)}
          </CardContent>
        </Card>
      )}

      {/* Key Messages */}
      {content.key_messages && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="w-4 h-4 text-amber-500" />
              Key Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderValue(content.key_messages)}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Channel Strategy Section
function ChannelSection({ content }: { content: any }) {
  // Extract media mix percentages
  const mediaData = content.media_mix || {}
  const paidPercent = parseInt(mediaData.paid) || 0
  const ownedPercent = parseInt(mediaData.owned) || 0
  const earnedPercent = parseInt(mediaData.earned) || 0

  return (
    <div className="space-y-4">
      {/* Media Mix Visualization */}
      {(paidPercent > 0 || ownedPercent > 0 || earnedPercent > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChart className="w-4 h-4 text-indigo-500" />
              Media Mix Strategy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-600">{paidPercent}%</p>
                <p className="text-sm text-muted-foreground">Paid Media</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{ownedPercent}%</p>
                <p className="text-sm text-muted-foreground">Owned Media</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{earnedPercent}%</p>
                <p className="text-sm text-muted-foreground">Earned Media</p>
              </div>
            </div>

            {/* Progress bars */}
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Paid Media</span>
                  <span>{paidPercent}%</span>
                </div>
                <Progress value={paidPercent} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Owned Media</span>
                  <span>{ownedPercent}%</span>
                </div>
                <Progress value={ownedPercent} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Earned Media</span>
                  <span>{earnedPercent}%</span>
                </div>
                <Progress value={earnedPercent} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Channel Strategy Details */}
      {content.channel_strategy && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart className="w-4 h-4 text-green-500" />
              Channel Strategy
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderValue(content.channel_strategy)}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Budget Allocation Section
function BudgetSection({ content }: { content: any }) {
  const monthlyBudget = content.monthly_budget
  const totalBudget = content.total_budget

  return (
    <div className="space-y-4">
      {/* Budget Overview */}
      {(monthlyBudget || totalBudget) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {totalBudget && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">${totalBudget}</p>
                  <p className="text-sm text-muted-foreground">Total Campaign Budget</p>
                </div>
              </CardContent>
            </Card>
          )}

          {monthlyBudget && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-600">${monthlyBudget}</p>
                  <p className="text-sm text-muted-foreground">Monthly Budget</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Budget Allocation Details */}
      {content.budget_allocation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="w-4 h-4 text-green-500" />
              Budget Allocation
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderValue(content.budget_allocation)}
          </CardContent>
        </Card>
      )}

      {/* Key Challenges */}
      {content.key_challenges && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="w-4 h-4 text-orange-500" />
              Key Challenges
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Array.isArray(content.key_challenges) ? (
              <ul className="space-y-2">
                {content.key_challenges.map((challenge: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                    <span>{challenge}</span>
                  </li>
                ))}
              </ul>
            ) : (
              renderValue(content.key_challenges)
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Execution Planning Section
function ExecutionSection({ content }: { content: any }) {
  return (
    <div className="space-y-4">
      {/* Go To Market Strategy */}
      {content.go_to_market && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-4 h-4 text-green-500" />
              Go-to-Market Strategy
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderValue(content.go_to_market)}
          </CardContent>
        </Card>
      )}

      {/* Success Metrics */}
      {content.success_metrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Success Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Array.isArray(content.success_metrics) ? (
              <ul className="space-y-2">
                {content.success_metrics.map((metric: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{metric}</span>
                  </li>
                ))}
              </ul>
            ) : (
              renderValue(content.success_metrics)
            )}
          </CardContent>
        </Card>
      )}

      {/* Implementation Timeline */}
      {(content.implementation_timeline || content.testing_framework) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {content.implementation_timeline && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  Implementation Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderValue(content.implementation_timeline)}
              </CardContent>
            </Card>
          )}

          {content.testing_framework && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart className="w-4 h-4 text-amber-500" />
                  Testing Framework
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderValue(content.testing_framework)}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}