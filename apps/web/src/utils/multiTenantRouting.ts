/**
 * Multi-Tenant Routing Utilities
 *
 * Provides utilities for building context-aware URLs that work for both
 * SME and Agency users. Agency users have client-scoped routes like
 * `/clients/${clientSlug}/...` while SME users use direct routes.
 *
 * @see /docs/MULTI_TENANT_PATTERNS.md for architecture details
 */

/**
 * Transform an absolute URL to preserve client context for Agency users.
 *
 * This utility is the single source of truth for multi-tenant URL transformation.
 * Use this instead of duplicating if/else logic across components.
 *
 * @param url - The URL to transform (e.g., "/persona", "/marketing-strategy")
 * @param clientSlug - The client slug from useClientContext() (Agency) or null (SME)
 * @returns Context-aware URL
 *
 * @example
 * // Agency user
 * buildContextAwareUrl("/persona", "acme") // → "/clients/acme/persona"
 *
 * // SME user
 * buildContextAwareUrl("/persona", null) // → "/persona"
 *
 * // Idempotent - safe to call multiple times
 * buildContextAwareUrl("/clients/acme/persona", "acme") // → "/clients/acme/persona"
 *
 * // External URLs unchanged
 * buildContextAwareUrl("https://example.com", "acme") // → "https://example.com"
 *
 * // Undefined/null safe
 * buildContextAwareUrl(undefined, "acme") // → undefined
 */
export function buildContextAwareUrl(
  url: string | undefined,
  clientSlug: string | null
): string | undefined {
  if (!url) return url;
  if (!clientSlug) return url; // SME user - no transformation needed

  // Already has client context (idempotent)
  if (url.includes('/clients/')) return url;

  // Only transform absolute paths starting with '/'
  if (url.startsWith('/')) {
    return `/clients/${clientSlug}${url}`;
  }

  // Relative paths or external URLs - return as-is
  return url;
}

/**
 * Build a context-aware agent session URL.
 *
 * Convenience wrapper around buildContextAwareUrl for common agent session pattern.
 *
 * @param agentType - Agent type (e.g., "persona", "marketing_strategy")
 * @param sessionId - Session ID
 * @param clientSlug - Client slug from useClientContext() or null
 * @param mode - Optional mode for agents that use mode-based routing (e.g., marketing_strategy)
 * @returns Context-aware session URL
 *
 * @example
 * // Agency user
 * buildAgentSessionUrl("persona", "session-123", "acme")
 * // → "/clients/acme/agents/persona/session/session-123"
 *
 * // SME user with marketing_strategy mode
 * buildAgentSessionUrl("marketing_strategy", "session-123", null, "chat")
 * // → "/marketing-strategy/chat/session/session-123"
 */
export function buildAgentSessionUrl(
  agentType: string,
  sessionId: string,
  clientSlug: string | null,
  mode?: string | null
): string {
  // Convert underscores to hyphens for URL paths
  const urlPath = agentType.replace(/_/g, '-');

  // Handle marketing_strategy with mode parameter
  if (agentType === 'marketing_strategy' && mode) {
    if (clientSlug) {
      // Agency: /clients/[slug]/agents/marketing-strategy/[mode]/session/[id]
      return `/clients/${clientSlug}/agents/${urlPath}/${mode}/session/${sessionId}`;
    } else {
      // SME: /marketing-strategy/[mode]/session/[id]
      return `/${urlPath}/${mode}/session/${sessionId}`;
    }
  }

  if (clientSlug) {
    // Agency: /clients/[slug]/agents/[agent]/session/[id]
    return `/clients/${clientSlug}/agents/${urlPath}/session/${sessionId}`;
  } else {
    // SME: /[agent]/session/[id]
    return `/${urlPath}/session/${sessionId}`;
  }
}

/**
 * Build a context-aware agent root URL.
 *
 * @param agentType - Agent type (e.g., "persona", "content")
 * @param clientSlug - Client slug from useClientContext() or null
 * @returns Context-aware agent root URL
 *
 * @example
 * buildAgentRootUrl("content", "acme") // → "/clients/acme/agents/content"
 * buildAgentRootUrl("content", null) // → "/content"
 */
export function buildAgentRootUrl(
  agentType: string,
  clientSlug: string | null
): string {
  const urlPath = agentType.replace(/_/g, '-');

  if (clientSlug) {
    return `/clients/${clientSlug}/agents/${urlPath}`;
  } else {
    return `/${urlPath}`;
  }
}

/**
 * Build a context-aware Content agent tool URL.
 *
 * The Content agent uses tool-based routing (e.g., /content/tool/chat)
 * instead of session-based routing. This utility builds the correct URL
 * for both SME and Agency users.
 *
 * @param tool - Content tool name (e.g., "chat", "seo-blog", "email-drip")
 * @param clientSlug - Client slug from useClientContext() or null
 * @returns Context-aware Content tool URL
 *
 * @example
 * // Agency user
 * buildContentToolUrl("chat", "acme") // → "/clients/acme/content/tool/chat"
 *
 * // SME user
 * buildContentToolUrl("chat", null) // → "/content/tool/chat"
 */
export function buildContentToolUrl(
  tool: string,
  clientSlug: string | null
): string {
  if (clientSlug) {
    // Agency: /clients/[slug]/content/tool/[tool]
    // Note: Agency content tool routes are under /clients/[slug]/content/tool/*
    // NOT /clients/[slug]/agents/content/tool/* (different from session routes)
    return `/clients/${clientSlug}/content/tool/${tool}`;
  } else {
    // SME: /content/tool/[tool]
    return `/content/tool/${tool}`;
  }
}
