/**
 * Workflow Orchestration Service
 *
 * Enhanced service that builds on existing ActionPlanButtons and CrossAgentIntelligenceService
 * to provide intelligent multi-step workflow management with context preservation.
 */

import type { DetectedActionPlan } from '@/utils/actionPlanDetector';
import type { WorkflowStep, WorkflowProgress } from '@/components/workflow/WorkflowProgressTracker';
import { API_BASE_URL } from '@/lib/api';
import { getLocaleHeaders } from '@/lib/apiHeaders';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'market-entry' | 'growth-hack' | 'client-rescue' | 'full-cycle' | 'custom';
  estimatedDuration: string;
  steps: WorkflowStepTemplate[];
  successMetrics: string[];
  prerequisites?: string[];
}

interface WorkflowStepTemplate {
  id: string;
  title: string;
  description: string;
  agentType: string;
  estimatedDuration: string;
  dependencies: string[];
  optional: boolean;
  autoTriggerConditions?: {
    requiredOutputTypes?: string[];
    confidenceThreshold?: number;
  };
  contextMapping: {
    inputSources: string[]; // Which previous steps provide input
    outputKeys: string[]; // What this step produces for next steps
  };
}

export interface WorkflowContext {
  sessionId: string;
  organizationId: string;
  campaignId?: string;
  triggerAgent: string;
  businessContext: any;
  crossAgentInsights: any[];
  stepOutputs: Record<string, any[]>; // stepId -> outputs
  progressData: {
    completedSteps: string[];
    currentStep?: string;
    skippedSteps: string[];
    startedAt: string;
  };
}

export interface SmartWorkflowSuggestion {
  templateId: string;
  templateName: string;
  confidence: number;
  reasoning: string;
  estimatedImpact: 'high' | 'medium' | 'low';
  customizations: {
    skipSteps?: string[];
    prioritySteps?: string[];
    additionalContext?: Record<string, any>;
  };
  nextBestActions: Array<{
    stepId: string;
    agentType: string;
    priority: number;
    reasoning: string;
  }>;
}

class WorkflowOrchestrationService {
  private baseUrl = API_BASE_URL;

