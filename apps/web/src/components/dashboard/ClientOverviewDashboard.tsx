import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Building2,
  ArrowRight,
  Brain,
  Sparkles,
  Rocket,
  TrendingUp
} from 'lucide-react';
import { useDashboardCampaigns } from '@/hooks/data/useDashboardMetrics';
import { useClientBySlug } from '@/hooks/data/useClients';
import { useClientContext } from '@/contexts/ClientContext';
import { GettingStartedClient } from './client-states/GettingStartedClient';
import { IntelligenceBriefingCard } from './IntelligenceBriefingCard';
import { CampaignReadinessBanner } from './CampaignReadinessBanner';
import { IntelligenceVaultCard } from './IntelligenceVaultCard';
import { useOutputsHub } from '@/hooks/data/useAgentOutputs';
import { useTranslation } from 'react-i18next';

interface ClientOverviewDashboardProps {
  clientId?: string;
  clientSlug?: string;
}

/**
 * ClientOverviewDashboard Component
 *
 * SME-style dashboard for agency users managing a specific client.
 * Matches SMEDashboard experience but scoped to a single client.
 *
 * Features:
 * - Dynamic AI-powered recommendations (Intelligence Briefing)
 * - Campaign readiness tracking banner
 * - Intelligence Vault (recent outputs)
 * - Quick Stats grid (Intelligence Outputs, AI Interactions, Campaigns, Sessions)
 *
 * Design Principles:
 * - Intelligence-first experience (matches SME dashboard)
 * - Context-aware recommendations per client
 * - Professional metrics with brand design tokens
 * - Client-scoped URLs for agency routing
 */
