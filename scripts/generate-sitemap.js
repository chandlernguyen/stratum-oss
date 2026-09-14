#!/usr/bin/env node
/**
 * Generate sitemap.xml from public routes + blog posts.
 * Runs as a prebuild step so the sitemap is always fresh.
 * Supports multilingual posts with hreflang alternates.
 */
import { readdirSync, readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
// Deploy-time origin. Set SITE_URL (or VITE_SITE_URL) in the environment.
const SITE_URL = (process.env.SITE_URL || process.env.VITE_SITE_URL || 'https://example.com').replace(/\/+$/, '')
const BLOG_DIR = join(__dirname, '../apps/web/content/blog')
const OUTPUT = join(__dirname, '../apps/web/public/sitemap.xml')
// Auto-discover enabled locales from the public/locales directory
const LOCALES_DIR = join(__dirname, '../apps/web/public/locales')
const ENABLED_PUBLIC_LOCALES = readdirSync(LOCALES_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name)
  .sort((a, b) => (a === 'en' ? -1 : b === 'en' ? 1 : a.localeCompare(b)))

const STATIC_ROUTES = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/pricing', priority: '0.9', changefreq: 'monthly' },
  { path: '/blog', priority: '0.8', changefreq: 'weekly' },
  { path: '/privacy', priority: '0.3', changefreq: 'yearly' },
  { path: '/terms', priority: '0.3', changefreq: 'yearly' },
  { path: '/contact', priority: '0.5', changefreq: 'yearly' },
]

function parseFrontmatter(content) {
  const slugMatch = content.match(/^slug:\s*['"]?([^\s'"]+)/m)
  const dateMatch = content.match(/^date:\s*['"]?([^\s'"]+)/m)
  const langMatch = content.match(/^lang:\s*['"]?([^\s'"]+)/m)
  const translationOfMatch = content.match(/^translationOf:\s*['"]?([^\s'"]+)/m)
  return {
    slug: slugMatch?.[1],
    date: dateMatch?.[1] || new Date().toISOString().split('T')[0],
    lang: langMatch?.[1] || 'en',
    translationOf: translationOfMatch?.[1] || null,
  }
}

function getBlogPosts() {
  const posts = []
  try {
    // Read top-level EN posts
    const enFiles = readdirSync(BLOG_DIR).filter(f => f.endsWith('.mdx'))
    for (const file of enFiles) {
      const content = readFileSync(join(BLOG_DIR, file), 'utf-8')
      const meta = parseFrontmatter(content)
      posts.push({ ...meta, slug: meta.slug || file.replace('.mdx', '') })
    }
    // Read language subdirectories (e.g. vi/)
    const entries = readdirSync(BLOG_DIR, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const langDir = join(BLOG_DIR, entry.name)
      const langFiles = readdirSync(langDir).filter(f => f.endsWith('.mdx'))
      for (const file of langFiles) {
        const content = readFileSync(join(langDir, file), 'utf-8')
        const meta = parseFrontmatter(content)
        posts.push({ ...meta, slug: meta.slug || file.replace('.mdx', '') })
      }
    }
  } catch {
    // ignore
  }
  return posts
}

/** Build translation map: EN slug -> { en: post, vi: post, ... } */
function buildTranslationMap(posts) {
  const map = new Map()
  const enPosts = posts.filter(p => p.lang === 'en')
  for (const p of enPosts) {
    map.set(p.slug, { en: p })
  }
  const translatedPosts = posts.filter(p => p.lang !== 'en')
  for (const p of translatedPosts) {
    if (p.translationOf && map.has(p.translationOf)) {
      map.get(p.translationOf)[p.lang] = p
    } else {
      // Standalone translated post with no EN counterpart
      map.set(p.slug, { [p.lang]: p })
    }
  }
  return map
}

function buildUrlEntry(loc, lastmod, changefreq, priority, alternates) {
  const altTags = alternates
    ? alternates.map(a =>
        `\n    <xhtml:link rel="alternate" hreflang="${a.lang}" href="${a.href}" />`
      ).join('')
    : ''
  return `
  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>${altTags}
  </url>`
}

function buildLocalizedPath(locale, path) {
  if (locale === 'en') {
    return path
  }

  if (path === '/') {
    return `/${locale}`
  }

  return `/${locale}${path}`
}

function generateSitemap() {
  const posts = getBlogPosts()
  const translationMap = buildTranslationMap(posts)
  const today = new Date().toISOString().split('T')[0]

  const urls = []

  for (const route of STATIC_ROUTES) {
    const alternates = [
      ...ENABLED_PUBLIC_LOCALES.map((locale) => ({
        lang: locale,
        href: `${SITE_URL}${buildLocalizedPath(locale, route.path)}`,
      })),
      { lang: 'x-default', href: `${SITE_URL}${route.path}` },
    ]

    for (const locale of ENABLED_PUBLIC_LOCALES) {
      urls.push(
        buildUrlEntry(
          `${SITE_URL}${buildLocalizedPath(locale, route.path)}`,
          today,
          route.changefreq,
          route.priority,
          alternates
        )
      )
    }
  }

  // Add blog posts with hreflang alternates for translated pairs
  for (const [, langs] of translationMap) {
    const langEntries = Object.entries(langs)
    // Build alternates array only if there are multiple languages
    const alternates = langEntries.length > 1
      ? [
          ...langEntries.map(([lang, p]) => ({
            lang,
            href: `${SITE_URL}${buildLocalizedPath(lang, `/blog/${p.slug}`)}`,
          })),
          { lang: 'x-default', href: `${SITE_URL}${buildLocalizedPath('en', `/blog/${(langs.en || langEntries[0][1]).slug}`)}` },
        ]
      : null

    for (const [, post] of langEntries) {
      urls.push(
        buildUrlEntry(
          `${SITE_URL}${buildLocalizedPath(post.lang, `/blog/${post.slug}`)}`,
          post.date,
          'monthly',
          '0.7',
          alternates
        )
      )
    }
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls.join('')}
</urlset>
`

  const localeCounts = ENABLED_PUBLIC_LOCALES
    .map((locale) => `${locale.toUpperCase()} static:${STATIC_ROUTES.length}`)
    .join(' + ')
  const blogCounts = posts.reduce((acc, post) => {
    acc[post.lang] = (acc[post.lang] || 0) + 1
    return acc
  }, {})
  writeFileSync(OUTPUT, sitemap)
  console.log(
    `Sitemap generated: ${localeCounts} + blog posts ${Object.entries(blogCounts).map(([lang, count]) => `${lang.toUpperCase()}:${count}`).join(', ')} = ${urls.length} URLs`
  )
}

generateSitemap()
