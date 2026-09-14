import { useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { useSubscription } from '@/hooks/useSubscription'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, Users, Building2, ArrowRight } from 'lucide-react'
import { stripLocalePrefix } from '@/lib/localePath'
import { useLocalizedPath } from '@/hooks/useLocalizedPath'

/** Routes accessible even when org exceeds plan limits */
const ALLOWED_PATHS = [
  '/settings/team',
  '/settings/billing',
  '/clients',
  '/profile',
]

interface OverLimitGateProps {
  children: React.ReactNode
}

export function OverLimitGate({ children }: OverLimitGateProps) {
  const location = useLocation()
  const { localizePath } = useLocalizedPath()
  const { subscription, loading, isOverLimit, overSeatLimit, overClientLimit, refetch } = useSubscription()
  const normalizedPath = stripLocalePrefix(location.pathname)

  // Refetch subscription on route change so removing members/clients unblocks immediately
  useEffect(() => {
    refetch()
  }, [location.pathname, refetch])

  // Don't block while loading or if no subscription data
  if (loading || !subscription) {
    return <>{children}</>
  }

  // Grandfathered users are exempt
  if (subscription.status === 'grandfathered') {
    return <>{children}</>
  }

  // Check if current path is in the allowlist
  const isAllowedPath = ALLOWED_PATHS.some(path => normalizedPath.startsWith(path))

  // If not over limit or on an allowed path, render normally
  if (!isOverLimit || isAllowedPath) {
    return <>{children}</>
  }

  // Hard block: render the over-limit screen
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 mb-4">
          <AlertTriangle className="h-8 w-8 text-brand-warning" />
        </div>
        <h1 className="text-2xl font-semibold text-brand-charcoal dark:text-gray-100">
          Plan Limit Exceeded
        </h1>
        <p className="text-brand-slate dark:text-gray-400 mt-2">
          Your organization exceeds the limits of your current plan.
          Please resolve the items below to continue using STRATUM.
        </p>
      </div>

      <div className="space-y-4">
        {overSeatLimit && (
          <Card className="border-brand-warning/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-brand-warning" />
                Too Many Team Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-brand-slate dark:text-gray-400 mb-3">
                You have <span className="font-semibold text-brand-charcoal dark:text-gray-100">
                  {subscription.seats_used}
                </span> team members but your plan allows <span className="font-semibold text-brand-charcoal dark:text-gray-100">
                  {subscription.max_seats}
                </span>.
                {' '}Remove {subscription.seats_used - subscription.max_seats} member{subscription.seats_used - subscription.max_seats !== 1 ? 's' : ''} to continue.
              </p>
              <Button asChild variant="outline">
                <Link to={localizePath('/settings/team')}>
                  Manage Team <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {overClientLimit && (
          <Card className="border-brand-warning/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5 text-brand-warning" />
                Too Many Clients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-brand-slate dark:text-gray-400 mb-3">
                You have <span className="font-semibold text-brand-charcoal dark:text-gray-100">
                  {subscription.clients_used}
                </span> active clients but your plan allows <span className="font-semibold text-brand-charcoal dark:text-gray-100">
                  {subscription.max_clients}
                </span>.
                {' '}Archive {subscription.clients_used - subscription.max_clients} client{subscription.clients_used - subscription.max_clients !== 1 ? 's' : ''} to continue.
              </p>
              <Button asChild variant="outline">
                <Link to={localizePath('/clients')}>
                  Manage Clients <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {!subscription.can_manage_billing && (
        <Alert className="mt-6">
          <AlertDescription>
            Contact your organization owner to resolve this issue or upgrade your plan.
          </AlertDescription>
        </Alert>
      )}

      <div className="mt-8 text-center">
        <p className="text-sm text-brand-slate dark:text-gray-400 mb-3">
          Or upgrade your plan to increase your limits.
        </p>
        <Button asChild variant="stratum">
          <Link to={localizePath('/settings/billing')}>
            Upgrade Plan
          </Link>
        </Button>
      </div>
    </div>
  )
}
