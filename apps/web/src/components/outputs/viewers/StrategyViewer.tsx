import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  TrendingUp, TrendingDown, Shield, Users, Package,
  AlertTriangle, Target, Layers, Zap
} from 'lucide-react'

interface StrategyViewerProps {
  content: any
  hasStructuredData: boolean
}

export function StrategyViewer({ content, hasStructuredData }: StrategyViewerProps) {
  // Add null/undefined check first
  if (!content || typeof content !== 'object') {
    return <GenericStrategyView content={content} hasStructuredData={hasStructuredData} />
  }

  // Check if this is a multi-framework synthesis (Progressive Learning auto-capture)
  const hasMultipleFrameworks =
    (content.frameworks_applied && Array.isArray(content.frameworks_applied) && content.frameworks_applied.length > 1) ||
    (content.framework_insights && Array.isArray(content.framework_insights) && content.framework_insights.length > 1)

  // If multi-framework synthesis, use comprehensive view
  if (hasMultipleFrameworks) {
    return <MultiFrameworkSynthesisView content={content} />
  }

  // Handle Porter's Five Forces (single framework)
  if (content.buyer_power || content.supplier_power || content.competitive_rivalry) {
    return <PortersFiveForcesView content={content} />
  }

  // Handle SWOT Analysis (single framework)
  if (content.strengths || content.weaknesses || content.opportunities || content.threats) {
    return <SWOTAnalysisView content={content} />
  }

  // Handle other strategy frameworks
  if (content.bcg_matrix || content.growth_share_matrix) {
    return <BCGMatrixView content={content} />
  }

  // Fallback to generic structured view
  return <GenericStrategyView content={content} hasStructuredData={hasStructuredData} />
}

