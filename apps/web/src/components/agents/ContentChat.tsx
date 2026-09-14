import { AgentChat } from './AgentChat';
import { useParams } from 'react-router-dom';
import { useCampaign } from '@/hooks/data/useCampaigns';
import { getLocalizedAgentPlaceholder } from '@/config/agentConfig';
import { buildAgentCampaignContext } from './campaignContext';

interface ContentChatProps {
  fromSessionId?: string | null;
  navigationState?: {
    prefillContext?: any;
    fromAgent?: string;
    sourceSessionId?: string;
    actionItems?: any[];
  };
  selectedSession?: any;
  onSessionCreated?: (session: any) => void;
  initialMessage?: string;
}

export function ContentChat({ fromSessionId, navigationState, selectedSession, onSessionCreated, initialMessage }: ContentChatProps) {
  const { campaignId } = useParams<{ campaignId?: string }>();
  const { data: currentCampaign } = useCampaign(campaignId);

  // Build campaign context string for the agent
  let campaignContext = buildAgentCampaignContext(
    currentCampaign,
    'Please create content that aligns with these campaign parameters and target audience.'
  );

  // Add session continuity context if available
  if (navigationState?.prefillContext || fromSessionId) {
    let sessionContext = '';
    
    if (fromSessionId) {
      sessionContext += `\n\nContinuing from ${navigationState?.fromAgent || 'previous'} session (ID: ${fromSessionId}).\n`;
    }
    
    if (navigationState?.actionItems && navigationState.actionItems.length > 0) {
      sessionContext += `\nAction items from previous session:\n`;
      navigationState.actionItems.forEach((item: any, index: number) => {
        sessionContext += `${index + 1}. ${item.task}${item.timeframe ? ` (${item.timeframe})` : ''}\n`;
      });
    }
    
    if (navigationState?.prefillContext?.strategyInsights) {
      sessionContext += `\nRelevant insights from strategy session:\n${navigationState.prefillContext.strategyInsights}\n`;
    }
    
    campaignContext += sessionContext;
  }

  // Generate initial message - prioritize Quick Win Template over navigation state
  let resolvedInitialMessage = initialMessage || '';
  if (!resolvedInitialMessage && navigationState?.prefillContext?.suggestedPrompt) {
    resolvedInitialMessage = navigationState.prefillContext.suggestedPrompt;
  }

  return (
    <AgentChat
      agentType="content"
      agentName="Content Agent"
      placeholder={getLocalizedAgentPlaceholder('content')}
      agentColor="green"
      contextInfo={campaignContext}
      initialMessage={resolvedInitialMessage}
      selectedSession={selectedSession}
      onSessionCreated={onSessionCreated}
    />
  );
}
