import { useState, useMemo } from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Mail, Shield, Loader2, Check, Building2 } from 'lucide-react'
import { toast } from 'sonner'
import { API_BASE_URL } from '@/lib/api'
import { getLocaleHeaders } from '@/lib/apiHeaders'
import { useAuthStore } from '@/stores/auth'
import { useRoles, getTeamRoles, getRoleIdByName, isClientRole, type Role } from '@/hooks/useRoles'
import { useUserContextEnhanced } from '@/hooks/data/useUserContextEnhanced'
import { useActiveClients } from '@/hooks/data/useClients'

interface InviteTeamMemberModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

interface InviteFormData {
  email: string
  role_id: string
}

/**
 * Filter roles based on the current user's role hierarchy.
 * Owners can invite anyone, admins can invite everyone except owners/admins.
 */
function filterRolesByHierarchy(roles: Role[], currentUserRole: string | undefined): Role[] {
  if (!currentUserRole) return []

  const userRole = currentUserRole.toLowerCase()

  // Owners can invite any role
  if (['agency_owner', 'sme_owner'].includes(userRole)) {
    return roles
  }

  // Admins can invite everyone except owners and other admins
  if (['agency_admin', 'sme_admin'].includes(userRole)) {
    return roles.filter(role =>
      !['agency_owner', 'agency_admin', 'sme_owner', 'sme_admin'].includes(role.name.toLowerCase())
    )
  }

  // Marketing managers can invite analysts and viewers
  if (['sme_marketing_manager'].includes(userRole)) {
    return roles.filter(role =>
      ['sme_analyst', 'sme_viewer'].includes(role.name.toLowerCase())
    )
  }

  // Default: no roles available
  return []
}

