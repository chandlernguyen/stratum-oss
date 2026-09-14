import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Shield, CheckCircle2, AlertCircle, Smartphone, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useLocale } from '@/hooks/useLocale'
import { getIntlLocale } from '@/lib/locales'
import type { Factor } from '@supabase/supabase-js'

interface ManageMFAModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onEnrollClick?: () => void
}

type ViewState = 'loading' | 'list' | 'confirm-disable'

export function ManageMFAModal({ open, onOpenChange, onEnrollClick }: ManageMFAModalProps) {
  const { locale } = useLocale('common')
  const [viewState, setViewState] = useState<ViewState>('loading')
  const [factors, setFactors] = useState<Factor[]>([])
  const [selectedFactor, setSelectedFactor] = useState<Factor | null>(null)
  const [isDisabling, setIsDisabling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load MFA factors when modal opens
  useEffect(() => {
    if (open) {
      loadFactors()
    } else {
      // Reset state when modal closes
      setViewState('loading')
      setFactors([])
      setSelectedFactor(null)
      setError(null)
    }
  }, [open])

  const loadFactors = async () => {
    setViewState('loading')
    setError(null)

    try {
      const { data, error } = await supabase.auth.mfa.listFactors()

      if (error) throw error

      if (data) {
        // Only show verified factors
        const verifiedFactors = data.totp.filter((factor) => factor.status === 'verified')
        setFactors(verifiedFactors)
        setViewState('list')
      }
    } catch (err: any) {
      console.error('Failed to load MFA factors:', err)
      setError(err.message || 'Failed to load MFA factors')
      setViewState('list')
    }
  }

  const handleDisableClick = (factor: Factor) => {
    setSelectedFactor(factor)
    setViewState('confirm-disable')
  }

  const handleConfirmDisable = async () => {
    if (!selectedFactor) return

    setIsDisabling(true)
    setError(null)

    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId: selectedFactor.id
      })

      if (error) throw error

      toast.success('Multi-factor authentication disabled')
      await loadFactors() // Reload factors
      setViewState('list')
      setSelectedFactor(null)
    } catch (err: any) {
      console.error('Failed to disable MFA:', err)
      setError(err.message || 'Failed to disable MFA')
      toast.error('Failed to disable MFA')
    } finally {
      setIsDisabling(false)
    }
  }

  const handleCancelDisable = () => {
    setSelectedFactor(null)
    setViewState('list')
  }

  const handleEnrollNew = () => {
    onOpenChange(false)
    onEnrollClick?.()
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(getIntlLocale(locale), {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
      <p className="text-sm text-muted-foreground">Loading MFA settings...</p>
    </div>
  )

  const renderList = () => (
    <div className="space-y-4">
      {/* Current MFA Status */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-3">
          <div className={`rounded-full p-2 ${factors.length > 0 ? 'bg-green-100 dark:bg-green-900/20' : 'bg-gray-100 dark:bg-gray-900/20'}`}>
            {factors.length > 0 ? (
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            ) : (
              <Shield className="h-5 w-5 text-gray-400" />
            )}
          </div>
          <div>
            <p className="font-medium">
              {factors.length > 0 ? 'MFA Enabled' : 'MFA Not Enabled'}
            </p>
            <p className="text-sm text-muted-foreground">
              {factors.length > 0
                ? `${factors.length} authenticator ${factors.length === 1 ? 'app' : 'apps'} configured`
                : 'Add an extra layer of security to your account'}
            </p>
          </div>
        </div>
      </div>

      {/* List of Enrolled Factors */}
      {factors.length > 0 ? (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Authenticator Apps</h4>
          {factors.map((factor) => (
            <div
              key={factor.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">{factor.friendly_name || 'Authenticator App'}</p>
                  <p className="text-xs text-muted-foreground">
                    Added {formatDate(factor.created_at)}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDisableClick(factor)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-muted-foreground">
          <p className="mb-4">No authenticator apps configured</p>
          <Button onClick={handleEnrollNew}>
            <Shield className="h-4 w-4 mr-2" />
            Enable MFA
          </Button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Security Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-sm">
        <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-2">About MFA</h5>
        <ul className="text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
          <li>Protects your account with a second verification step</li>
          <li>Works with Google Authenticator, Authy, 1Password, and more</li>
          <li>Required on each new device or browser</li>
        </ul>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Close
        </Button>
        {factors.length > 0 && (
          <Button onClick={handleEnrollNew}>
            <Shield className="h-4 w-4 mr-2" />
            Add Another
          </Button>
        )}
      </DialogFooter>
    </div>
  )

  const renderConfirmDisable = () => (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-3">
          <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
        </div>
      </div>

      <div className="text-center space-y-2">
        <h4 className="text-lg font-semibold">Disable MFA?</h4>
        <p className="text-muted-foreground">
          This will remove <strong>{selectedFactor?.friendly_name || 'this authenticator app'}</strong> from your account.
        </p>
      </div>

      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 space-y-2">
        <h5 className="font-medium text-sm text-red-900 dark:text-red-100">Security Warning</h5>
        <p className="text-sm text-red-800 dark:text-red-200">
          Disabling MFA will make your account less secure. You'll only need your password to log in.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <DialogFooter>
        <Button
          variant="outline"
          onClick={handleCancelDisable}
          disabled={isDisabling}
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={handleConfirmDisable}
          disabled={isDisabling}
        >
          {isDisabling ? 'Disabling...' : 'Disable MFA'}
        </Button>
      </DialogFooter>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <DialogTitle>Manage Multi-Factor Authentication</DialogTitle>
          </div>
          <DialogDescription>
            {viewState === 'confirm-disable'
              ? 'Confirm you want to disable MFA'
              : 'Manage your authenticator apps and security settings'}
          </DialogDescription>
        </DialogHeader>

        {viewState === 'loading' && renderLoading()}
        {viewState === 'list' && renderList()}
        {viewState === 'confirm-disable' && renderConfirmDisable()}
      </DialogContent>
    </Dialog>
  )
}
