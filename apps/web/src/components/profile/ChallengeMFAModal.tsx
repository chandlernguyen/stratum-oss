import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Shield, AlertCircle, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

interface ChallengeMFAModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  onCancel?: () => void
  factorId?: string
}

export function ChallengeMFAModal({
  open,
  onOpenChange,
  onSuccess,
  onCancel,
  factorId
}: ChallengeMFAModalProps) {
  const [verificationCode, setVerificationCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [challengeId, setChallengeId] = useState<string>('')
  const [attempts, setAttempts] = useState(0)
  const maxAttempts = 5

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setVerificationCode('')
      setError(null)
      setChallengeId('')
      setAttempts(0)
    }
  }, [open])

  // Create challenge when modal opens
  useEffect(() => {
    if (open && !challengeId && factorId) {
      createChallenge()
    }
  }, [open, factorId, challengeId])

  const createChallenge = async () => {
    if (!factorId) {
      setError('MFA factor not found. Please contact support.')
      return
    }

    try {
      const { data, error } = await supabase.auth.mfa.challenge({
        factorId
      })

      if (error) throw error

      if (data) {
        setChallengeId(data.id)
      }
    } catch (err: any) {
      console.error('MFA challenge creation error:', err)
      setError(err.message || 'Failed to create MFA challenge')
      toast.error('Failed to create MFA challenge')
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a 6-digit code')
      return
    }

    if (!challengeId) {
      setError('Challenge not initialized. Please try again.')
      return
    }

    if (attempts >= maxAttempts) {
      setError('Maximum attempts exceeded. Please refresh and try again.')
      return
    }

    setIsVerifying(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.mfa.verify({
        factorId: factorId!,
        challengeId,
        code: verificationCode
      })

      if (error) throw error

      if (data) {
        // Refresh session to get upgraded AAL2 token
        const { error: refreshError } = await supabase.auth.refreshSession()

        if (refreshError) {
          console.error('Failed to refresh session after MFA:', refreshError)
          throw new Error('Session refresh failed')
        }

        toast.success('Verification successful')
        // Don't close modal here - let parent handle it after success flow completes
        onSuccess?.()
      }
    } catch (err: any) {
      console.error('MFA verification error:', err)
      const newAttempts = attempts + 1
      setAttempts(newAttempts)

      if (newAttempts >= maxAttempts) {
        setError(`Maximum attempts (${maxAttempts}) exceeded. Please refresh and try again.`)
      } else {
        setError(`Invalid code. ${maxAttempts - newAttempts} attempts remaining.`)
      }

      setVerificationCode('')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleCancel = () => {
    onCancel?.()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <DialogTitle>Two-Factor Authentication</DialogTitle>
          </div>
          <DialogDescription>
            Enter the 6-digit code from your authenticator app
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleVerify} className="space-y-6">
          {/* Authenticator App Icon */}
          <div className="flex justify-center py-4">
            <div className="rounded-full bg-blue-50 dark:bg-blue-900/20 p-4">
              <Smartphone className="h-12 w-12 text-blue-600 dark:text-blue-400" />
            </div>
          </div>

          {/* Verification Code Input */}
          <div className="space-y-2">
            <Label htmlFor="verification-code">Verification Code</Label>
            <Input
              id="verification-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              value={verificationCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '')
                setVerificationCode(value)
                if (error) setError(null) // Clear error when user types
              }}
              className="text-center text-2xl tracking-widest font-mono"
              autoFocus
              disabled={isVerifying || attempts >= maxAttempts}
            />
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
          </div>

          {/* Help Text */}
          <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
            <p>Open your authenticator app and enter the current 6-digit code.</p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isVerifying}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={verificationCode.length !== 6 || isVerifying || attempts >= maxAttempts}
            >
              {isVerifying ? 'Verifying...' : 'Verify'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
