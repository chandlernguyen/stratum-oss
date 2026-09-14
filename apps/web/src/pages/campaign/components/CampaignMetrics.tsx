import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { DollarSign, TrendingUp, Calendar, BarChart } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';
import { getIntlLocale } from '@/lib/locales';

interface Campaign {
  budget_cents?: number;
  spent_cents?: number;
  start_date?: string;
  end_date?: string;
  performance_score?: number;
}

interface CampaignMetricsProps {
  campaign: Campaign;
  formatCurrency: (cents: number) => string;
  calculateProgress: () => number;
}

export function CampaignMetrics({
  campaign,
  formatCurrency,
  calculateProgress,
}: CampaignMetricsProps) {
  const { locale } = useLocale();
  const intlLocale = getIntlLocale(locale);

  // Guard against undefined campaign
  if (!campaign) {
    return null;
  }

  const progress = calculateProgress();

  const calculateDaysRemaining = () => {
    if (!campaign.end_date) return null;
    const today = new Date();
    const endDate = new Date(campaign.end_date);
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysRemaining = calculateDaysRemaining();

  return (
    <>
      {/* Key Metrics - Mobile: 2x2 Grid | Desktop: 4 Columns */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold">
              {formatCurrency(campaign.budget_cents || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Spent</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold">
              {formatCurrency(campaign.spent_cents || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {campaign.budget_cents
                ? `${Math.round(((campaign.spent_cents || 0) / campaign.budget_cents) * 100)}% of budget`
                : 'No budget set'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Duration</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold">
              {daysRemaining !== null
                ? daysRemaining > 0
                  ? `${daysRemaining} days`
                  : 'Ended'
                : 'No end date'}
            </div>
            <p className="text-xs text-muted-foreground">
              {campaign.start_date && campaign.end_date
                ? `${new Date(campaign.start_date).toLocaleDateString(intlLocale)} - ${new Date(campaign.end_date).toLocaleDateString(intlLocale)}`
                : 'Not scheduled'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Performance</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg md:text-2xl font-bold">
              {campaign.performance_score
                ? `${Math.round(campaign.performance_score)}%`
                : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">Overall score</p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Progress */}
      {(campaign.budget_cents ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Budget Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatCurrency(campaign.spent_cents || 0)} spent</span>
                <span>
                  {formatCurrency((campaign.budget_cents || 0) - (campaign.spent_cents || 0))} remaining
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
