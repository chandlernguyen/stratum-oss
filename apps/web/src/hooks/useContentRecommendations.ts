import { useQuery } from '@tanstack/react-query';
import { useBusinessContext, type BusinessContext } from '@/hooks/useBusinessContext';
import { supabase } from '@/lib/supabase';
import { API_BASE_URL } from '@/lib/api';
import { getLocaleHeaders } from '@/lib/apiHeaders';
import { buildContextAwareUrl } from '@/utils/multiTenantRouting';

interface ContentRecommendation {
  id: string;
  task: string;
  tool: string;
  toolName: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  category: string;
  estimatedTime: string;
  status: 'ready' | 'blocked' | 'completed';
}

interface ClarificationQuestion {
  question: string;
  reason: string;
  category: string;
}

interface RecommendationsResponse {
  success: boolean;
  recommendations?: ContentRecommendation[];
  needs_setup?: boolean;
  needs_clarification?: boolean;
  clarification_questions?: ClarificationQuestion[];
  confidence?: 'high' | 'medium' | 'low';
  message?: string;
  prerequisites?: string[];
  next_action?: string;
  progress?: {
    percentage: number;
    completed: number;
    message: string;
  };
  context_summary?: {
    has_strategy: boolean;
    has_personas: boolean;
    has_brand_guidelines: boolean;
    content_pillars: string[];
  };
}

export type { ClarificationQuestion };

/**
 * Hook for fetching AI-powered content recommendations
 *
 * @param options - Optional configuration
 * @param options.clientSlug - For Agency users: get recommendations for specific client
 */
export function useContentRecommendations(options: { clientSlug?: string } = {}) {
  // ✅ FIX: Pass clientSlug to useBusinessContext for client-scoped data
  const { data: businessContext, isLoading: contextLoading } = useBusinessContext({ clientSlug: options.clientSlug });

  return useQuery<RecommendationsResponse>({
    queryKey: ['content-recommendations', businessContext?.dataHash, options.clientSlug],
    queryFn: async () => {
      if (!businessContext) {
        return {
          success: false,
          needs_setup: true,
          message: "Loading your business context...",
          prerequisites: ["Organization context"],
          next_action: buildContextAwareUrl("/dashboard", options.clientSlug || null) || "/dashboard"
        };
      }

      try {
        console.log('[ContentRecommendations] Enhanced context data:', {
          businessData: !!businessContext.businessData,
          personas: businessContext.personas.length,
          strategies: businessContext.strategies.length,
          content: businessContext.content.length,
          dataHash: businessContext.dataHash
        });

        // ✅ FIX: For client-scoped contexts (Agency users), personas + strategies are sufficient
        // businessData is org-level and may not exist for client-specific intelligence
        const hasMinimumIntelligence = businessContext.personas.length > 0 && businessContext.strategies.length > 0;

        // Check prerequisites - require either businessData OR sufficient client intelligence
        if (!businessContext.businessData && !hasMinimumIntelligence) {
          return {
            success: false,
            needs_setup: true,
            message: "Let's start by setting up your business profile",
            prerequisites: ["Complete business profile"],
            next_action: buildContextAwareUrl("/profile/business-context", options.clientSlug || null) || "/profile/business-context"
          };
        }

        if (businessContext.personas.length === 0) {
          return {
            success: false,
            needs_setup: true,
            message: "First, let's define your target audience",
            prerequisites: ["Create at least one customer persona"],
            next_action: "/persona"
          };
        }

        if (businessContext.strategies.length === 0) {
          return {
            success: false,
            needs_setup: true,
            message: "You need a marketing strategy before creating content",
            prerequisites: ["Define marketing strategy"],
            next_action: "/marketing-strategy"
          };
        }

        // Generate LLM-powered contextual recommendations using backend endpoint
        const recommendations = await generateLLMRecommendations(businessContext);

        console.log('[ContentRecommendations] Generated LLM recommendations:', recommendations.length);

        // Database-First: Mark completed recommendations instead of filtering them out
        // Check if recommendations have been actioned by looking at agent_outputs with matching metadata
        const completedRecommendationIds = businessContext.content
          .map(c => c.metadata?.generated_from_recommendation)
          .filter(Boolean);

        console.log('[ContentRecommendations] Completed recommendation IDs:', completedRecommendationIds);
        console.log('[ContentRecommendations] All recommendation IDs:', recommendations.map(r => r.id));

        // Mark recommendations as completed if they match
        const recommendationsWithStatus = recommendations.map(r => ({
          ...r,
          status: completedRecommendationIds.includes(r.id) ? 'completed' as const : r.status
        }));

        // Sort: incomplete first, then completed
        const sortedRecommendations = recommendationsWithStatus.sort((a, b) => {
          if (a.status === 'completed' && b.status !== 'completed') return 1;
          if (a.status !== 'completed' && b.status === 'completed') return -1;
          return 0;
        });

        console.log('[ContentRecommendations] Recommendations with status:', sortedRecommendations.map(r => ({ id: r.id, status: r.status })));

        return {
          success: true,
          recommendations: sortedRecommendations.slice(0, 5), // Limit to 5 recommendations
          progress: {
            percentage: businessContext.content.length ? Math.min((businessContext.content.length * 10), 100) : 0,
            completed: businessContext.content.length,
            message: businessContext.content.length ? `${businessContext.content.length} pieces of content created` : "Ready to start creating content"
          },
          context_summary: {
            has_strategy: businessContext.strategies.length > 0,
            has_personas: businessContext.personas.length > 0,
            has_brand_guidelines: false, // Could add this later if needed
            content_pillars: extractContentPillars(businessContext.strategies)
          }
        };

      } catch (error) {
        console.error('Error fetching content recommendations:', error);
        // Return mock data on error for development
        return getMockRecommendations();
      }
    },
    enabled: !!businessContext && !contextLoading, // Wait for business context
    retry: 2,
    staleTime: 10 * 60 * 1000, // 10 minutes - contextual recommendations change less frequently
    refetchInterval: false,
  });
}

