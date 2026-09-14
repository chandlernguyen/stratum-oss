import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AgentChat } from '@/components/agents/AgentChat'
import { AgentSidebar } from '@/components/agents/AgentSidebar'
import { useMobileSessionHistory } from '@/components/agents/MobileSessionHistory'
import { AgentPageLayout } from '@/components/agents/AgentPageLayout'
import { quickStartSidebarConfig } from '@/components/agents/AgentSidebarConfigs'
import { Sparkles, Zap, Target, Rocket } from 'lucide-react'
import { api } from '@/lib/api'
import { useAgencyRouteGuard } from '@/hooks/useAgencyRouteGuard'
import { useClientContext } from '@/contexts/ClientContext'
import { buildAgentRootUrl, buildAgentSessionUrl } from '@/utils/multiTenantRouting'
import { useAccessDenied } from '@/components/auth/AccessDenied'
import { usePageTitle } from '@/hooks/usePageTitle'

interface QuickStartSession {
  id: string;
  created_at: string;
  updated_at?: string;
  session_title?: string | null;
  message_count?: number;
  first_message?: string;
}

interface QuickStartAnswers {
  company: string;
  goal: string;
  audience: string;
  budget: string;
  timeline: string;
}

// Feature cards configuration - uses i18n keys, titles/descriptions populated in component
const FEATURE_CARD_CONFIG = [
  {
    icon: Target,
    titleKey: 'featureCards.strategyAnalysis.title',
    descriptionKey: 'featureCards.strategyAnalysis.description',
    iconColor: 'text-amber-600 dark:text-amber-400',
    borderColor: 'hover:border-slate-200 dark:hover:border-slate-800',
  },
  {
    icon: Zap,
    titleKey: 'featureCards.customerPersonas.title',
    descriptionKey: 'featureCards.customerPersonas.description',
    iconColor: 'text-pink-600 dark:text-pink-400',
    borderColor: 'hover:border-pink-200 dark:hover:border-pink-800',
  },
  {
    icon: Rocket,
    titleKey: 'featureCards.marketingStrategy.title',
    descriptionKey: 'featureCards.marketingStrategy.description',
    iconColor: 'text-amber-600 dark:text-amber-400',
    borderColor: 'hover:border-amber-200 dark:hover:border-amber-800',
  },
];

