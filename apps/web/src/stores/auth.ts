import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { api } from '@/lib/api'
import { queryClient } from '@/lib/queryClient'
import { getCurrentLanguage } from '@/lib/i18n'
import { buildLocalizedPath, stripLocalePrefix } from '@/lib/localePath'
import { generatePKCEVerifier } from '@/lib/pkce'
import type { User, Session, Provider } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  initialized: boolean
  signIn: (email: string, password: string, captchaToken?: string) => Promise<{ error?: string; session?: Session; user?: User }>
  signUp: (email: string, password: string, orgName: string, orgType: 'SME' | 'AGENCY', orgSlug?: string, captchaToken?: string) => Promise<{ error?: string; user?: User; session?: Session | null }>
  signInWithOAuth: (provider: Provider) => Promise<{ error?: string }>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>
  resetPasswordRequest: (email: string, captchaToken?: string) => Promise<{ success: boolean; error?: string }>
  setSession: (user: User, session: Session) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: false,
  initialized: false,

  signIn: async (email: string, password: string, captchaToken?: string) => {
    set({ loading: true })

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: { captchaToken },
      })

      if (error) {
        set({ loading: false })
        return { error: error.message }
      }

      // Don't set session/user in store yet - let LoginForm handle MFA first
      // Return session and user for MFA checking
      set({ loading: false })

      return {
        session: data.session,
        user: data.user
      }
    } catch (error) {
      set({ loading: false })
      return { error: 'An unexpected error occurred' }
    }
  },

  setSession: (user: User, session: Session) => {
    set({
      user,
      session,
    })

    // Store the access token for API calls
    if (session?.access_token) {
      localStorage.setItem('auth_token', session.access_token)
    }
  },

  signInWithOAuth: async (provider) => {
    try {
      const codeVerifier = generatePKCEVerifier()

      sessionStorage.setItem('stratum_pkce_verifier', codeVerifier)
      sessionStorage.setItem('stratum_pkce_provider', provider)

      localStorage.setItem('supabase.auth.token-code-verifier', `${codeVerifier}/pkce`)

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}${buildLocalizedPath(getCurrentLanguage(), '/auth/callback')}`,
        },
      })

      if (error) {
        sessionStorage.removeItem('stratum_pkce_verifier')
        sessionStorage.removeItem('stratum_pkce_provider')
        localStorage.removeItem('supabase.auth.token-code-verifier')
        return { error: error.message }
      }

      return {}
    } catch (error) {
      sessionStorage.removeItem('stratum_pkce_verifier')
      sessionStorage.removeItem('stratum_pkce_provider')
      localStorage.removeItem('supabase.auth.token-code-verifier')
      return { error: 'An unexpected error occurred' }
    }
  },

  signUp: async (email: string, password: string, orgName: string, orgType: 'SME' | 'AGENCY', orgSlug?: string, captchaToken?: string) => {
    set({ loading: true })
    
    try {
      // Generate slug if not provided
      let finalSlug = orgSlug
      if (!finalSlug && orgName) {
        // Generate slug from API
        try {
          const slugResponse = await api.post('/api/v1/organizations/generate-slug', { 
            name: orgName 
          })
          
          if (slugResponse.data) {
            finalSlug = slugResponse.data.slug
          }
        } catch (err) {
          console.warn('Could not generate slug, will use database default:', err)
        }
      }
      
      // Sign up the user with organization metadata
      // The database trigger will automatically create the organization
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          captchaToken,
          data: {
            full_name: email.split('@')[0], // Extract name from email
            organization_name: orgName,     // Matches trigger expectation
            organization_type: orgType,     // Matches trigger expectation
            organization_slug: finalSlug,   // Matches trigger expectation
            locale: getCurrentLanguage()    // For localized email templates
          }
        }
      })
      
      if (authError) {
        set({ loading: false })
        return { error: authError.message }
      }
      
      if (!authData.user) {
        set({ loading: false })
        return { error: 'Failed to create user account' }
      }
      
      // Store auth token
      if (authData.session?.access_token) {
        localStorage.setItem('auth_token', authData.session.access_token)
      }
      
      set({
        user: authData.user,
        session: authData.session,
        loading: false,
      })

      return { user: authData.user, session: authData.session }
    } catch (error) {
      set({ loading: false })
      return { error: 'An unexpected error occurred during signup' }
    }
  },

  signOut: async () => {
    set({ loading: true })

    try {
      // Clear the stored token FIRST (before Supabase call)
      localStorage.removeItem('auth_token')

      // Clear React Query cache to prevent stale data from previous user
      // This is critical for multi-user scenarios (e.g., agency owner → SME owner)
      queryClient.clear()

      // Clear state immediately to trigger UI update
      set({
        user: null,
        session: null,
        loading: false,
      })

      // Call Supabase signOut (this will also trigger onAuthStateChange)
      await supabase.auth.signOut()

      // Use setTimeout to avoid deadlocks as recommended by Supabase docs
      // This ensures the redirect happens after the auth state change completes
      setTimeout(() => {
        // Only redirect if we're not already on login/public pages
        const publicPaths = ['/login', '/signup', '/', '/terms', '/privacy', '/contact', '/request-invitation']
        const currentPath = stripLocalePrefix(window.location.pathname)
        if (!publicPaths.some(path => currentPath === path || currentPath.startsWith('/accept-invitation'))) {
          window.location.href = buildLocalizedPath(getCurrentLanguage(), '/login')
        }
      }, 0)
    } catch (error) {
      set({ loading: false })
      console.error('Sign out error:', error)
      // Even on error, try to redirect to login for safety
      window.location.href = buildLocalizedPath(getCurrentLanguage(), '/login')
    }
  },

  initialize: async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        console.error('Auth initialization error:', error)
      }

      set({
        user: session?.user ?? null,
        session,
        initialized: true,
      })

      // Store the access token if we have a session
      if (session?.access_token) {
        localStorage.setItem('auth_token', session.access_token)
      }

      // Listen for auth changes - enterprise-grade user identity management
      // Track previous user ID to detect user switches
      let previousUserId: string | null = session?.user?.id ?? null

      supabase.auth.onAuthStateChange((event, newSession) => {
        const newUserId = newSession?.user?.id ?? null

        // Detect user identity change (logout, login as different user, or session refresh with different user)
        const userChanged = previousUserId !== null && newUserId !== null && previousUserId !== newUserId
        const userLoggedOut = previousUserId !== null && newUserId === null

        if (userChanged || userLoggedOut) {
          // Clear React Query cache when user identity changes
          // This prevents data leakage between users (critical for multi-tenant security)
          console.log('[Auth] User identity changed, clearing query cache', {
            event,
            previousUserId,
            newUserId,
          })
          queryClient.clear()
        }

        // Update tracked user ID
        previousUserId = newUserId

        set({
          user: newSession?.user ?? null,
          session: newSession,
        })

        // Update the stored token
        if (newSession?.access_token) {
          localStorage.setItem('auth_token', newSession.access_token)
        } else {
          localStorage.removeItem('auth_token')
        }
      })
    } catch (error) {
      console.error('Auth initialization failed:', error)
      set({ initialized: true })
    }
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        return { success: false, error: 'Not authenticated' }
      }

      // Step 1: Verify current password by attempting sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword
      })

      if (signInError) {
        return { success: false, error: 'Current password is incorrect' }
      }

      // Step 2: Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) {
        return { success: false, error: updateError.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Change password error:', error)
      return { success: false, error: 'Failed to change password' }
    }
  },

  resetPasswordRequest: async (email: string, captchaToken?: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
        captchaToken,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      console.error('Password reset request error:', error)
      return { success: false, error: 'Failed to send password reset email' }
    }
  },
}))
