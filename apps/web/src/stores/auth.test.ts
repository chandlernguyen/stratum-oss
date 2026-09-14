import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuthStore } from './auth'

// Mock supabase client
const mockSignInWithOAuth = vi.fn()
const mockSignUp = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: (...args: unknown[]) => mockSignInWithOAuth(...args),
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn(),
      updateUser: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      mfa: {
        getAuthenticatorAssuranceLevel: vi.fn(),
        listFactors: vi.fn(),
      },
    },
  },
}))

vi.mock('@/lib/api', () => ({
  api: {
    post: vi.fn().mockResolvedValue({ data: { data: { slug: 'test-slug' } } }),
  },
}))

vi.mock('@/lib/queryClient', () => ({
  queryClient: { clear: vi.fn() },
}))

vi.mock('@/lib/i18n', () => ({
  getCurrentLanguage: () => 'en',
}))

const mockLocalStorage = new Map<string, string>()

beforeEach(() => {
  vi.clearAllMocks()
  mockLocalStorage.clear()
  sessionStorage.clear()
  useAuthStore.setState({ user: null, session: null, loading: false, initialized: false })

  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: (key: string) => mockLocalStorage.get(key) ?? null,
      setItem: (key: string, value: string) => { mockLocalStorage.set(key, value) },
      removeItem: (key: string) => { mockLocalStorage.delete(key) },
      clear: () => { mockLocalStorage.clear() },
      get length() { return mockLocalStorage.size },
      key: (index: number) => Array.from(mockLocalStorage.keys())[index] ?? null,
    },
    writable: true,
  })
})

describe('useAuthStore', () => {
  describe('signInWithOAuth', () => {
    it('should call supabase.auth.signInWithOAuth with correct provider and redirectTo', async () => {
      mockSignInWithOAuth.mockResolvedValue({ data: {}, error: null })

      const result = await useAuthStore.getState().signInWithOAuth('google')

      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: expect.stringContaining('/auth/callback'),
        },
      })
      expect(result.error).toBeUndefined()
    })

    it('should support apple provider', async () => {
      mockSignInWithOAuth.mockResolvedValue({ data: {}, error: null })

      await useAuthStore.getState().signInWithOAuth('apple')

      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'apple',
        options: {
          redirectTo: expect.stringContaining('/auth/callback'),
        },
      })
    })

    it('should return error message when OAuth fails', async () => {
      mockSignInWithOAuth.mockResolvedValue({
        data: {},
        error: { message: 'OAuth provider error' },
      })

      const result = await useAuthStore.getState().signInWithOAuth('google')

      expect(result.error).toBe('OAuth provider error')
    })

    it('should handle unexpected exceptions', async () => {
      mockSignInWithOAuth.mockRejectedValue(new Error('Network failure'))

      const result = await useAuthStore.getState().signInWithOAuth('google')

      expect(result.error).toBe('An unexpected error occurred')
    })

    it('should store PKCE verifier in sessionStorage before OAuth redirect', async () => {
      mockSignInWithOAuth.mockResolvedValue({ data: {}, error: null })

      await useAuthStore.getState().signInWithOAuth('apple')

      const verifier = sessionStorage.getItem('stratum_pkce_verifier')
      expect(verifier).toBeTruthy()
      expect(verifier!.length).toBeGreaterThanOrEqual(43)
      expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/)
    })

    it('should store provider in sessionStorage before OAuth redirect', async () => {
      mockSignInWithOAuth.mockResolvedValue({ data: {}, error: null })

      await useAuthStore.getState().signInWithOAuth('apple')

      expect(sessionStorage.getItem('stratum_pkce_provider')).toBe('apple')
    })

    it('should store PKCE verifier at supabase localStorage key for auto-detection', async () => {
      mockSignInWithOAuth.mockResolvedValue({ data: {}, error: null })

      await useAuthStore.getState().signInWithOAuth('apple')

      const storageKey = 'supabase.auth.token-code-verifier'
      const stored = localStorage.getItem(storageKey)
      expect(stored).toBeTruthy()
      expect(stored).toContain('/pkce')
    })

    it('should clear previous PKCE state before storing new one', async () => {
      mockSignInWithOAuth.mockResolvedValue({ data: {}, error: null })
      sessionStorage.setItem('stratum_pkce_verifier', 'old-verifier')
      sessionStorage.setItem('stratum_pkce_provider', 'google')

      await useAuthStore.getState().signInWithOAuth('apple')

      const verifier = sessionStorage.getItem('stratum_pkce_verifier')
      expect(verifier).not.toBe('old-verifier')
      expect(sessionStorage.getItem('stratum_pkce_provider')).toBe('apple')
    })
  })

  describe('signUp with captchaToken', () => {
    it('should pass captchaToken in options when provided', async () => {
      mockSignUp.mockResolvedValue({
        data: {
          user: { id: 'user-1', email: 'test@example.com' },
          session: { access_token: 'token-123' },
        },
        error: null,
      })

      await useAuthStore.getState().signUp(
        'test@example.com',
        'Password123abc',
        'Test Org',
        'SME',
        'test-org',
        'turnstile-token-abc'
      )

      expect(mockSignUp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          password: 'Password123abc',
          options: expect.objectContaining({
            captchaToken: 'turnstile-token-abc',
          }),
        })
      )
    })

    it('should pass undefined captchaToken when not provided', async () => {
      mockSignUp.mockResolvedValue({
        data: {
          user: { id: 'user-1', email: 'test@example.com' },
          session: { access_token: 'token-123' },
        },
        error: null,
      })

      await useAuthStore.getState().signUp(
        'test@example.com',
        'Password123abc',
        'Test Org',
        'SME',
        'test-org'
      )

      expect(mockSignUp).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            captchaToken: undefined,
          }),
        })
      )
    })

    it('should include org metadata alongside captchaToken', async () => {
      mockSignUp.mockResolvedValue({
        data: {
          user: { id: 'user-1', email: 'test@example.com' },
          session: { access_token: 'token-123' },
        },
        error: null,
      })

      await useAuthStore.getState().signUp(
        'test@example.com',
        'Password123abc',
        'Test Org',
        'AGENCY',
        'test-org',
        'captcha-token'
      )

      expect(mockSignUp).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            captchaToken: 'captcha-token',
            data: expect.objectContaining({
              organization_name: 'Test Org',
              organization_type: 'AGENCY',
              organization_slug: 'test-org',
            }),
          }),
        })
      )
    })
  })
})
