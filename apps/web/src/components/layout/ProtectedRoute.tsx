import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/auth'
import { useUserIdentity } from '@/hooks/data/useUserIdentity' // CORRECT: Use canonical hook
import { supabase } from '@/lib/supabase'
import { useMfaStatus } from '@/hooks/useMfaStatus' // Import the new hook
import { useRoleAccess } from '@/hooks/data/useUserContextEnhanced'
import { buildLocalizedPath, getPathLocale, stripLocalePrefix } from '@/lib/localePath'
import { DEFAULT_LOCALE } from '@/lib/locales'
import { getCurrentLanguage } from '@/lib/i18n'

interface ProtectedRouteProps {
  children: React.ReactNode
}

interface OnboardingStatus {
  needs_onboarding: boolean
  org_type: string
  org_id: string
  org_name: string
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { t } = useTranslation(['common'])
  const { user, initialized, initialize } = useAuthStore()
  const { isLoading: orgLoading } = useUserIdentity() // CORRECT: Use canonical hook
  const { isMfaEnrolled, isMfaVerified, isLoading: isMfaLoading } = useMfaStatus()
  const { isExternalClient, isLoading: roleLoading } = useRoleAccess()
  const location = useLocation()
  const routeLocale = getPathLocale(location.pathname)
  const effectiveLocale = routeLocale === DEFAULT_LOCALE ? getCurrentLanguage() : routeLocale
  const normalizedPath = stripLocalePrefix(location.pathname)
  const localizedPath = (path: string) => buildLocalizedPath(effectiveLocale, path)
  const [onboardingCheck, setOnboardingCheck] = useState<{
    checked: boolean
    needsOnboarding: boolean
  }>({ checked: false, needsOnboarding: false })

  useEffect(() => {
    if (!initialized) {
      initialize()
    }
  }, [initialized, initialize])

  // Check onboarding status when user is loaded
  useEffect(() => {
    async function checkOnboarding() {
      if (!user) return

      // If navigating to dashboard or other protected routes, recheck onboarding status
      // This ensures we see fresh data after completing onboarding
      const shouldRecheck = !normalizedPath.startsWith('/onboarding') && onboardingCheck.needsOnboarding

      if (onboardingCheck.checked && !shouldRecheck) return

      try {
        const { data, error } = await supabase.rpc('check_onboarding_status', {
          p_user_id: user.id
        })

        if (error) {
          console.error('[ProtectedRoute] Error checking onboarding status:', error)
          // Default to not needing onboarding on error (fail open for UX)
          setOnboardingCheck({ checked: true, needsOnboarding: false })
          return
        }

        // data is an array with single row
        const status = data?.[0] as OnboardingStatus | undefined
        const needsOnboarding = status?.needs_onboarding || false

        console.log('[ProtectedRoute] Onboarding check result:', {
          needsOnboarding,
          orgType: status?.org_type,
          currentPath: normalizedPath,
          rechecked: shouldRecheck
        })

        setOnboardingCheck({
          checked: true,
          needsOnboarding
        })
      } catch (err) {
        console.error('[ProtectedRoute] Unexpected error checking onboarding:', err)
        setOnboardingCheck({ checked: true, needsOnboarding: false })
      }
    }

    checkOnboarding()
  }, [user, onboardingCheck.checked, onboardingCheck.needsOnboarding, normalizedPath])

  // CRITICAL: Check auth initialization first, then user existence
  // This must happen BEFORE checking other loading states because those hooks
  // throw errors or return loading:true indefinitely when there's no session
  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium">{t('loading.default')}</div>
          <div className="text-sm text-muted-foreground">{t('protectedRoute.initializingAuth')}</div>
        </div>
      </div>
    )
  }

  // Not authenticated - redirect to login IMMEDIATELY
  // This must happen before checking org/role loading states because those
  // hooks depend on having a valid session and will error/hang without one
  if (!user) {
    return <Navigate to={localizedPath('/login')} replace />
  }

  // Now that we have a confirmed user, wait for dependent data to load
  // These hooks are safe to check now because we have a valid session
  if (orgLoading || isMfaLoading || roleLoading || !onboardingCheck.checked) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium">{t('loading.default')}</div>
          <div className="text-sm text-muted-foreground">{t('protectedRoute.loadingWorkspace')}</div>
        </div>
      </div>
    )
  }

  // Handle MFA verification
  if (isMfaEnrolled && !isMfaVerified) {
    // If trying to access MFA page, allow it
    if (normalizedPath === '/mfa-verify') {
      return <>{children}</>;
    }
    console.log('[ProtectedRoute] User needs MFA verification, redirecting to /mfa-verify...');
    return <Navigate to={localizedPath('/mfa-verify')} replace />;
  }

  // Check if user needs onboarding (except on onboarding routes)
  const isOnboardingRoute = normalizedPath.startsWith('/onboarding')

  if (onboardingCheck.needsOnboarding && !isOnboardingRoute) {
    console.log('[ProtectedRoute] User needs onboarding, redirecting to business context...')
    return <Navigate to={localizedPath('/onboarding/business-context')} replace />
  }

  // Redirect external client users to Client Portal
  // They should see /portal/:clientSlug/* routes, not the standard dashboard
  // Route naming:
  //   /portal/:clientSlug/* - Client Portal (external clients review/approve work)
  //   /clients/:clientSlug/* - Agency Client Workspace (agency users manage clients)
  const isClientPortalRoute = normalizedPath.startsWith('/portal/')
  const isAgencyClientRoute = normalizedPath.startsWith('/clients/')

  if (isExternalClient && !isClientPortalRoute) {
    // Smart redirect: Convert /clients/{slug}/* URLs to /portal/{slug}/* URLs
    // This allows notification deep links to work correctly for external clients
    if (isAgencyClientRoute) {
      // Replace /clients/ with /portal/ to preserve the path structure
      const portalPath = localizedPath(normalizedPath.replace('/clients/', '/portal/'))
      console.log('[ProtectedRoute] External client on agency route, converting to portal:', portalPath)
      return <Navigate to={portalPath} replace />
    }

    // For other routes (dashboard, agents, etc.), redirect to portal home
    // ClientViewLayout will determine the correct client slug from user context
    console.log('[ProtectedRoute] External client user, redirecting to Client Portal...')
    return <Navigate to={localizedPath('/portal/my-client')} replace />
  }

  // Prevent non-external-client users from accessing /portal/* routes (Client Portal only)
  if (!isExternalClient && isClientPortalRoute) {
    console.log('[ProtectedRoute] Non-client user on client portal route, redirecting to dashboard...')
    return <Navigate to={localizedPath('/dashboard')} replace />
  }

  return <>{children}</>
}
