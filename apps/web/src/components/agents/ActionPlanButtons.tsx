import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '@/lib/authService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users, FileText,
  ArrowRight, Clock, CheckCircle, Workflow,
  Sparkles, Target, ChevronDown, Megaphone,
  LineChart, TrendingDown, HeartHandshake
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { DetectedActionPlan, ActionPlanItem } from '@/utils/actionPlanDetector';
import { generatePromptForAgent, extractRelevantInsights } from '@/utils/actionPlanDetector';
import { workflowOrchestrationService, type SmartWorkflowSuggestion } from '@/services/workflowOrchestrationService';
import { WorkflowProgressTracker, type WorkflowProgress } from '@/components/workflow/WorkflowProgressTracker';
import { API_BASE_URL } from '@/lib/api';
import { useUserIdentity } from '@/hooks/data/useUserIdentity';
import { useClientContext } from '@/contexts/ClientContext';
import { buildAgentRootUrl, buildAgentSessionUrl, buildContentToolUrl } from '@/utils/multiTenantRouting';

interface ActionPlanButtonsProps {
  actionPlan: DetectedActionPlan;
  sessionContext: {
    sessionId: string;
    clientId?: string;
    campaignId?: string;
    strategyOutput?: any;
    organizationId?: string;
    triggerAgent?: string;
  };
  position?: 'inline' | 'floating';
  enableWorkflowOrchestration?: boolean;
}

// Agent configuration with proper session URL patterns
const agentConfig = {
  strategy: {
    name: 'Strategy Agent',
    icon: Target,
    description: 'Comprehensive business strategy and analysis',
    route: '/agents/strategy',
    sessionRoute: '/agents/strategy/session',
    agentType: 'strategy',
    color: 'red',
    bgColor: 'bg-red-50 dark:bg-red-950',
    hoverColor: 'hover:bg-red-100 dark:hover:bg-red-900',
    borderColor: 'hover:border-red-500',
    availableFor: ['SME', 'AGENCY'] as const
  },
  persona: {
    name: 'Persona Agent',
    icon: Users,
    description: 'Create detailed buyer personas and customer profiles',
    route: '/agents/persona',
    sessionRoute: '/agents/persona/session',
    agentType: 'persona',
    color: 'slate',
    bgColor: 'bg-slate-50 dark:bg-slate-950',
    hoverColor: 'hover:bg-slate-100 dark:hover:bg-slate-900',
    borderColor: 'hover:border-slate-500',
    availableFor: ['SME', 'AGENCY'] as const
  },
  marketing_strategy: {
    name: 'Marketing Strategy Agent',
    icon: Megaphone,
    description: 'Go-to-market strategies and messaging frameworks',
    route: '/agents/marketing-strategy',
    sessionRoute: '/agents/marketing-strategy/session',
    agentType: 'marketing_strategy',
    color: 'orange',
    bgColor: 'bg-orange-50 dark:bg-orange-950',
    hoverColor: 'hover:bg-orange-100 dark:hover:bg-orange-900',
    borderColor: 'hover:border-orange-500',
    availableFor: ['SME', 'AGENCY'] as const
  },
  content: {
    name: 'Content Agent',
    icon: FileText,
    description: 'Generate marketing materials and content strategies',
    route: '/agents/content',
    sessionRoute: '/agents/content/session',
    agentType: 'content',
    color: 'green',
    bgColor: 'bg-green-50 dark:bg-green-950',
    hoverColor: 'hover:bg-green-100 dark:hover:bg-green-900',
    borderColor: 'hover:border-green-500',
    availableFor: ['SME', 'AGENCY'] as const
  },
  performance_intelligence: {
    name: 'Performance Intelligence Agent',
    icon: LineChart,
    description: 'ROI tracking, analytics, and quick wins',
    route: '/agents/performance-intelligence',
    sessionRoute: '/agents/performance-intelligence/session',
    agentType: 'performance_intelligence',
    color: 'cyan',
    bgColor: 'bg-cyan-50 dark:bg-cyan-950',
    hoverColor: 'hover:bg-cyan-100 dark:hover:bg-cyan-900',
    borderColor: 'hover:border-cyan-500',
    availableFor: ['SME', 'AGENCY'] as const
  },
  competitive_intelligence: {
    name: 'Competitive Intelligence Agent',
    icon: TrendingDown,
    description: 'Market analysis and competitive positioning',
    route: '/agents/competitive-intelligence',
    sessionRoute: '/agents/competitive-intelligence/session',
    agentType: 'competitive_intelligence',
    color: 'indigo',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950',
    hoverColor: 'hover:bg-indigo-100 dark:hover:bg-indigo-900',
    borderColor: 'hover:border-indigo-500',
    availableFor: ['SME', 'AGENCY'] as const
  },
  client_success: {
    name: 'Client Success Agent',
    icon: HeartHandshake,
    description: 'Client retention and health scoring',
    route: '/agents/client-success',
    sessionRoute: '/agents/client-success/session',
    agentType: 'client_success',
    color: 'pink',
    bgColor: 'bg-pink-50 dark:bg-pink-950',
    hoverColor: 'hover:bg-pink-100 dark:hover:bg-pink-900',
    borderColor: 'hover:border-pink-500',
    availableFor: ['AGENCY'] as const // Only for agency users
  }
};

