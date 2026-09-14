import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronDown } from "lucide-react"

export interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
}

export interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export interface SelectContentProps {
  children: React.ReactNode;
}

export interface SelectItemProps {
  value: string;
  children: React.ReactNode;
}

export interface SelectValueProps {
  placeholder?: string;
}

const SelectContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  disabled?: boolean;
} | null>(null);

function Select({ value, onValueChange, children, disabled }: SelectProps) {
  const [open, setOpen] = React.useState(false);
  
  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen, disabled }}>
      <div className="relative">
        {children}
      </div>
    </SelectContext.Provider>
  );
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const context = React.useContext(SelectContext);
    if (!context) throw new Error("SelectTrigger must be used within Select");
    
    return (
      <button
        ref={ref}
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-lg border-2 border-gray-200 bg-white dark:bg-gray-900 px-4 py-2.5 text-base font-medium text-gray-900 dark:text-gray-100 ring-offset-white dark:ring-offset-gray-950 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all duration-200",
          !context.disabled && "hover:border-gray-300 dark:hover:border-gray-600 focus:outline-none focus:border-brand-gold dark:focus:border-amber-400 focus:ring-2 focus:ring-brand-gold/20 dark:focus:ring-amber-400/20",
          context.disabled && "cursor-not-allowed opacity-50 bg-gray-50 dark:bg-gray-800 pointer-events-none",
          className
        )}
        onClick={() => !context.disabled && context.setOpen(!context.open)}
        disabled={context.disabled}
        {...props}
      >
        {children}
        <ChevronDown className="h-5 w-5 text-gray-500 dark:text-gray-400" />
      </button>
    );
  }
);
SelectTrigger.displayName = "SelectTrigger";

function SelectValue({ placeholder }: SelectValueProps) {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error("SelectValue must be used within Select");
  
  return (
    <span className={cn(
      "text-gray-900 dark:text-gray-100",
      context.disabled && "text-gray-500 dark:text-gray-400"
    )}>
      {context.value || placeholder}
    </span>
  );
}

function SelectContent({ children }: SelectContentProps) {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error("SelectContent must be used within Select");
  
  if (!context.open) return null;
  
  return (
    <div className="absolute top-full z-50 w-full mt-2 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl">
      {children}
    </div>
  );
}

function SelectItem({ value, children }: SelectItemProps) {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error("SelectItem must be used within Select");
  
  return (
    <div
      className="cursor-pointer px-4 py-3 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-gray-800 hover:text-brand-gold dark:hover:text-amber-400 transition-all duration-200"
      onClick={() => {
        context.onValueChange(value);
        context.setOpen(false);
      }}
    >
      {children}
    </div>
  );
}

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }