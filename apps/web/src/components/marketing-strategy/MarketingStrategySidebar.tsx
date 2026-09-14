import { AgentSidebar } from '@/components/agents/AgentSidebar';
import { marketingStrategySidebarConfig } from '@/components/agents/AgentSidebarConfigs';

interface MarketingStrategySidebarProps {
  onSelectSession: (session: any) => void;
  onCreateNewSession: () => void;
  selectedSessionId?: string;
  currentMode?: 'quick' | 'guided' | 'advanced' | 'chat';
}

export function MarketingStrategySidebar({
  onSelectSession,
  onCreateNewSession,
  selectedSessionId
}: MarketingStrategySidebarProps) {
  // For marketing strategy, we use the custom onCreateSession that's passed in
  // which handles the mode-specific routing
  return (
    <AgentSidebar
      config={marketingStrategySidebarConfig}
      onSelectSession={onSelectSession}
      onCreateSession={onCreateNewSession}
      selectedSessionId={selectedSessionId}
    />
  );
}