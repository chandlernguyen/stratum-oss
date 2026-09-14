import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Target, TrendingUp, DollarSign, Download, Sparkles, AlertCircle } from 'lucide-react';
import { useCampaignMetricsSummary, useBudgetOptimizationData } from '@/hooks/data/useCampaignMetrics';

interface ChannelData {
  channel: string;
  spend: number;
  revenue: number;
  conversions: number;
  roi: number;
  recommended_budget?: number;
}

type OptimizationFramework = 'roi_based' | 'marginal_efficiency' | 'cac_based' | 'attribution_weighted';

interface BudgetOptimizerFormProps {
  onOptimize?: (results: any) => void;
}

export function BudgetOptimizerForm({ onOptimize }: BudgetOptimizerFormProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [totalBudget, setTotalBudget] = useState('');
  const [framework, setFramework] = useState<OptimizationFramework>('roi_based');
  const [channelData, setChannelData] = useState<ChannelData[]>([]);
  const [optimizationResults, setOptimizationResults] = useState<any>(null);

  // Fetch metrics summary and optimization data from database
  const { data: summary } = useCampaignMetricsSummary(startDate, endDate);
  const { data: optimizationData = [], isLoading } = useBudgetOptimizationData(
    startDate || undefined,
    endDate || undefined
  );

  // Transform database results to channel performance format
  const channelPerformance = useMemo(() => {
    if (optimizationData.length === 0) return [];

    return optimizationData.map((data) => ({
      channel: data.channel.replace('_', ' ').toUpperCase(),
      spend: Number(data.total_spend),
      revenue: Number(data.total_revenue),
      conversions: data.total_conversions,
      roi: Number(data.avg_roi)
    }));
  }, [optimizationData]);

  // Load channel data when metrics are available
  useMemo(() => {
    if (channelPerformance.length > 0 && channelData.length === 0) {
      setChannelData(channelPerformance);
    }
  }, [channelPerformance, channelData.length]);

  const handleOptimize = () => {
    if (!totalBudget || channelData.length === 0) return;

    const budget = parseFloat(totalBudget);
    let results: any = {
      framework,
      total_budget: budget,
      channels: []
    };

    // Calculate optimized allocation based on framework
    switch (framework) {
      case 'roi_based':
        results = optimizeByROI(channelData, budget);
        break;
      case 'marginal_efficiency':
        results = optimizeByMarginalEfficiency(channelData, budget);
        break;
      case 'cac_based':
        results = optimizeByCAC(channelData, budget);
        break;
      case 'attribution_weighted':
        results = optimizeByAttribution(channelData, budget);
        break;
    }

    setOptimizationResults(results);
    onOptimize?.(results);

    // Update channel data with recommendations
    setChannelData(prev => prev.map(channel => ({
      ...channel,
      recommended_budget: results.channels.find((c: any) => c.channel === channel.channel)?.recommended_budget || 0
    })));
  };

  const optimizeByROI = (channels: ChannelData[], totalBudget: number) => {
    // Allocate proportionally to ROI performance
    const totalROI = channels.reduce((sum, c) => sum + Math.max(0, c.roi), 0);

    return {
      framework: 'ROI-Based Allocation',
      description: 'Budget allocated proportionally to ROI performance',
      total_budget: totalBudget,
      channels: channels.map(channel => {
        const roiWeight = Math.max(0, channel.roi) / totalROI;
        const recommended = roiWeight * totalBudget;
        return {
          channel: channel.channel,
          current_spend: channel.spend,
          current_roi: channel.roi,
          recommended_budget: parseFloat(recommended.toFixed(2)),
          increase: parseFloat((recommended - channel.spend).toFixed(2)),
          increase_percent: channel.spend > 0 ? ((recommended - channel.spend) / channel.spend * 100).toFixed(1) : 'N/A'
        };
      }).sort((a, b) => b.recommended_budget - a.recommended_budget)
    };
  };

  const optimizeByMarginalEfficiency = (channels: ChannelData[], totalBudget: number) => {
    // Simple approach: allocate more to high ROI channels but maintain diversity
    const avgROI = channels.reduce((sum, c) => sum + c.roi, 0) / channels.length;

    return {
      framework: 'Marginal Efficiency',
      description: 'Budget allocated based on marginal returns and efficiency',
      total_budget: totalBudget,
      channels: channels.map(channel => {
        const efficiency = channel.roi / avgROI;
        const baseAllocation = totalBudget / channels.length;
        const recommended = baseAllocation * (0.5 + 0.5 * efficiency);
        return {
          channel: channel.channel,
          current_spend: channel.spend,
          current_roi: channel.roi,
          efficiency_score: parseFloat(efficiency.toFixed(2)),
          recommended_budget: parseFloat(recommended.toFixed(2)),
          increase: parseFloat((recommended - channel.spend).toFixed(2)),
          increase_percent: channel.spend > 0 ? ((recommended - channel.spend) / channel.spend * 100).toFixed(1) : 'N/A'
        };
      }).sort((a, b) => b.recommended_budget - a.recommended_budget)
    };
  };

  const optimizeByCAC = (channels: ChannelData[], totalBudget: number) => {
    // Allocate based on Customer Acquisition Cost efficiency
    return {
      framework: 'CAC-Based Allocation',
      description: 'Budget allocated to minimize customer acquisition cost',
      total_budget: totalBudget,
      channels: channels.map(channel => {
        const cac = channel.conversions > 0 ? channel.spend / channel.conversions : 0;
        const cacScore = cac > 0 ? 1 / cac : 0;
        const totalCAC = channels.reduce((sum, c) => {
          const cScore = c.conversions > 0 ? 1 / (c.spend / c.conversions) : 0;
          return sum + cScore;
        }, 0);
        const recommended = (cacScore / totalCAC) * totalBudget;

        return {
          channel: channel.channel,
          current_spend: channel.spend,
          cac: parseFloat(cac.toFixed(2)),
          conversions: channel.conversions,
          recommended_budget: parseFloat(recommended.toFixed(2)),
          increase: parseFloat((recommended - channel.spend).toFixed(2)),
          increase_percent: channel.spend > 0 ? ((recommended - channel.spend) / channel.spend * 100).toFixed(1) : 'N/A'
        };
      }).sort((a, b) => b.recommended_budget - a.recommended_budget)
    };
  };

  const optimizeByAttribution = (channels: ChannelData[], totalBudget: number) => {
    // Weighted allocation considering all metrics
    return {
      framework: 'Attribution-Weighted',
      description: 'Balanced allocation across ROI, conversions, and revenue',
      total_budget: totalBudget,
      channels: channels.map(channel => {
        const roiWeight = 0.4;
        const conversionWeight = 0.3;
        const revenueWeight = 0.3;

        const totalROI = channels.reduce((sum, c) => sum + Math.max(0, c.roi), 0);
        const totalConversions = channels.reduce((sum, c) => sum + c.conversions, 0);
        const totalRevenue = channels.reduce((sum, c) => sum + c.revenue, 0);

        const roiScore = totalROI > 0 ? (Math.max(0, channel.roi) / totalROI) * roiWeight : 0;
        const conversionScore = totalConversions > 0 ? (channel.conversions / totalConversions) * conversionWeight : 0;
        const revenueScore = totalRevenue > 0 ? (channel.revenue / totalRevenue) * revenueWeight : 0;

        const totalScore = roiScore + conversionScore + revenueScore;
        const recommended = totalScore * totalBudget;

        return {
          channel: channel.channel,
          current_spend: channel.spend,
          current_roi: channel.roi,
          attribution_score: parseFloat((totalScore * 100).toFixed(1)),
          recommended_budget: parseFloat(recommended.toFixed(2)),
          increase: parseFloat((recommended - channel.spend).toFixed(2)),
          increase_percent: channel.spend > 0 ? ((recommended - channel.spend) / channel.spend * 100).toFixed(1) : 'N/A'
        };
      }).sort((a, b) => b.recommended_budget - a.recommended_budget)
    };
  };

  const handleExport = () => {
    if (!optimizationResults) return;

    const csvContent = [
      ['Channel', 'Current Spend', 'Current ROI', 'Recommended Budget', 'Change', 'Change %'],
      ...optimizationResults.channels.map((c: any) => [
        c.channel,
        c.current_spend,
        c.current_roi?.toFixed(2) || 'N/A',
        c.recommended_budget,
        c.increase,
        c.increase_percent
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget_optimization_${framework}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

  return (
    <div className="space-y-6">
      {/* Configuration Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Budget Optimization Configuration
          </CardTitle>
          <CardDescription>
            Load campaign performance data and select optimization framework
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>

          {/* Total Budget */}
          <div>
            <Label htmlFor="totalBudget">Total Budget to Allocate ($)</Label>
            <Input
              id="totalBudget"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={totalBudget}
              onChange={(e) => setTotalBudget(e.target.value)}
              className="mt-2"
            />
          </div>

          {/* Framework Selection */}
          <div>
            <Label htmlFor="framework">Optimization Framework</Label>
            <Select value={framework} onValueChange={(value) => setFramework(value as OptimizationFramework)}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="roi_based">ROI-Based Allocation</SelectItem>
                <SelectItem value="marginal_efficiency">Marginal Efficiency</SelectItem>
                <SelectItem value="cac_based">CAC-Based (Cost per Acquisition)</SelectItem>
                <SelectItem value="attribution_weighted">Attribution-Weighted</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-2">
              {framework === 'roi_based' && 'Allocates budget proportionally to ROI performance'}
              {framework === 'marginal_efficiency' && 'Optimizes based on marginal returns and efficiency'}
              {framework === 'cac_based' && 'Minimizes customer acquisition cost across channels'}
              {framework === 'attribution_weighted' && 'Balanced allocation across ROI, conversions, and revenue'}
            </p>
          </div>

          {/* Summary Stats */}
          {summary && (
            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertDescription>
                <strong>Loaded data:</strong> {summary.total_campaigns} campaigns,
                {' '}{formatCurrency(summary.total_spend)} total spend,
                {' '}{formatCurrency(summary.total_revenue)} revenue,
                {' '}{summary.avg_roi.toFixed(2)}% average ROI
              </AlertDescription>
            </Alert>
          )}

          {isLoading && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Loading channel performance data...</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleOptimize}
            disabled={!totalBudget || channelData.length === 0 || isLoading}
            className="w-full"
          >
            <Target className="mr-2 h-4 w-4" />
            {isLoading ? 'Loading Data...' : 'Optimize Budget Allocation'}
          </Button>
        </CardContent>
      </Card>

      {/* Current Performance Table */}
      {channelData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Channel Performance Data</CardTitle>
            <CardDescription>Current performance across channels (from imported metrics)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Channel</TableHead>
                    <TableHead className="text-right">Spend</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Conversions</TableHead>
                    <TableHead className="text-right">ROI</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {channelData.map((channel) => (
                    <TableRow key={channel.channel}>
                      <TableCell className="font-medium">{channel.channel}</TableCell>
                      <TableCell className="text-right">{formatCurrency(channel.spend)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(channel.revenue)}</TableCell>
                      <TableCell className="text-right">{channel.conversions}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={channel.roi >= 100 ? 'default' : channel.roi >= 0 ? 'secondary' : 'destructive'}>
                          {channel.roi.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Optimization Results */}
      {optimizationResults && (
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Optimization Results
                </CardTitle>
                <CardDescription className="mt-2">
                  {optimizationResults.description}
                </CardDescription>
              </div>
              <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="allocation">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="allocation">Budget Allocation</TabsTrigger>
                <TabsTrigger value="changes">Recommended Changes</TabsTrigger>
              </TabsList>

              <TabsContent value="allocation" className="mt-4">
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Channel</TableHead>
                        <TableHead className="text-right">Current Spend</TableHead>
                        <TableHead className="text-right">Recommended Budget</TableHead>
                        <TableHead className="text-right">Change</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {optimizationResults.channels.map((channel: any) => (
                        <TableRow key={channel.channel}>
                          <TableCell className="font-medium">{channel.channel}</TableCell>
                          <TableCell className="text-right">{formatCurrency(channel.current_spend)}</TableCell>
                          <TableCell className="text-right font-bold text-green-600 dark:text-green-400">
                            {formatCurrency(channel.recommended_budget)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant={channel.increase >= 0 ? 'default' : 'secondary'}>
                              {channel.increase >= 0 ? '+' : ''}{formatCurrency(channel.increase)} ({channel.increase_percent}%)
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="changes" className="mt-4">
                <div className="space-y-3">
                  {optimizationResults.channels.map((channel: any) => {
                    const isIncrease = channel.increase > 0;
                    return (
                      <div key={channel.channel} className="flex items-start gap-3 p-3 border rounded-lg">
                        <div className={`p-2 rounded ${isIncrease ? 'bg-green-100 dark:bg-green-900' : 'bg-blue-100 dark:bg-blue-900'}`}>
                          <DollarSign className={`h-4 w-4 ${isIncrease ? 'text-green-600 dark:text-green-400' : 'text-blue-600 dark:text-blue-400'}`} />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{channel.channel}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {isIncrease ? 'Increase' : 'Decrease'} budget by {formatCurrency(Math.abs(channel.increase))} ({channel.increase_percent}%)
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Current ROI: {channel.current_roi?.toFixed(1)}% |
                            New Budget: {formatCurrency(channel.recommended_budget)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Alert className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Recommendation:</strong> These changes are based on historical performance.
                    Monitor results closely and adjust as needed based on actual campaign performance.
                  </AlertDescription>
                </Alert>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {channelData.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No campaign data available. Please import campaign metrics or add manual entries to use the budget optimizer.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
