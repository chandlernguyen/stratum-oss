import { useDashboardMetrics, useDashboardClients } from '@/hooks/data/useDashboardMetrics';
import type { DashboardMetrics } from '@/hooks/data/useDashboardMetrics';
import { Onboarding } from './agency-states/Onboarding';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  DollarSign,
  Target,
  Plus,
  ArrowRight,
  UserPlus,
  BarChart3,
  Briefcase,
  TrendingUp,
  Zap
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOrganization } from '@/hooks/data/useOrganization';
import { useUserRoles } from '@/hooks/useUserRoles';
import { useCrossClientAnalytics } from '@/hooks/data/useCrossClientAnalytics';
import { ApprovalQueue } from '@/components/collaboration/ApprovalQueue';
import { cn } from '@/lib/utils';
import { LayeredSpinner } from '@/components/ui/layered-icon';
import { useTranslation } from 'react-i18next';
import { getIntlLocale } from '@/lib/locales';

// Premium metric card for agency dashboard
function AgencyMetricCard({
  icon: Icon,
  label,
  value,
  subtitle,
  accentColor = 'slate'
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subtitle?: string;
  accentColor?: 'gold' | 'slate' | 'emerald' | 'blue';
}) {
  const accentClasses = {
    gold: 'from-amber-500/10 to-amber-600/5 dark:from-amber-500/20 dark:to-amber-600/10',
    slate: 'from-slate-500/10 to-slate-600/5 dark:from-slate-500/20 dark:to-slate-600/10',
    emerald: 'from-emerald-500/10 to-emerald-600/5 dark:from-emerald-500/20 dark:to-emerald-600/10',
    blue: 'from-blue-500/10 to-blue-600/5 dark:from-blue-500/20 dark:to-blue-600/10'
  };

  const iconClasses = {
    gold: 'text-amber-600 dark:text-amber-400',
    slate: 'text-slate-600 dark:text-slate-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    blue: 'text-blue-600 dark:text-blue-400'
  };

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border border-slate-200/60 dark:border-slate-700/60",
      "bg-gradient-to-br", accentClasses[accentColor],
      "p-5 transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50",
      "hover:-translate-y-0.5 group"
    )}>
      <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03] pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMSIvPjwvc3ZnPg==')]" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className={cn(
            "p-2 rounded-xl bg-white/60 dark:bg-slate-800/60 shadow-sm",
            "group-hover:scale-105 transition-transform duration-300"
          )}>
            <Icon className={cn("w-5 h-5", iconClasses[accentColor])} />
          </div>
        </div>

        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
          {label}
        </p>
        <p className="font-serif text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          {value}
        </p>
        {subtitle && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

// Client card with premium styling
function ClientCard({
  client,
  onClick
}: {
  client: {
    id: string;
    name: string;
    slug: string;
    status?: string;
    industry?: string;
    campaigns_count?: number;
    active_campaigns?: number;
  };
  onClick: () => void;
}) {
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400';
      case 'paused':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400';
      case 'churned':
        return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400';
    }
  };

  return (
    <div
      data-testid="client-card"
      onClick={onClick}
      className={cn(
        "group relative p-5 rounded-2xl border cursor-pointer",
        "bg-white dark:bg-slate-900/50",
        "border-slate-200/80 dark:border-slate-700/80",
        "hover:border-amber-300 dark:hover:border-amber-700",
        "hover:shadow-xl hover:shadow-slate-200/40 dark:hover:shadow-slate-900/40",
        "transition-all duration-300 hover:-translate-y-1"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h4 className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
              {client.name}
            </h4>
            <Badge className={cn("text-xs font-medium border-0", getStatusStyles(client.status || 'active'))}>
              {client.status || 'active'}
            </Badge>
            {client.industry && (
              <Badge variant="outline" className="text-xs">
                {client.industry}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <Target className="w-3.5 h-3.5" />
              {client.campaigns_count || 0} campaigns
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              {client.active_campaigns || 0} active
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <Button asChild variant="outline" size="sm" className="h-9 w-9 p-0">
            <Link to={`/clients/${client.slug}`}>
              <BarChart3 className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <ArrowRight className="w-5 h-5 text-slate-400 dark:text-slate-500 ml-4 shrink-0 group-hover:text-amber-600 dark:group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
      </div>
    </div>
  );
}

const getAgencyDashboardState = (metrics: DashboardMetrics) => {
  if (metrics.clientCount === 0) {
    return 'ONBOARDING';
  }
  return 'ENTERPRISE';
};

export function AgencyDashboard() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('dashboard');
  const intlLocale = getIntlLocale(i18n.language);
  const { data: metrics, isLoading, error } = useDashboardMetrics();
  const { organization } = useOrganization();
  const { canManageClients } = useUserRoles();
  const { data: clients = [], isLoading: clientsLoading } = useDashboardClients(20);

  useCrossClientAnalytics();

  const calculatedMetrics = {
    activeClients: clients.filter(c => c.status === 'active').length,
    totalCampaigns: clients.reduce((sum, c) => sum + (c.campaigns_count || 0), 0),
    activeCampaigns: clients.reduce((sum, c) => sum + (c.active_campaigns || 0), 0),
  };

  const isDataLoading = clientsLoading;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(intlLocale, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <LayeredSpinner size="lg" />
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('agency.loading.agencyData')}</p>
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

  if (metrics) {
    const dashboardState = getAgencyDashboardState(metrics);
    if (dashboardState === 'ONBOARDING') {
      return <Onboarding />;
    }
  }

  if (isDataLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <LayeredSpinner size="lg" />
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('agency.loading.clientPortfolio')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Agency Hero Header */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-8 md:p-10">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-amber-500/10 to-transparent rounded-full blur-2xl" />

        {/* Grain texture */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIzMDAiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMSIvPjwvc3ZnPg==')]" />

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-xl bg-blue-500/20 backdrop-blur-sm">
                  <Briefcase className="w-5 h-5 text-blue-400" />
                </div>
                <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10 text-xs">
                  {t('agency.header.badge')}
                </Badge>
              </div>

              <h1 className="font-serif text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">
                {t('agency.header.title', { name: organization?.name || 'Agency' })}
              </h1>
              <p className="text-slate-300 text-lg">
                {t('agency.header.subtitleText', { clientCount: metrics?.clientCount || 0, campaignCount: calculatedMetrics.totalCampaigns })}
              </p>
            </div>

            {canManageClients && (
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  asChild
                  variant="outline"
                  className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:border-white/50 backdrop-blur-sm"
                >
                  <Link to="/clients">
                    <Users className="w-4 h-4 mr-2" />
                    {t('agency.actions.manageClients')}
                  </Link>
                </Button>
                <Button
                  asChild
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/25 border-0"
                >
                  <Link to="/clients/new">
                    <UserPlus className="w-4 h-4 mr-2" />
                    {t('agency.actions.addClient')}
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Metrics Grid */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AgencyMetricCard
          icon={Building2}
          label={t('agency.metrics.totalClients')}
          value={metrics?.clientCount || 0}
          subtitle={t('agency.metrics.activeCount', { count: calculatedMetrics.activeClients })}
          accentColor="blue"
        />
        <AgencyMetricCard
          icon={DollarSign}
          label={t('agency.metrics.monthlyRevenue')}
          value={formatCurrency(metrics?.totalRevenue || 0)}
          subtitle={t('agency.metrics.avgPerClient', { amount: formatCurrency(metrics?.avgClientValue || 0) })}
          accentColor="gold"
        />
        <AgencyMetricCard
          icon={Target}
          label={t('agency.metrics.activeCampaigns')}
          value={calculatedMetrics.activeCampaigns}
          subtitle={t('agency.metrics.ofTotal', { total: calculatedMetrics.totalCampaigns })}
          accentColor="emerald"
        />
        <AgencyMetricCard
          icon={TrendingUp}
          label={t('agency.metrics.avgCampaignsPerClient')}
          value={metrics?.clientCount ? (calculatedMetrics.totalCampaigns / metrics.clientCount).toFixed(1) : '0'}
          subtitle={t('agency.metrics.perClient')}
          accentColor="slate"
        />
      </section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client Portfolio - Takes 2 columns */}
        <div className="lg:col-span-2">
          <Card className="border-slate-200/60 dark:border-slate-700/60 shadow-sm overflow-hidden" data-testid="client-portfolio">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-serif text-xl font-semibold text-slate-900 dark:text-slate-100" data-testid="client-portfolio-heading">
                    {t('agency.portfolio.title')}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {t('agency.portfolio.subtitle')}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {t('agency.portfolio.clientCount', { count: clients.length })}
                </Badge>
              </div>

              {clients.length === 0 ? (
                <div className="text-center py-12">
                  <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 inline-block mb-4">
                    <Building2 className="w-10 h-10 text-slate-400 dark:text-slate-500" />
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 mb-4">{t('agency.portfolio.noClients')}</p>
                  {canManageClients && (
                    <Button asChild className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white border-0">
                      <Link to="/clients/new">
                        <Plus className="w-4 h-4 mr-2" />
                        {t('agency.actions.addFirstClient')}
                      </Link>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {clients.slice(0, 6).map((client) => (
                    <ClientCard
                      key={client.id}
                      client={client}
                      onClick={() => navigate(`/clients/${client.slug}`)}
                    />
                  ))}

                  {clients.length > 6 && (
                    <Button asChild variant="outline" className="w-full mt-4">
                      <Link to="/clients">
                        {t('agency.actions.viewAllClientsCount', { count: clients.length })}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Pending Approvals */}
          <ApprovalQueue maxItems={5} />

          {/* Quick Actions */}
          <Card className="border-slate-200/60 dark:border-slate-700/60 shadow-sm">
            <CardContent className="p-5">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">
                {t('agency.quickActions.title')}
              </h3>
              <div className="space-y-2">
                <Button asChild variant="ghost" className="w-full justify-start h-11 text-slate-700 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-400">
                  <Link to="/clients/new">
                    <UserPlus className="w-4 h-4 mr-3 text-slate-500" />
                    {t('agency.actions.addNewClient')}
                  </Link>
                </Button>
                <Button asChild variant="ghost" className="w-full justify-start h-11 text-slate-700 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-400">
                  <Link to="/clients">
                    <Users className="w-4 h-4 mr-3 text-slate-500" />
                    {t('agency.actions.viewAllClients')}
                  </Link>
                </Button>
                <Button asChild variant="ghost" className="w-full justify-start h-11 text-slate-700 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-400">
                  <Link to="/settings/team">
                    <Briefcase className="w-4 h-4 mr-3 text-slate-500" />
                    {t('agency.actions.manageTeam')}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
