import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ChallengeMFAModal } from '@/components/profile/ChallengeMFAModal'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'
import { useLocalizedNavigate } from '@/hooks/useLocalizedNavigate'

export function MFAVerifyPage() {
  const navigate = useLocalizedNavigate()
  const location = useLocation()
  const { setSession } = useAuthStore()
  const [factorId, setFactorId] = useState<string>('')
  const [verificationSucceeded, setVerificationSucceeded] = useState(false)
  const [modalOpen, setModalOpen] = useState(true)

  useEffect(() => {
    // Get factor ID from navigation state
    const state = location.state as { factorId?: string }
    if (state?.factorId) {
      setFactorId(state.factorId)
    } else {
      // No factor ID provided - redirect to login
      console.error('No MFA factor ID provided')
      navigate('/login', { replace: true })
    }
  }, [location, navigate])

  const handleMFASuccess = async () => {
    // MFA verification successful - session upgraded to AAL2
    setVerificationSucceeded(true) // Mark as succeeded to prevent cancel flow

    try {
      console.log('✅ MFA verified! Getting AAL2 session from Supabase')

      // Wait a moment for session to fully persist after refresh
      await new Promise(resolve => setTimeout(resolve, 100))

      const { data: { session }, error } = await supabase.auth.getSession()

      if (error || !session) {
        console.error('Failed to get session after MFA:', error)
        navigate('/login', { replace: true })
        return
      }

      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
      console.log('Session AAL after MFA:', data?.currentLevel)

      // Now set session in our auth store
      setSession(session.user, session)

      console.log('✅ Navigating to dashboard with AAL2 session')

      // Close modal AFTER successful flow completes
      setModalOpen(false)

      navigate('/dashboard', { replace: true })
    } catch (err) {
      console.error('Error after MFA verification:', err)
      navigate('/login', { replace: true })
    }
  }

  const handleMFACancel = async () => {
    // Only sign out if verification didn't succeed
    if (verificationSucceeded) {
      console.log('MFA verification succeeded - not canceling')
      return
    }

    // User canceled MFA - sign out the AAL1 session
    console.log('MFA canceled - signing out')
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  if (!factorId) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 flex items-center justify-center">
      <ChallengeMFAModal
        open={modalOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleMFACancel()
          }
        }}
        onSuccess={handleMFASuccess}
        onCancel={handleMFACancel}
        factorId={factorId}
      />
    </div>
  )
}
