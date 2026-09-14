import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-lg border-2 border-gray-200 bg-white px-4 py-2.5 text-base font-normal text-gray-900 ring-offset-white transition-all duration-200 file:border-0 file:bg-transparent file:text-base file:font-medium placeholder:text-gray-400 hover:border-gray-300 focus:border-brand-gold focus:outline-none focus:ring-2 focus:ring-brand-gold/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-amber-400 dark:focus:ring-amber-400/20",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }