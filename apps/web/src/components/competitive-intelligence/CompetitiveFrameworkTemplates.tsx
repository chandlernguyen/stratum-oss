/**
 * Competitive Framework Templates Component
 *
 * Clickable framework cards with context-aware prompts
 * Pattern: Adapted from QuickWinTemplates with URL-based state management
 *
 * Features:
 * - 6 competitive intelligence frameworks (SWOT, Feature Comparison, etc.)
 * - Business context integration for personalized prompts
 * - URL-based navigation (bookmarkable, shareable)
 * - Strong fallback state for missing business context
 */

import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Target,
  TrendingUp,
  Users,
  Building2,
  DollarSign,
  Sparkles,
  Clock,
  AlertCircle,
  Settings
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useBusinessContext } from '@/hooks/useBusinessContext'
import type { BusinessContext } from '@/hooks/useBusinessContext'
import { useClientContext } from '@/contexts/ClientContext'
import { buildAgentRootUrl } from '@/utils/multiTenantRouting'
import { cn } from '@/lib/utils'

export interface CompetitiveFramework {
  id: string
  title: string
  description: string
  icon: React.ElementType
  timeToValue: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  category: 'strategic' | 'tactical' | 'financial' | 'market'
  generatePrompt: (context: BusinessContext | null) => string
  expectedOutcome: string
  isPopular?: boolean
  requiresCompanyData?: boolean  // If false, framework works with competitors-only analysis
}

const COMPETITIVE_FRAMEWORKS: CompetitiveFramework[] = [
  {
    id: 'swot-analysis',
    title: 'SWOT Analysis',
    description: 'Analyze competitor strengths, weaknesses, opportunities, and threats',
    icon: Target,
    timeToValue: '1 minute',
    difficulty: 'beginner',
    category: 'strategic',
    isPopular: true,
    requiresCompanyData: true,  // Needs your company for comparison
    expectedOutcome: 'Comprehensive SWOT matrix with actionable competitive insights',
    generatePrompt: (ctx) => {
      const company = ctx?.businessData?.company_name || 'our company'
      const competitor = ctx?.businessData?.key_competitors?.[0] || 'main competitor'
      const industry = ctx?.businessData?.industry || 'our industry'

      return `Create a comprehensive SWOT analysis comparing ${company} against ${competitor} in the ${industry} market.

Please analyze:
- **Strengths:** What advantages does ${company} have over ${competitor}?
- **Weaknesses:** Where does ${competitor} outperform us?
- **Opportunities:** What market gaps can ${company} exploit?
- **Threats:** What competitive threats should we monitor?

Use Google Search to get real-time data on ${competitor}'s latest products, pricing, and market position.`
    }
  },
  {
    id: 'feature-comparison',
    title: 'Feature Comparison',
    description: 'Compare product features, pricing, and capabilities side-by-side',
    icon: TrendingUp,
    timeToValue: '2 minutes',
    difficulty: 'beginner',
    category: 'tactical',
    isPopular: true,
    requiresCompanyData: true,  // Needs your company for comparison
    expectedOutcome: 'Detailed feature comparison matrix with competitive gaps',
    generatePrompt: (ctx) => {
      const company = ctx?.businessData?.company_name || 'our company'
      const competitors = ctx?.businessData?.key_competitors || ['Competitor A', 'Competitor B']
      const product = ctx?.businessData?.main_products?.[0] || 'our product'

      return `Create a detailed feature comparison matrix for ${product} from ${company} against ${competitors.slice(0, 2).join(' and ')}.

Compare across these dimensions:
- **Core Features:** Essential functionality comparison
- **Advanced Features:** Premium/enterprise capabilities
- **Integration Capabilities:** Third-party integrations and API access
- **User Experience:** Ease of use, interface quality, mobile support
- **Performance:** Speed, reliability, uptime

Use Google Search to find the latest product documentation and feature lists for each competitor.`
    }
  },
  {
    id: 'market-positioning',
    title: 'Market Positioning',
    description: 'Analyze competitive positioning, target markets, and differentiation',
    icon: Users,
    timeToValue: '2 minutes',
    difficulty: 'intermediate',
    category: 'strategic',
    requiresCompanyData: true,  // Needs your company for positioning
    expectedOutcome: 'Market positioning map with differentiation opportunities',
    generatePrompt: (ctx) => {
      const company = ctx?.businessData?.company_name || 'our company'
      const industry = ctx?.businessData?.industry || 'our industry'
      const competitors = ctx?.businessData?.key_competitors || ['Competitor A', 'Competitor B']

      return `Analyze market positioning for ${company} in the ${industry} space compared to ${competitors.slice(0, 2).join(' and ')}.

Research and compare:
- **Target Segments:** Which customer segments does each company focus on?
- **Value Propositions:** What unique value does each company claim?
- **Brand Messaging:** How does each company position themselves in the market?
- **Competitive Advantages:** What are the key differentiators?
- **Market Perception:** How are these companies perceived by customers?

Use Google Search to find recent marketing materials, customer reviews, and analyst reports.`
    }
  },
  {
    id: 'company-intelligence',
    title: 'Company Intelligence',
    description: 'Research company size, funding, growth trajectory, and strategic direction (Competitor-focused)',
    icon: Building2,
    timeToValue: '3 minutes',
    difficulty: 'intermediate',
    category: 'strategic',
    requiresCompanyData: false,  // Competitor-only analysis
    expectedOutcome: 'Comprehensive company profile with strategic insights',
    generatePrompt: (ctx) => {
      const competitors = ctx?.businessData?.key_competitors || []

      if (competitors.length === 0) {
        return `I'd like to research a specific competitor in detail. Please provide comprehensive company intelligence including:

- **Company Size & Revenue:** Employee count, annual revenue, growth rate
- **Funding & Financial Health:** Funding rounds, investors, financial stability
- **Leadership & Team:** Key executives, notable hires, company culture
- **Strategic Direction:** Recent acquisitions, partnerships, product roadmap
- **Market Position:** Market share, customer base, geographic presence

Which competitor would you like me to analyze?`
      }

      const competitor = competitors[0]
      return `Research comprehensive company intelligence for ${competitor}.

Investigate:
- **Company Size & Revenue:** Employee count, annual revenue, growth rate
- **Funding & Financial Health:** Funding rounds, investors, financial stability
- **Leadership & Team:** Key executives, notable hires, company culture
- **Strategic Direction:** Recent acquisitions, partnerships, product roadmap
- **Market Position:** Market share, customer base, geographic presence

Use Google Search to find recent news, funding announcements, and company reports.`
    }
  },
  {
    id: 'pricing-analysis',
    title: 'Pricing Analysis',
    description: 'Compare pricing models, packaging strategies, and value metrics',
    icon: DollarSign,
    timeToValue: '2 minutes',
    difficulty: 'beginner',
    category: 'financial',
    isPopular: true,
    requiresCompanyData: true,  // Needs your pricing for comparison
    expectedOutcome: 'Pricing comparison with monetization insights',
    generatePrompt: (ctx) => {
      const company = ctx?.businessData?.company_name || 'our company'
      const competitors = ctx?.businessData?.key_competitors || ['Competitor A', 'Competitor B']
      const product = ctx?.businessData?.main_products?.[0] || 'our product'

      return `Analyze pricing strategies for ${product} from ${company} compared to ${competitors.slice(0, 2).join(' and ')}.

Compare:
- **Pricing Tiers:** What pricing plans does each company offer?
- **Feature Packaging:** How are features distributed across pricing tiers?
- **Discounting Strategy:** Annual discounts, volume pricing, promotional offers
- **Value Metrics:** What usage/value metrics drive pricing (users, seats, API calls, etc.)?
- **Free Tier:** What's included in free/trial offerings?

Use Google Search to find current pricing pages and recent pricing changes.`
    }
  },
  {
    id: 'market-gap-analysis',
    title: 'Market Gap Analysis',
    description: 'Identify underserved segments, unmet needs, and blue ocean opportunities (Market-focused)',
    icon: Sparkles,
    timeToValue: '3 minutes',
    difficulty: 'advanced',
    category: 'market',
    requiresCompanyData: false,  // Market-focused, works without company data
    expectedOutcome: 'Market gap map with blue ocean opportunities',
    generatePrompt: (ctx) => {
      const industry = ctx?.businessData?.industry || ''
      const competitors = ctx?.businessData?.key_competitors || []

      if (!industry) {
        return `I'll help you identify market gaps and blue ocean opportunities. To provide the most relevant analysis, could you tell me:

1. What industry/market are you interested in?
2. (Optional) Who are the major players you're tracking?

I'll analyze:
- **Underserved Segments:** Customer segments not well-served by current solutions
- **Unmet Customer Needs:** Pain points that remain unsolved
- **White Space Mapping:** Areas where competitors are NOT competing
- **Emerging Trends:** New needs competitors haven't addressed
- **Blue Ocean Strategy:** New value curves that could be created`
      }

      const competitorText = competitors.length > 0
        ? `considering current competitive landscape including ${competitors.slice(0, 2).join(' and ')}`
        : 'analyzing the current competitive landscape'

      return `Identify market gaps and blue ocean opportunities in the ${industry} space, ${competitorText}.

Analyze:
- **Underserved Segments:** Which customer segments are not well-served by current solutions?
- **Unmet Customer Needs:** What pain points remain unsolved?
- **White Space Mapping:** Where are competitors NOT competing?
- **Emerging Trends:** What new needs are emerging that competitors haven't addressed?
- **Blue Ocean Strategy:** What new value curves could we create?

Use Google Search to find customer reviews, forum discussions, and industry trend reports.`
    }
  }
]