  // Predefined workflow templates with enhanced intelligence flows
  private templates: WorkflowTemplate[] = [
    {
      id: 'market-entry-complete',
      name: 'Complete Market Entry',
      description: 'Comprehensive market analysis and strategy development with execution plan',
      category: 'market-entry',
      estimatedDuration: '2-3 weeks',
      steps: [
        {
          id: 'strategy-foundation',
          title: 'Strategic Foundation',
          description: 'SWOT, Porter\'s Five Forces, and market positioning analysis',
          agentType: 'strategy',
          estimatedDuration: '3-4 days',
          dependencies: [],
          optional: false,
          contextMapping: {
            inputSources: [],
            outputKeys: ['strategic_frameworks', 'market_opportunities', 'competitive_position']
          }
        },
        {
          id: 'competitive-analysis',
          title: 'Competitive Intelligence',
          description: 'Deep competitive analysis and differentiation opportunities',
          agentType: 'competitive-intelligence',
          estimatedDuration: '2-3 days',
          dependencies: ['strategy-foundation'],
          optional: false,
          contextMapping: {
            inputSources: ['strategy-foundation'],
            outputKeys: ['competitive_gaps', 'market_white_spaces', 'differentiation_strategy']
          }
        },
        {
          id: 'persona-development',
          title: 'Buyer Persona Development',
          description: 'Create detailed personas based on strategic insights',
          agentType: 'persona',
          estimatedDuration: '3-5 days',
          dependencies: ['strategy-foundation', 'competitive-analysis'],
          optional: false,
          contextMapping: {
            inputSources: ['strategy-foundation', 'competitive-analysis'],
            outputKeys: ['buyer_personas', 'journey_maps', 'pain_point_analysis']
          }
        },
        {
          id: 'content-strategy',
          title: 'Content Strategy & Creation',
          description: 'Develop content strategy and initial materials',
          agentType: 'content',
          estimatedDuration: '1-2 weeks',
          dependencies: ['persona-development'],
          optional: false,
          contextMapping: {
            inputSources: ['persona-development', 'strategy-foundation'],
            outputKeys: ['content_strategy', 'content_calendar', 'brand_messaging']
          }
        },
        {
          id: 'ad-creative-development',
          title: 'Ad Creative & Campaign Assets',
          description: 'Create advertising creatives and campaign materials',
          agentType: 'ad-creative',
          estimatedDuration: '4-5 days',
          dependencies: ['content-strategy', 'persona-development'],
          optional: false,
          contextMapping: {
            inputSources: ['content-strategy', 'persona-development'],
            outputKeys: ['ad_creatives', 'campaign_assets', 'platform_strategies']
          }
        },
        {
          id: 'campaign-execution',
          title: 'Campaign Execution Plan',
          description: 'Develop execution timeline and launch strategy',
          agentType: 'campaign-execution',
          estimatedDuration: '2-3 days',
          dependencies: ['ad-creative-development'],
          optional: false,
          contextMapping: {
            inputSources: ['ad-creative-development', 'content-strategy'],
            outputKeys: ['execution_plan', 'timeline', 'success_metrics']
          }
        }
      ],
      successMetrics: [
        'Strategic foundation validated',
        'Buyer personas created and validated',
        'Content strategy with 30+ pieces planned',
        'Campaign execution plan with timeline',
        'Success metrics and KPIs defined'
      ]
    },
    {
      id: 'growth-acceleration',
      name: 'Growth Acceleration Sprint',
      description: 'Rapid growth through quick wins and optimization',
      category: 'growth-hack',
      estimatedDuration: '1-2 weeks',
      steps: [
        {
          id: 'quick-wins-analysis',
          title: 'Quick Wins Identification',
          description: 'Identify immediate high-impact opportunities',
          agentType: 'quick-wins',
          estimatedDuration: '1-2 days',
          dependencies: [],
          optional: false,
          contextMapping: {
            inputSources: [],
            outputKeys: ['quick_opportunities', 'impact_analysis', 'resource_requirements']
          }
        },
        {
          id: 'campaign-optimization',
          title: 'Campaign Optimization',
          description: 'Optimize existing campaigns and create new ones',
          agentType: 'campaign-execution',
          estimatedDuration: '3-4 days',
          dependencies: ['quick-wins-analysis'],
          optional: false,
          contextMapping: {
            inputSources: ['quick-wins-analysis'],
            outputKeys: ['optimized_campaigns', 'new_channels', 'budget_allocation']
          }
        },
        {
          id: 'analytics-setup',
          title: 'Analytics & Tracking',
          description: 'Set up tracking and measurement for optimization',
          agentType: 'analytics',
          estimatedDuration: '1-2 days',
          dependencies: ['campaign-optimization'],
          optional: false,
          contextMapping: {
            inputSources: ['campaign-optimization'],
            outputKeys: ['tracking_setup', 'metrics_dashboard', 'optimization_triggers']
          }
        },
        {
          id: 'roi-optimization',
          title: 'ROI Analysis & Budget Optimization',
          description: 'Analyze ROI and optimize budget allocation',
          agentType: 'roi-budget',
          estimatedDuration: '2-3 days',
          dependencies: ['analytics-setup'],
          optional: false,
          contextMapping: {
            inputSources: ['analytics-setup', 'campaign-optimization'],
            outputKeys: ['roi_analysis', 'budget_recommendations', 'scaling_plan']
          }
        }
      ],
      successMetrics: [
        'Quick wins identified and prioritized',
        'Campaign optimizations implemented',
        'Analytics and tracking configured',
        'ROI improvement plan established'
      ]
    }
  ];