export function ActionPlanButtons({
  actionPlan,
  sessionContext,
  position = 'inline',
  enableWorkflowOrchestration = true
}: ActionPlanButtonsProps) {
  const { t } = useTranslation(['agents']);
  const navigate = useNavigate();
  const { data: identity } = useUserIdentity();
  const { clientSlug } = useClientContext();
  const orgType = (identity?.organization?.type || 'SME') as 'SME' | 'AGENCY'; // Default to SME if not loaded

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedAction, setSelectedAction] = useState<{
    agent: string;
    items: ActionPlanItem[];
    context: any;
  } | null>(null);

  // Workflow orchestration state
  const [workflowSuggestions, setWorkflowSuggestions] = useState<SmartWorkflowSuggestion[]>([]);
  const [showWorkflowSuggestions, setShowWorkflowSuggestions] = useState(false);
  const [, setSelectedWorkflow] = useState<SmartWorkflowSuggestion | null>(null);
  const [showWorkflowDialog, setShowWorkflowDialog] = useState(false);
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowProgress | null>(null);
  const [loadingWorkflowSuggestions, setLoadingWorkflowSuggestions] = useState(false);

  // Group action items by suggested agent
  const groupedActions = actionPlan.items.reduce((acc, item) => {
    if (item.suggestedAgent && item.confidence > 0.7) {
      if (!acc[item.suggestedAgent]) {
        acc[item.suggestedAgent] = [];
      }
      acc[item.suggestedAgent].push(item);
    }
    return acc;
  }, {} as Record<string, ActionPlanItem[]>);

  // Load workflow suggestions when action plan changes
  useEffect(() => {
    if (enableWorkflowOrchestration &&
        sessionContext.organizationId &&
        actionPlan.items.length > 2) {
      loadWorkflowSuggestions();
    }
  }, [actionPlan, enableWorkflowOrchestration, sessionContext.organizationId]);

  // Check for active workflows
  useEffect(() => {
    if (sessionContext.organizationId) {
      loadActiveWorkflow();
    }
  }, [sessionContext.organizationId]);

  const loadWorkflowSuggestions = async () => {
    if (!sessionContext.organizationId) return;

    setLoadingWorkflowSuggestions(true);
    try {
      const suggestions = await workflowOrchestrationService.suggestWorkflowTemplates(
        actionPlan,
        {
          organizationId: sessionContext.organizationId,
          campaignId: sessionContext.campaignId,
          triggerAgent: sessionContext.triggerAgent || 'strategy',
          businessContext: sessionContext.strategyOutput
        }
      );
      setWorkflowSuggestions(suggestions);
    } catch (error) {
      console.error('Error loading workflow suggestions:', error);
    } finally {
      setLoadingWorkflowSuggestions(false);
    }
  };

  const loadActiveWorkflow = async () => {
    if (!sessionContext.organizationId) return;

    try {
      const workflows = await workflowOrchestrationService.getSavedWorkflows(
        sessionContext.organizationId
      );
      const activeWorkflow = workflows.find(w => !w.completedAt);
      setActiveWorkflow(activeWorkflow || null);
    } catch (error) {
      console.error('Error loading active workflow:', error);
    }
  };

  const handleCreateWorkflow = async (suggestion: SmartWorkflowSuggestion) => {
    if (!sessionContext.organizationId) return;

    try {
      const workflow = await workflowOrchestrationService.createWorkflowFromTemplate(
        suggestion.templateId,
        {
          organizationId: sessionContext.organizationId,
          campaignId: sessionContext.campaignId,
          triggerAgent: sessionContext.triggerAgent || 'strategy',
          sessionId: sessionContext.sessionId,
          customizations: suggestion.customizations
        }
      );

      if (workflow) {
        setActiveWorkflow(workflow);
        setShowWorkflowDialog(false);
        // Auto-navigate to first step
        if (workflow.steps[0]) {
          const firstStep = workflow.steps[0];
          const config = agentConfig[firstStep.agentType as keyof typeof agentConfig];
          if (config) {
            const targetUrl = buildAgentRootUrl(firstStep.agentType, clientSlug);
            navigate(targetUrl, {
              state: {
                workflowContext: {
                  workflowId: workflow.id,
                  stepId: firstStep.id,
                  isWorkflowStep: true
                }
              }
            });
          }
        }
      }
    } catch (error) {
      console.error('Error creating workflow:', error);
    }
  };

  const handleResumeWorkflow = () => {
    if (!activeWorkflow) return;

    const currentStep = activeWorkflow.steps[activeWorkflow.currentStepIndex];
    if (currentStep) {
      const config = agentConfig[currentStep.agentType as keyof typeof agentConfig];
      if (config) {
        const targetUrl = buildAgentRootUrl(currentStep.agentType, clientSlug);
        navigate(targetUrl, {
          state: {
            workflowContext: {
              workflowId: activeWorkflow.id,
              stepId: currentStep.id,
              isWorkflowStep: true
            }
          }
        });
      }
    }
  };

  // Don't render if no actionable items and no workflow options
  if (Object.keys(groupedActions).length === 0 &&
      workflowSuggestions.length === 0 &&
      !activeWorkflow) {
    return null;
  }

  const handleActionClick = (agent: string, items: ActionPlanItem[]) => {
    // Prepare context for the next agent
    const context = {
      fromStrategy: true,
      strategySessionId: sessionContext.sessionId,
      actionItems: items.map(item => ({
        task: item.text,
        timeframe: item.timeframe,
        priority: item.confidence > 0.85 ? 'high' : 'medium',
        category: item.category
      })),
      strategyInsights: extractRelevantInsights(sessionContext.strategyOutput, agent),
      suggestedPrompt: generatePromptForAgent(agent, items),
      clientId: sessionContext.clientId,
      campaignId: sessionContext.campaignId
    };

    setSelectedAction({ agent, items, context });
    setShowConfirmDialog(true);
  };

  const confirmNavigation = async () => {
    console.log('[ActionPlanButtons] confirmNavigation called', { selectedAction });

    if (selectedAction) {
      console.log('[ActionPlanButtons] selectedAction.agent:', selectedAction.agent);

      // Store context in sessionStorage for the next agent
      sessionStorage.setItem('crossAgentContext', JSON.stringify(selectedAction.context));

      const config = agentConfig[selectedAction.agent as keyof typeof agentConfig];

      console.log('[ActionPlanButtons] Navigation config:', {
        agent: selectedAction.agent,
        config: config ? 'found' : 'NOT FOUND',
        clientSlug,
        hasSessionRoute: !!config?.sessionRoute,
        availableAgents: Object.keys(agentConfig)
      });

      if (!config) {
        console.error('[ActionPlanButtons] ❌ No config found for agent:', selectedAction.agent, 'Available agents:', Object.keys(agentConfig));
        return;
      }

      if (config) {
        try {
          // If agent supports sessions, create a new session
          if (config.sessionRoute) {
            console.log('[ActionPlanButtons] Creating new session for', selectedAction.agent);

            let response;
            try {
              response = await authFetch(`${API_BASE_URL}/api/v1/direct-agents/sessions`, {
                method: 'POST',
                body: JSON.stringify({
                  agent_type: config.agentType || selectedAction.agent, // Use backend agent type mapping
                  campaign_id: sessionContext.campaignId,
                  client_id: sessionContext.clientId,
                  mode: 'guided' // Coming from strategy agent with context
                }),
              });
              console.log('[ActionPlanButtons] Session creation response:', {
                ok: response.ok,
                status: response.status,
                agent_type: config.agentType || selectedAction.agent
              });
            } catch (apiError) {
              console.error('[ActionPlanButtons] ❌ API call failed:', apiError);
              throw apiError;
            }

            if (response.ok) {
              const { session_id } = await response.json();

              // Content agent uses tool-based routing (/content/tool/chat)
              // All other agents use session-based routing (/agent/session/id)
              const targetUrl = selectedAction.agent === 'content'
                ? buildContentToolUrl('chat', clientSlug)
                : buildAgentSessionUrl(selectedAction.agent, session_id, clientSlug);

              console.log('[ActionPlanButtons] Navigating to:', targetUrl, '(agent:', selectedAction.agent, ')');

              // Store navigation state in sessionStorage for the target agent to retrieve
              const navigationState = {
                prefillContext: selectedAction.context,
                fromAgent: 'strategy',
                sourceSessionId: sessionContext.sessionId,
                actionItems: selectedAction.items,
                initialMessage: selectedAction.context.suggestedPrompt,
                sessionId: session_id
              };
              sessionStorage.setItem('navigationState', JSON.stringify(navigationState));

              console.log('[ActionPlanButtons] Executing immediate navigation');

              // Use React Router navigate with state for context passing
              navigate(targetUrl, {
                replace: false,
                state: navigationState
              });

              // Close dialog AFTER navigate is called
              setShowConfirmDialog(false);

              return;
            } else {
              // Fallback when session creation fails - still route to chat for Content agent
              const sessionParam = sessionContext.sessionId ?
                `?fromSession=${sessionContext.sessionId}` : '';

              // Content agent: route to chat tool even in fallback case
              // Other agents: route to their root URL
              const targetUrl = selectedAction.agent === 'content'
                ? buildContentToolUrl('chat', clientSlug) + sessionParam
                : buildAgentRootUrl(selectedAction.agent, clientSlug) + sessionParam;

              console.log('[ActionPlanButtons] Session creation failed, fallback to:', targetUrl);

              navigate(targetUrl, {
                state: {
                  prefillContext: selectedAction.context,
                  fromAgent: 'strategy',
                  sourceSessionId: sessionContext.sessionId,
                  actionItems: selectedAction.items
                }
              });
            }
          } else {
            // For agents without session support, navigate to appropriate route
            const sessionParam = sessionContext.sessionId ?
              `?fromSession=${sessionContext.sessionId}` : '';

            // Content agent: route to chat tool
            // Other agents: route to their root URL
            const targetUrl = selectedAction.agent === 'content'
              ? buildContentToolUrl('chat', clientSlug) + sessionParam
              : buildAgentRootUrl(selectedAction.agent, clientSlug) + sessionParam;

            console.log('[ActionPlanButtons] No session route, navigating to:', targetUrl);

            navigate(targetUrl, {
              state: {
                prefillContext: selectedAction.context,
                fromAgent: 'strategy',
                sourceSessionId: sessionContext.sessionId,
                actionItems: selectedAction.items
              }
            });
          }
        } catch (error) {
          console.error('[ActionPlanButtons] Error creating session for', selectedAction.agent, ':', error);
          // Fallback navigation - still route to chat for Content agent
          const targetUrl = selectedAction.agent === 'content'
            ? buildContentToolUrl('chat', clientSlug)
            : buildAgentRootUrl(selectedAction.agent, clientSlug);
          console.log('[ActionPlanButtons] Error fallback, navigating to:', targetUrl);

          navigate(targetUrl, {
            state: {
              prefillContext: selectedAction.context,
              fromAgent: 'strategy',
              sourceSessionId: sessionContext.sessionId,
              actionItems: selectedAction.items
            }
          });
        }
      } else {
        console.error('[ActionPlanButtons] No config found for agent:', selectedAction.agent);
      }
    } else {
      console.error('[ActionPlanButtons] No selectedAction when confirmNavigation called');
    }
  };

  // Inline button layout (appears within the message)
  if (position === 'inline') {
    return (
      <TooltipProvider>
        <div className="mt-6 space-y-4" data-testid="action-plan-buttons">
          {/* Active Workflow Display */}
          {activeWorkflow && (
            <WorkflowProgressTracker
              workflow={activeWorkflow}
              onResumeWorkflow={handleResumeWorkflow}
              compact={true}
              className="border-slate-200 bg-slate-50 dark:bg-slate-950/30"
            />
          )}

          {/* Smart Workflow Suggestions */}
          {enableWorkflowOrchestration && workflowSuggestions.length > 0 && !activeWorkflow && (
            <div className="p-4 bg-gradient-to-r from-slate-50 to-amber-50 dark:from-slate-950/30 dark:to-indigo-950/30 rounded-lg border border-slate-200 dark:border-slate-800">
              <Collapsible open={showWorkflowSuggestions} onOpenChange={setShowWorkflowSuggestions}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between p-0 hover:bg-transparent"
                  >
                    <div className="flex items-center gap-2">
                      <Workflow className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      <span className="font-medium text-sm text-gray-700 dark:text-gray-300">
                        {t('agents:context.actionPlan.workflowSuggestions', { count: workflowSuggestions.length })}
                      </span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showWorkflowSuggestions ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>

                <CollapsibleContent className="mt-3 space-y-2">
                  {workflowSuggestions.slice(0, 2).map((suggestion) => (
                    <div
                      key={suggestion.templateId}
                      className="p-3 bg-white dark:bg-gray-900 rounded border border-amber-100 dark:border-slate-800"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{suggestion.templateName}</span>
                            <Badge variant="outline" className="text-xs">
                              {t('agents:context.actionPlan.match', { percent: Math.round(suggestion.confidence * 100) })}
                            </Badge>
                            <Badge
                              variant={suggestion.estimatedImpact === 'high' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {t('agents:context.actionPlan.impact', { level: suggestion.estimatedImpact })}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                            {suggestion.reasoning}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          {suggestion.nextBestActions.slice(0, 3).map((action, idx) => (
                            <Badge key={idx} variant="outline" className="text-[10px]">
                              {action.agentType}
                            </Badge>
                          ))}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedWorkflow(suggestion);
                            setShowWorkflowDialog(true);
                          }}
                          className="text-xs bg-amber-600 hover:bg-slate-700"
                        >
                          <Sparkles className="w-3 h-3 mr-1" />
                          {t('agents:context.actionPlan.startWorkflow')}
                        </Button>
                      </div>
                    </div>
                  ))}

                  {workflowSuggestions.length > 2 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => setShowWorkflowDialog(true)}
                    >
                      {t('agents:context.actionPlan.viewAllSuggestions', { count: workflowSuggestions.length })}
                    </Button>
                  )}
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}

          {/* Individual Agent Actions */}
          {Object.keys(groupedActions).length > 0 && (
            <div className="p-4 bg-gradient-to-r from-slate-50 to-amber-50 dark:from-slate-950/30 dark:to-amber-950/30 rounded-lg border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                <span className="font-medium text-sm text-gray-700 dark:text-gray-300">
                  {t('agents:context.actionPlan.individualActions')} {actionPlan.overallTimeframe && `(${actionPlan.overallTimeframe})`}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {Object.entries(groupedActions).map(([agent, items]) => {
                  const config = agentConfig[agent as keyof typeof agentConfig];
                  if (!config) return null;

                  // Filter out agents not available for current user type
                  if (!(config.availableFor as readonly string[]).includes(orgType)) {
                    return null;
                  }

                  // Filter out the current agent (don't show Persona Agent when already in Persona Agent)
                  if (sessionContext.triggerAgent && agent === sessionContext.triggerAgent) {
                    return null;
                  }

                  return (
                    <Tooltip key={agent}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={`group ${config.borderColor} ${config.hoverColor} transition-all duration-200`}
                          onClick={() => handleActionClick(agent, items)}
                          data-testid="action-plan-button"
                        >
                          <config.icon className="w-4 h-4 mr-2" />
                          {config.name}
                          <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                          <span className="ml-1 text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                            {items.length}
                          </span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{config.description}</p>
                        <p className="text-xs mt-1 text-gray-400">
                          {t('agents:context.actionPlan.relatedTasks', { count: items.length })}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Workflow Selection Dialog */}
        <Dialog open={showWorkflowDialog} onOpenChange={setShowWorkflowDialog}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Workflow className="w-5 h-5 text-amber-600" />
                {t('agents:context.actionPlan.workflowSuggestions', { count: workflowSuggestions.length }).replace(` (${workflowSuggestions.length})`, '')}
              </DialogTitle>
              <DialogDescription>
                Choose a workflow that matches your goals and current business context
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              {workflowSuggestions.map((suggestion) => (
                <div
                  key={suggestion.templateId}
                  className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-base">{suggestion.templateName}</h4>
                        <Badge variant="outline">
                          {Math.round(suggestion.confidence * 100)}% match
                        </Badge>
                        <Badge
                          variant={suggestion.estimatedImpact === 'high' ? 'default' : 'secondary'}
                        >
                          {suggestion.estimatedImpact} impact
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {suggestion.reasoning}
                      </p>

                      {/* Next Best Actions */}
                      <div className="mb-3">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('agents:context.actionPlan.nextBestActions')}
                        </p>
                        <div className="space-y-1">
                          {suggestion.nextBestActions.slice(0, 3).map((action, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs">
                              <Badge variant="outline" className="text-[10px]">
                                {action.agentType}
                              </Badge>
                              <span className="text-gray-600 dark:text-gray-400">
                                {t('agents:context.actionPlan.priority', { value: action.priority })}
                              </span>
                              <span className="text-gray-500">
                                {action.reasoning}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Customizations */}
                      {suggestion.customizations && (
                        <div className="text-xs text-gray-500">
                          {suggestion.customizations.skipSteps && suggestion.customizations.skipSteps.length > 0 && (
                            <span>Will skip: {suggestion.customizations.skipSteps.join(', ')}</span>
                          )}
                          {suggestion.customizations.prioritySteps && suggestion.customizations.prioritySteps.length > 0 && (
                            <span className="ml-2">
                              Priority: {suggestion.customizations.prioritySteps.join(', ')}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={() => handleCreateWorkflow(suggestion)}
                      className="ml-4 bg-amber-600 hover:bg-slate-700"
                    >
                      <Target className="w-4 h-4 mr-1" />
                      {t('agents:context.actionPlan.start')}
                    </Button>
                  </div>
                </div>
              ))}

              {workflowSuggestions.length === 0 && !loadingWorkflowSuggestions && (
                <div className="text-center py-8 text-gray-500">
                  <Workflow className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>{t('agents:context.actionPlan.noSuggestions')}</p>
                  <p className="text-xs mt-1">{t('agents:context.actionPlan.noSuggestionsHint')}</p>
                </div>
              )}

              {loadingWorkflowSuggestions && (
                <div className="text-center py-8 text-gray-500">
                  <div className="animate-spin w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full mx-auto mb-3"></div>
                  <p>{t('agents:context.actionPlan.analyzingPlan')}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Confirmation Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {t('agents:context.actionPlan.confirmTitle', { agentName: selectedAction && agentConfig[selectedAction.agent as keyof typeof agentConfig]?.name })}
              </DialogTitle>
              <DialogDescription>
                {t('agents:context.actionPlan.confirmDescription')}
              </DialogDescription>
            </DialogHeader>
            
            {selectedAction && (
              <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto">
                {selectedAction.items.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm p-2 bg-gray-50 dark:bg-gray-900 rounded">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <span className="text-gray-700 dark:text-gray-300">{item.text}</span>
                      {item.timeframe && (
                        <span className="text-gray-500 dark:text-gray-400 ml-2 text-xs">({item.timeframe})</span>
                      )}
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                          ${item.category === 'research' ? 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200' : ''}
                          ${item.category === 'marketing' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : ''}
                          ${item.category === 'sales' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' : ''}
                          ${item.category === 'product' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : ''}
                          ${item.category === 'general' ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' : ''}
                        `}>
                          {item.category}
                        </span>
                        <span className="ml-2 text-xs text-gray-500">
                          {t('agents:context.actionPlan.confidence', { percent: Math.round(item.confidence * 100) })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {selectedAction.items.length > 5 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                    {t('agents:context.actionPlan.andMoreTasks', { count: selectedAction.items.length - 5 })}
                  </p>
                )}
              </div>
            )}
            
            <div className="flex gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1"
              >
                {t('agents:context.actionPlan.stayHere')}
              </Button>
              <Button
                onClick={confirmNavigation}
                className="flex-1 bg-gradient-to-r from-brand-gold to-amber-400 hover:from-amber-600 hover:to-amber-500 text-white"
              >
                {t('agents:context.actionPlan.continueToAgent')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </TooltipProvider>
    );
  }

  // Floating button layout (sticky at bottom of screen)
  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white dark:bg-gray-900 rounded-lg shadow-lg p-3 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="w-4 h-4 text-slate-600 dark:text-slate-400" />
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('agents:context.actionPlan.nextStepsAvailable')}</span>
      </div>
      <div className="flex gap-2">
        {Object.entries(groupedActions).slice(0, 3).map(([agent, items]) => {
          const config = agentConfig[agent as keyof typeof agentConfig];
          if (!config) return null;

          // Filter out agents not available for current user type
          if (!(config.availableFor as readonly string[]).includes(orgType)) {
            return null;
          }

          // Filter out the current agent (don't show Persona Agent when already in Persona Agent)
          if (sessionContext.triggerAgent && agent === sessionContext.triggerAgent) {
            return null;
          }

          return (
            <Button
              key={agent}
              variant="outline"
              size="sm"
              className="group"
              onClick={() => handleActionClick(agent, items)}
            >
              <config.icon className="w-4 h-4" />
            </Button>
          );
        })}
      </div>
    </div>
  );
}