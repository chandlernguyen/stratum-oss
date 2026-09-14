import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sparkles, Users, Briefcase, FileText, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { useUserIdentity } from '@/hooks/data/useUserIdentity' // CORRECT: Use canonical hook
import { INDUSTRIES, COMPANY_SIZES } from '@/config/businessConstants'
import { useLocalizedNavigate } from '@/hooks/useLocalizedNavigate'
import { useLocalizedPath } from '@/hooks/useLocalizedPath'

// Map industry values to translation keys
const INDUSTRY_KEYS: Record<string, string> = {
  'Advertising & Marketing': 'advertisingMarketing',
  'Agriculture & Farming': 'agricultureFarming',
  'Automotive': 'automotive',
  'Construction': 'construction',
  'Consulting': 'consulting',
  'E-commerce': 'ecommerce',
  'Education': 'education',
  'Energy & Utilities': 'energyUtilities',
  'Entertainment & Media': 'entertainmentMedia',
  'Finance & Banking': 'financeBanking',
  'Food & Beverage': 'foodBeverage',
  'Healthcare': 'healthcare',
  'Hospitality & Tourism': 'hospitalityTourism',
  'Insurance': 'insurance',
  'Legal Services': 'legalServices',
  'Manufacturing': 'manufacturing',
  'Non-profit': 'nonprofit',
  'Professional Services': 'professionalServices',
  'Real Estate': 'realEstate',
  'Retail': 'retail',
  'SaaS/Software': 'saasSoftware',
  'Technology': 'technology',
  'Telecommunications': 'telecommunications',
  'Transportation & Logistics': 'transportationLogistics',
  'Other': 'other'
}

// Map company size values to translation keys
const COMPANY_SIZE_KEYS: Record<string, string> = {
  '1-10 employees': '1-10',
  '11-50 employees': '11-50',
  '51-200 employees': '51-200',
  '201-500 employees': '201-500',
  '500+ employees': '500+'
}

export function BusinessContextOnboarding() {
  const navigate = useLocalizedNavigate()
  const { localizePath } = useLocalizedPath()
  const { t } = useTranslation('onboarding')
  const { data: identity } = useUserIdentity() // CORRECT: Use canonical hook
  const [orgName, setOrgName] = useState('')
  const [loading, setLoading] = useState(false)
  const [showError, setShowError] = useState(false)
  const [industry, setIndustry] = useState('')
  const [companySize, setCompanySize] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    sessionStorage.setItem('onboarding_in_progress', 'true')
    const storedOrgName = localStorage.getItem('signup_org_name') || ''
    setOrgName(storedOrgName)

    return () => {
      sessionStorage.removeItem('onboarding_in_progress')
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!industry || !companySize) {
      setShowError(true)
      return
    }

    setLoading(true)

    try {
      const organizationId = identity?.organization?.id
      if (!organizationId) {
        throw new Error('Organization not found')
      }

      await api.post(
        `/api/v1/business-context/organization/${organizationId}`,
        {
          companyName: orgName,
          industry: industry,
          companySize: companySize,
          description: description || ''
        }
      )

      localStorage.removeItem('signup_org_type')
      localStorage.removeItem('signup_org_name')
      localStorage.removeItem('signup_org_slug')
      sessionStorage.removeItem('onboarding_in_progress')

      // Use window.location to force a full page reload
      // This ensures ProtectedRoute gets fresh onboarding status
      window.location.href = localizePath('/dashboard')
    } catch (err) {
      console.error('Error saving business context:', err)
      setShowError(true)
    } finally {
      setLoading(false)
    }
  }

  // Get translated industry label
  const getIndustryLabel = (industryValue: string) => {
    const key = INDUSTRY_KEYS[industryValue]
    return key ? t(`industries.${key}`) : industryValue
  }

  // Get translated company size label
  const getCompanySizeLabel = (sizeValue: string) => {
    const key = COMPANY_SIZE_KEYS[sizeValue]
    return key ? t(`companySizes.${key}`) : sizeValue
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 flex items-center justify-center p-4">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-slate-500/10 rounded-full blur-3xl" />
      </div>

      <Card className="relative w-full max-w-2xl border-slate-200/80 dark:border-slate-700/80 shadow-2xl shadow-slate-900/10 dark:shadow-black/30">
        {/* Grain texture overlay */}
        <div className="absolute inset-0 opacity-[0.015] pointer-events-none rounded-xl overflow-hidden">
          <div className="w-full h-full" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }} />
        </div>

        <CardHeader className="relative space-y-6 pb-4">
          {/* Premium icon container */}
          <div className="flex items-center justify-center">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-xl shadow-amber-500/25">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
          </div>
          <div className="text-center space-y-3">
            {/* Serif heading for authority */}
            <CardTitle className="font-serif text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100">
              {orgName
                ? t('businessContext.title', { orgName })
                : t('businessContext.titleDefault')}
            </CardTitle>
            <CardDescription className="text-base md:text-lg text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              {t('businessContext.subtitle')}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="relative pt-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Industry field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800">
                  <Briefcase className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                </div>
                {t('businessContext.form.industry.label')} <span className="text-amber-600">{t('businessContext.form.industry.required')}</span>
              </label>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger className="h-12 border-slate-200 dark:border-slate-700 focus:ring-amber-500/20 focus:border-amber-500">
                  <SelectValue placeholder={t('businessContext.form.industry.placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((ind) => (
                    <SelectItem key={ind} value={ind}>
                      {getIndustryLabel(ind)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Company Size field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800">
                  <Users className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                </div>
                {t('businessContext.form.companySize.label')} <span className="text-amber-600">{t('businessContext.form.companySize.required')}</span>
              </label>
              <Select value={companySize} onValueChange={setCompanySize}>
                <SelectTrigger className="h-12 border-slate-200 dark:border-slate-700 focus:ring-amber-500/20 focus:border-amber-500">
                  <SelectValue placeholder={t('businessContext.form.companySize.placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  {COMPANY_SIZES.map((size) => (
                    <SelectItem key={size} value={size}>
                      {getCompanySizeLabel(size)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-800">
                  <FileText className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                </div>
                {t('businessContext.form.description.label')} <span className="text-slate-400">{t('businessContext.form.description.optional')}</span>
              </label>
              <Textarea
                placeholder={t('businessContext.form.description.placeholder')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="border-slate-200 dark:border-slate-700 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
              />
            </div>

            {showError && (!industry || !companySize) && (
              <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-900/20">
                <AlertDescription className="text-amber-800 dark:text-amber-200">
                  {t('businessContext.validation.requiredFields')}
                </AlertDescription>
              </Alert>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                disabled={loading || !industry || !companySize}
                className="flex-1 h-12 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-white shadow-lg shadow-slate-900/20 transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('businessContext.buttons.submitting')}
                  </>
                ) : (
                  t('businessContext.buttons.submit')
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/dashboard')}
                disabled={loading}
                className="h-12 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                {t('businessContext.buttons.skip')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default BusinessContextOnboarding
