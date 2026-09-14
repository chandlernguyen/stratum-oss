import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Target,
  TrendingUp,
  FileText,
  ArrowRight,
  Clock,
  Sparkles,
  Zap,
  BarChart3,
  Search
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDashboardRecommendations } from '@/hooks/data/useDashboardRecommendations';
import type { DashboardRecommendation } from '@/hooks/data/useDashboardRecommendations';
import { useClientContext } from '@/contexts/ClientContext';
import { buildContextAwareUrl } from '@/utils/multiTenantRouting';

export function DashboardRecommendations() {
  const navigate = useNavigate();
  const { clientSlug } = useClientContext();
  const { data: recommendations, isLoading } = useDashboardRecommendations();

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'medium':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getIcon = (category: string) => {
    switch (category) {
      case 'persona_creation':
        return <Users className="h-6 w-6 text-amber-600" />;
      case 'strategy_analysis':
        return <Target className="h-6 w-6 text-blue-600" />;
      case 'content_generation':
        return <FileText className="h-6 w-6 text-green-600" />;
      case 'campaign_optimization':
        return <TrendingUp className="h-6 w-6 text-emerald-600" />;
      case 'quick_win':
        return <Zap className="h-6 w-6 text-amber-600" />;
      case 'data_import':
        return <BarChart3 className="h-6 w-6 text-indigo-600" />;
      case 'competitive_analysis':
        return <Search className="h-6 w-6 text-cyan-600" />;
      default:
        return <Sparkles className="h-6 w-6 text-amber-600" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 bg-gray-200 rounded w-48 animate-pulse" />
        <div className="space-y-3">
          <div className="p-6 bg-gray-100 rounded-xl animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
          <div className="p-6 bg-gray-100 rounded-xl animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (!recommendations || !recommendations.recommendations || recommendations.recommendations.length === 0) {
    return null;
  }

  // Show top recommendation prominently, others in compact list
  const topRecommendation = recommendations.recommendations[0];
  const otherRecommendations = recommendations.recommendations.slice(1);

  return (
    <div>
      <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-amber-600" />
        Recommended next steps
      </h3>

      {/* LLM Overall Assessment */}
      {recommendations.overall_assessment && (
        <div className="mb-4 p-4 bg-gradient-to-r from-slate-50 to-amber-50 rounded-lg border border-slate-200">
          <p className="text-sm text-gray-700 leading-relaxed">
            {recommendations.overall_assessment}
          </p>
        </div>
      )}

      {/* Top Recommendation - Large Card */}
      {topRecommendation && (
        <div className="mb-4 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 flex items-center justify-between hover:shadow-md transition-all duration-200">
          <div className="flex items-start gap-4 flex-1">
            <div className="w-12 h-12 rounded-lg bg-white shadow-sm flex items-center justify-center flex-shrink-0">
              {getIcon(topRecommendation.category)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="font-semibold text-gray-900">{topRecommendation.task}</p>
                <Badge className={`${getPriorityColor(topRecommendation.priority)} flex-shrink-0`}>
                  {topRecommendation.priority}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mb-3 leading-relaxed">{topRecommendation.reason}</p>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {topRecommendation.estimated_time}
                </span>
                <span className="flex items-center gap-1">
                  <Badge variant="outline" className="text-xs">
                    {topRecommendation.confidence} confidence
                  </Badge>
                </span>
              </div>
            </div>
          </div>
          <Button
            onClick={() => navigate(buildContextAwareUrl(topRecommendation.agent_path, clientSlug) || topRecommendation.agent_path)}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex-shrink-0 ml-4"
          >
            Start Now
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Other Recommendations - Compact Cards */}
      {otherRecommendations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {otherRecommendations.map((rec: DashboardRecommendation, index: number) => (
            <div
              key={index}
              className="p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer"
              onClick={() => navigate(buildContextAwareUrl(rec.agent_path, clientSlug) || rec.agent_path)}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-shrink-0">
                  {getIcon(rec.category)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{rec.task}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={`${getPriorityColor(rec.priority)} text-xs`} variant="outline">
                      {rec.priority}
                    </Badge>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {rec.estimated_time}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-600 line-clamp-2">{rec.reason}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
