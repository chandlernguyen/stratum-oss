import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Building2, Target, MessageSquare, TrendingUp, Lightbulb, FileText } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUserIdentity } from '@/hooks/data/useUserIdentity'; // CORRECT: Use canonical hook
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useLocale } from '@/hooks/useLocale';
import { getIntlLocale } from '@/lib/locales';

interface ContentContext {
  businessData?: {
    company_name?: string;
    industry?: string;
    target_market?: string[];
    main_products?: string[];
    marketing_budget?: string;
    unique_value_proposition?: string;
  };
  marketingStrategies?: Array<{
    id: string;
    title: string;
    positioning_statement?: string;
    target_segments?: string[];
    messaging_framework?: any;
    content_pillars?: string[];
  }>;
  personas?: Array<{
    id: string;
    name: string;
    demographics?: any;
    goals?: string[];
    pain_points?: string[];
    preferred_channels?: string[];
  }>;
  recentContent?: Array<{
    id: string;
    title: string;
    content_type: string;
    created_at: string;
    performance_score?: number;
  }>;
  aiInsights?: Array<{
    content: string;
    category: string;
    confidence_score: number;
  }>;
}

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  icon,
  children,
  defaultOpen = false,
  badge
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left hover:bg-gray-50 dark:hover:bg-gray-800 -m-2 p-2 rounded transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-medium">{title}</span>
          {badge && <Badge variant="secondary">{badge}</Badge>}
        </div>
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
      {isOpen && <div className="pt-2">{children}</div>}
    </div>
  );
};

