import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Mail, CheckCircle2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { useLocalizedPath } from '@/hooks/useLocalizedPath'

export function EmailConfirmation() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation('auth')
  const email = searchParams.get('email') || 'your email'
  const { localizePath } = useLocalizedPath()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50">
      <PublicHeader />
      <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center p-4">
        <Card className="w-full max-w-md border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4 pb-2">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-amber-100 to-amber-50 rounded-full flex items-center justify-center">
              <Mail className="w-8 h-8 text-amber-600" />
            </div>
            <CardTitle className="text-2xl font-semibold text-gray-900">
              {t('emailConfirmation.title')}
            </CardTitle>
            <CardDescription className="text-base text-gray-600">
              {t('emailConfirmation.subtitle', { email })}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-slate-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {t('emailConfirmation.clickLinkTitle')}
                  </p>
                  <p className="text-sm text-gray-600">
                    {t('emailConfirmation.clickLinkDescription')}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-slate-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {t('emailConfirmation.completeSetupTitle')}
                  </p>
                  <p className="text-sm text-gray-600">
                    {t('emailConfirmation.completeSetupDescription')}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <p className="text-sm text-gray-600 mb-4">
                {t('emailConfirmation.didntReceive')}
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate(localizePath('/signup'))}
              >
                {t('emailConfirmation.backToSignUp')}
              </Button>
            </div>

            <div className="text-center">
              <Button
                variant="link"
                className="text-amber-600 hover:text-amber-700"
                onClick={() => navigate(localizePath('/login'))}
              >
                {t('emailConfirmation.alreadyVerified')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <PublicFooter />
    </div>
  )
}
