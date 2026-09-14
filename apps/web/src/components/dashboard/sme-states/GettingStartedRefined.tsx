import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Target,
  Users,
  Sparkles,
  Rocket,
  ChevronDown,
  Building2,
  Brain,
  BarChart3,
  Search,
  PenTool,
  Play,
  ArrowRight
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { QuickStartModal } from '@/components/dashboard/QuickStartModal';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

// Agent category structure (icons and paths only - names from i18n)
interface AgentConfig {
  id: string;
  icon: LucideIcon;
  color: string;
  path: string;
  nameKey: string;
  descKey: string;
}

interface CategoryConfig {
  icon: LucideIcon;
  color: string;
  nameKey: string;
  descKey: string;
  agents: AgentConfig[];
}

const AGENT_CATEGORIES: Record<string, CategoryConfig> = {
  foundation: {
    icon: Building2,
    color: 'blue',
    nameKey: 'sme.onboarding.categories.foundation.name',
    descKey: 'sme.onboarding.categories.foundation.description',
    agents: [
      {
        id: 'strategy',
        icon: Target,
        color: 'blue-500',
        path: '/strategy',
        nameKey: 'sme.onboarding.agents.strategy.name',
        descKey: 'sme.onboarding.agents.strategy.description'
      },
      {
        id: 'persona',
        icon: Users,
        color: 'amber-500',
        path: '/persona',
        nameKey: 'sme.onboarding.agents.persona.name',
        descKey: 'sme.onboarding.agents.persona.description'
      },
      {
        id: 'marketing-strategy',
        icon: Sparkles,
        color: 'indigo-500',
        path: '/marketing-strategy',
        nameKey: 'sme.onboarding.agents.marketingStrategy.name',
        descKey: 'sme.onboarding.agents.marketingStrategy.description'
      }
    ]
  },
  execution: {
    icon: Rocket,
    color: 'green',
    nameKey: 'sme.onboarding.categories.execution.name',
    descKey: 'sme.onboarding.categories.execution.description',
    agents: [
      {
        id: 'content',
        icon: PenTool,
        color: 'green-500',
        path: '/content',
        nameKey: 'sme.onboarding.agents.content.name',
        descKey: 'sme.onboarding.agents.content.description'
      },
      {
        id: 'campaign-planning',
        icon: Play,
        color: 'amber-500',
        path: '/campaign-planning',
        nameKey: 'sme.onboarding.agents.campaignPlanning.name',
        descKey: 'sme.onboarding.agents.campaignPlanning.description'
      }
    ]
  },
  intelligence: {
    icon: Brain,
    color: 'purple',
    nameKey: 'sme.onboarding.categories.intelligence.name',
    descKey: 'sme.onboarding.categories.intelligence.description',
    agents: [
      {
        id: 'performance',
        icon: BarChart3,
        color: 'orange-500',
        path: '/performance-intelligence',
        nameKey: 'sme.onboarding.agents.performance.name',
        descKey: 'sme.onboarding.agents.performance.description'
      },
      {
        id: 'competitive',
        icon: Search,
        color: 'cyan-500',
        path: '/competitive-intelligence',
        nameKey: 'sme.onboarding.agents.competitive.name',
        descKey: 'sme.onboarding.agents.competitive.description'
      }
    ]
  }
};

interface AgentCategoryProps {
  category: CategoryConfig;
  categoryKey: string;
  t: TFunction<'dashboard'>;
}

