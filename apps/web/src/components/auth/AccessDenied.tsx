import { ShieldAlert, ArrowLeft, Mail } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useUserContextEnhanced } from '@/hooks/data/useUserContextEnhanced'

interface AccessDeniedProps {
  /**
   * The permission that was required but missing
   */
  permission?: string

  /**
   * Human-readable feature name (e.g., "Strategy Agent", "Team Management")
   */
  featureName?: string

  /**
   * Optional custom message to display
   */
  message?: string

  /**
   * Show contact admin button
   */
  showContactAdmin?: boolean
}

/**
 * AccessDenied component - displays when user lacks permission for a feature
 *
 * Uses STRATUM brand guidelines:
 * - Amber/Gold for warning emphasis
 * - Slate for secondary text
 * - Professional, non-accusatory messaging
 */
export function AccessDenied({
  permission,
  featureName,
  message,
  showContactAdmin = true
}: AccessDeniedProps) {
  const { t } = useTranslation(['common', 'auth'])
  const navigate = useNavigate()
  const { data: userContext } = useUserContextEnhanced()

  // Get user's role for context
  const primaryRole = userContext?.roles?.[0]?.role_name
    ?.replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())

  // Default message based on context
  const displayMessage = message || (
    featureName
      ? t('auth:accessDenied.noAccessToFeature', { featureName })
      : t('auth:accessDenied.noPermission')
  )

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center mb-4">
            <ShieldAlert className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>
          <CardTitle className="text-xl font-semibold text-brand-charcoal dark:text-gray-100">
            {t('auth:accessDenied.title')}
          </CardTitle>
        </CardHeader>

        <CardContent className="text-center space-y-4">
          <p className="text-brand-slate dark:text-gray-400">
            {displayMessage}
          </p>

          {primaryRole && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-sm">
              <span className="text-gray-500 dark:text-gray-400">{t('auth:accessDenied.yourRole')}</span>
              <span className="font-medium text-brand-charcoal dark:text-gray-200">{primaryRole}</span>
            </div>
          )}

          {permission && import.meta.env.DEV && (
            <div className="text-xs text-gray-400 dark:text-gray-600 font-mono mt-4 p-2 bg-gray-100 dark:bg-gray-800 rounded">
              {t('auth:accessDenied.required')}: {permission}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate(-1)}
            aria-label={t('auth:accessDenied.goBack')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('auth:accessDenied.goBack')}
          </Button>

          {showContactAdmin && (
            <Link to="/contact" className="w-full">
              <Button
                variant="ghost"
                className="w-full text-brand-slate hover:text-brand-gold"
                aria-label={t('auth:accessDenied.contactAdmin')}
              >
                <Mail className="w-4 h-4 mr-2" />
                {t('auth:accessDenied.contactAdmin')}
              </Button>
            </Link>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}

/**
 * Hook to use with AccessDenied component
 * Checks if user has required permission and returns appropriate component
 */
export function useAccessDenied(requiredPermission: string, featureName?: string) {
  const { data: userContext, isLoading } = useUserContextEnhanced()

  const hasPermission = userContext?.permissions?.includes(requiredPermission) ?? false

  return {
    hasPermission,
    isLoading,
    AccessDeniedComponent: !hasPermission && !isLoading ? (
      <AccessDenied permission={requiredPermission} featureName={featureName} />
    ) : null
  }
}
