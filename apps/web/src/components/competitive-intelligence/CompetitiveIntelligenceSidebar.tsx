import { AgentSidebar } from '@/components/agents/AgentSidebar';
import { competitiveIntelligenceSidebarConfig } from '@/components/agents/AgentSidebarConfigs';

interface CompetitiveIntelligenceSession {
  id: string;
  created_at: string;
  updated_at?: string;
  session_title?: string;
  message_count?: number;
  first_message?: string;
}

interface CompetitiveIntelligenceSidebarProps {
  onSelectSession: (session: CompetitiveIntelligenceSession) => void;
  onCreateSession: () => void;
  selectedSessionId?: string;
}

export function CompetitiveIntelligenceSidebar({
  onSelectSession,
  onCreateSession,
  selectedSessionId
}: CompetitiveIntelligenceSidebarProps) {
  return (
    <AgentSidebar
      config={competitiveIntelligenceSidebarConfig}
      onSelectSession={onSelectSession}
      onCreateSession={onCreateSession}
      selectedSessionId={selectedSessionId}
    />
  );
}