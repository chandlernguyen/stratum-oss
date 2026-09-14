import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2, Clock, AlertCircle, PlayCircle,
  ChevronDown, ChevronRight, Target, Zap
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useLocale } from '@/hooks/useLocale';
import { getIntlLocale } from '@/lib/locales';

export interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  agentType: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'error';
  estimatedDuration?: string;
  completedAt?: string;
  outputs?: Array<{
    id: string;
    title: string;
    summary: string;
    confidence_score: number;
  }>;
  dependencies?: string[]; // IDs of steps that must complete first
  optional?: boolean;
}

export interface WorkflowProgress {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  currentStepIndex: number;
  startedAt?: string;
  completedAt?: string;
  totalEstimatedTime?: string;
  metadata?: {
    templateType?: string;
    triggerAgent?: string;
    organizationGoal?: string;
  };
}

interface WorkflowProgressTrackerProps {
  workflow: WorkflowProgress;
  onStepClick?: (step: WorkflowStep) => void;
  onResumeWorkflow?: () => void;
  compact?: boolean;
  className?: string;
}

const statusConfig = {
  pending: {
    icon: Clock,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-200'
  },
  in_progress: {
    icon: PlayCircle,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  completed: {
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  skipped: {
    icon: ChevronRight,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  },
  error: {
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  }
};

export function WorkflowProgressTracker({
  workflow,
  onStepClick,
  onResumeWorkflow,
  compact = false,
  className
}: WorkflowProgressTrackerProps) {
  const { locale } = useLocale('common');
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [showAllSteps, setShowAllSteps] = useState(false);

  // Calculate progress metrics
  const completedSteps = workflow.steps.filter(step => step.status === 'completed').length;
  const totalSteps = workflow.steps.length;
  const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
  const currentStep = workflow.steps[workflow.currentStepIndex];
  const hasInProgressStep = workflow.steps.some(step => step.status === 'in_progress');

  // Auto-expand current step
  useEffect(() => {
    if (currentStep && currentStep.status === 'in_progress') {
      setExpandedSteps(prev => new Set([...prev, currentStep.id]));
    }
  }, [currentStep]);

  const toggleStepExpansion = (stepId: string) => {
    setExpandedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  };

  const handleStepClick = (step: WorkflowStep) => {
    if (step.status === 'completed' && onStepClick) {
      onStepClick(step);
    }
  };

  const getStepDisplayOrder = () => {
    if (compact && !showAllSteps) {
      // Show current step and next 2 pending steps
      const currentIndex = workflow.currentStepIndex;
      return workflow.steps.slice(currentIndex, currentIndex + 3);
    }
    return workflow.steps;
  };

  const visibleSteps = getStepDisplayOrder();

  return (
    <Card className={cn('workflow-progress-tracker', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="w-5 h-5 text-amber-600" />
              {workflow.name}
            </CardTitle>
            <CardDescription className="text-sm">
              {workflow.description}
            </CardDescription>
          </div>

          {hasInProgressStep && onResumeWorkflow && (
            <Button size="sm" onClick={onResumeWorkflow} className="gap-2">
              <PlayCircle className="w-4 h-4" />
              Continue
            </Button>
          )}
        </div>

        {/* Progress Overview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Progress: {completedSteps} of {totalSteps} steps
            </span>
            <span className="font-medium">{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />

          {workflow.totalEstimatedTime && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              Estimated time: {workflow.totalEstimatedTime}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Workflow Steps */}
        <div className="space-y-2">
          {visibleSteps.map((step) => {
            const config = statusConfig[step.status];
            const Icon = config.icon;
            const isExpanded = expandedSteps.has(step.id);
            const isCurrentStep = step.id === currentStep?.id;

            return (
              <div
                key={step.id}
                className={cn(
                  'border rounded-lg transition-all duration-200',
                  config.borderColor,
                  isCurrentStep && 'ring-2 ring-amber-200',
                  step.status === 'completed' && 'cursor-pointer hover:shadow-sm'
                )}
              >
                <Collapsible
                  open={isExpanded}
                  onOpenChange={() => toggleStepExpansion(step.id)}
                >
                  <CollapsibleTrigger
                    className={cn(
                      'w-full p-3 flex items-center gap-3 text-left',
                      config.bgColor,
                      'hover:bg-opacity-80 transition-colors'
                    )}
                    onClick={(e) => {
                      e.preventDefault();
                      toggleStepExpansion(step.id);
                      handleStepClick(step);
                    }}
                  >
                    <Icon className={cn('w-5 h-5 flex-shrink-0', config.color)} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm truncate">
                          {step.title}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn('text-xs', config.color)}
                        >
                          {step.agentType}
                        </Badge>
                        {step.optional && (
                          <Badge variant="secondary" className="text-xs">
                            Optional
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 truncate">
                        {step.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {step.estimatedDuration && (
                        <span className="text-xs text-gray-500">
                          {step.estimatedDuration}
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="px-3 pb-3">
                    <div className="ml-8 space-y-2">
                      {/* Step Outputs */}
                      {step.outputs && step.outputs.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-gray-700">Outputs:</p>
                          {step.outputs.map((output) => (
                            <div
                              key={output.id}
                              className="bg-white border border-gray-100 rounded p-2 text-xs"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium">{output.title}</span>
                                <Badge variant="outline" className="text-[10px]">
                                  {Math.round(output.confidence_score * 100)}% confidence
                                </Badge>
                              </div>
                              <p className="text-gray-600">{output.summary}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Dependencies */}
                      {step.dependencies && step.dependencies.length > 0 && (
                        <div className="text-xs text-gray-500">
                          <span className="font-medium">Depends on:</span>{' '}
                          {step.dependencies.map((depId) => {
                            const depStep = workflow.steps.find(s => s.id === depId);
                            return depStep?.title || depId;
                          }).join(', ')}
                        </div>
                      )}

                      {/* Completion Info */}
                      {step.completedAt && (
                        <div className="text-xs text-gray-500">
                          Completed: {new Date(step.completedAt).toLocaleString(getIntlLocale(locale))}
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            );
          })}
        </div>

        {/* Show More/Less Toggle for Compact Mode */}
        {compact && workflow.steps.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAllSteps(!showAllSteps)}
            className="w-full gap-2 text-xs"
          >
            {showAllSteps ? (
              <>
                <ChevronDown className="w-3 h-3" />
                Show Less
              </>
            ) : (
              <>
                <ChevronRight className="w-3 h-3" />
                Show All {workflow.steps.length} Steps
              </>
            )}
          </Button>
        )}

        {/* Quick Actions */}
        {workflow.metadata?.templateType && (
          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Zap className="w-3 h-3" />
              Template: {workflow.metadata.templateType}
              {workflow.metadata.triggerAgent && (
                <span>• Triggered by {workflow.metadata.triggerAgent}</span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
