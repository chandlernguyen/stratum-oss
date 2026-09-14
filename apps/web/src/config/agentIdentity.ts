import {
  Target,
  Users,
  PenTool,
  Rocket,
  TrendingUp,
  HeartHandshake,
  Megaphone,
  LineChart,
  Sparkles
} from 'lucide-react'

export interface AgentIdentity {
  id: string
  name: string
  icon: React.ElementType
  color: string
  gradient: string
  badge: string
  description: string
  estimatedTime: string
  path: string
  outputTabName?: string  // Custom name for the outputs tab
}

export const AGENT_IDENTITY: Record<string, AgentIdentity> = {
  strategy: {
    id: 'strategy',
    name: 'Strategy Agent',
    icon: Target,
    color: '#64748B',  // Slate - Professional, strategic thinking
    gradient: 'from-slate-600 to-slate-700',
    badge: 'Strategic Advisor',
    description: 'Business analysis, SWOT, growth planning',
    estimatedTime: '5-10 min',
    path: '/strategy',
    outputTabName: 'Strategies'
  },
  persona: {
    id: 'persona',
    name: 'Persona Agent',
    icon: Users,
    color: '#D97706',  // Amber-700 - Warm, human-centric (refined from gold)
    gradient: 'from-amber-600 to-amber-700',
    badge: 'Customer Expert',
    description: 'Customer profiling, buyer journey mapping',
    estimatedTime: '3-5 min',
    path: '/persona',
    outputTabName: 'Personas'
  },
  marketing_strategy: {
    id: 'marketing_strategy',
    name: 'Marketing Strategy',
    icon: Megaphone,
    color: '#1E293B',  // Charcoal - Authority, strategic depth
    gradient: 'from-slate-700 to-slate-800',
    badge: 'Marketing Strategist',
    description: 'Go-to-market strategies, messaging frameworks',
    estimatedTime: '5-10 min',
    path: '/marketing-strategy',
    outputTabName: 'Strategies'
  },
  content: {
    id: 'content',
    name: 'Content Agent',
    icon: PenTool,
    color: '#F59E0B',  // Gold - Creative value, premium content
    gradient: 'from-amber-500 to-amber-600',
    badge: 'Creative Specialist',
    description: 'Campaign materials, social media content',
    estimatedTime: '5-10 min',
    path: '/content',
    outputTabName: 'Content'
  },
  // DEPRECATED: analytics, roi-budget, quick-wins merged into performance-intelligence (Oct 2025)
  'campaign-planning': {
    id: 'campaign-planning',
    name: 'Campaign Planning',
    icon: Rocket,
    color: '#F59E0B',  // Gold - Action, execution
    gradient: 'from-amber-500 to-amber-600',
    badge: 'Deployment Strategist',
    description: 'Multi-channel deployment planning',
    estimatedTime: '10-15 min',
    path: '/campaign-planning',
    outputTabName: 'Plans'
  },
  'competitive-intelligence': {
    id: 'competitive-intelligence',
    name: 'Competitive Intelligence',
    icon: TrendingUp,
    color: '#475569',  // Slate-600 - Analysis, market insights
    gradient: 'from-slate-600 to-slate-700',
    badge: 'Market Analyst',
    description: 'Market analysis, strategic gaps',
    estimatedTime: '5-10 min',
    path: '/competitive-intelligence',
    outputTabName: 'Intelligence'
  },
  'client-success': {
    id: 'client-success',
    name: 'Client Success',
    icon: HeartHandshake,
    color: '#059669',  // Emerald-600 - Success, growth (refined green)
    gradient: 'from-emerald-600 to-emerald-700',
    badge: 'Retention Expert',
    description: 'Retention strategies, health scoring',
    estimatedTime: '3-5 min',
    path: '/client-success',
    outputTabName: 'Insights'
  },
  'performance-intelligence': {
    id: 'performance-intelligence',
    name: 'Performance Intelligence',
    icon: LineChart,
    color: '#334155',  // Slate-700 - Data-driven, analytical
    gradient: 'from-slate-700 to-slate-800',
    badge: 'Performance Analyst',
    description: 'Unified ROI tracking, quick wins, and performance analytics',
    estimatedTime: '3-8 min',
    path: '/performance-intelligence',
    outputTabName: 'Analytics'
  },
  'quick_start': {
    id: 'quick_start',
    name: 'Quick Start',
    icon: Sparkles,
    color: '#F59E0B',  // Gold - Quick value, onboarding magic
    gradient: 'from-amber-500 to-amber-600',
    badge: 'Onboarding Guide',
    description: 'Generate strategy, personas, and marketing plan in 5 minutes',
    estimatedTime: '5 min',
    path: '/quick-start',
    outputTabName: 'Intelligence'
  }
}

// Helper function to get agent by path
export function getAgentByPath(path: string): AgentIdentity | undefined {
  const cleanPath = path.replace('/', '')
  return AGENT_IDENTITY[cleanPath]
}

// Helper function to get all agents as array
export function getAllAgents(): AgentIdentity[] {
  return Object.values(AGENT_IDENTITY)
}

// Helper function to get core agents (first 4)
export function getCoreAgents(): AgentIdentity[] {
  return ['strategy', 'persona', 'marketing_strategy', 'content']
    .map(id => AGENT_IDENTITY[id])
}

// Helper function to get execution agents
export function getExecutionAgents(): AgentIdentity[] {
  return ['content', 'campaign-planning']
    .map(id => AGENT_IDENTITY[id])
}

// Helper function to get intelligence agents
export function getIntelligenceAgents(): AgentIdentity[] {
  return ['performance-intelligence', 'competitive-intelligence', 'client-success']
    .map(id => AGENT_IDENTITY[id])
}