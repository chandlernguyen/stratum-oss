import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Shield, Copy, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

interface EnrollMFAModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

type EnrollStep = 'setup' | 'verify' | 'success'

export function EnrollMFAModal({ open, onOpenChange, onSuccess }: EnrollMFAModalProps) {
  const [currentStep, setCurrentStep] = useState<EnrollStep>('setup')
  const [factorId, setFactorId] = useState<string>('')
  const [qrCode, setQrCode] = useState<string>('')
  const [secret, setSecret] = useState<string>('')
  const [verificationCode, setVerificationCode] = useState('')
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setCurrentStep('setup')
      setFactorId('')
      setQrCode('')
      setSecret('')
      setVerificationCode('')
      setError(null)
    }
  }, [open])

  // Start enrollment when modal opens
  useEffect(() => {
    if (open && currentStep === 'setup') {
      startEnrollment()
    }
  }, [open, currentStep])

  const startEnrollment = async () => {
    setIsEnrolling(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App'
      })

      if (error) throw error

      if (data) {
        setFactorId(data.id)
        setQrCode(data.totp.qr_code) // Base64 encoded SVG
        setSecret(data.totp.secret)
        setCurrentStep('verify')
      }
    } catch (err: any) {
      console.error('MFA enrollment error:', err)
      setError(err.message || 'Failed to start MFA enrollment')
      toast.error('Failed to start MFA enrollment')
    } finally {
      setIsEnrolling(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a 6-digit code')
      return
    }

    setIsVerifying(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: verificationCode
      })

      if (error) throw error

      if (data) {
        setCurrentStep('success')
        toast.success('Multi-factor authentication enabled successfully')
        onSuccess?.()
      }
    } catch (err: any) {
      console.error('MFA verification error:', err)
      setError('Invalid code. Please try again.')
      setVerificationCode('')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleCopySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret)
      toast.success('Secret key copied to clipboard')
    } catch (err) {
      toast.error('Failed to copy secret key')
    }
  }

  const handleClose = () => {
    if (currentStep === 'verify') {
      // Warn user about incomplete setup
      if (confirm('Are you sure you want to cancel? MFA setup is not complete.')) {
        onOpenChange(false)
      }
    } else {
      onOpenChange(false)
    }
  }

  const renderSetup = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-center py-4">
        {isEnrolling ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">Setting up MFA...</p>
          </div>
        ) : error ? (
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-sm text-red-600">{error}</p>
            <Button onClick={startEnrollment} variant="outline" className="mt-4">
              Try Again
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )

  const renderVerify = () => (
    <form onSubmit={handleVerify} className="space-y-6">
      {/* QR Code */}
      <div className="space-y-4">
        <div className="text-center">
          <h4 className="font-medium mb-2">Step 1: Scan QR Code</h4>
          <p className="text-sm text-muted-foreground mb-4">
            Open your authenticator app (Google Authenticator, Authy, 1Password, etc.) and scan this code:
          </p>
          {qrCode && (
            <div className="flex justify-center bg-white p-4 rounded-lg border inline-block mx-auto">
              <img
                src={qrCode}
                alt="QR Code for MFA setup"
                className="w-48 h-48"
              />
            </div>
          )}
        </div>

        {/* Manual Secret Key */}
        <div className="border rounded-lg p-4 bg-muted/50">
          <Label className="text-sm font-medium">Or enter this secret key manually:</Label>
          <div className="flex items-center gap-2 mt-2">
            <code className="flex-1 bg-background px-3 py-2 rounded text-sm font-mono border">
              {secret}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopySecret}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Keep this secret key in a safe place. You'll need it if you lose access to your authenticator app.
          </p>
        </div>
      </div>

      {/* Verification Code Input */}
      <div className="space-y-2">
        <Label htmlFor="verification-code">Step 2: Enter Verification Code</Label>
        <p className="text-sm text-muted-foreground mb-2">
          Enter the 6-digit code from your authenticator app:
        </p>
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
          }}
          className="text-center text-2xl tracking-widest font-mono"
          autoFocus
          disabled={isVerifying}
        />
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={handleClose} disabled={isVerifying}>
          Cancel
        </Button>
        <Button type="submit" disabled={verificationCode.length !== 6 || isVerifying}>
          {isVerifying ? 'Verifying...' : 'Verify & Enable'}
        </Button>
      </DialogFooter>
    </form>
  )

  const renderSuccess = () => (
    <div className="space-y-6 text-center py-4">
      <div className="flex justify-center">
        <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-3">
          <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-lg font-semibold">Multi-Factor Authentication Enabled</h4>
        <p className="text-muted-foreground">
          Your account is now protected with an additional layer of security.
        </p>
      </div>

      <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-left">
        <h5 className="font-medium text-sm">What's Next?</h5>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li>You'll be asked for a code when you log in</li>
          <li>Keep your secret key safe as a backup</li>
          <li>You can manage MFA from your profile settings</li>
        </ul>
      </div>

      <DialogFooter>
        <Button onClick={() => onOpenChange(false)} className="w-full">
          Done
        </Button>
      </DialogFooter>
    </div>
  )

  const getStepTitle = () => {
    switch (currentStep) {
      case 'setup':
        return 'Enable Multi-Factor Authentication'
      case 'verify':
        return 'Set Up Your Authenticator'
      case 'success':
        return 'MFA Enabled Successfully'
    }
  }

  const getStepDescription = () => {
    switch (currentStep) {
      case 'setup':
        return 'Setting up two-factor authentication for your account'
      case 'verify':
        return 'Scan the QR code with your authenticator app'
      case 'success':
        return 'Your account is now protected with MFA'
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <DialogTitle>{getStepTitle()}</DialogTitle>
          </div>
          <DialogDescription>{getStepDescription()}</DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 py-2">
          <div className={`h-2 w-2 rounded-full ${currentStep === 'setup' ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`h-2 w-2 rounded-full ${currentStep === 'verify' ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`h-2 w-2 rounded-full ${currentStep === 'success' ? 'bg-primary' : 'bg-muted'}`} />
        </div>

        {currentStep === 'setup' && renderSetup()}
        {currentStep === 'verify' && renderVerify()}
        {currentStep === 'success' && renderSuccess()}
      </DialogContent>
    </Dialog>
  )
}
