import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { extractSessionId } from '@/utils/wildcardRouteParams'
import { AgentChat } from '@/components/agents/AgentChat'
import { useMobileSessionHistory } from '@/components/agents/MobileSessionHistory'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ContextAlert } from '@/components/agents/ContextAlert'
import { LineChart, TrendingUp, Zap, DollarSign, BarChart3, Upload, FileSpreadsheet, Database, Calculator, Settings } from 'lucide-react'
import { api } from '@/lib/api'
import { ROIDashboardMetrics } from '@/components/roi-budget/ROIDashboardMetrics'
import { ROIRecommendations } from '@/components/roi-budget/ROIRecommendations'
import { useROIDashboardMetrics } from '@/hooks/data/useCampaignMetrics'
import type { QuickWinTemplate } from '@/components/onboarding/QuickWinTemplates'
import { useAgencyRouteGuard } from '@/hooks/useAgencyRouteGuard'
import { useClientContext } from '@/contexts/ClientContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import { buildAgentRootUrl, buildAgentSessionUrl } from '@/utils/multiTenantRouting'
import { useAgentLayout } from '@/contexts/AgentLayoutContext'
import { useAccessDenied } from '@/components/auth/AccessDenied'

interface PerformanceSession {
  id: string;
  created_at: string;
  updated_at?: string;
  session_title?: string | null;
  message_count?: number;
  first_message?: string;
}

/**
 * Performance Intelligence Agent - Unified performance analysis combining:
 * - ROI & Budget Agent: ROI calculations, budget optimization
 * - Quick Wins Agent: Immediate opportunity identification
 * - Analytics Agent: Performance analysis, forecasting
 *
 * This consolidates 3 agents into a single unified experience.
 */