  /**
   * Analyze current action plan and suggest optimal workflow templates
   */
  async suggestWorkflowTemplates(
    actionPlan: DetectedActionPlan,
    context: {
      organizationId: string;
      campaignId?: string;
      triggerAgent: string;
      businessContext?: any;
    }
  ): Promise<SmartWorkflowSuggestion[]> {
    try {
      // Get cross-agent insights for context
      const crossAgentInsights = await this.getCrossAgentContext(context.organizationId);

      // Analyze action plan items to determine best workflow templates
      const suggestions: SmartWorkflowSuggestion[] = [];

      for (const template of this.templates) {
        const confidence = this.calculateTemplateConfidence(actionPlan, template);

        if (confidence > 0.4) { // Only suggest templates with reasonable confidence
          const customizations = this.generateTemplateCustomizations(
            actionPlan,
            template,
            crossAgentInsights
          );

          suggestions.push({
            templateId: template.id,
            templateName: template.name,
            confidence,
            reasoning: this.generateReasoningForTemplate(actionPlan, template),
            estimatedImpact: this.estimateImpact(actionPlan, template),
            customizations,
            nextBestActions: this.generateNextBestActions(template, actionPlan)
          });
        }
      }

      // Sort by confidence and impact
      return suggestions.sort((a, b) => {
        const impactWeight = { high: 3, medium: 2, low: 1 };
        const scoreA = a.confidence * 0.7 + (impactWeight[a.estimatedImpact] / 3) * 0.3;
        const scoreB = b.confidence * 0.7 + (impactWeight[b.estimatedImpact] / 3) * 0.3;
        return scoreB - scoreA;
      });

    } catch (error) {
      console.error('Error suggesting workflow templates:', error);
      return [];
    }
  }

  /**
   * Create a new workflow instance from a template
   */
  async createWorkflowFromTemplate(
    templateId: string,
    context: {
      organizationId: string;
      campaignId?: string;
      triggerAgent: string;
      sessionId: string;
      customizations?: any;
    }
  ): Promise<WorkflowProgress | null> {
    try {
      const template = this.templates.find(t => t.id === templateId);
      if (!template) {
        throw new Error(`Template ${templateId} not found`);
      }

      // Get cross-agent context for intelligent step preparation
      const crossAgentInsights = await this.getCrossAgentContext(context.organizationId);

      const workflowId = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const workflow: WorkflowProgress = {
        id: workflowId,
        name: template.name,
        description: template.description,
        currentStepIndex: 0,
        startedAt: new Date().toISOString(),
        totalEstimatedTime: template.estimatedDuration,
        steps: template.steps.map((stepTemplate, index) => ({
          id: stepTemplate.id,
          title: stepTemplate.title,
          description: stepTemplate.description,
          agentType: stepTemplate.agentType,
          status: index === 0 ? 'in_progress' : 'pending',
          estimatedDuration: stepTemplate.estimatedDuration,
          dependencies: stepTemplate.dependencies,
          optional: stepTemplate.optional
        })),
        metadata: {
          templateType: template.category,
          triggerAgent: context.triggerAgent,
          organizationGoal: crossAgentInsights.organizationGoals?.[0] || 'Growth and optimization'
        }
      };

      // Save workflow to storage
      await this.saveWorkflowProgress(workflow, context.organizationId);

      return workflow;

    } catch (error) {
      console.error('Error creating workflow from template:', error);
      return null;
    }
  }

