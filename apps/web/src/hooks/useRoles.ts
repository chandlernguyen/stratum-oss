import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface Role {
  id: string
  name: string
  description: string | null
  org_type: string | null
  is_system: boolean
  created_at: string
}

/**
 * Hook to fetch available roles from the database.
 * Roles are system-defined and rarely change, so we cache them.
 *
 * This replaces hardcoded role UUIDs which would break across environments.
 */
export function useRoles(orgType: 'AGENCY' | 'SME' | 'BOTH' = 'AGENCY') {
  return useQuery<Role[]>({
    queryKey: ['roles', orgType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .or(`org_type.eq.${orgType},org_type.eq.BOTH`)
        .order('name')

      if (error) {
        throw new Error(`Failed to fetch roles: ${error.message}`)
      }

      return data || []
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour (roles rarely change)
  })
}

/**
 * Helper to get role ID by role name from a list of roles.
 */
export function getRoleIdByName(roles: Role[], roleName: string): string | undefined {
  return roles.find(role => role.name === roleName)?.id
}

/**
 * Helper to filter roles by org type for display.
 * Only shows roles relevant to agency team invitations.
 */
export function getAgencyTeamRoles(roles: Role[]): Role[] {
  const agencyRoleNames = [
    'agency_owner',
    'agency_admin',
    'agency_account_manager',
    'agency_strategist',
    'agency_campaign_manager',
    'agency_creative',
    'agency_analyst',
    'agency_client', // External client contact with simplified view
  ]

  return roles.filter(role => agencyRoleNames.includes(role.name))
}

/**
 * Check if a role is the external client role.
 * External clients see a simplified Client View instead of the full dashboard.
 */
export function isClientRole(roleName: string | undefined): boolean {
  return roleName === 'agency_client'
}

/**
 * Helper to filter roles for SME team invitations.
 * Only shows roles relevant to SME organizations.
 */
export function getSMETeamRoles(roles: Role[]): Role[] {
  const smeRoleNames = [
    'sme_owner',
    'sme_marketing_director',
    'sme_marketing_manager',
    'sme_analyst',
    'sme_viewer',
  ]

  return roles.filter(role => smeRoleNames.includes(role.name))
}

/**
 * Helper to get team-appropriate roles based on org type.
 * Automatically selects the correct filter function.
 */
export function getTeamRoles(roles: Role[], orgType: 'SME' | 'AGENCY'): Role[] {
  return orgType === 'AGENCY' ? getAgencyTeamRoles(roles) : getSMETeamRoles(roles)
}
