// Brand Identity Configuration for CØRTEX and STRΑTUM
// Date: 2025-10-13
// Purpose: Define visual identities for brand comparison

export type BrandOption = 'cortex' | 'stratum' | 'stratum-t' | 'stratum-a' | 'stratum-both';

export interface BrandIdentity {
  name: string;
  displayName: string;
  tagline: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    border: string;
  };
  gradients: {
    hero: string;
    button: string;
    card: string;
  };
  typography: {
    fontFamily: string;
    headingWeight: string;
    bodyWeight: string;
  };
  icon: {
    symbol: string;
    description: string;
  };
}

export const BRAND_IDENTITIES: Record<BrandOption, BrandIdentity> = {
  cortex: {
    name: 'cortex',
    displayName: 'CØRTEX',
    tagline: 'Your Marketing Brain',
    description: 'CØRTEX is the AI-powered intelligence layer that makes you a smarter marketer through strategic thinking, creative generation, and performance analysis.',
    colors: {
      primary: '#6B46C1', // Deep Purple
      secondary: '#3B82F6', // Electric Blue
      accent: '#06B6D4', // Cyan
      background: '#F8FAFC', // Off White
      text: '#1E293B', // Dark Navy
      border: '#E2E8F0', // Light Gray
    },
    gradients: {
      hero: 'linear-gradient(135deg, #6B46C1 0%, #3B82F6 100%)',
      button: 'linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)',
      card: 'linear-gradient(to bottom right, #6B46C1, #3B82F6)',
    },
    typography: {
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      headingWeight: '700',
      bodyWeight: '400',
    },
    icon: {
      symbol: 'Ø',
      description: 'Neural network with slashed O (matches DIALØGUE brand DNA)',
    },
  },
  stratum: {
    name: 'stratum',
    displayName: 'STRαTUM',
    tagline: 'Intelligence Over Execution',
    description: 'STRAŦUM is the AI-powered marketing intelligence platform that makes you a smarter marketer through strategic frameworks, creative generation, and performance analysis - without the risk of automated execution.',
    colors: {
      primary: '#64748B', // Slate Gray
      secondary: '#1E293B', // Charcoal
      accent: '#F59E0B', // Gold
      background: '#FAFAF9', // Off White
      text: '#1E293B', // Charcoal
      border: '#E5E7EB', // Light Gray
    },
    gradients: {
      hero: 'linear-gradient(135deg, #64748B 0%, #1E293B 50%, #F59E0B 100%)',
      button: 'linear-gradient(135deg, #F59E0B 0%, #FCD34D 100%)',
      card: 'linear-gradient(to bottom right, #64748B, #1E293B)',
    },
    typography: {
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      headingWeight: '700',
      bodyWeight: '400',
    },
    icon: {
      symbol: 'α',
      description: 'Option 1: Lowercase Greek alpha',
    },
  },
  'stratum-t': {
    name: 'stratum-t',
    displayName: 'STRAŦUM',
    tagline: 'Intelligence Over Execution',
    description: 'STRAŦUM is the AI-powered marketing intelligence platform that makes you a smarter marketer through strategic frameworks, creative generation, and performance analysis - without the risk of automated execution.',
    colors: {
      primary: '#64748B',
      secondary: '#1E293B',
      accent: '#F59E0B',
      background: '#FAFAF9',
      text: '#1E293B',
      border: '#E5E7EB',
    },
    gradients: {
      hero: 'linear-gradient(135deg, #64748B 0%, #1E293B 50%, #F59E0B 100%)',
      button: 'linear-gradient(135deg, #F59E0B 0%, #FCD34D 100%)',
      card: 'linear-gradient(to bottom right, #64748B, #1E293B)',
    },
    typography: {
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      headingWeight: '700',
      bodyWeight: '400',
    },
    icon: {
      symbol: 'Ŧ',
      description: 'Option 2: T with horizontal stroke (cutting through layers)',
    },
  },
  'stratum-a': {
    name: 'stratum-a',
    displayName: 'STRĀTUM',
    tagline: 'Intelligence Over Execution',
    description: 'STRAŦUM is the AI-powered marketing intelligence platform that makes you a smarter marketer through strategic frameworks, creative generation, and performance analysis - without the risk of automated execution.',
    colors: {
      primary: '#64748B',
      secondary: '#1E293B',
      accent: '#F59E0B',
      background: '#FAFAF9',
      text: '#1E293B',
      border: '#E5E7EB',
    },
    gradients: {
      hero: 'linear-gradient(135deg, #64748B 0%, #1E293B 50%, #F59E0B 100%)',
      button: 'linear-gradient(135deg, #F59E0B 0%, #FCD34D 100%)',
      card: 'linear-gradient(to bottom right, #64748B, #1E293B)',
    },
    typography: {
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      headingWeight: '700',
      bodyWeight: '400',
    },
    icon: {
      symbol: 'Ā',
      description: 'Option 3: A with macron (top layer)',
    },
  },
  'stratum-both': {
    name: 'stratum-both',
    displayName: 'STRĀŦUM',
    tagline: 'Intelligence Over Execution',
    description: 'STRAŦUM is the AI-powered marketing intelligence platform that makes you a smarter marketer through strategic frameworks, creative generation, and performance analysis - without the risk of automated execution.',
    colors: {
      primary: '#64748B',
      secondary: '#1E293B',
      accent: '#F59E0B',
      background: '#FAFAF9',
      text: '#1E293B',
      border: '#E5E7EB',
    },
    gradients: {
      hero: 'linear-gradient(135deg, #64748B 0%, #1E293B 50%, #F59E0B 100%)',
      button: 'linear-gradient(135deg, #F59E0B 0%, #FCD34D 100%)',
      card: 'linear-gradient(to bottom right, #64748B, #1E293B)',
    },
    typography: {
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      headingWeight: '700',
      bodyWeight: '400',
    },
    icon: {
      symbol: 'ĀŦ',
      description: 'Option 4: Both A and T with lines (multi-layer emphasis)',
    },
  },
};

// Helper function to get brand colors for Tailwind classes
export function getBrandColors(brand: BrandOption) {
  const identity = BRAND_IDENTITIES[brand];
  return {
    primary: identity.colors.primary,
    secondary: identity.colors.secondary,
    accent: identity.colors.accent,
  };
}

// Helper function to get brand gradient
export function getBrandGradient(brand: BrandOption, type: 'hero' | 'button' | 'card' = 'hero') {
  return BRAND_IDENTITIES[brand].gradients[type];
}
