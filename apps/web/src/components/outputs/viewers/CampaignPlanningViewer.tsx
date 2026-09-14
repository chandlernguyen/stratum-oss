import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Target,
  Calendar,
  Users,
  CheckCircle,
  AlertTriangle,
  Rocket,
  TrendingUp
} from 'lucide-react'

interface CampaignPlanningViewerProps {
  content: any
  hasStructuredData: boolean
}

export function CampaignPlanningViewer({ content }: CampaignPlanningViewerProps) {
  // Extract plan data from content
  const plan = content || {}

  // Campaign type color coding
  const getCampaignTypeColor = (type: string) => {
    switch (type) {
      case 'awareness':
        return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
      case 'consideration':
        return 'text-amber-600 bg-slate-50 dark:bg-slate-900/20 border-slate-200'
      case 'conversion':
        return 'text-green-600 bg-green-50 dark:bg-green-900/20 border-green-200'
      case 'retention':
        return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 border-orange-200'
      default:
        return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20 border-gray-200'
    }
  }

  const getCampaignTypeIcon = (type: string) => {
    switch (type) {
      case 'awareness':
        return Users
      case 'consideration':
        return Target
      case 'conversion':
        return Rocket
      case 'retention':
        return CheckCircle
      default:
        return TrendingUp
    }
  }

  // Impact/Confidence/Ease color coding
  const getScoreColor = (score: string) => {
    if (score === 'High' || score === '9' || score === '8')
      return 'text-green-600 bg-green-50 dark:bg-green-900/20'
    if (score === 'Medium' || score === '7' || score === '6' || score === '5')
      return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
    return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20'
  }

  const TypeIcon = getCampaignTypeIcon(plan.campaign_type)
  const iceScore = typeof plan.ice_score === 'number' ? plan.ice_score : parseFloat(plan.ice_score) || 0

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center gap-3">
        <Badge className={`${getCampaignTypeColor(plan.campaign_type)} border px-3 py-1`}>
          <TypeIcon className="w-4 h-4 mr-2" />
          {plan.campaign_type ? plan.campaign_type.charAt(0).toUpperCase() + plan.campaign_type.slice(1) : 'Campaign'}
        </Badge>
        <Badge variant="outline" className="font-bold text-orange-600 border-orange-600 px-3 py-1">
          ICE Score: {iceScore.toFixed(1)}
        </Badge>
      </div>

      {/* ICE Scores */}
      <Card className="p-4">
        <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-3">ICE Scoring</h3>
        <div className="flex flex-wrap gap-2">
          <Badge className={`${getScoreColor(plan.impact)} border-0 px-3 py-1`}>
            Impact: {plan.impact || 'N/A'}
          </Badge>
          <Badge className={`${getScoreColor(plan.confidence)} border-0 px-3 py-1`}>
            Confidence: {plan.confidence || 'N/A'}
          </Badge>
          <Badge className={`${getScoreColor(plan.ease)} border-0 px-3 py-1`}>
            Ease: {plan.ease || 'N/A'}
          </Badge>
        </div>
      </Card>

      {/* Channels & Duration */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plan.channels && plan.channels.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Channels
              </p>
              <div className="flex flex-wrap gap-1">
                {plan.channels.map((channel: string, idx: number) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {channel}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {plan.estimated_duration && (
            <div>
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Duration
              </p>
              <p className="text-sm text-gray-900 dark:text-gray-100">{plan.estimated_duration}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Expected Outcomes */}
      {plan.expected_outcomes && plan.expected_outcomes.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            Expected Outcomes
          </h3>
          <ul className="space-y-2">
            {plan.expected_outcomes.map((outcome: string, idx: number) => (
              <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                <span className="text-green-600 mt-0.5 flex-shrink-0">•</span>
                <span>{outcome}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Prerequisites */}
      {plan.prerequisites && plan.prerequisites.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-3">Prerequisites</h3>
          <ul className="space-y-2">
            {plan.prerequisites.map((prereq: string, idx: number) => (
              <li key={idx} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                <span className="text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0">✓</span>
                <span>{prereq}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Risk Factors */}
      {plan.risk_factors && plan.risk_factors.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
            Risk Factors
          </h3>
          <ul className="space-y-2">
            {plan.risk_factors.map((risk: string, idx: number) => (
              <li key={idx} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                <span className="text-yellow-600 mt-0.5 flex-shrink-0">⚠</span>
                <span>{risk}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Deployment Framework */}
      {plan.deployment_framework && (
        <Card className="p-4">
          <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-3">
            Deployment Framework
          </h3>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {typeof plan.deployment_framework === 'object' ? (
              <pre className="whitespace-pre-wrap font-sans text-xs">
                {JSON.stringify(plan.deployment_framework, null, 2)}
              </pre>
            ) : (
              <p>{plan.deployment_framework}</p>
            )}
          </div>
        </Card>
      )}

      {/* A/B Testing Recommendations */}
      {plan.ab_testing_recommendations && plan.ab_testing_recommendations.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-3">
            A/B Testing Recommendations
          </h3>
          <ul className="space-y-2">
            {plan.ab_testing_recommendations.map((test: string, idx: number) => (
              <li key={idx} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                <span className="text-amber-600 mt-0.5 flex-shrink-0">🔬</span>
                <span>{test}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}
