import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, PlayCircle, BookOpen, Users, Sparkles, ArrowRight, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export function Onboarding() {
  const navigate = useNavigate();
  const { t } = useTranslation('dashboard');

  return (
    <div className="relative min-h-full flex items-center justify-center py-12 px-4">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 w-72 h-72 bg-slate-500/5 rounded-full blur-3xl" />
      </div>

      <Card className={cn(
        "relative w-full max-w-2xl overflow-hidden",
        "border border-slate-200/80 dark:border-slate-700/80",
        "shadow-2xl shadow-slate-900/10 dark:shadow-black/30"
      )}>
        {/* Grain texture */}
        <div className="absolute inset-0 opacity-[0.015] pointer-events-none rounded-xl overflow-hidden">
          <div className="w-full h-full" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }} />
        </div>

        <CardHeader className="relative text-center space-y-6 pb-6">
          {/* Premium badge */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-500/10 to-blue-600/10 border border-blue-500/20">
              <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-400">{t('agency.onboarding.badge')}</span>
            </div>
          </div>

          {/* Premium icon */}
          <div className="flex items-center justify-center">
            <div className={cn(
              "p-4 rounded-2xl",
              "bg-gradient-to-br from-blue-500 to-blue-600",
              "shadow-xl shadow-blue-500/25"
            )}>
              <Users className="h-8 w-8 text-white" />
            </div>
          </div>

          <div className="space-y-3">
            <CardTitle className="font-serif text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100">
              {t('agency.onboarding.title')}
            </CardTitle>
            <CardDescription className="text-base md:text-lg text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              {t('agency.onboarding.description')}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="relative space-y-8 px-6 md:px-8 pb-8">
          {/* Primary CTA - Add Client */}
          <div className="space-y-4">
            <Button
              size="lg"
              onClick={() => navigate('/clients/new')}
              className={cn(
                "w-full h-14 text-base font-medium",
                "bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800",
                "shadow-lg shadow-slate-900/20",
                "transition-all duration-200 hover:-translate-y-0.5",
                "group"
              )}
            >
              <Plus className="mr-2 h-5 w-5" />
              {t('agency.onboarding.addFirstClient')}
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              {t('agency.onboarding.ctaHint')}
            </p>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-600 to-transparent" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-4 text-xs font-medium tracking-wide text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800">
                {t('agency.onboarding.learnPlatform')}
              </span>
            </div>
          </div>

          {/* Learning resources */}
          <div className="grid gap-3">
            {/* Video resource (coming soon) */}
            <div className={cn(
              "flex items-center gap-4 p-4 rounded-xl",
              "bg-slate-50/50 dark:bg-slate-800/50",
              "border border-slate-200/50 dark:border-slate-700/50",
              "opacity-60 cursor-not-allowed"
            )}>
              <div className={cn(
                "p-2.5 rounded-xl",
                "bg-slate-200 dark:bg-slate-700"
              )}>
                <PlayCircle className="h-5 w-5 text-slate-400 dark:text-slate-500" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-500 dark:text-slate-400">
                  {t('agency.onboarding.videoTitle')}
                </p>
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  {t('agency.onboarding.videoHint')}
                </p>
              </div>
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                {t('agency.onboarding.soon')}
              </span>
            </div>

            {/* Guide resource (active) */}
            <button
              onClick={() => navigate('/agency-guide')}
              className={cn(
                "flex items-center gap-4 p-4 rounded-xl text-left",
                "bg-white dark:bg-slate-800/80",
                "border border-slate-200/80 dark:border-slate-700/80",
                "hover:border-amber-400/50 dark:hover:border-amber-500/50",
                "hover:shadow-lg hover:shadow-amber-500/10",
                "transition-all duration-200",
                "group"
              )}
            >
              <div className={cn(
                "p-2.5 rounded-xl",
                "bg-gradient-to-br from-amber-500 to-amber-600",
                "shadow-sm",
                "group-hover:scale-110 transition-transform duration-300"
              )}>
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className={cn(
                  "font-medium transition-colors",
                  "text-slate-900 dark:text-slate-100",
                  "group-hover:text-amber-600 dark:group-hover:text-amber-500"
                )}>
                  {t('agency.onboarding.guideTitle')}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('agency.onboarding.guideDescription')}
                </p>
              </div>
              <ArrowRight className={cn(
                "h-4 w-4 transition-all duration-300",
                "text-slate-300 dark:text-slate-600",
                "group-hover:text-amber-500 group-hover:translate-x-1"
              )} />
            </button>
          </div>

          {/* Trust indicators */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-center gap-4 text-sm text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                {t('agency.onboarding.unlimitedClients')}
              </span>
              <span className="w-px h-4 bg-slate-300 dark:bg-slate-600" />
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                {t('agency.onboarding.fullAiAccess')}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
