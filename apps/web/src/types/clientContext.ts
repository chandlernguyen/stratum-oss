/**
 * Branded type for client slugs to enforce useClientContext() pattern.
 *
 * This type ensures client slugs are only obtained through the proper
 * context provider, preventing direct URL parsing in components.
 *
 * Pattern Enforcement:
 * - ClientSlug can only be obtained via useClientContext() hook
 * - Direct useParams<{ clientSlug }>() usage will cause TypeScript errors
 * - Valid exceptions: ClientLayout.tsx, useAgencyRouteGuard.ts
 *
 * @example
 * // ✅ Correct usage
 * import { useClientContext } from '@/contexts/ClientContext';
 * const { clientSlug } = useClientContext(); // Returns ClientSlug | undefined
 *
 * @example
 * // ❌ Wrong usage (TypeScript error)
 * import { useParams } from 'react-router-dom';
 * const { clientSlug } = useParams<{ clientSlug?: string }>();
 * // Error: Type 'string | undefined' is not assignable to 'ClientSlug | undefined'
 */
export type ClientSlug = string & { readonly __clientSlugBrand: unique symbol };
