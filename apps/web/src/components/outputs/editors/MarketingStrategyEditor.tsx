import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Target, TrendingUp } from 'lucide-react'

interface MarketingStrategyEditorProps {
  content: any
  onChange: (updatedContent: any) => void
}

export function MarketingStrategyEditor({ content, onChange }: MarketingStrategyEditorProps) {
  const { t } = useTranslation(['outputs', 'common'])
  const [editedContent, setEditedContent] = useState(content)

  const handleFieldChange = (field: string, value: any) => {
    const updated = { ...editedContent, [field]: value }
    setEditedContent(updated)
    onChange(updated)
  }


  const handleArrayFieldChange = (field: string, value: string) => {
    const arrayValue = value.split(',').map(v => v.trim()).filter(v => v)
    handleFieldChange(field, arrayValue)
  }

  return (
    <div className="space-y-6">
      {/* Campaign Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-amber-600" />
            {t('editors.strategy.campaignInfo')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="campaign-name">{t('editors.strategy.campaignName')}</Label>
            <Input
              id="campaign-name"
              value={editedContent.campaign_name || ''}
              onChange={(e) => handleFieldChange('campaign_name', e.target.value)}
              placeholder="Enter campaign name"
            />
          </div>
          <div>
            <Label htmlFor="executive-summary">Executive Summary</Label>
            <Textarea
              id="executive-summary"
              value={editedContent.executive_summary || ''}
              onChange={(e) => handleFieldChange('executive_summary', e.target.value)}
              placeholder="Brief overview of the campaign strategy"
              rows={3}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="target-verticals">Target Verticals (comma-separated)</Label>
              <Input
                id="target-verticals"
                value={Array.isArray(editedContent.target_verticals) ? editedContent.target_verticals.join(', ') : ''}
                onChange={(e) => handleArrayFieldChange('target_verticals', e.target.value)}
                placeholder="Construction, Manufacturing"
              />
            </div>
            <div>
              <Label htmlFor="campaign-duration">Campaign Duration</Label>
              <Input
                id="campaign-duration"
                value={editedContent.campaign_duration || ''}
                onChange={(e) => handleFieldChange('campaign_duration', e.target.value)}
                placeholder="Q4 2025 (3 months)"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Strategy Content */}
      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="messaging" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="messaging">{t('editors.strategy.tabs.messaging')}</TabsTrigger>
              <TabsTrigger value="channels">{t('editors.strategy.tabs.channels')}</TabsTrigger>
              <TabsTrigger value="budget">{t('editors.strategy.tabs.budget')}</TabsTrigger>
              <TabsTrigger value="execution">{t('editors.strategy.tabs.execution')}</TabsTrigger>
            </TabsList>

            <TabsContent value="messaging" className="mt-6 space-y-4">
              <div>
                <Label htmlFor="strategy-reasoning">Strategic Reasoning</Label>
                <Textarea
                  id="strategy-reasoning"
                  value={editedContent.strategy_reasoning || ''}
                  onChange={(e) => handleFieldChange('strategy_reasoning', e.target.value)}
                  placeholder="Why this strategy makes sense"
                  rows={3}
                />
              </div>

              {/* Value Propositions */}
              <div>
                <Label htmlFor="primary-value-prop">Primary Value Proposition</Label>
                <Textarea
                  id="primary-value-prop"
                  value={editedContent.messaging_framework?.value_propositions?.primary || ''}
                  onChange={(e) => {
                    const updated = {
                      ...editedContent,
                      messaging_framework: {
                        ...editedContent.messaging_framework,
                        value_propositions: {
                          ...editedContent.messaging_framework?.value_propositions,
                          primary: e.target.value
                        }
                      }
                    }
                    setEditedContent(updated)
                    onChange(updated)
                  }}
                  placeholder="Main value proposition"
                  rows={2}
                />
              </div>

              {/* Key Messages */}
              <div>
                <Label htmlFor="elevator-pitch">Elevator Pitch</Label>
                <Textarea
                  id="elevator-pitch"
                  value={editedContent.messaging_framework?.elevator_pitch || ''}
                  onChange={(e) => {
                    const updated = {
                      ...editedContent,
                      messaging_framework: {
                        ...editedContent.messaging_framework,
                        elevator_pitch: e.target.value
                      }
                    }
                    setEditedContent(updated)
                    onChange(updated)
                  }}
                  placeholder="30-second elevator pitch"
                  rows={2}
                />
              </div>
            </TabsContent>

            <TabsContent value="channels" className="mt-6 space-y-4">
              {/* Media Mix */}
              <div>
                <Label>Media Mix Distribution</Label>
                <div className="grid grid-cols-3 gap-4 mt-2">
                  <div>
                    <Label htmlFor="paid-media">Paid Media (%)</Label>
                    <Input
                      id="paid-media"
                      type="number"
                      min="0"
                      max="100"
                      value={editedContent.media_mix?.paid || 0}
                      onChange={(e) => {
                        const updated = {
                          ...editedContent,
                          media_mix: {
                            ...editedContent.media_mix,
                            paid: parseInt(e.target.value) || 0
                          }
                        }
                        setEditedContent(updated)
                        onChange(updated)
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="owned-media">Owned Media (%)</Label>
                    <Input
                      id="owned-media"
                      type="number"
                      min="0"
                      max="100"
                      value={editedContent.media_mix?.owned || 0}
                      onChange={(e) => {
                        const updated = {
                          ...editedContent,
                          media_mix: {
                            ...editedContent.media_mix,
                            owned: parseInt(e.target.value) || 0
                          }
                        }
                        setEditedContent(updated)
                        onChange(updated)
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="earned-media">Earned Media (%)</Label>
                    <Input
                      id="earned-media"
                      type="number"
                      min="0"
                      max="100"
                      value={editedContent.media_mix?.earned || 0}
                      onChange={(e) => {
                        const updated = {
                          ...editedContent,
                          media_mix: {
                            ...editedContent.media_mix,
                            earned: parseInt(e.target.value) || 0
                          }
                        }
                        setEditedContent(updated)
                        onChange(updated)
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Channel Priorities */}
              <div>
                <Label htmlFor="channel-priorities">Channel Priorities (comma-separated)</Label>
                <Input
                  id="channel-priorities"
                  value={Array.isArray(editedContent.channel_strategy?.channel_priorities)
                    ? editedContent.channel_strategy.channel_priorities.join(', ')
                    : ''}
                  onChange={(e) => {
                    const priorities = e.target.value.split(',').map(v => v.trim()).filter(v => v)
                    const updated = {
                      ...editedContent,
                      channel_strategy: {
                        ...editedContent.channel_strategy,
                        channel_priorities: priorities
                      }
                    }
                    setEditedContent(updated)
                    onChange(updated)
                  }}
                  placeholder="Owned Media (zero-cost tactics), Earned Media (zero-cost tactics)"
                />
              </div>
            </TabsContent>

            <TabsContent value="budget" className="mt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="total-budget">Total Budget ($)</Label>
                  <Input
                    id="total-budget"
                    type="number"
                    value={editedContent.total_budget || ''}
                    onChange={(e) => handleFieldChange('total_budget', parseFloat(e.target.value) || 0)}
                    placeholder="100"
                  />
                </div>
                <div>
                  <Label htmlFor="monthly-budget">Monthly Budget ($)</Label>
                  <Input
                    id="monthly-budget"
                    type="number"
                    value={editedContent.monthly_budget || ''}
                    onChange={(e) => handleFieldChange('monthly_budget', parseFloat(e.target.value) || 0)}
                    placeholder="33.33"
                  />
                </div>
              </div>

              {/* Budget Allocation */}
              <div>
                <Label>Budget Allocation</Label>
                <div className="grid grid-cols-3 gap-4 mt-2">
                  <div>
                    <Label htmlFor="paid-budget">Paid Budget ($)</Label>
                    <Input
                      id="paid-budget"
                      type="number"
                      value={editedContent.budget_allocation?.paid_budget || 0}
                      onChange={(e) => {
                        const updated = {
                          ...editedContent,
                          budget_allocation: {
                            ...editedContent.budget_allocation,
                            paid_budget: parseFloat(e.target.value) || 0
                          }
                        }
                        setEditedContent(updated)
                        onChange(updated)
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="owned-budget">Owned Budget ($)</Label>
                    <Input
                      id="owned-budget"
                      type="number"
                      value={editedContent.budget_allocation?.owned_budget || 0}
                      onChange={(e) => {
                        const updated = {
                          ...editedContent,
                          budget_allocation: {
                            ...editedContent.budget_allocation,
                            owned_budget: parseFloat(e.target.value) || 0
                          }
                        }
                        setEditedContent(updated)
                        onChange(updated)
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="earned-budget">Earned Budget ($)</Label>
                    <Input
                      id="earned-budget"
                      type="number"
                      value={editedContent.budget_allocation?.earned_budget || 0}
                      onChange={(e) => {
                        const updated = {
                          ...editedContent,
                          budget_allocation: {
                            ...editedContent.budget_allocation,
                            earned_budget: parseFloat(e.target.value) || 0
                          }
                        }
                        setEditedContent(updated)
                        onChange(updated)
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Key Challenges */}
              <div>
                <Label htmlFor="key-challenges">Key Challenges (comma-separated)</Label>
                <Input
                  id="key-challenges"
                  value={Array.isArray(editedContent.key_challenges) ? editedContent.key_challenges.join(', ') : ''}
                  onChange={(e) => handleArrayFieldChange('key_challenges', e.target.value)}
                  placeholder="limited budget ($100), traditional paid advertising not feasible"
                />
              </div>
            </TabsContent>

            <TabsContent value="execution" className="mt-6 space-y-4">
              {/* Success Metrics */}
              <div>
                <Label htmlFor="success-metrics">Success Metrics (comma-separated)</Label>
                <Input
                  id="success-metrics"
                  value={Array.isArray(editedContent.success_metrics) ? editedContent.success_metrics.join(', ') : ''}
                  onChange={(e) => handleArrayFieldChange('success_metrics', e.target.value)}
                  placeholder="sales leads generated, engagement rate, conversion rate"
                />
              </div>

              {/* Quick Wins */}
              <div>
                <Label htmlFor="quick-wins">Quick Wins (comma-separated)</Label>
                <Input
                  id="quick-wins"
                  value={Array.isArray(editedContent.go_to_market?.quick_wins)
                    ? editedContent.go_to_market.quick_wins.join(', ')
                    : ''}
                  onChange={(e) => {
                    const quickWins = e.target.value.split(',').map(v => v.trim()).filter(v => v)
                    const updated = {
                      ...editedContent,
                      go_to_market: {
                        ...editedContent.go_to_market,
                        quick_wins: quickWins
                      }
                    }
                    setEditedContent(updated)
                    onChange(updated)
                  }}
                  placeholder="focus on highly targeted, zero-cost tactics"
                />
              </div>

              {/* Implementation Timeline */}
              <div>
                <Label htmlFor="timeline-duration">Implementation Duration</Label>
                <Input
                  id="timeline-duration"
                  value={editedContent.go_to_market?.implementation_timeline?.duration || ''}
                  onChange={(e) => {
                    const updated = {
                      ...editedContent,
                      go_to_market: {
                        ...editedContent.go_to_market,
                        implementation_timeline: {
                          ...editedContent.go_to_market?.implementation_timeline,
                          duration: e.target.value
                        }
                      }
                    }
                    setEditedContent(updated)
                    onChange(updated)
                  }}
                  placeholder="3 months"
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Advanced Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            {t('editors.common.advancedSettings')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="raw-json">{t('editors.common.completeJson')}</Label>
            <Textarea
              id="raw-json"
              value={JSON.stringify(editedContent, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value)
                  setEditedContent(parsed)
                  onChange(parsed)
                } catch {
                  // Invalid JSON, don't update
                }
              }}
              rows={12}
              className="font-mono text-xs"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}