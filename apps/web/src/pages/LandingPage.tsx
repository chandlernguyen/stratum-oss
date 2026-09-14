import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
  Sparkles,
  Target,
  Users,
  Rocket,
  Zap,
  Brain,
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  Building2,
  ChevronDown
} from 'lucide-react';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';

/**
 * STRAŦUM Landing Page - Redesigned January 2026
 *
 * Design Direction: "Refined Authority"
 * - Premium, sophisticated aesthetic following brand guidelines
 * - Layered depth with subtle textures
 * - Gold accents for premium positioning
 * - Strategic intelligence messaging
 */

export function LandingPage() {
  const { t } = useTranslation('landing');
  usePageTitle('Home');
  const navigate = useNavigate();
  const { localizePath } = useLocalizedPath();
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [activeAudience, setActiveAudience] = useState<'sme' | 'agency'>('sme');
  const featuresRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <PublicHeader />

      {/* Hero Section - Premium Editorial Style */}
      <section className="relative pt-20 pb-24 md:pt-32 md:pb-40 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Subtle background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-[#FAFAF9] to-amber-50/30" />

        {/* Decorative elements */}
        <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-gradient-to-br from-amber-100/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-slate-200/30 to-transparent rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto">
          <div className="text-center">
            {/* Hero Headline - Using Playfair Display */}
            <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl font-bold text-brand-charcoal mb-6 leading-[1.1] tracking-tight">
              {t('hero.headlinePart1')}
              <br />
              {t('hero.headlinePart2')}
              <br />
              <span className="bg-gradient-to-r from-slate-500 via-slate-600 to-amber-600 bg-clip-text text-transparent">
                {t('hero.headlinePart3')}
              </span>
            </h1>

            {/* Tagline */}
            <p className="text-xl md:text-2xl font-semibold text-brand-charcoal mb-4 tracking-tight">
              {t('hero.tagline')}
            </p>

            {/* Value Proposition */}
            <p className="text-lg md:text-xl text-brand-slate mb-10 max-w-2xl mx-auto leading-relaxed">
              {t('hero.description')}
              <br className="hidden md:block" />
              <span className="font-semibold text-brand-charcoal">{t('hero.cta')}</span>
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <Button
                size="lg"
                variant="stratum"
                onClick={() => navigate(localizePath('/signup'))}
                className="w-full sm:w-auto text-lg px-8 py-6 shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30 transition-all duration-300"
              >
                <Rocket className="w-5 h-5 mr-2" />
                {t('hero.primaryButton')}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>

              <button
                onClick={() => navigate(localizePath('/login'))}
                className="text-sm text-brand-slate hover:text-amber-600 transition-colors flex items-center gap-2 group"
              >
                {t('hero.secondaryText')}
                <span className="font-semibold text-brand-charcoal group-hover:text-amber-600 flex items-center gap-1">
                  {t('hero.secondaryLink')}
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </button>
            </div>

            <p className="text-sm text-brand-slate">{t('hero.trialNote')}</p>

            {/* Scroll indicator */}
            <button
              onClick={scrollToFeatures}
              className="mt-12 mx-auto flex flex-col items-center gap-2 text-brand-slate hover:text-brand-charcoal transition-colors animate-bounce"
            >
              <span className="text-xs font-medium tracking-wide uppercase">{t('hero.scrollDiscover')}</span>
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Value Props Section */}
      <section ref={featuresRef} className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 bg-white relative">
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
        }} />

        <div className="relative max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Strategic Clarity */}
            <div className="group p-8 rounded-2xl bg-gradient-to-b from-slate-50 to-white border border-slate-200/60 shadow-sm hover:shadow-lg hover:border-amber-200 transition-all duration-300">
              <div className="w-14 h-14 rounded-xl bg-slate-100 group-hover:bg-amber-100 flex items-center justify-center mb-6 transition-colors duration-300">
                <Lightbulb className="w-7 h-7 text-slate-600 group-hover:text-amber-600 transition-colors duration-300" />
              </div>
              <h3 className="text-xl font-semibold text-brand-charcoal mb-3">{t('valueProps.clarity.title')}</h3>
              <p className="text-brand-slate leading-relaxed">
                {t('valueProps.clarity.description')}
              </p>
            </div>

            {/* Intelligence That Learns */}
            <div className="group p-8 rounded-2xl bg-gradient-to-b from-amber-50/50 to-white border border-amber-200/60 shadow-sm hover:shadow-lg transition-all duration-300 md:-translate-y-4">
              <div className="w-14 h-14 rounded-xl bg-amber-100 flex items-center justify-center mb-6">
                <Brain className="w-7 h-7 text-amber-600" />
              </div>
              <h3 className="text-xl font-semibold text-brand-charcoal mb-3">{t('valueProps.intelligence.title')}</h3>
              <p className="text-brand-slate leading-relaxed">
                {t('valueProps.intelligence.description')}
              </p>
              <div className="mt-4 pt-4 border-t border-amber-200/40">
                <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">
                  {t('valueProps.intelligence.badge')}
                </Badge>
              </div>
            </div>

            {/* Quick Wins */}
            <div className="group p-8 rounded-2xl bg-gradient-to-b from-slate-50 to-white border border-slate-200/60 shadow-sm hover:shadow-lg hover:border-amber-200 transition-all duration-300">
              <div className="w-14 h-14 rounded-xl bg-slate-100 group-hover:bg-amber-100 flex items-center justify-center mb-6 transition-colors duration-300">
                <Zap className="w-7 h-7 text-slate-600 group-hover:text-amber-600 transition-colors duration-300" />
              </div>
              <h3 className="text-xl font-semibold text-brand-charcoal mb-3">{t('valueProps.quickWins.title')}</h3>
              <p className="text-brand-slate leading-relaxed">
                {t('valueProps.quickWins.description')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Audience Section */}
      <section className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-brand-charcoal mb-4">
              {t('audience.title')}
            </h2>
            <p className="text-lg text-brand-slate">
              {t('audience.subtitle')}
            </p>
          </div>

          {/* Audience Toggle */}
          <div className="flex justify-center mb-10">
            <div className="inline-flex rounded-xl bg-slate-100 p-1.5">
              <button
                onClick={() => setActiveAudience('sme')}
                className={`px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeAudience === 'sme'
                    ? 'bg-white text-brand-charcoal shadow-sm'
                    : 'text-brand-slate hover:text-brand-charcoal'
                }`}
              >
                <Target className="w-4 h-4 inline-block mr-2" />
                {t('audience.sme.label')}
              </button>
              <button
                onClick={() => setActiveAudience('agency')}
                className={`px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeAudience === 'agency'
                    ? 'bg-white text-brand-charcoal shadow-sm'
                    : 'text-brand-slate hover:text-brand-charcoal'
                }`}
              >
                <Building2 className="w-4 h-4 inline-block mr-2" />
                {t('audience.agency.label')}
              </button>
            </div>
          </div>

          {/* SME Content */}
          <div className={`transition-all duration-300 ${activeAudience === 'sme' ? 'block' : 'hidden'}`}>
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-8 md:p-12">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <Target className="w-8 h-8 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-brand-charcoal">{t('audience.sme.title')}</h3>
                    <p className="text-brand-slate">{t('audience.sme.subtitle')}</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  <div className="p-5 rounded-xl bg-slate-50">
                    <CheckCircle2 className="w-5 h-5 text-slate-600 mb-3" />
                    <h4 className="font-semibold text-brand-charcoal mb-2">{t('audience.sme.features.clarity.title')}</h4>
                    <p className="text-sm text-brand-slate">{t('audience.sme.features.clarity.description')}</p>
                  </div>
                  <div className="p-5 rounded-xl bg-slate-50">
                    <CheckCircle2 className="w-5 h-5 text-slate-600 mb-3" />
                    <h4 className="font-semibold text-brand-charcoal mb-2">{t('audience.sme.features.budget.title')}</h4>
                    <p className="text-sm text-brand-slate">{t('audience.sme.features.budget.description')}</p>
                  </div>
                  <div className="p-5 rounded-xl bg-slate-50">
                    <CheckCircle2 className="w-5 h-5 text-slate-600 mb-3" />
                    <h4 className="font-semibold text-brand-charcoal mb-2">{t('audience.sme.features.confidence.title')}</h4>
                    <p className="text-sm text-brand-slate">{t('audience.sme.features.confidence.description')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Agency Content */}
          <div className={`transition-all duration-300 ${activeAudience === 'agency' ? 'block' : 'hidden'}`}>
            <div className="bg-gradient-to-br from-white to-amber-50/30 rounded-3xl border border-amber-200/60 shadow-sm overflow-hidden">
              <div className="p-8 md:p-12">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-brand-charcoal">{t('audience.agency.title')}</h3>
                    <p className="text-brand-slate">{t('audience.agency.subtitle')}</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  <div className="p-5 rounded-xl bg-white/60 border border-amber-100">
                    <CheckCircle2 className="w-5 h-5 text-amber-600 mb-3" />
                    <h4 className="font-semibold text-brand-charcoal mb-2">{t('audience.agency.features.clientReady.title')}</h4>
                    <p className="text-sm text-brand-slate">{t('audience.agency.features.clientReady.description')}</p>
                  </div>
                  <div className="p-5 rounded-xl bg-white/60 border border-amber-100">
                    <CheckCircle2 className="w-5 h-5 text-amber-600 mb-3" />
                    <h4 className="font-semibold text-brand-charcoal mb-2">{t('audience.agency.features.premiumFees.title')}</h4>
                    <p className="text-sm text-brand-slate">{t('audience.agency.features.premiumFees.description')}</p>
                  </div>
                  <div className="p-5 rounded-xl bg-white/60 border border-amber-100">
                    <CheckCircle2 className="w-5 h-5 text-amber-600 mb-3" />
                    <h4 className="font-semibold text-brand-charcoal mb-2">{t('audience.agency.features.systematic.title')}</h4>
                    <p className="text-sm text-brand-slate">{t('audience.agency.features.systematic.description')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Progressive Learning Section */}
      <section className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-6 bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50">
              <Brain className="w-3 h-3 mr-1" />
              {t('progressiveLearning.badge')}
            </Badge>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-brand-charcoal mb-4">
              {t('progressiveLearning.title')}
            </h2>
            <p className="text-lg text-brand-slate max-w-2xl mx-auto">
              {t('progressiveLearning.subtitle')}
            </p>
          </div>

          {/* Timeline */}
          <div className="relative">
            {/* Connection line */}
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-slate-200 via-amber-200 to-slate-200 -translate-y-1/2" />

            <div className="grid md:grid-cols-3 gap-8">
              {/* Day 1 */}
              <div className="relative bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="absolute -top-4 left-6 px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-600">
                  {t('progressiveLearning.timeline.day1.label')}
                </div>
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4 mt-2">
                  <Sparkles className="w-6 h-6 text-slate-600" />
                </div>
                <h3 className="text-lg font-semibold text-brand-charcoal mb-2">{t('progressiveLearning.timeline.day1.title')}</h3>
                <p className="text-sm text-brand-slate">
                  {t('progressiveLearning.timeline.day1.description')}
                </p>
              </div>

              {/* Week 1 */}
              <div className="relative bg-gradient-to-b from-amber-50 to-white rounded-2xl border border-amber-200 p-6 shadow-sm md:-translate-y-4">
                <div className="absolute -top-4 left-6 px-3 py-1 bg-amber-100 rounded-full text-xs font-semibold text-amber-700">
                  {t('progressiveLearning.timeline.week1.label')}
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center mb-4 mt-2">
                  <Zap className="w-6 h-6 text-amber-600" />
                </div>
                <h3 className="text-lg font-semibold text-brand-charcoal mb-2">{t('progressiveLearning.timeline.week1.title')}</h3>
                <p className="text-sm text-brand-slate">
                  {t('progressiveLearning.timeline.week1.description')}
                </p>
              </div>

              {/* Ongoing */}
              <div className="relative bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="absolute -top-4 left-6 px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-600">
                  {t('progressiveLearning.timeline.ongoing.label')}
                </div>
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4 mt-2">
                  <Brain className="w-6 h-6 text-slate-600" />
                </div>
                <h3 className="text-lg font-semibold text-brand-charcoal mb-2">{t('progressiveLearning.timeline.ongoing.title')}</h3>
                <p className="text-sm text-brand-slate">
                  {t('progressiveLearning.timeline.ongoing.description')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Strategic Frameworks */}
      <section className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-brand-charcoal mb-6">
            {t('frameworks.title')}
          </h2>
          <p className="text-lg text-brand-slate mb-10">
            {t('frameworks.subtitle')}
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            {(t('frameworks.list', { returnObjects: true }) as string[]).map((framework, index) => (
              <span
                key={framework}
                className="px-4 py-2 bg-white rounded-lg border border-slate-200 text-sm font-medium text-brand-charcoal shadow-sm hover:border-amber-200 hover:shadow transition-all duration-200"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {framework}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Demo Video Section */}
      <section className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-brand-charcoal mb-4">
              {t('demo.title')}
            </h2>
            <p className="text-lg text-brand-slate max-w-2xl mx-auto">
              {t('demo.subtitle')}
            </p>
          </div>

          {/* Video Container */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-amber-200/20 via-slate-200/20 to-amber-200/20 rounded-3xl blur-2xl" />
            <div className="relative bg-white rounded-2xl border border-slate-200 p-4 shadow-lg">
              {isMobile === true && (
                <div className="relative w-full overflow-hidden rounded-xl" style={{ paddingBottom: '177.78%' }}>
                  <iframe
                    className="absolute top-0 left-0 w-full h-full"
                    src="https://www.youtube.com/embed/N-_WzrQZ8mc"
                    title="STRAŦUM Platform Demo - Mobile"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              )}
              {isMobile === false && (
                <div className="relative w-full overflow-hidden rounded-xl" style={{ paddingBottom: '56.25%' }}>
                  <iframe
                    className="absolute top-0 left-0 w-full h-full"
                    src="https://www.youtube.com/embed/HCtT_qyh_48"
                    title="STRAŦUM Platform Demo - Desktop"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 md:py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-amber-500/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-slate-600/30 to-transparent rounded-full blur-3xl" />

        <div className="relative max-w-4xl mx-auto text-center">
          <Badge className="mb-6 bg-amber-500/20 text-amber-300 border-amber-400/30 hover:bg-amber-500/20">
            <Zap className="w-3 h-3 mr-1" />
            {t('cta.badge')}
          </Badge>

          <h2 className="font-serif text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
            {t('cta.title')}
          </h2>

          <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
            {t('cta.description')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Button
              size="lg"
              variant="stratum"
              onClick={() => navigate(localizePath('/signup'))}
              className="w-full sm:w-auto text-lg px-8 py-6 shadow-lg shadow-amber-500/30"
            >
              <Rocket className="w-5 h-5 mr-2" />
              {t('cta.primaryButton')}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>

          <button
            onClick={() => navigate(localizePath('/login'))}
            className="text-sm text-slate-400 hover:text-amber-400 transition-colors flex items-center gap-2 mx-auto group"
          >
            {t('cta.secondaryText')}
            <span className="font-semibold text-slate-200 group-hover:text-amber-400 flex items-center gap-1">
              {t('cta.secondaryLink')}
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </button>

          <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{t('cta.benefits.noCreditCard')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>{t('cta.benefits.foundingMember')}</span>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
