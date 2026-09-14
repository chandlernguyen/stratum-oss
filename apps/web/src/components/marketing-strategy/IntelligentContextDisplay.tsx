import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PersonaCard } from './PersonaCard';
import { CompanyProfileCard } from './cards/CompanyProfileCard';
import { MarketFocusCard } from './cards/MarketFocusCard';
import { BusinessContextCard } from './cards/BusinessContextCard';
import { ActiveCampaignCard } from './cards/ActiveCampaignCard';
import { AILearningHistoryCard } from './cards/AILearningHistoryCard';
import {
  Users,
  Lightbulb,
  Edit,
  CheckCircle,
  AlertCircle,
  Sparkles,
  MessageSquare,
  ArrowRight,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { getIntlLocale } from '@/lib/locales';
// import { useCrossAgentIntelligence } from '@/hooks/useCrossAgentIntelligence';

interface BusinessContext {
  company: {
    name: string;
    industry?: string;
    size?: string;
    type: 'SME' | 'AGENCY';
    description?: string;
    website?: string;
    founded_year?: string;
    employee_count?: string;
    headquarters?: string;
    mission_statement?: string;
    core_values?: string[];
    key_products?: string[];
    annual_revenue_range?: string;
    business_stage?: string;
    funding_status?: string;
    technology_stack?: string[];
    operating_regions?: string[];
    data_completeness_score?: number;
  };
  aiLearnings: {
    targetMarket?: string;
    geography?: string;
    businessModel?: string;
    revenue?: string;
    marketingBudget?: string;
    uniqueValueProposition?: string;
    competitors?: string[];
    market_position?: string;
    growth_stage?: string;
    distribution_channels?: string[];
    customer_acquisition_cost?: string;
    lifetime_value?: string;
    seasonal_trends?: string[];
    market_size?: string;
    competitive_advantages?: string[];
    target_market_segments?: string[];
    main_products_services?: string[];
    pain_points?: string[];
    opportunities?: string[];
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
  };
  personas: Array<{
    id: string;
    name: string;
    persona_type?: string;
    title?: string;
    company_name?: string;
    industry?: string;
    location?: string;
    company_size?: string;
    annual_revenue?: string;
    goals?: string[];
    pain_points?: string[];
    current_tools?: string[];
    preferred_channels?: string[];
    personality_traits?: {
      risk_tolerance?: string;
      innovation_appetite?: string;
      decision_speed?: string;
    };
    customer_status?: string;
    satisfaction_score?: number;
    background_story?: string;
    insights_count?: number;
    insights_summary?: any;
  }>;
  campaigns: {
    active?: {
      name: string;
      budget_cents?: number;
      objectives?: string;
      target_audience?: string;
      start_date?: string;
      end_date?: string;
      status?: string;
      spent_cents?: number;
      metrics?: any;
      channel_breakdown?: {
        owned_media_percent?: number;
        earned_media_percent?: number;
        paid_media_percent?: number;
      };
      performance_metrics?: {
        impressions?: number;
        clicks?: number;
        conversions?: number;
        ctr?: number;
        conversion_rate?: number;
        cpa?: number;
        roas?: number;
      };
      platforms?: string[];
      content_themes?: string[];
      kpis?: Array<{
        metric: string;
        target: string;
        current: string;
        status: 'on-track' | 'behind' | 'ahead';
      }>;
    };
  };
  previousStrategies: Array<{
    id: string;
    created_at: string;
    summary?: string;
  }>;
}

interface IntelligentContextDisplayProps {
  businessContext: BusinessContext;
  onStartStrategy: (contextSummary: string) => void;
  onRefineContext: () => void;
}

export function IntelligentContextDisplay({
  businessContext,
  onStartStrategy,
  onRefineContext
}: IntelligentContextDisplayProps) {
  const { t, i18n } = useTranslation('agents');
  const intlLocale = getIntlLocale(i18n.language);
  // For now, don't load cross-agent insights due to API issues
  // const { insights } = useCrossAgentIntelligence();
  const insights: any[] = []; // Placeholder until API is fixed

  // Track expanded sections
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
    
    // Company basics
    if (businessContext.company.name) {
      context.push(`Company: ${businessContext.company.name}`);
    }
    if (businessContext.company.industry) {
      context.push(`Industry: ${businessContext.company.industry}`);
    }
    if (businessContext.company.type) {
      context.push(`Organization Type: ${businessContext.company.type}`);
    }

    // AI learnings
    if (businessContext.aiLearnings.targetMarket) {
      context.push(`Target Market: ${businessContext.aiLearnings.targetMarket}`);
    }
    if (businessContext.aiLearnings.geography) {
      context.push(`Geographic Focus: ${businessContext.aiLearnings.geography}`);
    }
    if (businessContext.aiLearnings.businessModel) {
      context.push(`Business Model: ${businessContext.aiLearnings.businessModel}`);
    }
    if (businessContext.aiLearnings.marketingBudget) {
      context.push(`Marketing Budget: ${businessContext.aiLearnings.marketingBudget}`);
    }
    if (businessContext.aiLearnings.uniqueValueProposition) {
      context.push(`Value Proposition: ${businessContext.aiLearnings.uniqueValueProposition}`);
    }

    // Personas
    if (businessContext.personas.length > 0) {
      const personaNames = businessContext.personas.map(p => p.name).join(', ');
      context.push(`Customer Personas: ${personaNames}`);
    }

    // Active campaign
    if (businessContext.campaigns.active) {
      const campaign = businessContext.campaigns.active;
      context.push(`Active Campaign: ${campaign.name}`);
      if (campaign.objectives) {
        context.push(`Campaign Objectives: ${campaign.objectives}`);
      }
      if (campaign.budget_cents) {
        context.push(`Campaign Budget: $${(campaign.budget_cents / 100).toLocaleString(intlLocale)}`);
      }
    }

    // Previous experience
    if (businessContext.previousStrategies.length > 0) {
      context.push(`Previous Strategies: ${businessContext.previousStrategies.length} past strategy sessions`);
    }

    return context.join('\n');
  };

  const handleStartStrategy = () => {
    const contextSummary = generateContextSummary();
    const enhancedPrompt = `Based on my existing understanding of your business, here's what I know:

${contextSummary}

${insights.length > 0 ? `Recent AI Insights: ${insights.slice(0, 3).map(i => i.title).join(', ')}` : ''}

I'll use this context to create a tailored marketing strategy. Please confirm if this understanding is accurate, add any missing information, or let me know what specific marketing challenges you'd like to focus on.`;

    onStartStrategy(enhancedPrompt);
  };

  const dataCompleteness = () => {
    let score = 0;
    let total = 0;

    // Company basics (weight: 2)
    total += 2;
    if (businessContext.company.name && businessContext.company.industry) score += 2;
    else if (businessContext.company.name) score += 1;

    // AI learnings (weight: 3)
    total += 3;
    const learnings = Object.values(businessContext.aiLearnings).filter(v => v).length;
    score += Math.min(3, learnings);

    // Personas (weight: 2)
    total += 2;
    if (businessContext.personas.length >= 2) score += 2;
    else if (businessContext.personas.length >= 1) score += 1;

    // Campaign context (weight: 1)
    total += 1;
    if (businessContext.campaigns.active) score += 1;

    // Previous experience (weight: 1)
    total += 1;
    if (businessContext.previousStrategies.length > 0) score += 1;

    return Math.round((score / total) * 100);
  };

  const completeness = dataCompleteness();
  const isReady = completeness >= 40; // Minimum threshold for strategy generation

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="h-8 w-8 text-brand-gold" />
          <h1 className="text-3xl font-bold">{t('context.intelligentContext.title')}</h1>
        </div>
        <p className="text-lg text-muted-foreground">
          {t('context.intelligentContext.subtitle')}
        </p>
        
        {/* Completeness indicator */}
        <div className="flex items-center justify-center gap-2">
          <div className="flex items-center gap-1">
            {isReady ? (
              <CheckCircle className="h-4 w-4 text-brand-success" />
            ) : (
              <AlertCircle className="h-4 w-4 text-brand-gold" />
            )}
            <span className="text-sm font-medium">
              {t('context.intelligentContext.completeness', { percent: completeness })}
            </span>
          </div>
          <Badge variant={isReady ? "default" : "secondary"}>
            {isReady ? t('context.intelligentContext.readyForStrategy') : t('context.intelligentContext.needsMoreContext')}
          </Badge>
        </div>
      </div>

      {/* Business Understanding Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Company Profile */}
        <CompanyProfileCard
          company={businessContext.company}
          isExpanded={expandedSections['company'] || false}
          onToggle={() => toggleSection('company')}
        />

        {/* Target Market & Geography */}
        <MarketFocusCard
          aiLearnings={businessContext.aiLearnings}
          isExpanded={expandedSections['market'] || false}
          onToggle={() => toggleSection('market')}
        />

        {/* Customer Personas */}
        <Card>
          <CardHeader className="pb-3">
            <Collapsible open={expandedSections['personas'] || false} onOpenChange={() => toggleSection('personas')}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded p-2 -m-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-brand-gold" />
                    <CardTitle className="text-lg">{t('context.intelligentContext.customerPersonas')}</CardTitle>
                    {businessContext.personas.length > 0 && (
                      <Badge variant="outline">{businessContext.personas.length}</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {businessContext.personas.length > 0 && (
                      <CheckCircle className="h-4 w-4 text-brand-success" />
                    )}
                    {expandedSections['personas'] ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </div>
                </div>
              </CollapsibleTrigger>
              <CardContent className="pt-3">
                {businessContext.personas.length > 0 ? (
                  <>
                    {/* Collapsed View - Show more detail */}
                    <CollapsibleContent className="space-y-0">
                      <div className="space-y-2 mb-3">
                        {businessContext.personas.slice(0, 3).map((persona) => (
                          <PersonaCard key={persona.id} persona={persona} variant="compact" />
                        ))}
                        {businessContext.personas.length > 3 && (
                          <div className="text-xs text-muted-foreground pt-2 border-t">
                            {t('context.intelligentContext.morePersonas', { count: businessContext.personas.length - 3 })}
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                    
                    {/* Expanded View */}
                    <CollapsibleContent>
                      <div className="space-y-4">
                        {businessContext.personas.map((persona) => (
                          <PersonaCard key={persona.id} persona={persona} variant="detailed" />
                        ))}
                      </div>
                    </CollapsibleContent>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    {t('context.intelligentContext.personasEmptyState')}
                  </div>
                )}
              </CardContent>
            </Collapsible>
          </CardHeader>
        </Card>

        {/* Budget & Business Model */}
        <BusinessContextCard
          aiLearnings={businessContext.aiLearnings}
          isExpanded={expandedSections['business'] || false}
          onToggle={() => toggleSection('business')}
        />
      </div>

      {/* Active Campaign Context */}
      {businessContext.campaigns.active && (
        <ActiveCampaignCard
          campaign={businessContext.campaigns.active}
          isExpanded={expandedSections['campaign'] || false}
          onToggle={() => toggleSection('campaign')}
        />
      )}

      {/* AI Learning History */}
      <AILearningHistoryCard aiLearnings={businessContext.aiLearnings} />

      {/* AI Insights Summary (Legacy) */}
      {insights.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-brand-gold" />
              <CardTitle className="text-lg">{t('context.intelligentContext.recentAIInsights')}</CardTitle>
              <Badge variant="outline">{insights.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {insights.slice(0, 3).map((insight, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    insight.priority === 'high' ? 'bg-red-400' :
                    insight.priority === 'medium' ? 'bg-amber-400' : 'bg-green-400'
                  }`} />
                  <div>
                    <div className="font-medium text-sm">{insight.title}</div>
                    <div className="text-xs text-muted-foreground">{insight.description}</div>
                  </div>
                </div>
              ))}
              {insights.length > 3 && (
                <div className="text-xs text-muted-foreground">
                  {t('context.intelligentContext.moreInsights', { count: insights.length - 3 })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button
          onClick={handleStartStrategy}
          size="lg"
          className="h-12 px-8 gap-2"
          disabled={!isReady}
        >
          <MessageSquare className="h-5 w-5" />
          {t('context.intelligentContext.startStrategicConversation')}
          <ArrowRight className="h-4 w-4" />
        </Button>

        <Button
          onClick={onRefineContext}
          variant="outline"
          size="lg"
          className="h-12 px-6 gap-2"
        >
          <Edit className="h-4 w-4" />
          {t('context.intelligentContext.refineContext')}
        </Button>
      </div>

      {/* Guidance Text */}
      <div className="text-center text-sm text-muted-foreground max-w-2xl mx-auto">
        {isReady ? (
          <p>
            {t('context.intelligentContext.guidanceReady')}
          </p>
        ) : (
          <p>
            {t('context.intelligentContext.guidanceNeedsContext')}
          </p>
        )}
      </div>
    </div>
  );
}
