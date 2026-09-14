/**
 * Competitive Analysis Display Component
 *
 * Clickable framework cards with context-aware prompts
 * Pattern: Uses CompetitiveFrameworkTemplates component
 *
 * Features:
 * - Clickable framework cards (SWOT, Feature Comparison, etc.)
 * - Business context integration for personalized prompts
 * - URL-based navigation to chat mode
 * - Google Search grounding for real-time competitor data
 */

import { useTranslation } from 'react-i18next';
import { Sparkles, MessageSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CompetitiveFrameworkTemplates } from './CompetitiveFrameworkTemplates';

interface CompetitiveAnalysisDisplayProps {
  onOpenChat?: () => void;
}

export function CompetitiveAnalysisDisplay({ onOpenChat }: CompetitiveAnalysisDisplayProps) {
  const { t } = useTranslation('agents');

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-brand-charcoal dark:text-gray-100">
            {t('competitive_intelligence.page.analysisDisplay.title')}
          </h1>
          <p className="text-base md:text-lg text-gray-600 dark:text-gray-400 mt-2">
            {t('competitive_intelligence.page.analysisDisplay.subtitle')}
          </p>
        </div>
        <Button
          onClick={onOpenChat}
          size="lg"
          className="w-full md:w-auto min-h-12 md:min-h-11 bg-gradient-to-r from-slate-600 to-amber-600 hover:from-slate-700 hover:to-amber-700"
        >
          <MessageSquare className="w-5 h-5 mr-2" />
          {t('competitive_intelligence.page.analysisDisplay.startResearch')}
        </Button>
      </div>

      {/* Intelligence Badge */}
      <Card className="border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-50 to-amber-50 dark:from-slate-900/20 dark:to-amber-900/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-900/30">
              <Sparkles className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {t('competitive_intelligence.page.analysisDisplay.searchGrounding.title')}
              </h3>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {t('competitive_intelligence.page.analysisDisplay.searchGrounding.description')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Frameworks Grid */}
      <div>
        <h2 className="text-2xl font-bold mb-6">{t('competitive_intelligence.page.analysisDisplay.frameworksTitle')}</h2>
        <CompetitiveFrameworkTemplates />
      </div>
    </div>
  );
}
