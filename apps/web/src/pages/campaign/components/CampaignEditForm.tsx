import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sparkles, AlertCircle, Info, Globe, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface CampaignEditFormProps {
  campaign: any;
  editedCampaign: any | null;
  setEditedCampaign: React.Dispatch<React.SetStateAction<any | null>>;
  isEditing: boolean;
  showAdvancedFields: boolean;
  setShowAdvancedFields: (show: boolean) => void;
  CAMPAIGN_TYPES: Array<{ value: string; label: string }>;
  PRIORITY_LEVELS: Array<{ value: string; label: string }>;
  MARKETING_CHANNELS: Array<{ value: string; label: string }>;
}

export function CampaignEditForm({
  campaign,
  editedCampaign,
  setEditedCampaign,
  isEditing,
  showAdvancedFields,
  setShowAdvancedFields,
  CAMPAIGN_TYPES,
  PRIORITY_LEVELS,
  MARKETING_CHANNELS,
}: CampaignEditFormProps) {
  const { t } = useTranslation('campaigns')

  // Guard against undefined campaign
  if (!campaign) {
    return null;
  }

  return (
    <>
      {/* Core Campaign Details */}
      <Card>
        <CardHeader>
          <CardTitle>{t('editForm.details.title')}</CardTitle>
          <CardDescription>{t('editForm.details.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">{t('form.fields.name')}</Label>
            {isEditing ? (
              <Input
                id="name"
                value={editedCampaign?.name || ''}
                onChange={(e) => setEditedCampaign(editedCampaign ? {...editedCampaign, name: e.target.value} : null)}
                className="mt-1"
              />
            ) : (
              <p className="text-sm text-muted-foreground mt-1">{campaign.name}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description">{t('form.fields.description')}</Label>
            {isEditing ? (
              <Textarea
                id="description"
                value={editedCampaign?.description || ''}
                onChange={(e) => setEditedCampaign(editedCampaign ? {...editedCampaign, description: e.target.value} : null)}
                rows={3}
                className="mt-1"
              />
            ) : (
              <p className="text-sm text-muted-foreground mt-1">
                {campaign.description || t('editForm.noDescription')}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="campaign_type">{t('editForm.campaignType')}</Label>
              {isEditing ? (
                <Select
                  value={editedCampaign?.campaign_type || ''}
                  onValueChange={(value) => setEditedCampaign(editedCampaign ? {...editedCampaign, campaign_type: value} : null)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={t('editForm.selectType')} />
                  </SelectTrigger>
                  <SelectContent>
                    {CAMPAIGN_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">
                  {CAMPAIGN_TYPES.find(ct => ct.value === campaign.campaign_type)?.label || campaign.campaign_type || t('editForm.notSet')}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="priority">{t('editForm.priority')}</Label>
              {isEditing ? (
                <Select
                  value={editedCampaign?.priority || ''}
                  onValueChange={(value) => setEditedCampaign(editedCampaign ? {...editedCampaign, priority: value} : null)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={t('editForm.selectPriority')} />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_LEVELS.map(level => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">
                  {PRIORITY_LEVELS.find(p => p.value === campaign.priority)?.label || campaign.priority || t('editForm.notSet')}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-1">
              {t('form.fields.targetAudience')}
              <Sparkles className="h-3 w-3 text-yellow-500" />
            </Label>
            {isEditing ? (
              <Textarea
                value={editedCampaign?.target_audience || ''}
                onChange={(e) => setEditedCampaign(editedCampaign ? {...editedCampaign, target_audience: e.target.value} : null)}
                rows={2}
                className="mt-1"
                placeholder={t('editForm.targetAudiencePlaceholder')}
              />
            ) : (
              <p className="text-sm text-muted-foreground mt-1">
                {campaign.target_audience || t('editForm.noTargetAudience')}
              </p>
            )}
          </div>

          <div>
            <Label className="flex items-center gap-1">
              {t('editForm.objectivesGoals')}
              <Sparkles className="h-3 w-3 text-yellow-500" />
            </Label>
            {isEditing ? (
              <Textarea
                value={editedCampaign?.objectives || ''}
                onChange={(e) => setEditedCampaign(editedCampaign ? {...editedCampaign, objectives: e.target.value} : null)}
                rows={3}
                className="mt-1"
                placeholder={t('editForm.objectivesPlaceholder')}
              />
            ) : (
              <div className="text-sm text-muted-foreground mt-1">
                {(() => {
                  // Handle different objectives formats
                  if (!campaign.objectives) return t('editForm.noObjectives');

                  // If objectives is a string or has a goals property (new format)
                  if (typeof campaign.objectives === 'string') return campaign.objectives;
                  if (campaign.objectives.goals) return campaign.objectives.goals;

                  // If objectives is structured object (test data format)
                  if (campaign.objectives.primary || campaign.objectives.secondary) {
                    return (
                      <div className="space-y-2">
                        {campaign.objectives.primary && Array.isArray(campaign.objectives.primary) && (
                          <div>
                            <strong>{t('editForm.primary')}:</strong>
                            <ul className="list-disc ml-5 mt-1">
                              {campaign.objectives.primary.map((obj: string, i: number) => (
                                <li key={i}>{obj}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {campaign.objectives.secondary && Array.isArray(campaign.objectives.secondary) && (
                          <div>
                            <strong>{t('editForm.secondary')}:</strong>
                            <ul className="list-disc ml-5 mt-1">
                              {campaign.objectives.secondary.map((obj: string, i: number) => (
                                <li key={i}>{obj}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Fallback: stringify the object
                  return JSON.stringify(campaign.objectives);
                })()}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{t('form.fields.startDate')}</Label>
              {isEditing ? (
                <>
                  <Input
                    type="date"
                    value={editedCampaign?.start_date?.split('T')[0] || ''}
                    onChange={(e) => setEditedCampaign(editedCampaign ? {...editedCampaign, start_date: e.target.value} : null)}
                    disabled={
                      // Can't edit start date if:
                      // 1. Campaign is completed (historical fact)
                      // 2. Campaign is active and start date is in the past
                      campaign.status === 'completed' ||
                      (campaign.status === 'active' && !!campaign.start_date && new Date(campaign.start_date) < new Date())
                    }
                    className={cn(
                      "mt-1",
                      (campaign.status === 'completed' ||
                       (campaign.status === 'active' && campaign.start_date && new Date(campaign.start_date) < new Date())) &&
                      "opacity-50"
                    )}
                  />
                  {campaign.status === 'active' && campaign.start_date && new Date(campaign.start_date) < new Date() && (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {t('editForm.cantChangeStartDate')}
                    </p>
                  )}
                  {campaign.status === 'completed' && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      {t('editForm.historicalData')}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">
                  {campaign.start_date ? format(new Date(campaign.start_date), 'PPP') : t('editForm.notSet')}
                </p>
              )}
            </div>
            <div>
              <Label>{t('form.fields.endDate')}</Label>
              {isEditing ? (
                <>
                  <Input
                    type="date"
                    value={editedCampaign?.end_date?.split('T')[0] || ''}
                    onChange={(e) => setEditedCampaign(editedCampaign ? {...editedCampaign, end_date: e.target.value} : null)}
                    disabled={campaign.status === 'completed'} // Only completed campaigns can't change end date
                    className={cn(
                      "mt-1",
                      campaign.status === 'completed' && "opacity-50"
                    )}
                  />
                  {campaign.status === 'completed' && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      {t('editForm.historicalData')}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">
                  {campaign.end_date ? format(new Date(campaign.end_date), 'PPP') : t('editForm.notSet')}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="budget">{t('editForm.budgetLabel')}</Label>
            {isEditing ? (
              <Input
                id="budget"
                type="number"
                value={editedCampaign?.budget_cents ? editedCampaign.budget_cents / 100 : 0}
                onChange={(e) => setEditedCampaign(editedCampaign ?
                  {...editedCampaign, budget_cents: Math.round(parseFloat(e.target.value) * 100)} : null
                )}
                className="mt-1"
              />
            ) : (
              <p className="text-sm text-muted-foreground mt-1">
                ${((campaign.budget_cents || 0) / 100).toFixed(2)}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Marketing Channels */}
      <Card>
        <CardHeader>
          <CardTitle>{t('editForm.channels.title')}</CardTitle>
          <CardDescription>{t('editForm.channels.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Label className="flex items-center gap-1 mb-3">
            {t('editForm.channels.activeChannels')}
            <Sparkles className="h-3 w-3 text-yellow-500" />
          </Label>
          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {MARKETING_CHANNELS.map(channel => (
                <div key={channel.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={channel.value}
                    checked={editedCampaign?.marketing_channels?.includes(channel.value) || false}
                    onCheckedChange={(checked) => {
                      if (!editedCampaign) return
                      const channels = Array.isArray(editedCampaign.marketing_channels) ? editedCampaign.marketing_channels : []
                      if (checked) {
                        setEditedCampaign({...editedCampaign, marketing_channels: [...channels, channel.value]})
                      } else {
                        setEditedCampaign({...editedCampaign, marketing_channels: channels.filter((c: string) => c !== channel.value)})
                      }
                    }}
                  />
                  <label
                    htmlFor={channel.value}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {channel.label}
                  </label>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {campaign.marketing_channels && campaign.marketing_channels.length > 0 ? (
                campaign.marketing_channels.map((channel: string) => (
                  <Badge key={channel} variant="secondary">
                    {MARKETING_CHANNELS.find(c => c.value === channel)?.label || channel}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">{t('editForm.channels.noChannels')}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Advanced Fields Toggle */}
      {!showAdvancedFields && (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <p className="text-sm text-muted-foreground">
                  {t('editForm.advanced.addMoreDetails')}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedFields(true)}
              >
                {t('editForm.advanced.showAdvanced')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Advanced Fields */}
      {showAdvancedFields && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{t('editForm.contentStrategy.title')}</CardTitle>
              <CardDescription>{t('editForm.contentStrategy.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Label className="flex items-center gap-1 mb-2">
                {t('editForm.contentStrategy.contentPillars')}
                <Sparkles className="h-3 w-3 text-yellow-500" />
              </Label>
              {isEditing ? (
                <Textarea
                  value={editedCampaign?.content_pillars?.join(', ') || ''}
                  onChange={(e) => {
                    const pillars = e.target.value.split(',').map(p => p.trim()).filter(p => p)
                    setEditedCampaign(editedCampaign ? {...editedCampaign, content_pillars: pillars} : null)
                  }}
                  rows={2}
                  className="mt-1"
                  placeholder={t('editForm.contentStrategy.pillarsPlaceholder')}
                />
              ) : (
                <div className="flex flex-wrap gap-2 mt-1">
                  {campaign.content_pillars && campaign.content_pillars.length > 0 ? (
                    campaign.content_pillars.map((pillar: string) => (
                      <Badge key={pillar} variant="outline">
                        {pillar}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('editForm.contentStrategy.noPillars')}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('editForm.successMetrics.title')}</CardTitle>
              <CardDescription>{t('editForm.successMetrics.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="flex items-center gap-1">
                  {t('editForm.successMetrics.primaryKPI')}
                  <Sparkles className="h-3 w-3 text-yellow-500" />
                </Label>
                {isEditing ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
                    <Input
                      placeholder={t('editForm.successMetrics.kpiPlaceholder')}
                      value={editedCampaign?.success_metrics?.primary_kpi || ''}
                      onChange={(e) => setEditedCampaign(editedCampaign ? {
                        ...editedCampaign,
                        success_metrics: {...(editedCampaign.success_metrics || {}), primary_kpi: e.target.value}
                      } : null)}
                    />
                    <Input
                      type="number"
                      placeholder={t('editForm.successMetrics.targetPlaceholder')}
                      value={editedCampaign?.success_metrics?.target_value || ''}
                      onChange={(e) => setEditedCampaign(editedCampaign ? {
                        ...editedCampaign,
                        success_metrics: {...(editedCampaign.success_metrics || {}), target_value: parseInt(e.target.value)}
                      } : null)}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">
                    {campaign.success_metrics?.primary_kpi
                      ? `${campaign.success_metrics.primary_kpi}: ${campaign.success_metrics.target_value || t('editForm.successMetrics.noTarget')}`
                      : t('editForm.successMetrics.notDefined')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('editForm.competitive.title')}</CardTitle>
              <CardDescription>{t('editForm.competitive.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="flex items-center gap-1">
                  {t('editForm.competitive.competitorContext')}
                  <Sparkles className="h-3 w-3 text-yellow-500" />
                </Label>
                {isEditing ? (
                  <Textarea
                    value={editedCampaign?.competitor_context || ''}
                    onChange={(e) => setEditedCampaign(editedCampaign ? {...editedCampaign, competitor_context: e.target.value} : null)}
                    rows={2}
                    className="mt-1"
                    placeholder={t('editForm.competitive.contextPlaceholder')}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">
                    {campaign.competitor_context || t('editForm.competitive.noContext')}
                  </p>
                )}
              </div>

              <div>
                <Label className="flex items-center gap-1">
                  {t('editForm.competitive.geographicTarget')}
                  <Globe className="h-3 w-3 text-muted-foreground" />
                </Label>
                {isEditing ? (
                  <Input
                    value={editedCampaign?.geographic_target || ''}
                    onChange={(e) => setEditedCampaign(editedCampaign ? {...editedCampaign, geographic_target: e.target.value} : null)}
                    className="mt-1"
                    placeholder={t('editForm.competitive.geoPlaceholder')}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">
                    {campaign.geographic_target || t('editForm.competitive.notSpecified')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('editForm.organization.title')}</CardTitle>
              <CardDescription>{t('editForm.organization.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Label className="flex items-center gap-1">
                {t('editForm.organization.tags')}
                <Tag className="h-3 w-3 text-muted-foreground" />
              </Label>
              {isEditing ? (
                <Input
                  value={editedCampaign?.tags?.join(', ') || ''}
                  onChange={(e) => {
                    const tags = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag)
                    setEditedCampaign(editedCampaign ? {...editedCampaign, tags} : null)
                  }}
                  className="mt-1"
                  placeholder={t('editForm.organization.tagsPlaceholder')}
                />
              ) : (
                <div className="flex flex-wrap gap-2 mt-1">
                  {campaign.tags && campaign.tags.length > 0 ? (
                    campaign.tags.map((tag: string) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('editForm.organization.noTags')}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvancedFields(false)}
            className="w-full"
          >
            {t('editForm.advanced.hideAdvanced')}
          </Button>
        </>
      )}
    </>
  );
}
