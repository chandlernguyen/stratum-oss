import { useState, useEffect } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { extractModeParams } from '@/utils/wildcardRouteParams';
import { MarketingStrategyChat } from '@/components/agents/MarketingStrategyChat';
import { MarketingStrategySidebar } from '@/components/marketing-strategy/MarketingStrategySidebar';
import { useMobileSessionHistory } from '@/components/agents/MobileSessionHistory';
import { IntelligentContextDisplay } from '@/components/marketing-strategy/IntelligentContextDisplayV2';
import { AgentTabs } from '@/components/agents/AgentTabs';
import { MarketingStrategyListView } from '@/components/marketing-strategy/MarketingStrategyListView';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Target,
  DollarSign,
  Sparkles,
  Rocket,
  MessageSquare,
  CheckCircle,
  TrendingUp,
  Globe,
  MessageSquarePlus
} from 'lucide-react';
// import { supabase } from '@/lib/supabase'; // Removed - using React Query hooks
import { api } from '@/lib/api';
import { useOrganization } from '@/hooks/data/useOrganization';
import { useCampaign } from '@/hooks/data/useCampaigns';
import { useMarketingStrategies } from '@/hooks/data/useMarketingStrategies';
import { usePersonas } from '@/hooks/data/usePersonas';
import { useActiveCampaigns } from '@/hooks/data/useCampaigns';
import { useAIInsights } from '@/hooks/data/useBusinessIntelligence'; // Database-first approach for insights
import { useAgencyRouteGuard } from '@/hooks/useAgencyRouteGuard';
import { useClientContext } from '@/contexts/ClientContext';
import { useClientBySlug } from '@/hooks/data/useClients';
import { usePageTitle } from '@/hooks/usePageTitle';
import { buildAgentRootUrl, buildAgentSessionUrl } from '@/utils/multiTenantRouting';
import { ROUTES } from '@/config/routes';
import { useAgentLayout } from '@/contexts/AgentLayoutContext';
import { useAccessDenied } from '@/components/auth/AccessDenied';
import { getIntlLocale } from '@/lib/locales';

