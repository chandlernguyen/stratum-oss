/**
 * Centralized route configuration for the Marketing Suite application
 *
 * This file defines all application routes in a type-safe manner,
 * ensuring consistent URL patterns across the entire application.
 */

// Helper function to create parameterized routes
const param = (base: string, ...params: string[]) => {
  return (...args: string[]) => {
    let route = base;
    params.forEach((param, index) => {
      route = route.replace(`:${param}`, args[index] || '');
    });
    return route;
  };
};

export const ROUTES = {
  // Authentication
  auth: {
    login: '/login',
    signup: '/signup',
    logout: '/logout',
    forgotPassword: '/forgot-password',
    resetPassword: '/reset-password'
  },

  // Onboarding
  onboarding: {
    businessContext: '/onboarding/business-context',
    teamSetup: '/onboarding/team-setup',
    preferences: '/onboarding/preferences'
  },

  // Dashboard
  dashboard: {
    root: '/dashboard',
    sme: '/dashboard/sme',
    agency: '/dashboard/agency',
    metrics: '/dashboard/metrics'
  },

  // Workspace & Settings
  workspace: {
    root: '/workspace',
    select: '/workspace/select',
    detail: param('/workspace/:workspaceId', 'workspaceId'),
    settings: '/settings/workspace'
  },

  // User profile (keeping at root for backward compatibility)
  profile: '/profile',

  settings: {
    root: '/settings',
    workspace: '/settings/workspace',
    whiteLabel: '/settings/white-label',
    billing: '/settings/billing',
    team: '/settings/team',
    integrations: '/settings/integrations',
    notifications: '/settings/notifications'
  },

  // Clients (Agency only)
  clients: {
    list: '/clients',
    new: '/clients/new',
    detail: param('/clients/:clientId', 'clientId'),
    edit: param('/clients/:clientId/edit', 'clientId'),
    campaigns: param('/clients/:clientId/campaigns', 'clientId'),
    analytics: param('/clients/:clientId/analytics', 'clientId'),
    health: param('/clients/:clientId/health', 'clientId')
  },

  // Campaigns
  campaigns: {
    list: '/campaigns',
    new: '/campaigns/new',
    detail: param('/campaigns/:campaignId', 'campaignId'),
    edit: param('/campaigns/:campaignId/edit', 'campaignId'),
    analytics: param('/campaigns/:campaignId/analytics', 'campaignId'),
    settings: param('/campaigns/:campaignId/settings', 'campaignId'),
    insights: param('/campaigns/:campaignId/insights', 'campaignId')
  },

  // AI Agents - Matching current App.tsx patterns
  agents: {
    // Business Strategy Agent
    strategy: {
      root: '/strategy',
      session: param('/strategy/session/:sessionId', 'sessionId'),
      campaign: param('/strategy/campaign/:campaignId', 'campaignId'),
      campaignSession: param('/strategy/campaign/:campaignId/session/:sessionId', 'campaignId', 'sessionId'),
      history: '/strategy/history'
    },

    // Persona Agent
    persona: {
      root: '/persona',
      list: '/persona',
      new: '/persona/new',
      detail: param('/persona/:personaId', 'personaId'),
      edit: param('/persona/:personaId/edit', 'personaId'),
      interview: param('/persona/interview/:personaId', 'personaId'),
      interviewSession: param('/persona/interview/:personaId/session/:sessionId', 'personaId', 'sessionId'),
      session: param('/persona/session/:sessionId', 'sessionId'),
      campaign: param('/persona/campaign/:campaignId', 'campaignId')
    },

    // Marketing Strategy Agent
    marketingStrategy: {
      root: '/marketing-strategy',
      quick: '/marketing-strategy/quick',
      guided: '/marketing-strategy/guided',
      advanced: '/marketing-strategy/advanced',
      mode: param('/marketing-strategy/:mode', 'mode'),
      session: param('/marketing-strategy/session/:sessionId', 'sessionId'),
      modeSession: param('/marketing-strategy/:mode/session/:sessionId', 'mode', 'sessionId'),
      campaign: param('/marketing-strategy/campaign/:campaignId', 'campaignId'),
      outputs: '/marketing-strategy/outputs'
    },

    // Content Agent
    content: {
      root: '/content',
      type: param('/content/type/:contentType', 'contentType'),
      tool: param('/content/tool/:tool', 'tool'),
      toolSession: param('/content/tool/:tool/session/:sessionId', 'tool', 'sessionId'),
      session: param('/content/session/:sessionId', 'sessionId'),
      campaign: param('/content/campaign/:campaignId', 'campaignId'),
      campaignSession: param('/content/campaign/:campaignId/session/:sessionId', 'campaignId', 'sessionId'),
      library: '/content/library',
      templates: '/content/templates'
    },

    // Campaign Planning Agent
    campaignPlanning: {
      root: '/campaign-planning',
      plan: param('/campaign-planning/plan/:planId', 'planId'),
      calendar: '/campaign-planning/calendar',
      tasks: '/campaign-planning/tasks',
      timeline: '/campaign-planning/timeline',
      session: param('/campaign-planning/session/:sessionId', 'sessionId'),
      campaign: param('/campaign-planning/campaign/:campaignId', 'campaignId'),
      automation: '/campaign-planning/automation'
    },
    // Legacy route config (deprecated - use campaignPlanning instead)
    campaignExecution: {
      root: '/campaign-planning',
      calendar: '/campaign-planning/calendar',
      tasks: '/campaign-planning/tasks',
      timeline: '/campaign-planning/timeline',
      session: param('/campaign-planning/session/:sessionId', 'sessionId'),
      campaign: param('/campaign-planning/campaign/:campaignId', 'campaignId'),
      automation: '/campaign-planning/automation'
    },

    // Competitive Intelligence Agent
    competitiveIntelligence: {
      root: '/competitive-intelligence',
      competitors: '/competitive-intelligence/competitors',
      analysis: '/competitive-intelligence/analysis',
      benchmarks: '/competitive-intelligence/benchmarks',
      session: param('/competitive-intelligence/session/:sessionId', 'sessionId'),
      alerts: '/competitive-intelligence/alerts'
    },

    // Client Success Agent
    clientSuccess: {
      root: '/client-success',
      health: '/client-success/health',
      retention: '/client-success/retention',
      churn: '/client-success/churn',
      session: param('/client-success/session/:sessionId', 'sessionId'),
      client: param('/client-success/client/:clientId', 'clientId'),
      recommendations: '/client-success/recommendations'
    },

    // Performance Intelligence Agent (NEW - Consolidates Analytics, ROI Budget, Quick Wins)
    performanceIntelligence: {
      root: '/performance-intelligence',
      session: param('/performance-intelligence/session/:sessionId', 'sessionId'),
      campaign: param('/performance-intelligence/campaign/:campaignId', 'campaignId'),
      dashboard: '/performance-intelligence/dashboard',
      reports: '/performance-intelligence/reports'
    },

    // Quick Start Agent (Unified onboarding intelligence)
    quickStart: {
      root: '/quick-start',
      session: param('/quick-start/session/:sessionId', 'sessionId')
    }
  },

  // Documents & Resources
  documents: {
    root: '/documents',
    list: '/documents',
    upload: '/documents/upload',
    detail: param('/documents/:documentId', 'documentId'),
    campaign: param('/documents/campaign/:campaignId', 'campaignId'),
    client: param('/documents/client/:clientId', 'clientId'),
    search: '/documents/search'
  },

  // Outputs & Intelligence
  outputs: {
    root: '/outputs',
    list: '/outputs',
    campaign: param('/outputs/campaign/:campaignId', 'campaignId'),
    agent: param('/outputs/agent/:agentType', 'agentType'),
    detail: param('/outputs/:outputId', 'outputId'),
    saved: '/outputs/saved'
  },

  // Business Intelligence (Client-scoped for agencies)
  intelligence: {
    root: '/intelligence',
    businessProfile: '/intelligence/business-profile',
    brandGuidelines: '/intelligence/brand-guidelines',
    learningHistory: '/intelligence/learning-history'
  },


  // Workflow & Automation
  workflow: {
    root: '/workflow',
    builder: '/workflow/builder',
    templates: '/workflow/templates',
    detail: param('/workflow/:workflowId', 'workflowId'),
    edit: param('/workflow/:workflowId/edit', 'workflowId'),
    run: param('/workflow/:workflowId/run', 'workflowId'),
    history: param('/workflow/:workflowId/history', 'workflowId')
  },

  // Metrics & Reporting
  metrics: {
    root: '/metrics',
    dashboard: '/metrics',
    realTime: '/metrics/real-time',
    reports: '/metrics/reports',
    report: param('/metrics/reports/:reportId', 'reportId'),
    campaign: param('/metrics/campaign/:campaignId', 'campaignId'),
    client: param('/metrics/client/:clientId', 'clientId'),
    custom: '/metrics/custom'
  },

  // Brand Comparison (Development/Internal)
  brand: {
    comparison: '/brand-comparison'
  },

  // Collaboration
  collaboration: {
    tasks: '/tasks',
    approvals: '/approvals'
  }
} as const;

