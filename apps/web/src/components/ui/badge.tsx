import * as React from "react"
import { cn } from "@/lib/utils"

const badgeVariants = {
  default: "bg-gray-900 text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200",
  secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700",
  destructive: "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50", 
  outline: "text-gray-700 border-2 border-gray-200 hover:bg-gray-50 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-800",
  success: "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50",
  warning: "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50",
  info: "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50",
  purple: "bg-slate-100 text-slate-700 hover:bg-amber-200 dark:bg-slate-900/30 dark:text-amber-400 dark:hover:bg-slate-900/50"
}

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof badgeVariants
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 whitespace-normal",
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge, badgeVariants }