import { useMemo } from 'react';
import { AgentChat } from './AgentChat';
import { useParams } from 'react-router-dom';
import { useCampaign } from '@/hooks/data/useCampaigns';
import { COMPETITIVE_FRAMEWORKS } from '@/components/competitive-intelligence/CompetitiveFrameworkTemplates';
import type { BusinessContext } from '@/hooks/useBusinessContext';
import { getLocalizedAgentPlaceholder } from '@/config/agentConfig';
import { buildAgentCampaignContext } from './campaignContext';

interface CompetitiveIntelligenceSession {
  id: string;
  created_at: string;
  updated_at?: string;
  session_title?: string | null;
  message_count?: number;
  first_message?: string;
}

interface CompetitiveIntelligenceChatProps {
  selectedSession?: CompetitiveIntelligenceSession | null;
  onSessionCreated?: (session: CompetitiveIntelligenceSession) => void;
  frameworkId?: string | null;
  businessContext?: BusinessContext | null;
  initialMessage?: string;
}

export function CompetitiveIntelligenceChat({
  selectedSession,
  onSessionCreated,
  frameworkId,
  businessContext,
  initialMessage
}: CompetitiveIntelligenceChatProps) {
  const { campaignId } = useParams<{ campaignId?: string }>();
  const { data: currentCampaign } = useCampaign(campaignId);

  // Generate initial prompt - prioritize Quick Win Template over framework selection
  const initialPrompt = useMemo(() => {
    // Template initialMessage takes priority
    if (initialMessage) {
      return initialMessage;
    }

    if (!frameworkId || frameworkId === 'generic') {
      return undefined; // No pre-filled prompt for generic mode
    }

    const framework = COMPETITIVE_FRAMEWORKS.find(f => f.id === frameworkId);
    if (!framework) {
      console.warn(`[CompetitiveIntelligenceChat] Framework not found: ${frameworkId}`);
      return undefined;
    }

    // Generate context-aware prompt (handle undefined by passing null)
    return framework.generatePrompt(businessContext ?? null);
  }, [initialMessage, frameworkId, businessContext]);

  // Build campaign context string for the agent
  const campaignContext = buildAgentCampaignContext(
    currentCampaign,
    'Please provide competitive analysis and market insights relevant to this campaign.'
  );

  return (
    <AgentChat
      agentType="competitive_intelligence"
      agentName="Competitive Intelligence Agent"
      placeholder={getLocalizedAgentPlaceholder('competitive_intelligence')}
      agentColor="red"
      selectedSession={selectedSession}
      onSessionCreated={onSessionCreated}
      contextInfo={campaignContext}
      initialMessage={initialPrompt}
    />
  );
}
