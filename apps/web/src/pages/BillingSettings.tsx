import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CreditCard, ExternalLink, CheckCircle2, Users, Building2, AlertTriangle, Clock } from 'lucide-react'
import { useSubscription } from '@/hooks/useSubscription'
import { PRICING_TIERS } from '@/config/pricing'
import { useLocale } from '@/hooks/useLocale'
import { getIntlLocale } from '@/lib/locales'

export function BillingSettings() {
  const { locale } = useLocale()
  const intlLocale = getIntlLocale(locale)
  const [searchParams] = useSearchParams()
  const { subscription, loading, error, isActive, isTrialExpired, isPastDue, canManageBilling, isReadOnly, createCheckoutSession, createPortalSession, refetch } = useSubscription()
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setSuccessMessage('Subscription activated! Welcome to STRATUM.')
      refetch()
    }
    if (searchParams.get('canceled') === 'true') {
      setSuccessMessage(null)
    }
  }, [searchParams, refetch])

  const handleSubscribe = async (priceId: string, tierName: string) => {
    try {
      setActionLoading(tierName)
      const data = await createCheckoutSession(priceId)
      if (data.checkout_url) {
        window.location.href = data.checkout_url
      }
    } catch (err) {
      console.error('Failed to create checkout session:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleManageBilling = async () => {
    try {
      setActionLoading('portal')
      const data = await createPortalSession()
      if (data.portal_url) {
        window.location.href = data.portal_url
      }
    } catch (err) {
      console.error('Failed to create portal session:', err)
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-brand-slate" />
      </div>
    )
  }

  const statusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Active'
      case 'trialing':
      case 'trial': return 'Trial'
      case 'grandfathered': return 'Founding Member'
      case 'past_due': return 'Past Due'
      case 'canceled': return 'Canceled'
      default: return 'Inactive'
    }
  }

  const statusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'active':
      case 'grandfathered':
        return 'default'
      case 'trialing':
      case 'trial':
        return 'secondary'
      case 'past_due':
      case 'canceled':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-brand-charcoal dark:text-gray-100">
          Billing & Subscription
        </h1>
        <p className="text-brand-slate dark:text-gray-400 mt-1">
          Manage your STRATUM subscription and billing details.
        </p>
      </div>

      {successMessage && (
        <Alert>
          <CheckCircle2 className="h-4 w-4 text-brand-success" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isTrialExpired && (
        <Alert variant="destructive">
          <Clock className="h-4 w-4" />
          <AlertDescription>
            Your free trial has expired. Choose a plan below to restore access to all AI agents.
          </AlertDescription>
        </Alert>
      )}

      {isPastDue && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Your payment failed. Please update your payment method to restore access.
          </AlertDescription>
        </Alert>
      )}

      {/* Current Subscription Status */}
      {subscription && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Current Plan</CardTitle>
                <CardDescription>
                  {isActive
                    ? `You're on the ${subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)} plan.`
                    : 'No active subscription.'}
                </CardDescription>
              </div>
              <Badge variant={statusVariant(subscription.status)}>
                {statusLabel(subscription.status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6 text-sm text-brand-slate dark:text-gray-400">
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                <span>{subscription.seats_used} of {subscription.max_seats} seat{subscription.max_seats !== 1 ? 's' : ''} used</span>
              </div>
              {subscription.period_end && (
                <div>
                  Next billing: {new Date(subscription.period_end).toLocaleDateString(intlLocale)}
                </div>
              )}
              {subscription.trial_ends_at && (
                <div>
                  Trial ends: {new Date(subscription.trial_ends_at).toLocaleDateString(intlLocale)}
                </div>
              )}
            </div>
            {isActive && subscription.stripe_subscription_id && canManageBilling && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={handleManageBilling}
                disabled={actionLoading === 'portal'}
              >
                {actionLoading === 'portal' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="mr-2 h-4 w-4" />
                )}
                Manage Billing
                <ExternalLink className="ml-2 h-3 w-3" />
              </Button>
            )}
            {isActive && !canManageBilling && (
              <p className="mt-4 text-sm text-brand-slate dark:text-gray-400">
                Only organization owners can manage billing.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pricing Cards */}
      {(!isActive || subscription?.status === 'canceled' || subscription?.status === 'grandfathered' || isReadOnly) && (
        <div>
          <h2 className="text-lg font-semibold text-brand-charcoal dark:text-gray-100 mb-4">
            Choose a Plan
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PRICING_TIERS.map((tier) => (
              <Card
                key={tier.id}
                className={`relative ${tier.recommended ? 'border-brand-gold shadow-md' : ''}`}
              >
                {tier.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-brand-gold text-white">Recommended</Badge>
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {tier.id === 'agency' ? (
                      <Building2 className="h-5 w-5 text-brand-slate" />
                    ) : (
                      <Users className="h-5 w-5 text-brand-slate" />
                    )}
                    {tier.name}
                  </CardTitle>
                  <CardDescription>{tier.description}</CardDescription>
                  <div className="pt-2">
                    <span className="text-3xl font-bold text-brand-charcoal dark:text-gray-100">
                      ${tier.price}
                    </span>
                    <span className="text-brand-slate dark:text-gray-400">/mo</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-6">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-brand-success flex-shrink-0" />
                        <span className="text-brand-slate dark:text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={tier.recommended ? 'stratum' : 'outline'}
                    className="w-full"
                    onClick={() => handleSubscribe(tier.priceId, tier.name)}
                    disabled={!!actionLoading || !tier.priceId || !canManageBilling}
                    title={!canManageBilling ? 'Contact your organization owner to manage billing' : undefined}
                  >
                    {actionLoading === tier.name ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {tier.recommended ? 'Start Free Trial' : `Subscribe to ${tier.name}`}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          {!canManageBilling && (
            <p className="text-sm text-brand-slate dark:text-gray-400 text-center mt-4">
              Only organization owners can manage billing.
            </p>
          )}
          <p className="text-xs text-brand-slate dark:text-gray-500 text-center mt-4">
            All plans include a 30-day free trial. Cancel anytime.
          </p>
        </div>
      )}
    </div>
  )
}
