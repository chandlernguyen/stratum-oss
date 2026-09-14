import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, MessageSquare, Linkedin } from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';
import { AUTHOR_LINKEDIN, CONTACT_EMAIL } from '@/config/brand';

export function Contact() {
  const navigate = useNavigate();
  const { t } = useTranslation('contact');
  const { localizePath } = useLocalizedPath();

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicHeader />
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('meta.title')}</h1>
          <p className="text-gray-600">{t('meta.subtitle')}</p>
        </div>

        <div className="space-y-8 text-gray-700">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">{t('getInTouch.title')}</h2>
            <p className="mb-4">
              {t('getInTouch.description')}
            </p>
            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg mb-4">
              <p className="text-sm text-amber-900">
                <strong>{t('getInTouch.wantAccess')}</strong>{' '}
                <button onClick={() => navigate(localizePath('/signup'))} className="text-amber-700 hover:text-amber-800 font-semibold hover:underline">
                  {t('getInTouch.requestInvitation')} &rarr;
                </button>
              </p>
            </div>
            <p className="text-sm text-slate-600">
              <strong>{t('getInTouch.alphaUsers')}</strong> {t('getInTouch.alphaUsersNote')}<br />
              <strong>{t('getInTouch.everyoneElse')}</strong> {t('getInTouch.everyoneElseNote')}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('contactMethods.title')}</h2>
            <div className="space-y-4">
              {/* Feedback Form - For Alpha Users */}
              <div className="flex items-start gap-4 p-4 bg-amber-50 border-2 border-amber-200 rounded-lg hover:bg-amber-100 transition-colors">
                <div className="flex-shrink-0 w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {t('contactMethods.inAppFeedback.title')}
                    <span className="ml-2 text-xs bg-amber-600 text-white px-2 py-0.5 rounded-full">{t('contactMethods.inAppFeedback.badge')}</span>
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>{t('contactMethods.inAppFeedback.description')}</strong> {t('contactMethods.inAppFeedback.note')}
                  </p>
                  <button
                    onClick={() => navigate(localizePath('/feedback'))}
                    className="text-amber-600 hover:text-amber-700 font-medium text-sm hover:underline"
                  >
                    {t('contactMethods.inAppFeedback.cta')} &rarr;
                  </button>
                </div>
              </div>

              {/* Email - For Everyone */}
              <div className="flex items-start gap-4 p-4 bg-slate-50 border-2 border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
                <div className="flex-shrink-0 w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Mail className="h-6 w-6 text-slate-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {t('contactMethods.email.title')}
                    <span className="ml-2 text-xs bg-slate-600 text-white px-2 py-0.5 rounded-full">{t('contactMethods.email.badge')}</span>
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {t('contactMethods.email.description')}
                  </p>
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="text-slate-600 hover:text-slate-700 font-medium text-sm hover:underline block mb-2"
                  >
                    {CONTACT_EMAIL}
                  </a>
                  <p className="text-xs text-slate-500">
                    {t('contactMethods.email.wantAccess')} <button onClick={() => navigate(localizePath('/signup'))} className="text-amber-600 hover:text-amber-700 font-semibold hover:underline">{t('contactMethods.email.requestInvitation')}</button>
                  </p>
                </div>
              </div>

              {/* LinkedIn — only rendered when an author profile is configured */}
              {AUTHOR_LINKEDIN && (
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex-shrink-0 w-12 h-12 bg-slate-100 dark:bg-slate-900/30 rounded-lg flex items-center justify-center">
                  <Linkedin className="h-6 w-6 text-slate-600 dark:text-slate-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{t('contactMethods.linkedin.title')}</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {t('contactMethods.linkedin.description')}
                  </p>
                  <a
                    href={AUTHOR_LINKEDIN}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-600 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 font-medium text-sm hover:underline"
                  >
                    {t('contactMethods.linkedin.cta')} &rarr;
                  </a>
                </div>
              </div>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">{t('responseTime.title')}</h2>
            <div className="bg-slate-50 border-l-4 border-slate-400 p-4 rounded-r-lg">
              <p className="text-slate-900">
                <strong>{t('responseTime.commitment')}</strong> {t('responseTime.responseNote')}
              </p>
              <p className="text-slate-700 mt-2 text-sm">
                {t('responseTime.timezone')}
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">{t('partnership.title')}</h2>
            <p className="text-gray-700">
              {t('partnership.description')}{' '}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-amber-600 hover:text-amber-700 font-medium hover:underline"
              >
                {CONTACT_EMAIL}
              </a>
              {' '}{t('partnership.subjectNote')}
            </p>
          </section>
        </div>
      </div>
      <PublicFooter />
    </div>
  );
}
