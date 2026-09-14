import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useUserIdentity } from './data/useUserIdentity';
import { toast } from 'sonner';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';

/**
 * useAgencyRouteGuard Hook
 *
 * Enforces client context for agency users accessing agent pages.
 *
 * Problem: Agencies can access both `/strategy` and `/clients/:slug/agents/strategy`
 * causing confusion about which URL to use.
 *
 * Solution: Force agency users to select a client before accessing agents.
 * Redirect to `/clients` with helpful message if no client context.
 *
 * Usage:
 * ```tsx
 * export function StrategyAgentPage() {
 *   useAgencyRouteGuard();
 *   // Rest of component...
 * }
 * ```
 *
 * Part of Production Readiness Roadmap Phase 1 - Task 1.4
 */
export function useAgencyRouteGuard() {
  const { data: identity, isLoading } = useUserIdentity();
  const { clientSlug } = useParams<{ clientSlug?: string }>();
  const navigate = useNavigate();
  const { localizePath } = useLocalizedPath();

  useEffect(() => {
    console.log('[useAgencyRouteGuard] Hook executing', {
      isLoading,
      orgType: identity?.organization?.type,
      clientSlug,
      pathname: window.location.pathname
    });

    // Wait for identity to load
    if (isLoading) {
      console.log('[useAgencyRouteGuard] Still loading identity, waiting...');
      return;
    }

    const organization = identity?.organization;

    // Only apply guard to agency users
    if (organization?.type === 'AGENCY') {
      console.log('[useAgencyRouteGuard] User is AGENCY, checking client context');
      // Check if user is in client context
      if (!clientSlug) {
        console.log('[useAgencyRouteGuard] No client context - redirecting to /clients');
        // Agency user trying to access global agent route
        toast.info('Please select a client first', {
          description: 'Agency users must select a client to access AI agents.',
          duration: 4000,
        });

        // Redirect to clients list
        navigate(localizePath('/clients'), {
          replace: true,
          state: {
            message: 'Please select a client to continue',
            returnPath: window.location.pathname,
          },
        });
      } else {
        console.log('[useAgencyRouteGuard] Client context present - allowing access');
      }
    } else {
      console.log('[useAgencyRouteGuard] User is SME - allowing access without client context');
    }
  }, [identity?.organization?.type, clientSlug, navigate, isLoading, localizePath]);

  return {
    isAgency: identity?.organization?.type === 'AGENCY',
    clientSlug,
    isLoading,
  };
}
