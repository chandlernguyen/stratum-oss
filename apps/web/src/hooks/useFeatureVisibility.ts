import type { DashboardMetrics } from './data/useDashboardMetrics';

export const useFeatureVisibility = (metrics: DashboardMetrics | null | undefined) => {
  if (!metrics) {
    return {
      strategyAgent: true,
      dashboard: true,
      personaAgent: false,
      contentAgent: false,
      analyticsAgent: false,
      roiBudgetAgent: false,
      executionAgent: false,
      quickWinsAgent: false,
      competitiveAgent: false,
      clientSuccessAgent: false,
      automation: false,
      apiAccess: false,
      whiteLabel: false,
    };
  }

  return {
    strategyAgent: true,
    dashboard: true,
    personaAgent: metrics.campaignCount > 0,  // strategySessionCount not available
    contentAgent: (metrics.documentCount || 0) > 0,  // personaCount not available
    analyticsAgent: metrics.campaignCount > 0,
    roiBudgetAgent: metrics.campaignCount > 2,
    executionAgent: metrics.campaignCount > 3,
    quickWinsAgent: (metrics.totalAIInteractions || 0) > 10,
    competitiveAgent: (metrics.documentCount || 0) > 5,
    clientSuccessAgent: metrics.campaignCount > 5,
    automation: metrics.campaignCount > 10,
    apiAccess: (metrics.totalAIInteractions || 0) > 50,
    whiteLabel: false, // Disabled until feature is ready for production
  };
};
