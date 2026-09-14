import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Target,
  ChevronDown,
  ChevronRight,
  Users,
  Calendar,
  DollarSign,
  Lightbulb
} from 'lucide-react';
import { getIntlLocale } from '@/lib/locales';

interface ActiveCampaign {
  name: string;
  budget_cents?: number;
  objectives?: string;
  target_audience?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  spent_cents?: number;
  metrics?: any;
  channel_breakdown?: {
    owned_media_percent?: number;
    earned_media_percent?: number;
    paid_media_percent?: number;
  };
  performance_metrics?: {
    impressions?: number;
    clicks?: number;
    conversions?: number;
    ctr?: number;
    conversion_rate?: number;
    cpa?: number;
    roas?: number;
  };
  platforms?: string[];
  content_themes?: string[];
  kpis?: Array<{
    metric: string;
    target: string;
    current: string;
    status: 'on-track' | 'behind' | 'ahead';
  }>;
}

interface ActiveCampaignCardProps {
  campaign: ActiveCampaign;
  isExpanded: boolean;
  onToggle: () => void;
}

export function ActiveCampaignCard({ campaign, isExpanded, onToggle }: ActiveCampaignCardProps) {
  const { t, i18n } = useTranslation('agents');
  const intlLocale = getIntlLocale(i18n.language);

  return (
    <Card className="border-slate-200 bg-slate-50/50 dark:bg-slate-950/20">
      <CardHeader className="pb-3">
        <Collapsible open={isExpanded} onOpenChange={onToggle}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-900/20 rounded p-2 -m-2">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-amber-600" />
                <CardTitle className="text-lg">{t('context.cards.activeCampaign.title')}</CardTitle>
                <Badge variant="secondary" className="bg-slate-100 text-slate-800 dark:bg-slate-950 dark:text-slate-200">
                  {campaign.status || 'Active'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </div>
            </div>
          </CollapsibleTrigger>
          <CardContent className="pt-3">
            {/* Collapsed View - Show more detail */}
            <CollapsibleContent className="space-y-0">
              <div className="space-y-3 mb-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="font-medium">{campaign.name}</div>
                    <div className="text-sm text-muted-foreground">{t('context.cards.activeCampaign.campaignName')}</div>
                  </div>
                  {campaign.budget_cents && (
                    <div>
                      <div className="font-medium">
                        ${(campaign.budget_cents / 100).toLocaleString(intlLocale)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {campaign.spent_cents
                          ? t('context.cards.activeCampaign.percentSpent', { percent: Math.round((campaign.spent_cents / campaign.budget_cents) * 100) })
                          : t('context.cards.activeCampaign.campaignBudget')}
                      </div>
                    </div>
                  )}
                  {campaign.target_audience && (
                    <div>
                      <div className="font-medium text-sm">{campaign.target_audience}</div>
                      <div className="text-sm text-muted-foreground">{t('context.cards.activeCampaign.targetAudience')}</div>
                    </div>
                  )}
                </div>

                {campaign.objectives && (
                  <div>
                    <div className="text-sm font-medium">{t('context.cards.activeCampaign.objectives')}</div>
                    <div className="text-xs text-muted-foreground">{campaign.objectives}</div>
                  </div>
                )}

                {/* Show timeline if available */}
                {(campaign.start_date || campaign.end_date) && (
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {campaign.start_date && (
                      <span>{new Date(campaign.start_date).toLocaleDateString(intlLocale)}</span>
                    )}
                    {campaign.start_date && campaign.end_date && <span>→</span>}
                    {campaign.end_date && (
                      <span>{new Date(campaign.end_date).toLocaleDateString(intlLocale)}</span>
                    )}
                  </div>
                )}

                {/* Show platforms if available */}
                {campaign.platforms && campaign.platforms.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {campaign.platforms.slice(0, 5).map((platform, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {platform}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CollapsibleContent>

            {/* Expanded View */}
            <CollapsibleContent>
              <div className="space-y-4">
                <div className="border rounded-lg p-4 space-y-4 bg-white/50 dark:bg-gray-900/50">
                  {/* Campaign Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-base">{campaign.name}</div>
                      {campaign.target_audience && (
                        <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Users className="h-3 w-3" />
                          {campaign.target_audience}
                        </div>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs capitalize">
                      {campaign.status || 'Active'}
                    </Badge>
                  </div>

                  {/* Campaign Timeline */}
                  {(campaign.start_date || campaign.end_date) && (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {campaign.start_date && (
                        <div>
                          <div className="font-medium text-sm mb-1">{t('context.cards.activeCampaign.startDate')}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(campaign.start_date).toLocaleDateString(intlLocale)}
                          </div>
                        </div>
                      )}
                      {campaign.end_date && (
                        <div>
                          <div className="font-medium text-sm mb-1">{t('context.cards.activeCampaign.endDate')}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(campaign.end_date).toLocaleDateString(intlLocale)}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Budget & Spend */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {campaign.budget_cents && (
                      <div>
                        <div className="font-medium text-sm mb-1 flex items-center gap-1">
                          <DollarSign className="h-3 w-3 text-green-600" />
                          {t('context.cards.activeCampaign.totalBudget')}
                        </div>
                        <div className="text-lg font-semibold">
                          ${(campaign.budget_cents / 100).toLocaleString(intlLocale)}
                        </div>
                      </div>
                    )}
                    {campaign.spent_cents && (
                      <div>
                        <div className="font-medium text-sm mb-1">{t('context.cards.activeCampaign.spentToDate')}</div>
                        <div className="text-lg font-semibold">
                          ${(campaign.spent_cents / 100).toLocaleString(intlLocale)}
                        </div>
                        {campaign.budget_cents && (
                          <div className="text-xs text-muted-foreground">
                            {t('context.cards.activeCampaign.percentUtilized', { percent: Math.round((campaign.spent_cents / campaign.budget_cents) * 100) })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Channel Breakdown */}
                  {campaign.channel_breakdown && (
                    <div>
                      <div className="font-medium text-sm mb-2">{t('context.cards.activeCampaign.channelStrategy')}</div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-blue-50 dark:bg-blue-950/20 p-2 rounded">
                          <div className="font-medium text-blue-800 dark:text-blue-200">{t('context.cards.activeCampaign.ownedMedia')}</div>
                          <div className="text-xl font-bold text-blue-600">
                            {campaign.channel_breakdown.owned_media_percent || 70}%
                          </div>
                        </div>
                        <div className="bg-green-50 dark:bg-green-950/20 p-2 rounded">
                          <div className="font-medium text-green-800 dark:text-green-200">{t('context.cards.activeCampaign.earnedMedia')}</div>
                          <div className="text-xl font-bold text-green-600">
                            {campaign.channel_breakdown.earned_media_percent || 20}%
                          </div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-950/20 p-2 rounded">
                          <div className="font-medium text-slate-800 dark:text-slate-200">{t('context.cards.activeCampaign.paidMedia')}</div>
                          <div className="text-xl font-bold text-amber-600">
                            {campaign.channel_breakdown.paid_media_percent || 10}%
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Platforms */}
                  {campaign.platforms && campaign.platforms.length > 0 && (
                    <div>
                      <div className="font-medium text-sm mb-1">{t('context.cards.activeCampaign.activePlatforms')}</div>
                      <div className="flex flex-wrap gap-1">
                        {campaign.platforms.map((platform, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {platform}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Content Themes */}
                  {campaign.content_themes && campaign.content_themes.length > 0 && (
                    <div>
                      <div className="font-medium text-sm mb-1">{t('context.cards.activeCampaign.contentThemes')}</div>
                      <div className="flex flex-wrap gap-1">
                        {campaign.content_themes.map((theme, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {theme}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Performance Metrics */}
                  {campaign.performance_metrics && (
                    <div>
                      <div className="font-medium text-sm mb-2 flex items-center gap-1">
                        <Target className="h-3 w-3 text-amber-600" />
                        {t('context.cards.activeCampaign.performanceMetrics')}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        {campaign.performance_metrics.impressions && (
                          <div>
                            <div className="font-medium">{t('context.cards.activeCampaign.metrics.impressions')}</div>
                            <div className="text-muted-foreground">
                              {campaign.performance_metrics.impressions.toLocaleString(intlLocale)}
                            </div>
                          </div>
                        )}
                        {campaign.performance_metrics.clicks && (
                          <div>
                            <div className="font-medium">{t('context.cards.activeCampaign.metrics.clicks')}</div>
                            <div className="text-muted-foreground">
                              {campaign.performance_metrics.clicks.toLocaleString(intlLocale)}
                            </div>
                          </div>
                        )}
                        {campaign.performance_metrics.ctr && (
                          <div>
                            <div className="font-medium">{t('context.cards.activeCampaign.metrics.ctr')}</div>
                            <div className="text-muted-foreground">
                              {(campaign.performance_metrics.ctr * 100).toFixed(2)}%
                            </div>
                          </div>
                        )}
                        {campaign.performance_metrics.conversions && (
                          <div>
                            <div className="font-medium">{t('context.cards.activeCampaign.metrics.conversions')}</div>
                            <div className="text-muted-foreground">
                              {campaign.performance_metrics.conversions.toLocaleString(intlLocale)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* KPIs */}
                  {campaign.kpis && campaign.kpis.length > 0 && (
                    <div>
                      <div className="font-medium text-sm mb-2">{t('context.cards.activeCampaign.kpis')}</div>
                      <div className="space-y-2">
                        {campaign.kpis.map((kpi, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between text-xs border rounded p-2"
                          >
                            <div>
                              <div className="font-medium">{kpi.metric}</div>
                              <div className="text-muted-foreground">{t('context.cards.activeCampaign.target')}: {kpi.target}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">{kpi.current}</div>
                              <Badge
                                variant={
                                  kpi.status === 'ahead'
                                    ? 'default'
                                    : kpi.status === 'on-track'
                                      ? 'secondary'
                                      : 'destructive'
                                }
                                className="text-xs"
                              >
                                {kpi.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Objectives */}
                  {campaign.objectives && (
                    <div>
                      <div className="font-medium text-sm mb-1 flex items-center gap-1">
                        <Lightbulb className="h-3 w-3 text-amber-600" />
                        {t('context.cards.activeCampaign.campaignObjectives')}
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {campaign.objectives}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CollapsibleContent>
          </CardContent>
        </Collapsible>
      </CardHeader>
    </Card>
  );
}
