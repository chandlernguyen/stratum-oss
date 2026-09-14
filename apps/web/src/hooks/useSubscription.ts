import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'

export interface Subscription {
  tier: string
  status: string
  stripe_subscription_id: string | null
  trial_ends_at: string | null
  period_end: string | null
  max_seats: number
  seats_used: number
  can_manage_billing: boolean
  max_clients: number
  clients_used: number
  over_seat_limit: boolean
  over_client_limit: boolean
  grace_period_started_at: string | null
  grace_period_ends_at: string | null
  grace_period_days_remaining: number | null
  is_read_only: boolean
  is_trial_expired: boolean
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSubscription = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.get('/api/v1/billing/subscription')
      setSubscription(response.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load subscription')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSubscription()
  }, [fetchSubscription])

  // Refetch on tab visibility change (handles stale tabs left open for days/weeks)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchSubscription()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [fetchSubscription])

  const createCheckoutSession = async (priceId: string) => {
    const successUrl = `${window.location.origin}/settings/billing?success=true`
    const cancelUrl = `${window.location.origin}/settings/billing?canceled=true`

    const response = await api.post('/api/v1/billing/create-checkout-session', {
      price_id: priceId,
      success_url: successUrl,
      cancel_url: cancelUrl,
    })
    return response.data
  }

  const createPortalSession = async () => {
    const returnUrl = `${window.location.origin}/settings/billing`
    const response = await api.post('/api/v1/billing/create-portal-session', {
      return_url: returnUrl,
    })
    return response.data
  }

  const isTrialExpired = subscription?.is_trial_expired ?? false
  const isPastDue = subscription?.status === 'past_due'

  const isActive = (
    subscription?.status === 'active' ||
    ((subscription?.status === 'trialing' || subscription?.status === 'trial') && !isTrialExpired) ||
    subscription?.status === 'grandfathered'
  )

  const canManageBilling = subscription?.can_manage_billing ?? false
  const isOverLimit = (subscription?.over_seat_limit || subscription?.over_client_limit) ?? false
  const overSeatLimit = subscription?.over_seat_limit ?? false
  const overClientLimit = subscription?.over_client_limit ?? false
  const isGrandfathered = subscription?.status === 'grandfathered'
  const isReadOnly = subscription?.is_read_only ?? false
  const gracePeriodDaysRemaining = subscription?.grace_period_days_remaining ?? null

  return {
    subscription,
    loading,
    error,
    isActive,
    isTrialExpired,
    isPastDue,
    canManageBilling,
    isOverLimit,
    overSeatLimit,
    overClientLimit,
    isGrandfathered,
    isReadOnly,
    gracePeriodDaysRemaining,
    refetch: fetchSubscription,
    createCheckoutSession,
    createPortalSession,
  }
}