// Map framework IDs to translation keys (camelCase)
const FRAMEWORK_TRANSLATION_KEYS: Record<string, string> = {
  'swot-analysis': 'swotAnalysis',
  'feature-comparison': 'featureComparison',
  'market-positioning': 'marketPositioning',
  'company-intelligence': 'companyIntelligence',
  'pricing-analysis': 'pricingAnalysis',
  'market-gap-analysis': 'marketGapAnalysis'
}

export function CompetitiveFrameworkTemplates() {
  const navigate = useNavigate()
  const { t } = useTranslation('agents')
  const { clientSlug } = useClientContext()
  const { data: businessContext, isLoading } = useBusinessContext({ clientSlug: clientSlug ?? undefined })

  const handleFrameworkClick = (framework: CompetitiveFramework) => {
    // URL-based state management (CLAUDE.md principle) with client context
    const baseUrl = buildAgentRootUrl('competitive_intelligence', clientSlug)
    navigate(`${baseUrl}?framework=${framework.id}`)
  }

  // Strong fallback state when business context missing
  const hasBusinessContext = !!businessContext?.businessData?.company_name

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mt-2"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    )
  }

  if (!hasBusinessContext) {
    return (
      <Card className="border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30 inline-block">
              <AlertCircle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-amber-900 dark:text-amber-100 mb-2">
                {t('competitive_intelligence.page.frameworks.setupRequired.title')}
              </h3>
              <p className="text-amber-700 dark:text-amber-300 mb-6">
                {t('competitive_intelligence.page.frameworks.setupRequired.description')}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {/* Primary CTA - Setup Profile */}
              <Button
                onClick={() => navigate('/onboarding')}
                size="lg"
                className="bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700"
              >
                <Settings className="w-5 h-5 mr-2" />
                {t('competitive_intelligence.page.frameworks.setupRequired.setupButton')}
              </Button>
              {/* Secondary CTA - Continue with Generic */}
              <Button
                onClick={() => {
                  const baseUrl = buildAgentRootUrl('competitive_intelligence', clientSlug)
                  navigate(`${baseUrl}?framework=generic`)
                }}
                variant="outline"
                size="lg"
              >
                {t('competitive_intelligence.page.frameworks.setupRequired.continueGeneric')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {COMPETITIVE_FRAMEWORKS.map((framework) => {
        const Icon = framework.icon
        const translationKey = FRAMEWORK_TRANSLATION_KEYS[framework.id]

        return (
          <Card
            key={framework.id}
            onClick={() => handleFrameworkClick(framework)}
            className="cursor-pointer hover:shadow-xl transition-all duration-200 hover:border-amber-300 dark:hover:border-slate-700 hover:scale-[1.02]"
          >
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-slate-100 to-amber-100 dark:from-slate-900/30 dark:to-amber-900/30">
                  <Icon className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {framework.isPopular && (
                    <Badge variant="outline" className="text-xs bg-slate-50 dark:bg-slate-900/20 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800">
                      <Sparkles className="w-3 h-3 mr-1" />
                      {t('competitive_intelligence.page.frameworks.badges.popular')}
                    </Badge>
                  )}
                  {!framework.requiresCompanyData && (
                    <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
                      {t('competitive_intelligence.page.frameworks.badges.competitorsOnly')}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    {framework.timeToValue}
                  </Badge>
                </div>
              </div>
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {t(`competitive_intelligence.page.frameworks.${translationKey}.title`)}
              </CardTitle>
              <CardDescription className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {t(`competitive_intelligence.page.frameworks.${translationKey}.description`)}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {/* Expected Outcome */}
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-3 bg-gray-50 dark:bg-gray-900 p-2.5 rounded-lg">
                <span className="font-semibold text-gray-800 dark:text-gray-200">{t('competitive_intelligence.page.frameworks.youllGet')}</span>{' '}
                {t(`competitive_intelligence.page.frameworks.${translationKey}.expectedOutcome`)}
              </div>

              {/* Difficulty Badge */}
              <Badge
                variant="outline"
                className={cn(
                  'text-xs capitalize font-medium px-3 py-1',
                  framework.difficulty === 'beginner' &&
                    'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300',
                  framework.difficulty === 'intermediate' &&
                    'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
                  framework.difficulty === 'advanced' &&
                    'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                )}
              >
                {t(`competitive_intelligence.page.frameworks.difficulty.${framework.difficulty}`)}
              </Badge>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

/**
 * Export framework definitions for use in other components
 * (e.g., CompetitiveIntelligenceChat needs to generate prompts)
 */
export { COMPETITIVE_FRAMEWORKS }
