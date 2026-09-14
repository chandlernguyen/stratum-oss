import { lazy, Suspense } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useUserIdentity } from '@/hooks/data/useUserIdentity' // CORRECT: Use the new canonical hook
import { useUserRoles } from '@/hooks/useUserRoles' // Keep for guest check for now

// Lazy load dashboard variants to reduce initial bundle size
// Users only see one dashboard type, so load on demand
const SMEDashboard = lazy(() => import('@/components/dashboard/SMEDashboard').then(m => ({ default: m.SMEDashboard })))
const AgencyDashboard = lazy(() => import('@/components/dashboard/AgencyDashboard').then(m => ({ default: m.AgencyDashboard })))
const GuestDashboard = lazy(() => import('@/components/dashboard/GuestDashboard').then(m => ({ default: m.GuestDashboard })))
const ClientOverviewDashboard = lazy(() => import('@/components/dashboard/ClientOverviewDashboard').then(m => ({ default: m.ClientOverviewDashboard })))
import { AchievementToast } from '@/components/gamification/AchievementToast'
// import { UserProgress } from '@/components/gamification/UserProgress' // Temporarily hidden
import { useAchievements } from '@/hooks/useAchievements'
import { LayeredSpinner } from '@/components/ui/layered-icon'
import { useClientBySlug } from '@/hooks/data/useClients'
import { useClientContext } from '@/contexts/ClientContext'
import { usePageTitle } from '@/hooks/usePageTitle'

export function Dashboard() {
  // Set page title for GA4 tracking and accessibility
  usePageTitle('Dashboard');

  // i18n translations
  const { t } = useTranslation('dashboard');

  const navigate = useNavigate()
  const { clientSlug: clientSlugBranded } = useClientContext() // CORRECT: Use context instead of useParams
  const clientSlug = clientSlugBranded || undefined

  // Get client data if in client context
  const { data: client, isLoading: clientLoading } = useClientBySlug(clientSlug)

  // CORRECT: Use the new single source of truth for identity
  const { data: identity, isLoading: orgLoading } = useUserIdentity()
  const { organization } = identity || {}

  // Roles are separate for now, can be merged into useUserIdentity later if needed
  const { userRoles, isLoading: rolesLoading } = useUserRoles()
  const {
    // userProgress, // Temporarily hidden
    currentAchievement,
    clearCurrentAchievement,
    // totalAchievements, // Temporarily hidden
    // unlockedAchievements, // Temporarily hidden
    // nextLevelXP, // Temporarily hidden
    // currentLevelProgress // Temporarily hidden
  } = useAchievements()

  const loading = orgLoading || rolesLoading || (clientSlug && clientLoading)

  // Show loading state while data loads
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <LayeredSpinner size="lg" />
          <p className="text-sm text-muted-foreground">
            {clientSlug ? t('loading.clientDashboard', { clientSlug }) : t('loading.dashboard')}
          </p>
        </div>
      </div>
    );
  }

  // If in client context, show client-specific dashboard
  if (clientSlug && client && organization?.type === 'AGENCY') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
          {/* Client Dashboard Header */}
          <div className="mb-4 md:mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-brand-charcoal dark:text-gray-100">{t('clientDashboard.title', { clientName: client.name })}</h1>
            <p className="text-sm md:text-base text-brand-slate dark:text-gray-400 mt-1">{t('clientDashboard.subtitle')}</p>
          </div>

          {/* Agency-Focused Client Overview Dashboard */}
          <Suspense fallback={<LayeredSpinner size="lg" />}>
            <ClientOverviewDashboard clientId={client.id} clientSlug={client.slug} />
          </Suspense>

          {/* Achievement Toast */}
          {currentAchievement && (
            <AchievementToast
              achievement={currentAchievement}
              onClose={clearCurrentAchievement}
            />
          )}
        </div>
      </div>
    );
  }

  // Check if user is a guest
  const isGuest = userRoles?.some(role =>
    ['client_stakeholder', 'client_collaborator', 'viewer'].includes(role.role_name?.toLowerCase() || '')
  ) || false;

  // Handle case when no organization is found
  if (!organization) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h2 className="text-xl font-semibold">{t('noOrganization.title')}</h2>
              <p className="text-muted-foreground">
                {t('noOrganization.description')}
              </p>
              <Button onClick={() => navigate('/profile')}>
                {t('noOrganization.viewProfile')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Use the appropriate dashboard based on user role and organization type
  if (organization) {
    if (isGuest) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
          <div className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
            <Suspense fallback={<LayeredSpinner size="lg" />}>
              <GuestDashboard />
            </Suspense>
            {currentAchievement && (
              <AchievementToast
                achievement={currentAchievement}
                onClose={clearCurrentAchievement}
              />
            )}
          </div>
        </div>
      );
    // CORRECT: The logic now directly and reliably checks the organization type
    } else if (organization.type === 'AGENCY') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
          <div className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
            <Suspense fallback={<LayeredSpinner size="lg" />}>
              <AgencyDashboard />
            </Suspense>
          </div>
        </div>
      );
    } else { // Default to SME
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
          <div className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
            {/* User Progress Bar - Temporarily hidden */}
            {/* <div className="hidden md:block mb-4 md:mb-6">
              <UserProgress
                level={userProgress.level}
                totalXP={userProgress.totalXP}
                currentLevelProgress={currentLevelProgress}
                nextLevelXP={nextLevelXP}
                achievementsUnlocked={unlockedAchievements}
                totalAchievements={totalAchievements}
                compact
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-2.5 md:p-3"
              />
            </div> */}

            <Suspense fallback={<LayeredSpinner size="lg" />}>
              <SMEDashboard />
            </Suspense>

            {/* Achievement Toast */}
            {currentAchievement && (
              <AchievementToast
                achievement={currentAchievement}
                onClose={clearCurrentAchievement}
              />
            )}
          </div>
        </div>
      );
    }
  }

  // Fallback for any unexpected state
  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardContent className="pt-6">
          <h2 className="text-xl font-semibold">{t('loading.fallback')}</h2>
        </CardContent>
      </Card>
    </div>
  );
}