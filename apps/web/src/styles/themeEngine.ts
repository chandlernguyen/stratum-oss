export interface BrandKit {
  // Core Branding
  primaryColor: string
  secondaryColor: string
  accentColor: string
  
  // Company Identity
  companyName: string
  logo: string
  logoLight?: string // For dark backgrounds
  favicon: string
  
  // Typography
  fonts: {
    heading: string
    body: string
    mono?: string
  }
  
  // Extended Palette
  colors?: {
    background?: string
    foreground?: string
    muted?: string
    mutedForeground?: string
    border?: string
    success?: string
    warning?: string
    error?: string
    info?: string
  }
  
  // UI Preferences
  borderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  density?: 'comfortable' | 'compact' | 'spacious'
  
  // Custom CSS
  customCSS?: string
}

export interface ThemeConfig {
  brandKit: BrandKit
  isDarkMode?: boolean
  isHighContrast?: boolean
}

class ThemeEngine {
  private static instance: ThemeEngine
  private currentTheme: ThemeConfig | null = null
  private observers: Set<(theme: ThemeConfig) => void> = new Set()
  private originalTheme: Partial<CSSStyleDeclaration> = {}

  private constructor() {
    this.saveOriginalTheme()
  }

  static getInstance(): ThemeEngine {
    if (!ThemeEngine.instance) {
      ThemeEngine.instance = new ThemeEngine()
    }
    return ThemeEngine.instance
  }

  private saveOriginalTheme() {
    const root = document.documentElement
    const computedStyle = getComputedStyle(root)
    
    // Save original CSS variables
    const cssVars = [
      '--primary',
      '--primary-foreground',
      '--secondary',
      '--secondary-foreground',
      '--accent',
      '--accent-foreground',
      '--background',
      '--foreground',
      '--muted',
      '--muted-foreground',
      '--border',
      '--radius'
    ]
    
    cssVars.forEach(varName => {
      this.originalTheme[varName as any] = computedStyle.getPropertyValue(varName)
    })
  }

  applyBrandKit(brandKit: BrandKit, options?: { isDarkMode?: boolean }) {
    const root = document.documentElement
    
    // Apply primary colors
    this.setCSSVariable('--primary', this.hexToHSL(brandKit.primaryColor))
    this.setCSSVariable('--secondary', this.hexToHSL(brandKit.secondaryColor))
    this.setCSSVariable('--accent', this.hexToHSL(brandKit.accentColor))
    
    // Apply extended colors if provided
    if (brandKit.colors) {
      if (brandKit.colors.background) {
        this.setCSSVariable('--background', this.hexToHSL(brandKit.colors.background))
      }
      if (brandKit.colors.foreground) {
        this.setCSSVariable('--foreground', this.hexToHSL(brandKit.colors.foreground))
      }
      if (brandKit.colors.muted) {
        this.setCSSVariable('--muted', this.hexToHSL(brandKit.colors.muted))
      }
      if (brandKit.colors.mutedForeground) {
        this.setCSSVariable('--muted-foreground', this.hexToHSL(brandKit.colors.mutedForeground))
      }
      if (brandKit.colors.border) {
        this.setCSSVariable('--border', this.hexToHSL(brandKit.colors.border))
      }
    }
    
    // Apply typography
    if (brandKit.fonts.heading !== 'default') {
      root.style.setProperty('--font-heading', brandKit.fonts.heading)
    }
    if (brandKit.fonts.body !== 'default') {
      root.style.setProperty('--font-body', brandKit.fonts.body)
    }
    if (brandKit.fonts.mono) {
      root.style.setProperty('--font-mono', brandKit.fonts.mono)
    }
    
    // Apply border radius
    const radiusMap = {
      none: '0',
      sm: '0.125rem',
      md: '0.375rem',
      lg: '0.5rem',
      xl: '1rem'
    }
    if (brandKit.borderRadius) {
      root.style.setProperty('--radius', radiusMap[brandKit.borderRadius])
    }
    
    // Apply density
    if (brandKit.density) {
      root.setAttribute('data-density', brandKit.density)
    }
    
    // Update meta tags
    this.updateMetaTags(brandKit)
    
    // Apply custom CSS if provided
    if (brandKit.customCSS) {
      this.applyCustomCSS(brandKit.customCSS)
    }
    
    // Update current theme
    this.currentTheme = {
      brandKit,
      isDarkMode: options?.isDarkMode || false
    }
    
    // Notify observers
    this.broadcast(this.currentTheme)
    
    // Persist to localStorage
    this.persistTheme()
  }

