import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import { extractSessionId } from '@/utils/wildcardRouteParams'
import { ClientSuccessChat } from '@/components/agents/ClientSuccessChat'
import { ClientSuccessSidebar } from '@/components/client-success/ClientSuccessSidebar'
import { useMobileSessionHistory } from '@/components/agents/MobileSessionHistory'
import { Handshake, Award, HeartHandshake, Sparkles } from 'lucide-react'
import { AgentPageLayout } from '@/components/agents/AgentPageLayout'
import { api } from '@/lib/api'
import { useAgencyRouteGuard } from '@/hooks/useAgencyRouteGuard'
import { useClientContext } from '@/contexts/ClientContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import { buildAgentRootUrl, buildAgentSessionUrl } from '@/utils/multiTenantRouting'
import { useAccessDenied } from '@/components/auth/AccessDenied'

interface ClientSuccessSession {
  id: string;
  created_at: string;
  updated_at?: string;
  session_title?: string | null;
  message_count?: number;
  first_message?: string;
}

export function ClientSuccessAgent() {
  const { t } = useTranslation('agents');

  // Feature cards configuration (inside component to use translations)
  const featureCards = [
    {
      icon: Award,
      title: t('client_success.page.features.health.title'),
      description: t('client_success.page.features.health.description'),
      iconColor: 'text-rose-600 dark:text-rose-400',
      borderColor: 'hover:border-rose-200 dark:hover:border-rose-800',
    },
    {
      icon: HeartHandshake,
      title: t('client_success.page.features.retention.title'),
      description: t('client_success.page.features.retention.description'),
      iconColor: 'text-pink-600 dark:text-pink-400',
      borderColor: 'hover:border-pink-200 dark:hover:border-pink-800',
    },
    {
      icon: Sparkles,
      title: t('client_success.page.features.expansion.title'),
      description: t('client_success.page.features.expansion.description'),
      iconColor: 'text-fuchsia-600 dark:text-fuchsia-400',
      borderColor: 'hover:border-fuchsia-200 dark:hover:border-fuchsia-800',
    },
  ];
  // Enforce client context for agency users
  useAgencyRouteGuard();

  // Set page title for GA4 tracking and accessibility
  usePageTitle('Client Success');

  // Permission check for this agent
  const { hasPermission, isLoading: permissionLoading, AccessDeniedComponent } = useAccessDenied(
    'agents.success.access',
    'Client Success Agent'
  );

  // Show access denied if user lacks permission
  if (!permissionLoading && !hasPermission) {
    return AccessDeniedComponent;
  }

  const params = useParams<{ '*': string }>();
  const sessionId = extractSessionId(params['*']);
  const { clientSlug } = useClientContext();
  const navigate = useNavigate();
  const [selectedSession, setSelectedSession] = useState<ClientSuccessSession | null>(null);
  const [sessions, setSessions] = useState<ClientSuccessSession[]>([]);

  // Load sessions for SessionHistorySheet
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const response = await api.get(`/api/v1/direct-agents/client_success/sessions`);
        setSessions(response.data.sessions || []);
      } catch (error) {
        console.error('Error loading sessions:', error);
        setSessions([]);
      }
    };
    loadSessions();
  }, [selectedSession]);

  useEffect(() => {
    if (sessionId) {
      if (!selectedSession || selectedSession.id !== sessionId) {
        loadSessionFromId(sessionId);
      }
    } else {
      setSelectedSession(null);
    }
  }, [sessionId]);

  const loadSessionFromId = async (id: string) => {
    try {
      const response = await api.get(`/api/v1/direct-agents/client_success/sessions`);
      const sessions = response.data.sessions;
      const session = sessions.find((s: ClientSuccessSession) => s.id === id);

      if (session) {
        setSelectedSession(session);
      } else {
        console.error('Session not found or access denied');
        navigate(buildAgentRootUrl('client_success', clientSlug));
      }
    } catch (error) {
      console.error('Error loading session:', error);
      navigate(buildAgentRootUrl('client_success', clientSlug));
    }
  };

  const handleSelectSession = (session: ClientSuccessSession) => {
    const agentType = (session as any).agent_type || 'client_success';
    navigate(buildAgentSessionUrl(agentType, session.id, clientSlug));
  };

  const handleCreateSession = () => {
    setSelectedSession(null);
    navigate(buildAgentRootUrl('client_success', clientSlug), { replace: true });
  };

  const handleSessionCreated = (session: any) => {
    setSelectedSession(session);
    const sessionRoute = buildAgentSessionUrl('client_success', session.id, clientSlug);
    console.log('[ClientSuccessAgent] Session created, navigating to:', sessionRoute);
    navigate(sessionRoute);
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
      icon={Handshake}
      title={t('client_success.page.title')}
      subtitle={t('client_success.page.subtitle')}
      sessionTitle={selectedSession?.session_title || t('client_success.page.defaultSessionTitle')}
      featureCards={featureCards}
      onNewSession={handleCreateSession}
      sidebar={
        <ClientSuccessSidebar
          onSelectSession={handleSelectSession}
          onCreateSession={handleCreateSession}
          selectedSessionId={selectedSession?.id}
        />
      }
      sessionHistorySheet={mobileHistory.sheet}
      mobileHistoryButton={mobileHistory.button}
    >
      <ClientSuccessChat
        selectedSession={selectedSession}
        onSessionCreated={handleSessionCreated}
      />
    </AgentPageLayout>
  );
}
