import * as React from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[100px] w-full rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 text-base font-medium text-gray-900 dark:text-gray-100 ring-offset-white dark:ring-offset-gray-950 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 focus:outline-none focus:border-brand-gold dark:focus:border-amber-400 focus:ring-2 focus:ring-brand-gold/20 dark:focus:ring-amber-400/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50 dark:disabled:bg-gray-800",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }