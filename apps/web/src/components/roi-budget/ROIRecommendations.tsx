import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronDown,
  ChevronUp,
  Lightbulb,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  RefreshCw,
  Upload,
  DollarSign
} from 'lucide-react';
import { useROIRecommendations } from '@/hooks/data/useROIRecommendations';
import { useNavigate } from 'react-router-dom';
import { useLocale } from '@/hooks/useLocale';
import { getIntlLocale } from '@/lib/locales';

export function ROIRecommendations() {
  const [isExpanded, setIsExpanded] = useState(true);
  const { data: recommendations, isLoading } = useROIRecommendations();
  const navigate = useNavigate();
  const { locale } = useLocale();
  const intlLocale = getIntlLocale(locale);

  if (isLoading) {
    return (
      <Card className="border-2 border-emerald-200 dark:border-emerald-800 animate-pulse">
        <CardHeader>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
        </CardHeader>
      </Card>
    );
  }

  if (!recommendations || !recommendations.recommendations || recommendations.recommendations.length === 0) {
    return null;
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-300';
      case 'low':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200 border-gray-300';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'channel_optimization':
        return <Lightbulb className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />;
      case 'budget_reallocation':
        return <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
      case 'scale_opportunity':
        return <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case 'pause_campaign':
        return <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />;
      case 'investigate_decline':
        return <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />;
      case 'data_collection':
        return <Upload className="h-5 w-5 text-amber-600 dark:text-amber-400" />;
      default:
        return <Lightbulb className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />;
    }
  };

  const handleAction = (recommendation: any) => {
    switch (recommendation.action) {
      case 'import_data':
        navigate('/performance-intelligence/tool/upload-v2');
        break;
      case 'pause_or_reduce':
      case 'increase_budget':
      case 'investigate':
        navigate('/performance-intelligence/tool/budget-optimizer');
        break;
      case 'reallocate':
        navigate('/performance-intelligence/tool/budget-optimizer');
        break;
      default:
        console.log('No action defined for:', recommendation.action);
    }
  };

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return '$0';
    return new Intl.NumberFormat(intlLocale, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card className="border-2 border-emerald-200 dark:border-emerald-800 shadow-lg mb-8">
      <CardHeader className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900 dark:to-green-900 rounded-lg">
              <Lightbulb className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-xl">AI-Powered Recommendations</CardTitle>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-2">
                <span>
                  {recommendations.recommendations.length} optimization opportunities found
                </span>
                <Badge
                  variant="outline"
                  className={`${recommendations.confidence === 'high' ? 'border-green-500 text-green-700 dark:text-green-300' :
                    recommendations.confidence === 'medium' ? 'border-yellow-500 text-yellow-700 dark:text-yellow-300' :
                      'border-gray-500 text-gray-700 dark:text-gray-300'
                    }`}
                >
                  {recommendations.confidence} confidence
                </Badge>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon">
            {isExpanded ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Overall Assessment (LLM Executive Summary) */}
          {recommendations.overall_assessment && (
            <div className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950 dark:to-green-950 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <h3 className="font-semibold text-emerald-900 dark:text-emerald-100 mb-2">Executive Summary</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300">{recommendations.overall_assessment}</p>
            </div>
          )}

          {/* Context Summary */}
          {recommendations.context_summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {recommendations.context_summary.total_campaigns}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Campaigns</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {recommendations.context_summary.avg_roi.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Avg ROI</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(recommendations.context_summary.total_spend)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Total Spend</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(recommendations.context_summary.total_revenue)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Total Revenue</div>
              </div>
            </div>
          )}

          {/* Recommendations List */}
          <div className="space-y-3">
            {recommendations.recommendations.map((rec, index) => (
              <div
                key={index}
                className="p-4 border-2 rounded-lg hover:shadow-md transition-all duration-200 bg-white dark:bg-gray-800"
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="mt-1">{getCategoryIcon(rec.category)}</div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                        {rec.task}
                      </h4>
                      <div className="flex items-center gap-2">
                        <Badge className={`${getPriorityColor(rec.priority)}`}>
                          {rec.priority} priority
                        </Badge>
                        {rec.confidence && (
                          <Badge variant="outline" className="text-xs">
                            {rec.confidence} confidence
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Strategic Reasoning (LLM) */}
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">
                      {rec.reason}
                    </p>

                    {/* Estimated Impact (LLM) */}
                    {rec.estimated_impact && (
                      <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
                        <div className="flex items-start gap-2">
                          <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">Expected Impact</div>
                            <div className="text-sm text-blue-700 dark:text-blue-300">{rec.estimated_impact}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Data Supporting (LLM) */}
                    {rec.data_supporting && (
                      <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
                        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Supporting Data</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">{rec.data_supporting}</div>
                      </div>
                    )}

                    {/* Financial Impact */}
                    {(rec.estimated_savings || rec.estimated_gain) && (
                      <div className="flex items-center gap-2 mb-3">
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                        <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                          {rec.estimated_savings && `Potential savings: ${formatCurrency(rec.estimated_savings)}`}
                          {rec.estimated_gain && `Potential gain: ${formatCurrency(rec.estimated_gain)}`}
                        </span>
                      </div>
                    )}

                    {/* Action Button */}
                    <Button
                      onClick={() => handleAction(rec)}
                      variant={rec.priority === 'high' ? 'default' : 'outline'}
                      size="sm"
                      className={rec.priority === 'high' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                    >
                      Take Action
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
