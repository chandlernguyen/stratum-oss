/**
 * ApprovalRequestButton Component
 *
 * Button to request approval for a resource (campaign, content, persona, etc.)
 * Opens a modal to select approver and add details.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Users, Calendar, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  useCreateApproval,
  useTeamMembers,
  type ApprovalPriority,
} from '@/hooks/data/useCollaboration';
import { useUserContextEnhanced } from '@/hooks/data/useUserContextEnhanced';
import { cn } from '@/lib/utils';

interface ApprovalRequestButtonProps {
  resourceType: string;
  resourceId: string;
  resourceTitle: string;
  clientId?: string;
  variant?: 'default' | 'ghost' | 'outline' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

const priorityColors: Record<ApprovalPriority, string> = {
  low: 'bg-slate-100 text-slate-700',
  normal: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-700',
  urgent: 'bg-red-100 text-red-700',
};

const priorityValues: ApprovalPriority[] = ['low', 'normal', 'high', 'urgent'];

export function ApprovalRequestButton({
  resourceType,
  resourceId,
  resourceTitle,
  clientId,
  variant = 'outline',
  size = 'sm',
  className,
}: ApprovalRequestButtonProps) {
  const { t } = useTranslation(['common']);
  const [open, setOpen] = useState(false);
  const [assignedTo, setAssignedTo] = useState('');
  const [title, setTitle] = useState(`Review: ${resourceTitle}`);
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<ApprovalPriority>('normal');
  const [dueDate, setDueDate] = useState('');

  const { data: teamMembers, isLoading: loadingTeam } = useTeamMembers(clientId);
  const createApproval = useCreateApproval();
  const { data: userContext, isLoading: loadingUser } = useUserContextEnhanced();

  // Check if user has permission to request approvals
  // Viewers (sme_viewer, agency_viewer) only have read permissions and cannot request approvals
  const canRequestApproval = userContext?.roles?.some(role => {
    const roleName = role.role_name.toLowerCase();
    // Exclude viewer roles that only have read access
    return !['sme_viewer', 'agency_viewer', 'agency_client_viewer'].includes(roleName);
  }) ?? false;

  // Don't render if user doesn't have permission
  if (!loadingUser && !canRequestApproval) {
    return null;
  }

  const handleSubmit = async () => {
    if (!assignedTo || !title) return;

    await createApproval.mutateAsync({
      resource_type: resourceType,
      resource_id: resourceId,
      assigned_to: assignedTo,
      title,
      description: description || undefined,
      priority,
      due_date: dueDate || undefined,
      client_id: clientId,
    });

    // Reset form and close
    setOpen(false);
    setAssignedTo('');
    setTitle(`Review: ${resourceTitle}`);
    setDescription('');
    setPriority('normal');
    setDueDate('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={cn('gap-2', className)}>
          <Shield className="h-4 w-4" />
          {t('collaboration.approvalRequest.buttonLabel')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-500" />
            {t('collaboration.approvalRequest.dialogTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('collaboration.approvalRequest.dialogDescription', { resourceType })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Resource being approved */}
          <div className="rounded-lg border bg-gray-50 dark:bg-gray-800 p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('collaboration.approvalRequest.resourceLabel')}</p>
            <p className="font-medium text-gray-900 dark:text-gray-100">{resourceTitle}</p>
            <Badge variant="outline" className="mt-1 text-xs">
              {resourceType}
            </Badge>
          </div>

          {/* Approver Selection */}
          <div className="space-y-2">
            <Label htmlFor="approver" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t('collaboration.approvalRequest.assignToLabel')}
            </Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger id="approver">
                {/* Custom display: show member name instead of ID */}
                <span className="text-gray-900 dark:text-gray-100">
                  {assignedTo && teamMembers
                    ? (teamMembers.find(m => m.id === assignedTo)?.full_name ||
                       teamMembers.find(m => m.id === assignedTo)?.email ||
                       (loadingTeam ? t('loading.default') : t('collaboration.approvalRequest.selectTeamMember')))
                    : (loadingTeam ? t('loading.default') : t('collaboration.approvalRequest.selectTeamMember'))}
                </span>
              </SelectTrigger>
              <SelectContent>
                {teamMembers?.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    <div className="flex items-center gap-2">
                      <span>{member.full_name || member.email}</span>
                      <Badge variant="secondary" className="text-xs">
                        {member.role_name.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">{t('collaboration.approvalRequest.titleLabel')}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('collaboration.approvalRequest.titlePlaceholder')}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{t('collaboration.approvalRequest.notesLabel')}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('collaboration.approvalRequest.notesPlaceholder')}
              rows={3}
            />
          </div>

          {/* Priority and Due Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority" className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {t('collaboration.approvalRequest.priorityLabel')}
              </Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as ApprovalPriority)}>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityValues.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      <Badge className={cn('text-xs', priorityColors[opt])}>{t(`approvals.priority.${opt}`)}</Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {t('collaboration.approvalRequest.dueDateLabel')}
              </Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t('buttons.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!assignedTo || !title || createApproval.isPending}
            className="gap-2"
          >
            {createApproval.isPending ? (
              t('collaboration.approvalRequest.sending')
            ) : (
              <>
                <Shield className="h-4 w-4" />
                {t('collaboration.approvalRequest.sendRequest')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
