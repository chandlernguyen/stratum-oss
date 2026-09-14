import { create } from 'zustand'
import { api } from '@/lib/api'

// DEPRECATED: This store is deprecated in favor of useUserIdentity hook
// which provides direct database access and avoids stale data issues.
// Only kept for backward compatibility during migration.

interface Organization {
  id: string
  name: string
  organization_type: 'sme' | 'agency'
  created_at: string
  settings?: {
    branding?: {
      logoUrl?: string
      primaryColor?: string
    }
  }
}

interface OrganizationState {
  currentOrganization: Organization | null
  loading: boolean
  error: string | null
  fetchCurrentOrganization: () => Promise<void>
  setOrganization: (org: Organization) => void
}

export const useOrganizationStore = create<OrganizationState>((set) => ({
  currentOrganization: null,
  loading: false,
  error: null,

  fetchCurrentOrganization: async () => {
    set({ loading: true, error: null })
    
    try {
      const response = await api.get('/api/v1/organizations/current')
      
      if (response.data) {
        set({
          currentOrganization: response.data.organization,
          loading: false
        })
      } else {
        throw new Error('Failed to fetch organization')
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch organization',
        loading: false
      })
    }
  },

  setOrganization: (org: Organization) => {
    set({ currentOrganization: org })
  }
}))