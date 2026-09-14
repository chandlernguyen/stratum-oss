/**
 * Campaign Execution Agent Page
 *
 * Three-mode interface:
 * 1. Plans Display Mode (default): Auto-generated campaign plans with ICE scoring
 * 2. Plan Detail Mode: Deep dive into deployment framework, A/B testing, and execution context
 * 3. Chat Mode: Interactive chat with campaign execution agent
 *
 * Pattern: Adapted from QuickWinsAgent.tsx
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { extractCampaignPlanningParams } from '@/utils/wildcardRouteParams'
import { CampaignExecutionChat } from '@/components/agents/CampaignExecutionChat'
import { CampaignExecutionSidebar } from '@/components/campaign-execution/CampaignExecutionSidebar'
import { useMobileSessionHistory } from '@/components/agents/MobileSessionHistory'
import { CampaignPlansDisplay } from '@/components/campaign-execution/CampaignPlansDisplay'
import { DeploymentFrameworkDisplay } from '@/components/campaign-execution/DeploymentFrameworkDisplay'
import { ABTestingFrameworkDisplay } from '@/components/campaign-execution/ABTestingFrameworkDisplay'
import { ExecutionContextDisplay } from '@/components/campaign-execution/ExecutionContextDisplay'
import { Play, ArrowLeft } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/lib/api'
import type { CampaignPlan } from '@/hooks/useCampaignPlanRecommendations'
import { useCampaignPlanRecommendations } from '@/hooks/useCampaignPlanRecommendations'
import type { QuickWinTemplate } from '@/components/onboarding/QuickWinTemplates'
import { useAgencyRouteGuard } from '@/hooks/useAgencyRouteGuard'
import { useClientContext } from '@/contexts/ClientContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import { buildAgentRootUrl, buildAgentSessionUrl } from '@/utils/multiTenantRouting'
import { useAgentLayout } from '@/contexts/AgentLayoutContext'
import { useAccessDenied } from '@/components/auth/AccessDenied'

interface CampaignExecutionSession {
  id: string;
  created_at: string;
  updated_at?: string;
  session_title?: string | null;
  message_count?: number;
  first_message?: string;
}

type ViewMode = 'plans' | 'plan-detail' | 'chat';

export function CampaignExecutionAgent() {
  // i18n translations
  const { t } = useTranslation('agents');

  // Enforce client context for agency users
  useAgencyRouteGuard();

  // Set page title for GA4 tracking and accessibility
  usePageTitle('Campaign Planning');

  // Permission check for this agent
  const { hasPermission, isLoading: permissionLoading, AccessDeniedComponent } = useAccessDenied(
    'agents.execution.access',
    'Campaign Planning Agent'
  );

  // Show access denied if user lacks permission
  if (!permissionLoading && !hasPermission) {
    return AccessDeniedComponent;
  }

  const params = useParams<{ '*': string }>();
  const { sessionId, planId } = extractCampaignPlanningParams(params['*']);
  const { clientSlug } = useClientContext(); // Get client context from provider
  const agentLayout = useAgentLayout();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedSession, setSelectedSession] = useState<CampaignExecutionSession | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('plans');
  const [selectedPlan, setSelectedPlan] = useState<CampaignPlan | null>(null);
  const [templatePrompt, setTemplatePrompt] = useState<string | undefined>(undefined);
  const [sessions, setSessions] = useState<any[]>([]);

  // Load campaign plans to enable URL-based plan selection
  const { data: plansResponse } = useCampaignPlanRecommendations({ clientSlug: clientSlug ?? undefined });

  // Only set agent page mode when in chat session (needs fixed-height layout)
  // Plans/landing views need scrollable layout, so don't set isAgentPage
  const needsFixedLayout = viewMode === 'chat' && !!selectedSession;
  useEffect(() => {
    agentLayout?.setIsAgentPage(needsFixedLayout);
    return () => agentLayout?.setIsAgentPage(false);
  }, [agentLayout, needsFixedLayout]);

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
        if (template.agents.includes('campaign-execution') || template.agents.includes('content')) {
          setTemplatePrompt(template.prefilledPrompt);
          setViewMode('chat'); // Auto-switch to chat mode when template detected
          console.log('[CampaignExecutionAgent] Loaded Quick Win Template:', template.title);
        }
        localStorage.removeItem('quickWinTemplate');
      } catch (error) {
        console.error('[CampaignExecutionAgent] Error parsing template:', error);
        localStorage.removeItem('quickWinTemplate');
      }
    }
  }, []);

  // Check for cross-agent navigation with initialMessage
  useEffect(() => {
    const navigationInitialMessage = location.state?.initialMessage;
    if (navigationInitialMessage && typeof navigationInitialMessage === 'string') {
      console.log('[CampaignExecutionAgent] Found initialMessage from cross-agent navigation:', navigationInitialMessage.substring(0, 100));
      setTemplatePrompt(navigationInitialMessage);
      setViewMode('chat'); // Auto-switch to chat mode when coming from another agent
      // Clear the navigation state to prevent re-applying on future renders
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Load sessions for SessionHistorySheet
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const response = await api.get(`/api/v1/direct-agents/campaign_planning/sessions`);
        setSessions(response.data.sessions || []);
      } catch (error) {
        console.error('Error loading sessions:', error);
        setSessions([]);
      }
    };
    loadSessions();
  }, [selectedSession]);

  // Handle session changes
  useEffect(() => {
    if (sessionId) {
      // Only load if we don't already have this session selected
      if (!selectedSession || selectedSession.id !== sessionId) {
        loadSessionFromId(sessionId);
      }
      // If there's a session, show chat mode
      setViewMode('chat');
    } else {
      setSelectedSession(null);
      // Don't auto-reset to plans mode - let handleOpenChat control this
      // The user may have explicitly clicked "Chat for Custom Plans"
    }
  }, [sessionId]);

  // Handle plan selection from URL
  useEffect(() => {
    if (planId && plansResponse?.plans) {
      const plan = plansResponse.plans.find((p: CampaignPlan) => p.id === planId);
      if (plan) {
        setSelectedPlan(plan);
        setViewMode('plan-detail');
      } else {
        // Plan not found, redirect to plans list
        console.warn(`[CampaignExecutionAgent] Plan ${planId} not found, redirecting to plans list`);
        navigate(buildAgentRootUrl('campaign_execution', clientSlug));
      }
    } else if (!planId && viewMode === 'plan-detail') {
      // No planId in URL but we're in plan-detail mode, reset
      setSelectedPlan(null);
      setViewMode('plans');
    }
  }, [planId, plansResponse?.plans]);

  const loadSessionFromId = async (id: string) => {
    try {
      const response = await api.get(`/api/v1/direct-agents/campaign_planning/sessions`);
      const sessions = response.data.sessions;
      const session = sessions.find((s: CampaignExecutionSession) => s.id === id);

      if (session) {
        setSelectedSession(session);
      } else {
        console.error('Session not found or access denied');
        navigate(buildAgentRootUrl('campaign_execution', clientSlug));
      }
    } catch (error) {
      console.error('Error loading session:', error);
      navigate(buildAgentRootUrl('campaign_execution', clientSlug));
    }
  };

  const handleSelectSession = (session: CampaignExecutionSession) => {
    // Navigate to session URL using agent_type from session for cross-agent routing
    const agentType = (session as any).agent_type || 'campaign_execution';
    navigate(buildAgentSessionUrl(agentType, session.id, clientSlug));
  };

  const handleCreateSession = () => {
    // Clear selected session FIRST to prevent useEffect from trying to reload deleted session
    setSelectedSession(null);

    // Preserve client context when creating new session
    // Use replace: true to prevent race conditions with session deletion/archiving
    navigate(buildAgentRootUrl('campaign_execution', clientSlug), { replace: true });
    setViewMode('plans');
  };

  const handleOpenChat = () => {
    // Simply switch to chat mode - no navigation needed
    // The chat component will auto-create a session when user sends first message
    setViewMode('chat');
  };

  const handleBackToPlans = () => {
    navigate(buildAgentRootUrl('campaign_execution', clientSlug));
  };

  const handleSelectPlan = (plan: CampaignPlan) => {
    const planRoute = clientSlug
      ? `/clients/${clientSlug}/agents/campaign-planning/plan/${plan.id}`
      : `/campaign-planning/plan/${plan.id}`;
    navigate(planRoute);
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
        {/* Campaign Execution Sidebar - Desktop only */}
        <div className="hidden md:block">
          <CampaignExecutionSidebar
            onSelectSession={handleSelectSession}
            onCreateSession={handleCreateSession}
            selectedSessionId={selectedSession?.id}
          />
        </div>

        {/* Session History Sheet - Mobile only */}
        {mobileHistory.sheet}

        {/* Main Content Area */}
        <div className="flex-1">
          {/* Plans Display Mode */}
          {viewMode === 'plans' && (
            <div className="container mx-auto px-6 py-10">
              <CampaignPlansDisplay
                onOpenChat={handleOpenChat}
                onSelectPlan={handleSelectPlan}
              />
            </div>
          )}

          {/* Plan Detail Mode - Mobile optimized */}
          {viewMode === 'plan-detail' && selectedPlan && (
            <div className="container mx-auto px-4 md:px-6 py-6 md:py-10">
              {/* Back Button - Mobile: full-width touch target */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToPlans}
                className="mb-4 md:mb-6 text-brand-slate dark:text-gray-400 hover:text-brand-charcoal dark:hover:text-gray-100 w-full md:w-auto justify-start min-h-12 md:min-h-9"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('campaign_planning.page.session.backToPlans')}
              </Button>

              {/* Plan Header - Mobile optimized */}
              <div className="mb-6 md:mb-8">
                <div className="flex items-center gap-3 md:gap-4 mb-4">
                  <div className="p-2 md:p-3 rounded-2xl bg-gradient-to-br from-brand-gold to-amber-300 shadow-xl">
                    <Play className="w-6 h-6 md:w-8 md:h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-4xl font-bold text-brand-charcoal dark:text-gray-100">
                      {selectedPlan.title}
                    </h1>
                    <p className="text-sm md:text-lg text-brand-slate dark:text-gray-400 mt-1 md:mt-2">
                      {selectedPlan.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tabbed Detail View - Mobile: scrollable tabs */}
              <Tabs defaultValue="framework" className="space-y-4 md:space-y-6">
                <TabsList className="grid w-full grid-cols-3 h-auto">
                  <TabsTrigger value="framework" className="text-xs md:text-sm py-2.5 md:py-2">
                    <span className="hidden sm:inline">{t('campaign_planning.page.tabs.deploymentFramework')}</span>
                    <span className="sm:hidden">{t('campaign_planning.page.tabs.deploymentFrameworkShort')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="testing" className="text-xs md:text-sm py-2.5 md:py-2">
                    <span className="hidden sm:inline">{t('campaign_planning.page.tabs.abTesting')}</span>
                    <span className="sm:hidden">{t('campaign_planning.page.tabs.abTestingShort')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="execution" className="text-xs md:text-sm py-2.5 md:py-2">
                    <span className="hidden sm:inline">{t('campaign_planning.page.tabs.executionContext')}</span>
                    <span className="sm:hidden">{t('campaign_planning.page.tabs.executionContextShort')}</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="framework" className="space-y-6">
                  <DeploymentFrameworkDisplay plan={selectedPlan} />
                </TabsContent>

                <TabsContent value="testing" className="space-y-6">
                  <ABTestingFrameworkDisplay plan={selectedPlan} />
                </TabsContent>

                <TabsContent value="execution" className="space-y-6">
                  <ExecutionContextDisplay plan={selectedPlan} />
                </TabsContent>
              </Tabs>
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
                      <div className="p-1.5 rounded-lg bg-gradient-to-br from-brand-gold to-amber-300">
                        <Play className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <span className="font-semibold text-brand-charcoal dark:text-gray-100">
                          {t('campaign_planning.page.title')}
                        </span>
                        <span className="hidden md:inline text-sm text-brand-slate dark:text-gray-400 ml-2">
                          — {selectedSession.session_title || t('campaign_planning.page.defaultSessionTitle')}
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
                        {t('campaign_planning.page.session.newSession')}
                      </Button>
                    </div>
                  </div>

                  {/* Chat Area - Full height, extends to edges on mobile */}
                  <div className="flex-1 min-h-0 flex flex-col">
                    <Card className="flex-1 min-h-0 mx-0 md:mx-6 mt-2 md:mt-4 mb-0 md:mb-4 shadow-lg border-x-0 md:border-x border-b-0 md:border-b border-gray-100 dark:border-gray-700 overflow-hidden rounded-none md:rounded-xl">
                      <CampaignExecutionChat
                        selectedSession={selectedSession}
                        initialMessage={templatePrompt}
                        onSessionCreated={(session: any) => {
                          setSelectedSession(session);
                          const sessionRoute = buildAgentSessionUrl('campaign_execution', session.id, clientSlug);
                          console.log('[CampaignExecutionAgent] Session created, navigating to:', sessionRoute);
                          navigate(sessionRoute);
                        }}
                      />
                    </Card>
                  </div>
                </>
              ) : (
                /* LANDING MODE: Full header with back button */
                <div className="container mx-auto px-6 py-10">
                  {/* Header */}
                  <div className="mb-6">
                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleBackToPlans}
                        className="text-brand-slate dark:text-gray-400 hover:text-brand-charcoal dark:hover:text-gray-100"
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        {t('campaign_planning.page.session.backToPlans')}
                      </Button>
                    </div>
                    <div className="flex items-center gap-4 mt-4">
                      <div className="p-3 rounded-2xl bg-gradient-to-br from-brand-gold to-amber-300 shadow-xl">
                        <Play className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h1 className="text-4xl font-bold text-brand-charcoal dark:text-gray-100">
                          {t('campaign_planning.page.chatMode.title')}
                        </h1>
                        <p className="text-lg text-brand-slate dark:text-gray-400 mt-2">
                          {t('campaign_planning.page.chatMode.subtitle')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Chat Component */}
                  <Card className="shadow-2xl border-2 border-gray-100 dark:border-gray-700 overflow-hidden">
                    <CampaignExecutionChat
                      selectedSession={selectedSession}
                      initialMessage={templatePrompt}
                      onSessionCreated={(session: any) => {
                        setSelectedSession(session);
                        const sessionRoute = buildAgentSessionUrl('campaign_execution', session.id, clientSlug);
                        console.log('[CampaignExecutionAgent] Session created, navigating to:', sessionRoute);
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
