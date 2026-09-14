import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ClientViewHeader } from './ClientViewHeader'
import { PublicFooter } from './PublicFooter'
import { useUserContextEnhanced } from '@/hooks/data/useUserContextEnhanced'
import { useClientDashboard } from '@/hooks/data/useClientDashboard'
import { ClientContextProvider } from '@/contexts/ClientContext'
import { LayeredSpinner } from '@/components/ui/layered-icon'
import type { ClientSlug } from '@/types/clientContext'
import { buildLocalizedPath, getPathLocale } from '@/lib/localePath'

/**
 * ClientViewLayout - Main layout for external agency_client users
 *
 * This layout provides a simplified view for external clients who:
 * - Are assigned to exactly one client
 * - Need to review and approve agency work
 * - Don't need access to AI agents or campaign management
 *
 * The layout:
 * 1. Fetches the user's assigned client from user_client_assignments
 * 2. Sets up ClientContext with that client's data
 * 3. Renders a simplified header with minimal navigation
 * 4. Routes to client-specific pages (/client/*)
 *
 * Access Control:
 * - Only accessible to users with agency_client role
 * - If user has no client assignment, shows error
 * - If user has multiple clients (shouldn't happen), uses first one
 */
export function ClientViewLayout() {
  const { t } = useTranslation(['common'])
  const location = useLocation()
  const { clientSlug: urlClientSlug } = useParams<{ clientSlug: string }>()
  const routeLocale = getPathLocale(location.pathname)
  const { data: userContext, isLoading: userLoading } = useUserContextEnhanced()

  // Get the user's assigned clients from context
  // For agency_client users, they should have exactly one client in client_access
  const assignedClients = userContext?.client_access || []
  const primaryClient = assignedClients[0]
  const primaryClientId = primaryClient?.id

  // Generate the expected slug from the client name
  const expectedSlug = primaryClient?.name?.toLowerCase().replace(/\s+/g, '-')

  // Fetch client dashboard data
  const {
    data: clientData,
    isLoading: clientLoading,
    error: clientError
  } = useClientDashboard(primaryClientId || null)

  // Check if user is actually an agency_client
  const isClientRole = userContext?.roles?.some(
    role => role.role_name === 'agency_client'
  )

  // Loading state
  if (userLoading || clientLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <LayeredSpinner size="lg" />
        <p className="text-sm text-muted-foreground">{t('clientPortal.loading')}</p>
      </div>
    )
  }

  // If not an agency_client role, redirect to standard dashboard
  // This shouldn't happen if routing is set up correctly, but safety first
  if (!isClientRole) {
    return <Navigate to={buildLocalizedPath(routeLocale, '/dashboard')} replace />
  }

  // If no client assigned, show error
  if (!primaryClientId || !clientData) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 p-4 text-center">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
          <span className="text-3xl">🔒</span>
        </div>
        <h1 className="text-xl font-semibold text-brand-charcoal dark:text-gray-100">
          {t('clientPortal.noAccess')}
        </h1>
        <p className="text-brand-slate dark:text-gray-400 max-w-md">
          {t('clientPortal.noAccessDescription')}
        </p>
        {clientError && (
          <p className="text-sm text-brand-error mt-2">
            {t('errors.generic')}: {clientError.message}
          </p>
        )}
      </div>
    )
  }

  // Use the client slug from URL, or redirect to the correct URL if needed
  const clientSlug = (
    clientData.client_info?.name?.toLowerCase().replace(/\s+/g, '-') ||
    primaryClientId
  ) as ClientSlug

  // If URL slug doesn't match expected slug, redirect to correct URL
  // This handles the "my-client" placeholder from ProtectedRoute
  if (urlClientSlug !== clientSlug && expectedSlug && urlClientSlug !== expectedSlug) {
    return <Navigate to={buildLocalizedPath(routeLocale, `/portal/${clientSlug}`)} replace />
  }

  return (
    <ClientContextProvider
      clientId={primaryClientId}
      clientSlug={clientSlug}
      clientData={clientData}
    >
      <div className="flex flex-col min-h-screen">
        <ClientViewHeader />
        <main className="flex-1">
          <Outlet />
        </main>
        <div className="hidden md:block">
          <PublicFooter />
        </div>
      </div>
    </ClientContextProvider>
  )
}
