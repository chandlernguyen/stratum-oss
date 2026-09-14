import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { usePageTitle } from '@/hooks/usePageTitle'
import {
  CheckCircle2,
  Users,
  Building2,
  ArrowRight,
  Rocket,
  ChevronDown,
  Sparkles,
  Check,
  X,
  Minus,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PRICING_TIERS } from '@/config/pricing'
import { useLocalizedPath } from '@/hooks/useLocalizedPath'

/**
 * Public Pricing Page
 *
 * Design Direction: "Refined Authority" — matching the landing page aesthetic.
 * Playfair Display serif headings, gold accents, glass morphism,
 * subtle grain textures, and premium spacing.
 */

// Comparison table data — capabilities × competitors
const CAPABILITIES = [
  'strategicIntelligence',
  'creativeGeneration',
  'performanceAnalysis',
  'learningAdaptation',
  'executionRisk',
  'multiClient',
  'startingPrice',
] as const

// Semantic mapping: which values are "good", "warning", "bad", or "neutral"
const VALUE_SENTIMENT: Record<string, Record<string, 'good' | 'warning' | 'bad' | 'neutral'>> = {
  stratum: {
    strategicIntelligence: 'good',
    creativeGeneration: 'good',
    performanceAnalysis: 'good',
    learningAdaptation: 'good',
    executionRisk: 'good',
    multiClient: 'good',
    startingPrice: 'good',
  },
  competitor1: {
    strategicIntelligence: 'warning',
    creativeGeneration: 'warning',
    performanceAnalysis: 'good',
    learningAdaptation: 'warning',
    executionRisk: 'warning',
    multiClient: 'bad',
    startingPrice: 'bad',
  },
  competitor2: {
    strategicIntelligence: 'bad',
    creativeGeneration: 'good',
    performanceAnalysis: 'bad',
    learningAdaptation: 'bad',
    executionRisk: 'good',
    multiClient: 'bad',
    startingPrice: 'neutral',
  },
  competitor3: {
    strategicIntelligence: 'bad',
    creativeGeneration: 'bad',
    performanceAnalysis: 'warning',
    learningAdaptation: 'warning',
    executionRisk: 'bad',
    multiClient: 'warning',
    startingPrice: 'bad',
  },
}

function SentimentIcon({ sentiment }: { sentiment: 'good' | 'warning' | 'bad' | 'neutral' }) {
  switch (sentiment) {
    case 'good':
      return <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
    case 'warning':
      return <AlertTriangle className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
    case 'bad':
      return <X className="w-4 h-4 text-slate-400 dark:text-slate-500" />
    case 'neutral':
      return <Minus className="w-4 h-4 text-slate-400 dark:text-slate-500" />
  }
}

