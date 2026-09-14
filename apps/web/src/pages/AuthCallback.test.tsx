import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthCallback } from './AuthCallback'

const mockExchangeCodeForSession = vi.fn()
const mockGetSession = vi.fn()
const mockOnAuthStateChange = vi.fn().mockReturnValue({
  data: { subscription: { unsubscribe: vi.fn() } },
})

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      exchangeCodeForSession: (...args: unknown[]) => mockExchangeCodeForSession(...args),
      getSession: (...args: unknown[]) => mockGetSession(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
    },
  },
}))

const mockNavigate = vi.fn()

vi.mock('@/hooks/useLocalizedNavigate', () => ({
  useLocalizedNavigate: () => mockNavigate,
}))

const mockSessionGetItem = vi.fn()
const mockSessionRemoveItem = vi.fn()
const mockLocalSetItem = vi.fn()
const mockLocalRemoveItem = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
  mockExchangeCodeForSession.mockRejectedValue(new Error('should not be called'))
  mockSessionGetItem.mockReturnValue(null)
  mockSessionRemoveItem.mockImplementation(() => {})
  mockLocalSetItem.mockImplementation(() => {})
  mockLocalRemoveItem.mockImplementation(() => {})

  Object.defineProperty(window, 'sessionStorage', {
    value: {
      getItem: mockSessionGetItem,
      removeItem: mockSessionRemoveItem,
      setItem: vi.fn(),
    },
    writable: true,
  })
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: vi.fn(),
      setItem: mockLocalSetItem,
      removeItem: mockLocalRemoveItem,
    },
    writable: true,
  })
})

function renderAuthCallback() {
  return render(
    <MemoryRouter>
      <AuthCallback />
    </MemoryRouter>
  )
}

describe('AuthCallback', () => {
  it('should navigate to dashboard when session already exists', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'abc', user: { id: '1' } } },
      error: null,
    })

    renderAuthCallback()

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true })
    })
  })

  it('should set PKCE verifier in supabase localStorage key before exchange', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
    mockSessionGetItem.mockReturnValue('test-pkce-verifier')
    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: { access_token: 'new-token' } },
      error: null,
    })

    renderAuthCallback()

    await waitFor(() => {
      expect(mockLocalSetItem).toHaveBeenCalledWith(
        'supabase.auth.token-code-verifier',
        'test-pkce-verifier/pkce'
      )
    })
  })

  it('should call exchangeCodeForSession with the URL (single arg)', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
    mockSessionGetItem.mockReturnValue('test-pkce-verifier')
    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: { access_token: 'new-token' } },
      error: null,
    })

    renderAuthCallback()

    await waitFor(() => {
      expect(mockExchangeCodeForSession).toHaveBeenCalledWith(
        expect.any(String)
      )
    })
  })

  it('should navigate to dashboard after successful PKCE exchange', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
    mockSessionGetItem.mockReturnValue('test-pkce-verifier')
    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: { access_token: 'new-token' } },
      error: null,
    })

    renderAuthCallback()

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true })
    })
  })

  it('should clear PKCE state from sessionStorage after successful exchange', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
    mockSessionGetItem.mockReturnValue('test-pkce-verifier')
    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: { access_token: 'new-token' } },
      error: null,
    })

    renderAuthCallback()

    await waitFor(() => {
      expect(mockSessionRemoveItem).toHaveBeenCalledWith('stratum_pkce_verifier')
      expect(mockSessionRemoveItem).toHaveBeenCalledWith('stratum_pkce_provider')
      expect(mockLocalRemoveItem).toHaveBeenCalledWith('supabase.auth.token-code-verifier')
    })
  })

  it('should navigate to login when PKCE exchange fails', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
    mockSessionGetItem.mockReturnValue('test-pkce-verifier')
    mockExchangeCodeForSession.mockResolvedValue({
      data: {},
      error: { message: 'Invalid code verifier' },
    })

    renderAuthCallback()

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true })
    })
  })

  it('should clear PKCE state even on exchange failure', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
    mockSessionGetItem.mockReturnValue('test-pkce-verifier')
    mockExchangeCodeForSession.mockResolvedValue({
      data: {},
      error: { message: 'Invalid code verifier' },
    })

    renderAuthCallback()

    await waitFor(() => {
      expect(mockSessionRemoveItem).toHaveBeenCalledWith('stratum_pkce_verifier')
      expect(mockLocalRemoveItem).toHaveBeenCalledWith('supabase.auth.token-code-verifier')
    })
  })

  it('should navigate to login when no PKCE verifier is in sessionStorage', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null })
    mockSessionGetItem.mockReturnValue(null)

    renderAuthCallback()

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true })
      expect(mockExchangeCodeForSession).not.toHaveBeenCalled()
    })
  })

  it('should not call exchangeCodeForSession when session already exists', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'abc', user: { id: '1' } } },
      error: null,
    })
    mockSessionGetItem.mockReturnValue('test-pkce-verifier')

    renderAuthCallback()

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true })
      expect(mockExchangeCodeForSession).not.toHaveBeenCalled()
    })
  })

  it('should clear PKCE state when session already exists', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'abc', user: { id: '1' } } },
      error: null,
    })

    renderAuthCallback()

    await waitFor(() => {
      expect(mockSessionRemoveItem).toHaveBeenCalledWith('stratum_pkce_verifier')
      expect(mockLocalRemoveItem).toHaveBeenCalledWith('supabase.auth.token-code-verifier')
    })
  })
})
