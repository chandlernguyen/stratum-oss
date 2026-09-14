import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useClientContext } from '@/contexts/ClientContext';
import { buildContextAwareUrl } from '@/utils/multiTenantRouting';
import {
  FileText,
  Brain,
  Target,
  Mail,
  Calendar,
  Lightbulb,
  Layout,
  BookOpen,
  FileSearch,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface ContentTool {
  id: string;
  translationKey: string;
  icon: React.ElementType;
  href: string;
  badgeKey?: string;
  available: boolean;
}

const contentTools: ContentTool[] = [
  {
    id: 'seo-blog',
    translationKey: 'seoBlog',
    icon: FileText,
    href: '/content/tool/seo-blog',
    badgeKey: 'popular',
    available: true
  },
  {
    id: 'thought-leadership',
    translationKey: 'thoughtLeadership',
    icon: Brain,
    href: '/content/tool/thought-leadership',
    available: true
  },
  {
    id: 'usp-content',
    translationKey: 'uspContent',
    icon: Target,
    href: '/content/tool/usp-content',
    available: true
  },
  {
    id: 'email-drip',
    translationKey: 'emailDrip',
    icon: Mail,
    href: '/content/tool/email-drip',
    badgeKey: 'highImpact',
    available: true
  },
  {
    id: 'social-calendar',
    translationKey: 'socialCalendar',
    icon: Calendar,
    href: '/content/tool/social-calendar',
    available: true
  },
  {
    id: 'content-plan',
    translationKey: 'contentPlan',
    icon: Layout,
    href: '/content/tool/content-plan',
    available: true
  },
  {
    id: 'content-ideation',
    translationKey: 'contentIdeation',
    icon: Lightbulb,
    href: '/content/tool/content-ideation',
    available: true
  },
  {
    id: 'blog-templates',
    translationKey: 'blogTemplates',
    icon: BookOpen,
    href: '/content/tool/blog-templates',
    available: true
  },
  {
    id: 'content-analysis',
    translationKey: 'contentAnalysis',
    icon: FileSearch,
    href: '/content/tool/content-analysis',
    available: true
  }
];

export function ContentToolGrid() {
  const { clientSlug } = useClientContext();
  const { t } = useTranslation('agents');

  return (
    <div className="space-y-8">
      {/* Header Section - Mobile optimized text sizes */}
      <div className="text-center max-w-3xl mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4">
          {t('content.page.toolGrid.header.title')}
        </h2>
        <p className="text-base md:text-lg text-muted-foreground">
          {t('content.page.toolGrid.header.subtitle')}
        </p>
      </div>

      {/* Quick Stats - Mobile: 2x2 grid, Tablet+: 4 columns */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-4xl mx-auto">
        <Card className="border-slate-500/20">
          <CardContent className="pt-4 md:pt-6 pb-4 md:pb-6">
            <div className="text-center">
              <div className="text-xl md:text-2xl font-bold text-brand-slate dark:text-gray-400">9</div>
              <div className="text-xs md:text-sm text-muted-foreground">{t('content.page.toolGrid.stats.activeTools')}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-500/20">
          <CardContent className="pt-4 md:pt-6 pb-4 md:pb-6">
            <div className="text-center">
              <div className="text-xl md:text-2xl font-bold text-brand-success">17+</div>
              <div className="text-xs md:text-sm text-muted-foreground">{t('content.page.toolGrid.stats.contentTypes')}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-500/20">
          <CardContent className="pt-4 md:pt-6 pb-4 md:pb-6">
            <div className="text-center">
              <div className="text-xl md:text-2xl font-bold text-amber-600 dark:text-amber-400">5 min</div>
              <div className="text-xs md:text-sm text-muted-foreground">{t('content.page.toolGrid.stats.avgGeneration')}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-500/20">
          <CardContent className="pt-4 md:pt-6 pb-4 md:pb-6">
            <div className="text-center">
              <div className="text-xl md:text-2xl font-bold text-brand-gold">∞</div>
              <div className="text-xs md:text-sm text-muted-foreground">{t('content.page.toolGrid.stats.variations')}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contentTools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Card
              key={tool.id}
              className={`relative transition-all duration-200 ${
                tool.available
                  ? 'hover:shadow-lg hover:scale-[1.02] cursor-pointer'
                  : 'opacity-60'
              }`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={`p-2 rounded-lg ${
                    tool.available
                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  {tool.badgeKey && (
                    <Badge
                      variant={tool.available ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {t(`content.page.toolGrid.badges.${tool.badgeKey}`)}
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-lg mt-3">
                  {t(`content.page.toolGrid.tools.${tool.translationKey}.name`)}
                </CardTitle>
                <CardDescription className="text-sm">
                  {t(`content.page.toolGrid.tools.${tool.translationKey}.description`)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {tool.available ? (
                  <Link to={buildContextAwareUrl(tool.href, clientSlug) || tool.href}>
                    <Button className="w-full group min-h-12 bg-gradient-to-r from-brand-gold to-amber-400 hover:from-amber-600 hover:to-amber-500 text-white">
                      <Sparkles className="h-4 w-4 mr-2" />
                      {t('content.page.toolGrid.buttons.startCreating')}
                      <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                ) : (
                  <Button variant="outline" className="w-full min-h-12" disabled>
                    {t('content.page.toolGrid.badges.comingSoon')}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Call to Action - Mobile: Stacked buttons, Desktop: Side-by-side */}
      <Card className="bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/30 border-amber-200 dark:border-amber-800">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <h3 className="text-lg md:text-xl font-semibold">
              {t('content.page.toolGrid.cta.title')}
            </h3>
            <p className="text-sm md:text-base text-muted-foreground px-4">
              {t('content.page.toolGrid.cta.description')}
            </p>
            <div className="flex flex-col md:flex-row gap-3 md:gap-4 justify-center px-4 md:px-0">
              <Link to={buildContextAwareUrl("/content/tool/seo-blog", clientSlug) || "/content/tool/seo-blog"} className="w-full md:w-auto">
                <Button className="min-h-12 w-full md:w-auto bg-gradient-to-r from-brand-gold to-amber-400 hover:from-amber-600 hover:to-amber-500 text-white">
                  <FileText className="h-4 w-4 mr-2" />
                  {t('content.page.toolGrid.cta.seoBlog')}
                </Button>
              </Link>
              <Link to={buildContextAwareUrl("/content/tool/email-drip", clientSlug) || "/content/tool/email-drip"} className="w-full md:w-auto">
                <Button variant="outline" className="min-h-12 w-full md:w-auto border-amber-600 text-amber-600 hover:bg-amber-50 dark:border-amber-400 dark:text-amber-400 dark:hover:bg-amber-900/20">
                  <Mail className="h-4 w-4 mr-2" />
                  {t('content.page.toolGrid.cta.emailCampaign')}
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}