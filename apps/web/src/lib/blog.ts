/**
 * Blog post registry — build-time discovery of all MDX posts
 * Supports multilingual content via `lang` frontmatter field
 */

import { DEFAULT_LOCALE, getFallbackLocale, normalizeLocale } from '@/lib/locales'

export interface BlogPostMeta {
  title: string
  slug: string
  date: string
  categories: string[]
  tags: string[]
  featuredImage?: string
  excerpt: string
  category: 'pillar' | 'story' | 'announcement'
  readingTime: number
  /** Language code — defaults to 'en' if not specified in frontmatter */
  lang?: string
  /** Slug of the original post this is a translation of */
  translationOf?: string
  /** Paired post published on a sibling site */
  pairedPost?: {
    title: string
    site: string
    url: string
  }
}

export interface BlogPost {
  meta: BlogPostMeta
  Component: React.ComponentType
}

/** Content hubs for blog navigation */
export const CONTENT_HUBS = [
  { id: 'all', translationKey: 'hubs.all' },
  { id: 'Marketing Intelligence', translationKey: 'hubs.marketingIntelligence' },
  { id: 'Marketing Frameworks', translationKey: 'hubs.marketingFrameworks' },
  { id: 'AI Agents', translationKey: 'hubs.aiAgents' },
  { id: 'Agency Operations', translationKey: 'hubs.agencyOperations' },
] as const

export type HubId = (typeof CONTENT_HUBS)[number]['id']

// Discover MDX posts recursively — picks up both /content/blog/*.mdx and /content/blog/vi/*.mdx
const modules = import.meta.glob<{
  frontmatter: Omit<BlogPostMeta, 'readingTime'>
  default: React.ComponentType
}>('../../content/blog/**/*.mdx', { eager: true })

function estimateReadingTime(slug: string): number {
  const mod = Object.values(modules).find(m => m.frontmatter.slug === slug)
  if (!mod) return 5
  return mod.frontmatter.category === 'pillar' ? 8 : 5
}

function toPostMeta(frontmatter: Omit<BlogPostMeta, 'readingTime'>): BlogPostMeta {
  return {
    ...frontmatter,
    lang: frontmatter.lang || DEFAULT_LOCALE,
    readingTime: estimateReadingTime(frontmatter.slug),
  }
}

function getCanonicalBlogLanguage(lang?: string): string {
  return normalizeLocale(lang) || DEFAULT_LOCALE
}

function getTranslationGroupKey(post: BlogPostMeta): string {
  return post.translationOf || post.slug
}

/** Get all posts, optionally filtered by language */
export function getAllPosts(lang?: string): BlogPostMeta[] {
  const posts: BlogPostMeta[] = Object.values(modules).map((mod) => toPostMeta(mod.frontmatter))
  const targetLang = lang ? getCanonicalBlogLanguage(lang) : null
  const filtered = targetLang ? posts.filter((p) => getCanonicalBlogLanguage(p.lang) === targetLang) : posts
  return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export function getPostBySlug(slug: string): BlogPost | null {
  const entry = Object.values(modules).find(
    (mod) => mod.frontmatter.slug === slug
  )
  if (!entry) return null
  return {
    meta: toPostMeta(entry.frontmatter),
    Component: entry.default,
  }
}

export function getPostsByCategory(category: BlogPostMeta['category'], lang?: string): BlogPostMeta[] {
  return getAllPosts(lang).filter((post) => post.category === category)
}

/** Get posts filtered by content hub (matches categories array in frontmatter) */
export function getPostsByHub(hubId: HubId, lang?: string): BlogPostMeta[] {
  if (hubId === 'all') return getAllPosts(lang)
  return getAllPosts(lang).filter((post) =>
    post.categories.some((cat) => cat.includes(hubId) || hubId.includes(cat))
  )
}

/** Get related posts for a given post (same hub + same language, excluding self) */
export function getRelatedPosts(post: BlogPostMeta, limit = 3): BlogPostMeta[] {
  const hub = post.categories[0]
  if (!hub) return []
  const lang = getCanonicalBlogLanguage(post.lang)
  return getAllPosts(lang)
    .filter((p) => p.slug !== post.slug && p.categories.some((c) => c === hub))
    .slice(0, limit)
}

export function getAvailableBlogLanguages(): string[] {
  return Array.from(new Set(getAllPosts().map((post) => getCanonicalBlogLanguage(post.lang)))).sort()
}

export function getPreferredBlogLanguage(locale?: string | null): string {
  const availableLanguages = new Set(getAvailableBlogLanguages())
  const normalized = getCanonicalBlogLanguage(locale || DEFAULT_LOCALE)

  if (availableLanguages.has(normalized)) {
    return normalized
  }

  const fallback = getFallbackLocale(normalized)
  if (availableLanguages.has(fallback)) {
    return fallback
  }

  return DEFAULT_LOCALE
}

export function getTranslations(post: BlogPostMeta): BlogPostMeta[] {
  const groupKey = getTranslationGroupKey(post)

  return getAllPosts()
    .filter((candidate) => getTranslationGroupKey(candidate) === groupKey)
    .sort((a, b) => {
      const langA = getCanonicalBlogLanguage(a.lang)
      const langB = getCanonicalBlogLanguage(b.lang)
      if (langA === DEFAULT_LOCALE) return -1
      if (langB === DEFAULT_LOCALE) return 1
      return langA.localeCompare(langB)
    })
}

/** Get the translation of a post in another language */
export function getTranslation(post: BlogPostMeta, targetLang: string): BlogPostMeta | null {
  const normalizedTarget = getCanonicalBlogLanguage(targetLang)
  return getTranslations(post).find((candidate) => getCanonicalBlogLanguage(candidate.lang) === normalizedTarget) || null
}
