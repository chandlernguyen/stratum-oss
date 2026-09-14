/**
 * Locale Transition Overlay
 *
 * Provides a smooth visual transition when the language changes.
 * Uses a subtle fade effect to mask the jarring text swap that occurs
 * when React re-renders the entire tree with new translations.
 *
 * The animation sequence:
 * 1. When locale change starts: Quick fade to semi-transparent
 * 2. i18next updates all translations
 * 3. After translations load: Smooth fade back to transparent
 */

import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

export function LocaleTransitionOverlay() {
  const { i18n } = useTranslation()
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'fadeOut' | 'fadeIn'>('idle')

  const handleLanguageChanging = useCallback(() => {
    setIsTransitioning(true)
    setPhase('fadeOut')
  }, [])

  const handleLanguageChanged = useCallback(() => {
    // Small delay to ensure translations are rendered before fading back
    setTimeout(() => {
      setPhase('fadeIn')
      // Remove overlay after fade-in completes
      setTimeout(() => {
        setIsTransitioning(false)
        setPhase('idle')
      }, 200)
    }, 50)
  }, [])

  useEffect(() => {
    // Listen for i18next language change events
    i18n.on('languageChanging', handleLanguageChanging)
    i18n.on('languageChanged', handleLanguageChanged)

    return () => {
      i18n.off('languageChanging', handleLanguageChanging)
      i18n.off('languageChanged', handleLanguageChanged)
    }
  }, [i18n, handleLanguageChanging, handleLanguageChanged])

  if (!isTransitioning) return null

  return (
    <div
      className={cn(
        // Fixed overlay covering entire viewport
        "fixed inset-0 z-[9999] pointer-events-none",
        // Base styles
        "bg-background/60 backdrop-blur-[2px]",
        // Transition timing
        "transition-opacity duration-150 ease-out",
        // Phase-based opacity
        phase === 'fadeOut' && "opacity-100",
        phase === 'fadeIn' && "opacity-0",
        phase === 'idle' && "opacity-0"
      )}
      aria-hidden="true"
    >
      {/* Optional: Subtle loading indicator in center */}
      <div className={cn(
        "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
        "transition-opacity duration-100",
        phase === 'fadeOut' ? "opacity-100" : "opacity-0"
      )}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-brand-gold/60 animate-pulse" />
          <div className="w-2 h-2 rounded-full bg-brand-gold/60 animate-pulse [animation-delay:100ms]" />
          <div className="w-2 h-2 rounded-full bg-brand-gold/60 animate-pulse [animation-delay:200ms]" />
        </div>
      </div>
    </div>
  )
}

export default LocaleTransitionOverlay
