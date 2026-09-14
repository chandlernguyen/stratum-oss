import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, AlertCircle, TrendingUp } from 'lucide-react';

interface AILearnings {
  total_insights?: number;
  approved_insights?: number;
  auto_approved_insights?: number;
  recent_learnings?: Array<{
    id: string;
    type: string;
    content: string;
    confidence: number;
    source: string;
    created_at: string;
    fields_extracted?: number;
  }>;
  pain_points?: string[];
  opportunities?: string[];
}

interface AILearningHistoryCardProps {
  aiLearnings: AILearnings;
}

export function AILearningHistoryCard({ aiLearnings }: AILearningHistoryCardProps) {
  const { t } = useTranslation('agents');

  // Only render if there's data
  if (!aiLearnings.total_insights && !aiLearnings.recent_learnings) {
    return null;
  }

  return (
    <Card className="border-amber-200 bg-amber-50/30 dark:bg-amber-950/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-brand-gold" />
            <CardTitle className="text-lg">{t('context.cards.aiLearning.title')}</CardTitle>
          </div>
          {aiLearnings.total_insights && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200">
                {aiLearnings.approved_insights || 0} {t('context.cards.aiLearning.approved')}
              </Badge>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                {aiLearnings.auto_approved_insights || 0} {t('context.cards.aiLearning.autoApproved')}
              </Badge>
              <Badge variant="outline">
                {aiLearnings.total_insights} {t('context.cards.aiLearning.total')}
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Recent Learnings */}
          {aiLearnings.recent_learnings && aiLearnings.recent_learnings.length > 0 && (
            <div className="space-y-2">
              {aiLearnings.recent_learnings.slice(0, 3).map((learning) => (
                <div key={learning.id} className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-amber-200/50">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        learning.confidence >= 90 ? 'bg-green-500' :
                        learning.confidence >= 70 ? 'bg-blue-500' :
                        'bg-amber-500'
                      }`} />
                      <span className="text-xs text-muted-foreground">
                        {t('context.cards.aiLearning.fromSource', { source: learning.source })} • {t('context.cards.aiLearning.confidence', { percent: learning.confidence })}
                      </span>
                    </div>
                    {learning.fields_extracted && (
                      <Badge variant="outline" className="text-xs">
                        {t('context.cards.aiLearning.fields', { count: learning.fields_extracted })}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-brand-charcoal dark:text-gray-300">
                    {learning.content.substring(0, 150)}
                    {learning.content.length > 150 && '...'}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Key Learning Categories */}
          <div className="grid grid-cols-2 gap-3">
            {aiLearnings.pain_points && aiLearnings.pain_points.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 text-brand-error" />
                  {t('context.cards.aiLearning.identifiedPainPoints')}
                </div>
                <ul className="text-xs space-y-1">
                  {aiLearnings.pain_points.slice(0, 2).map((pain, i) => (
                    <li key={i} className="text-muted-foreground">• {pain}</li>
                  ))}
                </ul>
              </div>
            )}
            {aiLearnings.opportunities && aiLearnings.opportunities.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-brand-success" />
                  {t('context.cards.aiLearning.opportunities')}
                </div>
                <ul className="text-xs space-y-1">
                  {aiLearnings.opportunities.slice(0, 2).map((opp, i) => (
                    <li key={i} className="text-muted-foreground">• {opp}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="text-xs text-muted-foreground italic">
            {t('context.cards.aiLearning.autoExtractedNote')}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
