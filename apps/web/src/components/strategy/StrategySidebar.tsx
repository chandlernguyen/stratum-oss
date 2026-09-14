import { AgentSidebar } from '@/components/agents/AgentSidebar';
import { strategySidebarConfig } from '@/components/agents/AgentSidebarConfigs';

interface StrategySidebarProps {
  onSelectSession: (session: any) => void;
  onCreateSession: () => void;
  selectedSessionId?: string;
}

export function StrategySidebar({
  onSelectSession,
  onCreateSession,
  selectedSessionId
}: StrategySidebarProps) {
  return (
    <AgentSidebar
      config={strategySidebarConfig}
      onSelectSession={onSelectSession}
      onCreateSession={onCreateSession}
      selectedSessionId={selectedSessionId}
    />
  );
}