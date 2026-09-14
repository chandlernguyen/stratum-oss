import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import { useAuthStore } from '@/stores/auth'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Mail, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

interface ForgotPasswordModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ForgotPasswordModal({ open, onOpenChange }: ForgotPasswordModalProps) {
  const { t } = useTranslation(['common', 'auth'])
  const { resetPasswordRequest } = useAuthStore()
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const turnstileRef = useRef<TurnstileInstance>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      toast.error(t('auth:forgotPasswordModal.errors.emailRequired'))
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast.error(t('auth:forgotPasswordModal.errors.invalidEmail'))
      return
    }

    setIsSubmitting(true)

    try {
      const result = await resetPasswordRequest(email, captchaToken ?? undefined)

      if (result.success) {
        setIsSuccess(true)
        toast.success(t('auth:forgotPasswordModal.success.title'), {
          description: t('auth:forgotPasswordModal.success.description'),
        })
      } else {
        toast.error(t('auth:forgotPasswordModal.errors.failedToSend'), {
          description: result.error || t('auth:forgotPasswordModal.errors.tryAgain'),
        })
      }
    } catch (error) {
      toast.error(t('auth:forgotPasswordModal.errors.unexpected'), {
        description: t('auth:forgotPasswordModal.errors.tryAgainLater'),
      })
      turnstileRef.current?.reset()
      setCaptchaToken(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    // Reset state after a brief delay to avoid UI flash
    setTimeout(() => {
      setEmail('')
      setIsSuccess(false)
      turnstileRef.current?.reset()
      setCaptchaToken(null)
    }, 200)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        {!isSuccess ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                {t('auth:forgotPasswordModal.title')}
              </DialogTitle>
              <DialogDescription>
                {t('auth:forgotPasswordModal.subtitle')}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('auth:forgotPasswordModal.emailLabel')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth:forgotPasswordModal.emailPlaceholder')}
                  disabled={isSubmitting}
                  autoFocus
                  aria-label={t('auth:forgotPasswordModal.emailLabel')}
                />
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

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  {t('common:cancel')}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('auth:forgotPasswordModal.sending')}
                    </>
                  ) : (
                    t('auth:forgotPasswordModal.submitButton')
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-brand-success">
                <CheckCircle2 className="w-5 h-5" />
                {t('auth:forgotPasswordModal.successTitle')}
              </DialogTitle>
              <DialogDescription className="pt-2">
                {t('auth:forgotPasswordModal.sentTo')}{' '}
                <span className="font-medium text-foreground">{email}</span>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 text-sm text-brand-info dark:text-blue-200">
                <p className="font-medium mb-2">{t('auth:forgotPasswordModal.nextSteps.title')}</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>{t('auth:forgotPasswordModal.nextSteps.step1')}</li>
                  <li>{t('auth:forgotPasswordModal.nextSteps.step2')}</li>
                  <li>{t('auth:forgotPasswordModal.nextSteps.step3')}</li>
                </ol>
              </div>

              <p className="text-xs text-muted-foreground">
                {t('auth:forgotPasswordModal.expiryNote')}
              </p>
            </div>

            <DialogFooter>
              <Button onClick={handleClose} className="w-full">
                {t('auth:forgotPasswordModal.gotIt')}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
