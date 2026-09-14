/**
 * Resource Configuration Registry
 * Central configuration for all archivable/deletable resources in the application.
 */

export interface ResourceConfig {
  type: string;
  apiBasePath: string;
  tableName: string; // Database-First: Supabase table name
  displayName: string;
  pluralDisplayName: string;
}

export const RESOURCE_CONFIGS = {
  marketing_strategy: {
    type: 'marketing_strategy',
    apiBasePath: '/api/v1/marketing-strategies',
    tableName: 'marketing_strategies',
    displayName: 'Strategy',
    pluralDisplayName: 'Strategies'
  },
  synthetic_persona: {
    type: 'persona',  // Nuclear migration: changed from 'synthetic_persona'
    apiBasePath: '/api/v1/personas',
    tableName: 'agent_outputs',  // Nuclear migration: personas now in agent_outputs
    displayName: 'Persona',
    pluralDisplayName: 'Personas'
  },
  campaign: {
    type: 'campaign',
    apiBasePath: '/api/v1/campaigns',
    tableName: 'campaigns',
    displayName: 'Campaign',
    pluralDisplayName: 'Campaigns'
  },
  client: {
    type: 'client',
    apiBasePath: '/api/v1/clients',
    tableName: 'clients',
    displayName: 'Client',
    pluralDisplayName: 'Clients'
  },
  ai_insight: {
    type: 'ai_insight',
    apiBasePath: '/api/v1/insights',
    tableName: 'ai_insights',
    displayName: 'Insight',
    pluralDisplayName: 'Insights'
  },
  brand_guidelines: {
    type: 'brand_guidelines',
    apiBasePath: '/api/v1/brand-guidelines',
    tableName: 'brand_guidelines',
    displayName: 'Brand Guidelines',
    pluralDisplayName: 'Brand Guidelines'
  },
  strategy_session: {
    type: 'strategy_session',
    apiBasePath: '/api/v1/direct-agents/strategy/sessions',
    tableName: 'agent_conversations',
    displayName: 'Session',
    pluralDisplayName: 'Sessions'
  },
  persona_session: {
    type: 'persona_session',
    apiBasePath: '/api/v1/direct-agents/persona/sessions',
    tableName: 'agent_conversations',
    displayName: 'Session',
    pluralDisplayName: 'Sessions'
  },
  content_session: {
    type: 'content_session',
    apiBasePath: '/api/v1/direct-agents/content/sessions',
    tableName: 'agent_conversations',
    displayName: 'Session',
    pluralDisplayName: 'Sessions'
  },
  marketing_strategy_session: {
    type: 'marketing_strategy_session',
    apiBasePath: '/api/v1/direct-agents/marketing-strategy/sessions',
    tableName: 'agent_conversations',
    displayName: 'Session',
    pluralDisplayName: 'Sessions'
  },
  campaign_planning_session: {
    type: 'campaign_planning_session',
    apiBasePath: '/api/v1/direct-agents/campaign_planning/sessions',
    tableName: 'agent_conversations',
    displayName: 'Session',
    pluralDisplayName: 'Sessions'
  },
  client_success_session: {
    type: 'client_success_session',
    apiBasePath: '/api/v1/direct-agents/client_success/sessions',
    tableName: 'agent_conversations',
    displayName: 'Session',
    pluralDisplayName: 'Sessions'
  },
  competitive_intelligence_session: {
    type: 'competitive_intelligence_session',
    apiBasePath: '/api/v1/direct-agents/competitive_intelligence/sessions',
    tableName: 'agent_conversations',
    displayName: 'Session',
    pluralDisplayName: 'Sessions'
  },
  strategy_output: {
    type: 'strategy_output',
    apiBasePath: '/api/v1/strategy-outputs',
    tableName: 'agent_outputs',
    displayName: 'Strategy Output',
    pluralDisplayName: 'Strategy Outputs'
  },
  marketing_strategy_output: {
    type: 'marketing_strategy_output',
    apiBasePath: '/api/v1/marketing-strategy-outputs',
    tableName: 'agent_outputs',
    displayName: 'Strategy',
    pluralDisplayName: 'Strategies'
  },
  content_output: {
    type: 'content_output',
    apiBasePath: '/api/v1/content-outputs',
    tableName: 'agent_outputs',
    displayName: 'Content',
    pluralDisplayName: 'Content'
  },
  analytics_output: {
    type: 'analytics_output',
    apiBasePath: '/api/v1/analytics-outputs',
    tableName: 'agent_outputs',
    displayName: 'Report',
    pluralDisplayName: 'Reports'
  },
  // Universal agent output config - works for all agent types using Database-First approach
  agent_output: {
    type: 'agent_output',
    apiBasePath: '/api/v1/outputs-hub',
    tableName: 'agent_outputs',
    displayName: 'Output',
    pluralDisplayName: 'Outputs'
  }
} as const;

export type ResourceType = keyof typeof RESOURCE_CONFIGS;

export function getResourceConfig(type: ResourceType): ResourceConfig {
  return RESOURCE_CONFIGS[type];
}

export function getResourceConfigByType(type: string): ResourceConfig | undefined {
  return Object.values(RESOURCE_CONFIGS).find(config => config.type === type);
}