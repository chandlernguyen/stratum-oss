import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useLocale } from '@/hooks/useLocale';
import { getIntlLocale } from '@/lib/locales';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { TrendingUp, DollarSign, Target, PieChartIcon } from 'lucide-react';
import { useCampaignMetrics } from '@/hooks/data/useCampaignMetrics';

interface HistoricalPerformanceChartsProps {
  campaignName?: string;
  startDate?: string;
  endDate?: string;
}

const COLORS = ['#3b82f6', '#F59E0B', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

export function HistoricalPerformanceCharts({
  campaignName,
  startDate,
  endDate
}: HistoricalPerformanceChartsProps) {
  const { locale } = useLocale('common');
  const { data: metrics = [], isLoading } = useCampaignMetrics({
    campaignName,
    startDate,
    endDate,
  });

  // 1. Time series data (spend vs revenue over time)
  const timeSeriesData = useMemo(() => {
    // Group by date and sum metrics
    const grouped = metrics.reduce((acc, metric) => {
      const date = metric.metric_date;
      if (!acc[date]) {
        acc[date] = { date, spend: 0, revenue: 0, count: 0 };
      }
      acc[date].spend += metric.spend;
      acc[date].revenue += (metric.revenue || 0);
      acc[date].count += 1;
      return acc;
    }, {} as Record<string, { date: string; spend: number; revenue: number; count: number }>);

    return Object.values(grouped)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(item => ({
        date: new Date(item.date).toLocaleDateString(getIntlLocale(locale), { month: 'short', day: 'numeric' }),
        spend: parseFloat(item.spend.toFixed(2)),
        revenue: parseFloat(item.revenue.toFixed(2)),
        roi: item.spend > 0 ? parseFloat((((item.revenue - item.spend) / item.spend) * 100).toFixed(2)) : 0
      }));
  }, [metrics, locale]);

  // 2. ROI trend over time
  const roiTrendData = useMemo(() => {
    return timeSeriesData.map(item => ({
      date: item.date,
      roi: item.roi
    }));
  }, [timeSeriesData]);

  // 3. Performance by campaign
  const campaignPerformanceData = useMemo(() => {
    const grouped = metrics.reduce((acc, metric) => {
      const name = metric.campaign_name;
      if (!acc[name]) {
        acc[name] = { name, spend: 0, revenue: 0, impressions: 0, clicks: 0 };
      }
      acc[name].spend += metric.spend;
      acc[name].revenue += (metric.revenue || 0);
      acc[name].impressions += (metric.impressions || 0);
      acc[name].clicks += (metric.clicks || 0);
      return acc;
    }, {} as Record<string, { name: string; spend: number; revenue: number; impressions: number; clicks: number }>);

    return Object.values(grouped)
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 10) // Top 10 campaigns
      .map(item => ({
        name: item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name,
        spend: parseFloat(item.spend.toFixed(2)),
        revenue: parseFloat(item.revenue.toFixed(2)),
        roi: item.spend > 0 ? parseFloat((((item.revenue - item.spend) / item.spend) * 100).toFixed(2)) : 0
      }));
  }, [metrics]);

  // 4. Performance by source
  const sourcePerformanceData = useMemo(() => {
    const grouped = metrics.reduce((acc, metric) => {
      const source = metric.source || 'manual';
      if (!acc[source]) {
        acc[source] = { source, spend: 0, revenue: 0, count: 0 };
      }
      acc[source].spend += metric.spend;
      acc[source].revenue += (metric.revenue || 0);
      acc[source].count += 1;
      return acc;
    }, {} as Record<string, { source: string; spend: number; revenue: number; count: number }>);

    return Object.values(grouped).map(item => ({
      name: item.source.replace('_', ' ').toUpperCase(),
      value: parseFloat(item.spend.toFixed(2)),
      revenue: parseFloat(item.revenue.toFixed(2)),
      count: item.count
    }));
  }, [metrics]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
          <p className="font-medium mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.name.includes('ROI') ? `${entry.value}%` : `$${entry.value.toFixed(2)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardContent className="pt-6 h-80 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (metrics.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center py-12">
          <TrendingUp className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p className="text-gray-600 dark:text-gray-400">No data available for charts</p>
          <p className="text-sm text-gray-500">Add campaign metrics to see performance visualizations</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Spend vs Revenue Over Time */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Spend vs Revenue Trend
          </CardTitle>
          <CardDescription>
            Daily campaign spend and revenue comparison
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis
                dataKey="date"
                className="text-xs"
                tick={{ fill: 'currentColor' }}
              />
              <YAxis
                className="text-xs"
                tick={{ fill: 'currentColor' }}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="spend"
                stackId="1"
                stroke="#ef4444"
                fill="#ef4444"
                fillOpacity={0.6}
                name="Spend"
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stackId="2"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.6}
                name="Revenue"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 2. ROI Trend Over Time */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            ROI Trend
          </CardTitle>
          <CardDescription>
            Return on investment performance over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={roiTrendData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis
                dataKey="date"
                className="text-xs"
                tick={{ fill: 'currentColor' }}
              />
              <YAxis
                className="text-xs"
                tick={{ fill: 'currentColor' }}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="roi"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                name="ROI"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 3. Performance by Campaign */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Top Campaigns by Spend
          </CardTitle>
          <CardDescription>
            Campaign performance comparison (top 10)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={campaignPerformanceData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis
                type="number"
                className="text-xs"
                tick={{ fill: 'currentColor' }}
                tickFormatter={(value) => `$${value}`}
              />
              <YAxis
                dataKey="name"
                type="category"
                width={150}
                className="text-xs"
                tick={{ fill: 'currentColor' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="spend" fill="#ef4444" name="Spend" />
              <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 4. Performance by Source */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            Spend by Source
          </CardTitle>
          <CardDescription>
            Distribution of campaign spend across platforms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={sourcePerformanceData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: any) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {sourcePerformanceData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
                        <p className="font-medium mb-1">{data.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Spend: ${data.value.toFixed(2)}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Revenue: ${data.revenue.toFixed(2)}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Campaigns: {data.count}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
