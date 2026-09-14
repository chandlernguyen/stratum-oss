declare module '*.mdx' {
  import type { ComponentType } from 'react'

  export const frontmatter: {
    title: string
    slug: string
    date: string
    categories: string[]
    tags: string[]
    featuredImage?: string
    excerpt: string
    category: 'pillar' | 'story' | 'announcement'
  }

  const MDXComponent: ComponentType
  export default MDXComponent
}
