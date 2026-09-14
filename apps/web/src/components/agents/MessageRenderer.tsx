import type { AgentMessage } from "@/types/agentTools";
import { SimpleCollapsibleMarkdown } from './messages/SimpleCollapsibleMarkdown';
import { ToolOutputRenderer } from './tools/ToolOutputRenderer';
import { ActionPlanButtons } from './ActionPlanButtons';
import { PersonaSaveButtons } from './PersonaSaveButtons';
import { StrategySaveButtons } from './StrategySaveButtons';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useCampaign } from '@/hooks/data/useCampaigns';
import { useClientBySlug } from '@/hooks/data/useClients';
import { useClientContext } from '@/contexts/ClientContext';
import { API_BASE_URL } from '@/lib/api';
import { authFetch } from '@/lib/authService';

interface MessageRendererProps {
  message: AgentMessage;
  isStreaming?: boolean;
  sessionId?: string | null;
  agentType?: string;
}

interface DetectedActionPlan {
  has_action_plan: boolean;
  confidence: number;
  items: Array<{
    task: string;
    category: string;
    timeframe?: string;
    priority: string;
    suggested_agent: string;
  }>;
  overall_timeframe?: string;
  summary?: string;
}

export function MessageRenderer({ 
  message, 
  isStreaming = false,
  sessionId,
  agentType 
}: MessageRendererProps) {
  const { t } = useTranslation('common');
  const [detectedPlan, setDetectedPlan] = useState<DetectedActionPlan | null>(null);
  const [detectedPersonas, setDetectedPersonas] = useState<any[] | null>(null);
  const [detectedStrategy, setDetectedStrategy] = useState<any | null>(null);
  const [isDetectingPlan, setIsDetectingPlan] = useState(false);
  const [isDetectingPersonas, setIsDetectingPersonas] = useState(false);
  const [isDetectingStrategy, setIsDetectingStrategy] = useState(false);
  const [hasAttemptedStrategyDetection, setHasAttemptedStrategyDetection] = useState(false);
  const { campaignId } = useParams<{ campaignId?: string }>();
  const { clientSlug: clientSlugBranded } = useClientContext();
  const clientSlug = clientSlugBranded || undefined;
  const { data: currentCampaign } = useCampaign(campaignId);
  const { data: currentClient } = useClientBySlug(clientSlug);
  const isToolResponse = message.structured_data != null;

  // Debug logging for client context
  useEffect(() => {
    console.log('[MessageRenderer] Client context:', {
      clientSlug,
      currentClient: currentClient ? { id: currentClient.id, name: currentClient.name } : null,
      campaignId,
      currentCampaign: currentCampaign ? { id: currentCampaign.id, name: currentCampaign.name } : null
    });
  }, [clientSlug, currentClient, campaignId, currentCampaign]);

  // Use LLM to detect action plan for all agents (except marketing strategy which has its own detection)
  useEffect(() => {
    if (!isStreaming && !isToolResponse && message.content && message.content.length > 100 && agentType !== 'marketing_strategy') {
      const detectActionPlanWithLLM = async () => {
        setIsDetectingPlan(true);
        try {
          const response = await authFetch(`${API_BASE_URL}/api/v1/detect-action-plan`, {
            method: 'POST',
            body: JSON.stringify({
              content: message.content,
              campaign_id: currentCampaign?.id
            })
          });

          if (response.ok) {
            const plan = await response.json();
            if (plan.has_action_plan && plan.confidence > 0.7) {
              setDetectedPlan(plan);
            }
          }
        } catch (error) {
          console.warn('LLM action plan detection failed:', error);
        } finally {
          setIsDetectingPlan(false);
        }
      };

      detectActionPlanWithLLM();
    }
  }, [isStreaming, isToolResponse, agentType, message.content, currentCampaign?.id]);

  // Detect personas using LLM with JSON mode (for persona agent)
  useEffect(() => {
    if (!isStreaming && !isToolResponse && agentType === 'persona' && message.content && message.content.length > 200) {
      const detectPersonasWithLLM = async () => {
        setIsDetectingPersonas(true);
        try {
          const response = await authFetch(`${API_BASE_URL}/api/v1/detect-personas`, {
            method: 'POST',
            body: JSON.stringify({
              content: message.content,
              campaign_id: currentCampaign?.id
            })
          });

          if (response.ok) {
            const result = await response.json();
            if (result.has_personas && result.confidence > 0.7) {
              setDetectedPersonas(result.personas);
            }
          }
        } catch (error) {
          console.warn('LLM persona detection failed:', error);
        } finally {
          setIsDetectingPersonas(false);
        }
      };

      detectPersonasWithLLM();
    }
  }, [isStreaming, isToolResponse, agentType, message.content, currentCampaign?.id]);

  // Detect marketing strategies using LLM (for marketing-strategy agent)
  useEffect(() => {
    // Only run strategy detection once per message
    if (!hasAttemptedStrategyDetection && !isStreaming && agentType === 'marketing_strategy' && message.content && message.content.length > 300) {
      const detectStrategyWithLLM = async () => {
        setIsDetectingStrategy(true);
        setHasAttemptedStrategyDetection(true);  // Mark as attempted to prevent re-runs
        try {
          const response = await authFetch(`${API_BASE_URL}/api/v1/detect-marketing-strategy`, {
            method: 'POST',
            body: JSON.stringify({
              content: message.content,
              campaign_id: currentCampaign?.id
            })
          });

          if (response.ok) {
            const result = await response.json();
            if (result.has_strategy && result.confidence > 0.7) {
              setDetectedStrategy(result.strategy);
            }
          }
        } catch (error) {
          console.error('LLM strategy detection failed:', error);
        } finally {
          setIsDetectingStrategy(false);
        }
      };

      detectStrategyWithLLM();
    }
  }, [isStreaming, isToolResponse, agentType, message.content, currentCampaign?.id, hasAttemptedStrategyDetection]);

  if (!isToolResponse || !message.structured_data) {
    return (
      <>
        <SimpleCollapsibleMarkdown content={message.content} isStreaming={isStreaming} />
        
        {/* Show loading indicator while detecting action plan */}
        {isDetectingPlan && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800 animate-pulse">
            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
              <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
              {t('chat.analyzing')}
            </div>
          </div>
        )}
        
        {/* Show loading indicator while detecting marketing strategy */}
        {isDetectingStrategy && (
          <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-950/30 rounded-lg border border-slate-200 dark:border-slate-800 animate-pulse">
            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
              <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
              {t('chat.analyzingStrategy')}
            </div>
          </div>
        )}

        {/* Show loading indicator while detecting personas */}
        {isDetectingPersonas && (
          <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-950/30 rounded-lg border border-slate-200 dark:border-slate-800 animate-pulse">
            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
              <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
              Extracting personas...
            </div>
          </div>
        )}
        
        {/* Show action buttons when action plan detected */}
        {!isStreaming && !isDetectingPlan && detectedPlan && detectedPlan.has_action_plan && sessionId && (
          <ActionPlanButtons 
            actionPlan={{
              items: detectedPlan.items.map(item => ({
                text: item.task,
                timeframe: item.timeframe,
                category: item.category as any,
                suggestedAgent: item.suggested_agent,
                confidence: 0.8,
                priority: item.priority as any
              })),
              overallTimeframe: detectedPlan.overall_timeframe,
              hasActionableTasks: true
            }}
            sessionContext={{
              sessionId,
              strategyOutput: message.structured_data,
              triggerAgent: agentType
            }}
            position="inline"
          />
        )}
        
        {/* Show persona save buttons when personas detected */}
        {!isStreaming && !isDetectingPersonas && detectedPersonas && detectedPersonas.length > 0 && agentType === 'persona' && (
          <PersonaSaveButtons
            detectedPersonas={detectedPersonas}
            campaignId={currentCampaign?.id}
            clientId={currentClient?.id}
          />
        )}
        
        {/* Show strategy save buttons when strategy detected */}
        {!isStreaming && !isDetectingStrategy && detectedStrategy && agentType === 'marketing_strategy' && (
          <StrategySaveButtons
            detectedStrategy={detectedStrategy}
            campaignId={currentCampaign?.id}
            clientId={currentClient?.id}
          />
        )}
      </>
    );
  }

  return (
    <ToolOutputRenderer
      data={message.structured_data}
      textExplanation={message.content}
    />
  );
}