  private setCSSVariable(name: string, value: string) {
    document.documentElement.style.setProperty(name, value)
  }

  private hexToHSL(hex: string): string {
    // Remove # if present
    hex = hex.replace('#', '')
    
    // Convert to RGB
    const r = parseInt(hex.substring(0, 2), 16) / 255
    const g = parseInt(hex.substring(2, 4), 16) / 255
    const b = parseInt(hex.substring(4, 6), 16) / 255
    
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0
    let s = 0
    const l = (max + min) / 2
    
    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6
          break
        case g:
          h = ((b - r) / d + 2) / 6
          break
        case b:
          h = ((r - g) / d + 4) / 6
          break
      }
    }
    
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
  }

  private updateMetaTags(brandKit: BrandKit) {
    // Update favicon
    const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement
    if (favicon) {
      favicon.href = brandKit.favicon
    } else {
      const newFavicon = document.createElement('link')
      newFavicon.rel = 'icon'
      newFavicon.href = brandKit.favicon
      document.head.appendChild(newFavicon)
    }
    
    // Update title
    document.title = `${brandKit.companyName} Marketing Suite`
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]') as HTMLMetaElement
    if (metaDescription) {
      metaDescription.content = `${brandKit.companyName}'s AI-powered marketing intelligence platform`
    }
  }

  private applyCustomCSS(css: string) {
    // Remove existing custom styles if any
    const existingStyle = document.getElementById('white-label-custom-css')
    if (existingStyle) {
      existingStyle.remove()
    }
    
    // Create and inject new style element
    const styleElement = document.createElement('style')
    styleElement.id = 'white-label-custom-css'
    styleElement.textContent = css
    document.head.appendChild(styleElement)
  }

  resetToDefault() {
    const root = document.documentElement
    
    // Restore original CSS variables
    Object.entries(this.originalTheme).forEach(([key, value]) => {
      if (value) {
        root.style.setProperty(key, value as string)
      }
    })
    
    // Remove custom CSS
    const customStyle = document.getElementById('white-label-custom-css')
    if (customStyle) {
      customStyle.remove()
    }
    
    // Remove density attribute
    root.removeAttribute('data-density')
    
    // Reset meta tags
    document.title = 'Marketing Suite'
    
    // Clear theme
    this.currentTheme = null
    this.clearPersistedTheme()
  }

  subscribe(callback: (theme: ThemeConfig) => void) {
    this.observers.add(callback)
    return () => this.observers.delete(callback)
  }

  private broadcast(theme: ThemeConfig) {
    this.observers.forEach(callback => callback(theme))
  }

  private persistTheme() {
    if (this.currentTheme) {
      localStorage.setItem('white-label-theme', JSON.stringify(this.currentTheme))
    }
  }

  private clearPersistedTheme() {
    localStorage.removeItem('white-label-theme')
  }

  loadPersistedTheme(): ThemeConfig | null {
    const saved = localStorage.getItem('white-label-theme')
    if (saved) {
      try {
        const theme = JSON.parse(saved) as ThemeConfig
        this.applyBrandKit(theme.brandKit, { isDarkMode: theme.isDarkMode })
        return theme
      } catch (e) {
        console.error('Failed to load persisted theme:', e)
      }
    }
    return null
  }

  getCurrentTheme(): ThemeConfig | null {
    return this.currentTheme
  }

  // Preview mode for testing without persisting
  previewBrandKit(brandKit: BrandKit) {
    const originalPersist = this.persistTheme
    this.persistTheme = () => {} // Disable persistence
    this.applyBrandKit(brandKit)
    this.persistTheme = originalPersist // Re-enable persistence
  }
}

export const themeEngine = ThemeEngine.getInstance()