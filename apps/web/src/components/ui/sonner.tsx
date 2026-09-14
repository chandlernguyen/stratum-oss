import { Toaster as Sonner } from 'sonner'

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="bottom-center"
      expand={true}
      richColors={true}
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl group-[.toaster]:px-4 group-[.toaster]:py-3 group-[.toaster]:text-base',
          description: 'group-[.toast]:text-muted-foreground group-[.toast]:text-sm',
          actionButton:
            'group-[.toast]:bg-brand-gold group-[.toast]:text-white group-[.toast]:rounded-lg group-[.toast]:px-4 group-[.toast]:py-2 group-[.toast]:font-medium',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-lg group-[.toast]:px-4 group-[.toast]:py-2',
          success: 'group-[.toaster]:bg-green-50 group-[.toaster]:border-green-200 group-[.toaster]:text-green-800',
          error: 'group-[.toaster]:bg-red-50 group-[.toaster]:border-red-200 group-[.toaster]:text-red-800',
          warning: 'group-[.toaster]:bg-amber-50 group-[.toaster]:border-amber-200 group-[.toaster]:text-amber-800',
          info: 'group-[.toaster]:bg-blue-50 group-[.toaster]:border-blue-200 group-[.toaster]:text-blue-800',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }