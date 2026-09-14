/**
 * Educational Copy Configuration
 *
 * Centralized copy for teaching users the intelligence-first philosophy
 * through micro-copy, contextual explanations, and self-explanatory labels.
 *
 * Principle: Teach through interface, not hand-holding
 *
 * NOTE: This file now works with i18next translations from /public/locales/[lang]/educational.json
 * Use the useEducationalCopy() hook or getEducationalCopy() for components that need this copy.
 */

import i18next from 'i18next';

/**
 * Translation key mappings for educational copy
 * Maps the old dot-notation paths to the new i18next keys
 */
const KEY_MAPPINGS: Record<string, string> = {
  // Intelligence Briefing
  'intelligence_briefing.title': 'intelligenceBriefing.title',
  'intelligence_briefing.subtitle': 'intelligenceBriefing.subtitle',
  'intelligence_briefing.tooltip': 'intelligenceBriefing.tooltip',
  'intelligence_briefing.empty_state': 'intelligenceBriefing.emptyState',
  'intelligence_briefing.empty_action': 'intelligenceBriefing.emptyAction',
  'intelligence_briefing.ai_badge': 'intelligenceBriefing.aiBadge',
  'intelligence_briefing.loading_state': 'intelligenceBriefing.loadingState',

  // Intelligence Vault
  'intelligence_vault.title': 'intelligenceVault.title',
  'intelligence_vault.subtitle': 'intelligenceVault.subtitle',
  'intelligence_vault.empty_state': 'intelligenceVault.emptyState',
  'intelligence_vault.empty_action': 'intelligenceVault.emptyAction',
  'intelligence_vault.view_all': 'intelligenceVault.viewAll',
  'intelligence_vault.total_badge': 'intelligenceVault.totalBadge',

  // Campaigns
  'campaigns.title': 'campaigns.title',
  'campaigns.subtitle': 'campaigns.subtitle',
  'campaigns.create_button': 'campaigns.createButton',
  'campaigns.create_button_short': 'campaigns.createButtonShort',
  'campaigns.empty_state_no_intelligence': 'campaigns.emptyStateNoIntelligence',
  'campaigns.empty_state_has_intelligence': 'campaigns.emptyStateHasIntelligence',
  'campaigns.empty_action_primary': 'campaigns.emptyActionPrimary',
  'campaigns.empty_action_secondary': 'campaigns.emptyActionSecondary',
  'campaigns.empty_action_ready': 'campaigns.emptyActionReady',
  'campaigns.section_description': 'campaigns.sectionDescription',

  // Intelligence Readiness
  'intelligence_readiness.banner_incomplete_title': 'intelligenceReadiness.bannerIncompleteTitle',
  'intelligence_readiness.banner_incomplete_subtitle': 'intelligenceReadiness.bannerIncompleteSubtitle',
  'intelligence_readiness.banner_complete_title': 'intelligenceReadiness.bannerCompleteTitle',
  'intelligence_readiness.banner_complete_subtitle': 'intelligenceReadiness.bannerCompleteSubtitle',
  'intelligence_readiness.checklist_label': 'intelligenceReadiness.checklistLabel',
  'intelligence_readiness.checklist_items.strategy': 'intelligenceReadiness.checklistItems.strategy',
  'intelligence_readiness.checklist_items.persona': 'intelligenceReadiness.checklistItems.persona',
  'intelligence_readiness.checklist_items.marketing_strategy': 'intelligenceReadiness.checklistItems.marketingStrategy',
  'intelligence_readiness.actions.create_campaign': 'intelligenceReadiness.actions.createCampaign',
  'intelligence_readiness.actions.maybe_later': 'intelligenceReadiness.actions.maybeLater',
  'intelligence_readiness.description_complete': 'intelligenceReadiness.descriptionComplete',
  'intelligence_readiness.description_incomplete': 'intelligenceReadiness.descriptionIncomplete',

  // Outputs
  'outputs.page_title': 'outputs.pageTitle',
  'outputs.page_subtitle': 'outputs.pageSubtitle',
  'outputs.organize_button_not_ready': 'outputs.organizeButtonNotReady',
  'outputs.organize_button_ready': 'outputs.organizeButtonReady',
  'outputs.empty_state': 'outputs.emptyState',
  'outputs.empty_action': 'outputs.emptyAction',

  // Onboarding
  'onboarding.welcome_title': 'onboarding.welcomeTitle',
  'onboarding.welcome_subtitle': 'onboarding.welcomeSubtitle',
  'onboarding.welcome_description': 'onboarding.welcomeDescription',
  'onboarding.cta_strategy.title': 'onboarding.ctaStrategy.title',
  'onboarding.cta_strategy.subtitle': 'onboarding.ctaStrategy.subtitle',
  'onboarding.cta_strategy.description': 'onboarding.ctaStrategy.description',
  'onboarding.cta_strategy.time_estimate': 'onboarding.ctaStrategy.timeEstimate',
  'onboarding.cta_persona.title': 'onboarding.ctaPersona.title',
  'onboarding.cta_persona.subtitle': 'onboarding.ctaPersona.subtitle',
  'onboarding.cta_persona.description': 'onboarding.ctaPersona.description',
  'onboarding.cta_persona.time_estimate': 'onboarding.ctaPersona.timeEstimate',
  'onboarding.cta_quick_start.title': 'onboarding.ctaQuickStart.title',
  'onboarding.cta_quick_start.subtitle': 'onboarding.ctaQuickStart.subtitle',
  'onboarding.cta_quick_start.description': 'onboarding.ctaQuickStart.description',
  'onboarding.cta_quick_start.time_estimate': 'onboarding.ctaQuickStart.timeEstimate',
  'onboarding.agent_explorer_title': 'onboarding.agentExplorerTitle',
  'onboarding.agent_count': 'onboarding.agentCount',

  // Agent Categories
  'agent_categories.foundation.name': 'agentCategories.foundation.name',
  'agent_categories.foundation.description': 'agentCategories.foundation.description',
  'agent_categories.execution.name': 'agentCategories.execution.name',
  'agent_categories.execution.description': 'agentCategories.execution.description',
  'agent_categories.intelligence.name': 'agentCategories.intelligence.name',
  'agent_categories.intelligence.description': 'agentCategories.intelligence.description',

  // Empty States
  'empty_states.no_intelligence.title': 'emptyStates.noIntelligence.title',
  'empty_states.no_intelligence.description': 'emptyStates.noIntelligence.description',
  'empty_states.no_intelligence.action': 'emptyStates.noIntelligence.action',
  'empty_states.no_campaigns.title': 'emptyStates.noCampaigns.title',
  'empty_states.no_campaigns.description': 'emptyStates.noCampaigns.description',
  'empty_states.no_campaigns.action': 'emptyStates.noCampaigns.action',
  'empty_states.intelligence_vault_empty.title': 'emptyStates.intelligenceVaultEmpty.title',
  'empty_states.intelligence_vault_empty.description': 'emptyStates.intelligenceVaultEmpty.description',
  'empty_states.intelligence_vault_empty.action': 'emptyStates.intelligenceVaultEmpty.action',
  'empty_states.campaigns_not_ready.title': 'emptyStates.campaignsNotReady.title',
  'empty_states.campaigns_not_ready.description': 'emptyStates.campaignsNotReady.description',
  'empty_states.campaigns_not_ready.action': 'emptyStates.campaignsNotReady.action',

  // Tooltips
  'tooltips.intelligence_briefing.title': 'tooltips.intelligenceBriefing.title',
  'tooltips.intelligence_briefing.description': 'tooltips.intelligenceBriefing.description',
  'tooltips.intelligence_briefing.dismiss_label': 'tooltips.intelligenceBriefing.dismissLabel',

  // Buttons
  'buttons.organize_intelligence': 'buttons.organizeIntelligence',
  'buttons.create_campaign': 'buttons.createCampaign',
  'buttons.start_with_strategy': 'buttons.startWithStrategy',
  'buttons.build_intelligence': 'buttons.buildIntelligence',
  'buttons.view_all_intelligence': 'buttons.viewAllIntelligence',
  'buttons.generate_strategy': 'buttons.generateStrategy',
  'buttons.explore_agents': 'buttons.exploreAgents',
  'buttons.quick_start': 'buttons.quickStart',

  // Progress
  'progress.readiness_percentage': 'progress.readinessPercentage',
  'progress.intelligence_outputs': 'progress.intelligenceOutputs',
  'progress.agent_interactions': 'progress.agentInteractions',
  'progress.strategic_foundation': 'progress.strategicFoundation',

  // Concepts
  'concepts.intelligence_first': 'concepts.intelligenceFirst',
  'concepts.campaigns_organize': 'concepts.campaignsOrganize',
  'concepts.ai_agents': 'concepts.aiAgents',
  'concepts.quick_wins': 'concepts.quickWins'
};

/**
 * Get educational copy using i18next
 *
 * @param path - The dot-notation path (e.g., 'intelligence_briefing.title')
 * @param replacements - Optional replacements for interpolation
 * @returns The translated string
 *
 * @example
 * ```ts
 * const title = getEducationalCopy('intelligence_briefing.title');
 * const count = getEducationalCopy('intelligence_vault.total_badge', { count: 5 });
 * ```
 */
export function getEducationalCopy(
  path: string,
  replacements?: Record<string, string | number>
): string {
  // Map old path format to new i18next key format
  const i18nKey = KEY_MAPPINGS[path] || path;

  // Get translation from i18next
  const result = i18next.t(`educational:${i18nKey}`, replacements);

  // If translation not found, warn and return path
  if (result === `educational:${i18nKey}`) {
    console.warn(`Educational copy not found for path: ${path} (mapped to: ${i18nKey})`);
    return '';
  }

  return result;
}

/**
 * @deprecated Use getEducationalCopy() instead - this function is kept for backwards compatibility
 */
export const getCopy = getEducationalCopy;

/**
 * Helper function for plural forms
 * @deprecated Use i18next pluralization instead with _other suffix in translations
 */
export function getPlural(count: number, singular: string, plural?: string): string {
  if (count === 1) return singular;
  return plural || `${singular}s`;
}

