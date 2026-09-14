import { useSearchParams } from 'react-router-dom';
import { useOrganization } from './data/useOrganization';

/**
 * Client Context Hook for Agency Multi-Client Management
 *
 * Manages URL-based client context using search params (?client_id=xxx)
 * Provides client switching functionality for agency users
 *
 * @returns {Object} Client context state and actions
 * @property {string | null} activeClientId - Currently selected client ID from URL
 * @property {boolean} isAgency - Whether current organization is an agency
 * @property {Function} switchClient - Switch to a different client (updates URL)
 * @property {Function} clearClient - Clear client selection (removes URL param)
 */
export function useClientContext() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { organization, isAgency } = useOrganization();

  // Get active client ID from URL search params
  const activeClientId = searchParams.get('client_id') || null;

  /**
   * Switch to a different client
   * Updates URL with ?client_id=xxx parameter
   *
   * @param {string | null} clientId - Client ID to switch to
   */
  const switchClient = (clientId: string | null) => {
    if (clientId) {
      setSearchParams({ client_id: clientId });
    } else {
      setSearchParams({});
    }
  };

  /**
   * Clear client selection
   * Removes client_id from URL search params
   */
  const clearClient = () => {
    setSearchParams({});
  };

  return {
    activeClientId,
    isAgency,
    organizationId: organization?.id || null,
    switchClient,
    clearClient,
  };
}
