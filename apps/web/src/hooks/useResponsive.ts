import { useState, useEffect } from 'react';

/**
 * Custom hook for responsive viewport detection
 *
 * Matches Tailwind CSS v4 breakpoints:
 * - Mobile: < 768px
 * - Tablet: 768px - 1023px
 * - Desktop: >= 1024px
 *
 * @returns Object with boolean flags for each viewport size
 *
 * @example
 * ```tsx
 * const { isMobile, isTablet, isDesktop } = useResponsive();
 *
 * return (
 *   <div className={isMobile ? 'p-4' : 'p-8'}>
 *     {isMobile ? <MobileView /> : <DesktopView />}
 *   </div>
 * );
 * ```
 */
export function useResponsive() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkViewport = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768); // < md breakpoint
      setIsTablet(width >= 768 && width < 1024); // md to lg
      setIsDesktop(width >= 1024); // >= lg breakpoint
    };

    // Check on mount
    checkViewport();

    // Update on window resize
    window.addEventListener('resize', checkViewport);

    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  return { isMobile, isTablet, isDesktop };
}
