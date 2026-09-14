import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, UserPlus, Mail, Calendar, Shield, Trash2, Loader2, MoreVertical, UserCog, Building2 } from 'lucide-react'
import { toast } from 'sonner'
import { InviteTeamMemberModal } from '@/components/team/InviteTeamMemberModal'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useRoles, getTeamRoles, getRoleIdByName } from '@/hooks/useRoles'
import { useUserContextEnhanced } from '@/hooks/data/useUserContextEnhanced'
import { useActiveClients } from '@/hooks/data/useClients'
import {
  useTeamMembers,
  useRevokeInvitation,
  useUpdateMemberRole,
  useRemoveMember,
  useUpdateMemberClients,
  type TeamMember,
  type TeamInvitation,
} from '@/hooks/data/useTeamMembers'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { getIntlLocale } from '@/lib/locales'

export function TeamManagement() {
  const { t, i18n } = useTranslation('team')
  const queryClient = useQueryClient()
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [roleChangeDialogOpen, setRoleChangeDialogOpen] = useState(false)
  const [clientAccessDialogOpen, setClientAccessDialogOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [newRoleName, setNewRoleName] = useState<string>('')
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([])
  const [allClients, setAllClients] = useState(true)
  const { openDialog, dialogProps } = useConfirmDialog()

  // Get org type to determine which roles to show
  const { data: userContext } = useUserContextEnhanced()
  const orgType = userContext?.org_type || 'SME'
  const orgId = userContext?.org_id
  const isAgency = orgType === 'AGENCY'

  // Fetch roles dynamically from database (no hardcoded UUIDs)
  const { data: allRoles, isLoading: rolesLoading } = useRoles(orgType)
  const teamRoles = allRoles ? getTeamRoles(allRoles, orgType) : []

  // Fetch clients for agency organizations
  const { data: clients, isLoading: clientsLoading } = useActiveClients()

  // Database-First: Fetch team members via Supabase RPC
  const { data: teamData, isLoading } = useTeamMembers()

  // Database-First Mutations via Supabase RPC
  const revokeMutation = useRevokeInvitation()
  const updateRoleMutation = useUpdateMemberRole()
  const removeMemberMutation = useRemoveMember()
  const updateClientsMutation = useUpdateMemberClients()

  const handleRevokeInvitation = async (invitation: TeamInvitation) => {
    const confirmed = await openDialog({
      title: t('dialogs.revoke.title'),
      description: t('dialogs.revoke.description', { email: invitation.email }),
      confirmText: t('dialogs.revoke.confirm'),
      variant: 'delete',
    })

    if (confirmed) {
      revokeMutation.mutate(invitation.id)
    }
  }

  const handleChangeRole = (member: TeamMember) => {
    setSelectedMember(member)
    setNewRoleName('')
    setRoleChangeDialogOpen(true)
  }

  const handleRoleChangeSubmit = () => {
    if (!selectedMember || !newRoleName) {
      toast.error(t('validation.selectRole'))
      return
    }

    if (!allRoles) {
      toast.error(t('validation.rolesNotLoaded'))
      return
    }

    const roleId = getRoleIdByName(allRoles, newRoleName)
    if (!roleId) {
      toast.error(t('validation.invalidRole'))
      return
    }

    updateRoleMutation.mutate(
      { targetUserId: selectedMember.user_id, newRoleId: roleId },
      {
        onSuccess: () => {
          setRoleChangeDialogOpen(false)
          setSelectedMember(null)
          setNewRoleName('')
        }
      }
    )
  }

  const handleRemoveMember = async (member: TeamMember) => {
    const confirmed = await openDialog({
      title: t('dialogs.remove.title'),
      description: t('dialogs.remove.description', { name: member.full_name, email: member.email }),
      confirmText: t('dialogs.remove.confirm'),
      variant: 'delete',
    })

    if (confirmed) {
      removeMemberMutation.mutate(member.user_id)
    }
  }

  const handleManageClientAccess = (member: TeamMember) => {
    setSelectedMember(member)
    // Initialize from member's current state
    setAllClients(member.is_all_clients)
    setSelectedClientIds(member.client_ids || [])
    setClientAccessDialogOpen(true)
  }

  const handleClientAccessSubmit = () => {
    if (!selectedMember) {
      toast.error(t('validation.noMemberSelected'))
      return
    }

    if (!allClients && selectedClientIds.length === 0) {
      toast.error(t('validation.selectClientOrAll'))
      return
    }

    updateClientsMutation.mutate(
      {
        targetUserId: selectedMember.user_id,
        clientIds: selectedClientIds,
        allClients: allClients,
      },
      {
        onSuccess: () => {
          setClientAccessDialogOpen(false)
          setSelectedMember(null)
          setSelectedClientIds([])
          setAllClients(true)
        },
      }
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(getIntlLocale(i18n.language), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (isLoading || rolesLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="container max-w-7xl mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('management.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('management.subtitle')}
          </p>
        </div>
        <Button onClick={() => setIsInviteModalOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          {t('management.inviteButton')}
        </Button>
      </div>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('members.count', { count: teamData?.total_members || 0 })}
          </CardTitle>
          <CardDescription>
            {t('members.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {teamData?.members && teamData.members.length > 0 ? (
            <>
              {/* Mobile Card Layout */}
              <div className="md:hidden space-y-3">
                {teamData.members.map((member) => (
                  <div key={member.user_id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 min-w-0 flex-1">
                        <p className="font-medium truncate">{member.full_name}</p>
                        <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0" aria-label={t('actions.moreOptions')}>
                            <MoreVertical className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleChangeRole(member)}>
                            <UserCog className="h-4 w-4 mr-2" aria-hidden="true" />
                            {t('actions.changeRole')}
                          </DropdownMenuItem>
                          {isAgency && (
                            <DropdownMenuItem onClick={() => handleManageClientAccess(member)}>
                              <Building2 className="h-4 w-4 mr-2" aria-hidden="true" />
                              {t('actions.manageClientAccess')}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleRemoveMember(member)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
                            {t('actions.removeMember')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        <Shield className="h-3 w-3 mr-1" />
                        {member.role_name.replace('agency_', '').replace('sme_', '').replace(/_/g, ' ')}
                      </Badge>
                      {isAgency && (
                        <Badge
                          variant={member.is_all_clients ? 'default' : 'outline'}
                          className="text-xs"
                        >
                          <Building2 className="h-3 w-3 mr-1" />
                          {member.is_all_clients
                            ? t('clientAccess.allClients')
                            : t('clientAccess.clientCount', { count: member.client_count })}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {t('members.joined', { date: formatDate(member.joined_at) })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table Layout */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('table.name')}</TableHead>
                      <TableHead>{t('table.email')}</TableHead>
                      <TableHead>{t('table.role')}</TableHead>
                      {isAgency && <TableHead>{t('table.clientAccess')}</TableHead>}
                      <TableHead>{t('table.joined')}</TableHead>
                      <TableHead className="text-right">{t('table.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamData.members.map((member) => (
                      <TableRow key={member.user_id}>
                        <TableCell className="font-medium">{member.full_name}</TableCell>
                        <TableCell>{member.email}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            <Shield className="h-3 w-3 mr-1" />
                            {member.role_name}
                          </Badge>
                        </TableCell>
                        {isAgency && (
                          <TableCell>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant={member.is_all_clients ? 'default' : 'outline'}
                                    className="cursor-help"
                                  >
                                    <Building2 className="h-3 w-3 mr-1" />
                                    {member.is_all_clients
                                      ? t('clientAccess.allClients')
                                      : t('clientAccess.clientCount', { count: member.client_count })}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {member.is_all_clients ? (
                                    <p>{t('clientAccess.allClientsTooltip')}</p>
                                  ) : member.client_names && member.client_names.length > 0 ? (
                                    <div>
                                      <p className="font-medium mb-1">{t('clientAccess.assignedClients')}</p>
                                      <ul className="list-disc list-inside text-xs">
                                        {member.client_names.slice(0, 5).map((name, i) => (
                                          <li key={i}>{name}</li>
                                        ))}
                                        {member.client_names.length > 5 && (
                                          <li>{t('clientAccess.andMore', { count: member.client_names.length - 5 })}</li>
                                        )}
                                      </ul>
                                    </div>
                                  ) : (
                                    <p>{t('clientAccess.noClientsAssigned')}</p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                        )}
                        <TableCell className="text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(member.joined_at)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" aria-label={t('actions.moreOptions')}>
                                <MoreVertical className="h-4 w-4" aria-hidden="true" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleChangeRole(member)}>
                                <UserCog className="h-4 w-4 mr-2" aria-hidden="true" />
                                {t('actions.changeRole')}
                              </DropdownMenuItem>
                              {isAgency && (
                                <DropdownMenuItem onClick={() => handleManageClientAccess(member)}>
                                  <Building2 className="h-4 w-4 mr-2" aria-hidden="true" />
                                  {t('actions.manageClientAccess')}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleRemoveMember(member)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
                                {t('actions.removeMember')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {t('members.empty')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {t('invitations.count', { count: teamData?.total_pending || 0 })}
          </CardTitle>
          <CardDescription>
            {t('invitations.subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {teamData?.pending_invitations && teamData.pending_invitations.length > 0 ? (
            <>
              {/* Mobile Card Layout */}
              <div className="md:hidden space-y-3">
                {teamData.pending_invitations.map((invitation) => (
                  <div key={invitation.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 min-w-0 flex-1">
                        <p className="font-medium truncate">{invitation.email}</p>
                        <p className="text-sm text-muted-foreground">{t('invitations.invitedBy', { name: invitation.inviter_name })}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 flex-shrink-0"
                        onClick={() => handleRevokeInvitation(invitation)}
                        disabled={revokeMutation.isPending}
                        aria-label={t('invitations.revoke')}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {invitation.role_name.replace('agency_', '').replace('sme_', '').replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" aria-hidden="true" />
                      {t('invitations.expires', { date: formatDate(invitation.expires_at) })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table Layout */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('table.email')}</TableHead>
                      <TableHead>{t('table.role')}</TableHead>
                      <TableHead>{t('table.invitedBy')}</TableHead>
                      <TableHead>{t('table.expires')}</TableHead>
                      <TableHead className="text-right">{t('table.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamData.pending_invitations.map((invitation) => (
                      <TableRow key={invitation.id}>
                        <TableCell className="font-medium">{invitation.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {invitation.role_name}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {invitation.inviter_name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(invitation.expires_at)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRevokeInvitation(invitation)}
                            disabled={revokeMutation.isPending}
                            aria-label={t('invitations.revoke')}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {t('invitations.empty')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Modal */}
      <InviteTeamMemberModal
        open={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['team-members', orgId] })
          setIsInviteModalOpen(false)
        }}
      />

      {/* Role Change Dialog */}
      <Dialog open={roleChangeDialogOpen} onOpenChange={setRoleChangeDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              {t('dialogs.changeRole.title')}
            </DialogTitle>
            <DialogDescription>
              {t('dialogs.changeRole.description', { name: selectedMember?.full_name, email: selectedMember?.email })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-role">{t('dialogs.changeRole.newRole')}</Label>
              <Select
                value={newRoleName}
                onValueChange={setNewRoleName}
                disabled={updateRoleMutation.isPending}
              >
                <SelectTrigger id="new-role">
                  <SelectValue placeholder={t('dialogs.changeRole.selectRole')} />
                </SelectTrigger>
                <SelectContent>
                  {teamRoles.map((role) => (
                    <SelectItem key={role.id} value={role.name}>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{role.name.replace('agency_', '').replace('sme_', '').replace(/_/g, ' ')}</div>
                          <div className="text-xs text-muted-foreground">{role.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRoleChangeDialogOpen(false)}
                disabled={updateRoleMutation.isPending}
              >
                {t('dialogs.changeRole.cancel')}
              </Button>
              <Button
                onClick={handleRoleChangeSubmit}
                disabled={updateRoleMutation.isPending || !newRoleName}
              >
                {updateRoleMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t('dialogs.changeRole.submitting')}
                  </>
                ) : (
                  <>
                    <UserCog className="h-4 w-4 mr-2" />
                    {t('dialogs.changeRole.submit')}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Client Access Dialog - Agency only */}
      {isAgency && (
        <Dialog open={clientAccessDialogOpen} onOpenChange={setClientAccessDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {t('dialogs.clientAccess.title')}
              </DialogTitle>
              <DialogDescription>
                {t('dialogs.clientAccess.description', { name: selectedMember?.full_name, email: selectedMember?.email })}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* All Clients Toggle */}
              <div className="flex items-center space-x-2 p-3 rounded-md border bg-muted/30">
                <Checkbox
                  id="edit-all-clients"
                  checked={allClients}
                  onCheckedChange={(checked) => {
                    setAllClients(checked === true)
                    if (checked) {
                      setSelectedClientIds([])
                    }
                  }}
                  disabled={updateClientsMutation.isPending}
                />
                <div className="flex flex-col">
                  <label htmlFor="edit-all-clients" className="text-sm font-medium cursor-pointer">
                    {t('dialogs.clientAccess.allClients')}
                  </label>
                  <span className="text-xs text-muted-foreground">
                    {t('dialogs.clientAccess.allClientsDescription')}
                  </span>
                </div>
              </div>

              {/* Specific Clients Selection */}
              {!allClients && (
                <div className="space-y-2">
                  <Label>{t('dialogs.clientAccess.selectClients')}</Label>
                  {clientsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground p-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('dialogs.clientAccess.loadingClients')}
                    </div>
                  ) : clients && clients.length > 0 ? (
                    <div className="max-h-[200px] overflow-y-auto space-y-2 border rounded-md p-2">
                      {clients.map((client) => (
                        <div key={client.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`edit-client-${client.id}`}
                            checked={selectedClientIds.includes(client.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedClientIds([...selectedClientIds, client.id])
                              } else {
                                setSelectedClientIds(selectedClientIds.filter(id => id !== client.id))
                              }
                            }}
                            disabled={updateClientsMutation.isPending}
                          />
                          <label
                            htmlFor={`edit-client-${client.id}`}
                            className="text-sm cursor-pointer flex-1"
                          >
                            {client.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground p-2 border rounded-md">
                      {t('dialogs.clientAccess.noClients')}
                    </div>
                  )}
                  {!allClients && selectedClientIds.length === 0 && (
                    <p className="text-xs text-brand-warning">
                      {t('dialogs.clientAccess.selectAtLeastOne')}
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setClientAccessDialogOpen(false)}
                  disabled={updateClientsMutation.isPending}
                >
                  {t('dialogs.clientAccess.cancel')}
                </Button>
                <Button
                  onClick={handleClientAccessSubmit}
                  disabled={updateClientsMutation.isPending || (!allClients && selectedClientIds.length === 0)}
                >
                  {updateClientsMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('dialogs.clientAccess.submitting')}
                    </>
                  ) : (
                    <>
                      <Building2 className="h-4 w-4 mr-2" />
                      {t('dialogs.clientAccess.submit')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog {...dialogProps} />
    </div>
  )
}