  /**
   * Get cross-agent context using existing service
   */
  private async getCrossAgentContext(organizationId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/cross-agent-intelligence/${organizationId}`, {
        headers: getLocaleHeaders(),
      });
      if (response.ok) {
        return await response.json();
      }
      return {};
    } catch (error) {
      console.error('Error fetching cross-agent context:', error);
      return {};
    }
  }

  /**
   * Calculate confidence score for template suggestion
   */
  private calculateTemplateConfidence(
    actionPlan: DetectedActionPlan,
    template: WorkflowTemplate
  ): number {
    let confidence = 0;
    const items = actionPlan.items;

    // Check coverage of action plan items by template steps
    const templateAgents = new Set(template.steps.map(s => s.agentType));
    const actionAgents = new Set(items.map(i => i.suggestedAgent).filter(Boolean));

    const agentOverlap = [...actionAgents].filter(agent => agent && templateAgents.has(agent)).length;
    const agentCoverage = actionAgents.size > 0 ? agentOverlap / actionAgents.size : 0;

    confidence += agentCoverage * 0.6;

    // Check if high-confidence action items match template focus
    const highConfidenceItems = items.filter(i => i.confidence > 0.8);
    if (template.category === 'market-entry' &&
        highConfidenceItems.some(i => i.category === 'research' || i.category === 'marketing')) {
      confidence += 0.3;
    }

    if (template.category === 'growth-hack' &&
        highConfidenceItems.some(i => i.timeframe?.includes('week') || i.category === 'sales')) {
      confidence += 0.3;
    }

    // Bonus for timeframe alignment
    const overallTimeframe = actionPlan.overallTimeframe;
    if (overallTimeframe) {
      if (template.estimatedDuration.includes('week') && overallTimeframe.includes('week')) {
        confidence += 0.1;
      }
      if (template.estimatedDuration.includes('month') && overallTimeframe.includes('month')) {
        confidence += 0.1;
      }
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Generate template customizations based on action plan
   */
  private generateTemplateCustomizations(
    actionPlan: DetectedActionPlan,
    template: WorkflowTemplate,
    crossAgentInsights: any
  ): SmartWorkflowSuggestion['customizations'] {
    const customizations: SmartWorkflowSuggestion['customizations'] = {};

    // Identify steps to skip based on existing outputs
    const skipSteps: string[] = [];
    if (crossAgentInsights.strategy_outputs?.length > 0) {
      const hasRecentStrategy = crossAgentInsights.strategy_outputs.some((output: any) =>
        new Date(output.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      );
      if (hasRecentStrategy) {
        skipSteps.push('strategy-foundation');
      }
    }

    if (crossAgentInsights.customer_personas?.length > 0) {
      skipSteps.push('persona-development');
    }

    if (skipSteps.length > 0) {
      customizations.skipSteps = skipSteps;
    }

    // Identify priority steps based on action plan confidence
    const prioritySteps = actionPlan.items
      .filter(item => item.confidence > 0.85)
      .map(item => {
        const matchingStep = template.steps.find(step =>
          step.agentType === item.suggestedAgent
        );
        return matchingStep?.id;
      })
      .filter(Boolean) as string[];

    if (prioritySteps.length > 0) {
      customizations.prioritySteps = prioritySteps;
    }

    // Add additional context from cross-agent insights
    customizations.additionalContext = {
      existingStrategies: crossAgentInsights.strategy_outputs?.length || 0,
      existingPersonas: crossAgentInsights.customer_personas?.length || 0,
      businessMaturity: this.assessBusinessMaturity(crossAgentInsights)
    };

    return customizations;
  }

  /**
   * Generate reasoning for template suggestion
   */
  private generateReasoningForTemplate(
    actionPlan: DetectedActionPlan,
    template: WorkflowTemplate
  ): string {
    const reasons: string[] = [];

    const actionAgents = new Set(
      actionPlan.items.map(i => i.suggestedAgent).filter(Boolean)
    );
    const templateAgents = new Set(template.steps.map(s => s.agentType));
    const overlap = [...actionAgents].filter(agent => agent && templateAgents.has(agent));

    if (overlap.length > 0) {
      reasons.push(`Covers ${overlap.length} of your priority areas: ${overlap.join(', ')}`);
    }

    const urgentItems = actionPlan.items.filter(i =>
      i.timeframe?.includes('week') || i.confidence > 0.9
    );
    if (urgentItems.length > 0 && template.category === 'growth-hack') {
      reasons.push(`Addresses ${urgentItems.length} urgent action items`);
    }

    const comprehensiveItems = actionPlan.items.filter(i =>
      i.category === 'research' || i.category === 'marketing'
    );
    if (comprehensiveItems.length > 0 && template.category === 'market-entry') {
      reasons.push(`Provides comprehensive approach for ${comprehensiveItems.length} strategic initiatives`);
    }

    return reasons.join('. ') || 'Well-suited for your current business needs';
  }

  /**
   * Estimate impact of workflow template
   */
  private estimateImpact(
    actionPlan: DetectedActionPlan,
    template: WorkflowTemplate
  ): 'high' | 'medium' | 'low' {
    const highConfidenceItems = actionPlan.items.filter(i => i.confidence > 0.8).length;
    const templateCoverage = template.steps.length;

    if (highConfidenceItems >= 3 && templateCoverage >= 4) {
      return 'high';
    } else if (highConfidenceItems >= 2 || templateCoverage >= 3) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Generate next best actions for workflow
   */
  private generateNextBestActions(
    template: WorkflowTemplate,
    actionPlan: DetectedActionPlan
  ): SmartWorkflowSuggestion['nextBestActions'] {
    const nextActions: SmartWorkflowSuggestion['nextBestActions'] = [];

    // Get first few steps of the template
    const firstSteps = template.steps.slice(0, 3);

    firstSteps.forEach((step, index) => {
      const matchingItems = actionPlan.items.filter(item =>
        item.suggestedAgent === step.agentType
      );

      const priority = matchingItems.length > 0 ?
        Math.max(...matchingItems.map(i => i.confidence)) * 10 :
        (3 - index) * 3; // Earlier steps get higher priority

      nextActions.push({
        stepId: step.id,
        agentType: step.agentType,
        priority: Math.round(priority),
        reasoning: matchingItems.length > 0 ?
          `${matchingItems.length} related action items identified` :
          `Foundational step for ${template.name}`
      });
    });

    return nextActions.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Assess business maturity from cross-agent insights
   */
  private assessBusinessMaturity(crossAgentInsights: any): 'startup' | 'growth' | 'mature' {
    const strategiesCount = crossAgentInsights.strategy_outputs?.length || 0;
    const personasCount = crossAgentInsights.customer_personas?.length || 0;
    const contentCount = crossAgentInsights.content_pieces?.length || 0;

    const totalAssets = strategiesCount + personasCount + contentCount;

    if (totalAssets < 5) return 'startup';
    if (totalAssets < 15) return 'growth';
    return 'mature';
  }

  /**
   * Save workflow progress to storage
   */
  private async saveWorkflowProgress(
    workflow: WorkflowProgress,
    organizationId: string
  ): Promise<void> {
    try {
      // Store in localStorage for now - could be enhanced to use backend storage
      const key = `workflow_${organizationId}_${workflow.id}`;
      localStorage.setItem(key, JSON.stringify(workflow));
    } catch (error) {
      console.error('Error saving workflow progress:', error);
    }
  }

  /**
   * Get saved workflows for organization
   */
  async getSavedWorkflows(organizationId: string): Promise<WorkflowProgress[]> {
    try {
      const workflows: WorkflowProgress[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(`workflow_${organizationId}_`)) {
          const workflowData = localStorage.getItem(key);
          if (workflowData) {
            workflows.push(JSON.parse(workflowData));
          }
        }
      }

      return workflows.sort((a, b) =>
        new Date(b.startedAt || 0).getTime() - new Date(a.startedAt || 0).getTime()
      );
    } catch (error) {
      console.error('Error loading saved workflows:', error);
      return [];
    }
  }

  /**
   * Update workflow step status
   */
  async updateWorkflowStep(
    workflowId: string,
    stepId: string,
    status: WorkflowStep['status'],
    outputs?: WorkflowStep['outputs'],
    organizationId?: string
  ): Promise<void> {
    try {
      if (!organizationId) return;

      const key = `workflow_${organizationId}_${workflowId}`;
      const workflowData = localStorage.getItem(key);

      if (workflowData) {
        const workflow: WorkflowProgress = JSON.parse(workflowData);

        const stepIndex = workflow.steps.findIndex(s => s.id === stepId);
        if (stepIndex !== -1) {
          workflow.steps[stepIndex].status = status;
          if (outputs) {
            workflow.steps[stepIndex].outputs = outputs;
          }
          if (status === 'completed') {
            workflow.steps[stepIndex].completedAt = new Date().toISOString();

            // Move to next step if current
            if (workflow.currentStepIndex === stepIndex) {
              workflow.currentStepIndex = stepIndex + 1;
            }
          }

          localStorage.setItem(key, JSON.stringify(workflow));
        }
      }
    } catch (error) {
      console.error('Error updating workflow step:', error);
    }
  }
}

export const workflowOrchestrationService = new WorkflowOrchestrationService();
