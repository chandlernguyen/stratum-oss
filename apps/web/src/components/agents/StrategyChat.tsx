import { AgentChat } from './AgentChat';
import { useParams } from 'react-router-dom';
import { useCampaign } from '@/hooks/data/useCampaigns';
import { getLocalizedAgentPlaceholder } from '@/config/agentConfig';
import { buildAgentCampaignContext } from './campaignContext';

interface StrategySession {
  id: string;
  created_at: string;
  updated_at?: string;
  session_title?: string | null;
  message_count?: number;
  first_message?: string;
}

interface StrategyChatProps {
  selectedSession?: StrategySession | null;
  onSessionCreated?: (session: StrategySession) => void;
  initialMessage?: string;
}

export function StrategyChat({ selectedSession, onSessionCreated, initialMessage }: StrategyChatProps) {
  const { campaignId } = useParams<{ campaignId?: string }>();
  const { data: currentCampaign } = useCampaign(campaignId);
  // For now, currentClient is not available - will be handled via URL routing
  const currentClient: any = null;

  // Build context string for the agent
  let contextInfo = '';

  if (currentClient) {
    contextInfo += `Client: ${currentClient.name}\n`;
  }

  if (currentCampaign) {
    contextInfo += buildAgentCampaignContext(
      currentCampaign,
      'Please align all strategic analysis and recommendations with these campaign parameters.'
    );
  }

  // Note: URL context is already reflected in workspace context through WorkspaceProvider
  // The WorkspaceContext automatically syncs with URL changes

  return (
    <AgentChat
      agentType="strategy"
      agentName="Strategy Agent"
      placeholder={getLocalizedAgentPlaceholder('strategy')}
      agentColor="indigo"
      selectedSession={selectedSession}
      onSessionCreated={onSessionCreated}
      contextInfo={contextInfo}
      initialMessage={initialMessage}
    />
  );
}
