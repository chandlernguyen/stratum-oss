import { AgentSidebar } from '@/components/agents/AgentSidebar';
import { clientSuccessSidebarConfig } from '@/components/agents/AgentSidebarConfigs';

interface ClientSuccessSession {
  id: string;
  created_at: string;
  updated_at?: string;
  session_title?: string;
  message_count?: number;
  first_message?: string;
}

interface ClientSuccessSidebarProps {
  onSelectSession: (session: ClientSuccessSession) => void;
  onCreateSession: () => void;
  selectedSessionId?: string;
}

export function ClientSuccessSidebar({
  onSelectSession,
  onCreateSession,
  selectedSessionId
}: ClientSuccessSidebarProps) {
  return (
    <AgentSidebar
      config={clientSuccessSidebarConfig}
      onSelectSession={onSelectSession}
      onCreateSession={onCreateSession}
      selectedSessionId={selectedSessionId}
    />
  );
}