import { useDashboardMetrics, useRecentActivity } from '@/hooks/data/useDashboardMetrics';
import { GettingStartedRefined } from './sme-states/GettingStartedRefined';
import { CampaignReadinessBanner } from './CampaignReadinessBanner';
import { useIntelligenceReadiness } from '@/hooks/data/useIntelligenceReadiness';
import { ApprovalQueue } from '@/components/collaboration/ApprovalQueue';
import {
  TrendingUp,
  Sparkles,
  Brain,
  Rocket,
  ArrowRight,
  Clock,
  Zap,
  BarChart3,
  Users,
  FileText,
  Lightbulb
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LayeredSpinner } from '@/components/ui/layered-icon';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/config/routes';
import { useTranslation } from 'react-i18next';
import { formatRelativeTime } from '@/lib/i18n';
import { cn } from '@/lib/utils';

// Metric card component with refined styling
function MetricCard({
  icon: Icon,
  label,
  value,
  subtitle,
  trend,
  accentColor = 'gold'
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: { value: number; label: string };
  accentColor?: 'gold' | 'slate' | 'emerald';
}) {
  const accentClasses = {
    gold: 'from-amber-500/10 to-amber-600/5 dark:from-amber-500/20 dark:to-amber-600/10',
    slate: 'from-slate-500/10 to-slate-600/5 dark:from-slate-500/20 dark:to-slate-600/10',
    emerald: 'from-emerald-500/10 to-emerald-600/5 dark:from-emerald-500/20 dark:to-emerald-600/10'
  };

  const iconClasses = {
    gold: 'text-amber-600 dark:text-amber-400',
    slate: 'text-slate-600 dark:text-slate-400',
    emerald: 'text-emerald-600 dark:text-emerald-400'
  };

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border border-slate-200/60 dark:border-slate-700/60",
      "bg-gradient-to-br", accentClasses[accentColor],
      "p-5 transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50",
      "hover:-translate-y-0.5 group"
    )}>
      {/* Subtle grain texture overlay */}
      <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03] pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMSIvPjwvc3ZnPg==')]" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className={cn(
            "p-2 rounded-xl bg-white/60 dark:bg-slate-800/60 shadow-sm",
            "group-hover:scale-105 transition-transform duration-300"
          )}>
            <Icon className={cn("w-5 h-5", iconClasses[accentColor])} />
          </div>
          {trend && (
            <Badge
              variant="secondary"
              className={cn(
                "text-xs font-medium",
                trend.value >= 0
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              )}
            >
              {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
            </Badge>
          )}
        </div>

        <p className="text-xs font-medium text-foreground/80 uppercase tracking-wider mb-1">
          {label}
        </p>
        <p className="font-serif text-3xl font-bold text-foreground tracking-tight">
          {value}
        </p>
        {subtitle && (
          <p className="text-sm text-foreground/70 mt-1">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

// Intelligence recommendation card
function RecommendationCard({
  title,
  description,
  priority,
  actionUrl,
  icon: Icon,
  highImpactLabel,
  timeLabel
}: {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionUrl: string;
  icon: React.ElementType;
  highImpactLabel: string;
  timeLabel: string;
}) {
  return (
    <Link
      to={actionUrl}
      className={cn(
        "group block p-5 rounded-2xl border transition-all duration-300",
        "bg-white dark:bg-slate-900/50",
        priority === 'high'
          ? "border-amber-200 dark:border-amber-800/50 hover:border-amber-400 dark:hover:border-amber-600"
          : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600",
        "hover:shadow-xl hover:shadow-slate-200/40 dark:hover:shadow-slate-900/40",
        "hover:-translate-y-1"
      )}
    >
      <div className="flex items-start gap-4">
        <div className={cn(
          "p-3 rounded-xl shrink-0 transition-all duration-300",
          priority === 'high'
            ? "bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/40 dark:to-amber-800/20"
            : "bg-slate-100 dark:bg-slate-800",
          "group-hover:scale-105"
        )}>
          <Icon className={cn(
            "w-5 h-5",
            priority === 'high' ? "text-amber-600 dark:text-amber-400" : "text-slate-600 dark:text-slate-400"
          )} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            {priority === 'high' && (
              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 border-0 text-xs font-semibold">
                {highImpactLabel}
              </Badge>
            )}
            <span className="flex items-center text-xs text-slate-500 dark:text-slate-400">
              <Clock className="w-3 h-3 mr-1" />
              {timeLabel}
            </span>
          </div>

          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
            {title}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
            {description}
          </p>
        </div>

        <ArrowRight className="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0 mt-1 group-hover:text-amber-600 dark:group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
      </div>
    </Link>
  );
}

// Recent output item
function OutputItem({
  title,
  agentType,
  createdAt,
  locale
}: {
  title: string;
  agentType: string;
  createdAt: string;
  locale: string;
}) {
  const agentConfig: Record<string, { icon: React.ElementType; color: string }> = {
    strategy: { icon: Brain, color: 'text-blue-600 dark:text-blue-400' },
    persona: { icon: Users, color: 'text-amber-600 dark:text-amber-400' },
    'marketing-strategy': { icon: Lightbulb, color: 'text-emerald-600 dark:text-emerald-400' },
    content: { icon: FileText, color: 'text-orange-600 dark:text-orange-400' },
  };

  const config = agentConfig[agentType] || { icon: FileText, color: 'text-slate-600 dark:text-slate-400' };
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0 group cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/50 -mx-3 px-3 rounded-lg transition-colors">
      <div className={cn("p-2 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0", config.color)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
          {title}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {formatRelativeTime(createdAt, locale as 'en' | 'vi')}
        </p>
      </div>
    </div>
  );
}

export function SMEDashboard() {
  const { t, i18n } = useTranslation('dashboard');
  const { data: metrics, isLoading, error } = useDashboardMetrics();
  const { data: intelligenceReadiness } = useIntelligenceReadiness();
  const { data: recentActivity = [], isLoading: activityLoading } = useRecentActivity(5);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <LayeredSpinner size="lg" />
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('loading.intelligence')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/30">
          <Zap className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
        <p className="text-sm text-red-600 dark:text-red-400">{t('error.message', { message: error.message })}</p>
      </div>
    );
  }

  // Show special onboarding for complete beginners only
  if (metrics && metrics.campaignCount === 0 && (metrics.documentCount || 0) === 0) {
    return <GettingStartedRefined />;
  }

  if (activityLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <LayeredSpinner size="lg" />
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('loading.data')}</p>
      </div>
    );
  }

  // Intelligence recommendations
  const recommendations = [
    {
      id: '1',
      title: t('recommendations.items.personaAnalysis.title'),
      description: t('recommendations.items.personaAnalysis.description'),
      agent_type: 'persona',
      estimated_time: 15,
      priority: 'high' as const,
      action_url: '/persona',
      icon: Users
    },
    {
      id: '2',
      title: t('recommendations.items.marketingStrategy.title'),
      description: t('recommendations.items.marketingStrategy.description'),
      agent_type: 'marketing-strategy',
      estimated_time: 20,
      priority: 'high' as const,
      action_url: '/marketing-strategy',
      icon: Lightbulb
    },
    {
      id: '3',
      title: t('recommendations.items.contentGeneration.title'),
      description: t('recommendations.items.contentGeneration.description'),
      agent_type: 'content',
      estimated_time: 10,
      priority: 'medium' as const,
      action_url: '/content',
      icon: FileText
    }
  ];

  const recentOutputs = recentActivity.slice(0, 5).map((activity) => ({
    id: activity.id,
    agent_type: activity.agent || 'strategy',
    title: activity.description,
    created_at: activity.timestamp
  }));

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Hero Section - Welcome & Primary CTA */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-8 md:p-10">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-amber-500/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-slate-600/20 to-transparent rounded-full blur-2xl" />

        {/* Grain texture */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMSIvPjwvc3ZnPg==')]" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-amber-500/20 backdrop-blur-sm">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/10 text-xs">
              {t('hero.badge')}
            </Badge>
          </div>

          <h1 className="font-serif text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">
            {t('hero.title')}
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl mb-6">
            {t('hero.subtitle')}
          </p>

          <Button
            asChild
            size="lg"
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/25 border-0"
          >
            <Link to={ROUTES.agents.strategy.root}>
              <Zap className="w-4 h-4 mr-2" />
              {t('hero.cta')}
            </Link>
          </Button>
        </div>
      </section>

      {/* Campaign Readiness Banner */}
      {intelligenceReadiness && !intelligenceReadiness.isReady && (
        <CampaignReadinessBanner
          isReady={intelligenceReadiness.isReady}
          completionPercentage={intelligenceReadiness.readinessScore}
          hasStrategy={intelligenceReadiness.hasStrategy}
          hasPersona={intelligenceReadiness.hasPersona}
          hasMarketingStrategy={intelligenceReadiness.hasMarketingStrategy}
        />
      )}

      {/* Metrics Grid */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Brain}
          label={t('stats.intelligenceOutputs')}
          value={recentActivity.length}
          subtitle={t('stats.subtitles.strategicDocuments')}
          accentColor="gold"
        />
        <MetricCard
          icon={Sparkles}
          label={t('stats.aiInteractions')}
          value={metrics?.totalAIInteractions || 0}
          subtitle={t('stats.subtitles.agentSessions')}
          accentColor="slate"
        />
        <MetricCard
          icon={Rocket}
          label={t('stats.activeCampaigns')}
          value={metrics?.activeCampaigns || 0}
          subtitle={t('stats.subtitles.inProgress')}
          accentColor="emerald"
        />
        <MetricCard
          icon={TrendingUp}
          label={t('stats.strategySessions')}
          value={metrics?.campaignCount || 0}
          subtitle={t('stats.subtitles.completed')}
          accentColor="gold"
        />
      </section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recommendations - Takes 2 columns */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-serif text-xl font-semibold text-slate-900 dark:text-slate-100">
              {t('recommendations.title')}
            </h2>
            <Badge variant="outline" className="text-xs">
              {t('recommendations.available', { count: recommendations.length })}
            </Badge>
          </div>

          <div className="space-y-3">
            {recommendations.map((rec) => (
              <RecommendationCard
                key={rec.id}
                title={rec.title}
                description={rec.description}
                priority={rec.priority}
                actionUrl={rec.action_url}
                icon={rec.icon}
                highImpactLabel={t('recommendations.highImpact')}
                timeLabel={t('recommendations.estimatedTime', { time: rec.estimated_time })}
              />
            ))}
          </div>
        </div>

        {/* Sidebar - Recent Intelligence */}
        <div className="space-y-6">
          {/* Recent Outputs */}
          <Card className="border-slate-200/60 dark:border-slate-700/60 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-slate-500" />
                  {t('recentIntelligence.title')}
                </h3>
                <Button variant="ghost" size="sm" asChild className="text-xs">
                  <Link to={ROUTES.outputs.root}>
                    {t('recentIntelligence.viewAll')}
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Link>
                </Button>
              </div>

              {recentOutputs.length > 0 ? (
                <div className="space-y-0">
                  {recentOutputs.map((output) => (
                    <OutputItem
                      key={output.id}
                      title={output.title}
                      agentType={output.agent_type}
                      createdAt={output.created_at}
                      locale={i18n.language}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Brain className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t('recentIntelligence.emptyState')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Approval Queue */}
          <ApprovalQueue maxItems={3} />
        </div>
      </div>
    </div>
  );
}