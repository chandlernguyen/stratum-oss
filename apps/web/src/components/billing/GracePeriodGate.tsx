import { useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { useSubscription } from '@/hooks/useSubscription'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, Clock, CreditCard, ArrowRight } from 'lucide-react'
import { stripLocalePrefix } from '@/lib/localePath'
import { useLocalizedPath } from '@/hooks/useLocalizedPath'

/** Routes accessible in read-only mode (user can view data but not create) */
const ALLOWED_PATHS = [
  '/settings/billing',
  '/settings/team',
  '/profile',
  '/dashboard',
  '/outputs',
  '/campaigns',
  '/intelligence',
  '/clients',
  '/approvals',
]

interface GracePeriodGateProps {
  children: React.ReactNode
}

export function GracePeriodGate({ children }: GracePeriodGateProps) {
  const location = useLocation()
  const { localizePath } = useLocalizedPath()
  const { subscription, loading, isReadOnly, isTrialExpired, isPastDue, refetch } = useSubscription()
  const normalizedPath = stripLocalePrefix(location.pathname)

  // Refetch subscription on route change
  useEffect(() => {
    refetch()
  }, [location.pathname, refetch])

  // Don't block while loading or if no subscription data
  if (loading || !subscription) {
    return <>{children}</>
  }

  // Only block if read-only (expired grace, expired trial, or past_due with is_read_only)
  if (!isReadOnly) {
    return <>{children}</>
  }

  // Check if current path is in the allowlist
  const isAllowedPath = ALLOWED_PATHS.some(path => normalizedPath.startsWith(path))

  if (isAllowedPath) {
    return <>{children}</>
  }

  // Determine the blocking reason and render appropriate screen
  if (isTrialExpired) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-900/20 mb-4">
            <Clock className="h-8 w-8 text-brand-gold" />
          </div>
          <h1 className="text-2xl font-semibold text-brand-charcoal dark:text-gray-100">
            Your Free Trial Has Ended
          </h1>
          <p className="text-brand-slate dark:text-gray-400 mt-2 max-w-md mx-auto">
            Your trial period has expired. Subscribe to a plan to continue using STRATUM's AI agents.
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 text-center space-y-3">
          <p className="text-sm text-brand-slate dark:text-gray-400">
            Your existing outputs, campaigns, personas, and intelligence reports are preserved
            and accessible in <span className="font-medium text-brand-charcoal dark:text-gray-200">read-only mode</span>.
          </p>
          <p className="text-sm text-brand-slate dark:text-gray-400">
            Subscribe to regain full access to all 9 AI agents and create new content.
          </p>
        </div>

        {!subscription.can_manage_billing && (
          <Alert className="mt-6">
            <AlertDescription>
              Contact your organization owner to subscribe and restore full access.
            </AlertDescription>
          </Alert>
        )}

        <div className="mt-8 text-center">
          <Button asChild variant="stratum" size="lg">
            <Link to={localizePath('/settings/billing')}>
              Choose a Plan
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  if (isPastDue) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 mb-4">
            <CreditCard className="h-8 w-8 text-brand-error" />
          </div>
          <h1 className="text-2xl font-semibold text-brand-charcoal dark:text-gray-100">
            Payment Failed
          </h1>
          <p className="text-brand-slate dark:text-gray-400 mt-2 max-w-md mx-auto">
            We were unable to process your payment. Please update your payment method to restore access.
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 text-center space-y-3">
          <p className="text-sm text-brand-slate dark:text-gray-400">
            Your existing data is preserved and accessible in <span className="font-medium text-brand-charcoal dark:text-gray-200">read-only mode</span>.
          </p>
          <p className="text-sm text-brand-slate dark:text-gray-400">
            Update your payment method to continue using all AI agents.
          </p>
        </div>

        {!subscription.can_manage_billing && (
          <Alert className="mt-6">
            <AlertDescription>
              Contact your organization owner to update payment and restore full access.
            </AlertDescription>
          </Alert>
        )}

        <div className="mt-8 text-center">
          <Button asChild variant="stratum" size="lg">
            <Link to={localizePath('/settings/billing')}>
              Update Payment
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  // Default: grandfathered grace period expired
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-gray-800 mb-4">
          <Shield className="h-8 w-8 text-brand-slate dark:text-gray-400" />
        </div>
        <h1 className="text-2xl font-semibold text-brand-charcoal dark:text-gray-100">
          Grace Period Expired
        </h1>
        <p className="text-brand-slate dark:text-gray-400 mt-2 max-w-md mx-auto">
          Your 45-day founding member grace period has ended.
          Subscribe to a plan to continue using STRATUM's AI agents.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 text-center space-y-3">
        <p className="text-sm text-brand-slate dark:text-gray-400">
          Your existing outputs, campaigns, personas, and intelligence reports are preserved
          and accessible in <span className="font-medium text-brand-charcoal dark:text-gray-200">read-only mode</span>.
        </p>
        <p className="text-sm text-brand-slate dark:text-gray-400">
          Subscribe to regain full access to all 9 AI agents and create new content.
        </p>
      </div>

      {!subscription.can_manage_billing && (
        <Alert className="mt-6">
          <AlertDescription>
            Contact your organization owner to subscribe and restore full access.
          </AlertDescription>
        </Alert>
      )}

      <div className="mt-8 text-center">
        <Button asChild variant="stratum" size="lg">
          <Link to={localizePath('/settings/billing')}>
            Choose a Plan
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
