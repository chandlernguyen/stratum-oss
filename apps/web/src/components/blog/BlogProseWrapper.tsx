import { cn } from '@/lib/utils'

export function BlogProseWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "max-w-none overflow-x-hidden",
        // Headings — serif font from design system
        "[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:font-serif [&_h1]:text-brand-charcoal [&_h1]:dark:text-slate-100 [&_h1]:mt-10 [&_h1]:mb-4",
        "[&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:font-serif [&_h2]:text-brand-charcoal [&_h2]:dark:text-slate-100 [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:border-b [&_h2]:border-slate-200 [&_h2]:dark:border-slate-700 [&_h2]:pb-2",
        "[&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-brand-charcoal [&_h3]:dark:text-slate-200 [&_h3]:mt-6 [&_h3]:mb-2",
        // Body text
        "[&_p]:text-base [&_p]:leading-relaxed [&_p]:text-brand-slate [&_p]:dark:text-slate-300 [&_p]:mb-4",
        // Lists
        "[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ul]:space-y-1",
        "[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_ol]:space-y-1",
        "[&_li]:text-brand-slate [&_li]:dark:text-slate-300 [&_li]:leading-relaxed",
        // Links — brand gold
        "[&_a]:text-brand-gold [&_a]:underline [&_a]:underline-offset-2 [&_a]:hover:text-[hsl(var(--color-brand-gold)/0.8)] [&_a]:transition-colors",
        // Blockquotes — gold accent border
        "[&_blockquote]:border-l-4 [&_blockquote]:border-brand-gold [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-brand-slate [&_blockquote]:dark:text-slate-400 [&_blockquote]:my-6",
        // Code
        "[&_code]:bg-slate-100 [&_code]:dark:bg-slate-800 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono",
        "[&_pre]:bg-slate-900 [&_pre]:dark:bg-slate-950 [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:my-6 [&_pre_code]:bg-transparent [&_pre_code]:p-0",
        // Tables — display:block + overflow-x-auto enables horizontal scroll on mobile
        "[&_table]:border-collapse [&_table]:my-6 [&_table]:block [&_table]:overflow-x-auto",
        "[&_th]:bg-slate-100 [&_th]:dark:bg-slate-800 [&_th]:text-left [&_th]:px-4 [&_th]:py-2 [&_th]:text-sm [&_th]:font-semibold [&_th]:border [&_th]:border-slate-200 [&_th]:dark:border-slate-700",
        "[&_td]:px-4 [&_td]:py-2 [&_td]:text-sm [&_td]:border [&_td]:border-slate-200 [&_td]:dark:border-slate-700",
        // Misc
        "[&_strong]:font-semibold [&_strong]:text-brand-charcoal [&_strong]:dark:text-slate-100",
        "[&_hr]:border-slate-200 [&_hr]:dark:border-slate-700 [&_hr]:my-8",
        "[&_img]:rounded-lg [&_img]:my-6 [&_img]:shadow-md"
      )}
    >
      {children}
    </div>
  )
}
