import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { extractToolParams } from '@/utils/wildcardRouteParams'
import { ContentChat } from '@/components/agents/ContentChat'
import { ContentToolChat } from '@/components/content/ContentToolChat'
import { ContentToolGrid } from '@/components/content/ContentToolGrid'
import { ContentSidebar } from '@/components/content/ContentSidebar'
import { useMobileSessionHistory } from '@/components/agents/MobileSessionHistory'
import ContentIntelligentDisplay from '@/components/content/ContentIntelligentDisplay'
import { ContentRecommendations } from '@/components/content/ContentRecommendations'
import { useContentRecommendations } from '@/hooks/useContentRecommendations'
import { useBusinessContext } from '@/hooks/useBusinessContext'
import { api } from '@/lib/api'
import { PenTool, FileText, Share2, Palette, Search, TrendingUp, Target, Sparkles, ArrowRight, BookOpen, Users, MessageSquare, Mail, Calendar, ExternalLink } from 'lucide-react'
import { AgentTabs } from '@/components/agents/AgentTabs'
import { ContentListView } from '@/components/content/ContentListView'
import { useAgentOutputs, useArchiveOutput, useRestoreOutput, useOutputsHub } from '@/hooks/data/useAgentOutputs'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ContextAlert } from '@/components/agents/ContextAlert'
import { supabase } from '@/lib/supabase'
import type { QuickWinTemplate } from '@/components/onboarding/QuickWinTemplates'
import { useAgencyRouteGuard } from '@/hooks/useAgencyRouteGuard'
import { useClientContext } from '@/contexts/ClientContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import { buildContextAwareUrl, buildAgentSessionUrl, buildAgentRootUrl } from '@/utils/multiTenantRouting'
import { ROUTES } from '@/config/routes'
import { useAgentLayout } from '@/contexts/AgentLayoutContext'
import { useAccessDenied } from '@/components/auth/AccessDenied'

interface ContentSession {
  id: string;
  created_at: string;
  updated_at?: string;
  session_title?: string | null;
  message_count?: number;
  first_message?: string;
}

