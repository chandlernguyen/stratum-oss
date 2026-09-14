import { cn } from '@/lib/utils';

/**
 * STRAŦUM Layered Icon Component
 *
 * Implements the brand's layered strata pattern for loading states,
 * progress indicators, and visual identity elements.
 *
 * Brand Guidelines: docs/design/STRAŦUM_BRAND_GUIDELINES.md
 * - Darkest layer: Charcoal #1E293B
 * - Medium layer: Slate #64748B
 * - Light layer: Light slate #94A3B8
 */

interface LayeredIconProps {
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Animation type */
  variant?: 'pulse' | 'wave' | 'slide' | 'static';
  /** Additional CSS classes */
  className?: string;
  /** Accessible label for screen readers */
  'aria-label'?: string;
}

const sizeClasses = {
  sm: 'w-8 h-6',
  md: 'w-12 h-9',
  lg: 'w-16 h-12',
  xl: 'w-24 h-18',
};

const layerHeights = {
  sm: 'h-1.5',
  md: 'h-2',
  lg: 'h-3',
  xl: 'h-4',
};

export function LayeredIcon({
  size = 'md',
  variant = 'pulse',
  className,
  'aria-label': ariaLabel = 'Loading',
}: LayeredIconProps) {
  const containerClass = cn(
    'flex flex-col justify-between',
    sizeClasses[size],
    className
  );

  const layerClass = cn(
    'w-full rounded-sm transition-all duration-500',
    layerHeights[size]
  );

  // Animation variants
  const getAnimationClass = (layerIndex: number) => {
    switch (variant) {
      case 'pulse':
        return `animate-pulse`;
      case 'wave':
        return `animate-pulse [animation-delay:${layerIndex * 150}ms]`;
      case 'slide':
        return `animate-[slide_1.5s_ease-in-out_infinite] [animation-delay:${layerIndex * 200}ms]`;
      case 'static':
      default:
        return '';
    }
  };

  return (
    <div
      className={containerClass}
      role="status"
      aria-label={ariaLabel}
      aria-live="polite"
    >
      {/* Dark layer (Charcoal) */}
      <div
        className={cn(
          layerClass,
          'bg-[#1E293B] dark:bg-[#1E293B]',
          getAnimationClass(0)
        )}
        style={{ animationDelay: '0ms' }}
      />

      {/* Medium layer (Slate) */}
      <div
        className={cn(
          layerClass,
          'bg-[#64748B] dark:bg-[#64748B]',
          getAnimationClass(1)
        )}
        style={{ animationDelay: '150ms' }}
      />

      {/* Light layer (Light Slate) */}
      <div
        className={cn(
          layerClass,
          'bg-[#94A3B8] dark:bg-[#94A3B8]',
          getAnimationClass(2)
        )}
        style={{ animationDelay: '300ms' }}
      />
    </div>
  );
}

/**
 * Layered Spinner - Animated loading indicator
 */
export function LayeredSpinner({
  size = 'md',
  className,
}: Omit<LayeredIconProps, 'variant'>) {
  return (
    <LayeredIcon
      size={size}
      variant="wave"
      className={className}
      aria-label="Loading content"
    />
  );
}

/**
 * Layered Divider - Section separator with brand pattern
 */
export function LayeredDivider({
  className,
}: {
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-2 my-8', className)}>
      <div className="flex-1 flex flex-col gap-1">
        <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[#1E293B] to-transparent dark:via-[#94A3B8]" />
        <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[#64748B] to-transparent dark:via-[#64748B]" />
        <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[#94A3B8] to-transparent dark:via-[#1E293B]" />
      </div>
    </div>
  );
}

/**
 * Layered Logo Mark - Brand identity mark
 */
export function LayeredLogoMark({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizes = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  };

  return (
    <div
      className={cn(
        'flex flex-col justify-center gap-0.5 p-1',
        sizes[size],
        className
      )}
      role="img"
      aria-label="STRAŦUM logo mark"
    >
      <div className="h-1 w-full bg-[#1E293B] rounded-full" />
      <div className="h-1 w-full bg-[#64748B] rounded-full" />
      <div className="h-1 w-full bg-[#94A3B8] rounded-full" />
    </div>
  );
}
