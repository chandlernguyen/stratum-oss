import { useEffect, useState, createContext, useContext, type ReactNode } from 'react'
import { themeEngine, type BrandKit, type ThemeConfig } from '@/styles/themeEngine'
import { useOrganization } from '@/hooks/data/useOrganization'

interface WhiteLabelContextType {
  currentTheme: ThemeConfig | null
  isWhiteLabeled: boolean
  brandKit: BrandKit | null
  applyBrandKit: (brandKit: BrandKit) => void
  resetTheme: () => void
  previewMode: boolean
  setPreviewMode: (preview: boolean) => void
}

const WhiteLabelContext = createContext<WhiteLabelContextType | undefined>(undefined)

export function useWhiteLabel() {
  const context = useContext(WhiteLabelContext)
  if (!context) {
    throw new Error('useWhiteLabel must be used within WhiteLabelProvider')
  }
  return context
}

interface WhiteLabelProviderProps {
  children: ReactNode
}

export function WhiteLabelProvider({ children }: WhiteLabelProviderProps) {
  const { organization } = useOrganization()
  // Temporarily set currentClient to null - will be handled by URL routing later
  const currentClient: any = null
  const [currentTheme, setCurrentTheme] = useState<ThemeConfig | null>(null)
  const [previewMode, setPreviewMode] = useState(false)

  // Load persisted theme on mount
  useEffect(() => {
    const persistedTheme = themeEngine.loadPersistedTheme()
    if (persistedTheme) {
      setCurrentTheme(persistedTheme)
    }
  }, [])

  // Subscribe to theme changes
  useEffect(() => {
    const unsubscribe = themeEngine.subscribe((theme) => {
      setCurrentTheme(theme)
    })
    return () => {
      unsubscribe()
    }
  }, [])

  // Apply client brand kit if available
  useEffect(() => {
    // Check for client-specific branding (would come from API)
    // For now, we can use custom domain info
    if (!previewMode) {
      // In production, check currentClient or organization for brand_kit
      // Example: if (currentClient?.brand_kit) { ... }
    }
  }, [currentClient, organization, previewMode])

  const applyBrandKit = (brandKit: BrandKit) => {
    if (previewMode) {
      themeEngine.previewBrandKit(brandKit)
    } else {
      themeEngine.applyBrandKit(brandKit)
    }
  }

  const resetTheme = () => {
    themeEngine.resetToDefault()
    setCurrentTheme(null)
  }

  const value: WhiteLabelContextType = {
    currentTheme,
    isWhiteLabeled: currentTheme !== null,
    brandKit: currentTheme?.brandKit || null,
    applyBrandKit,
    resetTheme,
    previewMode,
    setPreviewMode
  }

  // Apply logo to the UI if white-labeled
  useEffect(() => {
    if (currentTheme?.brandKit.logo) {
      // Update logo in header
      const logoElements = document.querySelectorAll('[data-logo-placeholder]')
      logoElements.forEach(element => {
        if (element instanceof HTMLImageElement) {
          element.src = currentTheme.brandKit.logo
          element.alt = currentTheme.brandKit.companyName
        }
      })
    }
  }, [currentTheme])

  return (
    <WhiteLabelContext.Provider value={value}>
      {children}
    </WhiteLabelContext.Provider>
  )
}