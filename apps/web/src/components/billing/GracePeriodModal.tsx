import { useState } from 'react'
import { useSubscription } from '@/hooks/useSubscription'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Crown, ArrowRight, Clock, Shield, Sparkles } from 'lucide-react'
import { useLocalizedNavigate } from '@/hooks/useLocalizedNavigate'

const STORAGE_KEY = 'grace_period_modal_seen'

export function GracePeriodModal() {
  const navigate = useLocalizedNavigate()
  const { subscription, loading } = useSubscription()
  const [dismissed, setDismissed] = useState(() => !!localStorage.getItem(STORAGE_KEY))

  if (loading || !subscription) return null

  // Only show for grandfathered users whose grace period just started and haven't seen the modal
  const shouldShow =
    subscription.status === 'grandfathered' &&
    subscription.grace_period_days_remaining !== null &&
    !subscription.is_read_only &&
    !dismissed

  if (!shouldShow) return null

  const handleAcknowledge = () => {
    localStorage.setItem(STORAGE_KEY, Date.now().toString())
    setDismissed(true)
  }

  const handleUpgrade = () => {
    localStorage.setItem(STORAGE_KEY, Date.now().toString())
    setDismissed(true)
    navigate('/settings/billing')
  }

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        className="max-w-lg"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center sm:text-center">
          {/* Founding member badge */}
          <div className="flex justify-center mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-semibold uppercase tracking-wider">
              <Crown className="h-3.5 w-3.5" />
              Founding Member
            </span>
          </div>

          <DialogTitle className="text-2xl text-brand-charcoal dark:text-gray-100">
            Thank You for Being Here Early
          </DialogTitle>

          <DialogDescription className="text-brand-slate dark:text-gray-400 text-base">
            As one of our founding members, your feedback has shaped STRATUM into what it is today.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {/* Timeline */}
          <div className="rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-900/10 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-gold/20 flex items-center justify-center mt-0.5">
                <Sparkles className="h-4 w-4 text-brand-gold" />
              </div>
              <div>
                <p className="font-medium text-brand-charcoal dark:text-gray-100 text-sm">
                  45 days of full access
                </p>
                <p className="text-brand-slate dark:text-gray-400 text-sm">
                  Continue using all 9 AI agents, campaigns, and intelligence tools with no restrictions.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-gold/20 flex items-center justify-center mt-0.5">
                <Clock className="h-4 w-4 text-brand-gold" />
              </div>
              <div>
                <p className="font-medium text-brand-charcoal dark:text-gray-100 text-sm">
                  Choose your plan anytime
                </p>
                <p className="text-brand-slate dark:text-gray-400 text-sm">
                  Subscribe to Solo, Team, or Agency before your grace period ends to keep full access.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-gold/20 flex items-center justify-center mt-0.5">
                <Shield className="h-4 w-4 text-brand-gold" />
              </div>
              <div>
                <p className="font-medium text-brand-charcoal dark:text-gray-100 text-sm">
                  Your data is always safe
                </p>
                <p className="text-brand-slate dark:text-gray-400 text-sm">
                  After 45 days, you can still view all your outputs and intelligence — nothing is deleted.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button variant="stratum" className="w-full" onClick={handleUpgrade}>
            Choose a Plan
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button variant="ghost" className="w-full text-brand-slate" onClick={handleAcknowledge}>
            I Understand, Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
