import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSubscription } from '@/hooks/useSubscription'
import { Clock, ArrowRight, X } from 'lucide-react'
import { useLocalizedPath } from '@/hooks/useLocalizedPath'

const MODAL_STORAGE_KEY = 'grace_period_modal_seen'

function getDismissKey() {
  return `grace_banner_dismissed_${new Date().toISOString().slice(0, 10)}`
}

export function GracePeriodBanner() {
  const { subscription, loading } = useSubscription()
  const { localizePath } = useLocalizedPath()
  const [dismissed, setDismissed] = useState(() => !!localStorage.getItem(getDismissKey()))

  if (loading || !subscription) return null

  // Only show for grandfathered users with an active grace period
  if (subscription.status !== 'grandfathered') return null
  if (subscription.grace_period_days_remaining === null) return null

  // Don't show if read-only (GracePeriodGate handles that)
  if (subscription.is_read_only) return null

  // Don't show if the modal hasn't been seen yet (modal takes priority)
  if (!localStorage.getItem(MODAL_STORAGE_KEY)) return null

  const daysRemaining = subscription.grace_period_days_remaining
  const isUrgent = daysRemaining <= 14
  const isDismissible = !isUrgent

  // Respect daily dismissal for non-urgent phase
  if (isDismissible && dismissed) return null

  const handleDismiss = () => {
    localStorage.setItem(getDismissKey(), '1')
    setDismissed(true)
  }

  return (
    <div
      className={`
        relative flex items-center justify-center gap-3 px-4 py-2.5 text-sm
        ${isUrgent
          ? 'bg-gradient-to-r from-amber-50 to-amber-100/80 dark:from-amber-900/20 dark:to-amber-800/10 border-b border-amber-200 dark:border-amber-800/50'
          : 'bg-slate-50 dark:bg-gray-800/50 border-b border-slate-200 dark:border-gray-700'
        }
      `}
    >
      <Clock className={`h-4 w-4 flex-shrink-0 ${isUrgent ? 'text-brand-warning' : 'text-brand-slate dark:text-gray-400'}`} />

      <p className={isUrgent ? 'text-amber-800 dark:text-amber-200' : 'text-brand-slate dark:text-gray-400'}>
        <span className={`font-semibold ${isUrgent ? 'text-amber-900 dark:text-amber-100' : 'text-brand-charcoal dark:text-gray-100'}`}>
          {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
        </span>
        {' '}remaining in your founding member grace period.
      </p>

      <Link
        to={localizePath('/settings/billing')}
        className={`
          inline-flex items-center gap-1 font-medium whitespace-nowrap
          ${isUrgent
            ? 'text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100'
            : 'text-brand-gold hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300'
          }
        `}
      >
        Upgrade now
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>

      {isDismissible && (
        <button
          onClick={handleDismiss}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-brand-slate hover:text-brand-charcoal dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          aria-label="Dismiss for today"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
