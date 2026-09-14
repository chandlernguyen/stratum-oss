import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/useLocale';
import { extractSessionId } from '@/utils/wildcardRouteParams';
import { PersonaChat } from '@/components/agents/PersonaChat';
import { PersonaSidebar } from '@/components/personas/PersonaSidebar';
import { useMobileSessionHistory } from '@/components/agents/MobileSessionHistory';
import { PersonaFormModal } from '@/components/personas/PersonaFormModal';
import { AgentTabs } from '@/components/agents/AgentTabs';
import { PersonaListView } from '@/components/personas/PersonaListView';
import { Users, UserCheck, Target, Brain, MessageSquarePlus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ContextAlert } from '@/components/agents/ContextAlert';
import { api } from '@/lib/api';
import { useSessionManagement } from '@/hooks/useSessionManagement';
import type { QuickWinTemplate } from '@/components/onboarding/QuickWinTemplates';
import { useAgencyRouteGuard } from '@/hooks/useAgencyRouteGuard';
import { useClientContext } from '@/contexts/ClientContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { usePersona, usePersonas, useArchivePersona } from '@/hooks/data/usePersonas'; // ✅ Database-first approach
import { personasAPI } from '@/lib/api-client';
import { getIntlLocale } from '@/lib/locales';
import { buildAgentRootUrl, buildAgentSessionUrl } from '@/utils/multiTenantRouting';
import { ROUTES } from '@/config/routes';
import { useAgentLayout } from '@/contexts/AgentLayoutContext';
import { useAccessDenied } from '@/components/auth/AccessDenied';