/**
 * Generate LLM-powered contextual recommendations using backend endpoint
 * Phase 2: Full LLM integration with intelligent caching
 */
async function generateLLMRecommendations(context: BusinessContext): Promise<ContentRecommendation[]> {
  try {
    // Get authentication token
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
      console.warn('[LLM Recommendations] No authentication token available');
      return getFallbackRecommendations(context);
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/content/recommendations`, {
      method: 'POST',
      headers: getLocaleHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }),
      body: JSON.stringify({
        org_id: context.orgId,
        business_context: context.businessData,
        personas: context.personas,
        strategies: context.strategies,
        existing_content: context.content  // NEW: Send existing content to LLM
      })
    });

    if (!response.ok) {
      console.error('[LLM Recommendations] API call failed:', response.status, response.statusText);
      return getFallbackRecommendations(context);
    }

    const result = await response.json();

    if (result.success && result.recommendations) {
      console.log('[LLM Recommendations] Successfully generated:', result.recommendations.length);
      return result.recommendations;
    } else {
      console.warn('[LLM Recommendations] Backend returned no recommendations:', result);
      return getFallbackRecommendations(context);
    }

  } catch (error) {
    console.error('[LLM Recommendations] API call error:', error);
    return getFallbackRecommendations(context);
  }
}

/**
 * Fallback recommendations when LLM generation fails
 * Uses enhanced contextual logic from Phase 1
 */
function getFallbackRecommendations(context: BusinessContext): ContentRecommendation[] {
  const recommendations: ContentRecommendation[] = [];
  const { businessData, personas, strategies, content } = context;

  // Industry-specific recommendations
  if (businessData?.industry) {
    const industryRecommendations = getIndustrySpecificRecommendations(businessData.industry, businessData);
    recommendations.push(...industryRecommendations);
  }

  // Persona-driven recommendations
  personas.forEach((persona, index) => {
    if (index < 2) { // Limit to top 2 personas
      const personaRecommendations = getPersonaDrivenRecommendations(persona);
      recommendations.push(...personaRecommendations);
    }
  });

  // Strategy-based recommendations
  const contentPillars = extractContentPillars(strategies);
  if (contentPillars.length > 0) {
    contentPillars.slice(0, 2).forEach((pillar, index) => {
      recommendations.push({
        id: `strategy_${pillar.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        task: `Create thought leadership content about ${pillar}`,
        tool: "seo-blog",
        toolName: "SEO Blog Post Generator",
        priority: index === 0 ? "high" : "medium",
        reason: `Aligns with your strategic content pillar: ${pillar}`,
        category: "thought-leadership",
        estimatedTime: "35 minutes",
        status: "ready"
      });
    });
  }

  // Competitive differentiation recommendations
  if (businessData?.key_competitors?.length > 0) {
    recommendations.push({
      id: "competitive_comparison",
      task: `Create comparison guide: ${businessData.company_name} vs ${businessData.key_competitors[0]}`,
      tool: "usp-content",
      toolName: "USP-Focused Content",
      priority: "high",
      reason: `Differentiate from your key competitor: ${businessData.key_competitors[0]}`,
      category: "differentiation",
      estimatedTime: "40 minutes",
      status: "ready"
    });
  }

  // Content gap recommendations
  if (content.length < 5) {
    recommendations.push({
      id: "email_nurture_contextual",
      task: `Design email sequence for ${businessData?.target_market?.[0] || 'target customers'}`,
      tool: "email-drip",
      toolName: "Email Drip Campaign Designer",
      priority: "medium",
      reason: `Build relationships with ${businessData?.target_market?.[0] || 'your target audience'}`,
      category: "email",
      estimatedTime: "45 minutes",
      status: "ready"
    });
  }

  // Social media with business context
  recommendations.push({
    id: "social_contextual",
    task: `Create ${getIndustryPreferredPlatform(businessData?.industry)} content calendar`,
    tool: "social-calendar",
    toolName: "Social Media Calendar",
    priority: "medium",
    reason: `Target your ${businessData?.target_market?.[0]} audience where they spend time`,
    category: "social",
    estimatedTime: "50 minutes",
    status: "ready"
  });

  // Fallback if no contextual recommendations
  if (recommendations.length === 0) {
    recommendations.push({
      id: "intro_blog",
      task: `Create introduction blog for ${businessData?.company_name || 'your company'}`,
      tool: "seo-blog",
      toolName: "SEO Blog Post Generator",
      priority: "high",
      reason: "Start building your content presence",
      category: "introduction",
      estimatedTime: "30 minutes",
      status: "ready"
    });
  }

  return recommendations;
}

