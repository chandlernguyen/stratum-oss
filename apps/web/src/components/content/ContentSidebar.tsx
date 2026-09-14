import { AgentSidebar } from '@/components/agents/AgentSidebar';
import { contentSidebarConfig } from '@/components/agents/AgentSidebarConfigs';

interface ContentSidebarProps {
  onSelectSession: (session: any) => void;
  onCreateSession: () => void;
  selectedSessionId?: string;
}

export function ContentSidebar({
  onSelectSession,
  onCreateSession,
  selectedSessionId
}: ContentSidebarProps) {
  return (
    <AgentSidebar
      config={contentSidebarConfig}
      onSelectSession={onSelectSession}
      onCreateSession={onCreateSession}
      selectedSessionId={selectedSessionId}
    />
  );
}