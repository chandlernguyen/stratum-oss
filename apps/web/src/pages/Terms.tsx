import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';
import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  FileText,
  Scale,
  UserCheck,
  Brain,
  Ban,
  RefreshCw,
  Gavel,
  Mail
} from 'lucide-react';
import { CONTACT_EMAIL } from '@/config/brand';

/**
 * STRAŦUM Terms and Conditions - Redesigned January 2026
 *
 * Design Direction: "Refined Authority" - Premium legal documentation
 * with clear visual hierarchy and brand-consistent styling
 */
export function Terms() {
  const { t } = useTranslation('legal');
  usePageTitle(t('terms.pageTitle'));
  const navigate = useNavigate();
  const { localizePath } = useLocalizedPath();

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <PublicHeader />

      {/* Content Section */}
      <section className="py-10 md:py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Page Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
              <FileText className="w-6 h-6 text-slate-600" />
            </div>
            <div>
              <h1 className="font-serif text-3xl md:text-4xl font-bold text-brand-charcoal">
                {t('terms.pageTitle')}
              </h1>
              <p className="text-brand-slate text-sm">{t('terms.lastUpdated')}</p>
            </div>
          </div>

          {/* Alpha Notice */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-amber-50/50 border border-amber-200/60 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-800 text-sm mb-1">{t('terms.alphaNotice.title')}</h3>
                <p className="text-sm text-amber-700 leading-relaxed">
                  {t('terms.alphaNotice.description')}
                </p>
              </div>
            </div>
          </div>

          {/* Main Content Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 md:p-10 space-y-8">

              {/* Section 1: Introduction */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">{t('terms.sections.introduction.number')}</div>
                  <h2 className="text-xl font-semibold text-brand-charcoal">{t('terms.sections.introduction.title')}</h2>
                </div>
                <div className="ml-11 space-y-3 text-brand-slate leading-relaxed">
                  <p>
                    {t('terms.sections.introduction.welcome')}
                  </p>
                  <p>
                    {t('terms.sections.introduction.agreement')}
                  </p>
                  <p className="font-medium text-brand-charcoal">
                    {t('terms.sections.introduction.alphaStatus')}
                  </p>
                </div>
              </div>

              {/* Section 2: Alpha Program */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">{t('terms.sections.alphaProgram.number')}</div>
                  <h2 className="text-xl font-semibold text-brand-charcoal">{t('terms.sections.alphaProgram.title')}</h2>
                </div>
                <div className="ml-11 space-y-3 text-brand-slate leading-relaxed">
                  <p>{t('terms.sections.alphaProgram.intro')}</p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0" />
                      <span>{t('terms.sections.alphaProgram.items.bugs')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0" />
                      <span>{t('terms.sections.alphaProgram.items.changes')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0" />
                      <span>{t('terms.sections.alphaProgram.items.downtime')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0" />
                      <span>{t('terms.sections.alphaProgram.items.database')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0" />
                      <span>{t('terms.sections.alphaProgram.items.resets')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0" />
                      <span>{t('terms.sections.alphaProgram.items.pricing')}</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Section 3: Account Registration */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">{t('terms.sections.accountRegistration.number')}</div>
                  <h2 className="text-xl font-semibold text-brand-charcoal">{t('terms.sections.accountRegistration.title')}</h2>
                </div>
                <div className="ml-11 space-y-3 text-brand-slate leading-relaxed">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-start gap-3">
                      <UserCheck className="w-5 h-5 text-slate-500 mt-0.5" />
                      <div>
                        <p className="font-medium text-brand-charcoal mb-2">{t('terms.sections.accountRegistration.responsibilitiesTitle')}</p>
                        <ul className="space-y-1 text-sm">
                          <li>• {t('terms.sections.accountRegistration.responsibilities.accurate')}</li>
                          <li>• {t('terms.sections.accountRegistration.responsibilities.updated')}</li>
                          <li>• {t('terms.sections.accountRegistration.responsibilities.safeguard')}</li>
                          <li>• {t('terms.sections.accountRegistration.responsibilities.strongPasswords')}</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: AI-Generated Content Disclaimer */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-sm font-bold text-amber-600">{t('terms.sections.aiDisclaimer.number')}</div>
                  <h2 className="text-xl font-semibold text-brand-charcoal">{t('terms.sections.aiDisclaimer.title')}</h2>
                </div>
                <div className="ml-11 space-y-3 text-brand-slate leading-relaxed">
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                    <div className="flex items-start gap-3">
                      <Brain className="w-5 h-5 text-amber-600 mt-0.5" />
                      <div>
                        <p className="font-semibold text-amber-800 mb-2">{t('terms.sections.aiDisclaimer.responsibilityTitle')}</p>
                        <p className="text-sm text-amber-700 mb-3">
                          {t('terms.sections.aiDisclaimer.intro')}
                        </p>
                        <ul className="space-y-1 text-sm text-amber-700">
                          <li>• {t('terms.sections.aiDisclaimer.items.accuracy')}</li>
                          <li>• {t('terms.sections.aiDisclaimer.items.errors')}</li>
                          <li>• {t('terms.sections.aiDisclaimer.items.appropriateness')}</li>
                          <li>• {t('terms.sections.aiDisclaimer.items.actions')}</li>
                          <li>• {t('terms.sections.aiDisclaimer.items.decisions')}</li>
                          <li>• {t('terms.sections.aiDisclaimer.items.claims')}</li>
                        </ul>
                        <p className="mt-3 text-sm font-medium text-amber-800">
                          {t('terms.sections.aiDisclaimer.responsibility')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 5: User Responsibilities */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">{t('terms.sections.userResponsibilities.number')}</div>
                  <h2 className="text-xl font-semibold text-brand-charcoal">{t('terms.sections.userResponsibilities.title')}</h2>
                </div>
                <div className="ml-11 space-y-3 text-brand-slate leading-relaxed">
                  <p>{t('terms.sections.userResponsibilities.intro')}</p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <Ban className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <span>{t('terms.sections.userResponsibilities.items.laws')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Ban className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <span>{t('terms.sections.userResponsibilities.items.ip')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Ban className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <span>{t('terms.sections.userResponsibilities.items.unauthorized')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Ban className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <span>{t('terms.sections.userResponsibilities.items.illegal')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Ban className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <span>{t('terms.sections.userResponsibilities.items.impersonate')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Ban className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <span>{t('terms.sections.userResponsibilities.items.interfere')}</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Section 6: Intellectual Property */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">{t('terms.sections.intellectualProperty.number')}</div>
                  <h2 className="text-xl font-semibold text-brand-charcoal">{t('terms.sections.intellectualProperty.title')}</h2>
                </div>
                <div className="ml-11 space-y-4 text-brand-slate leading-relaxed">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="font-medium text-brand-charcoal mb-2">{t('terms.sections.intellectualProperty.yourContent.title')}</p>
                    <p className="text-sm">{t('terms.sections.intellectualProperty.yourContent.description')}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="font-medium text-brand-charcoal mb-2">{t('terms.sections.intellectualProperty.generatedContent.title')}</p>
                    <p className="text-sm">{t('terms.sections.intellectualProperty.generatedContent.description')}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="font-medium text-brand-charcoal mb-2">{t('terms.sections.intellectualProperty.ourIp.title')}</p>
                    <p className="text-sm">{t('terms.sections.intellectualProperty.ourIp.description')}</p>
                  </div>
                </div>
              </div>

              {/* Section 7: No Refund Policy */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-sm font-bold text-red-600">{t('terms.sections.noRefund.number')}</div>
                  <h2 className="text-xl font-semibold text-brand-charcoal">{t('terms.sections.noRefund.title')}</h2>
                </div>
                <div className="ml-11">
                  <div className="p-4 rounded-xl bg-gradient-to-r from-red-50 to-red-50/50 border border-red-200/60">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                        <Ban className="w-4 h-4 text-red-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-red-800 mb-2">{t('terms.sections.noRefund.headline')}</h3>
                        <p className="text-sm text-red-700 mb-3">{t('terms.sections.noRefund.intro')}</p>
                        <ul className="space-y-1 text-sm text-red-700">
                          <li>• {t('terms.sections.noRefund.items.noRefund')}</li>
                          <li>• {t('terms.sections.noRefund.items.regardless')}</li>
                          <li>• {t('terms.sections.noRefund.items.evenTechnical')}</li>
                        </ul>
                        <p className="mt-3 text-sm font-medium text-red-800">
                          {t('terms.sections.noRefund.alphaNote')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 8: Data Collection and Privacy */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">{t('terms.sections.dataPrivacy.number')}</div>
                  <h2 className="text-xl font-semibold text-brand-charcoal">{t('terms.sections.dataPrivacy.title')}</h2>
                </div>
                <div className="ml-11 space-y-3 text-brand-slate leading-relaxed">
                  <p>
                    {t('terms.sections.dataPrivacy.description')}{' '}
                    <button
                      onClick={() => navigate(localizePath('/privacy'))}
                      className="text-amber-600 hover:text-amber-700 font-medium hover:underline"
                    >
                      {t('terms.sections.dataPrivacy.privacyLink')}
                    </button>
                    . {t('terms.sections.dataPrivacy.consent')}
                  </p>
                  <p className="font-medium text-brand-charcoal">
                    {t('terms.sections.dataPrivacy.feedbackNote')}
                  </p>
                </div>
              </div>

              {/* Section 9: Limitation of Liability */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">{t('terms.sections.limitationLiability.number')}</div>
                  <h2 className="text-xl font-semibold text-brand-charcoal">{t('terms.sections.limitationLiability.title')}</h2>
                </div>
                <div className="ml-11 space-y-3 text-brand-slate leading-relaxed">
                  <p>{t('terms.sections.limitationLiability.intro')}</p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <Scale className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <span>{t('terms.sections.limitationLiability.items.losses')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Scale className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <span>{t('terms.sections.limitationLiability.items.inability')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Scale className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <span>{t('terms.sections.limitationLiability.items.generatedContent')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Scale className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <span>{t('terms.sections.limitationLiability.items.unauthorized')}</span>
                    </li>
                  </ul>
                  <p className="font-medium text-brand-charcoal pt-2">
                    {t('terms.sections.limitationLiability.alphaNote')}
                  </p>
                </div>
              </div>

              {/* Section 10: Disclaimer of Warranties */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">{t('terms.sections.disclaimerWarranties.number')}</div>
                  <h2 className="text-xl font-semibold text-brand-charcoal">{t('terms.sections.disclaimerWarranties.title')}</h2>
                </div>
                <div className="ml-11 space-y-3 text-brand-slate leading-relaxed">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="font-medium text-brand-charcoal mb-2">
                      {t('terms.sections.disclaimerWarranties.asIs')}
                    </p>
                    <p className="text-sm">
                      {t('terms.sections.disclaimerWarranties.disclaim')}
                    </p>
                    <p className="text-sm mt-2 font-medium text-brand-charcoal">
                      {t('terms.sections.disclaimerWarranties.noWarranty')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 11: Termination */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">{t('terms.sections.termination.number')}</div>
                  <h2 className="text-xl font-semibold text-brand-charcoal">{t('terms.sections.termination.title')}</h2>
                </div>
                <div className="ml-11 space-y-3 text-brand-slate leading-relaxed">
                  <p>
                    {t('terms.sections.termination.weTerminate')}
                  </p>
                  <p>
                    {t('terms.sections.termination.uponTermination')}
                  </p>
                </div>
              </div>

              {/* Section 12: Changes to Terms */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">{t('terms.sections.changesToTerms.number')}</div>
                  <h2 className="text-xl font-semibold text-brand-charcoal">{t('terms.sections.changesToTerms.title')}</h2>
                </div>
                <div className="ml-11 space-y-3 text-brand-slate leading-relaxed">
                  <div className="flex items-start gap-3">
                    <RefreshCw className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p>{t('terms.sections.changesToTerms.description')}</p>
                      <p className="mt-2 font-medium text-brand-charcoal">
                        {t('terms.sections.changesToTerms.alphaNote')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 13: Governing Law */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">{t('terms.sections.governingLaw.number')}</div>
                  <h2 className="text-xl font-semibold text-brand-charcoal">{t('terms.sections.governingLaw.title')}</h2>
                </div>
                <div className="ml-11 space-y-3 text-brand-slate leading-relaxed">
                  <div className="flex items-start gap-3">
                    <Gavel className="w-5 h-5 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p>{t('terms.sections.governingLaw.description')}</p>
                      <p className="mt-2">
                        <span className="font-medium text-brand-charcoal">{t('terms.sections.governingLaw.disputeTitle')}</span> {t('terms.sections.governingLaw.dispute')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 14: Contact Us */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">{t('terms.sections.contactUs.number')}</div>
                  <h2 className="text-xl font-semibold text-brand-charcoal">{t('terms.sections.contactUs.title')}</h2>
                </div>
                <div className="ml-11 text-brand-slate leading-relaxed">
                  <p>
                    {t('terms.sections.contactUs.description')}{' '}
                    <a href={`mailto:${CONTACT_EMAIL}`} className="text-amber-600 hover:text-amber-700 font-medium hover:underline inline-flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {CONTACT_EMAIL}
                    </a>
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Navigation */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 pt-8">
            <Button
              variant="ghost"
              onClick={() => navigate(localizePath('/'))}
              className="text-brand-slate hover:text-brand-charcoal"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('terms.navigation.returnHome')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate(localizePath('/privacy'))}
              className="text-amber-600 hover:text-amber-700"
            >
              {t('terms.navigation.privacyPolicy')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
