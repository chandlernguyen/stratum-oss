import { type AgentSidebarConfig } from './AgentSidebar';
import {
  Target,
  PenTool,
  Users,
  BarChart3,
  DollarSign,
  TrendingUp,
  Zap,
  UserCheck,
  FileText,
  Lightbulb,
  Sparkles
} from 'lucide-react';

// Strategy Agent Configuration
export const strategySidebarConfig: AgentSidebarConfig = {
  agentType: 'strategy',
  agentDisplayName: 'Strategy Sessions',
  primaryColor: 'blue',
  icon: Target,
  gradientClasses: 'from-slate-600 to-amber-600 hover:from-blue-700 hover:to-amber-700',
  sessionsEndpoint: '/api/v1/direct-agents/strategy/sessions',
  baseRoute: '/strategy',
  sessionRoute: '/strategy/session',
  storageKey: 'strategy-sidebar-width',
  // Outputs configuration
  outputsConfig: {
    enabled: true,
    // Removed: endpoint - now using Database-First via useAgentOutputs hook
    tabName: 'Strategies',
    transformOutput: (data) => ({
      id: data.id,
      title: data.title || data.framework_data?.title || data.framework_type || 'Strategy Analysis',
      type: data.output_type || data.framework_type || 'strategy',
      // Database-First: Handle both legacy framework_data and direct content
      data: data.framework_data || data.content || data,
      created_at: data.created_at
    }),
    emptyStateMessage: 'No strategies saved yet',
    emptyStateDescription: 'Create a strategy session to analyze your business',
    itemIcon: Target
  }
};

// Marketing Strategy Agent Configuration
export const marketingStrategySidebarConfig: AgentSidebarConfig = {
  agentType: 'marketing_strategy',
  agentDisplayName: 'Strategies',
  primaryColor: 'purple',
  icon: Target,
  gradientClasses: 'from-slate-600 to-amber-600 hover:from-slate-700 hover:to-pink-700',
  sessionsEndpoint: '/api/v1/direct-agents/marketing_strategy/sessions',
  baseRoute: '/marketing-strategy',
  sessionRoute: '/marketing-strategy/quick/session', // Default mode
  storageKey: 'marketing-strategy-sidebar-width',
  // Custom session URL builder for marketing strategy modes
  buildSessionUrl: (session) => {
    const sessionMode = session.mode || 'quick';
    return `/marketing-strategy/${sessionMode}/session/${session.id}`;
  },
  // Custom badges for marketing strategy modes
  getSessionBadges: (session) => {
    if (session.mode) {
      const modeLabels = {
        'quick': 'Quick',
        'guided': 'Guided',
        'advanced': 'Advanced'
      };
      return [{ label: modeLabels[session.mode as keyof typeof modeLabels] || session.mode }];
    }
    return [];
  },
  // Outputs configuration - Database-First approach
  outputsConfig: {
    enabled: true,
    // Removed: endpoint - now using Database-First via useAgentOutputs hook
    tabName: 'Strategies',
    transformOutput: (data) => {
      // Create a concise title from available data
      let title = 'Marketing Strategy';
      if (data.name && data.name.trim()) {
        title = data.name;
      } else if (data.campaign_name) {
        title = data.campaign_name;
      } else if (data.title) {
        title = data.title;
      } else if (data.positioning_statement) {
        // If only positioning statement exists, truncate it for title
        const statement = data.positioning_statement;
        if (statement.length > 50) {
          title = statement.substring(0, 47) + '...';
        } else {
          title = statement;
        }
      }

      return {
        id: data.id,
        title: title,
        type: data.status || 'strategy',
        data: data.content || data, // Use content field for proper viewer rendering
        created_at: data.created_at
      };
    },
    emptyStateMessage: 'No marketing strategies saved yet',
    emptyStateDescription: 'Create a strategy to define your marketing approach',
    itemIcon: Lightbulb
  }
};

