import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AGENT_IDENTITY } from '@/config/agentIdentity'
import { Brain, Sparkles, TrendingUp, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AgentRecommendation {
  agentId: string
  score: number
  reason: string
  nextBestAction: string
}

interface AgentRecommendationEngineProps {
  currentAgentId?: string
  userContext?: {
    goal?: string
    industry?: string
    stage?: 'strategy' | 'execution' | 'optimization'
    previousAgents?: string[]
  }
  className?: string
}

export function AgentRecommendationEngine({ 
  currentAgentId, 
  userContext = {},
  className 
}: AgentRecommendationEngineProps) {
  const navigate = useNavigate()
  const [recommendations, setRecommendations] = useState<AgentRecommendation[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(true)

  useEffect(() => {
    // Simulate AI-powered recommendation logic
    const timer = setTimeout(() => {
      const recs = calculateRecommendations(currentAgentId, userContext)
      setRecommendations(recs)
      setIsAnalyzing(false)
    }, 800)

    return () => clearTimeout(timer)
  }, [currentAgentId, userContext])

  const calculateRecommendations = (
    agentId?: string,
    context: typeof userContext = {}
  ): AgentRecommendation[] => {
    const recommendations: AgentRecommendation[] = []
    const { previousAgents = [], stage = 'strategy' } = context

    // Workflow-based recommendations
    const workflows: Record<string, string[]> = {
      strategy: ['competitive-intelligence', 'persona', 'content'],
      persona: ['content', 'campaign-execution'],
      content: ['campaign-execution', 'analytics'],
      'competitive-intelligence': ['strategy', 'quick-wins'],
      'campaign-execution': ['analytics', 'roi-budget'],
      analytics: ['roi-budget', 'quick-wins'],
      'roi-budget': ['strategy', 'client-success'],
      'quick-wins': ['campaign-execution', 'analytics'],
      'client-success': ['analytics', 'strategy']
    }

    // Stage-based recommendations
    const stageAgents: Record<string, string[]> = {
      strategy: ['strategy', 'competitive-intelligence', 'persona'],
      execution: ['content', 'campaign-execution', 'quick-wins'],
      optimization: ['analytics', 'roi-budget', 'client-success']
    }

    // Get workflow recommendations
    if (agentId && workflows[agentId]) {
      workflows[agentId].forEach(nextAgent => {
        if (!previousAgents.includes(nextAgent)) {
          recommendations.push({
            agentId: nextAgent,
            score: 90,
            reason: `Natural next step after ${AGENT_IDENTITY[agentId]?.name}`,
            nextBestAction: `Continue your workflow with ${AGENT_IDENTITY[nextAgent]?.name}`
          })
        }
      })
    }

    // Get stage-based recommendations
    stageAgents[stage].forEach(agent => {
      if (!recommendations.find(r => r.agentId === agent) && !previousAgents.includes(agent)) {
        recommendations.push({
          agentId: agent,
          score: 70,
          reason: `Recommended for ${stage} phase`,
          nextBestAction: `Strengthen your ${stage} with ${AGENT_IDENTITY[agent]?.name}`
        })
      }
    })

    // Add complementary agents
    if (!previousAgents.includes('quick-wins')) {
      recommendations.push({
        agentId: 'quick-wins',
        score: 60,
        reason: 'Get immediate results',
        nextBestAction: 'Find quick wins to implement today'
      })
    }

    // Sort by score and limit to top 3
    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
  }

  if (isAnalyzing) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-amber-600" />
            Analyzing Your Journey...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-100 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("border-slate-200 bg-gradient-to-br from-slate-50 to-white", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-amber-600" />
          AI Recommendations
        </CardTitle>
        <CardDescription>
          Based on your current workflow and goals
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {recommendations.map((rec, index) => {
            const agent = AGENT_IDENTITY[rec.agentId]
            if (!agent) return null

            const Icon = agent.icon
            const isTopRecommendation = index === 0

            return (
              <div
                key={rec.agentId}
                className={cn(
                  "p-4 rounded-lg border transition-all hover:shadow-md cursor-pointer",
                  isTopRecommendation 
                    ? "border-amber-300 bg-slate-50" 
                    : "border-gray-200 bg-white hover:border-slate-200"
                )}
                onClick={() => navigate(agent.path)}
              >
                <div className="flex items-start gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${agent.color}20` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: agent.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          {agent.name}
                          {isTopRecommendation && (
                            <Badge className="bg-amber-600 text-white text-xs">
                              <Sparkles className="w-3 h-3 mr-1" />
                              Best Next
                            </Badge>
                          )}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {rec.reason}
                        </p>
                        <p className="text-xs font-medium text-amber-600 mt-2 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {rec.nextBestAction}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {recommendations.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No recommendations available</p>
            <p className="text-xs mt-1">Start with any agent to begin</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}