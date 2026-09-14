import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, Key, AlertCircle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import zxcvbn from 'zxcvbn'

interface ChangePasswordModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChangePasswordModal({ open, onOpenChange }: ChangePasswordModalProps) {
  const { changePassword } = useAuthStore()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState<ReturnType<typeof zxcvbn> | null>(null)

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordStrength(null)
    }
  }, [open])

  // Calculate password strength
  useEffect(() => {
    if (newPassword) {
      setPasswordStrength(zxcvbn(newPassword))
    } else {
      setPasswordStrength(null)
    }
  }, [newPassword])

  const getStrengthColor = (score: number) => {
    switch (score) {
      case 0:
      case 1:
        return 'bg-red-500'
      case 2:
        return 'bg-orange-500'
      case 3:
        return 'bg-yellow-500'
      case 4:
        return 'bg-green-500'
      default:
        return 'bg-gray-300'
    }
  }

  const getStrengthText = (score: number) => {
    switch (score) {
      case 0:
        return 'Very Weak'
      case 1:
        return 'Weak'
      case 2:
        return 'Fair'
      case 3:
        return 'Good'
      case 4:
        return 'Strong'
      default:
        return ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all fields')
      return
    }

    if (newPassword.length < 15) {
      toast.error('New password must be at least 15 characters long')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }

    if (currentPassword === newPassword) {
      toast.error('New password must be different from current password')
      return
    }

    // Check password strength
    if (passwordStrength && passwordStrength.score < 2) {
      toast.error('Password is too weak. Please choose a stronger password.')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await changePassword(currentPassword, newPassword)

      if (result.success) {
        toast.success('Password changed successfully', {
          description: 'Your password has been updated. You can now use it to sign in.',
        })
        onOpenChange(false)
      } else {
        toast.error('Failed to change password', {
          description: result.error || 'Please try again.',
        })
      }
    } catch (error) {
      toast.error('An unexpected error occurred', {
        description: 'Please try again later.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Change Password
          </DialogTitle>
          <DialogDescription>
            Enter your current password and choose a new secure password. Minimum 15 characters required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password */}
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
                disabled={isSubmitting}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                disabled={isSubmitting}
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter your new password (min. 15 characters)"
                disabled={isSubmitting}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowNewPassword(!showNewPassword)}
                disabled={isSubmitting}
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>

            {/* Password Strength Indicator */}
            {passwordStrength && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${getStrengthColor(passwordStrength.score)}`}
                      style={{ width: `${(passwordStrength.score + 1) * 20}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {getStrengthText(passwordStrength.score)}
                  </span>
                </div>

                {/* Password Feedback */}
                {passwordStrength.feedback.warning && (
                  <div className="flex items-start gap-2 text-xs text-orange-600">
                    <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>{passwordStrength.feedback.warning}</span>
                  </div>
                )}

                {passwordStrength.feedback.suggestions.length > 0 && (
                  <div className="space-y-1">
                    {passwordStrength.feedback.suggestions.map((suggestion, index) => (
                      <div key={index} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>{suggestion}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                disabled={isSubmitting}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isSubmitting}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>

            {/* Password Match Indicator */}
            {confirmPassword && newPassword && (
              <div className="flex items-center gap-2 text-xs">
                {confirmPassword === newPassword ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                    <span className="text-green-600">Passwords match</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3 text-red-600" />
                    <span className="text-red-600">Passwords do not match</span>
                  </>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Changing Password...' : 'Change Password'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