// Content Agent Configuration
export const contentSidebarConfig: AgentSidebarConfig = {
  agentType: 'content',
  agentDisplayName: 'Content',
  primaryColor: 'green',
  icon: PenTool,
  gradientClasses: 'from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700',
  sessionsEndpoint: '/api/v1/direct-agents/content/sessions',
  baseRoute: '/content',
  sessionRoute: '/content/session',
  storageKey: 'content-sidebar-width',
  // Outputs configuration - Database-First approach
  outputsConfig: {
    enabled: true,
    // Removed: endpoint - now using Database-First via useAgentOutputs hook
    tabName: 'Content',
    transformOutput: (data) => {
      // Improve type display for better clarity
      const outputTypeLabels: Record<string, string> = {
        'blog_post': 'Blog Post',
        'case_study': 'Case Study',
        'email_sequence': 'Email Campaign',
        'social_content': 'Social Media',
        'thought_leadership_content': 'Thought Leadership',
        'usp_content': 'USP Content',
        'content_intelligence': 'Content Strategy',
        'generic_content': 'Content'
      };

      const typeLabel = outputTypeLabels[data.output_type] || data.output_type || 'Content';

      // Extract the actual markdown content string
      let contentString = '';
      if (data.content?.content_data?.content) {
        // New structure from universal save hook
        contentString = data.content.content_data.content;
      } else if (typeof data.content === 'string') {
        // Direct string content
        contentString = data.content;
      } else if (data.content?.content) {
        // Old structure with nested content
        contentString = data.content.content;
      } else {
        // Fallback
        contentString = JSON.stringify(data.content || data, null, 2);
      }

      return {
        id: data.id,
        title: data.title || data.content?.content_data?.title || data.content_type || 'Content Piece',
        type: typeLabel, // Human-readable type
        data: contentString, // Pass the markdown string for proper rendering
        created_at: data.created_at
      };
    },
    emptyStateMessage: 'No content pieces saved yet',
    emptyStateDescription: 'Create content that resonates with your audience',
    itemIcon: FileText
  }
};

// Persona Agent Configuration
export const personaSidebarConfig: AgentSidebarConfig = {
  agentType: 'persona',
  agentDisplayName: 'Personas',
  primaryColor: 'blue',
  icon: Users,
  gradientClasses: 'from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700',
  sessionsEndpoint: '/api/v1/direct-agents/persona/sessions',
  baseRoute: '/persona',
  sessionRoute: '/persona/session',
  storageKey: 'persona-sidebar-width'
  // Note: Personas have their own special UI, not using outputs tab
};

// Analytics Agent Configuration
export const analyticsSidebarConfig: AgentSidebarConfig = {
  agentType: 'analytics',
  agentDisplayName: 'Analytics',
  primaryColor: 'indigo',
  icon: BarChart3,
  gradientClasses: 'from-slate-600 to-amber-600 hover:from-indigo-700 hover:to-amber-700',
  sessionsEndpoint: '/api/v1/direct-agents/analytics/sessions',
  baseRoute: '/analytics',
  sessionRoute: '/analytics/session',
  storageKey: 'analytics-sidebar-width',
  // Outputs configuration - Database-First approach
  outputsConfig: {
    enabled: true,
    // Removed: endpoint - now using Database-First via useAgentOutputs hook
    tabName: 'Reports',
    transformOutput: (data) => ({
      id: data.id,
      title: data.title || data.report_data?.title || data.report_type || 'Analytics Report',
      type: data.output_type || data.report_type || 'analytics',
      data: data.report_data || data.content || data,
      created_at: data.created_at
    }),
    emptyStateMessage: 'No analytics reports saved yet',
    emptyStateDescription: 'Analyze your performance metrics',
    itemIcon: BarChart3
  }
};

