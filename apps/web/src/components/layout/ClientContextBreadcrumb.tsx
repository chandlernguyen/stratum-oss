import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useClientBySlug } from '@/hooks/data/useClients';
import { ROUTES } from '@/config/routes';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';
import { stripLocalePrefix } from '@/lib/localePath';

/**
 * ClientContextBreadcrumb - Visual indicator showing current client context
 *
 * Displays when agency users are working on a specific client:
 * "Clients > [Client Name] | Switch client →"
 *
 * Provides:
 * - Context awareness (user knows which client they're working on)
 * - Quick navigation back to clients list
 * - Visual separation from global agency navigation
 */
export function ClientContextBreadcrumb({ clientSlug }: { clientSlug: string }) {
  const { t } = useTranslation(['common']);
  const { data: client, isLoading } = useClientBySlug(clientSlug);
  const location = useLocation();
  const { localizePath } = useLocalizedPath();
  const normalizedPath = stripLocalePrefix(location.pathname);

  // Check if we're on an agent page (has sidebar) - these pages have /agents/ in the URL
  const isAgentPage = normalizedPath.includes('/agents/');

  // Don't render during loading or if no client found
  if (isLoading || !client) return null;

  return (
    // pl-[72px] accounts for the collapsed agent sidebar width on agent pages
    // Hidden on mobile/tablet (lg:block) since sidebars aren't shown there
    <div className={`hidden lg:block bg-[#FAFAF9] border-b border-[#E5E7EB] ${isAgentPage ? 'pl-[72px]' : 'px-6'} pr-6 py-3 shadow-[0_1px_2px_rgba(30,41,59,0.08)] dark:bg-[#1E293B] dark:border-gray-700`}>
      <div className="flex items-center gap-2 text-sm">
        <Link
          to={localizePath(ROUTES.clients.list)}
          className="text-[#64748B] hover:text-[#F59E0B] font-medium dark:text-gray-400 dark:hover:text-[#F59E0B] transition-colors duration-150"
        >
          {t('navigation.clients')}
        </Link>
        <ChevronRight className="h-4 w-4 text-[#64748B] dark:text-gray-500" />
        <span className="font-semibold text-[#1E293B] dark:text-white">
          {client.name}
        </span>
        <span className="mx-2 text-[#E5E7EB] dark:text-gray-600">|</span>
        <Link
          to={localizePath(ROUTES.clients.list)}
          className="text-[#64748B] hover:text-[#F59E0B] dark:text-gray-400 dark:hover:text-[#F59E0B] transition-colors duration-150 flex items-center gap-1"
        >
          {t('breadcrumbs.switchClient')}
        </Link>
      </div>
    </div>
  );
}
