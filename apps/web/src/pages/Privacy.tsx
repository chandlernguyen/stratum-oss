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
  Shield,
  Database,
  Lock,
  Eye,
  Clock,
  Server,
  Brain,
  FileText,
  Mail
} from 'lucide-react';
import { CONTACT_EMAIL } from '@/config/brand';

/**
 * STRAŦUM Privacy Policy - Redesigned January 2026
 *
 * Design Direction: "Refined Authority" - Premium legal documentation
 * with clear visual hierarchy and brand-consistent styling
 */
export function Privacy() {
  const { t } = useTranslation('legal');
  usePageTitle(t('privacy.pageTitle'));
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
              <Shield className="w-6 h-6 text-slate-600" />
            </div>
            <div>
              <h1 className="font-serif text-3xl md:text-4xl font-bold text-brand-charcoal">
                {t('privacy.pageTitle')}
              </h1>
              <p className="text-brand-slate text-sm">{t('privacy.lastUpdated')}</p>
            </div>
          </div>

          {/* Alpha Notice */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-amber-50/50 border border-amber-200/60 mb-6">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-800 text-sm mb-1">{t('privacy.alphaNotice.title')}</h3>
                <p className="text-sm text-amber-700 leading-relaxed">
                  {t('privacy.alphaNotice.description')}
                </p>
              </div>
            </div>
          </div>

          {/* Main Content Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 md:p-10 space-y-8">

              {/* Section 1: Acceptance and Scope */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">{t('privacy.sections.acceptance.number')}</div>
                  <h2 className="text-xl font-semibold text-brand-charcoal">{t('privacy.sections.acceptance.title')}</h2>
                </div>
                <div className="ml-11 space-y-3 text-brand-slate leading-relaxed">
                  <p>{t('privacy.sections.acceptance.intro')}</p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0" />
                      <span>{t('privacy.sections.acceptance.items.experimental')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0" />
                      <span>{t('privacy.sections.acceptance.items.dataChange')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0" />
                      <span>{t('privacy.sections.acceptance.items.smallTeam')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0" />
                      <span>{t('privacy.sections.acceptance.items.ownRisk')}</span>
                    </li>
                  </ul>
                  <p className="pt-2">
                    {t('privacy.sections.acceptance.seeTerms')}{' '}
                    <button
                      onClick={() => navigate(localizePath('/terms'))}
                      className="text-amber-600 hover:text-amber-700 font-medium hover:underline"
                    >
                      {t('privacy.sections.acceptance.termsLink')}
                    </button>
                    .
                  </p>
                </div>
              </div>

              {/* Section 2: Information We May Collect */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">{t('privacy.sections.informationCollect.number')}</div>
                  <h2 className="text-xl font-semibold text-brand-charcoal">{t('privacy.sections.informationCollect.title')}</h2>
                </div>
                <div className="ml-11 space-y-3 text-brand-slate leading-relaxed">
                  <p>{t('privacy.sections.informationCollect.intro')}</p>
                  <div className="grid md:grid-cols-2 gap-4 pt-2">
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <Eye className="w-5 h-5 text-slate-500 mb-2" />
                      <h4 className="font-medium text-brand-charcoal text-sm mb-1">{t('privacy.sections.informationCollect.accountInfo.title')}</h4>
                      <p className="text-xs text-brand-slate">{t('privacy.sections.informationCollect.accountInfo.description')}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <FileText className="w-5 h-5 text-slate-500 mb-2" />
                      <h4 className="font-medium text-brand-charcoal text-sm mb-1">{t('privacy.sections.informationCollect.businessContext.title')}</h4>
                      <p className="text-xs text-brand-slate">{t('privacy.sections.informationCollect.businessContext.description')}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <Brain className="w-5 h-5 text-slate-500 mb-2" />
                      <h4 className="font-medium text-brand-charcoal text-sm mb-1">{t('privacy.sections.informationCollect.contentCreated.title')}</h4>
                      <p className="text-xs text-brand-slate">{t('privacy.sections.informationCollect.contentCreated.description')}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <Server className="w-5 h-5 text-slate-500 mb-2" />
                      <h4 className="font-medium text-brand-charcoal text-sm mb-1">{t('privacy.sections.informationCollect.technicalData.title')}</h4>
                      <p className="text-xs text-brand-slate">{t('privacy.sections.informationCollect.technicalData.description')}</p>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-brand-charcoal pt-2">
                    {t('privacy.sections.informationCollect.note')}
                  </p>
                </div>
              </div>

              {/* Section 3: How We Use Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">{t('privacy.sections.howWeUse.number')}</div>
                  <h2 className="text-xl font-semibold text-brand-charcoal">{t('privacy.sections.howWeUse.title')}</h2>
                </div>
                <div className="ml-11 space-y-3 text-brand-slate leading-relaxed">
                  <p>{t('privacy.sections.howWeUse.intro')}</p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0" />
                      <span>{t('privacy.sections.howWeUse.items.provideServices')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0" />
                      <span>{t('privacy.sections.howWeUse.items.generateIntelligence')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0" />
                      <span>{t('privacy.sections.howWeUse.items.fixBugs')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0" />
                      <span>{t('privacy.sections.howWeUse.items.understandUsage')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0" />
                      <span>{t('privacy.sections.howWeUse.items.communicate')}</span>
                    </li>
                  </ul>
                  <p className="text-sm text-brand-slate pt-2 italic">
                    {t('privacy.sections.howWeUse.note')}
                  </p>
                </div>
              </div>

              {/* Section 4: Third-Party Services */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">{t('privacy.sections.thirdParty.number')}</div>
                  <h2 className="text-xl font-semibold text-brand-charcoal">{t('privacy.sections.thirdParty.title')}</h2>
                </div>
                <div className="ml-11 space-y-3 text-brand-slate leading-relaxed">
                  <p>{t('privacy.sections.thirdParty.intro')}</p>
                  <div className="grid gap-3 pt-2">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="w-8 h-8 rounded bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700">S</div>
                      <div>
                        <span className="font-medium text-brand-charcoal">{t('privacy.sections.thirdParty.services.supabase.name')}</span>
                        <span className="text-sm text-brand-slate ml-2">{t('privacy.sections.thirdParty.services.supabase.description')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">G</div>
                      <div>
                        <span className="font-medium text-brand-charcoal">{t('privacy.sections.thirdParty.services.googleCloud.name')}</span>
                        <span className="text-sm text-brand-slate ml-2">{t('privacy.sections.thirdParty.services.googleCloud.description')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-xs font-bold text-white">V</div>
                      <div>
                        <span className="font-medium text-brand-charcoal">{t('privacy.sections.thirdParty.services.vercel.name')}</span>
                        <span className="text-sm text-brand-slate ml-2">{t('privacy.sections.thirdParty.services.vercel.description')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="w-8 h-8 rounded bg-purple-100 flex items-center justify-center text-xs font-bold text-purple-700">AI</div>
                      <div>
                        <span className="font-medium text-brand-charcoal">{t('privacy.sections.thirdParty.services.googleAi.name')}</span>
                        <span className="text-sm text-brand-slate ml-2">{t('privacy.sections.thirdParty.services.googleAi.description')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="w-8 h-8 rounded bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700">S</div>
                      <div>
                        <span className="font-medium text-brand-charcoal">{t('privacy.sections.thirdParty.services.stripe.name')}</span>
                        <span className="text-sm text-brand-slate ml-2">{t('privacy.sections.thirdParty.services.stripe.description')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="w-8 h-8 rounded bg-orange-100 flex items-center justify-center text-xs font-bold text-orange-700">C</div>
                      <div>
                        <span className="font-medium text-brand-charcoal">{t('privacy.sections.thirdParty.services.cloudflare.name')}</span>
                        <span className="text-sm text-brand-slate ml-2">{t('privacy.sections.thirdParty.services.cloudflare.description')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="w-8 h-8 rounded bg-teal-100 flex items-center justify-center text-xs font-bold text-teal-700">R</div>
                      <div>
                        <span className="font-medium text-brand-charcoal">{t('privacy.sections.thirdParty.services.resend.name')}</span>
                        <span className="text-sm text-brand-slate ml-2">{t('privacy.sections.thirdParty.services.resend.description')}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-red-600 pt-2">
                    {t('privacy.sections.thirdParty.disclaimer')}
                  </p>
                </div>
              </div>

              {/* Section 5: AI and Data Usage */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">{t('privacy.sections.aiUsage.number')}</div>
                  <h2 className="text-xl font-semibold text-brand-charcoal">{t('privacy.sections.aiUsage.title')}</h2>
                </div>
                <div className="ml-11 space-y-3 text-brand-slate leading-relaxed">
                  <p className="font-medium text-brand-charcoal">{t('privacy.sections.aiUsage.subtitle')}</p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0" />
                      <span>{t('privacy.sections.aiUsage.items.sentToGoogle')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0" />
                      <span>{t('privacy.sections.aiUsage.items.noTraining')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0" />
                      <span>{t('privacy.sections.aiUsage.items.googlePolicies')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0" />
                      <span>{t('privacy.sections.aiUsage.items.stored')}</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Section 6: Data Isolation */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">{t('privacy.sections.dataIsolation.number')}</div>
                  <h2 className="text-xl font-semibold text-brand-charcoal">{t('privacy.sections.dataIsolation.title')}</h2>
                </div>
                <div className="ml-11 space-y-3 text-brand-slate leading-relaxed">
                  <p>{t('privacy.sections.dataIsolation.intro')}</p>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3">
                    <div className="flex items-center gap-3">
                      <Database className="w-5 h-5 text-slate-500" />
                      <span className="font-medium text-brand-charcoal">{t('privacy.sections.dataIsolation.items.isolated')}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Lock className="w-5 h-5 text-slate-500" />
                      <span className="font-medium text-brand-charcoal">{t('privacy.sections.dataIsolation.items.agencySeparation')}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-slate-500" />
                      <span className="font-medium text-brand-charcoal">{t('privacy.sections.dataIsolation.items.rls')}</span>
                    </div>
                  </div>
                  <p className="text-sm text-brand-slate italic">
                    {t('privacy.sections.dataIsolation.note')}
                  </p>
                </div>
              </div>

              {/* Section 7: Limited Security Guarantees */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-sm font-bold text-red-600">{t('privacy.sections.limitedSecurity.number')}</div>
                  <h2 className="text-xl font-semibold text-brand-charcoal">{t('privacy.sections.limitedSecurity.title')}</h2>
                </div>
                <div className="ml-11">
                  <div className="p-5 rounded-xl bg-gradient-to-r from-red-50 to-red-50/50 border border-red-200/60">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                        <Shield className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-red-800 mb-2">{t('privacy.sections.limitedSecurity.disclaimerTitle')}</h3>
                        <p className="text-sm text-red-700 mb-3">{t('privacy.sections.limitedSecurity.intro')}</p>
                        <ul className="space-y-1.5 text-sm text-red-700">
                          <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                            <span>{t('privacy.sections.limitedSecurity.items.completeSecurity')}</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                            <span>{t('privacy.sections.limitedSecurity.items.breachProtection')}</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                            <span>{t('privacy.sections.limitedSecurity.items.dataBackup')}</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                            <span>{t('privacy.sections.limitedSecurity.items.availability')}</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                            <span>{t('privacy.sections.limitedSecurity.items.migrationProtection')}</span>
                          </li>
                        </ul>
                        <p className="mt-4 text-sm font-semibold text-red-800">
                          {t('privacy.sections.limitedSecurity.warning')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 8: Your Rights */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">{t('privacy.sections.yourRights.number')}</div>
                  <h2 className="text-xl font-semibold text-brand-charcoal">{t('privacy.sections.yourRights.title')}</h2>
                </div>
                <div className="ml-11 space-y-3 text-brand-slate leading-relaxed">
                  <p>{t('privacy.sections.yourRights.tryToHelp')}</p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0" />
                      <span>{t('privacy.sections.yourRights.helpItems.deleteAccount')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0" />
                      <span>{t('privacy.sections.yourRights.helpItems.updateInfo')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0" />
                      <span>{t('privacy.sections.yourRights.helpItems.accessData')}</span>
                    </li>
                  </ul>
                  <p className="font-medium text-brand-charcoal pt-2">{t('privacy.sections.yourRights.cannotGuarantee')}</p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0" />
                      <span>{t('privacy.sections.yourRights.limitedItems.export')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0" />
                      <span>{t('privacy.sections.yourRights.limitedItems.deletion')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0" />
                      <span>{t('privacy.sections.yourRights.limitedItems.timeliness')}</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Section 9: Data Retention */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">{t('privacy.sections.dataRetention.number')}</div>
                  <h2 className="text-xl font-semibold text-brand-charcoal">{t('privacy.sections.dataRetention.title')}</h2>
                </div>
                <div className="ml-11 space-y-3 text-brand-slate leading-relaxed">
                  <p>{t('privacy.sections.dataRetention.intro')}</p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <Clock className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <span>{t('privacy.sections.dataRetention.items.active')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Clock className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <span>{t('privacy.sections.dataRetention.items.migrations')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Clock className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <span>{t('privacy.sections.dataRetention.items.backups')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Clock className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                      <span>{t('privacy.sections.dataRetention.items.noGuarantee')}</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Section 10: No Warranty or Liability */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">{t('privacy.sections.noWarranty.number')}</div>
                  <h2 className="text-xl font-semibold text-brand-charcoal">{t('privacy.sections.noWarranty.title')}</h2>
                </div>
                <div className="ml-11 space-y-3 text-brand-slate leading-relaxed">
                  <p>
                    {t('privacy.sections.noWarranty.intro')}{' '}
                    <button
                      onClick={() => navigate(localizePath('/terms'))}
                      className="text-amber-600 hover:text-amber-700 font-medium hover:underline"
                    >
                      {t('privacy.sections.noWarranty.termsLink')}
                    </button>
                    :
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0" />
                      <span>{t('privacy.sections.noWarranty.items.asIs')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0" />
                      <span>{t('privacy.sections.noWarranty.items.notLiable')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0" />
                      <span>{t('privacy.sections.noWarranty.items.noAvailability')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0" />
                      <span>{t('privacy.sections.noWarranty.items.assumeRisk')}</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Section 11: Changes Without Notice */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">{t('privacy.sections.changes.number')}</div>
                  <h2 className="text-xl font-semibold text-brand-charcoal">{t('privacy.sections.changes.title')}</h2>
                </div>
                <div className="ml-11 text-brand-slate leading-relaxed">
                  <p className="font-medium text-brand-charcoal">
                    {t('privacy.sections.changes.description')}
                  </p>
                </div>
              </div>

              {/* Section 12: Contact */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">{t('privacy.sections.contact.number')}</div>
                  <h2 className="text-xl font-semibold text-brand-charcoal">{t('privacy.sections.contact.title')}</h2>
                </div>
                <div className="ml-11 text-brand-slate leading-relaxed">
                  <p>
                    {t('privacy.sections.contact.description')}{' '}
                    <a href={`mailto:${CONTACT_EMAIL}`} className="text-amber-600 hover:text-amber-700 font-medium hover:underline inline-flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {CONTACT_EMAIL}
                    </a>
                    {' '}{t('privacy.sections.contact.note')}
                  </p>
                </div>
              </div>

              {/* TL;DR Summary */}
              <div className="pt-6 border-t border-slate-200">
                <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-sm text-brand-slate text-center">
                    <span className="font-semibold text-brand-charcoal">{t('privacy.tldr.label')}</span> {t('privacy.tldr.text')}
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
              {t('privacy.navigation.returnHome')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate(localizePath('/terms'))}
              className="text-amber-600 hover:text-amber-700"
            >
              {t('privacy.navigation.termsConditions')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