// ROI & Budget Agent Configuration
export const roiBudgetSidebarConfig: AgentSidebarConfig = {
  agentType: 'roi_budget',
  agentDisplayName: 'ROI & Budget',
  primaryColor: 'emerald',
  icon: DollarSign,
  gradientClasses: 'from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700',
  sessionsEndpoint: '/api/v1/direct-agents/roi_budget/sessions',
  baseRoute: '/roi-budget',
  sessionRoute: '/roi-budget/session',
  storageKey: 'roi-budget-sidebar-width',
  // Outputs configuration - Database-First approach
  outputsConfig: {
    enabled: true,
    // Removed: endpoint - now using Database-First via useAgentOutputs hook
    tabName: 'Analyses',
    transformOutput: (data) => ({
      id: data.id,
      title: data.title || data.budget_data?.title || data.budget_type || 'Budget Analysis',
      type: data.output_type || data.budget_type || 'roi_budget',
      data: data.budget_data || data.content || data,
      created_at: data.created_at
    }),
    emptyStateMessage: 'No budget analyses saved yet',
    emptyStateDescription: 'Calculate ROI and optimize your budget',
    itemIcon: DollarSign
  }
};

// Campaign Planning Agent Configuration
export const campaignExecutionSidebarConfig: AgentSidebarConfig = {
  agentType: 'campaign_planning',
  agentDisplayName: 'Plans',
  primaryColor: 'orange',
  icon: TrendingUp,
  gradientClasses: 'from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700',
  sessionsEndpoint: '/api/v1/direct-agents/campaign_planning/sessions',
  baseRoute: '/campaign-planning',
  sessionRoute: '/campaign-planning/session',
  storageKey: 'campaign-planning-sidebar-width',
  // Outputs configuration - Database-First approach
  outputsConfig: {
    enabled: true,
    // Removed: endpoint - now using Database-First via useAgentOutputs hook
    tabName: 'Plans', // Changed from 'Campaigns' to 'Plans' for clarity
    transformOutput: (data) => ({
      id: data.id,
      title: data.title || data.campaign_data?.title || data.campaign_type || 'Campaign Plan',
      type: data.output_type || data.campaign_type || 'campaign_planning',
      data: data.campaign_data || data.content || data,
      created_at: data.created_at
    }),
    emptyStateMessage: 'No campaign plans saved yet',
    emptyStateDescription: 'Save auto-generated plans to see them here',
    itemIcon: TrendingUp
  }
};

// Quick Wins Agent Configuration
export const quickWinsSidebarConfig: AgentSidebarConfig = {
  agentType: 'quick_wins',
  agentDisplayName: 'Quick Wins',
  primaryColor: 'yellow',
  icon: Zap,
  gradientClasses: 'from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700',
  sessionsEndpoint: '/api/v1/direct-agents/quick_wins/sessions',
  baseRoute: '/quick-wins',
  sessionRoute: '/quick-wins/session',
  storageKey: 'quick-wins-sidebar-width',
  // Outputs configuration - Database-First approach
  outputsConfig: {
    enabled: true,
    // Removed: endpoint - now using Database-First via useAgentOutputs hook
    tabName: 'Opportunities',
    transformOutput: (data) => ({
      id: data.id,
      title: data.title || data.opportunity_data?.title || data.opportunity_type || 'Quick Win',
      type: data.output_type || data.opportunity_type || 'quick_wins',
      data: data.opportunity_data || data.content || data,
      created_at: data.created_at
    }),
    emptyStateMessage: 'No opportunities identified yet',
    emptyStateDescription: 'Discover immediate high-impact actions',
    itemIcon: Zap
  }
};

