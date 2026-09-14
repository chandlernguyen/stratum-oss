import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Building2, Users, ArrowRight, Loader2, Check, X, CheckCircle2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import { api } from '@/lib/api'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { useLocalizedNavigate } from '@/hooks/useLocalizedNavigate'
import { useLocalizedPath } from '@/hooks/useLocalizedPath'


interface SignUpFormData {
  email: string
  password: string
  confirmPassword: string
  organizationName: string
  organizationType: 'SME' | 'AGENCY'
}

export function SignUpForm() {
  const { t } = useTranslation('auth')
  const navigate = useLocalizedNavigate()
  const { localizePath } = useLocalizedPath()
  const { signUp, signInWithOAuth, loading } = useAuthStore()
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const turnstileRef = useRef<TurnstileInstance>(null)

  const [formData, setFormData] = useState<SignUpFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    organizationName: '',
    organizationType: 'SME'
  })

  const [error, setError] = useState('')
  const [validationErrors, setValidationErrors] = useState<Partial<SignUpFormData>>({})
  const [organizationSlug, setOrganizationSlug] = useState('')

  // Fetch slug preview when organization name changes
  useEffect(() => {
    const fetchSlugPreview = async () => {
      if (formData.organizationName.length >= 2) {
        try {
          const response = await api.post('/api/v1/organizations/generate-slug', {
            name: formData.organizationName
          })

          if (response.data?.data?.slug) {
            setOrganizationSlug(response.data.data.slug)
          }
        } catch (err) {
          // Silently fail - slug preview is not critical
          console.error('Failed to fetch slug preview:', err)
        }
      } else {
        setOrganizationSlug('')
      }
    }

    // Debounce the API call
    const timer = setTimeout(fetchSlugPreview, 500)
    return () => clearTimeout(timer)
  }, [formData.organizationName])

  const validateForm = (): boolean => {
    const errors: Partial<SignUpFormData> = {}

    // Email validation
    if (!formData.email) {
      errors.email = t('errors.emailRequired')
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = t('errors.invalidEmail')
    }

    // Password validation
    if (!formData.password) {
      errors.password = t('errors.passwordRequired')
    } else if (formData.password.length < 10) {
      errors.password = t('errors.weakPassword')
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = t('errors.passwordRequirements')
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = t('errors.confirmPasswordRequired')
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = t('errors.passwordMismatch')
    }

    // Organization name validation
    if (!formData.organizationName) {
      errors.organizationName = t('errors.organizationNameRequired')
    } else if (formData.organizationName.length < 2) {
      errors.organizationName = t('errors.organizationNameTooShort')
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!validateForm()) {
      return
    }

    // Proceed with signup
    const result = await signUp(
      formData.email,
      formData.password,
      formData.organizationName,
      formData.organizationType,
      organizationSlug, // Pass the generated slug
      captchaToken ?? undefined
    )

    if (result.error) {
      setError(result.error)
      turnstileRef.current?.reset()
      setCaptchaToken(null)
    } else if (result.user) {
      // Store org type for the business context wizard to know which flow to use
      localStorage.setItem('signup_org_type', formData.organizationType)
      localStorage.setItem('signup_org_name', formData.organizationName)
      localStorage.setItem('signup_org_slug', organizationSlug || '')

      // Check if email confirmation is required
      // If session is null, user needs to confirm email first
      if (!result.session) {
        // Email confirmation required - redirect to confirmation page
        navigate({
          pathname: '/email-confirmation',
          search: `?email=${encodeURIComponent(formData.email)}`,
        })
      } else {
        // Email already confirmed or confirmation disabled - proceed to onboarding
        if (formData.organizationType === 'SME') {
          navigate('/onboarding/business-context')
        } else {
          // Agency users go straight to dashboard (they'll add clients later)
          navigate('/dashboard')
        }
      }
    }
  }

  const handleInputChange = (field: keyof SignUpFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // Clear validation error for this field when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: undefined }))
    }

    // Special handling for confirm password - show real-time feedback
    if (field === 'confirmPassword' && value) {
      if (formData.password && value !== formData.password) {
        setValidationErrors(prev => ({ ...prev, confirmPassword: t('errors.passwordMismatch') }))
      } else {
        setValidationErrors(prev => ({ ...prev, confirmPassword: undefined }))
      }
    }

    // Also check confirm password when password field changes
    if (field === 'password' && formData.confirmPassword) {
      if (value !== formData.confirmPassword) {
        setValidationErrors(prev => ({ ...prev, confirmPassword: t('errors.passwordMismatch') }))
      } else {
        setValidationErrors(prev => ({ ...prev, confirmPassword: undefined }))
      }
    }
  }

  return (
    <div className="min-h-screen">
      <PublicHeader />
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
        <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-semibold">{t('signUp.title')}</CardTitle>
          <CardDescription className="text-base">
            {t('signUp.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              {t('signUp.googleButton')}
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
              {t('signUp.appleButton')}
            </Button>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-muted-foreground dark:bg-card">
                {t('signUp.orContinueWith')}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="font-medium">{t('signUp.emailLabel')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('signUp.emailPlaceholder')}
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                disabled={loading}
                className={validationErrors.email ? 'border-destructive' : ''}
              />
              {validationErrors.email && (
                <p className="text-sm text-destructive">{validationErrors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="font-medium">{t('signUp.passwordLabel')}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t('signUp.passwordPlaceholder')}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                disabled={loading}
                className={validationErrors.password ? 'border-destructive' : ''}
              />
              {validationErrors.password && (
                <p className="text-sm text-destructive">{validationErrors.password}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {t('signUp.passwordHelp')}
              </p>
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="font-medium">{t('signUp.confirmPasswordLabel')}</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder={t('signUp.confirmPasswordPlaceholder')}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  disabled={loading}
                  className={validationErrors.confirmPassword ? 'border-destructive pr-10' : 'pr-10'}
                />
                {formData.confirmPassword && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    {formData.password === formData.confirmPassword ? (
                      <Check className="h-5 w-5 text-green-500" />
                    ) : (
                      <X className="h-5 w-5 text-destructive" />
                    )}
                  </div>
                )}
              </div>
              {validationErrors.confirmPassword && (
                <p className="text-sm text-destructive">{validationErrors.confirmPassword}</p>
              )}
              {formData.confirmPassword && formData.password === formData.confirmPassword && (
                <p className="text-sm text-green-600">{t('signUp.passwordsMatch')}</p>
              )}
            </div>

            {/* Organization Name Field */}
            <div className="space-y-2">
              <Label htmlFor="organizationName" className="font-medium">{t('signUp.organizationNameLabel')}</Label>
              <Input
                id="organizationName"
                type="text"
                placeholder={t('signUp.organizationNamePlaceholder')}
                value={formData.organizationName}
                onChange={(e) => handleInputChange('organizationName', e.target.value)}
                disabled={loading}
                className={validationErrors.organizationName ? 'border-destructive' : ''}
              />
              {validationErrors.organizationName && (
                <p className="text-sm text-destructive">{validationErrors.organizationName}</p>
              )}
              {organizationSlug && (
                <div className="text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded">
                  <span>{t('signUp.slugPreview')} </span>
                  <span className="font-mono font-semibold">{organizationSlug}</span>
                </div>
              )}
            </div>

            {/* Organization Type Selection */}
            <div className="space-y-3">
              <Label className="font-medium">{t('signUp.organizationTypeLabel')}</Label>
              <div className="space-y-3">
                {/* SME Option */}
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, organizationType: 'SME' }))}
                  disabled={loading}
                  className={`w-full text-left rounded-lg border-2 p-4 transition-all duration-200 ${
                    formData.organizationType === 'SME'
                      ? 'border-[#F59E0B] bg-[#F59E0B]/5 shadow-md'
                      : 'border-gray-200 hover:border-[#64748B] hover:shadow-sm'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 font-semibold text-base mb-1">
                        <Building2 className="h-5 w-5 text-[#64748B]" />
                        <span className="text-gray-900 dark:text-gray-100">{t('signUp.organizationTypes.sme.title')}</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 ml-7">
                        {t('signUp.organizationTypes.sme.description')}
                      </p>
                    </div>
                    {formData.organizationType === 'SME' && (
                      <CheckCircle2 className="h-6 w-6 text-[#F59E0B] flex-shrink-0 ml-2" />
                    )}
                  </div>
                </button>

                {/* Agency Option */}
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, organizationType: 'AGENCY' }))}
                  disabled={loading}
                  className={`w-full text-left rounded-lg border-2 p-4 transition-all duration-200 ${
                    formData.organizationType === 'AGENCY'
                      ? 'border-[#F59E0B] bg-[#F59E0B]/5 shadow-md'
                      : 'border-gray-200 hover:border-[#64748B] hover:shadow-sm'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 font-semibold text-base mb-1">
                        <Users className="h-5 w-5 text-[#64748B]" />
                        <span className="text-gray-900 dark:text-gray-100">{t('signUp.organizationTypes.agency.title')}</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 ml-7">
                        {t('signUp.organizationTypes.agency.description')}
                      </p>
                    </div>
                    {formData.organizationType === 'AGENCY' && (
                      <CheckCircle2 className="h-6 w-6 text-[#F59E0B] flex-shrink-0 ml-2" />
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* Turnstile Captcha (managed mode — invisible unless suspicious) */}
            {import.meta.env.VITE_TURNSTILE_SITE_KEY && (
              <Turnstile
                ref={turnstileRef}
                siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
                onSuccess={setCaptchaToken}
                options={{ size: 'flexible' }}
              />
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              variant="stratum"
              className="w-full"
              disabled={loading}
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('signUp.submittingButton')}
                </>
              ) : (
                <>
                  {t('signUp.submitButton')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            {t('signUp.hasAccount')}{' '}
            <Link
              to={localizePath('/login')}
              className="font-semibold text-[#F59E0B] hover:text-[#D97706] hover:underline transition-colors"
            >
              {t('signUp.signInLink')}
            </Link>
          </p>
        </CardFooter>
      </Card>
      </div>
      <PublicFooter />
    </div>
  )
}