export default function MarketingStrategyPage() {
  // i18n translations
  const { t, i18n } = useTranslation('agents');
  const intlLocale = getIntlLocale(i18n.language);

  // Enforce client context for agency users
  useAgencyRouteGuard();

  // Set page title for GA4 tracking and accessibility
  usePageTitle('Marketing Strategy');

  // Permission check for this agent (uses same permission as Business Strategy)
  const { hasPermission, isLoading: permissionLoading, AccessDeniedComponent } = useAccessDenied(
    'agents.strategy.access',
    'Marketing Strategy Agent'
  );

  // Show access denied if user lacks permission
  if (!permissionLoading && !hasPermission) {
    return AccessDeniedComponent;
  }

  // Hide footer when in active session for cleaner chat experience
  const agentLayout = useAgentLayout();

  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams<{ '*': string }>();
  const modeParams = extractModeParams(params['*']);
  const mode = modeParams.mode as 'quick' | 'guided' | 'advanced' | 'chat' | undefined;
  const sessionId = modeParams.sessionId;
  // campaignId is only passed via location.state, not URL params
  const campaignId = undefined;
  const { clientSlug } = useClientContext(); // Get client context from provider
  const { data: client } = useClientBySlug(clientSlug || undefined); // Get client data for agency context
  const { organization } = useOrganization();
  const { data: currentCampaign } = useCampaign(campaignId);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [campaignData, setCampaignData] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);

  // Use new data hooks
  const { data: existingPersonas = [] } = usePersonas({
    includeArchived: false
  });
  const { data: existingStrategies = [] } = useMarketingStrategies({
    includeArchived: false
  });
  const { data: activeCampaigns = [] } = useActiveCampaigns();
  // Database-first approach: Use existing useAIInsights hook instead of API call
  const { data: aiInsights = [] } = useAIInsights(undefined, client?.id);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [businessIntelligence, setBusinessIntelligence] = useState<any>(null);
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [activeStrategy, setActiveStrategy] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('chat'); // Tab state: 'chat' or 'list'

  useEffect(() => {
    if (organization?.id) {
      setOrganizationId(organization.id);
      loadBusinessIntelligence();
      loadRecentSessions();
    }
  }, [organization?.id, client?.id, aiInsights]); // Reload when client changes (for agency context) or insights update

  // Update active strategy when strategies change
  useEffect(() => {
    if (existingStrategies.length > 0) {
      setActiveStrategy(existingStrategies[0]); // Use most recent strategy
    }
  }, [existingStrategies]);

  // Hide footer and enable agent page mode when in chat mode or active session
  // isAgentPage removes the pb-16 padding from main, so we handle bottom nav in height calculation
  useEffect(() => {
    const isInChatMode = mode === 'chat' || !!selectedSession;
    agentLayout?.setHideFooter(isInChatMode);
    agentLayout?.setIsAgentPage(isInChatMode);
    return () => agentLayout?.setIsAgentPage(false);
  }, [mode, selectedSession, agentLayout]);

  // Use campaign from activeCampaigns hook
  useEffect(() => {
    if (activeCampaigns.length > 0 && !campaignData) {
      setCampaignData(activeCampaigns[0]);
    }
  }, [activeCampaigns, campaignData]);

  // Load session from URL if sessionId is present
  useEffect(() => {
    if (sessionId && organization?.id) {
      // Only load if we don't already have this session selected
      if (!selectedSession || selectedSession.id !== sessionId) {
        loadSessionFromId(sessionId);
      }
    }
  }, [sessionId, organization?.id]);

  // Handle campaign from navigation state or workspace context
  useEffect(() => {
    // Check if we have a campaign ID from navigation state
    const stateCampaignId = location.state?.campaignId;

    if (stateCampaignId && currentCampaign?.id === stateCampaignId) {
      // Use campaign from workspace context if IDs match
      setCampaignData(currentCampaign);
    } else if (currentCampaign) {
      // Use campaign from workspace context
      setCampaignData(currentCampaign);
    }
  }, [location.state, currentCampaign]);

  const loadRecentSessions = async () => {
    try {
      console.log('Loading recent marketing strategy sessions...');
      const response = await api.get('/api/v1/direct-agents/marketing_strategy/sessions');
      console.log('Sessions response:', response.data);
      if (response.data.sessions && response.data.sessions.length > 0) {
        // Set all sessions for SessionHistorySheet
        setSessions(response.data.sessions || []);
        // Only show the 3 most recent sessions on the landing page
        const sessions = response.data.sessions.slice(0, 3);
        console.log('Setting recent sessions:', sessions);
        setRecentSessions(sessions);
      }
    } catch (error) {
      console.error('Error loading recent sessions:', error);
      setSessions([]);
    }
  };

  // loadActiveStrategy removed - handled in useEffect

  const loadSessionFromId = async (id: string, retryCount = 0) => {
    try {
      // Load session through the API to ensure proper access control
      const response = await api.get('/api/v1/direct-agents/marketing_strategy/sessions');
      const sessions = response.data.sessions;
      
      // Find the specific session
      const session = sessions.find((s: any) => s.id === id);
      
      if (session) {
        setSelectedSession(session);
      } else if (retryCount < 2) {
        // Retry after a short delay - session might still be propagating
        console.log('Session not found, retrying...');
        setTimeout(() => {
          loadSessionFromId(id, retryCount + 1);
        }, 1000);
      } else {
        // If session not found after retries, clear selection
        console.error('Session not found or access denied after retries');
        setSelectedSession(null);
      }
    } catch (error) {
      console.error('Error loading session:', error);
      if (retryCount < 2) {
        // Retry on error
        setTimeout(() => {
          loadSessionFromId(id, retryCount + 1);
        }, 1000);
      } else {
        setSelectedSession(null);
      }
    }
  };

  // loadUserContext removed - data loading now handled by React Query hooks

  const loadBusinessIntelligence = async () => {
    try {
      // Use existing API endpoint to get business intelligence
      // Pass client_id for agency users viewing client context
      const params = client?.id ? { client_id: client.id } : {};
      console.log('[MarketingStrategyPage] Calling API with params:', params);
      const response = await api.get('/api/v1/business-intelligence/', { params });
      const businessData = response.data;

      // ✅ Database-first approach: Use aiInsights from useAIInsights hook (no API call)
      // aiInsights is already filtered by client_id via hook parameter
      console.log('[MarketingStrategyPage] loadBusinessIntelligence - aiInsights count:', aiInsights?.length || 0);
      console.log('[MarketingStrategyPage] businessData:', businessData);
      console.log('[MarketingStrategyPage] businessData.core_data exists:', !!businessData?.core_data);

      if (businessData?.core_data) {
        const coreBusinessData = businessData.core_data;

        const insightsCount = aiInsights?.length || 0;
        console.log('[MarketingStrategyPage] Setting businessIntelligence with insights count:', insightsCount);

        // Map database fields to component structure
        setBusinessIntelligence({
          // Company info from core_business_data
          company_name: coreBusinessData.company_name,
          website: coreBusinessData.website,
          industry: coreBusinessData.industry,
          company_size: coreBusinessData.company_size,
          business_model: coreBusinessData.business_model,
          company_stage: coreBusinessData.company_stage,
          funding_status: coreBusinessData.funding_status,
          annual_revenue: coreBusinessData.annual_revenue,
          marketing_budget: coreBusinessData.marketing_budget,

          // Market & Competition
          target_market: coreBusinessData.target_market,
          main_products: coreBusinessData.main_products,
          key_competitors: coreBusinessData.key_competitors,
          tech_stack: coreBusinessData.tech_stack,
          geography: coreBusinessData.geography ? [
            coreBusinessData.geography.city,
            coreBusinessData.geography.state_province,
            coreBusinessData.geography.country
          ].filter(Boolean) : [],

          // Additional fields
          data_completeness_score: coreBusinessData.data_completeness_score,

          // AI Insights - using validation_status field from API response
          total_insights: insightsCount,
          approved_insights: aiInsights?.filter((i: any) => i.validation_status === 'approved' || i.validation_status === 'auto_approved').length || 0,
          auto_approved_insights: aiInsights?.filter((i: any) => i.validation_status === 'auto_approved').length || 0,
          recent_learnings: aiInsights?.slice(0, 5).map((insight: any) => ({
            id: insight.id,
            title: insight.title,
            content: insight.content, // Keep the full content object
            confidence_score: insight.confidence_score,
            validation_status: insight.validation_status,
            source_agent: insight.source_agent,
            created_at: insight.created_at,
            fields_extracted: Object.keys(insight.content || {}).length
          })) || []
        });
      } else {
        // No business data found, use defaults
        setBusinessIntelligence({});
      }
    } catch (error) {
      console.error('Error loading business intelligence:', error);
      setBusinessIntelligence({});
    }
  };

  const handleStrategyGenerated = (_strategy: any) => {
    // React Query will automatically refresh the data
    console.log('Strategy generated, React Query will handle refresh');
  };

  const handleSelectStrategy = (strategy: any) => {
    console.log('Selected strategy:', strategy);
    // TODO: Implement strategy view/edit functionality
    // For now, just switch to chat tab
    setActiveTab('chat');
  };

  const handleEditStrategy = (strategy: any) => {
    console.log('Edit strategy:', strategy);
    // TODO: Implement strategy editing
  };

  const handleDuplicateStrategy = (strategyId: string, _currentName: string) => {
    console.log('Duplicate strategy:', strategyId);
    // TODO: Implement strategy duplication
  };

  const handleArchiveStrategy = (strategyId: string) => {
    console.log('Archive strategy:', strategyId);
    // TODO: Implement strategy archiving
  };

  const handleRestoreStrategy = (strategyId: string) => {
    console.log('Restore strategy:', strategyId);
    // TODO: Implement strategy restoration
  };

  const handleCreateNewStrategy = () => {
    setActiveTab('chat');
    // Navigate to mode selection or chat mode
    if (!mode) {
      const chatUrl = clientSlug
        ? `/clients/${clientSlug}/agents/marketing-strategy/chat`
        : ROUTES.agents.marketingStrategy.mode('chat');
      navigate(chatUrl);
    }
  };

  const handleSelectSession = (session: any) => {
    setSelectedSession(session);
    // Navigate to session URL using agent_type from session for cross-agent routing
    if (session?.id && session?.agent_type) {
      // Use session mode for marketing_strategy, default to 'chat' if not specified
      const sessionMode = session.mode || 'chat';
      const sessionUrl = buildAgentSessionUrl(session.agent_type, session.id, clientSlug, sessionMode);
      navigate(sessionUrl);
    }
  };

  const handleCreateSession = () => {
    setSelectedSession(null);
    // Navigate back to mode selection, preserving client context if present
    navigate(buildAgentRootUrl('marketing_strategy', clientSlug));
  };

  const handleSessionCreated = (session: any) => {
    // Set the session immediately so it's available when the component re-renders
    setSelectedSession(session);
    // Navigate to the new session URL using agent_type from session
    if (session?.id && session?.agent_type) {
      // Use requestAnimationFrame to ensure state update happens first
      requestAnimationFrame(() => {
        // Use session mode for marketing_strategy, default to 'chat' if not specified
        const sessionMode = session.mode || 'chat';
        const sessionUrl = buildAgentSessionUrl(session.agent_type, session.id, clientSlug, sessionMode);
        navigate(sessionUrl);
      });
    }
  };

  // Mobile session history (DRY pattern)
  const mobileHistory = useMobileSessionHistory({
    sessions,
    selectedSessionId: selectedSession?.id || sessionId,
    onSessionSelect: handleSelectSession,
    onNewSession: handleCreateSession,
  });

  // Build business context object for intelligent display
  const buildBusinessContext = () => {
    if (!organization) return null;

    // Always return a context object with all available data
    return {
      company: {
        name: businessIntelligence?.company_name || organization.name || 'Your Company',
        industry: businessIntelligence?.industry,
        size: businessIntelligence?.company_size,
        type: organization.type || 'SME',
        description: businessIntelligence?.description,
        website: businessIntelligence?.website,
        founded_year: businessIntelligence?.founded_year,
        employee_count: businessIntelligence?.company_size,
        headquarters: businessIntelligence?.headquarters,
        mission_statement: businessIntelligence?.mission_statement,
        core_values: businessIntelligence?.core_values,
        key_products: businessIntelligence?.main_products,
        annual_revenue_range: businessIntelligence?.annual_revenue,
        business_stage: businessIntelligence?.company_stage,
        business_model: businessIntelligence?.business_model,
        funding_status: businessIntelligence?.funding_status,
        marketing_budget: businessIntelligence?.marketing_budget,
        technology_stack: businessIntelligence?.tech_stack,
        operating_regions: businessIntelligence?.geography,
        target_market_segments: businessIntelligence?.target_market,
        main_products_services: businessIntelligence?.main_products,
        key_competitors: businessIntelligence?.key_competitors,
        data_completeness_score: businessIntelligence?.data_completeness_score,
      },
      aiLearnings: {
        targetMarket: businessIntelligence?.target_market?.join(', '),
        geography: businessIntelligence?.geography?.join(', '),
        businessModel: businessIntelligence?.business_model,
        revenue: businessIntelligence?.annual_revenue,
        marketingBudget: businessIntelligence?.marketing_budget,
        uniqueValueProposition: businessIntelligence?.unique_value_proposition,
        competitors: businessIntelligence?.key_competitors || [],
        market_position: businessIntelligence?.market_position,
        growth_stage: businessIntelligence?.growth_stage,
        distribution_channels: businessIntelligence?.distribution_channels,
        customer_acquisition_cost: businessIntelligence?.customer_acquisition_cost,
        lifetime_value: businessIntelligence?.lifetime_value,
        seasonal_trends: businessIntelligence?.seasonal_trends,
        market_size: businessIntelligence?.market_size,
        competitive_advantages: businessIntelligence?.competitive_advantages,
        target_market_segments: businessIntelligence?.target_market,
        main_products_services: businessIntelligence?.main_products,
        pain_points: businessIntelligence?.pain_points,
        opportunities: businessIntelligence?.opportunities,
        total_insights: businessIntelligence?.total_insights,
        approved_insights: businessIntelligence?.approved_insights,
        auto_approved_insights: businessIntelligence?.auto_approved_insights,
        recent_learnings: businessIntelligence?.recent_learnings,
      },
      personas: existingPersonas?.map(persona => ({
        id: persona.id,
        name: persona.name,
        title: persona.title,
        company_name: persona.company_name,
        industry: persona.industry,
        location: persona.demographics?.location,
        goals: persona.goals,
        pain_points: persona.pain_points,
        current_tools: persona.current_tools,
        preferred_channels: persona.preferred_channels,
        personality_traits: persona.personality_traits,
        is_primary: persona.is_primary,
        created_at: persona.created_at,
      })) || [],
      campaigns: {
        active: campaignData ? {
          name: campaignData.name,
          budget_cents: campaignData.budget,
          objectives: typeof campaignData.goals === 'string' 
            ? campaignData.goals 
            : campaignData.goals?.goals,
          target_audience: campaignData.target_audience,
          start_date: campaignData.start_date,
          end_date: campaignData.end_date,
          status: campaignData.status,
          spent_cents: campaignData.spent_cents,
          metrics: campaignData.metrics,
          channel_breakdown: campaignData.channel_breakdown,
          performance_metrics: campaignData.performance_metrics,
          platforms: campaignData.platforms,
          content_themes: campaignData.content_themes,
          kpis: campaignData.kpis,
        } : undefined,
      },
      previousStrategies: existingStrategies?.map(strategy => ({
        id: strategy.id,
        created_at: strategy.created_at,
        name: strategy.name,
        description: strategy.description,
      })) || [],
    };
  };

  // Handle starting strategy with intelligent context
  const handleStartIntelligentStrategy = (contextSummary: string) => {
    if (clientSlug) {
      navigate(`/clients/${clientSlug}/agents/marketing-strategy/chat`, {
        state: { initialContext: contextSummary }
      });
    } else {
      navigate(ROUTES.agents.marketingStrategy.mode('chat'), {
        state: { initialContext: contextSummary }
      });
    }
  };

  // Handle refining context (could open a modal or navigate to profile)
  const handleRefineContext = () => {
    // For now, navigate to business intelligence tab
    const profileUrl = clientSlug
      ? `/clients/${clientSlug}/profile?tab=business-intelligence`
      : '/profile?tab=business-intelligence';
    navigate(profileUrl);
  };

  // If we have a mode selected, show the interface with sidebar
  // Calculate height: viewport - header - bottom nav on mobile
  // On mobile: 100dvh - 58px (header) - 65px (bottom nav) = 100dvh - 123px
  // On desktop: 100dvh - 58px (header only, no bottom nav)
  const chatHeightClass = "h-[calc(100dvh-123px)] md:h-[calc(100dvh-58px)]";

  if (mode) {
    return (
      <div className={`flex ${chatHeightClass} overflow-hidden bg-gradient-to-br from-gray-50 via-white to-amber-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800`}>
        {/* Sidebar */}
        <MarketingStrategySidebar
          onSelectSession={handleSelectSession}
          onCreateNewSession={handleCreateSession}
          selectedSessionId={selectedSession?.id || sessionId}
          currentMode={mode}
        />

        {/* Session History Sheet - Mobile only */}
        {mobileHistory.sheet}

        {/* Main Content */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Mobile Tabs (hidden on desktop) */}
          <AgentTabs
            tabs={[
              {
                id: 'chat',
                label: t('marketing_strategy.page.tabs.newStrategy'),
                icon: MessageSquarePlus,
              },
              {
                id: 'list',
                label: t('marketing_strategy.page.tabs.myStrategies'),
                count: existingStrategies.length,
                icon: Target,
              },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
            trailingAction={mobileHistory.button}
          />

          {/* Content based on active tab */}
          {activeTab === 'chat' ? (
            // Chat View (always visible on desktop, tab 1 on mobile)
            <div className="flex-1 min-h-0 overflow-y-auto container mx-auto px-3 md:px-6 pt-4 pb-2 md:py-8">
              {/* Header - Desktop only */}
              <div className="hidden md:block mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-gradient-to-br from-slate-600 to-amber-600 rounded-xl text-white">
                    <Target className="h-8 w-8" />
                  </div>
                  <div className="flex-1">
                    <h1 className="heading-display-md">{t('marketing_strategy.page.title')}</h1>
                    <p className="text-muted-foreground mt-1">
                      {mode === 'quick' ? t('marketing_strategy.page.modes.quick') :
                       mode === 'guided' ? t('marketing_strategy.page.modes.guided') :
                       mode === 'chat' ? t('marketing_strategy.page.modes.chat') :
                       t('marketing_strategy.page.modes.advanced')}
                    </p>
                  </div>
                  {mode !== 'chat' && (
                    <Button
                      variant="outline"
                      onClick={() => navigate(buildAgentRootUrl('marketing_strategy', clientSlug))}
                    >
                      {t('marketing_strategy.page.actions.changeMode')}
                    </Button>
                  )}
                </div>

                {/* Active Strategy Indicator */}
                {activeStrategy && (
                  <Card className="border-slate-200 bg-gradient-to-r from-slate-50 to-amber-50 dark:from-slate-900/20 dark:to-amber-900/20">
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <span className="text-sm font-medium text-brand-charcoal dark:text-gray-300">{t('marketing_strategy.page.activeStrategy')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-600" />
                            <span className="font-semibold text-brand-charcoal dark:text-amber-400">
                              {activeStrategy.title || t('marketing_strategy.page.defaultSessionTitle')}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {t('marketing_strategy.page.created')} {new Date(activeStrategy.created_at).toLocaleDateString(intlLocale)}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const outputsUrl = clientSlug
                                ? `/clients/${clientSlug}/outputs`
                                : ROUTES.outputs.root;
                              navigate(outputsUrl);
                            }}
                            className="text-amber-600 hover:text-brand-charcoal hover:bg-slate-100"
                          >
                            {t('marketing_strategy.page.actions.viewAllStrategies')}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Chat Interface */}
              <Card className="min-h-[600px]">
                <CardContent className="p-3 md:p-6">
                  <MarketingStrategyChat
                    campaignId={campaignData?.id || undefined}
                    organizationId={organizationId || organization?.id || undefined}
                    existingPersonas={existingPersonas}
                    campaignData={campaignData}
                    onStrategyGenerated={handleStrategyGenerated}
                    preselectedMode={mode}
                    selectedSession={selectedSession}
                    onSessionCreated={handleSessionCreated}
                    initialContext={location.state?.initialContext}
                  />
                </CardContent>
              </Card>
            </div>
          ) : (
            // List View (mobile-only tab 2)
            <div className="md:hidden">
              <MarketingStrategyListView
                strategies={existingStrategies}
                isLoading={false}
                onSelectStrategy={handleSelectStrategy}
                onEditStrategy={handleEditStrategy}
                onDuplicateStrategy={handleDuplicateStrategy}
                onArchiveStrategy={handleArchiveStrategy}
                onRestoreStrategy={handleRestoreStrategy}
                onCreateStrategy={handleCreateNewStrategy}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Original mode selection screen (no mode selected)
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">

      {/* Header */}
      <div className="mb-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-slate-600 to-amber-600 rounded-xl text-white">
            <Target className="h-8 w-8" />
          </div>
          <div>
            <h1 className="heading-display-md">{t('marketing_strategy.page.title')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('marketing_strategy.page.subtitle')}
            </p>
          </div>
        </div>

      </div>

      {/* Always show Intelligent Context Display when organization exists */}
      {organization ? (
        <IntelligentContextDisplay
          businessContext={buildBusinessContext()!}
          onStartStrategy={handleStartIntelligentStrategy}
          onRefineContext={handleRefineContext}
          recentSessions={recentSessions}
          onContinueSession={(sessionId) => navigate(buildAgentSessionUrl('marketing_strategy', sessionId, clientSlug, 'chat'))}
        />
      ) : (
        <>
          {/* Fallback: Loading or no organization */}
          <div className="text-center mb-8">
            <h2 className="heading-serif-lg mb-3">{t('marketing_strategy.page.loading')}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t('marketing_strategy.page.loadingSubtitle')}
            </p>
          </div>

          {/* Main Action Card */}
          <Card className="max-w-3xl mx-auto mb-8">
            <CardContent className="pt-8 pb-8">
              <div className="text-center space-y-6">
                <div className="mx-auto p-4 bg-gradient-to-br from-slate-100 to-amber-100 dark:from-slate-900 dark:to-amber-900 rounded-2xl w-fit">
                  <MessageSquare className="h-12 w-12 text-amber-600 dark:text-amber-400" />
                </div>

                <div className="space-y-2">
                  <h3 className="heading-serif-md">{t('marketing_strategy.page.startPrompt')}</h3>
                  <p className="text-muted-foreground max-w-xl mx-auto">
                    {t('marketing_strategy.page.startPrompt')}
                  </p>
                </div>

                <Button
                  size="lg"
                  className="px-8"
                  onClick={() => {
                    if (clientSlug) {
                      navigate(`/clients/${clientSlug}/agents/marketing-strategy/chat`);
                    } else {
                      navigate(ROUTES.agents.marketingStrategy.mode('chat'));
                    }
                  }}
                >
                  <MessageSquare className="mr-2 h-5 w-5" />
                  {t('marketing_strategy.page.actions.startConversation')}
                </Button>

                <div className="grid md:grid-cols-4 gap-4 pt-4 border-t max-w-2xl mx-auto">
                  <div className="text-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">{t('marketing_strategy.page.features.contextAware')}</p>
                  </div>
                  <div className="text-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">{t('marketing_strategy.page.features.tradeoffs')}</p>
                  </div>
                  <div className="text-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">{t('marketing_strategy.page.features.regional')}</p>
                  </div>
                  <div className="text-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">{t('marketing_strategy.page.features.iterative')}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Optional Quick Start Contexts */}
      <div className="max-w-4xl mx-auto">
        <p className="text-center text-sm text-muted-foreground mb-4">
          {t('marketing_strategy.page.orStartWith')}
        </p>
        <div className="grid md:grid-cols-3 gap-4">
          <Card
            className="cursor-pointer hover:shadow-md transition-all hover:border-amber-300"
            onClick={() => {
              const chatUrl = clientSlug
                ? `/clients/${clientSlug}/agents/marketing-strategy/chat`
                : ROUTES.agents.marketingStrategy.mode('chat');
              navigate(chatUrl, {
                state: { initialContext: "I'm just starting my business and need to build awareness with minimal budget" }
              });
            }}
          >
            <CardContent className="pt-6 pb-4">
              <div className="flex items-center gap-3 mb-2">
                <Rocket className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <h4 className="font-medium">{t('marketing_strategy.page.contextCards.starting.title')}</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('marketing_strategy.page.contextCards.starting.description')}
              </p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-md transition-all hover:border-amber-300"
            onClick={() => {
              const chatUrl = clientSlug
                ? `/clients/${clientSlug}/agents/marketing-strategy/chat`
                : ROUTES.agents.marketingStrategy.mode('chat');
              navigate(chatUrl, {
                state: { initialContext: "I'm ready to scale my marketing and have budget to invest in growth" }
              });
            }}
          >
            <CardContent className="pt-6 pb-4">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <h4 className="font-medium">{t('marketing_strategy.page.contextCards.scaling.title')}</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('marketing_strategy.page.contextCards.scaling.description')}
              </p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-md transition-all hover:border-amber-300"
            onClick={() => {
              const chatUrl = clientSlug
                ? `/clients/${clientSlug}/agents/marketing-strategy/chat`
                : ROUTES.agents.marketingStrategy.mode('chat');
              navigate(chatUrl, {
                state: { initialContext: "I'm expanding to new markets and need region-specific strategies" }
              });
            }}
          >
            <CardContent className="pt-6 pb-4">
              <div className="flex items-center gap-3 mb-2">
                <Globe className="h-5 w-5 text-amber-500" />
                <h4 className="font-medium">{t('marketing_strategy.page.contextCards.global.title')}</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('marketing_strategy.page.contextCards.global.description')}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Key Features */}
      <div className="mt-12 flex justify-center items-center gap-8 flex-wrap max-w-3xl mx-auto">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-amber-600" />
          <span className="text-sm font-medium">{t('marketing_strategy.page.features.budget')}</span>
        </div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-600" />
          <span className="text-sm font-medium">{t('marketing_strategy.page.features.aiInsights')}</span>
        </div>
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-amber-600" />
          <span className="text-sm font-medium">{t('marketing_strategy.page.features.tactics')}</span>
        </div>
      </div>
    </div>
  );
}