export function PerformanceIntelligenceAgent() {
  // i18n translations
  const { t } = useTranslation('agents');

  // Enforce client context for agency users
  useAgencyRouteGuard();

  // Set page title for GA4 tracking and accessibility
  usePageTitle('Performance Intelligence');

  // Permission check for this agent
  const { hasPermission, isLoading: permissionLoading, AccessDeniedComponent } = useAccessDenied(
    'agents.analytics.access',
    'Performance Intelligence Agent'
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
  const location = useLocation();
  const [selectedSession, setSelectedSession] = useState<PerformanceSession | null>(null);
  const [templatePrompt, setTemplatePrompt] = useState<string | undefined>(undefined);
  const [sessions, setSessions] = useState<any[]>([]);

  // Hide footer when in active chat mode (session selected)
  // Note: We don't set isAgentPage because this page uses scrollable dashboard layout
  useEffect(() => {
    agentLayout?.setHideFooter(!!selectedSession);
  }, [selectedSession, agentLayout]);

  // Load ROI dashboard metrics to determine if user has campaign data
  const { data: metrics, isLoading: metricsLoading } = useROIDashboardMetrics();
  const hasData = metrics && metrics.campaigns_tracked > 0;

  // Helper function to navigate to tools while preserving client context
  const navigateToTool = (toolPath: string) => {
    const toolUrl = clientSlug
      ? `/clients/${clientSlug}/performance-intelligence/tool/${toolPath}`
      : `/performance-intelligence/tool/${toolPath}`;
    navigate(toolUrl);
  };

  // Check for Quick Win Template on mount
  useEffect(() => {
    const templateStr = localStorage.getItem('quickWinTemplate');
    if (templateStr) {
      try {
        const template: QuickWinTemplate = JSON.parse(templateStr);
        // This agent handles quick-wins, roi-budget, and analytics templates
        if (template.agents.includes('quick-wins') || template.agents.includes('roi-budget') || template.agents.includes('analytics')) {
          setTemplatePrompt(template.prefilledPrompt);
          console.log('[PerformanceIntelligenceAgent] Loaded Quick Win Template:', template.title);
        }
        localStorage.removeItem('quickWinTemplate');
      } catch (error) {
        console.error('[PerformanceIntelligenceAgent] Error parsing template:', error);
        localStorage.removeItem('quickWinTemplate');
      }
    }
  }, []);

  // Check for cross-agent navigation with initialMessage
  useEffect(() => {
    const navigationInitialMessage = location.state?.initialMessage;
    if (navigationInitialMessage && typeof navigationInitialMessage === 'string') {
      console.log('[PerformanceIntelligenceAgent] Found initialMessage from cross-agent navigation:', navigationInitialMessage.substring(0, 100));
      setTemplatePrompt(navigationInitialMessage);
      // Clear the navigation state to prevent re-applying on future renders
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Load sessions for SessionHistorySheet
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const response = await api.get(`/api/v1/direct-agents/performance_intelligence/sessions`);
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
      if (!selectedSession || selectedSession.id !== sessionId) {
        loadSessionFromId(sessionId);
      }
    } else {
      setSelectedSession(null);
    }
  }, [sessionId]);

  const loadSessionFromId = async (id: string) => {
    try {
      const response = await api.get(`/api/v1/direct-agents/performance_intelligence/sessions`);
      const sessions = response.data.sessions;
      const session = sessions.find((s: PerformanceSession) => s.id === id);

      if (session) {
        setSelectedSession(session);
      } else {
        console.error('Session not found or access denied');
        // Preserve client context when navigating away
        navigate(buildAgentRootUrl('performance_intelligence', clientSlug));
      }
    } catch (error) {
      console.error('Error loading session:', error);
      // Preserve client context when navigating away
      navigate(buildAgentRootUrl('performance_intelligence', clientSlug));
    }
  };

  const handleSelectSession = (session: PerformanceSession) => {
    // Navigate to session URL when selecting a session, preserving client context
    navigate(buildAgentSessionUrl('performance_intelligence', session.id, clientSlug));
  };

  const handleCreateSession = () => {
    // Clear selected session and navigate back to root
    setSelectedSession(null);
    navigate(buildAgentRootUrl('performance_intelligence', clientSlug), { replace: true });
  };

  // Mobile session history (DRY pattern)
  const mobileHistory = useMobileSessionHistory({
    sessions,
    selectedSessionId: selectedSession?.id,
    onSessionSelect: handleSelectSession,
    onNewSession: handleCreateSession,
  });

  // Always show full landing page view with tools and chat at bottom
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-amber-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Session History Sheet - Mobile only (no sidebar for this agent) */}
      {mobileHistory.sheet}

      <div className="container mx-auto px-6 py-10">
        {/* Context Alert */}
        <ContextAlert />

        {/* Enhanced Header */}
        <div className="mb-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-slate-600 to-amber-600 shadow-xl">
              <LineChart className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="heading-display-md text-brand-charcoal dark:text-gray-100">
                {t('performance_intelligence.page.title')}
              </h1>
              <p className="text-lg text-brand-slate dark:text-gray-400 mt-2">
                {t('performance_intelligence.page.subtitle')}
              </p>
            </div>
            {/* Mobile history button */}
            {mobileHistory.button}
          </div>
        </div>

        {/* Dashboard Metrics or Empty State */}
        {metricsLoading ? (
          <Card className="p-12 text-center mb-8">
            <div className="flex items-center gap-3 justify-center">
              <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-lg text-brand-slate dark:text-gray-400">{t('performance_intelligence.page.dashboard.loading')}</p>
            </div>
          </Card>
        ) : hasData ? (
          <>
            {/* ROI Dashboard Metrics */}
            <ROIDashboardMetrics />

            {/* ROI Recommendations (LLM-powered insights) */}
            <ROIRecommendations />

            {/* Capability Cards - for users with data */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
              <Card className="p-5 hover:shadow-lg transition-all duration-200 border-2 hover:border-amber-200 dark:hover:border-slate-800">
                <div className="flex items-start gap-3">
                  <DollarSign className="w-6 h-6 text-amber-600 dark:text-amber-400 mt-1" />
                  <div>
                    <h3 className="font-semibold text-brand-charcoal dark:text-gray-100 mb-1">{t('performance_intelligence.page.dashboard.capabilities.roiAnalysis.title')}</h3>
                    <p className="text-sm text-brand-slate dark:text-gray-400">
                      {t('performance_intelligence.page.dashboard.capabilities.roiAnalysis.description')}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-5 hover:shadow-lg transition-all duration-200 border-2 hover:border-slate-200 dark:hover:border-slate-800">
                <div className="flex items-start gap-3">
                  <Zap className="w-6 h-6 text-amber-600 dark:text-amber-400 mt-1" />
                  <div>
                    <h3 className="font-semibold text-brand-charcoal dark:text-gray-100 mb-1">{t('performance_intelligence.page.dashboard.capabilities.quickWins.title')}</h3>
                    <p className="text-sm text-brand-slate dark:text-gray-400">
                      {t('performance_intelligence.page.dashboard.capabilities.quickWins.description')}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-5 hover:shadow-lg transition-all duration-200 border-2 hover:border-slate-200 dark:hover:border-slate-800">
                <div className="flex items-start gap-3">
                  <BarChart3 className="w-6 h-6 text-brand-slate dark:text-gray-400 mt-1" />
                  <div>
                    <h3 className="font-semibold text-brand-charcoal dark:text-gray-100 mb-1">{t('performance_intelligence.page.dashboard.capabilities.performanceAnalytics.title')}</h3>
                    <p className="text-sm text-brand-slate dark:text-gray-400">
                      {t('performance_intelligence.page.dashboard.capabilities.performanceAnalytics.description')}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-5 hover:shadow-lg transition-all duration-200 border-2 hover:border-amber-200 dark:hover:border-amber-800">
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-6 h-6 text-amber-600 dark:text-amber-400 mt-1" />
                  <div>
                    <h3 className="font-semibold text-brand-charcoal dark:text-gray-100 mb-1">{t('performance_intelligence.page.dashboard.capabilities.budgetOptimization.title')}</h3>
                    <p className="text-sm text-brand-slate dark:text-gray-400">
                      {t('performance_intelligence.page.dashboard.capabilities.budgetOptimization.description')}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </>
        ) : (
          // Empty State - No Campaign Data
          <Card className="p-8 text-center border-2 border-dashed border-gray-300 dark:border-gray-700 mb-8">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="heading-serif-lg mb-2">{t('performance_intelligence.page.dashboard.emptyState.title')}</h3>
            <p className="text-brand-slate dark:text-gray-400 mb-6 max-w-lg mx-auto">
              {t('performance_intelligence.page.dashboard.emptyState.description')}
            </p>
            <div className="flex gap-4 justify-center">
              <Button
                onClick={() => navigateToTool('upload-v2')}
                className="bg-gradient-to-r from-slate-600 to-amber-600 hover:from-slate-700 hover:to-amber-700"
              >
                <Upload className="mr-2 h-4 w-4" />
                {t('performance_intelligence.page.dashboard.emptyState.importCsv')}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigateToTool('manual-entry')}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                {t('performance_intelligence.page.dashboard.emptyState.manualEntry')}
              </Button>
            </div>
          </Card>
        )}

        {/* Performance Tools Grid - Mobile optimized */}
        <div className="mt-8">
          <h2 className="heading-serif-lg mb-4">{t('performance_intelligence.page.tools.title')}</h2>
          <p className="text-brand-slate dark:text-gray-400 mb-6">
            {t('performance_intelligence.page.tools.subtitle')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            <Card
              className="p-5 md:p-6 hover:shadow-xl transition-all duration-200 cursor-pointer border-2 hover:border-amber-300 dark:hover:border-slate-700"
              onClick={() => navigateToTool('upload-v2')}
            >
              <div className="flex items-start gap-3 md:gap-4">
                <div className="p-2 md:p-3 rounded-xl bg-amber-100 dark:bg-slate-900">
                  <Upload className="w-5 h-5 md:w-6 md:h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-base md:text-lg mb-1">{t('performance_intelligence.page.tools.importData.title')}</h3>
                  <p className="text-xs md:text-sm text-brand-slate dark:text-gray-400">
                    {t('performance_intelligence.page.tools.importData.description')}
                  </p>
                </div>
              </div>
            </Card>

            <Card
              className="p-5 md:p-6 hover:shadow-xl transition-all duration-200 cursor-pointer border-2 hover:border-slate-300 dark:hover:border-slate-700"
              onClick={() => navigateToTool('data-manager')}
            >
              <div className="flex items-start gap-3 md:gap-4">
                <div className="p-2 md:p-3 rounded-xl bg-slate-100 dark:bg-slate-900">
                  <Database className="w-5 h-5 md:w-6 md:h-6 text-brand-slate dark:text-gray-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-base md:text-lg mb-1">{t('performance_intelligence.page.tools.manageMetrics.title')}</h3>
                  <p className="text-xs md:text-sm text-brand-slate dark:text-gray-400">
                    {t('performance_intelligence.page.tools.manageMetrics.description')}
                  </p>
                </div>
              </div>
            </Card>

            <Card
              className="p-5 md:p-6 hover:shadow-xl transition-all duration-200 cursor-pointer border-2 hover:border-amber-300 dark:hover:border-amber-700"
              onClick={() => navigateToTool('charts')}
            >
              <div className="flex items-start gap-3 md:gap-4">
                <div className="p-2 md:p-3 rounded-xl bg-amber-100 dark:bg-amber-900">
                  <LineChart className="w-5 h-5 md:w-6 md:h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-base md:text-lg mb-1">{t('performance_intelligence.page.tools.historicalPerformance.title')}</h3>
                  <p className="text-xs md:text-sm text-brand-slate dark:text-gray-400">
                    {t('performance_intelligence.page.tools.historicalPerformance.description')}
                  </p>
                </div>
              </div>
            </Card>

            <Card
              className="p-5 md:p-6 hover:shadow-xl transition-all duration-200 cursor-pointer border-2 hover:border-green-300 dark:hover:border-green-700"
              onClick={() => navigateToTool('calculator')}
            >
              <div className="flex items-start gap-3 md:gap-4">
                <div className="p-2 md:p-3 rounded-xl bg-green-100 dark:bg-green-900">
                  <Calculator className="w-5 h-5 md:w-6 md:h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-base md:text-lg mb-1">{t('performance_intelligence.page.tools.roiCalculator.title')}</h3>
                  <p className="text-xs md:text-sm text-brand-slate dark:text-gray-400">
                    {t('performance_intelligence.page.tools.roiCalculator.description')}
                  </p>
                </div>
              </div>
            </Card>

            <Card
              className="p-5 md:p-6 hover:shadow-xl transition-all duration-200 cursor-pointer border-2 hover:border-amber-300 dark:hover:border-slate-700"
              onClick={() => navigateToTool('manual-entry')}
            >
              <div className="flex items-start gap-3 md:gap-4">
                <div className="p-2 md:p-3 rounded-xl bg-slate-100 dark:bg-slate-900">
                  <FileSpreadsheet className="w-5 h-5 md:w-6 md:h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-base md:text-lg mb-1">{t('performance_intelligence.page.tools.manualDataEntry.title')}</h3>
                  <p className="text-xs md:text-sm text-brand-slate dark:text-gray-400">
                    {t('performance_intelligence.page.tools.manualDataEntry.description')}
                  </p>
                </div>
              </div>
            </Card>

            <Card
              className="p-5 md:p-6 hover:shadow-xl transition-all duration-200 cursor-pointer border-2 hover:border-amber-300 dark:hover:border-amber-700"
              onClick={() => navigateToTool('budget-optimizer')}
            >
              <div className="flex items-start gap-3 md:gap-4">
                <div className="p-2 md:p-3 rounded-xl bg-amber-100 dark:bg-amber-900">
                  <Settings className="w-5 h-5 md:w-6 md:h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-base md:text-lg mb-1">{t('performance_intelligence.page.tools.budgetOptimizer.title')}</h3>
                  <p className="text-xs md:text-sm text-brand-slate dark:text-gray-400">
                    {t('performance_intelligence.page.tools.budgetOptimizer.description')}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* AI Chat - Collapsible */}
        <Card className="shadow-2xl border-2 border-gray-100 dark:border-gray-700 mt-8">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="heading-serif-md">{t('performance_intelligence.page.aiAssistant.title')}</h2>
            <p className="text-brand-slate dark:text-gray-400 mt-1">
              {hasData
                ? t('performance_intelligence.page.aiAssistant.hasData')
                : t('performance_intelligence.page.aiAssistant.noData')
              }
            </p>
          </div>
          <AgentChat
            agentType="performance_intelligence"
            agentName="Performance Intelligence"
            selectedSession={selectedSession}
            initialMessage={templatePrompt}
            onSessionCreated={(session: PerformanceSession) => {
              setSelectedSession(session);
              // Preserve client context when navigating to session
              navigate(buildAgentSessionUrl('performance_intelligence', session.id, clientSlug));
            }}
            disableInitialScroll={true}
          />
        </Card>
      </div>
    </div>
  );
}
