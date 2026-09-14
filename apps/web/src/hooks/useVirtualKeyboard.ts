import { useState, useEffect, useCallback } from 'react';

/**
 * Hook to detect virtual keyboard visibility and height.
 *
 * Uses the Visual Viewport API for accurate keyboard detection on mobile devices.
 * Falls back gracefully on desktop browsers where the API is not relevant.
 *
 * The `interactive-widget=resizes-content` viewport meta tag should be set for best results:
 * <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content" />
 *
 * @returns Object with keyboard state:
 *   - isKeyboardOpen: boolean indicating if the keyboard is visible
 *   - keyboardHeight: number representing keyboard height in pixels
 *
 * @example
 * ```tsx
 * const { isKeyboardOpen, keyboardHeight } = useVirtualKeyboard();
 *
 * return (
 *   <div style={{ paddingBottom: isKeyboardOpen ? keyboardHeight : 0 }}>
 *     <input />
 *   </div>
 * );
 * ```
 */
export function useVirtualKeyboard() {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const handleViewportResize = useCallback(() => {
    if (!window.visualViewport) return;

    // The keyboard is open when the visual viewport height is less than the window height
    const heightDiff = window.innerHeight - window.visualViewport.height;

    // Consider keyboard "open" if there's more than 150px difference
    // (accounts for browser UI chrome on mobile)
    const isOpen = heightDiff > 150;

    setIsKeyboardOpen(isOpen);
    setKeyboardHeight(isOpen ? heightDiff : 0);
  }, []);

  useEffect(() => {
    // Only set up listeners if Visual Viewport API is available
    if (!window.visualViewport) {
      return;
    }

    // Initial check
    handleViewportResize();

    // Listen for viewport changes (keyboard open/close, resize)
    window.visualViewport.addEventListener('resize', handleViewportResize);
    window.visualViewport.addEventListener('scroll', handleViewportResize);

    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportResize);
      window.visualViewport?.removeEventListener('scroll', handleViewportResize);
    };
  }, [handleViewportResize]);

  return { isKeyboardOpen, keyboardHeight };
}

/**
 * Hook to scroll an element into view when the keyboard opens.
 * Useful for ensuring the active input remains visible.
 *
 * @param elementRef - React ref to the element to scroll into view
 * @param options - Scroll options (behavior, block, inline)
 *
 * @example
 * ```tsx
 * const inputRef = useRef<HTMLInputElement>(null);
 * useScrollIntoViewOnKeyboard(inputRef);
 *
 * return <input ref={inputRef} />;
 * ```
 */
export function useScrollIntoViewOnKeyboard(
  elementRef: React.RefObject<HTMLElement>,
  options: ScrollIntoViewOptions = { behavior: 'smooth', block: 'center' }
) {
  const { isKeyboardOpen } = useVirtualKeyboard();

  useEffect(() => {
    if (isKeyboardOpen && elementRef.current) {
      // Small delay to ensure keyboard is fully visible
      const timeout = setTimeout(() => {
        elementRef.current?.scrollIntoView(options);
      }, 100);

      return () => clearTimeout(timeout);
    }
  }, [isKeyboardOpen, elementRef, options]);
}