export function ContentAgent() {
  // i18n translations
  const { t } = useTranslation('agents');

  // Enforce client context for agency users
  useAgencyRouteGuard();

  // Set page title for GA4 tracking and accessibility
  usePageTitle('Content Agent');

  // Permission check for this agent
  const { hasPermission, isLoading: permissionLoading, AccessDeniedComponent } = useAccessDenied(
    'agents.content.access',
    'Content Agent'
  );

  // Show access denied if user lacks permission
  if (!permissionLoading && !hasPermission) {
    return AccessDeniedComponent;
  }

  const params = useParams<{ '*': string }>();
  const { tool, sessionId } = extractToolParams(params['*']);
  const { clientSlug } = useClientContext(); // Get client context from provider
  const agentLayout = useAgentLayout();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedSession, setSelectedSession] = useState<ContentSession | null>(null);
  const [recommendationsCollapsed, setRecommendationsCollapsed] = useState(false);
  const [templatePrompt, setTemplatePrompt] = useState<string | undefined>(undefined);
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>('generate');

  // ✅ FIX: Use client-scoped outputs for Agency users
  const { data: outputsHubData } = useOutputsHub({ clientSlug: clientSlug ?? undefined });
  const clientOutputs = outputsHubData?.agent_outputs || [];

  // Fetch content outputs for list view
  const { data: contentOutputs = [], isLoading: contentLoading } = useAgentOutputs({
    agentType: 'content',
    includeArchived: false,
  });
  const archiveContent = useArchiveOutput();
  const restoreContent = useRestoreOutput();

  // ✅ Calculate client-specific stats for Agency users
  const clientStats = {
    has_strategy: clientOutputs.some(o => o.agent_type === 'strategy' || o.agent_type === 'marketing_strategy'),
    has_personas: clientOutputs.some(o => o.agent_type === 'persona'),
    content_count: clientOutputs.filter(o => o.agent_type === 'content').length,
    recommendations_count: clientOutputs.length // Total intelligence outputs
  };

  // Set agent page mode only when in tool/chat mode (needs fixed-height layout)
  // Landing page (!tool) should scroll freely
  useEffect(() => {
    agentLayout?.setIsAgentPage(!!tool);
    return () => agentLayout?.setIsAgentPage(false);
  }, [agentLayout, tool]);

  // Hide footer when in active chat mode (session selected)
  useEffect(() => {
    agentLayout?.setHideFooter(!!selectedSession);
  }, [selectedSession, agentLayout]);

  // Check for Quick Win Template
  useEffect(() => {
    const templateStr = localStorage.getItem('quickWinTemplate');
    if (templateStr) {
      try {
        const template: QuickWinTemplate = JSON.parse(templateStr);
        if (template.agents.includes('content')) {
          setTemplatePrompt(template.prefilledPrompt);
          console.log('[ContentAgent] Loaded Quick Win Template:', template.title);
        }
        localStorage.removeItem('quickWinTemplate');
      } catch (error) {
        console.error('[ContentAgent] Error parsing template:', error);
        localStorage.removeItem('quickWinTemplate');
      }
    }
  }, []);

  // Check for cross-agent navigation with initialMessage
  useEffect(() => {
    const navigationInitialMessage = location.state?.initialMessage;
    if (navigationInitialMessage && typeof navigationInitialMessage === 'string') {
      console.log('[ContentAgent] Found initialMessage from cross-agent navigation:', navigationInitialMessage.substring(0, 100));
      setTemplatePrompt(navigationInitialMessage);
      // Clear the navigation state to prevent re-applying on future renders
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Content generation is now handled by ContentToolChat component

  // Note: Agent outputs will be accessed via /outputs page navigation

  // ✅ FIX: Pass clientSlug to hooks for client-scoped recommendations (Agency users)
  const { data: recommendationsData, isLoading: recommendationsLoading } = useContentRecommendations({ clientSlug: clientSlug ?? undefined });
  const { data: businessContext } = useBusinessContext({ clientSlug: clientSlug ?? undefined });

  // Extract session context from URL or navigation state
  const urlParams = new URLSearchParams(location.search);
  const fromSessionId = urlParams.get('fromSession');
  const navigationState = location.state as any;

  // Load sessions for SessionHistorySheet
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const response = await api.get(`/api/v1/direct-agents/content/sessions`);
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
      // Only load if we don't already have this session selected
      if (!selectedSession || selectedSession.id !== sessionId) {
        loadSessionFromId(sessionId);
      }
    } else {
      setSelectedSession(null);
    }
  }, [sessionId]);

  // Database-First: No need to fetch data separately - hooks handle it

  const loadSessionFromId = async (id: string) => {
    try {
      // Database-First: Use routed function for schema-aware session loading
      // Routes to agency.agent_conversations for Agency, public.agent_conversations for SME
      const { data: sessions, error } = await supabase.rpc('get_session_routed', {
        p_session_id: id
      });

      if (error || !sessions || sessions.length === 0) {
        console.error('Session not found or access denied:', error);
        navigate(ROUTES.agents.content.root);
        return;
      }

      // Verify session is for content agent
      const session = sessions[0];
      if (session.agent_type !== 'content') {
        console.error('Invalid agent type for content session');
        navigate(ROUTES.agents.content.root);
        return;
      }

      setSelectedSession(session as ContentSession);
    } catch (error) {
      console.error('Error loading session:', error);
      navigate(ROUTES.agents.content.root);
    }
  };

  const handleSelectSession = (session: ContentSession) => {
    // Navigate to session URL using agent_type from session for cross-agent routing
    const agentType = (session as any).agent_type || 'content';
    navigate(buildAgentSessionUrl(agentType, session.id, clientSlug));
  };

  const handleCreateSession = () => {
    // Clear selected session FIRST to prevent useEffect from trying to reload deleted session
    setSelectedSession(null);

    // Navigate back to base content URL for new session, preserving client context
    // Use replace: true to prevent race conditions with session deletion/archiving
    navigate(buildAgentRootUrl('content', clientSlug), { replace: true });
  };

  // Database-First: Data is available directly from hooks
  // Strategy and persona data will be accessed via URL navigation to /outputs page


  const handleOpenStrategy = () => {
    console.log('[ContentAgent] Navigating to strategy outputs');
    // Preserve client context when navigating to outputs
    navigate(buildContextAwareUrl('/outputs?agent=marketing_strategy', clientSlug) || '/outputs?agent=marketing_strategy');
  };

  const handleOpenPersona = () => {
    console.log('[ContentAgent] Navigating to persona outputs');
    // Preserve client context when navigating to outputs
    navigate(buildContextAwareUrl('/outputs?agent=persona', clientSlug) || '/outputs?agent=persona');
  };

  const handleSelectContent = (content: any) => {
    console.log('[ContentAgent] Selected content:', content);
    setActiveTab('generate');
    // Could navigate to view the content in detail or show in a modal
  };

  const handleCopyContent = async (contentId: string) => {
    const content = contentOutputs.find((c) => c.id === contentId);
    if (!content) return;

    try {
      const textToCopy = JSON.stringify(content.content, null, 2);
      await navigator.clipboard.writeText(textToCopy);
      toast.success('Content copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy content');
    }
  };

  const handleArchiveContent = async (contentId: string) => {
    await archiveContent.mutateAsync({
      id: contentId,
      reason: 'Archived from content list',
    });
  };

  const handleRestoreContent = async (contentId: string) => {
    await restoreContent.mutateAsync({ id: contentId });
  };

  const handleCreateNewContent = () => {
    setActiveTab('generate');
    // Optionally scroll to chat input
  };

  // Mobile session history (DRY pattern)
  const mobileHistory = useMobileSessionHistory({
    sessions,
    selectedSessionId: selectedSession?.id,
    onSessionSelect: handleSelectSession,
    onNewSession: handleCreateSession,
  });

  // Show tool selection if no tool is selected
  if (!tool) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-6 py-10">
          {/* Enhanced Header */}
          <div className="mb-10">
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
              <div className="p-2.5 md:p-3 rounded-2xl bg-gradient-to-br from-slate-600 to-amber-600 shadow-xl">
                <PenTool className="w-7 h-7 md:w-8 md:h-8 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl md:text-4xl font-bold text-brand-charcoal dark:text-gray-100">
                  {t('content.page.title')}
                </h1>
                <p className="text-base md:text-lg text-brand-slate dark:text-gray-400 mt-2">
                  {t('content.page.subtitle')}
                </p>
              </div>
            </div>
          </div>

          {/* AI-Powered Content Strategy Section - Always Show */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="h-6 w-6 text-amber-500" />
              <h2 className="heading-serif-lg">{t('content.page.strategy.title')}</h2>
            </div>

            <p className="text-brand-slate dark:text-gray-400 mb-6">
              {t('content.page.strategy.subtitle')}
            </p>

            {/* Statistics Cards - Client-Scoped for Agency Users */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card
                className={`p-4 text-center ${clientStats.has_strategy ? 'cursor-pointer hover:shadow-md hover:border-amber-300 transition-all group' : ''}`}
                onClick={clientStats.has_strategy ? handleOpenStrategy : undefined}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Target className="h-5 w-5 text-brand-gold" />
                  <div className="text-2xl font-bold">
                    {clientStats.has_strategy ? '✓' : '0'}
                  </div>
                  {clientStats.has_strategy && (
                    <ExternalLink className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
                <p className="text-sm text-brand-slate dark:text-gray-400">{t('content.page.stats.strategy')}</p>
              </Card>

              <Card
                className={`p-4 text-center ${clientStats.has_personas ? 'cursor-pointer hover:shadow-md hover:border-amber-300 transition-all group' : ''}`}
                onClick={clientStats.has_personas ? handleOpenPersona : undefined}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Users className="h-5 w-5 text-amber-500" />
                  <div className="text-2xl font-bold">
                    {clientStats.has_personas ? '✓' : '0'}
                  </div>
                  {clientStats.has_personas && (
                    <ExternalLink className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
                <p className="text-sm text-brand-slate dark:text-gray-400">{t('content.page.stats.personas')}</p>
              </Card>

              <Card
                className="p-4 text-center cursor-pointer hover:shadow-md hover:border-green-300 transition-all group"
                onClick={() => navigate(buildContextAwareUrl('/outputs?agent=content&user=current', clientSlug) || '/outputs?agent=content&user=current')}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <FileText className="h-5 w-5 text-green-500" />
                  <div className="text-2xl font-bold">
                    {clientStats.content_count}
                  </div>
                  <ExternalLink className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-sm text-brand-slate dark:text-gray-400">{t('content.page.stats.contentCreated')}</p>
              </Card>

              <Card className="p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-orange-500" />
                  <div className="text-2xl font-bold">
                    {clientStats.recommendations_count}
                  </div>
                </div>
                <p className="text-sm text-brand-slate dark:text-gray-400">{t('content.page.stats.recommendations')}</p>
              </Card>
            </div>

            {/* Content Recommendations - Now client-aware via useBusinessContext({ clientSlug }) */}
            {recommendationsData?.needs_setup && clientStats.recommendations_count === 0 ? (
              <ContentRecommendations
                needsSetup={true}
                setupMessage={recommendationsData.message}
                nextAction={buildContextAwareUrl(recommendationsData.next_action, clientSlug)}
                isLoading={recommendationsLoading}
                businessContext={businessContext || undefined}
              />
            ) : recommendationsData?.needs_clarification ? (
              <ContentRecommendations
                needsClarification={true}
                clarificationQuestions={recommendationsData.clarification_questions}
                setupMessage={recommendationsData.message}
                isLoading={recommendationsLoading}
                businessContext={businessContext || undefined}
                onAnswerClarification={(answers) => {
                  console.log('Clarification answers:', answers);
                  // TODO: Implement handler to submit answers and regenerate recommendations
                }}
              />
            ) : (
              <ContentRecommendations
                recommendations={recommendationsData?.recommendations || []}
                confidence={recommendationsData?.confidence}
                isLoading={recommendationsLoading}
                businessContext={businessContext || undefined}
                collapsed={recommendationsCollapsed}
                onToggleCollapse={() => setRecommendationsCollapsed(!recommendationsCollapsed)}
              />
            )}
          </div>

          {/* Content Intelligence Display - Only show for returning users */}
          {!recommendationsData?.needs_setup && recommendationsData?.context_summary?.has_strategy && (
            <div className="mb-8">
              <ContentIntelligentDisplay />
            </div>
          )}

          {/* Content Creation Tools Grid */}
          <div className="mb-8">
            <ContentToolGrid />
          </div>

          {/* Legacy Tool Cards - Hidden */}
          <div className="tool-grid grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 hidden">
            {/* SEO Blog Post Generator */}
            <Card className="relative overflow-hidden hover:shadow-2xl transition-all duration-300 border-2 hover:border-green-300 cursor-pointer group"
                  onClick={() => navigate(ROUTES.agents.content.tool('seo-blog'))}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-100 to-teal-100 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform" />
              <CardHeader className="relative">
                <div className="flex items-start justify-between">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-teal-500 rounded-xl text-white">
                    <Search className="h-6 w-6" />
                  </div>
                  <Badge className="bg-green-100 text-green-700">Popular</Badge>
                </div>
                <CardTitle className="mt-4 text-xl">SEO Blog Post Generator</CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <p className="text-brand-slate dark:text-gray-400 mb-4">
                  Create comprehensive, SEO-optimized blog posts with keyword integration and competitive analysis
                </p>
                <ul className="space-y-2 text-sm text-gray-500">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    Keyword research & optimization
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    Meta descriptions & headers
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    Internal linking suggestions
                  </li>
                </ul>
                <Button className="w-full mt-6 group-hover:bg-green-600" variant="default">
                  Start Creating <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            {/* Thought Leadership Creator */}
            <Card className="relative overflow-hidden hover:shadow-2xl transition-all duration-300 border-2 hover:border-amber-300 cursor-pointer group"
                  onClick={() => navigate(ROUTES.agents.content.tool('thought-leadership'))}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-slate-100 to-amber-100 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform" />
              <CardHeader className="relative">
                <div className="flex items-start justify-between">
                  <div className="p-3 bg-gradient-to-br from-slate-600 to-amber-600 rounded-xl text-white">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <Badge className="bg-slate-100 text-slate-700">Premium</Badge>
                </div>
                <CardTitle className="mt-4 text-xl">Thought Leadership Creator</CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <p className="text-brand-slate dark:text-gray-400 mb-4">
                  Build authority with multi-part content series that position you as an industry expert
                </p>
                <ul className="space-y-2 text-sm text-gray-500">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-slate-500 rounded-full" />
                    Multi-part series planning
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-slate-500 rounded-full" />
                    Expert positioning frameworks
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-slate-500 rounded-full" />
                    Industry insights integration
                  </li>
                </ul>
                <Button className="w-full mt-6 group-hover:bg-amber-600" variant="default">
                  Build Authority <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            {/* USP-Focused Content */}
            <Card className="relative overflow-hidden hover:shadow-2xl transition-all duration-300 border-2 hover:border-amber-300 cursor-pointer group"
                  onClick={() => navigate(ROUTES.agents.content.tool('usp-content'))}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-100 to-amber-50 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform" />
              <CardHeader className="relative">
                <div className="flex items-start justify-between">
                  <div className="p-3 bg-gradient-to-br from-brand-gold to-amber-400 rounded-xl text-white">
                    <Target className="h-6 w-6" />
                  </div>
                  <Badge className="bg-amber-100 text-amber-700">Strategic</Badge>
                </div>
                <CardTitle className="mt-4 text-xl">USP-Focused Content</CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <p className="text-brand-slate dark:text-gray-400 mb-4">
                  Highlight your unique differentiators with content that sets you apart from competitors
                </p>
                <ul className="space-y-2 text-sm text-gray-500">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-brand-gold rounded-full" />
                    Differentiation messaging
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-brand-gold rounded-full" />
                    Competitive positioning
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-brand-gold rounded-full" />
                    Value proposition clarity
                  </li>
                </ul>
                <Button className="w-full mt-6 group-hover:bg-amber-600" variant="default">
                  Stand Out <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            {/* Email Drip Campaign Designer */}
            <Card className="relative overflow-hidden hover:shadow-2xl transition-all duration-300 border-2 hover:border-amber-300 cursor-pointer group"
                  onClick={() => navigate(ROUTES.agents.content.tool('email-drip'))}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-100 to-amber-50 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform" />
              <CardHeader className="relative">
                <div className="flex items-start justify-between">
                  <div className="p-3 bg-gradient-to-br from-brand-gold to-amber-600 rounded-xl text-white">
                    <Mail className="h-6 w-6" />
                  </div>
                  <Badge className="bg-amber-100 text-amber-700">Automated</Badge>
                </div>
                <CardTitle className="mt-4 text-xl">Email Drip Campaign Designer</CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <p className="text-brand-slate dark:text-gray-400 mb-4">
                  Design automated email sequences that nurture leads and drive conversions
                </p>
                <ul className="space-y-2 text-sm text-gray-500">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-brand-gold rounded-full" />
                    Multi-step sequence builder
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-brand-gold rounded-full" />
                    Personalization tokens
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-brand-gold rounded-full" />
                    Timing optimization
                  </li>
                </ul>
                <Button className="w-full mt-6 group-hover:bg-amber-600" variant="default">
                  Build Campaign <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            {/* Social Media Calendar */}
            <Card className="relative overflow-hidden hover:shadow-2xl transition-all duration-300 border-2 hover:border-orange-300 cursor-pointer group"
                  onClick={() => navigate(ROUTES.agents.content.tool('social-calendar'))}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-100 to-red-100 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform" />
              <CardHeader className="relative">
                <div className="flex items-start justify-between">
                  <div className="p-3 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl text-white">
                    <Calendar className="h-6 w-6" />
                  </div>
                  <Badge className="bg-orange-100 text-orange-700">Scheduled</Badge>
                </div>
                <CardTitle className="mt-4 text-xl">Social Media Calendar</CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <p className="text-brand-slate dark:text-gray-400 mb-4">
                  Plan and schedule social media content across all platforms
                </p>
                <ul className="space-y-2 text-sm text-gray-500">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                    Multi-platform optimization
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                    Visual content calendar
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                    Best time scheduling
                  </li>
                </ul>
                <Button className="w-full mt-6 group-hover:bg-orange-600" variant="default">
                  Plan Content <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Quick Start Section */}
          <Card className="border-2 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Sparkles className="h-6 w-6 text-yellow-500" />
                <CardTitle>{t('content.page.quickStart.title')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-brand-slate dark:text-gray-400 mb-4">
                {t('content.page.quickStart.description')}
              </p>
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate(buildContextAwareUrl('/content/tool/chat', clientSlug) || ROUTES.agents.content.tool('chat'))}
                className="w-full md:w-auto"
              >
                <MessageSquare className="mr-2 h-5 w-5" />
                {t('content.page.actions.startChat')}
              </Button>
            </CardContent>
          </Card>

          {/* Feature Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="flex items-start gap-3">
              <BookOpen className="h-6 w-6 text-green-600 mt-1" />
              <div>
                <h3 className="font-semibold mb-1">{t('content.page.features.research.title')}</h3>
                <p className="text-sm text-brand-slate dark:text-gray-400">
                  {t('content.page.features.research.description')}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Users className="h-6 w-6 text-amber-600 mt-1" />
              <div>
                <h3 className="font-semibold mb-1">{t('content.page.features.audience.title')}</h3>
                <p className="text-sm text-brand-slate dark:text-gray-400">
                  {t('content.page.features.audience.description')}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Palette className="h-6 w-6 text-brand-gold mt-1" />
              <div>
                <h3 className="font-semibold mb-1">{t('content.page.features.brand.title')}</h3>
                <p className="text-sm text-brand-slate dark:text-gray-400">
                  {t('content.page.features.brand.description')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      </>
    );
  }

  // Tool-specific interface with sidebar
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="flex flex-col md:flex-row">
        {/* Content Sidebar - Desktop only */}
        <div className="hidden md:block">
          <ContentSidebar
            onSelectSession={handleSelectSession}
            onCreateSession={handleCreateSession}
            selectedSessionId={selectedSession?.id}
          />
        </div>

        {/* Session History Sheet - Mobile only */}
        {mobileHistory.sheet}

        {/* Main Content */}
        <div className="flex-1">
          <div className="container mx-auto px-6 py-10 h-full flex flex-col">
            {/* Context Alert */}
            <ContextAlert />
            
            {/* Enhanced Header */}
            <div className="mb-10">
              <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                <div className="p-2.5 md:p-3 rounded-2xl bg-gradient-to-br from-slate-600 to-amber-600 shadow-xl">
                  <PenTool className="w-7 h-7 md:w-8 md:h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h1 className="text-3xl md:text-4xl font-bold text-brand-charcoal dark:text-gray-100">
                    {t('content.page.title')}
                  </h1>
                  <p className="text-base md:text-lg text-brand-slate dark:text-gray-400 mt-2">
                    {selectedSession
                      ? `Session: ${selectedSession.session_title || t('content.page.defaultSessionTitle')}`
                      : tool === 'seo-blog' ? t('content.page.tools.seoBlog')
                      : tool === 'thought-leadership' ? t('content.page.tools.thoughtLeadership')
                      : tool === 'usp-content' ? t('content.page.tools.uspContent')
                      : tool === 'email-drip' ? t('content.page.tools.emailDrip')
                      : tool === 'social-calendar' ? t('content.page.tools.socialCalendar')
                      : tool === 'chat' ? t('content.page.tools.chat')
                      : t('content.page.subtitle')
                    }
                  </p>
                </div>
                {tool && !selectedSession && (
                  <Button
                    variant="outline"
                    onClick={() => navigate(buildAgentRootUrl('content', clientSlug))}
                  >
                    {t('content.page.actions.changeTool')}
                  </Button>
                )}
                {selectedSession && (
                  <button
                    onClick={() => setSelectedSession(null)}
                    className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    {t('content.page.actions.newSession')}
                  </button>
                )}
              </div>
              
              {/* Feature Cards - Only show when not in session mode or tool mode */}
              {!selectedSession && !tool && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                  <Card className="p-5 hover:shadow-lg transition-all duration-200 border-2 hover:border-green-200 dark:hover:border-green-800">
                    <div className="flex items-start gap-3">
                      <FileText className="w-6 h-6 text-green-600 dark:text-green-400 mt-1" />
                      <div>
                        <h3 className="font-semibold text-brand-charcoal dark:text-gray-100 mb-1">{t('content.page.features.multiFormat.title')}</h3>
                        <p className="text-sm text-brand-slate dark:text-gray-400">
                          {t('content.page.features.multiFormat.description')}
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-5 hover:shadow-lg transition-all duration-200 border-2 hover:border-teal-200 dark:hover:border-teal-800">
                    <div className="flex items-start gap-3">
                      <Share2 className="w-6 h-6 text-teal-600 dark:text-teal-400 mt-1" />
                      <div>
                        <h3 className="font-semibold text-brand-charcoal dark:text-gray-100 mb-1">{t('content.page.features.platform.title')}</h3>
                        <p className="text-sm text-brand-slate dark:text-gray-400">
                          {t('content.page.features.platform.description')}
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-5 hover:shadow-lg transition-all duration-200 border-2 hover:border-emerald-200 dark:hover:border-emerald-800">
                    <div className="flex items-start gap-3">
                      <Palette className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mt-1" />
                      <div>
                        <h3 className="font-semibold text-brand-charcoal dark:text-gray-100 mb-1">{t('content.page.features.brandVoice.title')}</h3>
                        <p className="text-sm text-brand-slate dark:text-gray-400">
                          {t('content.page.features.brandVoice.description')}
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              )}
            </div>

            {/* Mobile Tabs (hidden on desktop) */}
            <AgentTabs
              tabs={[
                {
                  id: 'generate',
                  label: t('content.page.tabs.generate'),
                  icon: MessageSquare,
                },
                {
                  id: 'list',
                  label: t('content.page.tabs.myContent'),
                  count: contentOutputs.length,
                  icon: FileText,
                },
              ]}
              activeTab={activeTab}
              onChange={setActiveTab}
              trailingAction={mobileHistory.button}
            />

            {activeTab === 'generate' ? (
              <>
                {/* REMOVED: Old USP-specific implementation - now handled by ContentToolChat component below */}

                {/* Chat Component - extends to edges on mobile */}
                <Card className="flex-1 min-h-0 shadow-2xl border-x-0 md:border-x-2 border-b-0 md:border-b-2 border-gray-100 dark:border-gray-700 overflow-hidden rounded-none md:rounded-xl">
                  {tool ? (
                    <ContentToolChat
                  selectedSession={selectedSession}
                  navigationState={location.state}
                  onSessionCreated={(session: any) => {
                    setSelectedSession(session);
                    const toolSessionRoute = buildContextAwareUrl(`/content/tool/${tool}/session/${session.id}`, clientSlug) || ROUTES.agents.content.toolSession(tool, session.id);
                    console.log('[ContentAgent] Session created, navigating to:', toolSessionRoute);
                    navigate(toolSessionRoute);
                  }}
                />
              ) : (
                <ContentChat
                  fromSessionId={fromSessionId}
                  navigationState={navigationState}
                  selectedSession={selectedSession}
                  initialMessage={templatePrompt}
                  onSessionCreated={(session: any) => {
                    setSelectedSession(session);
                    const sessionRoute = buildAgentSessionUrl('content', session.id, clientSlug);
                    console.log('[ContentAgent] Session created, navigating to:', sessionRoute);
                    navigate(sessionRoute);
                  }}
                />
              )}
            </Card>
          </>
        ) : (
          <div className="md:hidden">
            <ContentListView
              contents={contentOutputs}
              isLoading={contentLoading}
              onSelectContent={handleSelectContent}
              onCopyContent={handleCopyContent}
              onArchiveContent={handleArchiveContent}
              onRestoreContent={handleRestoreContent}
              onCreateContent={handleCreateNewContent}
            />
          </div>
        )}
          </div>
        </div>
      </div>

    </div>
  );
}