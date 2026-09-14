import { AgentSidebar } from '@/components/agents/AgentSidebar';
import { campaignExecutionSidebarConfig } from '@/components/agents/AgentSidebarConfigs';

interface CampaignExecutionSession {
  id: string;
  created_at: string;
  updated_at?: string;
  session_title?: string;
  message_count?: number;
  first_message?: string;
}

interface CampaignExecutionSidebarProps {
  onSelectSession: (session: CampaignExecutionSession) => void;
  onCreateSession: () => void;
  selectedSessionId?: string;
}

export function CampaignExecutionSidebar({
  onSelectSession,
  onCreateSession,
  selectedSessionId
}: CampaignExecutionSidebarProps) {
  return (
    <AgentSidebar
      config={campaignExecutionSidebarConfig}
      onSelectSession={onSelectSession}
      onCreateSession={onCreateSession}
      selectedSessionId={selectedSessionId}
    />
  );
}