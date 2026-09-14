import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Target, DollarSign, Users, Zap } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { useCreateCampaign } from '@/hooks/data/useCampaigns'
import { useClientContext } from '@/contexts/ClientContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import { buildContextAwareUrl } from '@/utils/multiTenantRouting'
import { useAccessDenied } from '@/components/auth/AccessDenied'

export function NewCampaign() {
  const { t } = useTranslation('campaigns')

  // Set page title for GA4 tracking and accessibility
  usePageTitle(t('newCampaign.pageTitle'));

  // Permission check for campaign creation
  const { hasPermission, isLoading: permissionLoading, AccessDeniedComponent } = useAccessDenied(
    'campaigns.campaign.create',
    t('newCampaign.permissionTitle')
  )

  // Show access denied if user doesn't have permission
  if (!permissionLoading && !hasPermission) {
    return AccessDeniedComponent
  }

  const navigate = useNavigate()
  const { clientSlug, clientId } = useClientContext()
  const createCampaign = useCreateCampaign()
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    budget: '',
    objectives: '',
    target_audience: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Database-First: Use the mutation hook
    createCampaign.mutate({
      name: formData.name,
      description: formData.description,
      objectives: formData.objectives ? { goals: formData.objectives } : {},
      target_audience: formData.target_audience,
      budget_cents: formData.budget ? Math.round(parseFloat(formData.budget) * 100) : 0,
      start_date: startDate?.toISOString().split('T')[0],
      end_date: endDate?.toISOString().split('T')[0],
      status: 'draft',
      success_metrics: {},
      client_id: clientId || undefined, // Agency multi-tenant: pass client_id for agency users
    }, {
      onSuccess: () => {
        // Navigate to campaigns list after successful creation
        // Preserve client context for agency users
        navigate(buildContextAwareUrl('/campaigns?status=draft', clientSlug) || '/campaigns?status=draft');
      }
    })
  }

  const quickStartTemplates = [
    {
      icon: Zap,
      titleKey: 'newCampaign.templates.quickWin.title',
      descriptionKey: 'newCampaign.templates.quickWin.description',
      preset: {
        name: t('newCampaign.templates.quickWin.presetName'),
        objectives: t('newCampaign.templates.quickWin.presetObjectives'),
        budget: '5000',
      }
    },
    {
      icon: Target,
      titleKey: 'newCampaign.templates.brandAwareness.title',
      descriptionKey: 'newCampaign.templates.brandAwareness.description',
      preset: {
        name: t('newCampaign.templates.brandAwareness.presetName'),
        objectives: t('newCampaign.templates.brandAwareness.presetObjectives'),
        budget: '10000',
      }
    },
    {
      icon: Users,
      titleKey: 'newCampaign.templates.leadGeneration.title',
      descriptionKey: 'newCampaign.templates.leadGeneration.description',
      preset: {
        name: t('newCampaign.templates.leadGeneration.presetName'),
        objectives: t('newCampaign.templates.leadGeneration.presetObjectives'),
        budget: '7500',
      }
    },
  ]

  const applyTemplate = (preset: any) => {
    setFormData(prev => ({
      ...prev,
      ...preset,
    }))
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('newCampaign.title')}</h1>
        <p className="text-muted-foreground">
          {t('newCampaign.subtitle')}
        </p>
      </div>

      {/* Quick Start Templates */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">{t('newCampaign.templatesTitle')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickStartTemplates.map((template) => (
            <Card
              key={template.titleKey}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => applyTemplate(template.preset)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <template.icon className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">{t(template.titleKey)}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{t(template.descriptionKey)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Campaign Form */}
      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>{t('newCampaign.formTitle')}</CardTitle>
            <CardDescription>
              {t('newCampaign.formDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Campaign Name */}
            <div className="space-y-2">
              <Label htmlFor="name">{t('newCampaign.fields.name')} *</Label>
              <Input
                id="name"
                name="name"
                placeholder={t('newCampaign.fields.namePlaceholder')}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">{t('newCampaign.fields.description')}</Label>
              <Textarea
                id="description"
                name="description"
                placeholder={t('newCampaign.fields.descriptionPlaceholder')}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            {/* Objectives */}
            <div className="space-y-2">
              <Label htmlFor="objectives">{t('newCampaign.fields.objectives')} *</Label>
              <Textarea
                id="objectives"
                name="objectives"
                placeholder={t('newCampaign.fields.objectivesPlaceholder')}
                value={formData.objectives}
                onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                rows={3}
                required
              />
            </div>

            {/* Budget */}
            <div className="space-y-2">
              <Label htmlFor="budget">{t('newCampaign.fields.budget')}</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="budget"
                  name="budget"
                  type="number"
                  placeholder={t('newCampaign.fields.budgetPlaceholder')}
                  className="pl-9"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                />
              </div>
            </div>

            {/* Target Audience */}
            <div className="space-y-2">
              <Label htmlFor="target_audience">{t('newCampaign.fields.targetAudience')}</Label>
              <Textarea
                id="target_audience"
                name="target_audience"
                placeholder={t('newCampaign.fields.targetAudiencePlaceholder')}
                value={formData.target_audience}
                onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                rows={3}
              />
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('newCampaign.fields.startDate')}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : t('newCampaign.fields.selectStartDate')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>{t('newCampaign.fields.endDate')}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : t('newCampaign.fields.selectEndDate')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      disabled={(date) => startDate ? date < startDate : false}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
              disabled={createCampaign.isPending}
            >
              {t('actions.cancel')}
            </Button>
            <Button type="submit" disabled={createCampaign.isPending || !formData.name || !formData.objectives}>
              {createCampaign.isPending ? t('newCampaign.creating') : t('newCampaign.createButton')}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}