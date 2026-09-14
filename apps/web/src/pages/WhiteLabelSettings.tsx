import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BrandKitEditor } from '@/components/whitelabel/BrandKitEditor'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useWhiteLabel } from '@/components/whitelabel/WhiteLabelProvider'
import {
  generateCNAMEInstructions,
  validateCustomDomain,
  isCustomDomain,
  getCustomDomainInfo
} from '@/utils/customDomain'
import {
  Globe,
  Shield,
  CheckCircle,
  AlertCircle,
  Copy,
  ExternalLink,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOrganization } from '@/hooks/data/useOrganization'

export function WhiteLabelSettings() {
  const { t } = useTranslation('settings')
  const { isWhiteLabeled } = useWhiteLabel()
  const { isAgency } = useOrganization()
  const [customDomain, setCustomDomain] = useState('')
  const [domainError, setDomainError] = useState<string | null>(null)
  const [showInstructions, setShowInstructions] = useState(false)
  const [copiedInstructions, setCopiedInstructions] = useState(false)

  const currentDomainInfo = getCustomDomainInfo()
  const isOnCustomDomain = isCustomDomain()

  const handleDomainSubmit = () => {
    const validation = validateCustomDomain(customDomain)
    if (!validation.valid) {
      setDomainError(validation.error || 'Invalid domain')
      return
    }
    setDomainError(null)
    setShowInstructions(true)
  }

  const copyInstructions = () => {
    const instructions = generateCNAMEInstructions(customDomain)
    navigator.clipboard.writeText(instructions)
    setCopiedInstructions(true)
    setTimeout(() => setCopiedInstructions(false), 2000)
  }

  const handleBrandKitSave = () => {
    // In production, this would save to your backend
    console.log('Brand kit saved')
  }

  // Only allow agencies to access white-label features
  if (!isAgency) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardContent className="text-center py-12">
            <Shield className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">{t('whiteLabel.agencyOnly.title')}</h3>
            <p className="text-muted-foreground">
              {t('whiteLabel.agencyOnly.description')}
            </p>
            <Button className="mt-4" variant="outline">
              <ExternalLink className="w-4 h-4 mr-2" />
              {t('whiteLabel.agencyOnly.learnMore')}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-amber-600" />
          {t('whiteLabel.pageTitle')}
        </h1>
        <p className="text-muted-foreground">
          {t('whiteLabel.pageSubtitle')}
        </p>
      </div>

      {/* Current Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('whiteLabel.status.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                isWhiteLabeled ? "bg-green-100" : "bg-gray-100"
              )}>
                {isWhiteLabeled ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-gray-400" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">{t('whiteLabel.status.brandKit.label')}</p>
                <p className="text-xs text-muted-foreground">
                  {isWhiteLabeled ? t('whiteLabel.status.brandKit.active') : t('whiteLabel.status.brandKit.notConfigured')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                isOnCustomDomain ? "bg-green-100" : "bg-gray-100"
              )}>
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium">{t('whiteLabel.status.customDomain.label')}</p>
                <p className="text-xs text-muted-foreground">
                  {isOnCustomDomain ? currentDomainInfo?.domain : t('whiteLabel.status.customDomain.usingDefault')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-900/30 flex items-center justify-center">
                <Shield className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-medium">{t('whiteLabel.status.sslCertificate.label')}</p>
                <p className="text-xs text-muted-foreground">{t('whiteLabel.status.sslCertificate.autoProvisioned')}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Brand Kit Editor */}
      <div className="mb-6">
        <BrandKitEditor onSave={handleBrandKitSave} />
      </div>

      {/* Custom Domain Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            {t('whiteLabel.domain.title')}
          </CardTitle>
          <CardDescription>
            {t('whiteLabel.domain.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isOnCustomDomain ? (
            <>
              <div>
                <Label htmlFor="custom-domain">{t('whiteLabel.domain.inputLabel')}</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="custom-domain"
                    value={customDomain}
                    onChange={(e) => {
                      setCustomDomain(e.target.value)
                      setDomainError(null)
                    }}
                    placeholder={t('whiteLabel.domain.inputPlaceholder')}
                    className={domainError ? "border-red-500" : ""}
                  />
                  <Button onClick={handleDomainSubmit}>
                    {t('whiteLabel.domain.configureButton')}
                  </Button>
                </div>
                {domainError && (
                  <p className="text-xs text-red-500 mt-1">{domainError}</p>
                )}
              </div>

              {showInstructions && customDomain && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                      {t('whiteLabel.domain.dnsRequired')}
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyInstructions}
                    >
                      {copiedInstructions ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-1" />
                          {t('whiteLabel.domain.copiedButton')}
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-1" />
                          {t('whiteLabel.domain.copyButton')}
                        </>
                      )}
                    </Button>
                  </div>
                  <pre className="text-xs font-mono text-amber-900 dark:text-amber-100 whitespace-pre-wrap">
                    {generateCNAMEInstructions(customDomain)}
                  </pre>
                </div>
              )}
            </>
          ) : (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h4 className="font-semibold text-green-900">
                  {t('whiteLabel.domain.domainActive.title')}
                </h4>
              </div>
              <p className="text-sm text-green-800 mb-3">
                {t('whiteLabel.domain.domainActive.description')} <strong>{currentDomainInfo?.domain}</strong>
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {t('whiteLabel.domain.domainActive.visitSite')}
                </Button>
                <Button variant="outline" size="sm">
                  {t('whiteLabel.domain.domainActive.changeDomain')}
                </Button>
              </div>
            </div>
          )}

          {/* Benefits */}
          <div className="pt-4 border-t">
            <h4 className="text-sm font-semibold mb-3">{t('whiteLabel.benefits.title')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">{t('whiteLabel.benefits.professional.title')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('whiteLabel.benefits.professional.description')}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">{t('whiteLabel.benefits.clientTrust.title')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('whiteLabel.benefits.clientTrust.description')}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">{t('whiteLabel.benefits.seo.title')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('whiteLabel.benefits.seo.description')}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">{t('whiteLabel.benefits.ssl.title')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('whiteLabel.benefits.ssl.description')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}