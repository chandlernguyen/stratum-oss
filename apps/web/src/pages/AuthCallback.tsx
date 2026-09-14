import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { PageLoadingSpinner } from '@/components/ui/loading-spinner'
import { useLocalizedNavigate } from '@/hooks/useLocalizedNavigate'

const PKCE_VERIFIER_KEY = 'stratum_pkce_verifier'
const PKCE_PROVIDER_KEY = 'stratum_pkce_provider'
const SUPABASE_PKCE_KEY = 'supabase.auth.token-code-verifier'

function clearPKCEState() {
  sessionStorage.removeItem(PKCE_VERIFIER_KEY)
  sessionStorage.removeItem(PKCE_PROVIDER_KEY)
  localStorage.removeItem(SUPABASE_PKCE_KEY)
}

export function AuthCallback() {
  const navigate = useLocalizedNavigate()

  useEffect(() => {
    const handleCallback = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        clearPKCEState()
        navigate('/dashboard', { replace: true })
        return
      }

      const codeVerifier = sessionStorage.getItem(PKCE_VERIFIER_KEY)
      if (!codeVerifier) {
        console.error('OAuth callback: missing PKCE code verifier')
        navigate('/login', { replace: true })
        return
      }

      localStorage.setItem(SUPABASE_PKCE_KEY, `${codeVerifier}/pkce`)

      const { error } = await supabase.auth.exchangeCodeForSession(
        window.location.href
      )

      clearPKCEState()

      if (error) {
        console.error('OAuth callback error:', error)
        navigate('/login', { replace: true })
        return
      }

      navigate('/dashboard', { replace: true })
    }

    handleCallback()
  }, [navigate])

  return <PageLoadingSpinner />
}
