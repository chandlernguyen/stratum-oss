import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PenTool, FileText } from 'lucide-react'

interface ContentEditorProps {
  content: any
  onChange: (updatedContent: any) => void
}

export function ContentEditor({ content, onChange }: ContentEditorProps) {
  const { t } = useTranslation(['outputs', 'common'])
  const [editedContent, setEditedContent] = useState(content)

  const handleFieldChange = (field: string, value: any) => {
    const updated = { ...editedContent, [field]: value }
    setEditedContent(updated)
    onChange(updated)
  }


  return (
    <div className="space-y-6">
      {/* Content Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PenTool className="w-5 h-5 text-orange-600" />
            {t('editors.content.portfolioInfo')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="campaign-name">{t('editors.content.campaignName')}</Label>
            <Input
              id="campaign-name"
              value={editedContent.campaign_name || editedContent.theme || ''}
              onChange={(e) => {
                handleFieldChange('campaign_name', e.target.value)
                handleFieldChange('theme', e.target.value) // Also update theme for compatibility
              }}
              placeholder={t('editors.content.campaignNamePlaceholder')}
            />
          </div>
          <div>
            <Label htmlFor="content-summary">{t('editors.content.contentSummary')}</Label>
            <Textarea
              id="content-summary"
              value={editedContent.content_summary || ''}
              onChange={(e) => handleFieldChange('content_summary', e.target.value)}
              placeholder={t('editors.content.contentSummaryPlaceholder')}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="target-audience">{t('editors.content.targetAudience')}</Label>
              <Input
                id="target-audience"
                value={editedContent.target_audience || ''}
                onChange={(e) => handleFieldChange('target_audience', e.target.value)}
                placeholder={t('editors.content.targetAudiencePlaceholder')}
              />
            </div>
            <div>
              <Label htmlFor="content-theme">{t('editors.content.contentTheme')}</Label>
              <Input
                id="content-theme"
                value={editedContent.theme || editedContent.campaign_name || ''}
                onChange={(e) => {
                  handleFieldChange('theme', e.target.value)
                }}
                placeholder={t('editors.content.contentThemePlaceholder')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Management */}
      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="social" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="social">{t('editors.content.tabs.socialMedia')}</TabsTrigger>
              <TabsTrigger value="email">{t('editors.content.tabs.email')}</TabsTrigger>
              <TabsTrigger value="ads">{t('editors.content.tabs.advertising')}</TabsTrigger>
              <TabsTrigger value="content">{t('editors.content.tabs.longForm')}</TabsTrigger>
            </TabsList>

            <TabsContent value="social" className="mt-6 space-y-4">
              {/* Social Media Posts */}
              <div>
                <Label htmlFor="social-posts">{t('editors.content.socialPosts')}</Label>
                <Textarea
                  id="social-posts"
                  value={typeof editedContent.social_posts === 'string'
                    ? editedContent.social_posts
                    : JSON.stringify(editedContent.social_posts || [], null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value)
                      handleFieldChange('social_posts', parsed)
                    } catch {
                      handleFieldChange('social_posts', e.target.value)
                    }
                  }}
                  placeholder='[{"platform": "LinkedIn", "content": "Post content here", "hashtags": "#marketing #growth"}]'
                  rows={6}
                />
              </div>

              <div>
                <Label htmlFor="hashtags">{t('editors.content.hashtagStrategy')}</Label>
                <Textarea
                  id="hashtags"
                  value={typeof editedContent.hashtags === 'string'
                    ? editedContent.hashtags
                    : JSON.stringify(editedContent.hashtags || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value)
                      handleFieldChange('hashtags', parsed)
                    } catch {
                      handleFieldChange('hashtags', e.target.value)
                    }
                  }}
                  placeholder={t('editors.content.hashtagStrategyPlaceholder')}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="content-calendar">{t('editors.content.contentCalendar')}</Label>
                <Textarea
                  id="content-calendar"
                  value={typeof editedContent.content_calendar === 'string'
                    ? editedContent.content_calendar
                    : JSON.stringify(editedContent.content_calendar || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value)
                      handleFieldChange('content_calendar', parsed)
                    } catch {
                      handleFieldChange('content_calendar', e.target.value)
                    }
                  }}
                  placeholder={t('editors.content.contentCalendarPlaceholder')}
                  rows={4}
                />
              </div>

              {/* Content Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="total-posts">{t('editors.content.totalPosts')}</Label>
                  <Input
                    id="total-posts"
                    type="number"
                    value={editedContent.total_posts || (Array.isArray(editedContent.social_posts) ? editedContent.social_posts.length : '')}
                    onChange={(e) => handleFieldChange('total_posts', parseInt(e.target.value) || 0)}
                    placeholder="12"
                  />
                </div>
                <div>
                  <Label htmlFor="content-pieces">{t('editors.content.contentPieces')}</Label>
                  <Input
                    id="content-pieces"
                    type="number"
                    value={editedContent.content_pieces || ''}
                    onChange={(e) => handleFieldChange('content_pieces', parseInt(e.target.value) || 0)}
                    placeholder="25"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="email" className="mt-6 space-y-4">
              <div>
                <Label htmlFor="email-templates">{t('editors.content.emailTemplates')}</Label>
                <Textarea
                  id="email-templates"
                  value={typeof editedContent.email_templates === 'string'
                    ? editedContent.email_templates
                    : JSON.stringify(editedContent.email_templates || [], null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value)
                      handleFieldChange('email_templates', parsed)
                    } catch {
                      handleFieldChange('email_templates', e.target.value)
                    }
                  }}
                  placeholder='[{"subject": "Welcome to our newsletter", "content": "Email body here", "type": "welcome"}]'
                  rows={6}
                />
              </div>

              <div>
                <Label htmlFor="subject-lines">{t('editors.content.subjectLines')}</Label>
                <Textarea
                  id="subject-lines"
                  value={Array.isArray(editedContent.subject_lines)
                    ? editedContent.subject_lines.join('\n')
                    : (typeof editedContent.subject_lines === 'string' ? editedContent.subject_lines : '')}
                  onChange={(e) => {
                    const lines = e.target.value.split('\n').filter(line => line.trim())
                    handleFieldChange('subject_lines', lines.length === 1 ? lines[0] : lines)
                  }}
                  placeholder={t('editors.content.subjectLinesPlaceholder')}
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="email-sequences">{t('editors.content.emailSequences')}</Label>
                <Textarea
                  id="email-sequences"
                  value={typeof editedContent.email_sequences === 'string'
                    ? editedContent.email_sequences
                    : JSON.stringify(editedContent.email_sequences || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value)
                      handleFieldChange('email_sequences', parsed)
                    } catch {
                      handleFieldChange('email_sequences', e.target.value)
                    }
                  }}
                  placeholder={t('editors.content.emailSequencesPlaceholder')}
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="total-emails">{t('editors.content.totalEmailTemplates')}</Label>
                <Input
                  id="total-emails"
                  type="number"
                  value={editedContent.total_emails || (Array.isArray(editedContent.email_templates) ? editedContent.email_templates.length : '')}
                  onChange={(e) => handleFieldChange('total_emails', parseInt(e.target.value) || 0)}
                  placeholder="8"
                />
              </div>
            </TabsContent>

            <TabsContent value="ads" className="mt-6 space-y-4">
              <div>
                <Label htmlFor="ad-copy">{t('editors.content.adCopy')}</Label>
                <Textarea
                  id="ad-copy"
                  value={typeof editedContent.ad_copy === 'string'
                    ? editedContent.ad_copy
                    : JSON.stringify(editedContent.ad_copy || [], null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value)
                      handleFieldChange('ad_copy', parsed)
                    } catch {
                      handleFieldChange('ad_copy', e.target.value)
                    }
                  }}
                  placeholder='[{"headline": "Transform Your Marketing", "body": "Get results in 30 days", "cta": "Start Now"}]'
                  rows={6}
                />
              </div>

              <div>
                <Label htmlFor="headlines">{t('editors.content.headlines')}</Label>
                <Textarea
                  id="headlines"
                  value={Array.isArray(editedContent.headlines)
                    ? editedContent.headlines.join('\n')
                    : (typeof editedContent.headlines === 'string' ? editedContent.headlines : '')}
                  onChange={(e) => {
                    const lines = e.target.value.split('\n').filter(line => line.trim())
                    handleFieldChange('headlines', lines.length === 1 ? lines[0] : lines)
                  }}
                  placeholder={t('editors.content.headlinesPlaceholder')}
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="creative-assets">{t('editors.content.creativeAssets')}</Label>
                <Textarea
                  id="creative-assets"
                  value={typeof editedContent.creative_assets === 'string'
                    ? editedContent.creative_assets
                    : JSON.stringify(editedContent.creative_assets || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value)
                      handleFieldChange('creative_assets', parsed)
                    } catch {
                      handleFieldChange('creative_assets', e.target.value)
                    }
                  }}
                  placeholder={t('editors.content.creativeAssetsPlaceholder')}
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="total-ads">{t('editors.content.totalAdVariants')}</Label>
                <Input
                  id="total-ads"
                  type="number"
                  value={editedContent.total_ads || (Array.isArray(editedContent.ad_copy) ? editedContent.ad_copy.length : '')}
                  onChange={(e) => handleFieldChange('total_ads', parseInt(e.target.value) || 0)}
                  placeholder="15"
                />
              </div>
            </TabsContent>

            <TabsContent value="content" className="mt-6 space-y-4">
              <div>
                <Label htmlFor="blog-posts">{t('editors.content.blogPosts')}</Label>
                <Textarea
                  id="blog-posts"
                  value={typeof editedContent.blog_posts === 'string'
                    ? editedContent.blog_posts
                    : JSON.stringify(editedContent.blog_posts || [], null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value)
                      handleFieldChange('blog_posts', parsed)
                    } catch {
                      handleFieldChange('blog_posts', e.target.value)
                    }
                  }}
                  placeholder={t('editors.content.blogPostsPlaceholder')}
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="articles">{t('editors.content.articles')}</Label>
                <Textarea
                  id="articles"
                  value={typeof editedContent.articles === 'string'
                    ? editedContent.articles
                    : JSON.stringify(editedContent.articles || [], null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value)
                      handleFieldChange('articles', parsed)
                    } catch {
                      handleFieldChange('articles', e.target.value)
                    }
                  }}
                  placeholder={t('editors.content.articlesPlaceholder')}
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="video-scripts">{t('editors.content.videoScripts')}</Label>
                <Textarea
                  id="video-scripts"
                  value={typeof editedContent.video_scripts === 'string'
                    ? editedContent.video_scripts
                    : JSON.stringify(editedContent.video_scripts || [], null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value)
                      handleFieldChange('video_scripts', parsed)
                    } catch {
                      handleFieldChange('video_scripts', e.target.value)
                    }
                  }}
                  placeholder={t('editors.content.videoScriptsPlaceholder')}
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="case-studies">{t('editors.content.caseStudies')}</Label>
                <Textarea
                  id="case-studies"
                  value={typeof editedContent.case_studies === 'string'
                    ? editedContent.case_studies
                    : JSON.stringify(editedContent.case_studies || [], null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value)
                      handleFieldChange('case_studies', parsed)
                    } catch {
                      handleFieldChange('case_studies', e.target.value)
                    }
                  }}
                  placeholder={t('editors.content.caseStudiesPlaceholder')}
                  rows={4}
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
            <FileText className="w-5 h-5" />
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