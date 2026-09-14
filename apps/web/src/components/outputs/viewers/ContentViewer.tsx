import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  PenTool, FileText, Share2, Mail, MessageSquare, Image, Video,
  Calendar, Globe, Users, Heart, Eye, Hash, AtSign
} from 'lucide-react'
import { renderValue } from '../shared/ViewerUtils'
import { GenericViewer } from './GenericViewer'
import { SimpleCollapsibleMarkdown } from '@/components/agents/messages/SimpleCollapsibleMarkdown'

interface ContentViewerProps {
  content: any
  hasStructuredData: boolean
}

export function ContentViewer({ content, hasStructuredData }: ContentViewerProps) {
  // Handle empty or invalid content
  if (!content || (typeof content === 'object' && Object.keys(content).length === 0)) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <PenTool className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No content data available</p>
      </div>
    )
  }

  // Handle string content - render as markdown
  if (typeof content === 'string') {
    return (
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <SimpleCollapsibleMarkdown content={content} />
      </div>
    )
  }

  // Check if this looks like content data
  const hasContentData = content.content || content.copy || content.social_posts ||
                         content.email_templates || content.ad_copy || content.blog_posts ||
                         content.content_calendar || content.campaigns || content.creative ||
                         content.messaging || content.headlines

  // Fallback for unknown formats
  if (!hasContentData) {
    return <GenericViewer content={content} hasStructuredData={hasStructuredData} />
  }

  return (
    <div className="space-y-6">
      {hasStructuredData && (
        <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 px-3 py-2 rounded-lg">
          <Badge variant="outline" className="bg-orange-100 border-orange-300 text-orange-700">
            Enhanced Content Data
          </Badge>
          <span className="text-xs">AI-structured content and creative materials</span>
        </div>
      )}

      {/* Content Header */}
      {(content.campaign_name || content.content_summary || content.theme) && (
        <Card className="border-l-4 border-l-orange-500 bg-gradient-to-r from-orange-50 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <PenTool className="w-6 h-6 text-orange-600" />
              {content.campaign_name || content.theme || 'Content Portfolio'}
            </CardTitle>
            {content.content_summary && (
              <p className="text-sm text-muted-foreground leading-relaxed">
                {content.content_summary}
              </p>
            )}
            {content.target_audience && (
              <Badge variant="outline" className="w-fit">
                Target: {content.target_audience}
              </Badge>
            )}
          </CardHeader>
        </Card>
      )}

      {/* Content Statistics */}
      <ContentStatsSection content={content} />

      {/* Main Content Tabs */}
      <Tabs defaultValue="social" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="social">Social Media</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="ads">Advertising</TabsTrigger>
          <TabsTrigger value="content">Long-form</TabsTrigger>
        </TabsList>

        <TabsContent value="social" className="mt-6 space-y-4">
          <SocialMediaSection content={content} />
        </TabsContent>

        <TabsContent value="email" className="mt-6 space-y-4">
          <EmailSection content={content} />
        </TabsContent>

        <TabsContent value="ads" className="mt-6 space-y-4">
          <AdvertisingSection content={content} />
        </TabsContent>

        <TabsContent value="content" className="mt-6 space-y-4">
          <LongFormSection content={content} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Content Statistics Section
function ContentStatsSection({ content }: { content: any }) {
  // Extract content statistics
  const totalPosts = content.total_posts || (content.social_posts && Array.isArray(content.social_posts) ? content.social_posts.length : null)
  const totalEmails = content.total_emails || (content.email_templates && Array.isArray(content.email_templates) ? content.email_templates.length : null)
  const totalAds = content.total_ads || (content.ad_copy && Array.isArray(content.ad_copy) ? content.ad_copy.length : null)
  const contentPieces = content.content_pieces || (content.blog_posts && Array.isArray(content.blog_posts) ? content.blog_posts.length : null)

  if (!totalPosts && !totalEmails && !totalAds && !contentPieces) {
    return null
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {totalPosts && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Social Posts</p>
                <p className="text-2xl font-bold text-blue-600">{totalPosts}</p>
              </div>
              <Share2 className="w-8 h-8 text-blue-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
      )}

      {totalEmails && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email Templates</p>
                <p className="text-2xl font-bold text-green-600">{totalEmails}</p>
              </div>
              <Mail className="w-8 h-8 text-green-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
      )}

      {totalAds && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ad Variants</p>
                <p className="text-2xl font-bold text-amber-600">{totalAds}</p>
              </div>
              <Eye className="w-8 h-8 text-amber-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
      )}

      {contentPieces && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Content Pieces</p>
                <p className="text-2xl font-bold text-orange-600">{contentPieces}</p>
              </div>
              <FileText className="w-8 h-8 text-orange-500 opacity-60" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Social Media Content Section
function SocialMediaSection({ content }: { content: any }) {
  return (
    <div className="space-y-4">
      {/* Social Media Posts */}
      {content.social_posts && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Share2 className="w-4 h-4 text-blue-500" />
              Social Media Posts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Array.isArray(content.social_posts) ? (
              <div className="space-y-4">
                {content.social_posts.slice(0, 6).map((post: any, i: number) => (
                  <ContentPreviewCard
                    key={i}
                    content={post}
                    platform={post.platform || 'social'}
                    icon={<Share2 className="w-4 h-4" />}
                  />
                ))}
                {content.social_posts.length > 6 && (
                  <p className="text-sm text-muted-foreground text-center">
                    +{content.social_posts.length - 6} more posts
                  </p>
                )}
              </div>
            ) : (
              renderValue(content.social_posts)
            )}
          </CardContent>
        </Card>
      )}

      {/* Hashtag Strategy */}
      {content.hashtags && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Hash className="w-4 h-4 text-indigo-500" />
              Hashtag Strategy
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderValue(content.hashtags)}
          </CardContent>
        </Card>
      )}

      {/* Social Media Calendar */}
      {content.content_calendar && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="w-4 h-4 text-emerald-500" />
              Content Calendar
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderValue(content.content_calendar)}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Email Marketing Section
function EmailSection({ content }: { content: any }) {
  return (
    <div className="space-y-4">
      {/* Email Templates */}
      {content.email_templates && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="w-4 h-4 text-green-500" />
              Email Templates
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Array.isArray(content.email_templates) ? (
              <div className="space-y-4">
                {content.email_templates.slice(0, 4).map((email: any, i: number) => (
                  <ContentPreviewCard
                    key={i}
                    content={email}
                    platform="email"
                    icon={<Mail className="w-4 h-4" />}
                  />
                ))}
                {content.email_templates.length > 4 && (
                  <p className="text-sm text-muted-foreground text-center">
                    +{content.email_templates.length - 4} more templates
                  </p>
                )}
              </div>
            ) : (
              renderValue(content.email_templates)
            )}
          </CardContent>
        </Card>
      )}

      {/* Subject Lines */}
      {content.subject_lines && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AtSign className="w-4 h-4 text-blue-500" />
              Subject Lines
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderValue(content.subject_lines)}
          </CardContent>
        </Card>
      )}

      {/* Email Sequences */}
      {content.email_sequences && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="w-4 h-4 text-amber-500" />
              Email Sequences
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderValue(content.email_sequences)}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Advertising Content Section
function AdvertisingSection({ content }: { content: any }) {
  return (
    <div className="space-y-4">
      {/* Ad Copy */}
      {content.ad_copy && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Eye className="w-4 h-4 text-amber-500" />
              Advertisement Copy
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Array.isArray(content.ad_copy) ? (
              <div className="space-y-4">
                {content.ad_copy.slice(0, 4).map((ad: any, i: number) => (
                  <ContentPreviewCard
                    key={i}
                    content={ad}
                    platform="advertising"
                    icon={<Eye className="w-4 h-4" />}
                  />
                ))}
                {content.ad_copy.length > 4 && (
                  <p className="text-sm text-muted-foreground text-center">
                    +{content.ad_copy.length - 4} more variations
                  </p>
                )}
              </div>
            ) : (
              renderValue(content.ad_copy)
            )}
          </CardContent>
        </Card>
      )}

      {/* Headlines */}
      {content.headlines && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="w-4 h-4 text-orange-500" />
              Headlines
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderValue(content.headlines)}
          </CardContent>
        </Card>
      )}

      {/* Creative Assets */}
      {content.creative_assets && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Image className="w-4 h-4 text-pink-500" />
              Creative Assets
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderValue(content.creative_assets)}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Long-form Content Section
function LongFormSection({ content }: { content: any }) {
  return (
    <div className="space-y-4">
      {/* Blog Posts */}
      {content.blog_posts && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="w-4 h-4 text-emerald-500" />
              Blog Posts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderValue(content.blog_posts)}
          </CardContent>
        </Card>
      )}

      {/* Articles */}
      {content.articles && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="w-4 h-4 text-blue-500" />
              Articles
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderValue(content.articles)}
          </CardContent>
        </Card>
      )}

      {/* Video Scripts */}
      {content.video_scripts && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Video className="w-4 h-4 text-red-500" />
              Video Scripts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderValue(content.video_scripts)}
          </CardContent>
        </Card>
      )}

      {/* Case Studies */}
      {content.case_studies && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-4 h-4 text-indigo-500" />
              Case Studies
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderValue(content.case_studies)}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Reusable Content Preview Card Component
function ContentPreviewCard({
  content,
  platform,
  icon
}: {
  content: any,
  platform: string,
  icon: React.ReactNode
}) {
  const title = content.title || content.subject || content.headline || 'Untitled'
  const preview = content.content || content.body || content.copy || content.text || ''
  const truncatedPreview = typeof preview === 'string' && preview.length > 150
    ? preview.slice(0, 150) + '...'
    : preview

  return (
    <div className="border rounded-lg p-4 space-y-2 hover:bg-muted/50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-sm">{title}</span>
        </div>
        <Badge variant="outline" className="text-xs">
          {platform}
        </Badge>
      </div>
      {truncatedPreview && (
        <p className="text-sm text-muted-foreground leading-relaxed">
          {typeof truncatedPreview === 'string' ? truncatedPreview : JSON.stringify(truncatedPreview)}
        </p>
      )}
      {content.metrics && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {content.metrics.engagement && (
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3" />
              {content.metrics.engagement}
            </span>
          )}
          {content.metrics.reach && (
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {content.metrics.reach}
            </span>
          )}
        </div>
      )}
    </div>
  )
}