/**
 * Utility for parsing route parameters from React Router wildcard paths.
 *
 * When using wildcard routes (e.g., `/agent/*`) to prevent component remounting,
 * useParams() returns `{ '*': 'session/abc123' }` instead of `{ sessionId: 'abc123' }`.
 *
 * This utility extracts parameters from the wildcard path.
 *
 * @example
 * // Route: /strategy/*
 * // URL: /strategy/session/abc123
 * const { sessionId } = parseWildcardParams(params['*'], {
 *   sessionId: /^session\/(.+)$/
 * });
 * // sessionId = 'abc123'
 */

type ParamPatterns = Record<string, RegExp>;
type ParsedParams<T extends ParamPatterns> = {
  [K in keyof T]: string | undefined;
};

/**
 * Parse parameters from a wildcard path using regex patterns
 *
 * @param wildcardPath - The wildcard portion of the URL (params['*'])
 * @param patterns - Object mapping param names to regex patterns (first capture group is the value)
 * @returns Object with extracted parameter values
 */
export function parseWildcardParams<T extends ParamPatterns>(
  wildcardPath: string | undefined,
  patterns: T
): ParsedParams<T> {
  const result = {} as ParsedParams<T>;

  for (const [key, pattern] of Object.entries(patterns)) {
    const match = wildcardPath?.match(pattern);
    (result as Record<string, string | undefined>)[key] = match?.[1];
  }

  return result;
}

/**
 * Common patterns for agent routes
 */
export const AGENT_ROUTE_PATTERNS = {
  /** Matches 'session/{uuid}' and extracts the session ID */
  sessionId: /^session\/([a-f0-9-]+)$/i,

  /** Matches 'session/{uuid}' anywhere in path */
  sessionIdInPath: /session\/([a-f0-9-]+)/i,

  /** Matches 'plan/{uuid}' and extracts the plan ID */
  planId: /^plan\/([a-f0-9-]+)$/i,

  /** Matches 'tool/{name}' and extracts the tool name */
  tool: /^tool\/([^/]+)/,

  /** Matches 'tool/{name}/session/{uuid}' and extracts both */
  toolWithSession: /^tool\/([^/]+)(?:\/session\/([a-f0-9-]+))?$/i,

  /** Matches interview path: 'interview/{personaId}' or 'interview/{personaId}/session/{sessionId}' */
  interviewPath: /^interview\/([a-f0-9-]+)(?:\/session\/([a-f0-9-]+))?$/i,

  /** Matches mode path: '{mode}' or '{mode}/session/{sessionId}' */
  modeWithSession: /^([^/]+)(?:\/session\/([a-f0-9-]+))?$/,
} as const;

/**
 * Extract sessionId from wildcard path
 * Handles: '', 'session/uuid'
 */
export function extractSessionId(wildcardPath: string | undefined): string | undefined {
  if (!wildcardPath) return undefined;
  const match = wildcardPath.match(AGENT_ROUTE_PATTERNS.sessionIdInPath);
  return match?.[1];
}

/**
 * Extract tool and optional sessionId from wildcard path
 * Handles multiple URL patterns:
 * - '' → no tool
 * - 'tool/seo' → tool: 'seo' (from /content/* route)
 * - 'tool/seo/session/uuid' → tool: 'seo', sessionId: uuid
 * - 'seo' → tool: 'seo' (from /content/tool/* route - wildcard is just the tool name)
 * - 'seo/session/uuid' → tool: 'seo', sessionId: uuid (from /content/tool/* route)
 * - 'session/uuid' → sessionId: uuid (no tool)
 */
export function extractToolParams(wildcardPath: string | undefined): {
  tool: string | undefined;
  sessionId: string | undefined;
} {
  if (!wildcardPath) return { tool: undefined, sessionId: undefined };

  // Pattern 1: Full tool path (from /content/* route)
  // Matches: 'tool/seo' or 'tool/seo/session/uuid'
  const fullToolMatch = wildcardPath.match(/^tool\/([^/]+)(?:\/session\/([a-f0-9-]+))?$/i);
  if (fullToolMatch) {
    return { tool: fullToolMatch[1], sessionId: fullToolMatch[2] };
  }

  // Pattern 2: Direct tool path (from /content/tool/* route where wildcard is just tool name)
  // Matches: 'chat' or 'seo-blog' or 'chat/session/uuid'
  // Must NOT start with 'session/' and must be a valid tool name (letters, numbers, hyphens)
  const directToolMatch = wildcardPath.match(/^([a-z][a-z0-9-]*)(?:\/session\/([a-f0-9-]+))?$/i);
  if (directToolMatch && directToolMatch[1] !== 'session') {
    return { tool: directToolMatch[1], sessionId: directToolMatch[2] };
  }

  // Pattern 3: Session-only path (from /content/* route)
  // Matches: 'session/uuid'
  const sessionMatch = wildcardPath.match(AGENT_ROUTE_PATTERNS.sessionId);
  if (sessionMatch) {
    return { tool: undefined, sessionId: sessionMatch[1] };
  }

  return { tool: undefined, sessionId: undefined };
}

/**
 * Extract mode and optional sessionId from wildcard path
 * Handles: '', 'quick', 'guided', 'quick/session/uuid'
 */
export function extractModeParams(wildcardPath: string | undefined): {
  mode: string | undefined;
  sessionId: string | undefined;
} {
  if (!wildcardPath) return { mode: undefined, sessionId: undefined };

  const match = wildcardPath.match(AGENT_ROUTE_PATTERNS.modeWithSession);
  if (match) {
    // Don't treat 'session' as a mode
    if (match[1] === 'session') {
      const sessionMatch = wildcardPath.match(AGENT_ROUTE_PATTERNS.sessionId);
      return { mode: undefined, sessionId: sessionMatch?.[1] };
    }
    return { mode: match[1], sessionId: match[2] };
  }

  return { mode: undefined, sessionId: undefined };
}

/**
 * Extract planId or sessionId from campaign planning wildcard path
 * Handles: '', 'plan/uuid', 'session/uuid'
 */
export function extractCampaignPlanningParams(wildcardPath: string | undefined): {
  planId: string | undefined;
  sessionId: string | undefined;
} {
  if (!wildcardPath) return { planId: undefined, sessionId: undefined };

  const planMatch = wildcardPath.match(AGENT_ROUTE_PATTERNS.planId);
  if (planMatch) {
    return { planId: planMatch[1], sessionId: undefined };
  }

  const sessionMatch = wildcardPath.match(AGENT_ROUTE_PATTERNS.sessionId);
  if (sessionMatch) {
    return { planId: undefined, sessionId: sessionMatch[1] };
  }

  return { planId: undefined, sessionId: undefined };
}

/**
 * Extract personaId and optional sessionId from interview wildcard path
 * Handles: '{personaId}', '{personaId}/session/{sessionId}'
 */
export function extractInterviewParams(wildcardPath: string | undefined): {
  personaId: string | undefined;
  sessionId: string | undefined;
} {
  if (!wildcardPath) return { personaId: undefined, sessionId: undefined };

  // Format: {personaId} or {personaId}/session/{sessionId}
  const match = wildcardPath.match(/^([a-f0-9-]+)(?:\/session\/([a-f0-9-]+))?$/i);
  if (match) {
    return { personaId: match[1], sessionId: match[2] };
  }

  return { personaId: undefined, sessionId: undefined };
}
