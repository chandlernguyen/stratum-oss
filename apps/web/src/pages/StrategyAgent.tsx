import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { extractSessionId } from '@/utils/wildcardRouteParams'
import { StrategyChat } from '@/components/agents/StrategyChat'
import { StrategySidebar } from '@/components/strategy/StrategySidebar'
import { useMobileSessionHistory } from '@/components/agents/MobileSessionHistory'
import { Target, TrendingUp, Lightbulb, ChartBar } from 'lucide-react'
import { AgentPageLayout } from '@/components/agents/AgentPageLayout'
import { api } from '@/lib/api'
import type { QuickWinTemplate } from '@/components/onboarding/QuickWinTemplates'
import { useClientContext } from '@/contexts/ClientContext'
import { useAgencyRouteGuard } from '@/hooks/useAgencyRouteGuard'
import { usePageTitle } from '@/hooks/usePageTitle'
import { buildAgentRootUrl, buildAgentSessionUrl } from '@/utils/multiTenantRouting'
import { ROUTES } from '@/config/routes'
import { useAccessDenied } from '@/components/auth/AccessDenied'

interface StrategySession {
  id: string;
  created_at: string;
  updated_at?: string;
  session_title?: string | null;
  message_count?: number;
  first_message?: string;
}

export function StrategyAgent() {
  const { t } = useTranslation('agents');

  // Feature cards configuration with translations
  const featureCards = [
    {
      icon: TrendingUp,
      title: t('strategy.page.features.analysis.title'),
      description: t('strategy.page.features.analysis.description'),
      iconColor: 'text-amber-600 dark:text-amber-400',
      borderColor: 'hover:border-amber-200 dark:hover:border-amber-800',
    },
    {
      icon: Lightbulb,
      title: t('strategy.page.features.recommendations.title'),
      description: t('strategy.page.features.recommendations.description'),
      iconColor: 'text-amber-600 dark:text-amber-400',
      borderColor: 'hover:border-slate-200 dark:hover:border-slate-800',
    },
    {
      icon: ChartBar,
      title: t('strategy.page.features.frameworks.title'),
      description: t('strategy.page.features.frameworks.description'),
      iconColor: 'text-green-600 dark:text-green-400',
      borderColor: 'hover:border-green-200 dark:hover:border-green-800',
    },
  ];
  // Enforce client context for agency users
  useAgencyRouteGuard();

  // Set page title for GA4 tracking and accessibility
  usePageTitle('Business Strategy');

  // Permission check for this agent
  const { hasPermission, isLoading: permissionLoading, AccessDeniedComponent } = useAccessDenied(
    'agents.strategy.access',
    'Business Strategy Agent'
  );

  // Show access denied if user lacks permission
  if (!permissionLoading && !hasPermission) {
    return AccessDeniedComponent;
  }

  // Use wildcard route to prevent component remount during navigation
  const params = useParams<{ '*': string }>();
  const sessionId = extractSessionId(params['*']);
  const navigate = useNavigate();
  const { clientSlug } = useClientContext(); // Get client context if in client-scoped route
  const [selectedSession, setSelectedSession] = useState<StrategySession | null>(null);
  const [templatePrompt, setTemplatePrompt] = useState<string | undefined>(undefined);
  const [sessions, setSessions] = useState<StrategySession[]>([]);

  // Check for Quick Win Template on mount
  useEffect(() => {
    const templateStr = localStorage.getItem('quickWinTemplate');
    if (templateStr) {
      try {
        const template: QuickWinTemplate = JSON.parse(templateStr);
        // Check if this agent is in the template's agent list
        if (template.agents.includes('strategy') || template.agents.includes('competitive-intelligence')) {
          setTemplatePrompt(template.prefilledPrompt);
          console.log('[StrategyAgent] Loaded Quick Win Template:', template.title);
        }
        // Clear template after reading (single-use)
        localStorage.removeItem('quickWinTemplate');
      } catch (error) {
        console.error('[StrategyAgent] Error parsing template:', error);
        localStorage.removeItem('quickWinTemplate');
      }
    }
  }, []);

  // Load all sessions for session history
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const response = await api.get(`/api/v1/direct-agents/strategy/sessions`);
        setSessions(response.data.sessions || []);
      } catch (error) {
        console.error('Error loading sessions:', error);
        setSessions([]);
      }
    };
    loadSessions();
  }, [selectedSession]); // Reload when session changes

  // Load session from URL if sessionId is present
  useEffect(() => {
    if (sessionId) {
      loadSessionFromId(sessionId);
    } else {
      setSelectedSession(null);
    }
  }, [sessionId]);

  const loadSessionFromId = async (id: string) => {
    // If we already have this session selected (from onSessionCreated), don't reload
    if (selectedSession?.id === id) {
      console.log('Session already selected, skipping API load');
      return;
    }

    try {
      // Load session through the API to ensure proper access control
      const response = await api.get(`/api/v1/direct-agents/strategy/sessions`);
      const sessions = response.data.sessions;
      console.log('Available sessions:', sessions);
      console.log('Looking for session ID:', id);

      // Find the specific session
      const session = sessions.find((s: StrategySession) => s.id === id);

      if (session) {
        setSelectedSession(session);
      } else {
        // If session not found, it might be a newly created session that hasn't propagated yet
        // Wait a bit and try again ONCE before giving up
        console.warn('Session not found in list, will retry once:', id);

        setTimeout(async () => {
          try {
            const retryResponse = await api.get(`/api/v1/direct-agents/strategy/sessions`);
            const retrySessions = retryResponse.data.sessions;
            const retrySession = retrySessions.find((s: StrategySession) => s.id === id);

            if (retrySession) {
              console.log('Found session on retry:', id);
              setSelectedSession(retrySession);
            } else {
              // Session not found after retry - navigate away regardless of other sessions
              console.error('Session not found after retry, navigating to root');
              navigate(buildAgentRootUrl('strategy', clientSlug), { replace: true });
            }
          } catch (retryError) {
            console.error('Error on retry:', retryError);
            // Navigate away on error
            navigate(buildAgentRootUrl('strategy', clientSlug), { replace: true });
          }
        }, 2000); // Wait 2 seconds before retry
      }
    } catch (error) {
      console.error('Error loading session:', error);
      // If error (e.g., unauthorized), navigate back preserving client context
      navigate(buildAgentRootUrl('strategy', clientSlug), { replace: true });
    }
  };

  const handleSelectSession = (session: StrategySession) => {
    // Navigate to session URL using agent_type from session for cross-agent routing
    const agentType = (session as any).agent_type || 'strategy';
    navigate(buildAgentSessionUrl(agentType, session.id, clientSlug));
  };

  const handleCreateSession = () => {
    // Clear selected session FIRST to prevent useEffect from trying to reload deleted session
    setSelectedSession(null);

    // Navigate back to base strategy URL for new session, preserving client context
    // Use replace: true to prevent race conditions with session deletion/archiving
    navigate(buildAgentRootUrl('strategy', clientSlug), { replace: true });
  };

  const handleSessionCreated = (session: any) => {
    console.log('New session created:', session);
    // When a new session is created, set it and navigate to its URL
    // Setting it first prevents the loadSessionFromId from overriding it
    setSelectedSession(session);

    // Preserve client context when navigating
    // If in client-scoped route, stay in client-scoped route
    const sessionRoute = clientSlug
      ? `/clients/${clientSlug}/agents/strategy/session/${session.id}`
      : ROUTES.agents.strategy.session(session.id);

    // Use replace instead of navigate to avoid adding to history stack
    navigate(sessionRoute, { replace: true });
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
      icon={Target}
      title={t('strategy.page.title')}
      subtitle={t('strategy.page.subtitle')}
      sessionTitle={selectedSession?.session_title || t('strategy.page.defaultSessionTitle')}
      featureCards={featureCards}
      onNewSession={handleCreateSession}
      sidebar={
        <StrategySidebar
          onSelectSession={handleSelectSession}
          onCreateSession={handleCreateSession}
          selectedSessionId={selectedSession?.id}
        />
      }
      sessionHistorySheet={mobileHistory.sheet}
      mobileHistoryButton={mobileHistory.button}
    >
      <StrategyChat
        selectedSession={selectedSession}
        initialMessage={templatePrompt}
        onSessionCreated={handleSessionCreated}
      />
    </AgentPageLayout>
  );
}
