import { AgentChat } from './AgentChat';
import { useParams } from 'react-router-dom';
import { useCampaign } from '@/hooks/data/useCampaigns';
import { getLocalizedAgentPlaceholder } from '@/config/agentConfig';
import { buildAgentCampaignContext } from './campaignContext';

interface CampaignExecutionSession {
  id: string;
  created_at: string;
  updated_at?: string;
  session_title?: string | null;
  message_count?: number;
  first_message?: string;
}

interface CampaignExecutionChatProps {
  selectedSession?: CampaignExecutionSession | null;
  onSessionCreated?: (session: CampaignExecutionSession) => void;
  initialMessage?: string;
}

export function CampaignExecutionChat({ selectedSession, onSessionCreated, initialMessage }: CampaignExecutionChatProps) {
  const { campaignId } = useParams<{ campaignId?: string }>();
  const { data: currentCampaign } = useCampaign(campaignId);

  // Build campaign context string for the agent
  const campaignContext = buildAgentCampaignContext(
    currentCampaign,
    'Please provide deployment planning frameworks and optimization strategies specific to this campaign.'
  );

  return (
    <AgentChat
      agentType="campaign_planning"
      agentName="Campaign Planning Agent"
      placeholder={getLocalizedAgentPlaceholder('campaign_planning')}
      agentColor="purple"
      selectedSession={selectedSession}
      onSessionCreated={onSessionCreated}
      contextInfo={campaignContext}
      initialMessage={initialMessage}
    />
  );
}
