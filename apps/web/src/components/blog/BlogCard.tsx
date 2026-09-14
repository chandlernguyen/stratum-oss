import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { BlogPostMeta } from '@/lib/blog'
import { formatDate as formatLocalizedDate } from '@/lib/i18n'
import { DEFAULT_LOCALE, normalizeLocale } from '@/lib/locales'
import { ArrowRight } from 'lucide-react'
import { useLocalizedPath } from '@/hooks/useLocalizedPath'

interface BlogCardProps {
  post: BlogPostMeta
  featured?: boolean
}

const hubColors: Record<string, string> = {
  'Marketing Intelligence': 'bg-[hsl(var(--color-brand-gold)/0.1)] text-[hsl(var(--color-brand-gold))] border-[hsl(var(--color-brand-gold)/0.2)]',
  'Marketing Frameworks': 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  'AI Agents': 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
  'Agency Operations': 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
}

function getHubColor(categories: string[]) {
  for (const cat of categories) {
    for (const [key, val] of Object.entries(hubColors)) {
      if (cat.includes(key) || key.includes(cat)) return val
    }
  }
  return 'bg-[hsl(var(--color-brand-slate)/0.1)] text-brand-slate border-[hsl(var(--color-brand-slate)/0.2)]'
}

export function BlogCard({ post, featured = false }: BlogCardProps) {
  const navigate = useNavigate()
  const { t } = useTranslation('blog')
  const { localizePath } = useLocalizedPath()
  const hubColor = getHubColor(post.categories)
  const hub = post.categories[0] || 'Insights'
  const locale = normalizeLocale(post.lang) ?? DEFAULT_LOCALE

  if (featured) {
    return (
      <article
        onClick={() => navigate(localizePath(`/blog/${post.slug}`))}
        className={cn(
          "group cursor-pointer grid grid-cols-1 lg:grid-cols-2 gap-0 overflow-hidden rounded-2xl",
          "bg-brand-charcoal",
          "hover:shadow-2xl hover:shadow-[hsl(var(--color-brand-gold)/0.15)]",
          "transition-all duration-500 ease-out"
        )}
      >
        {post.featuredImage && (
          <div className="aspect-[16/10] lg:aspect-auto overflow-hidden relative">
            <img
              src={post.featuredImage}
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--color-brand-charcoal)/0.4)] to-transparent lg:from-transparent lg:to-[hsl(var(--color-brand-charcoal)/0.6)]" />
          </div>
        )}
        <div className="p-8 lg:p-10 flex flex-col justify-center">
          <div className="flex items-center gap-3 mb-4">
            <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full border", hubColor)}>
              {hub}
            </span>
              {post.category === 'pillar' && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[hsl(var(--color-brand-gold)/0.2)] text-brand-gold border border-[hsl(var(--color-brand-gold)/0.3)]">
                  {t('post.completeGuide')}
                </span>
              )}
          </div>
          <h2 className="text-2xl lg:text-3xl font-bold font-serif text-white leading-tight mb-3 group-hover:text-brand-gold transition-colors duration-300">
            {post.title}
          </h2>
          <p className="text-slate-300 leading-relaxed mb-6 line-clamp-3">
            {post.excerpt}
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <time dateTime={post.date}>
                {formatLocalizedDate(post.date, locale, { month: 'short', day: 'numeric', year: 'numeric' })}
              </time>
              <span className="w-1 h-1 rounded-full bg-slate-600" />
              <span>{post.readingTime} {t('post.minRead')}</span>
            </div>
            <span className="flex items-center gap-1.5 text-sm font-medium text-brand-gold group-hover:gap-2.5 transition-all duration-300">
              {t('post.read')} <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </article>
    )
  }

  return (
    <article
      onClick={() => navigate(localizePath(`/blog/${post.slug}`))}
      className={cn(
        "group cursor-pointer flex flex-col rounded-xl overflow-hidden",
        "border border-slate-200/80 dark:border-slate-700/50",
        "bg-white dark:bg-slate-900/60",
        "hover:border-[hsl(var(--color-brand-gold)/0.3)] dark:hover:border-[hsl(var(--color-brand-gold)/0.2)]",
        "hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-black/30",
        "transition-all duration-300 ease-out"
      )}
    >
      {post.featuredImage && (
        <div className="aspect-[16/9] overflow-hidden bg-slate-100 dark:bg-slate-800 relative">
          <img
            src={post.featuredImage}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500 ease-out"
            loading="lazy"
          />
          <div className="absolute top-3 left-3">
            <span className={cn("text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border backdrop-blur-sm", hubColor)}>
              {hub}
            </span>
          </div>
        </div>
      )}
      <div className="flex flex-col flex-1 p-5">
        <div className="flex items-center gap-2 mb-3 text-xs text-brand-slate">
          <time dateTime={post.date}>
            {formatLocalizedDate(post.date, locale, { month: 'short', day: 'numeric' })}
          </time>
          <span className="w-0.5 h-0.5 rounded-full bg-brand-slate" />
          <span>{post.readingTime} {t('post.min')}</span>
          {post.category === 'pillar' && (
            <>
              <span className="w-0.5 h-0.5 rounded-full bg-brand-slate" />
              <span className="text-brand-gold font-medium">{t('post.completeGuide')}</span>
            </>
          )}
        </div>
        <h2 className={cn(
          "text-[17px] font-semibold leading-snug mb-2 font-serif",
          "text-brand-charcoal dark:text-slate-100",
          "group-hover:text-brand-gold",
          "transition-colors duration-200"
        )}>
          {post.title}
        </h2>
        <p className="text-sm text-brand-slate leading-relaxed line-clamp-2 flex-1">
          {post.excerpt}
        </p>
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
          <span className="flex items-center gap-1.5 text-xs font-medium text-brand-slate group-hover:text-brand-gold transition-colors">
            {t('post.readArticle')} <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </article>
  )
}
