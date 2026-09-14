import { createContext, useContext, type ReactNode } from 'react';
import type { ClientSlug } from '@/types/clientContext';

interface ClientContextType {
  clientId: string;
  clientSlug: ClientSlug;
  clientData: any;
}

const ClientContext = createContext<ClientContextType | null>(null);

/**
 * ClientContextProvider wraps client-contextual routes
 * Used by ClientLayout to provide client context to all nested components
 *
 * Usage:
 * - Agency users navigating to /clients/:clientSlug/* routes
 * - Provides clientId, clientSlug, and clientData to all child components
 * - SME users (not in client routes) get null values from useClientContext
 */
export function ClientContextProvider({
  clientId,
  clientSlug,
  clientData,
  children
}: {
  clientId: string;
  clientSlug: string;
  clientData: any;
  children: ReactNode;
}) {
  return (
    <ClientContext.Provider value={{ clientId, clientSlug: clientSlug as ClientSlug, clientData }}>
      {children}
    </ClientContext.Provider>
  );
}

/**
 * Hook to access client context with type-safe ClientSlug.
 *
 * Pattern Enforcement:
 * - Returns ClientSlug branded type (not plain string)
 * - Components using useParams<{ clientSlug }> will get TypeScript errors
 * - Only this hook and ClientLayout.tsx can create ClientSlug values
 *
 * Returns:
 * - For agency users in /clients/:clientSlug/* routes: { clientId, clientSlug: ClientSlug, clientData }
 * - For SME users or agency users outside client routes: { clientId: null, clientSlug: null, clientData: null }
 *
 * Usage:
 * ```typescript
 * const { clientId, clientSlug } = useClientContext();
 * // Use clientId to filter data queries, clientSlug for navigation
 * const { data: outputs } = useAgentOutputs({ client_id: clientId });
 * if (clientSlug) {
 *   navigate(`/clients/${clientSlug}/campaigns`);
 * }
 * ```
 */
export function useClientContext(): {
  clientId: string | null;
  clientSlug: ClientSlug | null;
  clientData: any | null;
} {
  const context = useContext(ClientContext);
  if (!context) {
    // If not in client context, return null (SME users)
    return { clientId: null, clientSlug: null, clientData: null };
  }
  return context;
}