export function PricingPage() {
  const { t } = useTranslation('pricing')
  usePageTitle(t('meta.title'))
  const navigate = useNavigate()
  const { localizePath } = useLocalizedPath()
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

  const faqItems = t('faq.items', { returnObjects: true }) as Array<{
    question: string
    answer: string
  }>

  const competitors = ['competitor1', 'competitor2', 'competitor3'] as const

  return (
    <div className="min-h-screen bg-[#FAFAF9] dark:bg-slate-950">
      <PublicHeader />

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 md:pt-28 md:pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-[#FAFAF9] to-amber-50/30 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900" />
        <div className="absolute top-10 right-0 w-[500px] h-[500px] bg-gradient-to-br from-amber-100/20 to-transparent dark:from-amber-900/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[350px] h-[350px] bg-gradient-to-tr from-slate-200/30 to-transparent dark:from-slate-800/20 rounded-full blur-3xl" />

        <div className="relative max-w-5xl mx-auto text-center">
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-brand-charcoal dark:text-gray-100 mb-5 leading-[1.1] tracking-tight">
            {t('hero.title')}
          </h1>
          <p className="text-lg md:text-xl text-brand-slate dark:text-gray-400 max-w-2xl mx-auto">
            {t('hero.subtitle')}
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="relative px-4 sm:px-6 lg:px-8 -mt-4 pb-20 md:pb-28">
        {/* Subtle texture */}
        <div
          className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-5">
            {PRICING_TIERS.map((tier) => (
              <div
                key={tier.id}
                className={cn(
                  'relative group rounded-2xl p-6 md:p-8 transition-all duration-300',
                  tier.recommended
                    ? 'bg-gradient-to-b from-amber-50/80 to-white dark:from-amber-900/15 dark:to-slate-900 border-2 border-amber-300/60 dark:border-amber-600/40 shadow-lg shadow-amber-100/50 dark:shadow-amber-900/10 md:-translate-y-3'
                    : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:shadow-md hover:border-amber-200/60 dark:hover:border-amber-700/40'
                )}
              >
                {/* Recommended badge */}
                {tier.recommended && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <Badge className="bg-amber-500 text-white border-0 shadow-md shadow-amber-200/50 dark:shadow-amber-900/30 px-4 py-1 text-xs font-semibold tracking-wide">
                      <Sparkles className="w-3 h-3 mr-1" />
                      {t('recommended')}
                    </Badge>
                  </div>
                )}

                {/* Tier header */}
                <div className="mb-6">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center',
                        tier.recommended
                          ? 'bg-amber-100 dark:bg-amber-800/40'
                          : 'bg-slate-100 dark:bg-slate-800 group-hover:bg-amber-100 dark:group-hover:bg-amber-800/30'
                      )}
                    >
                      {tier.id === 'agency' ? (
                        <Building2
                          className={cn(
                            'w-5 h-5 transition-colors duration-300',
                            tier.recommended
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-600 dark:text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400'
                          )}
                        />
                      ) : (
                        <Users
                          className={cn(
                            'w-5 h-5 transition-colors duration-300',
                            tier.recommended
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-600 dark:text-slate-400 group-hover:text-amber-600 dark:group-hover:text-amber-400'
                          )}
                        />
                      )}
                    </div>
                    <h3 className="text-xl font-semibold text-brand-charcoal dark:text-gray-100">
                      {tier.name}
                    </h3>
                  </div>

                  <p className="text-sm text-brand-slate dark:text-gray-400 mb-4">{tier.description}</p>

                  {/* Price */}
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-brand-charcoal dark:text-gray-100">
                      ${tier.price}
                    </span>
                    <span className="text-brand-slate dark:text-gray-400 text-sm">{t('perMonth')}</span>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-brand-slate dark:text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button
                  variant={tier.recommended ? 'stratum' : 'outline'}
                  className={cn(
                    'w-full',
                    tier.recommended &&
                      'shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/30'
                  )}
                  onClick={() => navigate(localizePath('/signup'))}
                >
                  {tier.recommended ? t('startTrial') : t('getStarted')}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-900/50 relative">
        {/* Texture */}
        <div
          className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-brand-charcoal dark:text-gray-100 mb-4">
              {t('comparison.title')}
            </h2>
            <p className="text-lg text-brand-slate dark:text-gray-400">
              {t('comparison.subtitle')}
            </p>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-900">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left p-4 pl-6 font-semibold text-brand-charcoal dark:text-gray-100 w-[180px]">
                    {t('comparison.capabilities.strategicIntelligence').split(' ')[0]}
                  </th>
                  <th className="p-4 text-center font-semibold">
                    <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                      <Sparkles className="w-4 h-4" />
                      {t('comparison.stratum')}
                    </span>
                  </th>
                  {competitors.map((c) => (
                    <th
                      key={c}
                      className="p-4 text-center font-medium text-brand-slate dark:text-gray-400"
                    >
                      {t(`comparison.${c}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CAPABILITIES.map((cap, idx) => (
                  <tr
                    key={cap}
                    className={cn(
                      'border-b border-slate-100 dark:border-slate-800 last:border-0',
                      idx % 2 === 0 && 'bg-slate-50/50 dark:bg-slate-800/20'
                    )}
                  >
                    <td className="p-4 pl-6 font-medium text-brand-charcoal dark:text-gray-200">
                      {t(`comparison.capabilities.${cap}`)}
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-brand-charcoal dark:text-gray-100">
                        <SentimentIcon sentiment={VALUE_SENTIMENT.stratum[cap]} />
                        {t(`comparison.values.stratum.${cap}`)}
                      </span>
                    </td>
                    {competitors.map((c) => {
                      const val = t(`comparison.values.${c}.${cap}`)
                      const sentiment = VALUE_SENTIMENT[c][cap]
                      return (
                        <td key={c} className="p-4 text-center">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 text-sm',
                              sentiment === 'good' && 'text-brand-charcoal dark:text-gray-200',
                              sentiment === 'warning' && 'text-amber-600 dark:text-amber-400',
                              sentiment === 'bad' && 'text-slate-400 dark:text-slate-500',
                              sentiment === 'neutral' && 'text-brand-slate dark:text-gray-400'
                            )}
                          >
                            <SentimentIcon sentiment={sentiment} />
                            {val}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Comparison — stacked cards per capability */}
          <div className="md:hidden space-y-4">
            {CAPABILITIES.map((cap) => (
              <div
                key={cap}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden"
              >
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                  <h4 className="font-semibold text-sm text-brand-charcoal dark:text-gray-100">
                    {t(`comparison.capabilities.${cap}`)}
                  </h4>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {/* STRATUM row — highlighted */}
                  <div className="flex items-center justify-between px-4 py-3 bg-amber-50/50 dark:bg-amber-900/10">
                    <span className="text-sm font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      {t('comparison.stratum')}
                    </span>
                    <span className="text-sm font-semibold text-brand-charcoal dark:text-gray-100 flex items-center gap-1.5">
                      <SentimentIcon sentiment={VALUE_SENTIMENT.stratum[cap]} />
                      {t(`comparison.values.stratum.${cap}`)}
                    </span>
                  </div>
                  {competitors.map((c) => {
                    const sentiment = VALUE_SENTIMENT[c][cap]
                    return (
                      <div key={c} className="flex items-center justify-between px-4 py-3">
                        <span className="text-sm text-brand-slate dark:text-gray-400">
                          {t(`comparison.${c}`)}
                        </span>
                        <span
                          className={cn(
                            'text-sm flex items-center gap-1.5',
                            sentiment === 'good' && 'text-brand-charcoal dark:text-gray-200',
                            sentiment === 'warning' && 'text-amber-600 dark:text-amber-400',
                            sentiment === 'bad' && 'text-slate-400 dark:text-slate-500',
                            sentiment === 'neutral' && 'text-brand-slate dark:text-gray-400'
                          )}
                        >
                          <SentimentIcon sentiment={sentiment} />
                          {t(`comparison.values.${c}.${cap}`)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-brand-charcoal dark:text-gray-100 mb-4">
              {t('faq.title')}
            </h2>
          </div>

          <div className="space-y-3">
            {faqItems.map((item, idx) => (
              <div
                key={idx}
                className={cn(
                  'rounded-xl border transition-all duration-200',
                  expandedFaq === idx
                    ? 'border-amber-200/80 dark:border-amber-700/50 bg-white dark:bg-slate-900 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 hover:border-slate-300 dark:hover:border-slate-600'
                )}
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <span className="font-medium text-brand-charcoal dark:text-gray-100 pr-4">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={cn(
                      'w-5 h-5 text-brand-slate dark:text-gray-400 flex-shrink-0 transition-transform duration-200',
                      expandedFaq === idx && 'rotate-180'
                    )}
                  />
                </button>
                <div
                  className={cn(
                    'overflow-hidden transition-all duration-200',
                    expandedFaq === idx ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  )}
                >
                  <p className="px-5 pb-5 text-brand-slate dark:text-gray-400 leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 md:py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-amber-500/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-slate-600/30 to-transparent rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto text-center">
          <h2 className="font-serif text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
            {t('cta.title')}
          </h2>

          <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
            {t('cta.subtitle')}
          </p>

          <Button
            size="lg"
            variant="stratum"
            onClick={() => navigate(localizePath('/signup'))}
            className="text-lg px-8 py-6 shadow-lg shadow-amber-500/30"
          >
            <Rocket className="w-5 h-5 mr-2" />
            {t('cta.button')}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>

          <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{t('cta.benefits.trial')}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{t('cta.benefits.noCreditCard')}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{t('cta.benefits.cancelAnytime')}</span>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  )
}