// Competitive Intelligence Agent Configuration
export const competitiveIntelligenceSidebarConfig: AgentSidebarConfig = {
  agentType: 'competitive_intelligence',
  agentDisplayName: 'Competitive Intel',
  primaryColor: 'purple',
  icon: Target,
  gradientClasses: 'from-slate-600 to-amber-600 hover:from-slate-700 hover:to-indigo-700',
  sessionsEndpoint: '/api/v1/direct-agents/competitive_intelligence/sessions',
  baseRoute: '/competitive-intelligence',
  sessionRoute: '/competitive-intelligence/session',
  storageKey: 'competitive-intelligence-sidebar-width',
  // Outputs configuration - Database-First approach
  outputsConfig: {
    enabled: true,
    // Removed: endpoint - now using Database-First via useAgentOutputs hook
    tabName: 'Analyses',
    transformOutput: (data) => ({
      id: data.id,
      title: data.title || data.intelligence_data?.title || data.intelligence_type || 'Competitive Analysis',
      type: data.output_type || data.intelligence_type || 'competitive_intelligence',
      data: data.intelligence_data || data.content || data,
      created_at: data.created_at
    }),
    emptyStateMessage: 'No competitive analyses saved yet',
    emptyStateDescription: 'Research competitors with AI to save insights',
    itemIcon: Target
  }
};

// Client Success Agent Configuration
export const clientSuccessSidebarConfig: AgentSidebarConfig = {
  agentType: 'client_success',
  agentDisplayName: 'Client Success',
  primaryColor: 'teal',
  icon: UserCheck,
  gradientClasses: 'from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700',
  sessionsEndpoint: '/api/v1/direct-agents/client_success/sessions',
  baseRoute: '/client-success',
  sessionRoute: '/client-success/session',
  storageKey: 'client-success-sidebar-width',
  // Outputs configuration - Database-First approach
  outputsConfig: {
    enabled: true,
    // Removed: endpoint - now using Database-First via useAgentOutputs hook
    tabName: 'Insights',
    transformOutput: (data) => ({
      id: data.id,
      title: data.title || data.insight_data?.title || data.insight_type || 'Client Insight',
      type: data.output_type || data.insight_type || 'client_success',
      data: data.insight_data || data.content || data,
      created_at: data.created_at
    }),
    emptyStateMessage: 'No client insights saved yet',
    emptyStateDescription: 'Build stronger client relationships',
    itemIcon: UserCheck
  }
};

// Quick Start Agent Configuration
export const quickStartSidebarConfig: AgentSidebarConfig = {
  agentType: 'quick_start',
  agentDisplayName: 'Quick Start',
  primaryColor: 'purple',
  icon: Sparkles,
  gradientClasses: 'from-slate-600 to-amber-600 hover:from-slate-700 hover:to-blue-700',
  sessionsEndpoint: '/api/v1/direct-agents/quick_start/sessions',
  baseRoute: '/quick-start',
  sessionRoute: '/quick-start/session',
  storageKey: 'quick-start-sidebar-width',
  // Outputs configuration - Database-First approach
  outputsConfig: {
    enabled: true,
    // Removed: endpoint - now using Database-First via useAgentOutputs hook
    tabName: 'Intelligence',
    transformOutput: (data) => ({
      id: data.id,
      title: data.title || 'Quick Start Intelligence',
      type: data.output_type || 'quick_start',
      data: data.content || data,
      created_at: data.created_at
    }),
    emptyStateMessage: 'No intelligence generated yet',
    emptyStateDescription: 'Complete a Quick Start session to generate comprehensive intelligence',
    itemIcon: Sparkles
  }
};

// Export all configurations for easy access
export const allAgentSidebarConfigs = {
  strategy: strategySidebarConfig,
  marketing_strategy: marketingStrategySidebarConfig,
  content: contentSidebarConfig,
  persona: personaSidebarConfig,
  analytics: analyticsSidebarConfig,
  roi_budget: roiBudgetSidebarConfig,
  campaign_planning: campaignExecutionSidebarConfig,
  quick_wins: quickWinsSidebarConfig,
  competitive_intelligence: competitiveIntelligenceSidebarConfig,
  client_success: clientSuccessSidebarConfig,
  quick_start: quickStartSidebarConfig
};