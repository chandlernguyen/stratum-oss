import { useUserIdentity } from './useUserIdentity';

export interface Organization {
  id: string;
  name: string;
  type: 'SME' | 'AGENCY';
  subscription_tier: string;
  max_users: number;
  max_campaigns: number;
  max_clients: number;
  created_at: string;
  updated_at?: string;
}

/**
 * @deprecated This hook is deprecated. Please use `useUserIdentity` to get both user and organization data.
 * This hook now serves as a compatibility wrapper around `useUserIdentity`.
 */
export function useOrganization() {
  const { data: identity, isLoading, error, refetch } = useUserIdentity();

  const organization = identity?.organization;

  return {
    organization: organization,
    isLoading,
    error,
    refetch,
    isAgency: organization?.type === 'AGENCY',
    loading: isLoading, // For backward compatibility
  };
}