export function InviteTeamMemberModal({ open, onClose, onSuccess }: InviteTeamMemberModalProps) {
  const { session } = useAuthStore()
  const [email, setEmail] = useState('')
  const [selectedRole, setSelectedRole] = useState<string>('')
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([])
  const [allClients, setAllClients] = useState(true) // Default to all clients access

  // Get current user's role and org type for hierarchy filtering
  const { data: userContext } = useUserContextEnhanced()
  const currentUserRole = userContext?.roles?.[0]?.role_name
  const orgType = userContext?.org_type || 'SME'
  const isAgency = orgType === 'AGENCY'

  // Fetch roles dynamically from database (no hardcoded UUIDs)
  const { data: allRoles, isLoading: rolesLoading } = useRoles(orgType)
  const teamRoles = allRoles ? getTeamRoles(allRoles, orgType) : []

  // Fetch clients for agency organizations
  const { data: clients, isLoading: clientsLoading } = useActiveClients()

  // Filter roles based on user's hierarchy (prevent admins from inviting owners)
  const availableRoles = useMemo(() => {
    return filterRolesByHierarchy(teamRoles, currentUserRole)
  }, [teamRoles, currentUserRole])

  const inviteMutation = useMutation({
    mutationFn: async (data: InviteFormData) => {
      const response = await fetch(`${API_BASE_URL}/api/v1/team/invite`, {
        method: 'POST',
        headers: getLocaleHeaders({
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          email: data.email,
          role_id: data.role_id,
          // For agency: send client_ids if specific clients selected, empty array for all clients
          client_ids: isAgency && !allClients ? selectedClientIds : [],
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to send invitation')
      }

      return response.json()
    },
    onSuccess: (data) => {
      toast.success(`Invitation sent to ${data.email}`, {
        description: `They will receive an email with instructions to join your team.`,
        icon: <Check className="h-4 w-4" />,
      })
      onSuccess()
      handleClose()
    },
    onError: (error: Error) => {
      toast.error('Failed to send invitation', {
        description: error.message,
      })
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !selectedRole) {
      toast.error('Please fill in all fields')
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address')
      return
    }

    // Get role ID from dynamically fetched roles
    if (!allRoles) {
      toast.error('Roles not loaded yet')
      return
    }

    const roleId = getRoleIdByName(allRoles, selectedRole)
    if (!roleId) {
      toast.error('Invalid role selected')
      return
    }

    inviteMutation.mutate({ email, role_id: roleId })
  }

  const handleClose = () => {
    setEmail('')
    setSelectedRole('')
    setSelectedClientIds([])
    setAllClients(true)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Invite Team Member
          </DialogTitle>
          <DialogDescription>
            Send an invitation to join your organization. They will receive an email with instructions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={inviteMutation.isPending}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={selectedRole}
              onValueChange={setSelectedRole}
              disabled={inviteMutation.isPending || rolesLoading}
            >
              <SelectTrigger id="role">
                <SelectValue placeholder={rolesLoading ? "Loading roles..." : "Select a role"} />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((role) => (
                  <SelectItem key={role.id} value={role.name}>
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{role.name.replace('agency_', '').replace(/_/g, ' ')}</div>
                        <div className="text-xs text-muted-foreground">{role.description}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Client Access - Agency only */}
          {isAgency && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Client Access
              </Label>

              {/* For agency_client role, always require specific client selection */}
              {isClientRole(selectedRole) ? (
                <div className="p-3 rounded-md border border-brand-gold/30 bg-brand-gold/5">
                  <p className="text-sm text-brand-charcoal">
                    <strong>Client Contact</strong> users can only access one client. Select which client this person represents.
                  </p>
                </div>
              ) : (
                /* All Clients Toggle - for internal agency users only */
                <div className="flex items-center space-x-2 p-3 rounded-md border bg-muted/30">
                  <Checkbox
                    id="all-clients"
                    checked={allClients}
                    onCheckedChange={(checked) => {
                      setAllClients(checked === true)
                      if (checked) {
                        setSelectedClientIds([])
                      }
                    }}
                    disabled={inviteMutation.isPending}
                  />
                  <div className="flex flex-col">
                    <label htmlFor="all-clients" className="text-sm font-medium cursor-pointer">
                      All Clients
                    </label>
                    <span className="text-xs text-muted-foreground">
                      User will have access to all current and future clients
                    </span>
                  </div>
                </div>
              )}

              {/* Specific Clients Selection - shown when not "All Clients" OR when client role */}
              {(!allClients || isClientRole(selectedRole)) && (
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">
                    {isClientRole(selectedRole)
                      ? 'Select the client this person represents:'
                      : 'Select specific clients this user can access:'}
                  </span>
                  {clientsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground p-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading clients...
                    </div>
                  ) : clients && clients.length > 0 ? (
                    <div className="max-h-[150px] overflow-y-auto space-y-2 border rounded-md p-2">
                      {clients.map((client) => (
                        <div key={client.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`client-${client.id}`}
                            checked={selectedClientIds.includes(client.id)}
                            onCheckedChange={(checked) => {
                              if (isClientRole(selectedRole)) {
                                // Client role: only one client allowed (radio-like behavior)
                                setSelectedClientIds(checked ? [client.id] : [])
                              } else {
                                // Other roles: multiple clients allowed
                                if (checked) {
                                  setSelectedClientIds([...selectedClientIds, client.id])
                                } else {
                                  setSelectedClientIds(selectedClientIds.filter(id => id !== client.id))
                                }
                              }
                            }}
                            disabled={inviteMutation.isPending}
                          />
                          <label
                            htmlFor={`client-${client.id}`}
                            className="text-sm cursor-pointer flex-1"
                          >
                            {client.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground p-2 border rounded-md">
                      No clients available. Create clients first.
                    </div>
                  )}
                  {selectedClientIds.length === 0 && (
                    <p className="text-xs text-brand-warning">
                      {isClientRole(selectedRole)
                        ? 'Select the client this person represents'
                        : 'Select at least one client or choose "All Clients"'}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={inviteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                inviteMutation.isPending ||
                (isAgency && !allClients && selectedClientIds.length === 0) ||
                (isAgency && isClientRole(selectedRole) && selectedClientIds.length === 0)
              }
            >
              {inviteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