/**
 * Industry-specific content recommendations
 */
function getIndustrySpecificRecommendations(industry: string, businessData: any): ContentRecommendation[] {
  const recommendations: ContentRecommendation[] = [];

  if (industry.includes('SaaS') || industry.includes('Software')) {
    recommendations.push({
      id: "saas_case_study",
      task: `Create ROI case study for ${businessData.target_market?.[0] || 'enterprise clients'}`,
      tool: "usp-content",
      toolName: "USP-Focused Content",
      priority: "high",
      reason: "SaaS buyers need proof of ROI and measurable outcomes",
      category: "case-study",
      estimatedTime: "50 minutes",
      status: "ready"
    });
  }

  if (industry.includes('Construction') || industry.includes('Manufacturing')) {
    recommendations.push({
      id: "industry_efficiency",
      task: `Create efficiency guide for ${industry.toLowerCase()} teams`,
      tool: "thought-leadership",
      toolName: "Thought Leadership Creator",
      priority: "high",
      reason: `${industry} professionals prioritize operational efficiency`,
      category: "industry-guide",
      estimatedTime: "45 minutes",
      status: "ready"
    });
  }

  return recommendations;
}

/**
 * Persona-driven content recommendations
 */
function getPersonaDrivenRecommendations(persona: any): ContentRecommendation[] {
  const recommendations: ContentRecommendation[] = [];
  const personaContent = persona.content || {};

  // Extract key information
  const personaName = personaContent.name || persona.title;
  const role = personaContent.title || 'Professional';
  const mainPainPoint = personaContent.pain_points?.[0] || 'operational challenges';

  recommendations.push({
    id: `persona_${persona.id}_content`,
    task: `Create "${role}'s Guide" addressing ${mainPainPoint}`,
    tool: "usp-content",
    toolName: "USP-Focused Content",
    priority: "high",
    reason: `Targets your key persona ${personaName} and their main challenge`,
    category: "persona-focused",
    estimatedTime: "40 minutes",
    status: "ready"
  });

  return recommendations;
}

