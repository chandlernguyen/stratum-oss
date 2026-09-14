import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, Key, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import zxcvbn from 'zxcvbn'
import { useLocalizedNavigate } from '@/hooks/useLocalizedNavigate'

export function ResetPasswordPage() {
  const { t } = useTranslation('auth')
  const navigate = useLocalizedNavigate()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isVerifying, setIsVerifying] = useState(true)
  const [isValid, setIsValid] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState<ReturnType<typeof zxcvbn> | null>(null)

  // Verify the user is authenticated (came from email link)
  useEffect(() => {
    const verifySession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error || !session) {
          toast.error(t('resetPasswordPage.errors.invalidLink'), {
            description: t('resetPasswordPage.errors.requestNewLink'),
          })
          setIsValid(false)
          setIsVerifying(false)
          // Redirect to login after 3 seconds
          setTimeout(() => navigate('/login'), 3000)
          return
        }

        setIsValid(true)
        setIsVerifying(false)
      } catch (error) {
        console.error('Session verification error:', error)
        setIsValid(false)
        setIsVerifying(false)
      }
    }

    verifySession()
  }, [navigate])

  // Calculate password strength
  useEffect(() => {
    if (newPassword) {
      setPasswordStrength(zxcvbn(newPassword))
    } else {
      setPasswordStrength(null)
    }
  }, [newPassword])

  const getStrengthColor = (score: number) => {
    switch (score) {
      case 0:
      case 1:
        return 'bg-red-500'
      case 2:
        return 'bg-orange-500'
      case 3:
        return 'bg-yellow-500'
      case 4:
        return 'bg-green-500'
      default:
        return 'bg-gray-300'
    }
  }

  const getStrengthText = (score: number) => {
    switch (score) {
      case 0:
        return t('resetPasswordPage.strength.veryWeak')
      case 1:
        return t('resetPasswordPage.strength.weak')
      case 2:
        return t('resetPasswordPage.strength.fair')
      case 3:
        return t('resetPasswordPage.strength.good')
      case 4:
        return t('resetPasswordPage.strength.strong')
      default:
        return ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!newPassword || !confirmPassword) {
      toast.error(t('resetPasswordPage.errors.fillAllFields'))
      return
    }

    if (newPassword.length < 15) {
      toast.error(t('resetPasswordPage.errors.minLength'))
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error(t('errors.passwordMismatch'))
      return
    }

    // Check password strength
    if (passwordStrength && passwordStrength.score < 2) {
      toast.error(t('resetPasswordPage.errors.tooWeak'))
      return
    }

    setIsSubmitting(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        toast.error(t('resetPasswordPage.errors.failed'), {
          description: error.message,
        })
        setIsSubmitting(false)
        return
      }

      toast.success(t('resetPasswordPage.success.title'), {
        description: t('resetPasswordPage.success.description'),
      })

      // Redirect to dashboard after successful password reset
      setTimeout(() => navigate('/dashboard'), 2000)
    } catch (error) {
      console.error('Password reset error:', error)
      toast.error(t('resetPasswordPage.errors.unexpected'), {
        description: t('resetPasswordPage.errors.tryAgainLater'),
      })
      setIsSubmitting(false)
    }
  }

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">{t('resetPasswordPage.verifying')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              {t('resetPasswordPage.invalid.title')}
            </CardTitle>
            <CardDescription>
              {t('resetPasswordPage.invalid.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {t('resetPasswordPage.invalid.requestNew')}
            </p>
            <Button onClick={() => navigate('/login')} className="w-full">
              {t('resetPasswordPage.invalid.goToLogin')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            {t('resetPasswordPage.title')}
          </CardTitle>
          <CardDescription>
            {t('resetPasswordPage.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="newPassword">{t('resetPasswordPage.newPasswordLabel')}</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t('resetPasswordPage.newPasswordPlaceholder')}
                  disabled={isSubmitting}
                  autoFocus
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  disabled={isSubmitting}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>

              {/* Password Strength Indicator */}
              {passwordStrength && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${getStrengthColor(passwordStrength.score)}`}
                        style={{ width: `${(passwordStrength.score + 1) * 20}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">
                      {getStrengthText(passwordStrength.score)}
                    </span>
                  </div>

                  {/* Password Feedback */}
                  {passwordStrength.feedback.warning && (
                    <div className="flex items-start gap-2 text-xs text-orange-600">
                      <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span>{passwordStrength.feedback.warning}</span>
                    </div>
                  )}

                  {passwordStrength.feedback.suggestions.length > 0 && (
                    <div className="space-y-1">
                      {passwordStrength.feedback.suggestions.map((suggestion, index) => (
                        <div key={index} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span>{suggestion}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('resetPasswordPage.confirmPasswordLabel')}</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('resetPasswordPage.confirmPasswordPlaceholder')}
                  disabled={isSubmitting}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isSubmitting}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>

              {/* Password Match Indicator */}
              {confirmPassword && newPassword && (
                <div className="flex items-center gap-2 text-xs">
                  {confirmPassword === newPassword ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-green-600" />
                      <span className="text-green-600">{t('resetPasswordPage.passwordsMatch')}</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3 text-red-600" />
                      <span className="text-red-600">{t('errors.passwordMismatch')}</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('resetPasswordPage.submittingButton')}
                </>
              ) : (
                t('resetPasswordPage.submitButton')
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
