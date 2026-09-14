import { AgentChat } from './AgentChat';
import { useParams } from 'react-router-dom';
import { useCampaign } from '@/hooks/data/useCampaigns';
import { getLocalizedAgentPlaceholder } from '@/config/agentConfig';
import { buildAgentCampaignContext } from './campaignContext';

interface ClientSuccessSession {
  id: string;
  created_at: string;
  updated_at?: string;
  session_title?: string | null;
  message_count?: number;
  first_message?: string;
}

interface ClientSuccessChatProps {
  selectedSession?: ClientSuccessSession | null;
  onSessionCreated?: (session: ClientSuccessSession) => void;
}

export function ClientSuccessChat({ selectedSession, onSessionCreated }: ClientSuccessChatProps) {
  const { campaignId } = useParams<{ campaignId?: string }>();
  const { data: currentCampaign } = useCampaign(campaignId);

  // Build campaign context string for the agent
  const campaignContext = buildAgentCampaignContext(
    currentCampaign,
    'Please provide client success and retention strategies aligned with this campaign.'
  );

  return (
    <AgentChat
      agentType="client_success"
      agentName="Client Success Agent"
      placeholder={getLocalizedAgentPlaceholder('client_success')}
      agentColor="teal"
      selectedSession={selectedSession}
      onSessionCreated={onSessionCreated}
      contextInfo={campaignContext}
    />
  );
}
