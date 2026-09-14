import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Target,
  Users,
  PenTool,
  TrendingUp,
  Zap,
  Clock,
  ArrowRight
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AGENT_IDENTITY } from '@/config/agentIdentity'
import { cn } from '@/lib/utils'

export interface QuickWinTemplate {
  id: string
  title: string
  description: string
  icon: React.ElementType
  agents: string[]
  timeToValue: string
  prefilledPrompt: string
  expectedOutcome: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  category: 'analysis' | 'content' | 'strategy' | 'growth'
}

const QUICK_WIN_TEMPLATES: QuickWinTemplate[] = [
  {
    id: 'competitor-analysis',
    title: 'Outpace Your Competition',
    description: 'Get instant insights on your competitive landscape',
    icon: TrendingUp,
    agents: ['competitive-intelligence', 'strategy'],
    timeToValue: '2 minutes',
    prefilledPrompt: 'Analyze how we compare to [competitor] in [industry]',
    expectedOutcome: 'Competitive analysis with actionable gaps and opportunities',
    difficulty: 'beginner',
    category: 'analysis'
  },
  {
    id: 'customer-discovery',
    title: 'Understand Your Customers',
    description: 'Create detailed buyer personas for better targeting',
    icon: Users,
    agents: ['persona', 'quick-wins'],
    timeToValue: '3 minutes',
    prefilledPrompt: 'Create buyer personas for [product/service] targeting [market]',
    expectedOutcome: '3-5 detailed personas with demographics and behaviors',
    difficulty: 'beginner',
    category: 'strategy'
  },
  {
    id: 'content-sprint',
    title: 'Generate Week of Content',
    description: 'Create a full week of social media content instantly',
    icon: PenTool,
    agents: ['content', 'campaign-execution'],
    timeToValue: '5 minutes',
    prefilledPrompt: 'Create 7 days of social media content about [topic] for [platform]',
    expectedOutcome: 'Complete content calendar with posts and captions',
    difficulty: 'beginner',
    category: 'content'
  },
  {
    id: 'growth-opportunities',
    title: 'Find Quick Growth Wins',
    description: 'Identify immediate opportunities to boost growth',
    icon: Zap,
    agents: ['quick-wins', 'roi-budget'],
    timeToValue: '2 minutes',
    prefilledPrompt: 'Find quick wins to improve [metric] for [business type]',
    expectedOutcome: '5-10 actionable improvements you can implement today',
    difficulty: 'beginner',
    category: 'growth'
  },
  {
    id: 'marketing-strategy',
    title: 'Build Marketing Strategy',
    description: 'Develop a comprehensive marketing strategy',
    icon: Target,
    agents: ['strategy', 'persona', 'content'],
    timeToValue: '10 minutes',
    prefilledPrompt: 'Create marketing strategy for [product] launching in [timeframe]',
    expectedOutcome: 'Full strategy with goals, tactics, and timeline',
    difficulty: 'intermediate',
    category: 'strategy'
  },
  {
    id: 'roi-optimization',
    title: 'Optimize Marketing ROI',
    description: 'Analyze and improve your marketing spend efficiency',
    icon: TrendingUp,
    agents: ['roi-budget', 'analytics', 'quick-wins'],
    timeToValue: '5 minutes',
    prefilledPrompt: 'Optimize ROI for [campaign] with budget of [amount]',
    expectedOutcome: 'Budget reallocation plan with projected ROI improvements',
    difficulty: 'intermediate',
    category: 'analysis'
  }
]

interface QuickWinTemplatesProps {
  onSelectTemplate: (template: QuickWinTemplate) => void
  className?: string
}

export function QuickWinTemplates({ onSelectTemplate, className }: QuickWinTemplatesProps) {
  const { t } = useTranslation('onboarding')
  const navigate = useNavigate()
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  
  const categories = ['all', 'analysis', 'content', 'strategy', 'growth']
  
  const filteredTemplates = selectedCategory === 'all' 
    ? QUICK_WIN_TEMPLATES 
    : QUICK_WIN_TEMPLATES.filter(t => t.category === selectedCategory)

  const handleTemplateClick = (template: QuickWinTemplate) => {
    // Store template in localStorage for the agent to pick up
    localStorage.setItem('quickWinTemplate', JSON.stringify(template))
    
    // Navigate to the first agent in the template
    const firstAgent = template.agents[0]
    const agentPath = AGENT_IDENTITY[firstAgent]?.path
    
    if (agentPath) {
      navigate(agentPath)
    }
    
    // Call the callback if provided
    onSelectTemplate(template)
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header - removed since Dialog already has title */}

      {/* Category Filter - Using proper design system */}
      <div className="flex justify-center gap-3 pb-4 border-b mb-6">
        {categories.map(category => (
          <Button
            key={category}
            variant={selectedCategory === category ? "default" : "ghost"}
            size="default"
            onClick={() => setSelectedCategory(category)}
            className={cn(
              "capitalize font-medium",
              selectedCategory === category
                ? "bg-amber-500 text-white hover:bg-amber-600"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            {t(`quickWin.categories.${category}`)}
          </Button>
        ))}
      </div>

      {/* Template Grid - Full width with 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-h-[650px] overflow-y-auto pr-3 scrollbar-thin">
        {filteredTemplates.map((template) => {
          const Icon = template.icon
          
          return (
            <Card 
              key={template.id}
              className="cursor-pointer hover:shadow-xl transition-all duration-200 hover:border-amber-300 border-gray-200 hover:scale-[1.02]"
              onClick={() => handleTemplateClick(template)}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-slate-50 to-amber-50 dark:from-slate-900/20 dark:to-amber-900/20">
                    <Icon className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-sm font-medium">
                      <Clock className="w-4 h-4 mr-1.5" />
                      {template.timeToValue}
                    </Badge>
                  </div>
                </div>
                <CardTitle className="text-lg font-semibold text-gray-900 mt-3">{template.title}</CardTitle>
                <CardDescription className="text-sm text-gray-600 leading-relaxed mt-1">{template.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {/* Agents involved */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {template.agents.map(agentId => {
                    const agent = AGENT_IDENTITY[agentId]
                    if (!agent) return null
                    
                    return (
                      <Badge 
                        key={agentId}
                        variant="secondary"
                        className="text-sm"
                        style={{ 
                          backgroundColor: `${agent.color}20`,
                          color: agent.color 
                        }}
                      >
                        {agent.badge}
                      </Badge>
                    )
                  })}
                </div>

                {/* Expected Outcome */}
                <div className="text-sm text-gray-600 mb-3 bg-gray-50 p-2.5 rounded-lg">
                  <span className="font-semibold text-gray-800">{t('quickWin.youllGet')}:</span> {template.expectedOutcome}
                </div>

                {/* Difficulty */}
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-sm capitalize font-medium px-3 py-1",
                      template.difficulty === 'beginner' && "border-green-200 bg-green-50 text-green-700",
                      template.difficulty === 'intermediate' && "border-amber-200 bg-amber-50 text-amber-700",
                      template.difficulty === 'advanced' && "border-red-200 bg-red-50 text-red-700"
                    )}
                  >
                    {t(`quickWin.difficulty.${template.difficulty}`)}
                  </Badge>
                  <ArrowRight className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          {t('quickWin.noTemplates')}
        </div>
      )}
    </div>
  )
}