export function QuickStart() {
  const { t } = useTranslation('quickstart');

  // Enforce client context for agency users
  useAgencyRouteGuard();

  // Set page title for GA4 tracking and accessibility
  usePageTitle(t('page.title'));

  // Build feature cards with translated content
  const featureCards = useMemo(() =>
    FEATURE_CARD_CONFIG.map(card => ({
      icon: card.icon,
      title: t(card.titleKey),
      description: t(card.descriptionKey),
      iconColor: card.iconColor,
      borderColor: card.borderColor,
    })), [t]);

  // Permission check for this agent
  const { hasPermission, isLoading: permissionLoading, AccessDeniedComponent } = useAccessDenied(
    'agents.quickwins.access',
    'Quick Start Agent'
  );

  // Show access denied if user lacks permission
  if (!permissionLoading && !hasPermission) {
    return AccessDeniedComponent;
  }

  // Use wildcard route to prevent component remount during navigation
  // Extract sessionId from the wildcard path (e.g., "session/abc123" -> "abc123")
  const params = useParams<{ '*': string }>();
  const sessionId = params['*']?.startsWith('session/')
    ? params['*'].replace('session/', '')
    : undefined;

  const { clientSlug } = useClientContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedSession, setSelectedSession] = useState<QuickStartSession | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);

  // Extract Quick Start answers from navigation state (URL-based approach)
  const quickStartAnswers = location.state?.quickStartAnswers as QuickStartAnswers | undefined;

  // Format answers into initial message for the agent
  const initialMessage = useMemo(() => {
    if (!quickStartAnswers) return undefined;

    return `${t('initialMessage.intro')}

**${t('initialMessage.company')}**
${quickStartAnswers.company}

**${t('initialMessage.goal')}**
${quickStartAnswers.goal}

**${t('initialMessage.audience')}**
${quickStartAnswers.audience}

**${t('initialMessage.budget')}**
${quickStartAnswers.budget}

**${t('initialMessage.timeline')}**
${quickStartAnswers.timeline}

${t('initialMessage.request')}
${t('initialMessage.item1')}
${t('initialMessage.item2')}
${t('initialMessage.item3')}

${t('initialMessage.closing')}`;
  }, [quickStartAnswers, t]);

  // Load sessions for SessionHistorySheet
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const response = await api.get(`/api/v1/direct-agents/quick_start/sessions`);
        setSessions(response.data.sessions || []);
      } catch (error) {
        console.error('Error loading sessions:', error);
        setSessions([]);
      }
    };
    loadSessions();
  }, [selectedSession]);

  // Load session from URL if sessionId is present
  useEffect(() => {
    if (sessionId) {
      loadSessionFromId(sessionId);
    } else {
      setSelectedSession(null);
    }
  }, [sessionId]);

  const loadSessionFromId = async (id: string) => {
    // If we already have this session selected, don't reload
    if (selectedSession?.id === id) {
      return;
    }

    try {
      // Load session through the API to ensure proper access control
      const response = await api.get(`/api/v1/direct-agents/quick_start/sessions`);
      const sessions = response.data.sessions;

      // Find the specific session
      const session = sessions.find((s: QuickStartSession) => s.id === id);

      if (session) {
        setSelectedSession(session);
      } else {
        // If session not found, retry once after a delay
        setTimeout(async () => {
          try {
            const retryResponse = await api.get(`/api/v1/direct-agents/quick_start/sessions`);
            const retrySessions = retryResponse.data.sessions;
            const retrySession = retrySessions.find((s: QuickStartSession) => s.id === id);

            if (retrySession) {
              setSelectedSession(retrySession);
            } else if (!selectedSession) {
              navigate(buildAgentRootUrl('quick_start', clientSlug));
            }
          } catch (retryError) {
            if (!selectedSession) {
              navigate(buildAgentRootUrl('quick_start', clientSlug));
            }
          }
        }, 2000);
      }
    } catch (error) {
      console.error('Error loading session:', error);
      navigate(buildAgentRootUrl('quick_start', clientSlug));
    }
  };

  const handleSelectSession = (session: QuickStartSession) => {
    // Navigate to session URL when selecting a session, preserving client context
    navigate(buildAgentSessionUrl('quick_start', session.id, clientSlug));
  };

  const handleCreateSession = () => {
    // Clear selected session and navigate back to root, preserving client context
    setSelectedSession(null);
    navigate(buildAgentRootUrl('quick_start', clientSlug), { replace: true });
  };

  // Mobile session history (DRY pattern)
  const mobileHistory = useMobileSessionHistory({
    sessions,
    selectedSessionId: selectedSession?.id,
    onSessionSelect: handleSelectSession,
    onNewSession: handleCreateSession,
  });

  return (
    <AgentPageLayout
      mode={selectedSession ? 'session' : 'landing'}
      icon={Sparkles}
      title={t('page.title')}
      subtitle={t('page.subtitle')}
      sessionTitle={selectedSession?.session_title}
      onNewSession={handleCreateSession}
      featureCards={featureCards}
      gradient="amber"
      sidebar={
        <AgentSidebar
          config={quickStartSidebarConfig}
          onSelectSession={handleSelectSession}
          onCreateSession={handleCreateSession}
          selectedSessionId={selectedSession?.id}
        />
      }
      sessionHistorySheet={mobileHistory.sheet}
      mobileHistoryButton={mobileHistory.button}
    >
      <AgentChat
        agentType="quick_start"
        agentName="Quick Start"
        selectedSession={selectedSession}
        initialMessage={initialMessage}
        onSessionCreated={(session: any) => {
          console.log('New session created:', session);
          setSelectedSession(session);
          navigate(buildAgentSessionUrl('quick_start', session.id, clientSlug), { replace: true });
        }}
      />
    </AgentPageLayout>
  );
}