export function PersonaAgent() {
  console.log('[PersonaAgent] ===== COMPONENT INITIALIZING =====');

  // Enforce client context for agency users
  useAgencyRouteGuard();

  // Set page title for GA4 tracking and accessibility
  usePageTitle('Persona Agent');

  // i18n translations
  const { t } = useTranslation('agents');

  // Permission check for this agent
  const { hasPermission, isLoading: permissionLoading, AccessDeniedComponent } = useAccessDenied(
    'agents.persona.access',
    'Persona Agent'
  );

  // Localization hook
  const { locale } = useLocale('personas');

  // Show access denied if user lacks permission
  if (!permissionLoading && !hasPermission) {
    return AccessDeniedComponent;
  }

  // Use wildcard route to prevent component remount during navigation
  const params = useParams<{ '*': string }>();
  const sessionId = extractSessionId(params['*']);
  const { clientId, clientSlug } = useClientContext(); // Get client context from provider
  const agentLayout = useAgentLayout();

  console.log('[PersonaAgent] Hooks initialized - sessionId:', sessionId, 'clientSlug:', clientSlug, 'clientId:', clientId);
  const navigate = useNavigate();
  const location = useLocation();
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingPersonaId, setEditingPersonaId] = useState<string | undefined>(undefined); // ✅ Store ID for hook
  const [refreshSidebar, setRefreshSidebar] = useState(0);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [templatePrompt, setTemplatePrompt] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<string>('chat'); // Tab state: 'chat' or 'list'

  // ✅ Database-first: Fetch persona data using hook when editing
  const { data: editingPersona, isLoading: isLoadingPersona } = usePersona(editingPersonaId);

  // ✅ Fetch personas for list view (mobile-only, but always fetch for consistency)
  const { data: personas = [], isLoading: isLoadingPersonas, refetch: refetchPersonas } = usePersonas({
    includeArchived: false,
    clientId: clientId || undefined,
  });

  // ✅ Archive mutation hook
  const archivePersonaMutation = useArchivePersona();

  // Set agent page mode for proper layout (removes main padding on mobile)
  useEffect(() => {
    agentLayout?.setIsAgentPage(true);
    return () => agentLayout?.setIsAgentPage(false);
  }, [agentLayout]);

  // Hide footer when in active session mode (matches AgentPageLayout pattern)
  useEffect(() => {
    agentLayout?.setHideFooter(!!selectedSession);
  }, [selectedSession, agentLayout]);

  // Check for Quick Win Template on mount
  useEffect(() => {
    const templateStr = localStorage.getItem('quickWinTemplate');
    if (templateStr) {
      try {
        const template: QuickWinTemplate = JSON.parse(templateStr);
        if (template.agents.includes('persona')) {
          setTemplatePrompt(template.prefilledPrompt);
          console.log('[PersonaAgent] Loaded Quick Win Template:', template.title);
        }
        localStorage.removeItem('quickWinTemplate');
      } catch (error) {
        console.error('[PersonaAgent] Error parsing template:', error);
        localStorage.removeItem('quickWinTemplate');
      }
    }
  }, []);

  // Check for cross-agent navigation with initialMessage
  useEffect(() => {
    console.log('[PersonaAgent] Checking for cross-agent navigation. location.state:', location.state);
    const navigationInitialMessage = location.state?.initialMessage;
    if (navigationInitialMessage && typeof navigationInitialMessage === 'string') {
      console.log('[PersonaAgent] Found initialMessage from cross-agent navigation:', navigationInitialMessage.substring(0, 100));
      setTemplatePrompt(navigationInitialMessage);
      // Clear the navigation state to prevent re-applying on future renders
      window.history.replaceState({}, document.title);
    } else {
      console.log('[PersonaAgent] No initialMessage found in location.state');
    }
  }, [location.state]);

  // Use the new shared session management hook
  const {
    sessions: chatSessions,
    showArchived,
    setShowArchived,
    deleteSession,
    permanentDeleteSession,
    archiveSession,
    restoreSession,
    renameSession
  } = useSessionManagement({
    endpoint: '/api/v1/direct-agents/persona/sessions',
    agentType: 'persona',
    autoLoad: true
  });


  // Transform sessions to match ChatSession interface
  const transformedSessions = chatSessions.map((session: any) => ({
    id: session.id,
    title: session.session_title || session.title || 'Persona Discussion',
    created_at: session.created_at,
    first_message: session.first_message || session.last_message || '',
    message_count: session.message_count || 0,
    archived: session.archived,
    archived_at: session.archived_at,
    archived_by: session.archived_by,
    archive_reason: session.archive_reason
  }));

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
      const response = await api.get(`/api/v1/direct-agents/persona/sessions`);
      const sessions = response.data.sessions;

      // Find the specific session
      const session = sessions.find((s: any) => s.id === id);

      if (session) {
        setSelectedSession(session);
      } else {
        // If session not found, retry once after a delay
        setTimeout(async () => {
          try {
            const retryResponse = await api.get(`/api/v1/direct-agents/persona/sessions`);
            const retrySessions = retryResponse.data.sessions;
            const retrySession = retrySessions.find((s: any) => s.id === id);

            if (retrySession) {
              setSelectedSession(retrySession);
            } else {
              // Session not found after retry - navigate away
              navigate(buildAgentRootUrl('persona', clientSlug), { replace: true });
            }
          } catch (retryError) {
            // Error on retry - navigate away
            navigate(buildAgentRootUrl('persona', clientSlug), { replace: true });
          }
        }, 2000);
      }
    } catch (error) {
      console.error('Error loading session:', error);
      // Navigate away preserving client context
      navigate(buildAgentRootUrl('persona', clientSlug), { replace: true });
    }
  };

  const handleInterviewPersona = (persona: any) => {
    // Navigate to interview mode, preserving client context (special route)
    const interviewUrl = clientSlug
      ? `/clients/${clientSlug}/agents/persona/interview/${persona.id}`
      : ROUTES.agents.persona.interview(persona.id);
    navigate(interviewUrl);
  };

  const handleCreatePersona = () => {
    setEditingPersonaId(undefined); // ✅ Clear editing persona ID
    setIsFormModalOpen(true);
  };

  const handleEditPersona = (persona: any) => {
    // ✅ Database-first: Set persona ID to trigger usePersona hook
    console.log('[handleEditPersona] Setting persona ID for editing:', persona.id);
    setEditingPersonaId(persona.id);
  };

  // ✅ Open modal when persona data is loaded
  useEffect(() => {
    if (editingPersonaId && editingPersona && !isLoadingPersona) {
      console.log('[PersonaAgent] Persona data loaded, opening modal:', editingPersona);
      setIsFormModalOpen(true);
    }
  }, [editingPersonaId, editingPersona, isLoadingPersona]);

  const handleSavePersona = () => {
    // Only refresh the sidebar, don't reload the entire page
    setRefreshSidebar(prev => prev + 1);
    // Refetch personas for mobile list view
    refetchPersonas();
    // Close the modal and clear editing state
    setIsFormModalOpen(false);
    setEditingPersonaId(undefined); // ✅ Clear editing persona ID
  };

  const handleDuplicatePersona = async (personaId: string, currentName: string) => {
    try {
      // Generate a unique name with timestamp
      const timestamp = new Date().toLocaleDateString(getIntlLocale(locale), {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      const newName = `${currentName} (Copy ${timestamp})`;

      const response = await personasAPI.duplicate(personaId, newName);
      if (response.success) {
        refetchPersonas();
        setRefreshSidebar(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error duplicating persona:', error);
    }
  };

  const handleArchivePersona = async (personaId: string) => {
    try {
      await archivePersonaMutation.mutateAsync({ id: personaId, reason: 'Archived by user' });
      refetchPersonas();
      setRefreshSidebar(prev => prev + 1);
    } catch (error) {
      console.error('Error archiving persona:', error);
    }
  };

  const handleRestorePersona = async (personaId: string) => {
    try {
      const response = await personasAPI.restore(personaId);
      if (response.success) {
        refetchPersonas();
        setRefreshSidebar(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error restoring persona:', error);
    }
  };

  // Refetch personas when sidebar refreshes
  useEffect(() => {
    if (refreshSidebar > 0) {
      refetchPersonas();
    }
  }, [refreshSidebar]);

  const handleSelectSession = (session: any) => {
    // Navigate to session URL using agent_type from session for cross-agent routing
    const agentType = session.agent_type || 'persona';
    navigate(buildAgentSessionUrl(agentType, session.id, clientSlug));
  };

  const handleCreateSession = () => {
    // Clear selected session FIRST to prevent useEffect from trying to reload deleted session
    setSelectedSession(null);

    // Navigate back to base persona URL for new session, preserving client context
    // Use replace: true to prevent race conditions with session deletion/archiving
    navigate(buildAgentRootUrl('persona', clientSlug), { replace: true });
  };

  // Mobile session history - DRY hook providing button and sheet
  const mobileHistory = useMobileSessionHistory({
    sessions: transformedSessions,
    selectedSessionId: selectedSession?.id,
    onSessionSelect: handleSelectSession,
    onNewSession: handleCreateSession,
  });

  const handleDeleteSession = async (sessionId: string) => {
    const success = await deleteSession(sessionId);
    if (success && selectedSession?.id === sessionId) {
      setSelectedSession(null);
      // Preserve client context when navigating away after deleting
      navigate(buildAgentRootUrl('persona', clientSlug));
    }
  };

  const handlePermanentDeleteSession = async (sessionId: string) => {
    const success = await permanentDeleteSession(sessionId);
    if (success && selectedSession?.id === sessionId) {
      setSelectedSession(null);
      // Preserve client context when navigating away after deleting
      navigate(buildAgentRootUrl('persona', clientSlug));
    }
  };

  return (
    <div className="h-full overflow-hidden bg-gradient-to-br from-gray-50 via-white to-amber-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="flex flex-col md:flex-row h-full">
        {/* Persona Sidebar - Desktop only */}
        <div className="hidden md:block">
          <PersonaSidebar
            refreshTrigger={refreshSidebar}
            clientId={clientId || undefined} // ✅ Agency client filtering
            onSelectPersona={handleInterviewPersona}
            onCreatePersona={handleCreatePersona}
            onEditPersona={handleEditPersona}
            selectedPersonaId={undefined}
            chatSessions={transformedSessions}
            onSelectChat={handleSelectSession}
            currentChatId={selectedSession?.id}
            onNewChat={handleCreateSession}
            onDeleteChatSession={handleDeleteSession}
            onPermanentDeleteChatSession={handlePermanentDeleteSession}
            onRenameChatSession={renameSession}
            onArchiveChatSession={archiveSession}
            onRestoreChatSession={restoreSession}
            showArchived={showArchived}
            onToggleArchived={() => setShowArchived(!showArchived)}
          />
        </div>

        {/* Session History Sheet - Mobile only (controlled mode, no floating FAB) */}
        {mobileHistory.sheet}

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Context Alert - Desktop only */}
          <div className="hidden md:block container mx-auto px-6 pt-10">
            <ContextAlert />
          </div>

          {/* Mobile Tabs (hidden on desktop) */}
          <AgentTabs
            tabs={[
              {
                id: 'chat',
                label: t('persona.page.tabs.newPersona'),
                icon: MessageSquarePlus,
              },
              {
                id: 'list',
                label: t('persona.page.tabs.myPersonas'),
                count: personas.length,
                icon: Users,
              },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
            trailingAction={mobileHistory.button}
          />

          {/* Desktop Context Alert (shown in container) */}
          <div className="md:hidden px-3 pt-3">
            <ContextAlert />
          </div>

          {/* Content based on active tab */}
          {activeTab === 'chat' ? (
            // Chat View (always visible on desktop, tab 1 on mobile)
            selectedSession ? (
              /* SESSION MODE: Compact header, full-height chat */
              <div className="flex flex-col h-full">
                {/* Compact Header - Desktop only (mobile has tabs) */}
                <div className="hidden md:flex flex-shrink-0 items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-gradient-to-br from-slate-600 to-amber-600">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <span className="font-semibold text-brand-charcoal dark:text-gray-100">
                        {t('persona.page.title')}
                      </span>
                      <span className="text-sm text-brand-slate dark:text-gray-400 ml-2">
                        — {selectedSession.session_title || t('persona.page.defaultSessionTitle')}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedSession(null);
                      navigate(buildAgentRootUrl('persona', clientSlug));
                    }}
                    className="px-3 py-1.5 text-sm text-brand-slate hover:text-brand-charcoal dark:text-gray-400 dark:hover:text-gray-100 transition-colors"
                  >
                    {t('persona.page.session.newSession')}
                  </button>
                </div>

                {/* Chat Area - Full height, extends to edges on mobile */}
                <div className="flex-1 min-h-0 flex flex-col">
                  <Card className="flex-1 min-h-0 mx-0 md:mx-6 mt-2 md:mt-4 mb-0 md:mb-4 shadow-lg border-x-0 md:border-x border-b-0 md:border-b border-gray-100 dark:border-gray-700 overflow-hidden rounded-none md:rounded-xl">
                    <PersonaChat
                      selectedSession={selectedSession}
                      initialMessage={templatePrompt}
                      onSessionCreated={(session: any, initialMessage: any) => {
                        setSelectedSession(session);
                        navigate(buildAgentSessionUrl('persona', session.id, clientSlug), {
                          replace: true,
                          state: { initialMessage: initialMessage }
                        });
                      }}
                      onSaveAsPersona={() => {
                        setEditingPersonaId(undefined);
                        setIsFormModalOpen(true);
                      }}
                    />
                  </Card>
                </div>
              </div>
            ) : (
              /* LANDING MODE: Full header with feature cards */
              <div className="flex flex-col h-full md:block container mx-auto px-3 md:px-6 py-2 md:py-10 pb-0 md:pb-10">
                {/* Enhanced Header - Desktop only */}
                <div className="hidden md:block mb-10">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-slate-600 to-amber-600 shadow-xl">
                      <Users className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h1 className="text-4xl font-bold text-brand-charcoal dark:text-gray-100">
                        {t('persona.page.title')}
                      </h1>
                      <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">
                        {t('persona.page.subtitle')}
                      </p>
                    </div>
                  </div>

                  {/* Feature Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                    <Card className="p-5 hover:shadow-lg transition-all duration-200 border-2 hover:border-slate-200 dark:hover:border-slate-800">
                      <div className="flex items-start gap-3">
                        <UserCheck className="w-6 h-6 text-amber-600 dark:text-amber-400 mt-1" />
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{t('persona.page.features.profiles.title')}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {t('persona.page.features.profiles.description')}
                          </p>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-5 hover:shadow-lg transition-all duration-200 border-2 hover:border-pink-200 dark:hover:border-pink-800">
                      <div className="flex items-start gap-3">
                        <Target className="w-6 h-6 text-pink-600 dark:text-pink-400 mt-1" />
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{t('persona.page.features.journey.title')}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {t('persona.page.features.journey.description')}
                          </p>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-5 hover:shadow-lg transition-all duration-200 border-2 hover:border-indigo-200 dark:hover:border-indigo-800">
                      <div className="flex items-start gap-3">
                        <Brain className="w-6 h-6 text-indigo-600 dark:text-indigo-400 mt-1" />
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{t('persona.page.features.insights.title')}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {t('persona.page.features.insights.description')}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>

                {/* Chat Component with enhanced container */}
                <Card className="flex-1 md:flex-none shadow-2xl border-2 border-gray-100 dark:border-gray-700 overflow-hidden rounded-b-none md:rounded-b-xl">
                  <PersonaChat
                    selectedSession={selectedSession}
                    initialMessage={templatePrompt}
                    onSessionCreated={(session: any, initialMessage: any) => {
                      setSelectedSession(session);
                      navigate(buildAgentSessionUrl('persona', session.id, clientSlug), {
                        replace: true,
                        state: { initialMessage: initialMessage }
                      });
                    }}
                    onSaveAsPersona={() => {
                      setEditingPersonaId(undefined);
                      setIsFormModalOpen(true);
                    }}
                  />
                </Card>
              </div>
            )
          ) : (
            // List View (mobile-only tab 2)
            <div className="md:hidden">
              <PersonaListView
                personas={personas}
                isLoading={isLoadingPersonas}
                onSelectPersona={handleInterviewPersona}
                onEditPersona={handleEditPersona}
                onDuplicatePersona={handleDuplicatePersona}
                onArchivePersona={handleArchivePersona}
                onRestorePersona={handleRestorePersona}
                onCreatePersona={handleCreatePersona}
              />
            </div>
          )}
        </div>
      </div>

      {/* Persona Form Modal */}
      <PersonaFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingPersonaId(undefined); // ✅ Clear editing persona ID on close
        }}
        onSave={handleSavePersona}
        persona={editingPersona}
      />
    </div>
  );
}
