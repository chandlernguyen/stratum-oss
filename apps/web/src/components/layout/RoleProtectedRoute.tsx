import { Navigate } from 'react-router-dom'
import { useUserIdentity } from '@/hooks/data/useUserIdentity' // CORRECT: Use canonical hook
import { useUserRoles } from '@/hooks/useUserRoles'
import { useUserContextEnhanced } from '@/hooks/data/useUserContextEnhanced'

interface RoleProtectedRouteProps {
  children: React.ReactNode
  allowedOrgTypes?: ('SME' | 'AGENCY')[]
  allowedRoles?: string[]
  /** Permission-based access: user must have ANY of these permissions */
  requiredPermissions?: string[]
  redirectTo?: string
}

export function RoleProtectedRoute({
  children,
  allowedOrgTypes = [],
  allowedRoles = [],
  requiredPermissions = [],
  redirectTo = '/dashboard'
}: RoleProtectedRouteProps) {
  const { data: identity } = useUserIdentity() // CORRECT: Use canonical hook
  const { userRoles } = useUserRoles()
  const { data: userContext } = useUserContextEnhanced()

  // Check organization type if specified
  if (allowedOrgTypes.length > 0 && identity?.organization) {
    const orgType = identity.organization.type?.toUpperCase() as 'SME' | 'AGENCY'
    if (!allowedOrgTypes.includes(orgType)) {
      return <Navigate to={redirectTo} replace />
    }
  }

  // Check user role if specified (legacy - prefer permissions)
  if (allowedRoles.length > 0 && userRoles.length > 0) {
    const hasAllowedRole = userRoles.some(userRole =>
      allowedRoles.includes(userRole.role_name)
    )

    if (!hasAllowedRole) {
      return <Navigate to={redirectTo} replace />
    }
  }

  // Check permissions if specified (modern approach - ANY permission grants access)
  if (requiredPermissions.length > 0) {
    const userPermissions = userContext?.permissions || []
    const hasRequiredPermission = requiredPermissions.some(permission =>
      userPermissions.includes(permission)
    )

    if (!hasRequiredPermission) {
      return <Navigate to={redirectTo} replace />
    }
  }

  return <>{children}</>
}