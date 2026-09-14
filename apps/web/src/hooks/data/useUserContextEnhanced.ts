import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useUserIdentity } from './useUserIdentity';

// Enhanced user context interface
export interface UserContextData {
  // User information
  user_id: string;
  email: string;
  created_at: string;

  // Organization information
  org_id: string;
  org_name: string;
  org_type: 'SME' | 'AGENCY';
  org_settings: Record<string, any>;

  // Roles and permissions (aggregated)
  roles: Array<{
    role_name: string;
    client_id?: string;
    client_name?: string;
    is_org_role: boolean;
  }>;
  permissions: string[];

  // Client access
  client_access: Array<{
    id: string;
    name: string;
  }>;

  // Computed permissions for common actions
  can_manage_clients: boolean;
  can_view_clients: boolean;
  can_create_campaigns: boolean;
  can_manage_users: boolean;
  can_view_analytics: boolean;

  context_generated_at: string;
}

// Enhanced user context hook with comprehensive permissions
export function useUserContextEnhanced() {
  const { data: identity } = useUserIdentity();
  const user = identity?.user;

  return useQuery({
    queryKey: ['user-context-enhanced', user?.id],
    queryFn: async (): Promise<UserContextData | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase.rpc('get_user_context', {
        p_user_id: user.id
      });

      if (error) {
        console.error('[useUserContextEnhanced] Error fetching user context:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return null;
      }

      const result = data[0];

      return {
        user_id: result.user_id,
        email: result.email,
        created_at: result.created_at,
        org_id: result.org_id,
        org_name: result.org_name,
        org_type: result.org_type,
        org_settings: result.org_settings || {},
        roles: result.roles || [],
        permissions: result.permissions || [],
        client_access: result.client_access || [],
        can_manage_clients: result.can_manage_clients || false,
        can_view_clients: result.can_view_clients || false,
        can_create_campaigns: result.can_create_campaigns || false,
        can_manage_users: result.can_manage_users || false,
        can_view_analytics: result.can_view_analytics || false,
        context_generated_at: result.context_generated_at
      };
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes - context rarely changes mid-session
    refetchOnMount: false, // Don't refetch on every mount - use cached data
    refetchOnWindowFocus: false,
  });
}

// Enhanced permission checking hook
export function usePermissionEnhanced(requiredPermissions: string[]) {
  const { data: userContext } = useUserContextEnhanced();

  if (!userContext) {
    return {
      hasPermission: false,
      hasAnyPermission: false,
      hasAllPermissions: false,
      isLoading: true,
      missingPermissions: requiredPermissions
    };
  }

  const userPermissions = userContext.permissions;
  const hasAllPermissions = requiredPermissions.every(permission =>
    userPermissions.includes(permission)
  );
  const hasAnyPermission = requiredPermissions.some(permission =>
    userPermissions.includes(permission)
  );
  const missingPermissions = requiredPermissions.filter(permission =>
    !userPermissions.includes(permission)
  );

  return {
    hasPermission: hasAllPermissions, // Backward compatibility
    hasAnyPermission,
    hasAllPermissions,
    isLoading: false,
    missingPermissions,
    userPermissions
  };
}

// Hook for role-based access control
export function useRoleAccess() {
  const { data: userContext } = useUserContextEnhanced();

  if (!userContext) {
    return {
      isOwner: false,
      isAdmin: false,
      isManager: false,
      isAnalyst: false,
      isClient: false,
      isExternalClient: false,
      isLoading: true,
      roles: []
    };
  }

  const roleNames = userContext.roles.map(role => role.role_name.toLowerCase());

  return {
    isOwner: roleNames.includes('sme_owner') || roleNames.includes('agency_owner'),
    isAdmin: roleNames.includes('sme_admin') || roleNames.includes('agency_admin'),
    isManager: roleNames.includes('sme_marketing_manager') || roleNames.includes('agency_account_manager'),
    isAnalyst: roleNames.includes('sme_analyst'),
    isClient: roleNames.includes('agency_client_viewer'),
    // External client contact - sees simplified Client View
    isExternalClient: roleNames.includes('agency_client'),
    isLoading: false,
    roles: userContext.roles,
    orgType: userContext.org_type
  };
}

// Hook for client-specific access
export function useClientAccess(clientId?: string) {
  const { data: userContext } = useUserContextEnhanced();

  if (!userContext) {
    return {
      hasClientAccess: false,
      canAccessClient: false,
      accessibleClients: [],
      isLoading: true
    };
  }

  const accessibleClientIds = userContext.client_access.map(client => client.id);
  const hasOrgLevelAccess = userContext.roles.some(role => role.is_org_role);

  return {
    hasClientAccess: accessibleClientIds.length > 0 || hasOrgLevelAccess,
    canAccessClient: clientId
      ? (accessibleClientIds.includes(clientId) || hasOrgLevelAccess)
      : hasOrgLevelAccess,
    accessibleClients: userContext.client_access,
    hasOrgLevelAccess,
    isLoading: false
  };
}

// Helper hook for common permission patterns
export function useCommonPermissions() {
  const { data: userContext } = useUserContextEnhanced();

  if (!userContext) {
    return {
      canManageClients: false,
      canViewClients: false,
      canCreateCampaigns: false,
      canManageUsers: false,
      canViewAnalytics: false,
      canAccessAgents: false,
      isLoading: true
    };
  }

  const permissions = userContext.permissions;

  return {
    canManageClients: userContext.can_manage_clients,
    canViewClients: userContext.can_view_clients,
    canCreateCampaigns: userContext.can_create_campaigns,
    canManageUsers: userContext.can_manage_users,
    canViewAnalytics: userContext.can_view_analytics,
    canAccessAgents: permissions.some(p => p.startsWith('agents.')),
    canManageBilling: permissions.includes('organization.billing.manage'),
    canEditSettings: permissions.includes('organization.settings.edit'),
    isSystemAdmin: permissions.includes('system.admin'),
    isLoading: false,
    allPermissions: permissions
  };
}