function AgentCategory({ category, categoryKey, t }: AgentCategoryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const Icon = category.icon;

  return (
    <div className={cn(
      "rounded-xl overflow-hidden transition-all duration-300",
      "border border-slate-200/80 dark:border-slate-700/80",
      "hover:shadow-lg hover:shadow-slate-900/5 dark:hover:shadow-black/20",
      isExpanded && "shadow-lg shadow-slate-900/5 dark:shadow-black/20"
    )}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full px-5 py-4 flex items-center justify-between transition-colors",
          "bg-white dark:bg-slate-800/50",
          "hover:bg-slate-50/80 dark:hover:bg-slate-800/80"
        )}
      >
        <div className="flex items-center gap-4">
          <div className={cn(
            "p-2.5 rounded-xl shadow-sm",
            categoryKey === 'foundation' && "bg-gradient-to-br from-blue-500 to-blue-600",
            categoryKey === 'execution' && "bg-gradient-to-br from-emerald-500 to-emerald-600",
            categoryKey === 'intelligence' && "bg-gradient-to-br from-amber-500 to-amber-600"
          )}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-slate-900 dark:text-slate-100">
              {t(category.nameKey)}
              <span className="ml-2 text-sm font-normal text-slate-500 dark:text-slate-400">
                {t('sme.onboarding.agentCount', { count: category.agents.length })}
              </span>
            </p>
            {!isExpanded && (
              <p className="text-sm text-slate-600 dark:text-slate-400">{t(category.descKey)}</p>
            )}
          </div>
        </div>
        <div className={cn(
          "p-2 rounded-lg transition-all duration-300",
          isExpanded && "rotate-180"
        )}>
          <ChevronDown className="h-5 w-5 text-slate-400 dark:text-slate-500" />
        </div>
      </button>

      {isExpanded && (
        <div className={cn(
          "border-t border-slate-100 dark:border-slate-700/50",
          "bg-slate-50/50 dark:bg-slate-900/50 p-4"
        )}>
          <div className="grid gap-3">
            {category.agents.map((agent) => {
              const AgentIcon = agent.icon;
              return (
                <button
                  key={agent.id}
                  onClick={() => navigate(agent.path)}
                  className={cn(
                    "flex items-start gap-4 p-4 rounded-xl text-left group",
                    "bg-white dark:bg-slate-800/80",
                    "border border-transparent",
                    "hover:border-amber-400/50 dark:hover:border-amber-500/50",
                    "hover:shadow-md hover:shadow-amber-500/10",
                    "transition-all duration-200"
                  )}
                >
                  <div className={cn(
                    "p-2.5 rounded-xl transition-transform duration-300 group-hover:scale-110",
                    "bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-600 dark:to-slate-800",
                    "shadow-sm"
                  )}>
                    <AgentIcon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "font-medium transition-colors",
                      "text-slate-900 dark:text-slate-100",
                      "group-hover:text-amber-600 dark:group-hover:text-amber-500"
                    )}>
                      {t(agent.nameKey)}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t(agent.descKey)}</p>
                  </div>
                  <ArrowRight className={cn(
                    "h-4 w-4 mt-1 transition-all duration-300",
                    "text-slate-300 dark:text-slate-600",
                    "group-hover:text-amber-500 group-hover:translate-x-1"
                  )} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function GettingStartedRefined() {
  const navigate = useNavigate();
  const [showQuickStart, setShowQuickStart] = useState(false);
  const queryClient = useQueryClient();
  const { t } = useTranslation('dashboard');

  const handleQuickStartComplete = () => {
    // Invalidate queries to refresh intelligence readiness
    queryClient.invalidateQueries({ queryKey: ['intelligence-readiness'] });
    queryClient.invalidateQueries({ queryKey: ['agent-outputs'] });
    // Note: Navigation to /quick-start is handled by QuickStartModal
  };

  return (
    <div className="relative min-h-full">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-40 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 w-72 h-72 bg-slate-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative space-y-8 p-6 md:p-8">
        {/* Welcome Header - Premium styling with serif font */}
        <div className="text-center mb-10">
          {/* Premium badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/10 to-amber-600/10 border border-amber-500/20 mb-6">
            <Sparkles className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-700 dark:text-amber-400">{t('sme.onboarding.badge')}</span>
          </div>

          <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            {t('sme.onboarding.title')}
          </h1>
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-2 max-w-2xl mx-auto">
            {t('sme.onboarding.subtitle')}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-500 max-w-lg mx-auto">
            {t('sme.onboarding.hint')}
          </p>
        </div>

        {/* Three Primary CTAs - Premium card design */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {/* Strategy Card - Recommended */}
          <Card
            className={cn(
              "relative overflow-hidden cursor-pointer group transition-all duration-300",
              "border-2 border-amber-500/30 hover:border-amber-500/60",
              "hover:shadow-xl hover:shadow-amber-500/10 hover:-translate-y-1",
              "dark:border-amber-500/20 dark:hover:border-amber-500/40"
            )}
            onClick={() => navigate('/strategy')}
          >
            {/* Recommended badge */}
            <div className="absolute top-0 right-0">
              <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-medium px-3 py-1 rounded-bl-lg">
                {t('sme.onboarding.cards.strategy.badge')}
              </div>
            </div>
            {/* Grain texture */}
            <div className="absolute inset-0 opacity-[0.02] pointer-events-none">
              <div className="w-full h-full" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }} />
            </div>

            <CardHeader className="relative text-center pb-4 pt-8">
              <div className={cn(
                "inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 mx-auto",
                "bg-gradient-to-br from-amber-500 to-amber-600",
                "shadow-lg shadow-amber-500/25",
                "group-hover:scale-110 transition-transform duration-300"
              )}>
                <Target className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl mb-2 text-slate-900 dark:text-slate-100">{t('sme.onboarding.cards.strategy.title')}</CardTitle>
              <CardDescription className="text-base text-slate-600 dark:text-slate-400">
                {t('sme.onboarding.cards.strategy.subtitle')}
              </CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <p className="text-sm text-slate-600 dark:text-slate-400 text-center mb-4">
                {t('sme.onboarding.cards.strategy.description')}
              </p>
              <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-500">
                <span className="text-sm font-medium">{t('sme.onboarding.cards.strategy.cta')}</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>

          {/* Persona Card */}
          <Card
            className={cn(
              "relative overflow-hidden cursor-pointer group transition-all duration-300",
              "border border-slate-200/80 dark:border-slate-700/80",
              "hover:border-blue-400/50 dark:hover:border-blue-500/50",
              "hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1"
            )}
            onClick={() => navigate('/persona')}
          >
            <CardHeader className="relative text-center pb-4">
              <div className={cn(
                "inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 mx-auto",
                "bg-gradient-to-br from-blue-500 to-blue-600",
                "shadow-lg shadow-blue-500/20",
                "group-hover:scale-110 transition-transform duration-300"
              )}>
                <Users className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl mb-2 text-slate-900 dark:text-slate-100">{t('sme.onboarding.cards.persona.title')}</CardTitle>
              <CardDescription className="text-base text-slate-600 dark:text-slate-400">
                {t('sme.onboarding.cards.persona.subtitle')}
              </CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <p className="text-sm text-slate-600 dark:text-slate-400 text-center mb-4">
                {t('sme.onboarding.cards.persona.description')}
              </p>
              <div className="flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                <span className="text-sm font-medium">{t('sme.onboarding.cards.persona.cta')}</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>

          {/* Quick Start Card */}
          <Card
            className={cn(
              "relative overflow-hidden cursor-pointer group transition-all duration-300",
              "border border-slate-200/80 dark:border-slate-700/80",
              "hover:border-amber-400/50 dark:hover:border-amber-500/50",
              "hover:shadow-xl hover:shadow-amber-500/10 hover:-translate-y-1"
            )}
            onClick={() => setShowQuickStart(true)}
          >
            <CardHeader className="relative text-center pb-4">
              <div className={cn(
                "inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 mx-auto",
                "bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-600 dark:to-slate-800",
                "shadow-lg shadow-slate-900/20",
                "group-hover:scale-110 transition-transform duration-300"
              )}>
                <Rocket className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl mb-2 text-slate-900 dark:text-slate-100">{t('sme.onboarding.cards.quickStart.title')}</CardTitle>
              <CardDescription className="text-base text-slate-600 dark:text-slate-400">
                {t('sme.onboarding.cards.quickStart.subtitle')}
              </CardDescription>
            </CardHeader>
            <CardContent className="relative">
              <p className="text-sm text-slate-600 dark:text-slate-400 text-center mb-4">
                {t('sme.onboarding.cards.quickStart.description')}
              </p>
              <div className="flex items-center justify-center gap-2 text-slate-500 dark:text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-500 transition-colors">
                <span className="text-sm font-medium">{t('sme.onboarding.cards.quickStart.cta')}</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Or Explore Divider - Premium styling */}
        <div className="relative py-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-600 to-transparent" />
          </div>
          <div className="relative flex justify-center">
            <span className={cn(
              "px-6 py-2 text-sm font-medium tracking-wide",
              "bg-white dark:bg-slate-900",
              "text-slate-500 dark:text-slate-400"
            )}>
              {t('sme.onboarding.divider')}
            </span>
          </div>
        </div>

        {/* Agent Categories - Premium card */}
        <Card className={cn(
          "relative overflow-hidden",
          "border border-slate-200/80 dark:border-slate-700/80",
          "shadow-xl shadow-slate-900/5 dark:shadow-black/20"
        )}>
          {/* Grain texture */}
          <div className="absolute inset-0 opacity-[0.015] pointer-events-none">
            <div className="w-full h-full" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }} />
          </div>

          <CardHeader className="relative border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-lg shadow-amber-500/20">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="font-serif text-xl text-slate-900 dark:text-slate-100">
                  {t('sme.onboarding.agentsTitle')}
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  {t('sme.onboarding.agentsSubtitle')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative p-6">
            <div className="space-y-4">
              <AgentCategory
                category={AGENT_CATEGORIES.foundation}
                categoryKey="foundation"
                t={t}
              />
              <AgentCategory
                category={AGENT_CATEGORIES.execution}
                categoryKey="execution"
                t={t}
              />
              <AgentCategory
                category={AGENT_CATEGORIES.intelligence}
                categoryKey="intelligence"
                t={t}
              />
            </div>
          </CardContent>
        </Card>

        {/* Trust Indicators - Refined styling */}
        <div className="text-center pt-6 pb-4">
          <div className="inline-flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {t('sme.onboarding.trust.noCreditCard')}
            </span>
            <span className="w-px h-4 bg-slate-300 dark:bg-slate-600" />
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {t('sme.onboarding.trust.dataSecure')}
            </span>
            <span className="w-px h-4 bg-slate-300 dark:bg-slate-600 hidden sm:block" />
            <span className="hidden sm:flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {t('sme.onboarding.trust.cancelAnytime')}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Start Modal */}
      <QuickStartModal
        open={showQuickStart}
        onOpenChange={setShowQuickStart}
        onComplete={handleQuickStartComplete}
      />
    </div>
  );
}