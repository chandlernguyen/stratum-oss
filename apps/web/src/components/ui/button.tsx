import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-brand-gold text-white shadow-sm hover:bg-amber-600 hover:shadow-md focus-visible:ring-brand-gold",
        destructive:
          "bg-red-600 text-white shadow-sm hover:bg-red-700 hover:shadow-md focus-visible:ring-red-500",
        outline:
          "border-2 border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 focus-visible:ring-gray-500",
        secondary:
          "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900 focus-visible:ring-gray-500",
        ghost: "text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-gray-500",
        link: "text-brand-gold underline-offset-4 hover:text-amber-600 hover:underline focus-visible:ring-brand-gold",
        gradient: "bg-gradient-to-r from-slate-600 to-amber-600 text-white shadow-md hover:shadow-lg hover:from-slate-700 hover:to-amber-700 focus-visible:ring-amber-500",
        stratum: "bg-gradient-to-r from-[#F59E0B] to-[#FCD34D] text-white shadow-lg hover:shadow-xl hover:from-[#D97706] hover:to-[#F59E0B] focus-visible:ring-[#F59E0B] font-semibold",
      },
      size: {
        default: "h-11 px-5 py-2.5 text-base rounded-lg",
        sm: "h-11 px-3 py-2 text-sm rounded-md",
        lg: "h-14 px-8 py-3.5 text-lg rounded-xl",
        xl: "h-16 px-10 py-4 text-xl rounded-xl",
        icon: "h-12 w-12 rounded-lg", // 48x48px for WCAG 2.5.5 touch target compliance
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }