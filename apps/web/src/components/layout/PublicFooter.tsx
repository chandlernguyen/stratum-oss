import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';

export function PublicFooter() {
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  const { localizePath } = useLocalizedPath();

  return (
    <footer className="border-t bg-slate-50 dark:bg-slate-900 py-2 px-4 sm:px-6 lg:px-8 mt-auto">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-2 text-sm">
          <div className="flex flex-col items-center md:items-start">
            <div className="font-bold text-lg bg-gradient-to-r from-slate-600 to-amber-600 bg-clip-text text-transparent">
              STRAŦUM
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-400 font-medium -mt-0.5">
              {t('footer.tagline')}
            </div>
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {t('footer.copyright')}
          </div>
          <div className="flex gap-4 text-xs text-gray-600 dark:text-gray-400">
            <button
              onClick={() => navigate(localizePath('/blog'))}
              className="hover:text-amber-600 dark:hover:text-amber-500 transition-colors py-1 px-2 flex items-center"
            >
              {t('footer.blog')}
            </button>
            <button
              onClick={() => navigate(localizePath('/pricing'))}
              className="hover:text-amber-600 dark:hover:text-amber-500 transition-colors py-1 px-2 flex items-center"
            >
              {t('footer.pricing')}
            </button>
            <button
              onClick={() => navigate(localizePath('/privacy'))}
              className="hover:text-amber-600 dark:hover:text-amber-500 transition-colors py-1 px-2 flex items-center"
            >
              {t('footer.privacy')}
            </button>
            <button
              onClick={() => navigate(localizePath('/terms'))}
              className="hover:text-amber-600 dark:hover:text-amber-500 transition-colors py-1 px-2 flex items-center"
            >
              {t('footer.terms')}
            </button>
            <button
              onClick={() => navigate(localizePath('/contact'))}
              className="hover:text-amber-600 dark:hover:text-amber-500 transition-colors py-1 px-2 flex items-center"
            >
              {t('footer.contact')}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
