import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, Lock, User, Loader2, Check, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { API_BASE_URL } from '@/lib/api'
import { getLocaleHeaders } from '@/lib/apiHeaders'
import { supabase } from '@/lib/supabase'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ROUTES } from '@/config/routes'

export function AcceptInvitation() {
  const { t } = useTranslation('auth')
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isValidToken, setIsValidToken] = useState(true)

  // Validate token exists
  useEffect(() => {
    if (!token) {
      setIsValidToken(false)
      toast.error(t('acceptInvitation.errors.invalidLink'))
    }
  }, [token, t])

  const acceptMutation = useMutation({
    mutationFn: async (data: { fullName: string; password: string; invitationToken: string }) => {
      // Use the PUBLIC invitations endpoint (no auth required for new users)
      const response = await fetch(`${API_BASE_URL}/api/v1/invitations/team/accept`, {
        method: 'POST',
        headers: getLocaleHeaders({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          full_name: data.fullName,
          password: data.password,
          invitation_token: data.invitationToken,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to accept invitation')
      }

      return response.json()
    },
    onSuccess: async (data) => {
      // Set session with tokens from response using Supabase
      await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      })

      toast.success(t('acceptInvitation.successTitle'), {
        description: t('acceptInvitation.successDescription', { orgName: data.org_name }),
        icon: <Check className="h-4 w-4" />,
      })

      // Redirect to dashboard
      setTimeout(() => {
        navigate(ROUTES.dashboard.root)
      }, 1500)
    },
    onError: (error: Error) => {
      toast.error(t('acceptInvitation.errors.failedToAccept'), {
        description: error.message,
      })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!fullName.trim()) {
      toast.error(t('acceptInvitation.errors.fullNameRequired'))
      return
    }

    if (password.length < 8) {
      toast.error(t('acceptInvitation.errors.passwordTooShort'))
      return
    }

    if (password !== confirmPassword) {
      toast.error(t('errors.passwordMismatch'))
      return
    }

    if (!token) {
      toast.error(t('acceptInvitation.errors.invalidToken'))
      return
    }

    acceptMutation.mutate({
      fullName: fullName.trim(),
      password,
      invitationToken: token,
    })
  }

  if (!isValidToken || !token) {
    return (
      <div className="container max-w-md mx-auto py-16">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('acceptInvitation.invalidTitle')}</AlertTitle>
          <AlertDescription>
            {t('acceptInvitation.invalidDescription')}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container max-w-md mx-auto py-16">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t('acceptInvitation.title')}</CardTitle>
          <CardDescription>
            {t('acceptInvitation.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">{t('acceptInvitation.fullNameLabel')}</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder={t('acceptInvitation.fullNamePlaceholder')}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={acceptMutation.isPending}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('acceptInvitation.passwordLabel')}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder={t('acceptInvitation.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={acceptMutation.isPending}
                  className="pl-9"
                  required
                  minLength={8}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('acceptInvitation.confirmPasswordLabel')}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder={t('acceptInvitation.confirmPasswordPlaceholder')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={acceptMutation.isPending}
                  className="pl-9"
                  required
                  minLength={8}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={acceptMutation.isPending}
            >
              {acceptMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('acceptInvitation.submittingButton')}
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  {t('acceptInvitation.submitButton')}
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>{t('acceptInvitation.termsText')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
