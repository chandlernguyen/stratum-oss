/**
 * Competitive Intelligence Agent Page
 *
 * Two-mode interface:
 * 1. Analysis Mode (default): Framework displays and competitive research tools
 * 2. Chat Mode: Interactive chat with competitive intelligence agent (Google Search grounding)
 *
 * Pattern: Adapted from CampaignExecutionAgent.tsx
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { extractSessionId } from '@/utils/wildcardRouteParams'
import { CompetitiveIntelligenceChat } from '@/components/agents/CompetitiveIntelligenceChat'
import { CompetitiveIntelligenceSidebar } from '@/components/competitive-intelligence/CompetitiveIntelligenceSidebar'
import { useMobileSessionHistory } from '@/components/agents/MobileSessionHistory'
import { CompetitiveAnalysisDisplay } from '@/components/competitive-intelligence/CompetitiveAnalysisDisplay'
import { Target, ArrowLeft } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { useBusinessContext } from '@/hooks/useBusinessContext'
import type { QuickWinTemplate } from '@/components/onboarding/QuickWinTemplates'
import { useAgencyRouteGuard } from '@/hooks/useAgencyRouteGuard'
import { useClientContext } from '@/contexts/ClientContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import { buildAgentRootUrl, buildAgentSessionUrl } from '@/utils/multiTenantRouting'
import { useAgentLayout } from '@/contexts/AgentLayoutContext'
import { useAccessDenied } from '@/components/auth/AccessDenied'

interface CompetitiveIntelligenceSession {
  id: string;
  created_at: string;
  updated_at?: string;
  session_title?: string | null;
  message_count?: number;
  first_message?: string;
}

type ViewMode = 'analysis' | 'chat';

export function CompetitiveIntelligenceAgent() {
  // i18n translations
  const { t } = useTranslation('agents');

  // Enforce client context for agency users
  useAgencyRouteGuard();

  // Set page title for GA4 tracking and accessibility
  usePageTitle('Competitive Intelligence');

  // Permission check for this agent
  const { hasPermission, isLoading: permissionLoading, AccessDeniedComponent } = useAccessDenied(
    'agents.intelligence.access',
    'Competitive Intelligence Agent'
  );

  // Show access denied if user lacks permission
  if (!permissionLoading && !hasPermission) {
    return AccessDeniedComponent;
  }

  const params = useParams<{ '*': string }>();
  const sessionId = extractSessionId(params['*']);
  const { clientSlug } = useClientContext(); // Get client context from provider
  const agentLayout = useAgentLayout();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const frameworkId = searchParams.get('framework');
  const { data: businessContext } = useBusinessContext({ clientSlug: clientSlug ?? undefined });

  const [selectedSession, setSelectedSession] = useState<CompetitiveIntelligenceSession | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('analysis');
  const [templatePrompt, setTemplatePrompt] = useState<string | undefined>(undefined);
  const [sessions, setSessions] = useState<any[]>([]);

  // Set agent page mode only when in chat mode (needs fixed-height layout)
  // Analysis mode (landing) should scroll freely
  useEffect(() => {
    agentLayout?.setIsAgentPage(viewMode === 'chat');
    return () => agentLayout?.setIsAgentPage(false);
  }, [agentLayout, viewMode]);

  // Hide footer when in active chat mode (session selected)
  useEffect(() => {
    agentLayout?.setHideFooter(!!selectedSession);
  }, [selectedSession, agentLayout]);

  // Check for Quick Win Template on mount
  useEffect(() => {
    const templateStr = localStorage.getItem('quickWinTemplate');
    if (templateStr) {
      try {
        const template: QuickWinTemplate = JSON.parse(templateStr);
        if (template.agents.includes('competitive-intelligence') || template.agents.includes('strategy')) {
          setTemplatePrompt(template.prefilledPrompt);
          setViewMode('chat'); // Auto-switch to chat mode when template detected
          console.log('[CompetitiveIntelligenceAgent] Loaded Quick Win Template:', template.title);
        }
        localStorage.removeItem('quickWinTemplate');
      } catch (error) {
        console.error('[CompetitiveIntelligenceAgent] Error parsing template:', error);
        localStorage.removeItem('quickWinTemplate');
      }
    }
  }, []);

  // Auto-switch to chat mode when framework parameter present
  useEffect(() => {
    if (frameworkId) {
      setViewMode('chat');
    }
  }, [frameworkId]);

  // Load sessions for SessionHistorySheet
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const response = await api.get(`/api/v1/direct-agents/competitive_intelligence/sessions`);
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
      // Only load if we don't already have this session selected
      if (!selectedSession || selectedSession.id !== sessionId) {
        loadSessionFromId(sessionId);
      }
      // If there's a session, show chat mode
      setViewMode('chat');
    } else if (!frameworkId) {
      // Only reset to analysis mode if no framework is selected
      setSelectedSession(null);
      if (viewMode === 'chat') {
        setViewMode('analysis');
      }
    }
  }, [sessionId]);

  const loadSessionFromId = async (id: string) => {
    try {
      const response = await api.get(`/api/v1/direct-agents/competitive_intelligence/sessions`);
      const sessions = response.data.sessions;
      const session = sessions.find((s: CompetitiveIntelligenceSession) => s.id === id);
      
      if (session) {
        setSelectedSession(session);
      } else {
        console.error('Session not found or access denied');
        navigate(buildAgentRootUrl('competitive_intelligence', clientSlug));
      }
    } catch (error) {
      console.error('Error loading session:', error);
      navigate(buildAgentRootUrl('competitive_intelligence', clientSlug));
    }
  };

  const handleSelectSession = (session: CompetitiveIntelligenceSession) => {
    // Navigate to session URL using agent_type from session for cross-agent routing
    const agentType = (session as any).agent_type || 'competitive_intelligence';
    navigate(buildAgentSessionUrl(agentType, session.id, clientSlug));
  };

  const handleCreateSession = () => {
    // Clear selected session FIRST to prevent useEffect from trying to reload deleted session
    setSelectedSession(null);

    // Preserve client context when creating new session
    // Use replace: true to prevent race conditions with session deletion/archiving
    navigate(buildAgentRootUrl('competitive_intelligence', clientSlug), { replace: true });
    setViewMode('analysis');
  };

  const handleOpenChat = () => {
    setViewMode('chat');
    if (!sessionId) {
      // Create new session by navigating to root (chat will auto-create)
      navigate(buildAgentRootUrl('competitive_intelligence', clientSlug));
    }
  };

  const handleBackToAnalysis = () => {
    setViewMode('analysis');
    navigate(buildAgentRootUrl('competitive_intelligence', clientSlug));
  };

  // Mobile session history (DRY pattern)
  const mobileHistory = useMobileSessionHistory({
    sessions,
    selectedSessionId: selectedSession?.id,
    onSessionSelect: handleSelectSession,
    onNewSession: handleCreateSession,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-amber-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="flex flex-col md:flex-row">
        {/* Competitive Intelligence Sidebar - Desktop only */}
        <div className="hidden md:block">
          <CompetitiveIntelligenceSidebar
            onSelectSession={handleSelectSession}
            onCreateSession={handleCreateSession}
            selectedSessionId={selectedSession?.id}
          />
        </div>

        {/* Session History Sheet - Mobile only */}
        {mobileHistory.sheet}

        {/* Main Content Area */}
        <div className="flex-1">
          {/* Analysis Display Mode */}
          {viewMode === 'analysis' && (
            <div className="container mx-auto px-6 py-10">
              <CompetitiveAnalysisDisplay onOpenChat={handleOpenChat} />
            </div>
          )}

          {/* Chat Mode */}
          {viewMode === 'chat' && (
            <div className="h-full flex flex-col">
              {selectedSession ? (
                /* SESSION MODE: Compact header, full-height chat */
                <>
                  {/* Compact Header */}
                  <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-lg bg-gradient-to-br from-slate-600 to-amber-600">
                        <Target className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <span className="font-semibold text-brand-charcoal dark:text-gray-100">
                          {t('competitive_intelligence.page.title')}
                        </span>
                        <span className="hidden md:inline text-sm text-brand-slate dark:text-gray-400 ml-2">
                          — {selectedSession.session_title || t('competitive_intelligence.page.defaultSessionTitle')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Mobile history button */}
                      {mobileHistory.button}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCreateSession}
                        className="text-brand-slate hover:text-brand-charcoal dark:text-gray-400 dark:hover:text-gray-100"
                      >
                        {t('competitive_intelligence.page.session.newSession')}
                      </Button>
                    </div>
                  </div>

                  {/* Chat Area - Full height, extends to edges on mobile */}
                  <div className="flex-1 min-h-0 flex flex-col">
                    <Card className="flex-1 min-h-0 mx-0 md:mx-6 mt-2 md:mt-4 mb-0 md:mb-4 shadow-lg border-x-0 md:border-x border-b-0 md:border-b border-gray-100 dark:border-gray-700 overflow-hidden rounded-none md:rounded-xl">
                      <CompetitiveIntelligenceChat
                        selectedSession={selectedSession}
                        frameworkId={frameworkId}
                        businessContext={businessContext}
                        initialMessage={templatePrompt}
                        onSessionCreated={(session: any) => {
                          setSelectedSession(session);
                          const sessionRoute = buildAgentSessionUrl('competitive_intelligence', session.id, clientSlug);
                          console.log('[CompetitiveIntelligenceAgent] Session created, navigating to:', sessionRoute);
                          navigate(sessionRoute);
                        }}
                      />
                    </Card>
                  </div>
                </>
              ) : (
                /* LANDING MODE: Full header with back button */
                <div className="container mx-auto px-3 md:px-6 py-6 md:py-10">
                  {/* Header */}
                  <div className="mb-6">
                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleBackToAnalysis}
                        className="w-full md:w-auto min-h-12 md:min-h-10 text-gray-600 dark:text-gray-400 hover:text-brand-charcoal dark:hover:text-gray-100"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        {t('competitive_intelligence.page.session.backToAnalysis')}
                      </Button>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center gap-4 mt-4">
                      <div className="p-2.5 md:p-3 rounded-2xl bg-gradient-to-br from-slate-600 to-amber-600 shadow-xl">
                        <Target className="w-7 h-7 md:w-8 md:h-8 text-white" />
                      </div>
                      <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-brand-charcoal dark:text-gray-100">
                          {t('competitive_intelligence.page.title')}
                        </h1>
                        <p className="text-base md:text-lg text-gray-600 dark:text-gray-400 mt-2">
                          {t('competitive_intelligence.page.subtitle')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Chat Component */}
                  <Card className="shadow-2xl border-2 border-gray-100 dark:border-gray-700 overflow-hidden">
                    <CompetitiveIntelligenceChat
                      selectedSession={selectedSession}
                      frameworkId={frameworkId}
                      businessContext={businessContext}
                      initialMessage={templatePrompt}
                      onSessionCreated={(session: any) => {
                        setSelectedSession(session);
                        const sessionRoute = buildAgentSessionUrl('competitive_intelligence', session.id, clientSlug);
                        console.log('[CompetitiveIntelligenceAgent] Session created, navigating to:', sessionRoute);
                        navigate(sessionRoute);
                      }}
                    />
                  </Card>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
