import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BRAND_IDENTITIES, type BrandOption } from '@/config/brandIdentity';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Target, Users, LineChart, Brain, Layers } from 'lucide-react';
import { CONTACT_EMAIL } from '@/config/brand';

type ViewMode = 'single' | 'split' | 'stratum-four-way';

export function BrandComparisonPage() {
  const { t } = useTranslation('brand');
  const [activeBrand, setActiveBrand] = useState<BrandOption>('cortex');
  const [viewMode, setViewMode] = useState<ViewMode>('single');

  // Four-way STRATUM comparison
  if (viewMode === 'stratum-four-way') {
    return <StratumFourWayComparison setViewMode={setViewMode} />;
  }

  // Split view
  if (viewMode === 'split') {
    return <SplitViewComparison setViewMode={setViewMode} />;
  }

  const brand = BRAND_IDENTITIES[activeBrand];

  return (
    <div className="min-h-screen" style={{ background: brand.colors.background }}>
      {/* Brand Toggle Controls */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-gray-900">{t('comparison.pageTitle')}</h2>
              <div className="flex gap-2">
                <Button
                  variant={activeBrand === 'cortex' ? 'default' : 'outline'}
                  onClick={() => setActiveBrand('cortex')}
                  className="font-semibold"
                >
                  CØRTEX
                </Button>
                <Button
                  variant={activeBrand.startsWith('stratum') ? 'default' : 'outline'}
                  onClick={() => setActiveBrand('stratum')}
                  className="font-semibold"
                >
                  STRATUM
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setViewMode('stratum-four-way')}
                className="text-sm"
              >
                {t('comparison.compareFourOptions')}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setViewMode('split')}
                className="text-sm"
              >
                {t('comparison.cortexVsStratum')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <section
        className="relative overflow-hidden py-24"
        style={{ background: brand.gradients.hero }}
      >
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Brand Logo/Symbol */}
            <div className="mb-8">
              {activeBrand === 'cortex' ? (
                <div className="inline-block">
                  <div className="text-7xl font-bold text-white mb-2">
                    C{brand.icon.symbol}RTEX
                  </div>
                  <div className="flex items-center justify-center gap-3 text-white/90">
                    <Brain className="w-6 h-6" />
                    <div className="h-px w-12 bg-white/50" />
                    <span className="text-sm font-medium tracking-wide">
                      {t('brands.cortex.subtitle')}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="inline-block">
                  <div className="text-7xl font-bold text-white mb-2">
                    {brand.displayName}
                  </div>
                  <div className="flex items-center justify-center gap-3 text-white/90">
                    <Layers className="w-6 h-6" />
                    <div className="h-px w-12 bg-white/50" />
                    <span className="text-sm font-medium tracking-wide">
                      {t('brands.stratum.subtitle')}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Tagline */}
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              {brand.tagline}
            </h1>

            {/* Description */}
            <p className="text-xl text-white/90 mb-10 max-w-3xl mx-auto leading-relaxed">
              {brand.description}
            </p>

            {/* CTAs */}
            <div className="flex gap-4 justify-center">
              <Button
                size="lg"
                style={{ background: brand.gradients.button }}
                className="text-white font-semibold px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all"
              >
                {t('cta.startFreeTrial')}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-white/10 text-white border-white/30 hover:bg-white/20 backdrop-blur-sm px-8 py-6 text-lg font-semibold"
              >
                {t('cta.watchDemo')}
              </Button>
            </div>

            {/* Subtitle */}
            <p className="mt-8 text-white/80 text-sm font-medium tracking-wide">
              {t('hero.subtitle')}
            </p>
          </div>
        </div>

        {/* Background Pattern */}
        {activeBrand === 'cortex' && (
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <pattern id="neural" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                <circle cx="50" cy="50" r="2" fill="white" />
                <circle cx="20" cy="30" r="2" fill="white" />
                <circle cx="80" cy="30" r="2" fill="white" />
                <circle cx="20" cy="70" r="2" fill="white" />
                <circle cx="80" cy="70" r="2" fill="white" />
                <line x1="50" y1="50" x2="20" y2="30" stroke="white" strokeWidth="1" />
                <line x1="50" y1="50" x2="80" y2="30" stroke="white" strokeWidth="1" />
                <line x1="50" y1="50" x2="20" y2="70" stroke="white" strokeWidth="1" />
                <line x1="50" y1="50" x2="80" y2="70" stroke="white" strokeWidth="1" />
              </pattern>
              <rect width="100%" height="100%" fill="url(#neural)" />
            </svg>
          </div>
        )}
      </section>

      {/* Value Propositions */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card
              className="p-8 border-2 shadow-lg hover:shadow-xl transition-shadow"
              style={{ borderColor: brand.colors.primary }}
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
                style={{ background: brand.gradients.card }}
              >
                <Target className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3" style={{ color: brand.colors.text }}>
                {t('valuePropositions.strategicIntelligence.title')}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t('valuePropositions.strategicIntelligence.description')}
              </p>
            </Card>

            <Card
              className="p-8 border-2 shadow-lg hover:shadow-xl transition-shadow"
              style={{ borderColor: brand.colors.primary }}
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
                style={{ background: brand.gradients.card }}
              >
                <Users className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3" style={{ color: brand.colors.text }}>
                {t('valuePropositions.customerInsights.title')}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t('valuePropositions.customerInsights.description')}
              </p>
            </Card>

            <Card
              className="p-8 border-2 shadow-lg hover:shadow-xl transition-shadow"
              style={{ borderColor: brand.colors.primary }}
            >
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-4"
                style={{ background: brand.gradients.card }}
              >
                <LineChart className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3" style={{ color: brand.colors.text }}>
                {t('valuePropositions.roiTracking.title')}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {t('valuePropositions.roiTracking.description')}
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Feature Showcase */}
      <section className="py-20 bg-white/50">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4" style={{ color: brand.colors.text }}>
                {activeBrand === 'cortex'
                  ? t('features.sectionTitle.cortex')
                  : t('features.sectionTitle.stratum')}
              </h2>
              <p className="text-xl text-gray-600">
                {activeBrand === 'cortex'
                  ? t('features.sectionSubtitle.cortex')
                  : t('features.sectionSubtitle.stratum')}
              </p>
            </div>

            <div className="grid gap-8">
              <FeatureCard
                title={t('features.aiAgents.title')}
                description={t('features.aiAgents.description')}
                color={brand.colors.primary}
              />
              <FeatureCard
                title={t('features.continuousLearning.title')}
                description={t('features.continuousLearning.description')}
                color={brand.colors.secondary}
              />
              <FeatureCard
                title={t('features.zeroExecutionRisk.title')}
                description={t('features.zeroExecutionRisk.description')}
                color={brand.colors.accent}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12" style={{ borderColor: brand.colors.border }}>
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <div className="text-2xl font-bold mb-2" style={{ color: brand.colors.primary }}>
                {brand.displayName}
              </div>
              <p className="text-sm text-gray-500">
                {t('footer.copyright', { brandName: brand.displayName })}
              </p>
            </div>
            <div className="flex gap-6 text-sm">
              <a href="#" className="text-gray-600 hover:text-gray-900">
                {t('footer.privacyPolicy')}
              </a>
              <a href="#" className="text-gray-600 hover:text-gray-900">
                {t('footer.termsConditions')}
              </a>
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-gray-600 hover:text-gray-900">
                {t('footer.contact')}
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Four-Way STRATUM Comparison Component
function StratumFourWayComparison({ setViewMode }: { setViewMode: (mode: ViewMode) => void }) {
  const { t } = useTranslation('brand');
  const stratumOptions: BrandOption[] = ['stratum', 'stratum-t', 'stratum-a', 'stratum-both'];

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {t('comparison.fourWayTitle')}
            </h2>
            <Button
              variant="ghost"
              onClick={() => setViewMode('single')}
              className="text-sm"
            >
              {t('comparison.backToSingleView')}
            </Button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {t('comparison.fourWayDescription')}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {stratumOptions.map((option) => (
            <StratumVariationCard key={option} brandOption={option} />
          ))}
        </div>

        {/* Comparison Table */}
        <div className="mt-12 max-w-5xl mx-auto bg-white rounded-lg shadow-lg p-8">
          <h3 className="text-2xl font-bold mb-6 text-gray-900">{t('detailedComparison.title')}</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-4 px-4 font-semibold text-gray-700">{t('detailedComparison.criteria.recommendation')}</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-700">STRαTUM</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-700">STRAŦUM</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-700">STRĀTUM</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-700">STRĀŦUM</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-4 px-4 text-gray-700">{t('detailedComparison.criteria.visualDistinction')}</td>
                  <td className="py-4 px-4 text-center">⭐⭐⭐</td>
                  <td className="py-4 px-4 text-center">⭐⭐⭐⭐⭐</td>
                  <td className="py-4 px-4 text-center">⭐⭐⭐⭐</td>
                  <td className="py-4 px-4 text-center">⭐⭐⭐⭐</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-4 px-4 text-gray-700">{t('detailedComparison.criteria.matchesDialogueDna')}</td>
                  <td className="py-4 px-4 text-center">❌</td>
                  <td className="py-4 px-4 text-center">✅</td>
                  <td className="py-4 px-4 text-center">⚠️</td>
                  <td className="py-4 px-4 text-center">✅</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-4 px-4 text-gray-700">{t('detailedComparison.criteria.easyToType')}</td>
                  <td className="py-4 px-4 text-center">⭐⭐</td>
                  <td className="py-4 px-4 text-center">⭐⭐⭐⭐</td>
                  <td className="py-4 px-4 text-center">⭐⭐⭐</td>
                  <td className="py-4 px-4 text-center">⭐⭐</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-4 px-4 text-gray-700">{t('detailedComparison.criteria.conceptualFit')}</td>
                  <td className="py-4 px-4 text-center text-sm">{t('detailedComparison.conceptualFitValues.greekAlpha')}</td>
                  <td className="py-4 px-4 text-center text-sm">{t('detailedComparison.conceptualFitValues.cuttingLayers')}</td>
                  <td className="py-4 px-4 text-center text-sm">{t('detailedComparison.conceptualFitValues.topLayer')}</td>
                  <td className="py-4 px-4 text-center text-sm">{t('detailedComparison.conceptualFitValues.multiLayer')}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-4 px-4 text-gray-700">{t('detailedComparison.criteria.professionalFeel')}</td>
                  <td className="py-4 px-4 text-center">⭐⭐⭐⭐⭐</td>
                  <td className="py-4 px-4 text-center">⭐⭐⭐⭐⭐</td>
                  <td className="py-4 px-4 text-center">⭐⭐⭐⭐⭐</td>
                  <td className="py-4 px-4 text-center">⭐⭐⭐⭐</td>
                </tr>
                <tr className="bg-gray-50 font-semibold">
                  <td className="py-4 px-4 text-gray-900">{t('detailedComparison.criteria.recommendation')}</td>
                  <td className="py-4 px-4 text-center text-gray-600">{t('detailedComparison.recommendations.good')}</td>
                  <td className="py-4 px-4 text-center text-green-600">★ {t('detailedComparison.recommendations.best')} ★</td>
                  <td className="py-4 px-4 text-center text-gray-600">{t('detailedComparison.recommendations.great')}</td>
                  <td className="py-4 px-4 text-center text-gray-600">{t('detailedComparison.recommendations.bold')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-8 p-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <h4 className="font-bold text-amber-900 dark:text-amber-100 mb-2 flex items-center gap-2">
              <span className="text-xl">💡</span> {t('detailedComparison.recommendedBrand.title')}
            </h4>
            <p className="text-amber-800 dark:text-amber-200 text-sm leading-relaxed">
              {t('detailedComparison.recommendedBrand.description')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Stratum Variation Card Component
function StratumVariationCard({ brandOption }: { brandOption: BrandOption }) {
  const { t } = useTranslation('brand');
  const brand = BRAND_IDENTITIES[brandOption];

  return (
    <Card className="overflow-hidden shadow-lg hover:shadow-2xl transition-shadow">
      {/* Hero Section */}
      <div
        className="p-12 text-center"
        style={{ background: brand.gradients.hero }}
      >
        <div className="text-6xl font-bold text-white mb-3">
          {brand.displayName}
        </div>
        <div className="text-lg text-white/90 mb-4">{brand.tagline}</div>
        <Button
          size="sm"
          style={{ background: brand.gradients.button }}
          className="text-white font-semibold"
        >
          {t('cta.selectThisOption')}
        </Button>
      </div>

      {/* Details Section */}
      <div className="p-6 space-y-6 bg-white">
        <div>
          <h3 className="font-bold text-lg mb-2" style={{ color: brand.colors.text }}>
            {t('variationCard.specialCharacter')}
          </h3>
          <div className="text-7xl font-bold mb-2" style={{ color: brand.colors.primary }}>
            {brand.icon.symbol}
          </div>
          <p className="text-sm text-gray-600">{brand.icon.description}</p>
        </div>

        <div>
          <h3 className="font-bold text-lg mb-2" style={{ color: brand.colors.text }}>
            {t('variationCard.colorPalette')}
          </h3>
          <div className="flex gap-2">
            <div
              className="w-16 h-16 rounded-lg border shadow-sm flex items-center justify-center text-xs text-white font-medium"
              style={{ backgroundColor: brand.colors.primary }}
              title={t('variationCard.colors.primary')}
            >
              {t('variationCard.colors.primary')}
            </div>
            <div
              className="w-16 h-16 rounded-lg border shadow-sm flex items-center justify-center text-xs text-white font-medium"
              style={{ backgroundColor: brand.colors.secondary }}
              title={t('variationCard.colors.dark')}
            >
              {t('variationCard.colors.dark')}
            </div>
            <div
              className="w-16 h-16 rounded-lg border shadow-sm flex items-center justify-center text-xs text-white font-medium"
              style={{ backgroundColor: brand.colors.accent }}
              title={t('variationCard.colors.gold')}
            >
              {t('variationCard.colors.gold')}
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-lg mb-2" style={{ color: brand.colors.text }}>
            {t('variationCard.gradientPreview')}
          </h3>
          <div
            className="h-16 rounded-lg shadow-sm"
            style={{ background: brand.gradients.hero }}
          />
        </div>

        <div>
          <h3 className="font-bold text-lg mb-2" style={{ color: brand.colors.text }}>
            {t('variationCard.inContext')}
          </h3>
          <div className="space-y-2 text-sm">
            <p className="text-gray-700">
              <strong>{t('variationCard.url')}:</strong> {brand.displayName.toLowerCase()}.example.com
            </p>
            <p className="text-gray-700">
              <strong>{t('variationCard.tagline')}:</strong> {brand.tagline}
            </p>
            <p className="text-gray-700">
              <strong>{t('variationCard.positioning')}:</strong> {t('hero.subtitle')}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

// Split View Component
function SplitViewComparison({ setViewMode }: { setViewMode: (mode: ViewMode) => void }) {
  const { t } = useTranslation('brand');
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">{t('comparison.cortexVsStratum')}</h2>
            <Button
              variant="ghost"
              onClick={() => setViewMode('single')}
              className="text-sm"
            >
              {t('comparison.singleView')}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px bg-gray-300">
        {/* CØRTEX Side */}
        <div className="bg-white">
          <BrandPreview brand="cortex" />
        </div>

        {/* STRATUM Side */}
        <div className="bg-white">
          <BrandPreview brand="stratum" />
        </div>
      </div>
    </div>
  );
}

// Brand Preview Component for Split View
function BrandPreview({ brand: brandName }: { brand: BrandOption }) {
  const { t } = useTranslation('brand');
  const brand = BRAND_IDENTITIES[brandName];

  return (
    <div className="h-full">
      <div
        className="p-12 text-center"
        style={{ background: brand.gradients.hero }}
      >
        <div className="text-5xl font-bold text-white mb-3">
          {brand.displayName}
        </div>
        <div className="text-xl text-white/90 mb-4">{brand.tagline}</div>
        <Button
          size="sm"
          style={{ background: brand.gradients.button }}
          className="text-white font-semibold"
        >
          {t('cta.learnMore')}
        </Button>
      </div>

      <div className="p-8 space-y-6">
        <div>
          <h3 className="font-bold text-lg mb-2" style={{ color: brand.colors.text }}>
            {t('variationCard.colorPalette')}
          </h3>
          <div className="flex gap-2">
            <div
              className="w-16 h-16 rounded-lg border shadow-sm"
              style={{ backgroundColor: brand.colors.primary }}
              title={t('variationCard.colors.primary')}
            />
            <div
              className="w-16 h-16 rounded-lg border shadow-sm"
              style={{ backgroundColor: brand.colors.secondary }}
              title={t('variationCard.colors.dark')}
            />
            <div
              className="w-16 h-16 rounded-lg border shadow-sm"
              style={{ backgroundColor: brand.colors.accent }}
              title={t('variationCard.colors.gold')}
            />
          </div>
        </div>

        <div>
          <h3 className="font-bold text-lg mb-2" style={{ color: brand.colors.text }}>
            {t('splitView.typography')}
          </h3>
          <div className="space-y-2">
            <div className="text-2xl font-bold" style={{ color: brand.colors.text }}>
              {t('splitView.headingStyle')}
            </div>
            <p className="text-gray-600">{t('splitView.bodyText')}</p>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-lg mb-2" style={{ color: brand.colors.text }}>
            {t('splitView.iconSymbol')}
          </h3>
          <div className="text-6xl font-bold" style={{ color: brand.colors.primary }}>
            {brand.icon.symbol}
          </div>
          <p className="text-sm text-gray-600 mt-2">{brand.icon.description}</p>
        </div>
      </div>
    </div>
  );
}

// Feature Card Component
function FeatureCard({
  title,
  description,
  color,
}: {
  title: string;
  description: string;
  color: string;
}) {
  return (
    <Card className="p-6 border-l-4 shadow-sm hover:shadow-md transition-shadow" style={{ borderLeftColor: color }}>
      <h3 className="text-xl font-bold mb-2" style={{ color }}>
        {title}
      </h3>
      <p className="text-gray-600">{description}</p>
    </Card>
  );
}
