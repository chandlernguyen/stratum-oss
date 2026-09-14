import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'
import { Mail, Lock, AlertCircle, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { ForgotPasswordModal } from './ForgotPasswordModal'
import { useLocalizedNavigate } from '@/hooks/useLocalizedNavigate'
import { useLocalizedPath } from '@/hooks/useLocalizedPath'

export function LoginForm() {
  const { t } = useTranslation('auth')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const turnstileRef = useRef<TurnstileInstance>(null)

  const navigate = useLocalizedNavigate()
  const { localizePath } = useLocalizedPath()
  const { signIn, signInWithOAuth, setSession, loading } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const result = await signIn(email, password, captchaToken ?? undefined)

    if (result.error) {
      setError(result.error)
      turnstileRef.current?.reset()
      setCaptchaToken(null)
    } else if (result.session && result.user) {
      // Password authentication successful - Supabase session created at AAL1
      console.log('=== Login successful - checking MFA requirements ===')

      // Check AAL level and enrolled factors
      try {
        const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
        const currentLevel = data?.currentLevel
        const nextLevel = data?.nextLevel

        console.log('Current AAL:', currentLevel)
        console.log('Next AAL:', nextLevel)

        // If nextLevel is aal2, user has MFA enrolled and needs to verify
        if (nextLevel === 'aal2' && currentLevel === 'aal1') {
          console.log('✅ MFA verification required (AAL1 → AAL2)')

          // Get the factor ID for the challenge
          const { data: factorsData } = await supabase.auth.mfa.listFactors()
          const verifiedFactors = factorsData?.totp?.filter((factor) => factor.status === 'verified') || []

          if (verifiedFactors.length > 0) {
            console.log('Factor ID:', verifiedFactors[0].id)
            console.log('Navigating to /mfa-verify route')

            // Navigate to dedicated MFA verification route
            // This prevents ProtectedRoute from redirecting to dashboard
            navigate('/mfa-verify', {
              state: { factorId: verifiedFactors[0].id },
              replace: true
            })
          } else {
            // No verified factors found - proceed to dashboard
            console.log('❌ No verified factors, proceeding to dashboard')
            setSession(result.user, result.session)
            navigate('/dashboard')
          }
        } else {
          // No MFA required (already at AAL2 or no factors enrolled)
          console.log('❌ No MFA required, proceeding to dashboard')
          setSession(result.user, result.session)
          navigate('/dashboard')
        }
      } catch (err) {
        console.error('MFA check error:', err)
        // Continue to dashboard on error
        setSession(result.user, result.session)
        navigate('/dashboard')
      }
    }
  }

  // Helper to fill test user credentials
  const fillTestUser = (email: string) => {
    setEmail(email)
    setPassword('LocalDevOnly123!')
  }

  // SME Test Users (5 roles)
  const smeUsers = [
    { label: 'Owner', email: 'sme.owner@example.com' },
    { label: 'Director', email: 'sme.director@example.com' },
    { label: 'Manager', email: 'sme.manager@example.com' },
    { label: 'Analyst', email: 'sme.analyst@example.com' },
    { label: 'Viewer', email: 'sme.viewer@example.com' },
  ]

  // Agency Test Users (10 roles)
  const agencyUsers = [
    { label: 'Owner', email: 'agency.owner@example.com' },
    { label: 'Admin', email: 'agency.admin@example.com' },
    { label: 'Strategist', email: 'agency.strategist@example.com' },
    { label: 'Acct Mgr', email: 'agency.account.manager@example.com', tooltip: 'Assigned to Test Client Co only' },
    { label: 'Camp Mgr', email: 'agency.campaign.manager@example.com' },
    { label: 'Analyst', email: 'agency.analyst@example.com' },
    { label: 'Creative', email: 'agency.creative@example.com' },
    { label: 'Client View', email: 'agency.client.viewer@example.com', tooltip: 'Assigned to Test Client Co only' },
    { label: 'Freelancer', email: 'agency.freelancer@example.com', tooltip: 'Assigned to Test Startup XYZ only' },
    { label: 'Viewer', email: 'agency.viewer@example.com' },
  ]

  // Onboarding Test Users (blank slate - NO business context)
  const onboardingUsers = [
    { label: 'SME Onboard', email: 'sme.onboarding@example.com' },
    { label: 'Agency Onboard', email: 'agency.onboarding@example.com' },
  ]

  // External Client (Client Portal - agency_client role)
  const externalClientUser = { label: 'Client Portal', email: 'client.contact@example.com' }

  // Billing Test Users (7 subscription states — every tier × trial/active)
  const billingUsers = [
    { label: 'Free', email: 'billing.free@example.com', desc: 'free/inactive' },
    { label: 'Solo Trial', email: 'billing.solo.trial@example.com', desc: 'solo/trial' },
    { label: 'Solo', email: 'billing.solo@example.com', desc: 'solo/active $29' },
    { label: 'Team Trial', email: 'billing.team.trial@example.com', desc: 'team/trial' },
    { label: 'Team', email: 'billing.team@example.com', desc: 'team/active $79' },
    { label: 'Agency Trial', email: 'billing.agency.trial@example.com', desc: 'agency/trial' },
    { label: 'Agency', email: 'billing.agency@example.com', desc: 'agency/active $199' },
    { label: 'Expired', email: 'billing.expired@example.com', desc: 'trial expired' },
    { label: 'Past Due', email: 'billing.pastdue@example.com', desc: 'payment failed' },
  ]

  // Pre-fill with TechFlow test user (sarah.chen@techflow.test) for Quick Start testing
  const fillTechFlowUser = () => {
    setEmail('sarah.chen@techflow.test')
    setPassword('TechFlow2024abc')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50">
      <PublicHeader />
      <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center p-4">
        <div className="w-full max-w-md">

        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-6">
            <CardTitle className="text-2xl font-semibold text-center text-brand-charcoal">
              {t('signIn.title')}
            </CardTitle>
            <CardDescription className="text-center text-brand-slate">
              {t('signIn.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-6">
            {/* OAuth Buttons */}
            <div className="space-y-3 mb-6">
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 text-base font-medium border-gray-200 hover:bg-gray-50 transition-all duration-200"
                onClick={() => signInWithOAuth('google')}
                disabled={loading}
              >
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                {t('signIn.googleButton')}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 text-base font-medium border-gray-200 hover:bg-gray-50 transition-all duration-200"
                onClick={() => signInWithOAuth('apple')}
                disabled={loading}
              >
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
                {t('signIn.appleButton')}
              </Button>
            </div>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-muted-foreground dark:bg-card">
                  {t('signIn.orContinueWith')}
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-brand-charcoal flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  {t('signIn.emailLabel')}
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('signIn.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 text-base transition-all duration-200 border-gray-200 focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium text-brand-charcoal flex items-center gap-2">
                    <Lock className="h-4 w-4 text-gray-400" />
                    {t('signIn.passwordLabel')}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPasswordModal(true)}
                    className="text-sm text-brand-gold hover:text-brand-gold font-medium transition-colors"
                  >
                    {t('signIn.forgotPassword')}
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder={t('signIn.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 text-base transition-all duration-200 border-gray-200 focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20"
                />
              </div>
              
              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-brand-error" />
                  <AlertDescription className="text-brand-error">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {/* Turnstile Captcha (managed mode — invisible unless suspicious) */}
              {import.meta.env.VITE_TURNSTILE_SITE_KEY && (
                <Turnstile
                  ref={turnstileRef}
                  siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
                  onSuccess={setCaptchaToken}
                  options={{ size: 'flexible' }}
                />
              )}

              <div className="space-y-3 pt-2">
                <Button
                  type="submit"
                  className="w-full h-11 text-base font-medium bg-gradient-to-r from-slate-600 to-amber-600 hover:from-slate-700 hover:to-amber-700 text-white transition-all duration-200 shadow-sm hover:shadow-md"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('signIn.submittingButton')}
                    </>
                  ) : (
                    t('signIn.submitButton')
                  )}
                </Button>

                {import.meta.env.DEV && (
                  <div className="space-y-3 pt-2 border-t border-gray-200">
                    {/* SME Test Users (5 roles) */}
                    <p className="text-xs font-medium text-gray-500 text-center pt-2">SME Test Users (5 roles)</p>
                    <div className="grid grid-cols-5 gap-1">
                      {smeUsers.map((user) => (
                        <Button
                          key={user.email}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-[10px] font-medium border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 px-1"
                          onClick={() => fillTestUser(user.email)}
                          title={user.email}
                        >
                          {user.label}
                        </Button>
                      ))}
                    </div>

                    {/* Agency Test Users (10 roles) */}
                    <p className="text-xs font-medium text-gray-500 text-center pt-2">Agency Test Users (10 roles)</p>
                    <div className="grid grid-cols-5 gap-1">
                      {agencyUsers.map((user) => (
                        <Button
                          key={user.email}
                          type="button"
                          variant="outline"
                          size="sm"
                          className={`text-[10px] font-medium border-gray-200 hover:bg-purple-50 hover:border-purple-300 transition-all duration-200 px-1 ${user.tooltip ? 'border-dashed' : ''}`}
                          onClick={() => fillTestUser(user.email)}
                          title={user.tooltip || user.email}
                        >
                          {user.label}
                        </Button>
                      ))}
                    </div>

                    {/* Onboarding Test Users (blank slate) */}
                    <p className="text-xs font-medium text-gray-500 text-center pt-2">Onboarding (Blank Slate)</p>
                    <div className="grid grid-cols-2 gap-2">
                      {onboardingUsers.map((user) => (
                        <Button
                          key={user.email}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-xs font-medium border-gray-200 hover:bg-green-50 hover:border-green-300 transition-all duration-200"
                          onClick={() => fillTestUser(user.email)}
                          title={user.email}
                        >
                          {user.label}
                        </Button>
                      ))}
                    </div>

                    {/* External Client Portal User */}
                    <p className="text-xs font-medium text-gray-500 text-center pt-2">External Client Portal</p>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-9 text-sm font-medium border-amber-400 bg-amber-50 hover:bg-amber-100 hover:border-amber-500 text-amber-700 transition-all duration-200"
                      onClick={() => fillTestUser(externalClientUser.email)}
                      title="External client contact - routes to /portal/test-client-co with simplified view"
                    >
                      {externalClientUser.label} (Test Client Co)
                    </Button>

                    {/* Billing Test Users (subscription states) */}
                    <p className="text-xs font-medium text-gray-500 text-center pt-2">Billing Test Users</p>
                    <div className="grid grid-cols-4 gap-1">
                      {billingUsers.map((user) => (
                        <Button
                          key={user.email}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-[10px] font-medium border-gray-200 hover:bg-emerald-50 hover:border-emerald-300 transition-all duration-200 px-1"
                          onClick={() => fillTestUser(user.email)}
                          title={`${user.email} (${user.desc})`}
                        >
                          {user.label}
                        </Button>
                      ))}
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-9 text-sm font-medium border-amber-300 hover:bg-slate-50 text-brand-charcoal hover:text-brand-charcoal transition-all duration-200"
                      onClick={fillTechFlowUser}
                    >
                      Sarah Chen (TechFlow)
                    </Button>
                  </div>
                )}
              </div>
            </form>
          </CardContent>
          <CardFooter className="border-t border-gray-100 bg-gray-50/50 py-4">
            <p className="text-sm text-brand-slate text-center w-full">
              {t('signIn.noAccount')}{' '}
              <Link
                to={localizePath('/signup')}
                className="font-semibold text-brand-gold hover:text-brand-gold transition-colors"
              >
                {t('signIn.signUpLink')}
              </Link>
            </p>
          </CardFooter>
        </Card>

        </div>
      </div>
      <PublicFooter />

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        open={showForgotPasswordModal}
        onOpenChange={setShowForgotPasswordModal}
      />
    </div>
  )
}