/**
 * Extract content pillars from strategy outputs
 */
function extractContentPillars(strategies: any[]): string[] {
  const pillars: string[] = [];

  strategies.forEach(strategy => {
    const content = strategy.content || {};

    const strategyPillars = content.content_pillars ||
                           content.messaging_framework?.content_pillars ||
                           content.strategy_data?.content_pillars ||
                           content.content_strategy?.pillars ||
                           [];

    if (Array.isArray(strategyPillars)) {
      pillars.push(...strategyPillars);
    }
  });

  return [...new Set(pillars)]; // Remove duplicates
}

/**
 * Get preferred social media platform by industry
 */
function getIndustryPreferredPlatform(industry?: string): string {
  if (!industry) return 'LinkedIn';

  if (industry.includes('B2B') || industry.includes('SaaS') || industry.includes('Construction')) {
    return 'LinkedIn';
  }
  if (industry.includes('E-commerce') || industry.includes('Retail')) {
    return 'Instagram';
  }
  if (industry.includes('Tech') || industry.includes('Software')) {
    return 'Twitter/X';
  }

  return 'LinkedIn'; // Default for B2B
}

// Mock data for development
function getMockRecommendations(): RecommendationsResponse {
  // Check if user has context (mock check)
  const hasContext = localStorage.getItem('hasBusinessContext') === 'true';

  if (!hasContext) {
    return {
      success: false,
      needs_setup: true,
      message: "Let's start by setting up your business profile",
      prerequisites: ["Complete business profile"],
      next_action: "/profile/business-context"
    };
  }

  return {
    success: true,
    recommendations: [
      {
        id: "blog_cloud_migration",
        task: "Create blog post about Cloud Migration Best Practices",
        tool: "seo-blog",
        toolName: "SEO Blog Post Generator",
        priority: "high",
        reason: "Aligns with your Q4 thought leadership content pillar",
        category: "thought-leadership",
        estimatedTime: "30 minutes",
        status: "ready"
      },
      {
        id: "email_nurture",
        task: "Design 5-email nurture sequence for new leads",
        tool: "email-drip",
        toolName: "Email Drip Campaign Designer",
        priority: "medium",
        reason: "No email automation currently active",
        category: "email",
        estimatedTime: "45 minutes",
        status: "ready"
      },
      {
        id: "social_calendar",
        task: "Plan LinkedIn content for next month",
        tool: "social-calendar",
        toolName: "Social Media Calendar",
        priority: "medium",
        reason: "LinkedIn is your primary B2B channel",
        category: "social",
        estimatedTime: "30 minutes",
        status: "ready"
      },
      {
        id: "usp_content",
        task: "Create USP comparison against competitors",
        tool: "usp-content",
        toolName: "USP-Focused Content",
        priority: "low",
        reason: "Differentiate your unique value proposition",
        category: "differentiation",
        estimatedTime: "25 minutes",
        status: "ready"
      }
    ],
    progress: {
      percentage: 20,
      completed: 2,
      message: "2 content pieces created"
    },
    context_summary: {
      has_strategy: true,
      has_personas: true,
      has_brand_guidelines: true,
      content_pillars: ["Cloud Migration", "Digital Transformation", "Cost Optimization"]
    }
  };
}
