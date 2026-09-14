import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Suspense, useEffect } from 'react'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { RoleProtectedRoute } from '@/components/layout/RoleProtectedRoute'
import { HeaderNew } from '@/components/layout/HeaderNew'
import { ContextBreadcrumbs } from '@/components/layout/ContextBreadcrumbs'
import { CommandPalette } from '@/components/command/CommandPalette'
import { Toaster } from '@/components/ui/sonner'
import { lazyWithRetry } from '@/utils/lazyWithRetry'
import { PageLoadingSpinner } from '@/components/ui/loading-spinner'
import { queryClient } from '@/lib/queryClient' // Phase 2 Task 2.2: Stale-While-Revalidate
import { PublicFooter } from '@/components/layout/PublicFooter'
import { LandingPage } from '@/pages/LandingPage'

// Core pages loaded on demand
const Dashboard = lazyWithRetry(() => import('@/pages/Dashboard').then(m => ({ default: m.Dashboard })))
const Terms = lazyWithRetry(() => import('@/pages/Terms').then(m => ({ default: m.Terms })))
const Privacy = lazyWithRetry(() => import('@/pages/Privacy').then(m => ({ default: m.Privacy })))
const Contact = lazyWithRetry(() => import('@/pages/Contact').then(m => ({ default: m.Contact })))
const PricingPage = lazyWithRetry(() => import('@/pages/PricingPage').then(m => ({ default: m.PricingPage })))
const BlogList = lazyWithRetry(() => import('@/pages/BlogList').then(m => ({ default: m.BlogList })))
const BlogPost = lazyWithRetry(() => import('@/pages/BlogPost').then(m => ({ default: m.BlogPost })))
const RequestInvitation = lazyWithRetry(() => import('@/pages/RequestInvitation').then(m => ({ default: m.RequestInvitation })))

