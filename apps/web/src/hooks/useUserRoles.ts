import { useQuery } from '@tanstack/react-query';
import { useUserIdentity } from '@/hooks/data/useUserIdentity'; // CORRECT: Use canonical hook
import { supabase } from '@/lib/supabase';

export interface UserRole {
  role_name: string;
  permissions: string[];
  client_id?: string;
  client_name?: string;
}

export function useUserRoles() {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;
  const userId = identity?.user?.id;

  const { data, isLoading, error } = useQuery({
    queryKey: ['userRoles', userId, orgId],
    queryFn: async () => {
      if (!orgId || !userId) return [];

      // Use database function for optimized role and permission lookup
      const { data: userRoles, error } = await supabase.rpc('get_user_roles', {
        p_user_id: userId,
        p_org_id: orgId
      });

      if (error) {
        console.error('[useUserRoles] Error fetching user roles:', error);
        throw error;
      }

      return (userRoles || []) as UserRole[];
    },
    enabled: !!userId && !!orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  const userRoles = data || [];

  // Computed permissions
  const canManageClients = userRoles.some(
    role => !role.client_id && [
      'agency_owner', 'agency_admin'
    ].includes(role.role_name.toLowerCase())
  );

  const canViewClients = userRoles.some(
    role => [
      'agency_owner', 'agency_admin',
      'account_manager', 'creative_strategist'
    ].includes(role.role_name.toLowerCase())
  );

  const canCreateCampaigns = userRoles.some(
    role => [
      'sme_owner', 'sme_admin', 'marketing_manager',
      'agency_owner', 'agency_admin', 'account_manager', 'creative_strategist'
    ].includes(role.role_name.toLowerCase())
  );

  return {
    userRoles,
    isLoading,
    error,
    canManageClients,
    canViewClients,
    canCreateCampaigns,
    loading: isLoading, // For backward compatibility
  };
}

// Helper hook to check specific permissions
export function usePermission(requiredRoles: string[]): boolean {
  const { userRoles } = useUserRoles();

  return userRoles.some(userRole =>
    requiredRoles.includes(userRole.role_name)
  );
}