export default function ContentIntelligentDisplay() {
  const { locale } = useLocale();
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  // Fetch context data using direct Supabase queries
  const { data: context, isLoading } = useQuery<ContentContext>({
    queryKey: ['content-context', orgId],
    queryFn: async () => {
      if (!orgId) {
        console.log('[ContentIntelligentDisplay] No org_id available');
        return {
          businessData: undefined,
          marketingStrategies: [],
          personas: [],
          recentContent: [],
          aiInsights: []
        };
      }

      // Direct database queries with RLS
      // Fetch business context
      const { data: businessData, error: businessError } = await supabase
        .from('core_business_data')
        .select('*')
        .eq('org_id', orgId)
        .maybeSingle();

      if (businessError) {
        console.error('[ContentIntelligentDisplay] Error fetching business context:', businessError);
      }

      // Fetch marketing strategies using nuclear architecture
      const { data: strategies, error: strategiesError } = await supabase
        .from('agent_outputs')
        .select('*')
        .eq('org_id', orgId)
        .eq('agent_type', 'marketing_strategy')
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .limit(3);

      if (strategiesError) {
        console.error('[ContentIntelligentDisplay] Error fetching strategies:', strategiesError);
      }

      // Parse structured_output for strategies if needed
      const marketingStrategies = (strategies || []).map((strategy: any) => {
        let parsedData = null;
        if (strategy.structured_output) {
          try {
            parsedData = typeof strategy.structured_output === 'string'
              ? JSON.parse(strategy.structured_output)
              : strategy.structured_output;
          } catch (e) {
            console.log('[ContentIntelligentDisplay] Could not parse structured_output:', e);
          }
        }

        return {
          id: strategy.id,
          title: strategy.title || strategy.name || 'Marketing Strategy',
          positioning_statement: parsedData?.positioning_statement || strategy.positioning_statement,
          target_segments: parsedData?.target_segments || strategy.target_segments,
          messaging_framework: parsedData?.messaging_framework || strategy.messaging_framework,
          content_pillars: parsedData?.content_pillars || strategy.content_pillars || []
        };
      });

      // Fetch personas using nuclear migration pattern
      const { data: personasData, error: personasError } = await supabase
        .from('agent_outputs')
        .select('*')
        .eq('org_id', orgId)
        .eq('agent_type', 'persona')
        .eq('output_type', 'persona')
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .limit(3);

      if (personasError) {
        console.error('[ContentIntelligentDisplay] Error fetching personas:', personasError);
      }

      // Extract persona data from JSONB content field
      const personas = (personasData || []).map((item: any) => {
        const content = item.content || {};
        return {
          id: item.id,
          name: content.name,
          title: content.title,
          demographics: content.demographics || {},
          goals: content.goals || [],
          pain_points: content.pain_points || [],
          preferred_channels: content.preferred_channels || [],
        };
      });

      // Fetch recent content outputs using nuclear architecture
      const { data: recentContent, error: contentError } = await supabase
        .from('agent_outputs')
        .select('*')
        .eq('org_id', orgId)
        .eq('agent_type', 'content')
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .limit(5);

      if (contentError) {
        console.error('[ContentIntelligentDisplay] Error fetching content outputs:', contentError);
      }

      // Format recent content
      const formattedContent = (recentContent || []).map((content: any) => ({
        id: content.id,
        title: content.title || content.name || 'Content',
        content_type: content.content_type || content.tool_used || 'article',
        created_at: content.created_at,
        performance_score: content.performance_score
      }));

      // AI insights would come from a separate table if it exists
      // For now, return empty array as placeholder
      const aiInsights: any[] = [];

      return {
        businessData,
        marketingStrategies,
        personas: personas || [],
        recentContent: formattedContent,
        aiInsights
      };
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-20 bg-gray-100 rounded"></div>
          <div className="h-20 bg-gray-100 rounded"></div>
        </div>
      </Card>
    );
  }

  if (!context) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Content Intelligence Context</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Your business context and marketing insights to guide content creation
          </p>
        </div>
        <Button variant="outline" size="sm">
          Generate Content Plan
        </Button>
      </div>

      {/* Business Overview */}
      {context.businessData && (
        <CollapsibleSection
          title="Business Overview"
          icon={<Building2 className="h-5 w-5 text-blue-500" />}
          defaultOpen={true}
          badge={context.businessData.industry}
        >
          <div className="space-y-3 text-sm">
            <div>
              <span className="font-medium">Company:</span> {context.businessData.company_name || 'Not specified'}
            </div>
            {context.businessData.unique_value_proposition && (
              <div>
                <span className="font-medium">Value Proposition:</span>
                <p className="text-muted-foreground mt-1">{context.businessData.unique_value_proposition}</p>
              </div>
            )}
            {context.businessData.target_market && context.businessData.target_market.length > 0 && (
              <div>
                <span className="font-medium">Target Markets:</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {context.businessData.target_market.map((market, idx) => (
                    <Badge key={idx} variant="secondary">{market}</Badge>
                  ))}
                </div>
              </div>
            )}
            {context.businessData.main_products && context.businessData.main_products.length > 0 && (
              <div>
                <span className="font-medium">Products/Services:</span>
                <ul className="list-disc list-inside text-muted-foreground mt-1">
                  {context.businessData.main_products.slice(0, 3).map((product, idx) => (
                    <li key={idx}>{product}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* Marketing Strategy */}
      {context.marketingStrategies && context.marketingStrategies.length > 0 && (
        <CollapsibleSection
          title="Marketing Strategy"
          icon={<Target className="h-5 w-5 text-green-500" />}
          badge={`${context.marketingStrategies.length} active`}
        >
          <div className="space-y-4">
            {context.marketingStrategies.map((strategy) => (
              <div key={strategy.id} className="border-l-2 border-green-200 pl-4 space-y-2">
                <div className="font-medium">{strategy.title}</div>
                {strategy.positioning_statement && (
                  <p className="text-sm text-muted-foreground">{strategy.positioning_statement}</p>
                )}
                {strategy.content_pillars && strategy.content_pillars.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {strategy.content_pillars.map((pillar, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {pillar}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Target Personas */}
      {context.personas && context.personas.length > 0 && (
        <CollapsibleSection
          title="Target Personas"
          icon={<MessageSquare className="h-5 w-5 text-amber-500" />}
          badge={`${context.personas.length} defined`}
        >
          <div className="space-y-3">
            {context.personas.map((persona) => (
              <div key={persona.id} className="flex items-start gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-amber-600">
                    {persona.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 space-y-1">
                  <div className="font-medium">{persona.name}</div>
                  {persona.goals && persona.goals.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Goals: {persona.goals.slice(0, 2).join(', ')}
                    </p>
                  )}
                  {persona.preferred_channels && persona.preferred_channels.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {persona.preferred_channels.slice(0, 3).map((channel, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {channel}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Recent Content Performance */}
      {context.recentContent && context.recentContent.length > 0 && (
        <CollapsibleSection
          title="Recent Content"
          icon={<FileText className="h-5 w-5 text-orange-500" />}
          badge={`${context.recentContent.length} pieces`}
        >
          <div className="space-y-2">
            {context.recentContent.map((content) => (
              <div key={content.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                    <div className="font-medium text-sm">{content.title}</div>
                    <div className="text-xs text-muted-foreground">
                    {content.content_type} • {new Date(content.created_at).toLocaleDateString(getIntlLocale(locale))}
                    </div>
                  </div>
                {content.performance_score && (
                  <Badge variant={content.performance_score > 70 ? "default" : "secondary"}>
                    {content.performance_score}%
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* AI Insights */}
      {context.aiInsights && context.aiInsights.length > 0 && (
        <CollapsibleSection
          title="Content Insights"
          icon={<Lightbulb className="h-5 w-5 text-yellow-500" />}
          badge="AI Generated"
        >
          <div className="space-y-2">
            {context.aiInsights.map((insight, idx) => (
              <div key={idx} className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                <p className="text-sm">{insight.content}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    {insight.category}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(insight.confidence_score * 100)}% confidence
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Suggested Actions */}
      <Card className="p-4 bg-gradient-to-r from-slate-50 to-amber-50 dark:from-blue-900/20 dark:to-amber-900/20">
        <div className="flex items-start gap-3">
          <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="space-y-2">
            <h3 className="font-medium">Suggested Next Steps</h3>
            <ul className="space-y-1 text-sm">
              <li>• Generate a content plan based on your marketing strategy</li>
              <li>• Create content targeting your primary persona</li>
              <li>• Develop content for underserved content pillars</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
