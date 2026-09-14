import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { getPostsByHub, getPreferredBlogLanguage, CONTENT_HUBS, type HubId } from '@/lib/blog'
import { BlogCard } from '@/components/blog/BlogCard'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { PublicFooter } from '@/components/layout/PublicFooter'

export function BlogList() {
  const { i18n, t } = useTranslation('blog')
  const lang = getPreferredBlogLanguage(i18n.language)
  const [activeHub, setActiveHub] = useState<HubId>('all')
  const filteredPosts = getPostsByHub(activeHub, lang)
  const featuredPost = filteredPosts.find((p) => p.category === 'pillar') || filteredPosts[0]
  const remainingPosts = filteredPosts.filter((p) => p.slug !== featuredPost?.slug)

  return (
    <>
      <PublicHeader />
      <main className="min-h-screen bg-white dark:bg-slate-950">
        {/* Masthead */}
        <section className="relative pt-16 sm:pt-20 pb-10 sm:pb-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
          {/* Subtle background accent */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[hsl(var(--color-brand-gold)/0.04)] rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 mb-5">
              <div className="h-px w-8 bg-brand-gold" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-gold">
                {t('masthead.eyebrow')}
              </span>
              <div className="h-px w-8 bg-brand-gold" />
            </div>
            <h1 className="heading-display text-brand-charcoal dark:text-slate-100 mb-4">
              {t('masthead.title')}
            </h1>
            <p className="text-lg text-brand-slate max-w-xl mx-auto leading-relaxed">
              {t('masthead.description')}
            </p>
          </div>
        </section>

        {/* Hub Navigation */}
        <section className="px-4 sm:px-6 lg:px-8 pb-10">
          <div className="max-w-6xl mx-auto">
            <nav className="flex flex-wrap gap-1 justify-center border-b border-slate-200 dark:border-slate-800 pb-px">
              {CONTENT_HUBS.map((hub) => (
                <button
                  key={hub.id}
                  onClick={() => setActiveHub(hub.id)}
                  className={cn(
                    "px-4 py-2.5 text-sm font-medium transition-all duration-200 relative",
                    "border-b-2 -mb-px",
                    activeHub === hub.id
                      ? "border-brand-gold text-brand-gold"
                      : "border-transparent text-brand-slate hover:text-brand-charcoal dark:hover:text-slate-200"
                  )}
                >
                  {t(hub.translationKey)}
                  {activeHub === hub.id && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand-gold" />
                  )}
                </button>
              ))}
            </nav>
          </div>
        </section>

        {/* Featured Post */}
        {featuredPost && (
          <section className="px-4 sm:px-6 lg:px-8 pb-10">
            <div className="max-w-6xl mx-auto">
              <BlogCard post={featuredPost} featured />
            </div>
          </section>
        )}

        {/* Post Grid */}
        <section className="px-4 sm:px-6 lg:px-8 pb-20">
          <div className="max-w-6xl mx-auto">
            {remainingPosts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {remainingPosts.map((post) => (
                  <BlogCard key={post.slug} post={post} />
                ))}
              </div>
            ) : (
              <p className="text-center text-brand-slate py-12">
                {t('post.emptyHub')}
              </p>
            )}
          </div>
        </section>
      </main>
      <PublicFooter />
    </>
  )
}
