import { useParams, Outlet, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useClientBySlug } from '@/hooks/data/useClients';
import { useClientDashboard } from '@/hooks/data/useClientDashboard';
import { useClientAccess } from '@/hooks/data/useUserContextEnhanced';
import { ClientContextProvider } from '@/contexts/ClientContext';
import { LayeredSpinner } from '@/components/ui/layered-icon';
import { AccessDenied } from '@/components/auth/AccessDenied';
import { toast } from 'sonner';
import { useEffect } from 'react';
import type { ClientSlug } from '@/types/clientContext';
import { useAgentLayout } from '@/contexts/AgentLayoutContext';

/**
 * ClientLayout wraps all /clients/:clientSlug/* routes
 *
 * Responsibilities:
 * - Extracts clientSlug from URL params
 * - Fetches client data by slug via useClientBySlug
 * - Fetches full client dashboard via useClientDashboard
 * - Verifies agency user has access to this client
 * - Provides ClientContext to all nested routes
 * - Shows client context banner with "Switch Client" button
 *
 * URL Structure:
 * - /clients/:clientSlug → Client dashboard
 * - /clients/:clientSlug/agents/strategy → Strategy agent for this client
 * - /clients/:clientSlug/campaigns → Campaigns for this client
 *
 * Access Control:
 * - Only accessible to agency users (enforced by RoleProtectedRoute in App.tsx)
 * - Verifies org_id ownership via RLS policies
 * - For client-scoped roles (account_manager, client_viewer, freelancer), verifies
 *   user has explicit assignment to the client via user_role_assignments
 */
export function ClientLayout() {
  const { t } = useTranslation(['common']);
  const { clientSlug } = useParams<{ clientSlug: string }>();
  const agentLayout = useAgentLayout();

  // Step 1: Look up client by slug
  const { data: client, isLoading: isLoadingClient, error: clientError } = useClientBySlug(clientSlug);

  // Step 2: Fetch full dashboard data using client ID
  const { data: clientData, isLoading: isLoadingDashboard, error: dashboardError } = useClientDashboard(
    client?.id || null
  );

  // Step 3: Check if user has access to this specific client (for client-scoped roles)
  const { canAccessClient, isLoading: isLoadingAccess } = useClientAccess(client?.id);

  // Show error toast if client not found
  useEffect(() => {
    if (clientError || (client === null && !isLoadingClient)) {
      toast.error(t('clientLayout.clientNotFound'));
    }
  }, [clientError, client, isLoadingClient, t]);

  if (isLoadingClient || (client && isLoadingDashboard) || isLoadingAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <LayeredSpinner size="lg" />
        <p className="text-sm text-muted-foreground">{t('clientLayout.loadingClientData')}</p>
      </div>
    );
  }

  // If error or no data, redirect to clients list
  if (clientError || dashboardError || !client || !clientData) {
    return <Navigate to="/clients" replace />;
  }

  // If user doesn't have access to this client (client-scoped role without assignment)
  if (!canAccessClient) {
    return (
      <AccessDenied
        featureName={t('clientLayout.clientFeatureName', { clientName: client.name })}
        message={t('clientLayout.noAccessMessage')}
      />
    );
  }

  // Use h-full on agent pages to respect viewport constraint, min-h-screen on other pages
  const containerClass = agentLayout?.isAgentPage ? "h-full" : "min-h-screen";

  return (
    <ClientContextProvider
      clientId={client.id}
      clientSlug={clientSlug! as ClientSlug} // Valid exception: Cast URL param to branded type
      clientData={clientData}
    >
      <div className={containerClass}>
        {/* Render nested routes */}
        <Outlet />
      </div>
    </ClientContextProvider>
  );
}
