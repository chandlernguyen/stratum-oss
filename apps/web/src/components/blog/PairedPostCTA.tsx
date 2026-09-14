import { ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BlogPostMeta } from '@/lib/blog'

interface PairedPostCTAProps {
  pairedPost: NonNullable<BlogPostMeta['pairedPost']>
  slug: string
}

export function PairedPostCTA({ pairedPost, slug }: PairedPostCTAProps) {
  const url = `${pairedPost.url}?utm_source=stratum&utm_medium=blog&utm_campaign=${slug}`

  return (
    <aside
      className={cn(
        "mt-10 p-5 sm:p-6 rounded-xl",
        "border border-[hsl(var(--color-brand-gold)/0.25)]",
        "bg-[hsl(var(--color-brand-gold)/0.04)] dark:bg-[hsl(var(--color-brand-gold)/0.06)]"
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-slate mb-2">
        Read the founder's take
      </p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "group flex items-start gap-2",
          "text-brand-charcoal dark:text-slate-100",
          "hover:text-brand-gold transition-colors"
        )}
      >
        <span className="text-base sm:text-lg font-serif font-semibold leading-snug">
          {pairedPost.title}
        </span>
        <ExternalLink className="w-4 h-4 mt-1 shrink-0 text-brand-slate group-hover:text-brand-gold transition-colors" />
      </a>
      <p className="text-xs text-brand-slate mt-2">
        on {pairedPost.site}
      </p>
    </aside>
  )
}