function MultiFrameworkSynthesisView({ content }: { content: any }) {
  const frameworksApplied = content.frameworks_applied || []
  const frameworkInsights = content.framework_insights || []
  const strategicGoals = content.strategic_goals || []
  const targetSegments = content.target_segments || []
  const strategicInitiatives = content.strategic_initiatives || []

  return (
    <div className="space-y-6">
      {/* Header: Frameworks Applied */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Layers className="w-5 h-5" />
              Multi-Framework Strategic Analysis
            </span>
            <Badge variant="secondary" className="text-sm">
              {frameworksApplied.length} Frameworks
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {frameworksApplied.map((framework: string) => (
              <Badge key={framework} variant="outline">
                {framework.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Strategic Goals */}
      {strategicGoals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="w-4 h-4" />
              Strategic Goals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {strategicGoals.map((goal: any, idx: number) => (
              <div key={idx} className="border-l-4 border-amber-500 pl-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">{goal.title}</h4>
                  {goal.priority && (
                    <Badge variant={goal.priority === 'High' ? 'default' : 'secondary'} className="text-xs">
                      {goal.priority}
                    </Badge>
                  )}
                </div>
                {goal.description && (
                  <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
                )}
                {goal.timeline && (
                  <p className="text-xs text-muted-foreground mt-1">Timeline: {goal.timeline}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Target Segments */}
      {targetSegments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-4 h-4" />
              Target Segments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {targetSegments.map((segment: any, idx: number) => (
              <div key={idx} className="p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm">{segment.name}</h4>
                  {segment.priority && (
                    <Badge variant="outline" className="text-xs">
                      {segment.priority}
                    </Badge>
                  )}
                </div>
                {segment.description && (
                  <p className="text-sm text-muted-foreground">{segment.description}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Framework Insights */}
      {frameworkInsights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Framework Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {frameworkInsights.map((insight: any, idx: number) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-start gap-2">
                  <Badge variant="secondary" className="mt-0.5">
                    {insight.framework}
                  </Badge>
                  <div className="flex-1 space-y-1">
                    {insight.key_findings && Array.isArray(insight.key_findings) && insight.key_findings.map((finding: string, findingIdx: number) => (
                      <p key={findingIdx} className="text-sm text-muted-foreground">
                        • {finding}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Strategic Initiatives */}
      {strategicInitiatives.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="w-4 h-4" />
              Strategic Initiatives
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {strategicInitiatives.map((initiative: any, idx: number) => (
              <div key={idx} className="border-l-2 border-blue-500 pl-4">
                <h4 className="font-semibold text-sm">{initiative.name}</h4>
                {initiative.description && (
                  <p className="text-sm text-muted-foreground mt-1">{initiative.description}</p>
                )}
                {initiative.timeline && (
                  <p className="text-xs text-muted-foreground mt-1">Timeline: {initiative.timeline}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Additional SWOT if present */}
      {(content.strengths || content.weaknesses || content.opportunities || content.threats) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">SWOT Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <SWOTAnalysisView content={content} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function PortersFiveForcesView({ content }: { content: any }) {
  const forces = [
    {
      key: 'buyer_power',
      label: 'Buyer Power',
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      key: 'supplier_power',
      label: 'Supplier Power',
      icon: Package,
      color: 'bg-slate-500'
    },
    {
      key: 'competitive_rivalry',
      label: 'Competitive Rivalry',
      icon: Zap,
      color: 'bg-red-500'
    },
    {
      key: 'threat_of_substitutes',
      label: 'Threat of Substitutes',
      icon: AlertTriangle,
      color: 'bg-orange-500'
    },
    {
      key: 'threat_of_new_entrants',
      label: 'Threat of New Entrants',
      icon: Shield,
      color: 'bg-green-500'
    },
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Porter's Five Forces Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {forces.map(({ key, label, icon: Icon, color }) => {
            const force = content[key]
            if (!force) return null

            const score = force.score || 0
            const factors = force.factors || []

            return (
              <div key={key} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${color} bg-opacity-10`}>
                      <Icon className={`w-4 h-4 ${color.replace('bg-', 'text-')}`} />
                    </div>
                    <span className="font-medium">{label}</span>
                  </div>
                  <Badge variant={score >= 7 ? 'destructive' : score >= 4 ? 'secondary' : 'outline'}>
                    {score}/10
                  </Badge>
                </div>
                <Progress value={score * 10} className="h-2" />
                {factors.length > 0 && (
                  <ul className="ml-10 space-y-1">
                    {factors.map((factor: string, idx: number) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-muted-foreground/50 mt-1">•</span>
                        <span>{factor}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}

function SWOTAnalysisView({ content }: { content: any }) {
  const quadrants = [
    { key: 'strengths', label: 'Strengths', color: 'bg-green-500', icon: TrendingUp },
    { key: 'weaknesses', label: 'Weaknesses', color: 'bg-red-500', icon: TrendingDown },
    { key: 'opportunities', label: 'Opportunities', color: 'bg-blue-500', icon: Target },
    { key: 'threats', label: 'Threats', color: 'bg-orange-500', icon: AlertTriangle },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {quadrants.map(({ key, label, color, icon: Icon }) => {
        const items = content[key] || []
        if (!Array.isArray(items) || items.length === 0) return null

        return (
          <Card key={key}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <div className={`p-1.5 rounded-lg ${color} bg-opacity-10`}>
                  <Icon className={`w-4 h-4 ${color.replace('bg-', 'text-')}`} />
                </div>
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {items.map((item: string, idx: number) => (
                  <li key={idx} className="text-sm flex items-start gap-2">
                    <span className="text-muted-foreground/50 mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function BCGMatrixView({ content }: { content: any }) {
  const categories = [
    { key: 'stars', label: 'Stars', description: 'High growth, High share', icon: '⭐' },
    { key: 'cash_cows', label: 'Cash Cows', description: 'Low growth, High share', icon: '🐄' },
    { key: 'question_marks', label: 'Question Marks', description: 'High growth, Low share', icon: '❓' },
    { key: 'dogs', label: 'Dogs', description: 'Low growth, Low share', icon: '🐕' },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {categories.map(({ key, label, description, icon }) => {
        const items = content[key] || content.bcg_matrix?.[key] || []
        if (!Array.isArray(items) || items.length === 0) return null

        return (
          <Card key={key}>
            <CardHeader>
              <CardTitle className="text-base">
                <span className="mr-2">{icon}</span> {label}
              </CardTitle>
              <p className="text-xs text-muted-foreground">{description}</p>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {items.map((item: string, idx: number) => (
                  <li key={idx} className="text-sm">{item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function GenericStrategyView({ content }: { content: any, hasStructuredData?: boolean }) {
  // Handle null/undefined content
  if (!content) {
    return (
      <div className="text-center text-muted-foreground p-6">
        <p>No strategy data available</p>
      </div>
    )
  }

  // Fallback for unrecognized strategy formats
  if (typeof content === 'string') {
    return (
      <div className="prose prose-sm max-w-none">
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    )
  }

  // Handle non-object content
  if (typeof content !== 'object') {
    return (
      <div className="prose prose-sm max-w-none">
        <p>{String(content)}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {Object.entries(content).map(([key, value]) => {
        if (['id', 'created_at', 'updated_at', 'org_id'].includes(key)) return null

        return (
          <Card key={key}>
            <CardHeader>
              <CardTitle className="text-base capitalize">
                {key.replace(/_/g, ' ')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderStrategyValue(value)}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function renderStrategyValue(value: any): React.ReactNode {
  if (value === null || value === undefined) return <span className="text-muted-foreground">Not available</span>

  if (typeof value === 'string') return <p className="text-sm leading-relaxed">{value}</p>

  if (typeof value === 'number') return <span className="font-semibold">{value}</span>

  if (Array.isArray(value)) {
    return (
      <ul className="space-y-1">
        {value.map((item, idx) => (
          <li key={idx} className="text-sm flex items-start gap-2">
            <span className="text-muted-foreground/50">•</span>
            <div className="flex-1">
              {typeof item === 'object' && item !== null ? (
                <div className="space-y-1 pl-2 border-l-2 border-muted">
                  {Object.entries(item).map(([subKey, subValue]) => (
                    <div key={subKey} className="flex items-start gap-2">
                      <span className="font-medium text-xs">{subKey.replace(/_/g, ' ')}:</span>
                      <span className="text-xs text-muted-foreground">{String(subValue)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <span>{String(item)}</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    )
  }

  if (typeof value === 'object') {
    return (
      <div className="space-y-2">
        {Object.entries(value).map(([k, v]) => (
          <div key={k} className="text-sm">
            <span className="font-medium capitalize">{k.replace(/_/g, ' ')}: </span>
            {typeof v === 'object' && v !== null ? (
              <div className="mt-1 pl-3 border-l-2 border-muted">
                {Array.isArray(v) ? (
                  <ul className="space-y-1">
                    {v.map((item: any, i: number) => (
                      <li key={i} className="text-xs">• {String(item)}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="space-y-1">
                    {Object.entries(v).map(([subKey, subValue]) => (
                      <div key={subKey} className="text-xs">
                        <span className="font-medium">{subKey.replace(/_/g, ' ')}:</span> {String(subValue)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground">{String(v)}</span>
            )}
          </div>
        ))}
      </div>
    )
  }

  return <span>{String(value)}</span>
}