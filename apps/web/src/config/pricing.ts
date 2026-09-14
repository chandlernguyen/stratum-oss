/**
 * Shared pricing configuration
 *
 * Single source of truth for tier data, used by both
 * the public PricingPage and the authenticated BillingSettings.
 */

export interface PricingTier {
  id: string
  name: string
  price: number
  seats: number
  maxClients?: number
  description: string
  features: string[]
  priceId: string
  recommended?: boolean
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'solo',
    name: 'Solo',
    price: 29,
    seats: 1,
    description: 'For individual marketers and consultants',
    features: ['All 9 AI agents', '1 team member', 'Unlimited sessions'],
    priceId: import.meta.env.VITE_STRIPE_PRICE_SOLO,
  },
  {
    id: 'team',
    name: 'Team',
    price: 79,
    seats: 3,
    description: 'For small marketing teams',
    features: ['All 9 AI agents', 'Up to 3 team members', 'Unlimited sessions', 'Team collaboration'],
    priceId: import.meta.env.VITE_STRIPE_PRICE_TEAM,
    recommended: true,
  },
  {
    id: 'agency',
    name: 'Agency',
    price: 199,
    seats: 10,
    maxClients: 5,
    description: 'For agencies managing multiple clients',
    features: ['All 9 AI agents', 'Up to 10 team members', 'Up to 5 clients', 'Client Success agent'],
    priceId: import.meta.env.VITE_STRIPE_PRICE_AGENCY,
  },
]
