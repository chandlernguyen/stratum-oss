import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Sparkles,
  AlertCircle,
  MessageSquare,
  Settings,
  TrendingUp,
  Users,
  Target,
  Brain,
  Clock,
  ArrowRight
} from 'lucide-react';

// Import section components
import { CompanyProfileSection } from './sections/CompanyProfileSection';
import { PersonasSection } from './sections/PersonasSection';
import { AILearningList } from '@/components/shared/AILearningCard';
import { getIntlLocale } from '@/lib/locales';

interface BusinessContext {
  company: any;
  aiLearnings: any;
  personas: any[];
  campaigns: any;
  previousStrategies: any[];
}

interface IntelligentContextDisplayProps {
  businessContext: BusinessContext;
  onStartStrategy: (contextSummary: string) => void;
  onRefineContext: () => void;
  recentSessions?: any[];
  onContinueSession?: (sessionId: string) => void;
}

export function IntelligentContextDisplay({
  businessContext,
  onStartStrategy,
  onRefineContext,
  recentSessions = [],
  onContinueSession
}: IntelligentContextDisplayProps) {
  const { t, i18n } = useTranslation(['agents']);
  const intlLocale = getIntlLocale(i18n.language);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Generate context summary for the agent
  const generateContextSummary = () => {
    const context = [];
    const pt = (key: string) => t(`agents:context.intelligentDisplay.promptTemplate.${key}`);

    // Add helpful instruction at the beginning
    context.push(pt('intro'));
    context.push(""); // Empty line for spacing

    // Company basics
    if (businessContext.company.name) {
      context.push(`${pt('company')}: ${businessContext.company.name}`);
    }
    if (businessContext.company.industry) {
      context.push(`${pt('industry')}: ${businessContext.company.industry}`);
    }
    if (businessContext.company.type) {
      context.push(`${pt('organizationType')}: ${businessContext.company.type}`);
    }

    // AI learnings
    if (businessContext.aiLearnings.targetMarket) {
      context.push(`${pt('targetMarket')}: ${businessContext.aiLearnings.targetMarket}`);
    }
    if (businessContext.aiLearnings.geography) {
      context.push(`${pt('geographicFocus')}: ${businessContext.aiLearnings.geography}`);
    }
    if (businessContext.aiLearnings.businessModel) {
      context.push(`${pt('businessModel')}: ${businessContext.aiLearnings.businessModel}`);
    }
    if (businessContext.aiLearnings.marketingBudget) {
      context.push(`${pt('marketingBudget')}: ${businessContext.aiLearnings.marketingBudget}`);
    }

    // Personas
    if (businessContext.personas.length > 0) {
      const personaNames = businessContext.personas.map(p => p.name).join(', ');
      context.push(`${pt('customerPersonas')}: ${personaNames}`);
    }

    // Active campaign
    if (businessContext.campaigns.active) {
      const campaign = businessContext.campaigns.active;
      context.push(`${pt('activeCampaign')}: ${campaign.name}`);
      if (campaign.budget) {
        context.push(`${pt('campaignBudget')}: $${campaign.budget.toLocaleString(intlLocale)}`);
      }
    }

    return context.join('\n');
  };

  // Calculate data completeness
  const dataCompleteness = () => {
    let score = 0;
    let total = 0;

    // Company info (weight: 3)
    total += 3;
    if (businessContext.company.name) score += 1;
    if (businessContext.company.industry) score += 1;
    if (businessContext.company.size || businessContext.company.employee_count) score += 1;

    // Market info (weight: 3)
    total += 3;
    if (businessContext.aiLearnings.targetMarket) score += 1;
    if (businessContext.aiLearnings.geography) score += 1;
    if (businessContext.aiLearnings.businessModel) score += 1;

    // Financial info (weight: 2)
    total += 2;
    if (businessContext.aiLearnings.revenue) score += 1;
    if (businessContext.aiLearnings.marketingBudget) score += 1;

    // Personas (weight: 2)
    total += 2;
    if (businessContext.personas.length >= 2) score += 2;
    else if (businessContext.personas.length >= 1) score += 1;

    // Campaign context (weight: 1)
    total += 1;
    if (businessContext.campaigns.active) score += 1;

    return Math.round((score / total) * 100);
  };

  const completeness = dataCompleteness();
  const isReady = completeness >= 40;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="h-8 w-8 text-amber-500" />
          <h1 className="text-3xl font-bold">{t('agents:context.intelligentDisplay.header.title')}</h1>
        </div>
        <p className="text-lg text-muted-foreground">
          {t('agents:context.intelligentDisplay.header.subtitle')}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 pb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-brand-info" />
              <div>
                <div className="text-2xl font-bold">
                  {businessContext.company.data_completeness_score || completeness}%
                </div>
                <p className="text-xs text-muted-foreground">{t('agents:context.intelligentDisplay.stats.dataQuality')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 pb-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-amber-500" />
              <div>
                <div className="text-2xl font-bold">
                  {businessContext.personas.length}
                </div>
                <p className="text-xs text-muted-foreground">{t('agents:context.intelligentDisplay.stats.personas')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 pb-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-brand-success" />
              <div>
                <div className="text-2xl font-bold">
                  {businessContext.campaigns.active ? '1' : '0'}
                </div>
                <p className="text-xs text-muted-foreground">{t('agents:context.intelligentDisplay.stats.activeCampaign')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 pb-4">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">
                  {businessContext.aiLearnings.total_insights || 0}
                </div>
                <p className="text-xs text-muted-foreground">{t('agents:context.intelligentDisplay.stats.aiInsights')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Business Understanding Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Company Profile */}
        <CompanyProfileSection
          company={businessContext.company}
          isExpanded={expandedSections['company'] || false}
          onToggle={() => toggleSection('company')}
        />

        {/* Customer Personas */}
        <PersonasSection
          personas={businessContext.personas}
          isExpanded={expandedSections['personas'] || false}
          onToggle={() => toggleSection('personas')}
        />
      </div>


      {/* AI Learning Summary */}
      {businessContext.aiLearnings.recent_learnings && businessContext.aiLearnings.recent_learnings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-orange-500" />
              {t('agents:context.intelligentDisplay.recentLearnings')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AILearningList
              learnings={businessContext.aiLearnings.recent_learnings}
              maxItems={3}
            />
          </CardContent>
        </Card>
      )}

      {/* Recent Sessions - Elegant Design */}
      {recentSessions && recentSessions.length > 0 && (
        <Card className="border-amber-100 bg-gradient-to-br from-slate-50/50 to-amber-50/50 dark:from-slate-950/20 dark:to-amber-950/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-brand-gold" />
                <h3 className="font-semibold text-lg">{t('agents:context.intelligentDisplay.continueWork.title')}</h3>
              </div>
              {onContinueSession && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.location.href = '/marketing-strategy/chat'}
                  className="text-brand-gold hover:text-brand-charcoal"
                >
                  {t('agents:context.intelligentDisplay.continueWork.viewAll')}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>

            <div className="grid gap-3">
              {recentSessions.slice(0, 2).map((session) => (
                <div
                  key={session.id}
                  onClick={() => onContinueSession?.(session.id)}
                  className="group flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-900 border border-amber-100 dark:border-slate-900 hover:border-amber-300 dark:hover:border-slate-700 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm group-hover:text-brand-gold transition-colors truncate">
                      {session.first_message || 'Continue your marketing strategy...'}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{new Date(session.updated_at).toLocaleDateString(intlLocale)}</span>
                      <span>•</span>
                      <span>{session.message_count || 0} messages</span>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-amber-400 group-hover:text-brand-gold group-hover:translate-x-1 transition-all" />
                </div>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-amber-100 dark:border-slate-900 text-center">
              <p className="text-sm text-muted-foreground">{t('agents:context.intelligentDisplay.continueWork.orStartFresh')}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button
          size="lg"
          onClick={() => onStartStrategy(generateContextSummary())}
          disabled={!isReady}
          className="min-w-[200px] bg-gradient-to-r from-brand-gold to-amber-400 hover:from-amber-600 hover:to-amber-500 text-white"
        >
          <MessageSquare className="mr-2 h-5 w-5" />
          {t('agents:context.intelligentDisplay.actions.generateStrategy')}
        </Button>

        <Button
          size="lg"
          variant="outline"
          onClick={onRefineContext}
          className="min-w-[200px] border-amber-600 text-amber-600 hover:bg-amber-50 dark:border-amber-400 dark:text-amber-400 dark:hover:bg-amber-900/20"
        >
          <Settings className="mr-2 h-5 w-5" />
          {t('agents:context.intelligentDisplay.actions.refineContext')}
        </Button>
      </div>

      {/* Help text */}
      {!isReady && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t('agents:context.intelligentDisplay.helpText')}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