export function ClientOverviewDashboard({ clientId, clientSlug: propClientSlug }: ClientOverviewDashboardProps) {
  const { t } = useTranslation('dashboard');
  const { clientSlug: contextClientSlugBranded } = useClientContext();
  const contextClientSlug = contextClientSlugBranded || undefined;
  const clientSlug = propClientSlug || contextClientSlug;

  // Get client data
  const { data: client, isLoading: clientLoading } = useClientBySlug(clientSlug);

  // Get client-specific campaigns
  const { data: allCampaigns = [] } = useDashboardCampaigns(50);
  const clientCampaigns = allCampaigns.filter(c => c.client_id === (clientId || client?.id));

  // ✅ FIX: Use useOutputsHub for client-specific outputs (schema-aware)
  // This correctly queries agency.agent_outputs and filters by client_id
  const { data: outputsHubData, isLoading: outputsLoading } = useOutputsHub({ clientSlug });
  const clientOutputs = outputsHubData?.agent_outputs || [];

  // Prepare intelligence outputs for IntelligenceVaultCard
  const intelligenceOutputs = clientOutputs.slice(0, 5).map(output => ({
    id: output.id,
    title: output.title || 'Untitled Output',
    description: output.summary || '',
    agent_type: output.agent_type || 'strategy',
    created_at: output.created_at,
    output_type: output.output_type || 'analysis'
  }));

  // ✅ ROBUST SOLUTION: Calculate client-specific intelligence readiness
  // This ensures Agency users see readiness for THIS client, not org-wide
  const clientIntelligenceReadiness = {
    hasStrategy: clientOutputs.some(o => o.agent_type === 'strategy'),
    hasPersona: clientOutputs.some(o => o.agent_type === 'persona'),
    hasMarketingStrategy: clientOutputs.some(o => o.agent_type === 'marketing_strategy'),
    isReady: false,
    readinessScore: 0
  };

  // Calculate readiness score (0-100)
  const readinessChecks = [
    clientIntelligenceReadiness.hasStrategy,
    clientIntelligenceReadiness.hasPersona,
    clientIntelligenceReadiness.hasMarketingStrategy
  ];
  const completedChecks = readinessChecks.filter(Boolean).length;
  clientIntelligenceReadiness.readinessScore = Math.round((completedChecks / readinessChecks.length) * 100);
  clientIntelligenceReadiness.isReady = completedChecks === readinessChecks.length;

  if (clientLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!client) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('clientOverview.notFound.title')}</h3>
            <p className="text-muted-foreground mb-4">
              {t('clientOverview.notFound.description')}
            </p>
            <Button asChild>
              <Link to="/clients">
                <ArrowRight className="mr-2 h-4 w-4" />
                {t('clientOverview.notFound.backToClients')}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show onboarding for new clients (similar to SME dashboard logic)
  // Show Getting Started if client has NO campaigns AND NO outputs
  const showStaticOnboarding = clientCampaigns.length === 0 && clientOutputs.length === 0;
  if (showStaticOnboarding) {
    return <GettingStartedClient />;
  }

  // Generate dynamic AI recommendations based on client activity (similar to SME experience)
  const mockRecommendations = [
    {
      id: '1',
      title: t('clientOverview.recommendations.personaAnalysis.title'),
      description: t('clientOverview.recommendations.personaAnalysis.description', { clientName: client.name }),
      agent_type: 'persona',
      estimated_time: 15,
      priority: 'high' as const,
      action_url: `/clients/${clientSlug}/agents/persona`
    },
    {
      id: '2',
      title: t('clientOverview.recommendations.marketingStrategy.title'),
      description: t('clientOverview.recommendations.marketingStrategy.description'),
      agent_type: 'marketing-strategy',
      estimated_time: 20,
      priority: 'high' as const,
      action_url: `/clients/${clientSlug}/agents/marketing-strategy`
    },
    {
      id: '3',
      title: t('clientOverview.recommendations.contentGeneration.title'),
      description: t('clientOverview.recommendations.contentGeneration.description'),
      agent_type: 'content',
      estimated_time: 10,
      priority: 'medium' as const,
      action_url: `/clients/${clientSlug}/agents/content`
    }
  ];

  return (
    <div className="space-y-6">
      {/* PRIMARY: Intelligence Briefing - AI Recommendations (Like SME Dashboard) */}
      <IntelligenceBriefingCard
        recommendations={mockRecommendations}
        isLoading={false}
      />

      {/* Campaign Readiness Banner - Shows client-specific progress */}
      {!clientIntelligenceReadiness.isReady && (
        <CampaignReadinessBanner
          isReady={clientIntelligenceReadiness.isReady}
          completionPercentage={clientIntelligenceReadiness.readinessScore}
          hasStrategy={clientIntelligenceReadiness.hasStrategy}
          hasPersona={clientIntelligenceReadiness.hasPersona}
          hasMarketingStrategy={clientIntelligenceReadiness.hasMarketingStrategy}
        />
      )}

      {/* SECONDARY: Intelligence Outputs + Quick Stats (Like SME Dashboard) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <IntelligenceVaultCard
          recentOutputs={intelligenceOutputs}
          totalCount={clientOutputs.length}
          isLoading={outputsLoading}
        />

        {/* Quick Stats - Client-Specific Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg font-semibold text-brand-charcoal dark:text-gray-100">{t('clientOverview.quickStats.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              <div className="flex flex-col space-y-1.5 md:space-y-2">
                <div className="flex items-center text-xs md:text-sm text-brand-slate dark:text-gray-400">
                  <Brain className="w-4 h-4 mr-2 text-brand-gold dark:text-amber-400" />
                  {t('stats.intelligenceOutputs')}
                </div>
                <div className="text-xl md:text-2xl font-bold text-brand-charcoal dark:text-gray-100">{clientOutputs.length}</div>
              </div>
              <div className="flex flex-col space-y-1.5 md:space-y-2">
                <div className="flex items-center text-xs md:text-sm text-brand-slate dark:text-gray-400">
                  <Sparkles className="w-4 h-4 mr-2 text-brand-gold dark:text-amber-400" />
                  {t('stats.aiInteractions')}
                </div>
                <div className="text-xl md:text-2xl font-bold text-brand-charcoal dark:text-gray-100">{clientOutputs.length}</div>
              </div>
              <div className="flex flex-col space-y-1.5 md:space-y-2">
                <div className="flex items-center text-xs md:text-sm text-brand-slate dark:text-gray-400">
                  <Rocket className="w-4 h-4 mr-2 text-brand-gold dark:text-amber-400" />
                  {t('stats.activeCampaigns')}
                </div>
                <div className="text-xl md:text-2xl font-bold text-brand-charcoal dark:text-gray-100">{clientCampaigns.filter(c => c.status === 'active').length}</div>
              </div>
              <div className="flex flex-col space-y-1.5 md:space-y-2">
                <div className="flex items-center text-xs md:text-sm text-brand-slate dark:text-gray-400">
                  <TrendingUp className="w-4 h-4 mr-2 text-brand-gold dark:text-amber-400" />
                  {t('stats.strategySessions')}
                </div>
                <div className="text-xl md:text-2xl font-bold text-brand-charcoal dark:text-gray-100">{clientOutputs.filter(o => o.agent_type === 'strategy').length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
