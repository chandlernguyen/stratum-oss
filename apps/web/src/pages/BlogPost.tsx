import { useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ArrowRight, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DEFAULT_LOCALE, getIntlLocale, getLocaleConfig, normalizeLocale } from '@/lib/locales'
import { getPostBySlug, getPreferredBlogLanguage, getRelatedPosts, getTranslation, getTranslations } from '@/lib/blog'
import { buildLocalizedPath } from '@/lib/localePath'
import { BlogMeta } from '@/components/blog/BlogMeta'
import { BlogProseWrapper } from '@/components/blog/BlogProseWrapper'
import { PairedPostCTA } from '@/components/blog/PairedPostCTA'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { useLocalizedPath } from '@/hooks/useLocalizedPath'

function formatDate(date: string, lang: string) {
  const locale = getIntlLocale(lang)
  return new Date(date).toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' })
}

function formatShortDate(date: string, lang: string) {
  const locale = getIntlLocale(lang)
  return new Date(date).toLocaleDateString(locale, { month: 'short', day: 'numeric' })
}

export function BlogPost() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { i18n, t } = useTranslation('blog')
  const { localizePath } = useLocalizedPath()
  const post = slug ? getPostBySlug(slug) : null

  // Navigate to translated post when header language switcher is used
  useEffect(() => {
    if (!post) return
    const postLang = post.meta.lang || 'en'
    const uiLang = getPreferredBlogLanguage(i18n.language)
    if (postLang !== uiLang) {
      const translated = getTranslation(post.meta, uiLang)
      if (translated) {
        navigate(localizePath(`/blog/${translated.slug}`), { replace: true })
      }
    }
  }, [i18n.language, localizePath, post, navigate])

  if (!post) {
    return (
      <>
        <PublicHeader />
        <main className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-brand-charcoal dark:text-slate-100 mb-4">{t('post.notFoundTitle')}</h1>
            <button onClick={() => navigate(localizePath('/blog'))} className="text-brand-gold hover:underline">
              {t('post.backToBlog')}
            </button>
          </div>
        </main>
        <PublicFooter />
      </>
    )
  }

  const { meta, Component } = post
  const lang = meta.lang || 'en'
  const blogLocale = normalizeLocale(lang) ?? DEFAULT_LOCALE
  const relatedPosts = getRelatedPosts(meta)
  const hub = meta.categories[0] || 'Blog'
  const alternateTranslations = getTranslations(meta).filter((candidate) => candidate.slug !== meta.slug)
  const primaryAlternate = alternateTranslations[0] || null

  return (
    <>
      <BlogMeta post={meta} />
      {/* hreflang for SEO — link to translation if available */}
      {alternateTranslations.map((translation) => (
        <link
          key={translation.slug}
          rel="alternate"
          hrefLang={translation.lang || 'en'}
          href={buildLocalizedPath(normalizeLocale(translation.lang) ?? DEFAULT_LOCALE, `/blog/${translation.slug}`)}
        />
      ))}
      <PublicHeader />
      <main className="min-h-screen bg-white dark:bg-slate-950">
        {/* Hero area */}
        {meta.featuredImage && (
          <div className="relative w-full max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
            <div className="aspect-[2/1] sm:aspect-[21/9] rounded-xl sm:rounded-2xl overflow-hidden">
              <img
                src={meta.featuredImage}
                alt={meta.title}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          {/* Back nav + meta */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => navigate(localizePath('/blog'))}
              className="flex items-center gap-1.5 text-sm text-brand-slate hover:text-brand-gold transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {t('post.allPosts')}
            </button>
            <div className="flex items-center gap-3">
              {primaryAlternate && (
                <Link
                  to={buildLocalizedPath(normalizeLocale(primaryAlternate.lang) ?? DEFAULT_LOCALE, `/blog/${primaryAlternate.slug}`)}
                  className="flex items-center gap-1.5 text-xs font-medium text-brand-slate hover:text-brand-gold transition-colors"
                >
                  <Globe className="w-3.5 h-3.5" />
                  {getLocaleConfig(primaryAlternate.lang).nativeLabel}
                </Link>
              )}
              <span className="text-xs font-medium uppercase tracking-wider text-brand-slate">
                {hub}
              </span>
            </div>
          </div>

          {/* Article header */}
          <header className="mb-10">
            <div className="flex items-center gap-3 mb-5">
              {meta.category === 'pillar' && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[hsl(var(--color-brand-gold)/0.1)] text-brand-gold border border-[hsl(var(--color-brand-gold)/0.2)]">
                  {t('post.completeGuide')}
                </span>
              )}
              <time className="text-sm text-brand-slate" dateTime={meta.date}>
                {formatDate(meta.date, lang)}
              </time>
              <span className="w-1 h-1 rounded-full bg-brand-slate" />
              <span className="text-sm text-brand-slate">
                {meta.readingTime} {t('post.minRead')}
              </span>
            </div>
            <h1 className="heading-serif-xl text-brand-charcoal dark:text-slate-100 leading-tight mb-5">
              {meta.title}
            </h1>
            <p className="text-lg text-brand-slate leading-relaxed">
              {meta.excerpt}
            </p>
            <div className="mt-6 h-px w-16 bg-brand-gold" />
          </header>

          {/* MDX content */}
          <BlogProseWrapper>
            <Component />
          </BlogProseWrapper>

          {/* Paired post cross-link */}
          {meta.pairedPost && (
            <PairedPostCTA pairedPost={meta.pairedPost} slug={meta.slug} />
          )}

          {/* Tags */}
          <footer className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-700">
            <div className="flex flex-wrap gap-2">
              {meta.tags.map((tag) => (
                <span key={tag} className="text-xs px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-brand-slate">
                  {tag}
                </span>
              ))}
            </div>
          </footer>
        </article>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
              <div className="flex items-center gap-3 mb-8">
                <div className="h-px w-6 bg-brand-gold" />
                <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-brand-slate">
                  {t('post.moreFrom', { hub })}
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {relatedPosts.map((related) => (
                  <article
                    key={related.slug}
                    onClick={() => navigate(localizePath(`/blog/${related.slug}`))}
                    className={cn(
                      "group cursor-pointer p-5 rounded-xl",
                      "border border-slate-200/80 dark:border-slate-700/50",
                      "bg-white dark:bg-slate-900/60",
                      "hover:border-[hsl(var(--color-brand-gold)/0.3)] dark:hover:border-[hsl(var(--color-brand-gold)/0.2)]",
                      "hover:shadow-md transition-all duration-300"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-3 text-xs text-brand-slate">
                      <time dateTime={related.date}>
                        {formatShortDate(related.date, blogLocale)}
                      </time>
                      <span className="w-0.5 h-0.5 rounded-full bg-brand-slate" />
                      <span>{related.readingTime} {t('post.min')}</span>
                    </div>
                    <h3 className="text-[15px] font-semibold font-serif text-brand-charcoal dark:text-slate-100 leading-snug mb-2 group-hover:text-brand-gold transition-colors">
                      {related.title}
                    </h3>
                    <span className="flex items-center gap-1 text-xs font-medium text-brand-slate group-hover:text-brand-gold transition-colors">
                      {t('post.read')} <ArrowRight className="w-3 h-3" />
                    </span>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <PublicFooter />
    </>
  )
}
