import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertTriangle, Trash2, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { API_BASE_URL } from '@/lib/api';
import { getLocaleHeaders } from '@/lib/apiHeaders';

interface DeleteAccountModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteAccountModal({ open, onOpenChange }: DeleteAccountModalProps) {
  const navigate = useNavigate()
  const { signOut } = useAuthStore()
  const [confirmation, setConfirmation] = useState('')
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setConfirmation('')
      setReason('')
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (confirmation !== 'DELETE') {
      toast.error('Invalid confirmation', {
        description: 'Please type "DELETE" to confirm account deletion.',
      })
      return
    }

    if (!reason.trim()) {
      toast.error('Reason required', {
        description: 'Please provide a reason for deleting your account.',
      })
      return
    }

    setIsSubmitting(true)

    try {
      const session = await supabase.auth.getSession()
      if (!session.data.session?.access_token) {
        toast.error('Not authenticated', {
          description: 'Please log in to delete your account.',
        })
        setIsSubmitting(false)
        return
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/users/account`, {
        method: 'DELETE',
        headers: getLocaleHeaders({
          'Authorization': `Bearer ${session.data.session.access_token}`,
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          confirm: 'DELETE',
          reason: reason.trim(),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to delete account')
      }

      const result = await response.json()

      toast.success('Account deletion scheduled', {
        description: result.note || 'Your account has been archived and will be permanently deleted after 30 days.',
        duration: 5000,
      })

      // Close modal and log out
      onOpenChange(false)

      // Wait a moment for the toast to be visible
      setTimeout(async () => {
        await signOut()
        navigate('/login')
      }, 2000)
    } catch (error: any) {
      console.error('Error deleting account:', error)
      toast.error('Failed to delete account', {
        description: error.message || 'Please try again later.',
      })
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-brand-error">
            <AlertTriangle className="w-5 h-5" />
            Delete Account
          </DialogTitle>
          <DialogDescription>
            This action will archive your account and schedule it for permanent deletion.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Warning Message */}
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-brand-error mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <h4 className="font-semibold text-brand-error dark:text-red-100">
                  Warning: This action cannot be easily undone
                </h4>
                <ul className="text-sm text-brand-error dark:text-red-200 space-y-1">
                  <li className="flex items-start gap-2">
                    <span className="text-brand-error">•</span>
                    <span>Your account will be immediately archived and inaccessible</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-error">•</span>
                    <span>All your data (campaigns, personas, content, etc.) will be archived</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-error">•</span>
                    <span>You have 30 days to contact support to restore your account</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-brand-error">•</span>
                    <span>After 30 days, all data will be permanently deleted</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Reason for Deletion */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason for Deletion <span className="text-brand-error">*</span>
            </Label>
            <textarea
              id="reason"
              className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please tell us why you're deleting your account..."
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              This helps us improve our service
            </p>
          </div>

          {/* Confirmation Input */}
          <div className="space-y-2">
            <Label htmlFor="confirmation">
              Type <span className="font-mono font-bold">DELETE</span> to confirm <span className="text-brand-error">*</span>
            </Label>
            <Input
              id="confirmation"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder="DELETE"
              disabled={isSubmitting}
              autoComplete="off"
            />
            {confirmation && (
              <div className="flex items-center gap-2 text-xs">
                {confirmation === 'DELETE' ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-brand-success" />
                    <span className="text-brand-success">Confirmation valid</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3 text-brand-error" />
                    <span className="text-brand-error">Please type "DELETE" exactly</span>
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
            <Button
              type="submit"
              variant="destructive"
              disabled={isSubmitting || confirmation !== 'DELETE' || !reason.trim()}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting Account...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Account
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
