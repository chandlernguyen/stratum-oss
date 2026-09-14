import type { BrandKit } from '@/styles/themeEngine'

interface DomainMapping {
  domain: string
  clientId: string
  brandKit?: BrandKit
}

// In production, this would be fetched from your backend
const DOMAIN_MAPPINGS: DomainMapping[] = [
  {
    domain: 'marketing.acmeagency.com',
    clientId: 'client-uuid-acme',
    brandKit: {
      primaryColor: '#FF6B35',
      secondaryColor: '#004E89',
      accentColor: '#A8DADC',
      companyName: 'Acme Agency',
      logo: '/brands/acme/logo.png',
      favicon: '/brands/acme/favicon.ico',
      fonts: {
        heading: 'Montserrat',
        body: 'Open Sans'
      },
      borderRadius: 'lg',
      density: 'comfortable'
    }
  },
  {
    domain: 'portal.nike.marketing',
    clientId: 'client-uuid-nike',
    brandKit: {
      primaryColor: '#111111',
      secondaryColor: '#FFFFFF',
      accentColor: '#FA5400',
      companyName: 'Nike',
      logo: '/brands/nike/logo.png',
      favicon: '/brands/nike/favicon.ico',
      fonts: {
        heading: 'Helvetica Neue',
        body: 'Helvetica'
      },
      borderRadius: 'none',
      density: 'compact'
    }
  },
  {
    domain: 'hub.spotify.marketing',
    clientId: 'client-uuid-spotify',
    brandKit: {
      primaryColor: '#1DB954',
      secondaryColor: '#191414',
      accentColor: '#1ED760',
      companyName: 'Spotify',
      logo: '/brands/spotify/logo.png',
      favicon: '/brands/spotify/favicon.ico',
      fonts: {
        heading: 'Circular',
        body: 'Circular'
      },
      borderRadius: 'xl',
      density: 'comfortable'
    }
  }
]

export function getCustomDomainInfo(): DomainMapping | null {
  const hostname = window.location.hostname
  
  // Check if we're on a custom domain
  const mapping = DOMAIN_MAPPINGS.find(m => m.domain === hostname)
  
  if (mapping) {
    return mapping
  }
  
  // Check for subdomain-based routing (e.g., acme.marketingsuite.com)
  const subdomain = hostname.split('.')[0]
  if (subdomain && subdomain !== 'www' && subdomain !== 'app') {
    // Try to find mapping based on subdomain
    return DOMAIN_MAPPINGS.find(m => 
      m.domain.toLowerCase().includes(subdomain.toLowerCase())
    ) || null
  }
  
  return null
}

export function isCustomDomain(): boolean {
  return getCustomDomainInfo() !== null
}

export function getClientIdFromDomain(): string | null {
  const info = getCustomDomainInfo()
  return info?.clientId || null
}

export function getBrandKitFromDomain(): BrandKit | null {
  const info = getCustomDomainInfo()
  return info?.brandKit || null
}

// Helper to generate CNAME instructions for agencies
export function generateCNAMEInstructions(customDomain: string): string {
  return `
To set up your custom domain, add the following DNS records:

1. CNAME Record:
   Name: ${customDomain}
   Value: custom.marketingsuite.app
   TTL: 3600

2. TXT Record (for verification):
   Name: _marketing-suite-verify.${customDomain}
   Value: verify-${Buffer.from(customDomain).toString('base64').substring(0, 16)}
   TTL: 3600

After adding these records, it may take up to 24 hours for the changes to propagate.
`
}

// Helper to validate custom domain format
export function validateCustomDomain(domain: string): {
  valid: boolean
  error?: string
} {
  // Remove protocol if present
  domain = domain.replace(/^https?:\/\//, '')
  
  // Basic domain validation regex
  const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i
  
  if (!domain) {
    return { valid: false, error: 'Domain is required' }
  }
  
  if (!domainRegex.test(domain)) {
    return { valid: false, error: 'Invalid domain format' }
  }
  
  if (domain.length > 253) {
    return { valid: false, error: 'Domain is too long' }
  }
  
  // Check for reserved domains
  const reserved = ['localhost', 'example.com', 'test.com']
  if (reserved.includes(domain.toLowerCase())) {
    return { valid: false, error: 'This domain is reserved' }
  }
  
  return { valid: true }
}