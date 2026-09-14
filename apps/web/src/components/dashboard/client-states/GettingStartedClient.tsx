import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Target,
  Users,
  Sparkles,
  Building2,
  PenTool,
  Search,
  BarChart3
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useClientContext } from '@/contexts/ClientContext';
import { useTranslation } from 'react-i18next';

/**
 * GettingStartedClient Component
 *
 * Onboarding view for agency users when a client is first created.
 * Shows recommended first steps with AI agents to build client intelligence.
 *
 * Similar to SME's GettingStartedRefined but adapted for client context:
 * - All URLs are client-scoped (/clients/:clientSlug/agents/...)
 * - Focus on building client intelligence first
 * - No "Quick Start" agent (that's SME-only)
 * - Professional agency tone
 */
export function GettingStartedClient() {
  const navigate = useNavigate();
  const { clientSlug } = useClientContext();
  const { t } = useTranslation('dashboard');

  const handleAgentClick = (agentPath: string) => {
    if (clientSlug) {
      navigate(`/clients/${clientSlug}/agents/${agentPath}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {t('clientOnboarding.title')}
        </h2>
        <p className="text-base md:text-lg text-gray-600 dark:text-gray-400 mb-2">
          {t('clientOnboarding.subtitle')}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('clientOnboarding.hint')}
        </p>
      </div>

      {/* Three Primary CTAs - Intelligence First */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card
          className="border-2 hover:border-amber-300 dark:hover:border-amber-600 transition-all duration-200 cursor-pointer group border-slate-200 dark:border-gray-700"
          onClick={() => handleAgentClick('strategy')}
        >
          <CardHeader className="text-center pb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 mb-4 mx-auto group-hover:scale-110 transition-transform">
              <Target className="h-8 w-8 text-amber-600 dark:text-amber-500" />
            </div>
            <CardTitle className="text-xl mb-2 dark:text-gray-100">{t('clientOnboarding.cards.strategy.title')}</CardTitle>
            <CardDescription className="text-base dark:text-gray-400">
              {t('clientOnboarding.cards.strategy.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              {t('clientOnboarding.cards.strategy.description')}
            </p>
            <div className="mt-4 text-center">
              <span className="text-xs text-amber-600 dark:text-amber-500 font-medium">⏱️ {t('clientOnboarding.cards.strategy.cta')}</span>
            </div>
          </CardContent>
        </Card>

        <Card
          className="border-2 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200 cursor-pointer group border-slate-200 dark:border-gray-700"
          onClick={() => handleAgentClick('persona')}
        >
          <CardHeader className="text-center pb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4 mx-auto group-hover:scale-110 transition-transform">
              <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-xl mb-2 dark:text-gray-100">{t('clientOnboarding.cards.persona.title')}</CardTitle>
            <CardDescription className="text-base dark:text-gray-400">
              {t('clientOnboarding.cards.persona.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              {t('clientOnboarding.cards.persona.description')}
            </p>
            <div className="mt-4 text-center">
              <span className="text-xs text-gray-500 dark:text-gray-400">⏱️ {t('clientOnboarding.cards.persona.cta')}</span>
            </div>
          </CardContent>
        </Card>

        <Card
          className="border-2 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all duration-200 cursor-pointer group border-slate-200 dark:border-gray-700"
          onClick={() => handleAgentClick('marketing-strategy')}
        >
          <CardHeader className="text-center pb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900/30 mb-4 mx-auto group-hover:scale-110 transition-transform">
              <Sparkles className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <CardTitle className="text-xl mb-2 dark:text-gray-100">{t('clientOnboarding.cards.marketingStrategy.title')}</CardTitle>
            <CardDescription className="text-base dark:text-gray-400">
              {t('clientOnboarding.cards.marketingStrategy.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              {t('clientOnboarding.cards.marketingStrategy.description')}
            </p>
            <div className="mt-4 text-center">
              <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">⏱️ {t('clientOnboarding.cards.marketingStrategy.cta')}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Or Explore Divider */}
      <div className="relative py-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="px-4 bg-white dark:bg-gray-900 text-sm text-gray-500 dark:text-gray-400">
            {t('clientOnboarding.divider')}
          </span>
        </div>
      </div>

      {/* Additional Agent Options */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 dark:text-gray-100">
            <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            {t('clientOnboarding.moreAgentsTitle')}
          </CardTitle>
          <CardDescription className="dark:text-gray-400">
            {t('clientOnboarding.moreAgentsSubtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <button
              onClick={() => handleAgentClick('content')}
              className="flex items-start gap-3 p-3 bg-white dark:bg-gray-900 rounded-lg hover:shadow-sm transition-all duration-200 text-left group border border-gray-200 dark:border-gray-700"
            >
              <div className="p-2 rounded-lg group-hover:scale-105 transition-transform bg-green-100 dark:bg-green-900/30">
                <PenTool className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {t('clientOnboarding.agents.content.name')}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('clientOnboarding.agents.content.description')}</p>
              </div>
            </button>

            <button
              onClick={() => handleAgentClick('performance-intelligence')}
              className="flex items-start gap-3 p-3 bg-white dark:bg-gray-900 rounded-lg hover:shadow-sm transition-all duration-200 text-left group border border-gray-200 dark:border-gray-700"
            >
              <div className="p-2 rounded-lg group-hover:scale-105 transition-transform bg-orange-100 dark:bg-orange-900/30">
                <BarChart3 className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {t('clientOnboarding.agents.performance.name')}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('clientOnboarding.agents.performance.description')}</p>
              </div>
            </button>

            <button
              onClick={() => handleAgentClick('competitive-intelligence')}
              className="flex items-start gap-3 p-3 bg-white dark:bg-gray-900 rounded-lg hover:shadow-sm transition-all duration-200 text-left group border border-gray-200 dark:border-gray-700"
            >
              <div className="p-2 rounded-lg group-hover:scale-105 transition-transform bg-cyan-100 dark:bg-cyan-900/30">
                <Search className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {t('clientOnboarding.agents.competitive.name')}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('clientOnboarding.agents.competitive.description')}</p>
              </div>
            </button>

            <button
              onClick={() => handleAgentClick('campaign-planning')}
              className="flex items-start gap-3 p-3 bg-white dark:bg-gray-900 rounded-lg hover:shadow-sm transition-all duration-200 text-left group border border-gray-200 dark:border-gray-700"
            >
              <div className="p-2 rounded-lg group-hover:scale-105 transition-transform bg-amber-100 dark:bg-amber-900/30">
                <Building2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {t('clientOnboarding.agents.campaignPlanning.name')}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{t('clientOnboarding.agents.campaignPlanning.description')}</p>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
