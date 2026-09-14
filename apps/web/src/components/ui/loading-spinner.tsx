import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  message?: string;
}

export function LoadingSpinner({
  size = 'md',
  className = '',
  message = 'Loading...'
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      <Loader2 className={`animate-spin text-brand-gold dark:text-amber-400 ${sizeClasses[size]}`} />
      {message && (
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">{message}</p>
      )}
    </div>
  );
}

export function PageLoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-amber-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <LoadingSpinner size="lg" message="Loading page..." />
    </div>
  );
}