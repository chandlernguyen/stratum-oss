import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Calculator, TrendingUp, DollarSign, AlertCircle, Sparkles } from 'lucide-react';
import { useCampaignMetricsSummary } from '@/hooks/data/useCampaignMetrics';
import { useLocale } from '@/hooks/useLocale';
import { getIntlLocale } from '@/lib/locales';

interface ROICalculatorFormProps {
  onCalculate?: (results: ROIResults) => void;
  initialData?: Partial<ROIFormData>;
}

interface ROIFormData {
  dataSource: 'manual' | 'imported';
  totalInvestment: string;
  totalRevenue: string;
  additionalCosts: string;
  projectedGrowth: string;
  timeframe: string;
}

interface ROIResults {
  roi: number;
  roiPercentage: number;
  profit: number;
  breakeven: boolean;
  paybackPeriod: number;
  projectedRevenue: number;
  projectedROI: number;
}

export function ROICalculatorForm({ onCalculate, initialData }: ROICalculatorFormProps) {
  const { locale } = useLocale();
  const intlLocale = getIntlLocale(locale);
  const [formData, setFormData] = useState<ROIFormData>({
    dataSource: initialData?.dataSource || 'imported',
    totalInvestment: initialData?.totalInvestment || '',
    totalRevenue: initialData?.totalRevenue || '',
    additionalCosts: initialData?.additionalCosts || '0',
    projectedGrowth: initialData?.projectedGrowth || '0',
    timeframe: initialData?.timeframe || '30',
  });

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [results, setResults] = useState<ROIResults | null>(null);

  // Fetch campaign metrics summary for imported data
  const { data: metricsSummary } = useCampaignMetricsSummary(
    startDate || undefined,
    endDate || undefined
  );

  // Auto-populate from imported data when available
  useEffect(() => {
    if (formData.dataSource === 'imported' && metricsSummary) {
      setFormData(prev => ({
        ...prev,
        totalInvestment: metricsSummary.total_spend.toFixed(2),
        totalRevenue: metricsSummary.total_revenue.toFixed(2),
      }));
    }
  }, [formData.dataSource, metricsSummary]);

  const calculateROI = () => {
    const investment = parseFloat(formData.totalInvestment) || 0;
    const revenue = parseFloat(formData.totalRevenue) || 0;
    const additionalCosts = parseFloat(formData.additionalCosts) || 0;
    const growthRate = parseFloat(formData.projectedGrowth) || 0;
    const timeframe = parseInt(formData.timeframe) || 30;

    // Total costs
    const totalCosts = investment + additionalCosts;

    // Basic ROI calculation
    const profit = revenue - totalCosts;
    const roi = totalCosts > 0 ? profit : 0;
    const roiPercentage = totalCosts > 0 ? (profit / totalCosts) * 100 : 0;

    // Breakeven analysis
    const breakeven = revenue >= totalCosts;

    // Payback period (days)
    const dailyRevenue = revenue / 30; // Assuming 30-day period
    const paybackPeriod = dailyRevenue > 0 ? Math.ceil(totalCosts / dailyRevenue) : 0;

    // Projected values
    const growthMultiplier = 1 + (growthRate / 100);
    const projectedRevenue = revenue * Math.pow(growthMultiplier, timeframe / 30);
    const projectedProfit = projectedRevenue - totalCosts;
    const projectedROI = totalCosts > 0 ? (projectedProfit / totalCosts) * 100 : 0;

    const calculatedResults: ROIResults = {
      roi,
      roiPercentage,
      profit,
      breakeven,
      paybackPeriod,
      projectedRevenue,
      projectedROI,
    };

    setResults(calculatedResults);
    onCalculate?.(calculatedResults);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(intlLocale, {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const getROIColor = (roiPercentage: number) => {
    if (roiPercentage >= 100) return 'text-brand-success dark:text-green-400';
    if (roiPercentage >= 50) return 'text-brand-warning dark:text-yellow-400';
    if (roiPercentage >= 0) return 'text-orange-600 dark:text-orange-400';
    return 'text-brand-error dark:text-red-400';
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            ROI Calculator
          </CardTitle>
          <CardDescription>
            Calculate return on investment using manual input or imported campaign data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Data Source Selection */}
          <div>
            <Label htmlFor="dataSource">Data Source</Label>
            <Select
              value={formData.dataSource}
              onValueChange={(value) => setFormData(prev => ({ ...prev, dataSource: value as 'manual' | 'imported' }))}
            >
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="imported">Use Imported Campaign Data</SelectItem>
                <SelectItem value="manual">Manual Entry</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range for Imported Data */}
          {formData.dataSource === 'imported' && (
            <div className="grid grid-cols-2 gap-4">
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
          )}

          {/* Financial Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="totalInvestment">Total Investment ($) *</Label>
              <Input
                id="totalInvestment"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.totalInvestment}
                onChange={(e) => setFormData(prev => ({ ...prev, totalInvestment: e.target.value }))}
                disabled={formData.dataSource === 'imported' && !metricsSummary}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="totalRevenue">Total Revenue ($) *</Label>
              <Input
                id="totalRevenue"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.totalRevenue}
                onChange={(e) => setFormData(prev => ({ ...prev, totalRevenue: e.target.value }))}
                disabled={formData.dataSource === 'imported' && !metricsSummary}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="additionalCosts">Additional Costs ($)</Label>
              <Input
                id="additionalCosts"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.additionalCosts}
                onChange={(e) => setFormData(prev => ({ ...prev, additionalCosts: e.target.value }))}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="timeframe">Projection Timeframe (days)</Label>
              <Input
                id="timeframe"
                type="number"
                min="1"
                placeholder="30"
                value={formData.timeframe}
                onChange={(e) => setFormData(prev => ({ ...prev, timeframe: e.target.value }))}
                className="mt-2"
              />
            </div>
          </div>

          {/* Growth Projection */}
          <div>
            <Label htmlFor="projectedGrowth">Projected Monthly Growth Rate (%)</Label>
            <Input
              id="projectedGrowth"
              type="number"
              step="0.1"
              placeholder="0"
              value={formData.projectedGrowth}
              onChange={(e) => setFormData(prev => ({ ...prev, projectedGrowth: e.target.value }))}
              className="mt-2"
            />
            <p className="text-xs text-brand-slate mt-1">
              Expected monthly revenue growth percentage for projections
            </p>
          </div>

          {/* Imported Data Indicator */}
          {formData.dataSource === 'imported' && metricsSummary && (
            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertDescription>
                <strong>Using imported data:</strong> {metricsSummary.total_campaigns} campaigns tracked,
                {' '}Spend: {formatCurrency(metricsSummary.total_spend)},
                {' '}Revenue: {formatCurrency(metricsSummary.total_revenue)}
              </AlertDescription>
            </Alert>
          )}

          <Button onClick={calculateROI} className="w-full">
            <Calculator className="mr-2 h-4 w-4" />
            Calculate ROI
          </Button>
        </CardContent>
      </Card>

      {/* Results Section */}
      {results && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              ROI Analysis Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 p-4 rounded-lg">
                <p className="text-sm text-brand-info dark:text-blue-400 font-medium">ROI</p>
                <p className={`text-3xl font-bold ${getROIColor(results.roiPercentage)}`}>
                  {results.roiPercentage.toFixed(2)}%
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 p-4 rounded-lg">
                <p className="text-sm text-brand-success dark:text-green-400 font-medium">Profit</p>
                <p className={`text-3xl font-bold ${results.profit >= 0 ? 'text-brand-success dark:text-green-400' : 'text-brand-error dark:text-red-400'}`}>
                  {formatCurrency(results.profit)}
                </p>
              </div>

              <div className="bg-gradient-to-br from-slate-50 to-amber-100 dark:from-slate-950 dark:to-amber-900 p-4 rounded-lg">
                <p className="text-sm text-brand-gold dark:text-amber-400 font-medium">Payback Period</p>
                <p className="text-3xl font-bold text-brand-gold dark:text-amber-400">
                  {results.paybackPeriod} days
                </p>
              </div>
            </div>

            {/* Breakeven Status */}
            <div>
              <Badge variant={results.breakeven ? 'default' : 'destructive'} className="text-sm">
                {results.breakeven ? '✓ Above Breakeven' : '✗ Below Breakeven'}
              </Badge>
            </div>

            {/* Projections */}
            {parseFloat(formData.projectedGrowth) > 0 && (
              <div className="border-t pt-4 space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Projected Performance ({formData.timeframe} days)
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-brand-slate dark:text-gray-400">Projected Revenue</p>
                    <p className="text-xl font-bold text-brand-info dark:text-blue-400">
                      {formatCurrency(results.projectedRevenue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-brand-slate dark:text-gray-400">Projected ROI</p>
                    <p className={`text-xl font-bold ${getROIColor(results.projectedROI)}`}>
                      {results.projectedROI.toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Insights */}
            {results.roiPercentage < 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Negative ROI:</strong> Your campaign is currently losing money.
                  Consider optimizing spend or improving conversion rates.
                </AlertDescription>
              </Alert>
            )}

            {results.roiPercentage >= 0 && results.roiPercentage < 50 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Low ROI:</strong> Your campaign is profitable but could be optimized.
                  Consider testing different strategies to improve returns.
                </AlertDescription>
              </Alert>
            )}

            {results.roiPercentage >= 100 && (
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                <TrendingUp className="h-4 w-4 text-brand-success" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  <strong>Excellent ROI:</strong> Your campaign is performing very well!
                  Consider scaling successful strategies.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
