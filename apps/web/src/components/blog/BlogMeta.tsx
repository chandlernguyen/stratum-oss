import { useEffect } from 'react'
import type { BlogPostMeta } from '@/lib/blog'
import { buildLocalizedPath } from '@/lib/localePath'
import { DEFAULT_LOCALE, normalizeLocale } from '@/lib/locales'
import { AUTHOR_NAME, AUTHOR_URL, BRAND_NAME, SITE_URL } from '@/config/brand'

interface BlogMetaProps {
  post: BlogPostMeta
}

export function BlogMeta({ post }: BlogMetaProps) {
  const canonicalLocale = normalizeLocale(post.lang) ?? DEFAULT_LOCALE
  const canonicalPath = buildLocalizedPath(canonicalLocale, `/blog/${post.slug}`)
  const url = `${SITE_URL}${canonicalPath}`
  const image = post.featuredImage
    ? post.featuredImage.startsWith('http')
      ? post.featuredImage
      : `${SITE_URL}${post.featuredImage}`
    : `${SITE_URL}/og-image.png`

  useEffect(() => {
    // Update document title
    document.title = `${post.title} | STRATUM Blog`

    // Set meta tags
    const metaTags: Record<string, string> = {
      'description': post.excerpt,
      'og:type': 'article',
      'og:title': post.title,
      'og:description': post.excerpt,
      'og:url': url,
      'og:image': image,
      'article:published_time': post.date,
      'article:author': 'Chandler Nguyen',
      'twitter:card': 'summary_large_image',
      'twitter:title': post.title,
      'twitter:description': post.excerpt,
      'twitter:image': image,
    }

    const createdElements: HTMLElement[] = []

    Object.entries(metaTags).forEach(([key, value]) => {
      const attr = key.startsWith('og:') || key.startsWith('article:') ? 'property' : 'name'
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute(attr, key)
        document.head.appendChild(el)
        createdElements.push(el)
      }
      el.setAttribute('content', value)
    })

    // Add JSON-LD
    const jsonLd = document.createElement('script')
    jsonLd.type = 'application/ld+json'
    jsonLd.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.excerpt,
      image: image,
      datePublished: post.date,
      // Author metadata is omitted entirely when no author is configured,
      // rather than emitting a placeholder person.
      ...(AUTHOR_NAME
        ? { author: { "@type": "Person", name: AUTHOR_NAME, ...(AUTHOR_URL ? { url: AUTHOR_URL } : {}) } }
        : {}),
      publisher: { "@type": "Organization", name: BRAND_NAME, url: SITE_URL },
      mainEntityOfPage: url,
    })
    document.head.appendChild(jsonLd)

    // Add canonical
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement
    const createdCanonical = !canonical
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = url

    return () => {
      createdElements.forEach(el => el.remove())
      jsonLd.remove()
      if (createdCanonical && canonical) canonical.remove()
      document.title = 'STRATUM - Intelligence Over Execution'
    }
  }, [post, url, image])

  return null
}