/**
 * Direct translation key access for use with useTranslation hook
 * Returns the i18next key format for the educational namespace
 *
 * @example
 * ```tsx
 * const { t } = useTranslation('educational');
 * const title = t(EDUCATIONAL_KEYS.intelligenceBriefing.title);
 * ```
 */
export const EDUCATIONAL_KEYS = {
  intelligenceBriefing: {
    title: 'intelligenceBriefing.title',
    subtitle: 'intelligenceBriefing.subtitle',
    tooltip: 'intelligenceBriefing.tooltip',
    emptyState: 'intelligenceBriefing.emptyState',
    emptyAction: 'intelligenceBriefing.emptyAction',
    aiBadge: 'intelligenceBriefing.aiBadge',
    loadingState: 'intelligenceBriefing.loadingState'
  },
  intelligenceVault: {
    title: 'intelligenceVault.title',
    subtitle: 'intelligenceVault.subtitle',
    emptyState: 'intelligenceVault.emptyState',
    emptyAction: 'intelligenceVault.emptyAction',
    viewAll: 'intelligenceVault.viewAll',
    totalBadge: 'intelligenceVault.totalBadge'
  },
  campaigns: {
    title: 'campaigns.title',
    subtitle: 'campaigns.subtitle',
    createButton: 'campaigns.createButton',
    createButtonShort: 'campaigns.createButtonShort',
    emptyStateNoIntelligence: 'campaigns.emptyStateNoIntelligence',
    emptyStateHasIntelligence: 'campaigns.emptyStateHasIntelligence',
    emptyActionPrimary: 'campaigns.emptyActionPrimary',
    emptyActionSecondary: 'campaigns.emptyActionSecondary',
    emptyActionReady: 'campaigns.emptyActionReady',
    sectionDescription: 'campaigns.sectionDescription'
  },
  agentCategories: {
    foundation: {
      name: 'agentCategories.foundation.name',
      description: 'agentCategories.foundation.description'
    },
    execution: {
      name: 'agentCategories.execution.name',
      description: 'agentCategories.execution.description'
    },
    intelligence: {
      name: 'agentCategories.intelligence.name',
      description: 'agentCategories.intelligence.description'
    }
  },
  emptyStates: {
    noIntelligence: {
      title: 'emptyStates.noIntelligence.title',
      description: 'emptyStates.noIntelligence.description',
      action: 'emptyStates.noIntelligence.action'
    },
    noCampaigns: {
      title: 'emptyStates.noCampaigns.title',
      description: 'emptyStates.noCampaigns.description',
      action: 'emptyStates.noCampaigns.action'
    }
  },
  buttons: {
    organizeIntelligence: 'buttons.organizeIntelligence',
    createCampaign: 'buttons.createCampaign',
    startWithStrategy: 'buttons.startWithStrategy',
    buildIntelligence: 'buttons.buildIntelligence',
    viewAllIntelligence: 'buttons.viewAllIntelligence',
    generateStrategy: 'buttons.generateStrategy',
    exploreAgents: 'buttons.exploreAgents',
    quickStart: 'buttons.quickStart'
  }
} as const;
