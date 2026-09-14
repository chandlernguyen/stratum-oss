import { WorkflowBuilder } from '@/components/workflow/WorkflowBuilder'
import { AgentRecommendationEngine } from '@/components/recommendations/AgentRecommendationEngine'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export function WorkflowPage() {
  const { t } = useTranslation('workflow');
  const [currentWorkflowContext, setCurrentWorkflowContext] = useState<{
    previousAgents: string[]
    stage: 'strategy' | 'execution' | 'optimization'
  }>({
    previousAgents: [],
    stage: 'strategy'
  })

  const handleExecuteWorkflow = (nodes: any[], _edges: any[]) => {
    // Extract agent IDs from the workflow
    const agentIds = nodes
      .filter(n => n.type === 'agent')
      .map(n => n.data.agentId)
    
    // Update context based on executed workflow
    setCurrentWorkflowContext({
      previousAgents: agentIds,
      stage: determineStage(agentIds)
    })
  }

  const determineStage = (agentIds: string[]): 'strategy' | 'execution' | 'optimization' => {
    if (agentIds.some(id => ['analytics', 'roi-budget', 'client-success'].includes(id))) {
      return 'optimization'
    }
    if (agentIds.some(id => ['content', 'campaign-execution', 'quick-wins'].includes(id))) {
      return 'execution'
    }
    return 'strategy'
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('page.title')}</h1>
        <p className="text-muted-foreground">
          {t('page.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Workflow Builder - Main Area */}
        <div className="lg:col-span-3">
          <WorkflowBuilder 
            onExecuteWorkflow={handleExecuteWorkflow}
            className="h-full"
          />
        </div>

        {/* AI Recommendations - Sidebar */}
        <div className="lg:col-span-1">
          <AgentRecommendationEngine
            userContext={currentWorkflowContext}
            className="sticky top-4"
          />
        </div>
      </div>
    </div>
  )
}