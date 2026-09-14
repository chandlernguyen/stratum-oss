import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Target, Users, TrendingUp, Zap, Sparkles, CheckCircle, Lightbulb
} from 'lucide-react'
// import { renderValue } from '../shared/ViewerUtils' // Unused
import { GenericViewer } from './GenericViewer'

interface QuickStartViewerProps {
  content: any
  hasStructuredData: boolean
}

export function QuickStartViewer({ content, hasStructuredData }: QuickStartViewerProps) {
  // Handle empty or invalid content
  if (!content || (typeof content === 'object' && Object.keys(content).length === 0)) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No Quick Start intelligence data available</p>
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

  // Check if this looks like Quick Start intelligence
  const hasQuickStartData = content.executive_summary || content.strategic_analysis ||
                            content.customer_personas || content.marketing_strategy ||
                            content.immediate_actions

  // Fallback for unknown formats
  if (!hasQuickStartData) {
    return <GenericViewer content={content} hasStructuredData={hasStructuredData} />
  }

  return (
    <div className="space-y-6">
      {hasStructuredData && (
        <div className="flex items-center gap-2 text-sm text-amber-600 bg-slate-50 px-3 py-2 rounded-lg">
          <Badge variant="outline" className="bg-slate-100 border-amber-300 text-slate-700">
            Quick Start Intelligence
          </Badge>
          <span className="text-xs">Comprehensive 5-minute marketing foundation</span>
        </div>
      )}

      {/* Header with Executive Summary */}
      {(content.title || content.executive_summary) && (
        <Card className="border-l-4 border-l-amber-500 bg-gradient-to-r from-slate-50 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="w-6 h-6 text-amber-600" />
              {content.title || 'Quick Start Intelligence'}
            </CardTitle>
            {content.executive_summary && (
              <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                {content.executive_summary}
              </p>
            )}
          </CardHeader>
        </Card>
      )}

      {/* Main Intelligence Content */}
      <Tabs defaultValue="strategy" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="strategy">Strategy</TabsTrigger>
          <TabsTrigger value="personas">Personas</TabsTrigger>
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="strategy" className="mt-6 space-y-4">
          <StrategySection content={content} />
        </TabsContent>

        <TabsContent value="personas" className="mt-6 space-y-4">
          <PersonasSection content={content} />
        </TabsContent>

        <TabsContent value="marketing" className="mt-6 space-y-4">
          <MarketingSection content={content} />
        </TabsContent>

        <TabsContent value="actions" className="mt-6 space-y-4">
          <ActionsSection content={content} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Strategic Analysis Section
function StrategySection({ content }: { content: any }) {
  const strategicAnalysis = content.strategic_analysis

  if (!strategicAnalysis) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No strategic analysis available</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Key Findings */}
      {strategicAnalysis.key_findings && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="w-4 h-4 text-yellow-500" />
              Key Findings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {strategicAnalysis.key_findings}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Frameworks Applied */}
      {strategicAnalysis.frameworks_applied && Array.isArray(strategicAnalysis.frameworks_applied) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              Frameworks Applied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {strategicAnalysis.frameworks_applied.map((framework: string, i: number) => (
                <Badge key={i} variant="secondary" className="text-sm">
                  {framework}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Customer Personas Section
function PersonasSection({ content }: { content: any }) {
  const customerPersonas = content.customer_personas

  if (!customerPersonas) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No persona data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Personas Count */}
      {customerPersonas.count && (
        <Card className="bg-gradient-to-r from-slate-50 to-transparent border-l-4 border-l-slate-500 dark:from-slate-900/20 dark:border-l-slate-600">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-slate-600 dark:text-slate-400" />
              <div>
                <p className="text-2xl font-bold text-slate-600 dark:text-slate-400">{customerPersonas.count}</p>
                <p className="text-sm text-muted-foreground">Customer Personas Created</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Personas List */}
      {customerPersonas.personas_created && Array.isArray(customerPersonas.personas_created) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              Target Personas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {customerPersonas.personas_created.map((persona: string, i: number) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <span className="font-medium">{persona}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Marketing Strategy Section
function MarketingSection({ content }: { content: any }) {
  const marketingStrategy = content.marketing_strategy

  if (!marketingStrategy) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No marketing strategy available</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Budget & Timeline */}
      {(marketingStrategy.budget_recommendation || marketingStrategy.timeline) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {marketingStrategy.budget_recommendation && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  Budget Strategy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {marketingStrategy.budget_recommendation}
                </p>
              </CardContent>
            </Card>
          )}

          {marketingStrategy.timeline && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Zap className="w-4 h-4 text-orange-500" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-orange-600">{marketingStrategy.timeline}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Recommended Channels */}
      {marketingStrategy.recommended_channels && Array.isArray(marketingStrategy.recommended_channels) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              Recommended Marketing Channels
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {marketingStrategy.recommended_channels.map((channel: string, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm p-2 bg-slate-50 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <span>{channel}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Immediate Actions Section
function ActionsSection({ content }: { content: any }) {
  const immediateActions = content.immediate_actions

  if (!immediateActions || !Array.isArray(immediateActions) || immediateActions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Zap className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No action items available</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-r from-orange-50 to-transparent border-l-4 border-l-orange-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="w-5 h-5 text-orange-600" />
            Start Here - Immediate Actions
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            High-impact actions to implement right away
          </p>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {immediateActions.map((action: string, i: number) => (
              <li key={i} className="flex items-start gap-3 p-3 bg-white rounded-lg border">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-600 font-semibold text-sm flex-shrink-0">
                  {i + 1}
                </div>
                <span className="text-sm leading-relaxed pt-0.5">{action}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