// Agent pages loaded on demand with retry logic
const StrategyAgent = lazyWithRetry(() => import('@/pages/StrategyAgent').then(m => ({ default: m.StrategyAgent })))
const PersonaAgent = lazyWithRetry(() => import('@/pages/PersonaAgent').then(m => ({ default: m.PersonaAgent })))
const PersonaInterview = lazyWithRetry(() => import('@/pages/PersonaInterview').then(m => ({ default: m.PersonaInterview })))
const MarketingStrategyPage = lazyWithRetry(() => import('@/pages/MarketingStrategyPage').then(m => ({ default: m.default })))
const ContentAgent = lazyWithRetry(() => import('@/pages/ContentAgent').then(m => ({ default: m.ContentAgent })))
const CampaignExecutionAgent = lazyWithRetry(() => import('@/pages/CampaignExecutionAgent').then(m => ({ default: m.CampaignExecutionAgent })))
const CompetitiveIntelligenceAgent = lazyWithRetry(() => import('@/pages/CompetitiveIntelligenceAgent').then(m => ({ default: m.CompetitiveIntelligenceAgent })))
const ClientSuccessAgent = lazyWithRetry(() => import('@/pages/ClientSuccessAgent').then(m => ({ default: m.ClientSuccessAgent })))
const PerformanceIntelligenceAgent = lazyWithRetry(() => import('@/pages/PerformanceIntelligenceAgent').then(m => ({ default: m.PerformanceIntelligenceAgent })))
const PerformanceIntelligenceTool = lazyWithRetry(() => import('@/pages/PerformanceIntelligenceTool').then(m => ({ default: m.PerformanceIntelligenceTool })))
const QuickStart = lazyWithRetry(() => import('@/pages/QuickStart').then(m => ({ default: m.QuickStart })))
// Other pages loaded on demand
const Documents = lazyWithRetry(() => import('@/pages/Documents').then(m => ({ default: m.Documents })))
const WorkflowPage = lazyWithRetry(() => import('@/pages/WorkflowPage').then(m => ({ default: m.WorkflowPage })))
const OutputsPage = lazyWithRetry(() => import('@/pages/OutputsPage').then(m => ({ default: m.OutputsPage })))
const MetricsDashboard = lazyWithRetry(() => import('@/pages/MetricsDashboard').then(m => ({ default: m.MetricsDashboard })))
const WhiteLabelSettings = lazyWithRetry(() => import('@/pages/WhiteLabelSettings').then(m => ({ default: m.WhiteLabelSettings })))
const TeamManagement = lazyWithRetry(() => import('@/pages/TeamManagement').then(m => ({ default: m.TeamManagement })))
const BillingSettings = lazyWithRetry(() => import('@/pages/BillingSettings').then(m => ({ default: m.BillingSettings })))
const NewCampaign = lazyWithRetry(() => import('@/pages/NewCampaign').then(m => ({ default: m.NewCampaign })))
const CampaignsList = lazyWithRetry(() => import('@/pages/CampaignsList').then(m => ({ default: m.CampaignsList })))
const CampaignDetail = lazyWithRetry(() => import('@/pages/CampaignDetail').then(m => ({ default: m.CampaignDetail })))
const UserProfile = lazyWithRetry(() => import('@/pages/UserProfile').then(m => ({ default: m.UserProfile })))
const BusinessIntelligence = lazyWithRetry(() => import('@/pages/BusinessIntelligence').then(m => ({ default: m.BusinessIntelligence })))
const ResetPasswordPage = lazyWithRetry(() => import('@/pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })))
const AcceptInvitation = lazyWithRetry(() => import('@/pages/AcceptInvitation').then(m => ({ default: m.AcceptInvitation })))
const AddClient = lazyWithRetry(() => import('@/pages/AddClient'))
const EditClient = lazyWithRetry(() => import('@/pages/EditClient'))
const ClientsList = lazyWithRetry(() => import('@/pages/ClientsList').then(m => ({ default: m.ClientsList })))
const BrandComparisonPage = lazyWithRetry(() => import('@/pages/BrandComparisonPage').then(m => ({ default: m.BrandComparisonPage })))
const FeedbackPage = lazyWithRetry(() => import('@/pages/FeedbackPage').then(m => ({ default: m.FeedbackPage })))
const AgencyGuide = lazyWithRetry(() => import('@/pages/AgencyGuide').then(m => ({ default: m.AgencyGuide })))
const TasksPage = lazyWithRetry(() => import('@/pages/TasksPage').then(m => ({ default: m.TasksPage })))
const ApprovedOutputsPage = lazyWithRetry(() => import('@/pages/ApprovedOutputsPage').then(m => ({ default: m.ApprovedOutputsPage })))

// Client View pages (for external agency_client users)
const ClientReviewPage = lazyWithRetry(() => import('@/pages/ClientReviewPage').then(m => ({ default: m.ClientReviewPage })))

// Components that should load immediately (critical for auth flow)
import { WhiteLabelProvider } from '@/components/whitelabel/WhiteLabelProvider'
import { ContextConfirmation } from '@/components/agents/ContextConfirmation'
import { useContextConfirmation } from '@/hooks/useContextConfirmation'

// OAuth callback page
const AuthCallback = lazyWithRetry(() => import('@/pages/AuthCallback').then(m => ({ default: m.AuthCallback })))

// Auth pages loaded on demand
const SignUp = lazyWithRetry(() => import('@/pages/SignUp'))
const BusinessContextOnboarding = lazyWithRetry(() => import('@/pages/BusinessContextOnboarding'))
const LoginForm = lazyWithRetry(() => import('@/components/auth/LoginForm').then(m => ({ default: m.LoginForm })))
const EmailConfirmation = lazyWithRetry(() => import('@/pages/EmailConfirmation').then(m => ({ default: m.EmailConfirmation })))
const MFAVerifyPage = lazyWithRetry(() => import('@/pages/MFAVerifyPage').then(m => ({ default: m.MFAVerifyPage })))
import { useAuthStore } from '@/stores/auth'
import { useMfaStatus } from '@/hooks/useMfaStatus'
import { ROUTES } from '@/config/routes'
import { ClientLayout } from '@/components/layout/ClientLayout'
import { ClientViewLayout } from '@/components/layout/ClientViewLayout'
import { GoogleAnalytics, RouteTracker } from '@/components/analytics/GoogleAnalytics'
import { MobileMenuProvider } from '@/contexts/MobileMenuContext'
import { MobileMenuPanel } from '@/components/layout/MobileMenuPanel'
import { BottomNav } from '@/components/layout/BottomNav'
import { useTheme } from '@/hooks/useTheme'
import { AgentLayoutProvider, useAgentLayout } from '@/contexts/AgentLayoutContext'
import { LocaleTransitionOverlay } from '@/components/locale/LocaleTransitionOverlay'
import { OverLimitGate } from '@/components/billing/OverLimitGate'
import { GracePeriodModal } from '@/components/billing/GracePeriodModal'
import { GracePeriodBanner } from '@/components/billing/GracePeriodBanner'
import { GracePeriodGate } from '@/components/billing/GracePeriodGate'
import { changeLanguage, getCurrentLanguage } from '@/lib/i18n'
import { DEFAULT_LOCALE, type EnabledLocale } from '@/lib/locales'
import {
  buildLocalizedLocation,
  buildLocalizedPath,
  getPathLocale,
  NON_DEFAULT_ENABLED_LOCALES,
  shouldBypassLocalePrefix,
  stripLeadingSlash,
  stripLocalePrefix,
} from '@/lib/localePath'

// Helper component for legacy route redirects
function CampaignExecutionRedirect() {
  const { sessionId } = useParams<{ sessionId?: string }>()
  const location = useLocation()
  const routeLocale = getPathLocale(location.pathname)
  const targetPath = sessionId
    ? ROUTES.agents.campaignPlanning.session(sessionId)
    : ROUTES.agents.campaignPlanning.root
  return <Navigate to={buildLocalizedPath(routeLocale, targetPath)} replace />
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  const { isMfaEnrolled, isMfaVerified, isLoading: isMfaLoading } = useMfaStatus()
  const location = useLocation()
  const routeLocale = getPathLocale(location.pathname)
  const effectiveLocale = routeLocale === DEFAULT_LOCALE ? getCurrentLanguage() : routeLocale
  const publicPath = stripLocalePrefix(location.pathname)

  // While checking MFA status, don't redirect
  if (isMfaLoading) {
    return <PageLoadingSpinner />;
  }

  // If user is logged in and fully verified, redirect to dashboard
  if (user && (!isMfaEnrolled || isMfaVerified)) {
    return <Navigate to={buildLocalizedPath(effectiveLocale, '/dashboard')} replace />
  }

  // If user is on the MFA verify page, allow it
  if (publicPath === '/mfa-verify') {
    return <>{children}</>;
  }

  return <>{children}</>
}

function LocaleScope({ locale }: { locale: EnabledLocale | typeof DEFAULT_LOCALE }) {
  const location = useLocation()
  const navigate = useNavigate()
  const currentLanguage = getCurrentLanguage()

  useEffect(() => {
    if (shouldBypassLocalePrefix(location.pathname)) {
      return
    }

    if (locale === DEFAULT_LOCALE) {
      if (currentLanguage !== DEFAULT_LOCALE) {
        const nextPath = buildLocalizedLocation(currentLanguage, location)
        if (nextPath !== `${location.pathname}${location.search}${location.hash}`) {
          navigate(nextPath, { replace: true })
        }
      }
      return
    }

    if (currentLanguage !== locale) {
      void changeLanguage(locale)
    }
  }, [currentLanguage, locale, location, navigate])

  useEffect(() => {
    if (locale === DEFAULT_LOCALE || typeof document === 'undefined') {
      return
    }

    const handleLocalizedAnchorClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const target = event.target
      if (!(target instanceof Element)) return

      const anchor = target.closest('a[href]')
      if (!(anchor instanceof HTMLAnchorElement)) return
      if (anchor.target && anchor.target !== '_self') return
      if (anchor.hasAttribute('download')) return

      const url = new URL(anchor.href, window.location.origin)
      if (url.origin !== window.location.origin) return
      if (shouldBypassLocalePrefix(url.pathname)) return

      const nextPath = buildLocalizedLocation(locale, {
        pathname: url.pathname,
        search: url.search,
        hash: url.hash,
      })

      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`
      if (nextPath === currentPath) return

      event.preventDefault()
      navigate(nextPath)
    }

    document.addEventListener('click', handleLocalizedAnchorClick, true)
    return () => document.removeEventListener('click', handleLocalizedAnchorClick, true)
  }, [locale, navigate])

  return <ScopedAppRoutes />
}

function ScopedAppRoutes() {
  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Menu Panel - Rendered at root level to escape header stacking context */}
      <MobileMenuPanel />
      <Routes>
        {/* Landing Page - Root for non-authenticated users */}
        <Route index element={
          <PublicRoute>
            <Suspense fallback={<PageLoadingSpinner />}>
              <LandingPage />
            </Suspense>
          </PublicRoute>
        } />

        {/* Public Routes */}
        <Route path="pricing" element={<Suspense fallback={<PageLoadingSpinner />}><PricingPage /></Suspense>} />
        <Route path="blog" element={<Suspense fallback={<PageLoadingSpinner />}><BlogList /></Suspense>} />
        <Route path="blog/:slug" element={<Suspense fallback={<PageLoadingSpinner />}><BlogPost /></Suspense>} />
        <Route path="terms" element={<Suspense fallback={<PageLoadingSpinner />}><Terms /></Suspense>} />
        <Route path="privacy" element={<Suspense fallback={<PageLoadingSpinner />}><Privacy /></Suspense>} />
        <Route path="contact" element={<Suspense fallback={<PageLoadingSpinner />}><Contact /></Suspense>} />
        <Route path="request-invitation" element={
          <PublicRoute>
            <Suspense fallback={<PageLoadingSpinner />}>
              <RequestInvitation />
            </Suspense>
          </PublicRoute>
        } />

        <Route path={stripLeadingSlash(ROUTES.auth.login)} element={
          <PublicRoute>
            <Suspense fallback={<PageLoadingSpinner />}>
              <LoginForm />
            </Suspense>
          </PublicRoute>
        } />
        <Route path="mfa-verify" element={<Suspense fallback={<PageLoadingSpinner />}><MFAVerifyPage /></Suspense>} />
        <Route path={stripLeadingSlash(ROUTES.auth.signup)} element={
          <PublicRoute>
            <Suspense fallback={<PageLoadingSpinner />}>
              <SignUp />
            </Suspense>
          </PublicRoute>
        } />
        <Route path="auth/callback" element={<Suspense fallback={<PageLoadingSpinner />}><AuthCallback /></Suspense>} />
        <Route path="email-confirmation" element={<Suspense fallback={<PageLoadingSpinner />}><EmailConfirmation /></Suspense>} />
        <Route path="reset-password" element={<Suspense fallback={<PageLoadingSpinner />}><ResetPasswordPage /></Suspense>} />
        <Route path="accept-invitation/:token" element={<Suspense fallback={<PageLoadingSpinner />}><AcceptInvitation /></Suspense>} />

        {/* Protected Routes with onboarding */}
        <Route path={stripLeadingSlash(ROUTES.onboarding.businessContext)} element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoadingSpinner />}>
              <BusinessContextOnboarding />
            </Suspense>
          </ProtectedRoute>
        } />

        {/* Client Portal - Simplified layout for external agency_client users */}
        <Route path="portal/:clientSlug" element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoadingSpinner />}>
              <ClientViewLayout />
            </Suspense>
          </ProtectedRoute>
        }>
          <Route index element={<ClientReviewPage />} />
          <Route path="approved" element={<ApprovedOutputsPage />} />
          <Route path="profile" element={<UserProfile />} />
          <Route path="feedback" element={<FeedbackPage />} />
          <Route path="outputs/:outputId" element={<OutputsPage />} />
        </Route>

        {/* Protected Routes */}
        <Route path="*" element={
          <ProtectedRoute>
            <ProtectedAppLayout>
              <Suspense fallback={<PageLoadingSpinner />}>
                <Routes>
                  <Route path={stripLeadingSlash(ROUTES.dashboard.root)} element={<Dashboard />} />
                  <Route path={stripLeadingSlash(ROUTES.campaigns.list)} element={<CampaignsList />} />
                  <Route path={stripLeadingSlash(ROUTES.campaigns.new)} element={<NewCampaign />} />
                  <Route path={stripLeadingSlash(ROUTES.campaigns.detail(':id'))} element={<CampaignDetail />} />
                  <Route path={stripLeadingSlash(ROUTES.clients.list)} element={
                    <RoleProtectedRoute allowedOrgTypes={['AGENCY']}>
                      <ClientsList />
                    </RoleProtectedRoute>
                  } />
                  <Route path={stripLeadingSlash(ROUTES.clients.new)} element={
                    <RoleProtectedRoute allowedOrgTypes={['AGENCY']}>
                      <AddClient />
                    </RoleProtectedRoute>
                  } />
                  <Route path="clients/:clientSlug/edit" element={
                    <RoleProtectedRoute allowedOrgTypes={['AGENCY']}>
                      <EditClient />
                    </RoleProtectedRoute>
                  } />

                  {/* Client-Contextual Routes - All routes under /clients/:clientSlug/* */}
                  <Route path="clients/:clientSlug" element={
                    <RoleProtectedRoute allowedOrgTypes={['AGENCY']}>
                      <ClientLayout />
                    </RoleProtectedRoute>
                  }>
                    <Route index element={<Dashboard />} />
                    <Route path="campaigns" element={<CampaignsList />} />
                    <Route path="campaigns/new" element={<NewCampaign />} />
                    <Route path="campaigns/:campaignId" element={<CampaignDetail />} />
                    <Route path="agents/strategy/*" element={<StrategyAgent />} />
                    <Route path="agents/persona/*" element={<PersonaAgent />} />
                    <Route path="agents/persona/interview/*" element={<PersonaInterview />} />
                    <Route path="agents/marketing-strategy/*" element={<MarketingStrategyPage />} />
                    <Route path="agents/content/*" element={<ContentAgent />} />
                    <Route path="content/tool/*" element={<ContentAgent />} />
                    <Route path="agents/campaign-planning/*" element={<CampaignExecutionAgent />} />
                    <Route path="agents/competitive-intelligence/*" element={<CompetitiveIntelligenceAgent />} />
                    <Route path="agents/client-success/*" element={<ClientSuccessAgent />} />
                    <Route path="agents/performance-intelligence/*" element={<PerformanceIntelligenceAgent />} />
                    <Route path="agents/quick-start/*" element={<QuickStart />} />
                    <Route path="performance-intelligence/tool/:toolId" element={<PerformanceIntelligenceTool />} />
                    <Route path="outputs" element={<OutputsPage />} />
                    <Route path="outputs/:outputId" element={<OutputsPage />} />
                    <Route path="intelligence" element={<BusinessIntelligence />} />
                    <Route path="approvals" element={<ApprovedOutputsPage />} />
                  </Route>

                  <Route path="strategy/*" element={<StrategyAgent />} />
                  <Route path="persona/*" element={<PersonaAgent />} />
                  <Route path="persona/interview/*" element={<PersonaInterview />} />
                  <Route path="marketing-strategy/*" element={<MarketingStrategyPage />} />
                  <Route path="content/*" element={<ContentAgent />} />
                  <Route path="campaign-planning/*" element={<CampaignExecutionAgent />} />
                  <Route path="campaign-execution" element={<CampaignExecutionRedirect />} />
                  <Route path="campaign-execution/session/:sessionId" element={<CampaignExecutionRedirect />} />
                  <Route path="competitive-intelligence/*" element={<CompetitiveIntelligenceAgent />} />
                  <Route path="client-success/*" element={<ClientSuccessAgent />} />
                  <Route path="performance-intelligence/*" element={<PerformanceIntelligenceAgent />} />
                  <Route path="performance-intelligence/tool/:toolId" element={<PerformanceIntelligenceTool />} />
                  <Route path="quick-start/*" element={<QuickStart />} />
                  <Route path={stripLeadingSlash(ROUTES.documents.root)} element={<Documents />} />
                  <Route path={stripLeadingSlash(ROUTES.workflow.root)} element={<WorkflowPage />} />
                  <Route path={stripLeadingSlash(ROUTES.outputs.root)} element={<OutputsPage />} />
                  <Route path={stripLeadingSlash(ROUTES.outputs.detail(':outputId'))} element={<OutputsPage />} />
                  <Route path={stripLeadingSlash(ROUTES.intelligence.root)} element={<BusinessIntelligence />} />
                  <Route path={stripLeadingSlash(ROUTES.metrics.root)} element={<MetricsDashboard />} />
                  <Route path={stripLeadingSlash(ROUTES.settings.whiteLabel)} element={
                    <RoleProtectedRoute allowedOrgTypes={['AGENCY']}>
                      <WhiteLabelSettings />
                    </RoleProtectedRoute>
                  } />
                  <Route path={stripLeadingSlash(ROUTES.settings.team)} element={
                    <RoleProtectedRoute requiredPermissions={['users.invite', 'users.manage']}>
                      <TeamManagement />
                    </RoleProtectedRoute>
                  } />
                  <Route path={stripLeadingSlash(ROUTES.settings.billing)} element={<BillingSettings />} />
                  <Route path={stripLeadingSlash(ROUTES.profile)} element={<UserProfile />} />
                  <Route path="feedback" element={<FeedbackPage />} />
                  <Route path="agency-guide" element={
                    <RoleProtectedRoute allowedOrgTypes={['AGENCY']}>
                      <AgencyGuide />
                    </RoleProtectedRoute>
                  } />
                  <Route path={stripLeadingSlash(ROUTES.brand.comparison)} element={<BrandComparisonPage />} />
                  <Route path={stripLeadingSlash(ROUTES.collaboration.tasks)} element={<TasksPage />} />
                  <Route path={stripLeadingSlash(ROUTES.collaboration.approvals)} element={
                    <RoleProtectedRoute allowedOrgTypes={['SME']}>
                      <ApprovedOutputsPage />
                    </RoleProtectedRoute>
                  } />
                </Routes>
              </Suspense>
            </ProtectedAppLayout>
          </ProtectedRoute>
        } />
      </Routes>
      <Toaster />
      <LocaleTransitionOverlay />
    </div>
  )
}

// FooterWrapper - Uses AgentLayoutContext to hide footer on agent pages
function FooterWrapper() {
  const agentLayout = useAgentLayout();

  // Hide footer on agent pages when in chat mode
  if (agentLayout?.hideFooter) {
    return null;
  }

  return (
    <div className="hidden md:block">
      <PublicFooter />
    </div>
  );
}

// ProtectedAppLayout - Main layout wrapper for protected routes
function ProtectedAppLayout({ children }: { children: React.ReactNode }) {
  const { pendingContexts, approveContext, rejectContext } = useContextConfirmation();
  const agentLayout = useAgentLayout();

  // Use min-h-screen for all pages - let pages handle their own scrolling
  // isAgentPage is only used for padding/footer visibility, not height constraints
  const layoutClass = "flex flex-col min-h-screen";

  return (
    <WhiteLabelProvider>
      <div className={layoutClass}>
        <GracePeriodModal />
        <HeaderNew />
        <GracePeriodBanner />
        <ContextBreadcrumbs />
        <CommandPalette />
        <main className={`flex-1 min-h-0 ${agentLayout?.isAgentPage ? 'pb-0' : 'pb-16'} md:pb-0`}>
          <OverLimitGate>
            <GracePeriodGate>
              {children}
            </GracePeriodGate>
          </OverLimitGate>
        </main>

        {/* Bottom Navigation - Mobile Only */}
        <BottomNav />

        {/* Footer - Hidden on mobile, shown on desktop, hidden on agent pages */}
        <FooterWrapper />

        {/* Context Confirmation Dialog */}
        {pendingContexts.length > 0 && (
          <ContextConfirmation
            extractedContext={pendingContexts[0]}
            onApprove={approveContext}
            onReject={rejectContext}
            onClose={() => {
              // For now, just approve to close (could add "remind later" functionality)
              rejectContext(pendingContexts[0].id)
            }}
          />
        )}
      </div>
    </WhiteLabelProvider>
  );
}

function AppContent() {
  // Initialize theme from localStorage on app load
  useTheme()

  return (
    <MobileMenuProvider>
      <Router>
        <RouteTracker />
        <AgentLayoutProvider>
          <Routes>
            {NON_DEFAULT_ENABLED_LOCALES.map((locale) => (
              <Route
                key={locale}
                path={`${locale}/*`}
                element={<LocaleScope locale={locale} />}
              />
            ))}
            <Route path="*" element={<LocaleScope locale={DEFAULT_LOCALE} />} />
          </Routes>
        </AgentLayoutProvider>
    </Router>
    </MobileMenuProvider>
  )
}

function App() {
  const gaId = import.meta.env.VITE_GA_ID;

  return (
    <QueryClientProvider client={queryClient}>
      {/* ARIA live region for screen reader navigation announcements */}
      <div
        id="route-announcer"
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      />
      <AppContent />
      {gaId && <GoogleAnalytics measurementId={gaId} />}
    </QueryClientProvider>
  )
}

export default App
