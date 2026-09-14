import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Clock, ArrowRight, AlertCircle, CheckCircle, Loader2, HelpCircle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ROUTES } from '@/config/routes';
import { ContentClarificationDialog } from './ContentClarificationDialog';
import type { ClarificationQuestion } from '@/hooks/useContentRecommendations';
import type { BusinessContext } from '@/hooks/useBusinessContext';
import { useClientContext } from '@/contexts/ClientContext';
import { buildContextAwareUrl } from '@/utils/multiTenantRouting';

interface ContentRecommendation {
  id: string;
  task: string;
  tool: string;
  toolName: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  category: string;
  estimatedTime: string;
  status: 'ready' | 'blocked' | 'completed';
}

interface ContentRecommendationsProps {
  recommendations?: ContentRecommendation[];
  isLoading?: boolean;
  error?: string;
  needsSetup?: boolean;
  needsClarification?: boolean;
  clarificationQuestions?: ClarificationQuestion[];
  confidence?: 'high' | 'medium' | 'low';
  setupMessage?: string;
  nextAction?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onAnswerClarification?: (answers: Record<string, string>) => void;
  businessContext?: BusinessContext;
}

export function ContentRecommendations({
  recommendations = [],
  isLoading = false,
  error,
  needsSetup,
  needsClarification,
  clarificationQuestions,
  confidence,
  setupMessage,
  nextAction,
  collapsed = false,
  onToggleCollapse,
  onAnswerClarification,
  businessContext
}: ContentRecommendationsProps) {
  const navigate = useNavigate();
  const { clientSlug } = useClientContext();
  const { t } = useTranslation('agents');
  const [showAll, setShowAll] = useState(false);

  // Show only top 3 recommendations by default
  const visibleRecommendations = showAll ? recommendations : recommendations.slice(0, 3);

  const handleNavigateToTool = (tool: string, recommendation: ContentRecommendation) => {
    // Navigate to tool with recommendation and business context
    const toolUrl = buildContextAwareUrl(ROUTES.agents.content.tool(tool), clientSlug);
    navigate(toolUrl || ROUTES.agents.content.tool(tool), {
      state: {
        recommendation,
        businessContext,
        prefillData: {
          title: recommendation.task,
          contentGoal: recommendation.reason,
          estimatedTime: recommendation.estimatedTime,
          priority: recommendation.priority
        }
      }
    });
  };

  const handleSetupAction = () => {
    if (nextAction) {
      const actionUrl = buildContextAwareUrl(nextAction, clientSlug);
      navigate(actionUrl || nextAction);
    }
  };

  // Priority indicators
  const getPriorityIndicator = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return <span className="text-brand-error">●●●</span>;
      case 'medium':
        return <span className="text-brand-warning">●●</span>;
      case 'low':
        return <span className="text-gray-400">●</span>;
      default:
        return null;
    }
  };

  // If needs setup, show guided message
  if (needsSetup) {
    return (
      <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
        <AlertCircle className="h-5 w-5 text-brand-warning" />
        <AlertDescription className="flex items-center justify-between">
          <span>{setupMessage}</span>
          <Button
            onClick={handleSetupAction}
            size="sm"
            className="ml-4 min-h-12"
          >
            {t('content.page.toolGrid.recommendations.actions.getStarted')} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-brand-slate" />
            <span className="text-brand-slate">{t('content.page.toolGrid.recommendations.loading')}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert className="mb-6 border-red-200">
        <AlertCircle className="h-5 w-5 text-brand-error" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // Smart clarification needed - show clarification dialog
  if (needsClarification && clarificationQuestions && clarificationQuestions.length > 0) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <HelpCircle className="h-5 w-5 text-brand-info" />
            <h3 className="text-lg font-semibold">{t('content.page.toolGrid.recommendations.smartAnalysis')}</h3>
            <Badge variant="secondary" className="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
              {t('content.page.toolGrid.recommendations.clarificationNeeded')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ContentClarificationDialog
            questions={clarificationQuestions}
            message={setupMessage || t('content.page.toolGrid.recommendations.clarificationMessage')}
            onAnswersSubmit={(answers) => onAnswerClarification?.(answers)}
            onSkip={() => {
              // Could implement a skip handler that shows generic recommendations
              console.log('User chose to skip clarification');
            }}
            isSubmitting={isLoading}
          />
        </CardContent>
      </Card>
    );
  }

  // No recommendations - show guidance
  if (!recommendations.length) {
    return (
      <Card className="mb-6 border-2 border-dashed border-gray-300">
        <CardContent className="py-8 text-center">
          <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold mb-2">{t('content.page.toolGrid.recommendations.noRecommendations.title')}</h3>
          <p className="text-brand-slate dark:text-gray-400 mb-4">
            {t('content.page.toolGrid.recommendations.noRecommendations.description')}
          </p>
          <Button onClick={() => navigate(buildContextAwareUrl('/marketing-strategy', clientSlug) || '/marketing-strategy')}>
            {t('content.page.toolGrid.recommendations.noRecommendations.cta')} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6 border-2 hover:border-green-200 transition-colors">
      <CardHeader className="cursor-pointer" onClick={onToggleCollapse}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">📊 {t('content.page.toolGrid.recommendations.priorities.title')}</h3>
            {recommendations.length > 0 && (
              <Badge variant="secondary">{t('content.page.toolGrid.recommendations.priorities.count', { count: recommendations.length })}</Badge>
            )}
            {confidence && (
              <Badge
                variant={confidence === 'high' ? 'default' : 'outline'}
                className={confidence === 'high' ? 'bg-green-500' : confidence === 'medium' ? 'bg-yellow-500' : 'bg-gray-500'}
              >
                {t('content.page.toolGrid.recommendations.priorities.confidence', { level: confidence })}
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="sm">
            {collapsed ? (
              <>
                {t('content.page.toolGrid.recommendations.actions.expand')} <ChevronDown className="ml-2 h-4 w-4" />
              </>
            ) : (
              <>
                {t('content.page.toolGrid.recommendations.actions.collapse')} <ChevronUp className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      {!collapsed && (
        <CardContent>
          <div className="space-y-3">
            {visibleRecommendations.map((rec) => {
              const isCompleted = rec.status === 'completed';

              return (
                <div
                  key={rec.id}
                  className={`group relative p-4 rounded-lg border transition-all ${
                    isCompleted
                      ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800 opacity-75'
                      : 'bg-white dark:bg-gray-800 hover:shadow-md cursor-pointer'
                  }`}
                  onClick={!isCompleted ? () => handleNavigateToTool(rec.tool, rec) : undefined}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {isCompleted ? (
                          <CheckCircle className="h-4 w-4 text-brand-success" />
                        ) : (
                          getPriorityIndicator(rec.priority)
                        )}
                        <h4 className={`font-medium ${isCompleted ? 'text-brand-success dark:text-green-400 line-through' : 'text-brand-charcoal dark:text-gray-100'}`}>
                          {rec.task}
                        </h4>
                        {isCompleted && (
                          <Badge className="bg-green-600 text-white text-xs">
                            ✓ {t('content.page.toolGrid.recommendations.status.completed')}
                          </Badge>
                        )}
                      </div>
                      <p className={`text-sm mb-2 ${isCompleted ? 'text-brand-success/70 dark:text-green-400/70' : 'text-brand-slate dark:text-gray-400'}`}>
                        {rec.reason}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-brand-slate">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {rec.estimatedTime}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {rec.toolName}
                        </Badge>
                      </div>
                    </div>
                    {!isCompleted && (
                      <Button
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNavigateToTool(rec.tool, rec);
                        }}
                      >
                        {t('content.page.toolGrid.recommendations.actions.startWriting')} <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Show more/less toggle */}
          {recommendations.length > 3 && (
            <div className="mt-4 text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll ? (
                  <>{t('content.page.toolGrid.recommendations.actions.showLess')}</>
                ) : (
                  <>{t('content.page.toolGrid.recommendations.actions.showMore', { count: recommendations.length - 3 })}</>
                )}
              </Button>
            </div>
          )}

          {/* Progress indicator */}
          {recommendations.some(r => r.status === 'completed') && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-brand-slate">
                <CheckCircle className="h-4 w-4 text-brand-success" />
                <span>
                  {t('content.page.toolGrid.recommendations.status.progress', {
                    completed: recommendations.filter(r => r.status === 'completed').length,
                    total: recommendations.length
                  })}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}