// Type-safe route params
export type RouteParams = {
  workspaceId?: string;
  clientId?: string;
  campaignId?: string;
  sessionId?: string;
  personaId?: string;
  documentId?: string;
  outputId?: string;
  workflowId?: string;
  reportId?: string;
  agentType?: string;
  contentType?: string;
  reportType?: string;
  mode?: 'quick' | 'guided' | 'advanced';
};

// Context type for building contextual routes
export type RouteContext = {
  clientId?: string;
  campaignId?: string;
  workspaceId?: string;
};

// Navigation helper to build routes with optional context
export const buildRoute = (
  route: string | ((...args: string[]) => string),
  params?: RouteParams
): string => {
  if (typeof route === 'function') {
    const args = Object.values(params || {}).filter(Boolean) as string[];
    return route(...args);
  }
  return route;
};

// Build a route with context (for agency users with client context)
export const withContext = (
  route: string,
  context: RouteContext
): string => {
  // For agency users, prepend client context
  if (context.clientId) {
    // Remove leading slash from route if present
    const cleanRoute = route.startsWith('/') ? route.substring(1) : route;
    return `/client/${context.clientId}/${cleanRoute}`;
  }

  // For workspace context (future use)
  if (context.workspaceId) {
    const cleanRoute = route.startsWith('/') ? route.substring(1) : route;
    return `/workspace/${context.workspaceId}/${cleanRoute}`;
  }

  return route;
};

// Parse context from current URL
export const parseContext = (pathname: string): RouteContext => {
  const context: RouteContext = {};

  // Check for client context
  const clientMatch = pathname.match(/^\/client\/([^\/]+)/);
  if (clientMatch) {
    context.clientId = clientMatch[1];
  }

  // Check for workspace context
  const workspaceMatch = pathname.match(/^\/workspace\/([^\/]+)/);
  if (workspaceMatch) {
    context.workspaceId = workspaceMatch[1];
  }

  // Check for campaign context in URL
  const campaignMatch = pathname.match(/\/campaign(?:s)?\/([^\/]+)/);
  if (campaignMatch) {
    context.campaignId = campaignMatch[1];
  }

  return context;
};

// Remove context from URL to get base route
export const removeContext = (pathname: string): string => {
  // Remove client context
  let cleanPath = pathname.replace(/^\/client\/[^\/]+/, '');

  // Remove workspace context
  cleanPath = cleanPath.replace(/^\/workspace\/[^\/]+/, '');

  // Ensure path starts with /
  return cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
};

// Build contextual navigation helper
export const buildContextualRoute = (
  baseRoute: string | ((...args: string[]) => string),
  params?: RouteParams,
  context?: RouteContext
): string => {
  // First build the base route
  const route = buildRoute(baseRoute, params);

  // Then apply context if provided
  if (context) {
    return withContext(route, context);
  }

  return route;
};

// Check if current route matches pattern
export const isActiveRoute = (currentPath: string, routePattern: string): boolean => {
  // Simple check - can be enhanced with more sophisticated matching
  return currentPath.startsWith(routePattern);
};

// Get breadcrumb items from current path
export const getBreadcrumbs = (pathname: string): Array<{ label: string; path: string }> => {
  const paths = pathname.split('/').filter(Boolean);
  const breadcrumbs: Array<{ label: string; path: string }> = [];

  let currentPath = '';
  paths.forEach((segment) => {
    currentPath += `/${segment}`;

    // Skip IDs and certain segments
    if (segment.match(/^[0-9a-f-]+$/i) || segment === 'session' || segment === 'mode') {
      return;
    }

    // Format label
    const label = segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    breadcrumbs.push({ label, path: currentPath });
  });

  return breadcrumbs;
};

// Export route groups for navigation menus
export const NAV_GROUPS = {
  main: [
    { label: 'Dashboard', route: ROUTES.dashboard.root, icon: 'LayoutDashboard' },
    { label: 'Campaigns', route: ROUTES.campaigns.list, icon: 'Target' },
    { label: 'Documents', route: ROUTES.documents.root, icon: 'FileText' },
    { label: 'Library', route: ROUTES.outputs.root, icon: 'Brain' },
    { label: 'Metrics', route: ROUTES.metrics.root, icon: 'BarChart' },
  ],
  agents: [
    { label: 'Business Strategy', route: ROUTES.agents.strategy.root, icon: 'Target' },
    { label: 'Personas', route: ROUTES.agents.persona.root, icon: 'Users' },
    { label: 'Marketing Strategy', route: ROUTES.agents.marketingStrategy.root, icon: 'Megaphone' },
    { label: 'Content', route: ROUTES.agents.content.root, icon: 'PenTool' },
    { label: 'Campaign Planning', route: ROUTES.agents.campaignPlanning.root, icon: 'Rocket' },
    { label: 'Performance Intelligence', route: ROUTES.agents.performanceIntelligence.root, icon: 'LineChart' },
    { label: 'Competitive Intelligence', route: ROUTES.agents.competitiveIntelligence.root, icon: 'TrendingUp' },
    { label: 'Client Success', route: ROUTES.agents.clientSuccess.root, icon: 'HeartHandshake' },
  ],
  settings: [
    { label: 'Profile', route: ROUTES.profile, icon: 'User' },
    { label: 'Settings', route: ROUTES.settings.root, icon: 'Settings' },
  ]
};

export default ROUTES;