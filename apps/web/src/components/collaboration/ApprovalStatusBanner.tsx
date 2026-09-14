/**
 * ApprovalStatusBanner Component
 *
 * Shows pending approval requests for the current output.
 * Allows reviewer to approve/reject/request changes inline.
 * Supports multi-round approval workflow with history tracking.
 * Following enterprise best practices: review content THEN approve.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Shield,
  CheckCircle,
  XCircle,
  MessageSquare,
  Clock,
  AlertCircle,
  History,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  useApprovalForResource,
  useResolveApproval,
  useApprovalHistory,
  useResubmitApproval,
  useTeamMembers,
  type ApprovalStatus,
  type ApprovalHistoryItem,
} from '@/hooks/data/useCollaboration';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';

interface ApprovalStatusBannerProps {
  resourceType: string;
  resourceId: string;
  className?: string;
  /** Called when user can re-submit */
  onResubmit?: () => void;
}

export function ApprovalStatusBanner({
  resourceType,
  resourceId,
  className,
  onResubmit,
}: ApprovalStatusBannerProps) {
  const { t } = useTranslation(['common']);
  const { data: approvalData, isLoading } = useApprovalForResource(resourceType, resourceId);
  const { data: historyData } = useApprovalHistory(resourceType, resourceId);
  const resolveApproval = useResolveApproval();
  const resubmitApproval = useResubmitApproval();
  const { data: teamData } = useTeamMembers();

  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [showResubmitDialog, setShowResubmitDialog] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [resolveAction, setResolveAction] = useState<'approved' | 'rejected' | 'changes_requested'>('approved');
  const [note, setNote] = useState('');
  const [resubmitAssignee, setResubmitAssignee] = useState('');
  const [resubmitNote, setResubmitNote] = useState('');

  // Don't render if no approval or loading
  if (isLoading || !approvalData?.approval) {
    return null;
  }

  const approval = approvalData.approval;
  const isAssignedToMe = approvalData.is_assigned_to_me;
  const isRequestedByMe = approvalData.is_requested_by_me;
  const isPending = approval.status === 'pending';
  const isChangesRequested = approval.status === 'changes_requested';
  const historyItems = historyData || [];
  const currentRound = historyItems.length > 0 ? Math.max(...historyItems.map(h => h.round_number)) : 1;
  const maxRounds = 5;
  const canResubmit = isChangesRequested && isRequestedByMe && currentRound < maxRounds;

  const statusConfig: Record<ApprovalStatus, { icon: React.ReactNode; color: string; bgColor: string; labelKey: string }> = {
    pending: { icon: <Clock className="h-4 w-4" />, color: 'text-amber-600', bgColor: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800', labelKey: 'collaboration.approvalStatus.pendingReview' },
    approved: { icon: <CheckCircle className="h-4 w-4" />, color: 'text-brand-success', bgColor: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800', labelKey: 'collaboration.approvalStatus.approved' },
    rejected: { icon: <XCircle className="h-4 w-4" />, color: 'text-brand-error', bgColor: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800', labelKey: 'collaboration.approvalStatus.rejected' },
    changes_requested: { icon: <MessageSquare className="h-4 w-4" />, color: 'text-brand-warning', bgColor: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800', labelKey: 'collaboration.approvalStatus.changesRequested' },
  };

  const openResolveDialog = (action: 'approved' | 'rejected' | 'changes_requested') => {
    setResolveAction(action);
    setNote('');
    setShowResolveDialog(true);
  };

  const handleResolve = async () => {
    await resolveApproval.mutateAsync({
      id: approval.id,
      status: resolveAction,
      resolution_note: note || undefined,
    });
    setShowResolveDialog(false);
    setNote('');
  };

  const handleResubmit = async () => {
    await resubmitApproval.mutateAsync({
      resourceId,
      assignedTo: resubmitAssignee,
      description: resubmitNote || undefined,
    });
    setShowResubmitDialog(false);
    setResubmitNote('');
    setResubmitAssignee('');
    onResubmit?.();
  };

  // History Timeline Component
  const HistoryTimeline = () => {
    if (historyItems.length === 0) return null;

    return (
      <Collapsible open={showHistory} onOpenChange={setShowHistory}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between mt-2 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            <span className="flex items-center gap-1">
              <History className="h-3 w-3" />
              {t('collaboration.approvalStatus.approvalHistory')} ({t('collaboration.approvalStatus.roundCount', { count: historyItems.length })})
            </span>
            {showHistory ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-3 space-y-2 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
            {historyItems.map((item: ApprovalHistoryItem, index: number) => {
              const config = statusConfig[item.status];
              const isLatest = index === historyItems.length - 1;
              return (
                <div
                  key={item.id}
                  className={cn(
                    'relative pl-4 pb-2',
                    isLatest && 'pb-0'
                  )}
                >
                  {/* Timeline dot */}
                  <div className={cn(
                    'absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 bg-white dark:bg-gray-900 flex items-center justify-center',
                    item.status === 'approved' && 'border-green-500',
                    item.status === 'rejected' && 'border-red-500',
                    item.status === 'changes_requested' && 'border-orange-500',
                    item.status === 'pending' && 'border-amber-500'
                  )}>
                    <div className={cn(
                      'h-2 w-2 rounded-full',
                      item.status === 'approved' && 'bg-green-500',
                      item.status === 'rejected' && 'bg-red-500',
                      item.status === 'changes_requested' && 'bg-orange-500',
                      item.status === 'pending' && 'bg-amber-500'
                    )} />
                  </div>

                  <div className="text-xs">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', config.color)}>
                        {t('collaboration.approvalStatus.round', { number: item.round_number })}
                      </Badge>
                      <span className={cn('font-medium', config.color)}>{t(config.labelKey)}</span>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                      {item.requester_name} → {item.assignee_name}
                    </p>
                    {item.resolution_note && (
                      <p className="text-gray-600 dark:text-gray-300 mt-1 italic bg-gray-50 dark:bg-gray-800/50 px-2 py-1 rounded text-[11px]">
                        "{item.resolution_note}"
                      </p>
                    )}
                    <p className="text-gray-400 text-[10px] mt-1">
                      {item.resolved_at
                        ? format(new Date(item.resolved_at), 'MMM d, yyyy h:mm a')
                        : format(new Date(item.created_at), 'MMM d, yyyy h:mm a')
                      }
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  // If approved or rejected (non-pending, non-changes_requested), show status indicator
  if (!isPending && !isChangesRequested) {
    const config = statusConfig[approval.status];

    return (
      <div className={cn(
        'px-4 py-3 rounded-lg border',
        config.bgColor,
        className
      )}>
        <div className="flex items-center gap-3">
          <div className={config.color}>{config.icon}</div>
          <div className="flex-1">
            <p className={cn('text-sm font-medium', config.color)}>
              {t(config.labelKey)}
            </p>
            {approval.resolution_note && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                "{approval.resolution_note}"
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {approval.resolved_at && (
                <>{t('collaboration.approvalStatus.resolved', { time: formatDistanceToNow(new Date(approval.resolved_at), { addSuffix: true }) })}</>
              )}
            </p>
          </div>
        </div>
        <HistoryTimeline />
      </div>
    );
  }

  // If changes_requested, show re-submit option
  if (isChangesRequested) {
    const config = statusConfig.changes_requested;

    return (
      <>
        <div className={cn(
          'px-4 py-3 rounded-lg border',
          config.bgColor,
          className
        )}>
          <div className="flex items-start gap-3">
            <div className={cn('mt-0.5', config.color)}>{config.icon}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className={cn('text-sm font-semibold', config.color)}>
                  {t(config.labelKey)}
                </p>
                <Badge variant="outline" className="text-xs">
                  {t('collaboration.approvalStatus.roundOf', { current: currentRound, max: maxRounds })}
                </Badge>
              </div>
              {approval.resolution_note && (
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 p-2 bg-white/50 dark:bg-gray-800/50 rounded border border-orange-100 dark:border-orange-900">
                  <span className="font-medium">{t('collaboration.approvalStatus.feedback')}: </span>"{approval.resolution_note}"
                </p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {t('collaboration.approvalStatus.from', { name: approval.resolver_name || approval.assignee_name || 'reviewer' })} &middot;{' '}
                {approval.resolved_at && formatDistanceToNow(new Date(approval.resolved_at), { addSuffix: true })}
              </p>

              {/* Re-submit action */}
              {canResubmit && (
                <div className="mt-3">
                  <Button
                    size="sm"
                    className="bg-brand-gold hover:bg-brand-gold/90 text-white"
                    onClick={() => {
                      setResubmitAssignee(approval.assigned_to);
                      setShowResubmitDialog(true);
                    }}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    {t('collaboration.approvalStatus.resubmitButton')}
                  </Button>
                  <p className="text-xs text-gray-500 mt-1">
                    {t('collaboration.approvalStatus.resubmitInstructions')}
                  </p>
                </div>
              )}
              {!canResubmit && currentRound >= maxRounds && (
                <p className="text-xs text-red-500 mt-2">
                  {t('collaboration.approvalStatus.maxRoundsReached', { count: maxRounds })}
                </p>
              )}
            </div>
          </div>
          <HistoryTimeline />
        </div>

        {/* Re-submit Dialog */}
        <Dialog open={showResubmitDialog} onOpenChange={setShowResubmitDialog}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-brand-gold" />
                {t('collaboration.resubmitDialog.title')}
              </DialogTitle>
              <DialogDescription>
                {t('collaboration.resubmitDialog.description', { nextRound: currentRound + 1, maxRounds })}
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <div>
                <Label htmlFor="resubmit-assignee">{t('collaboration.resubmitDialog.assignToLabel')}</Label>
                {/* Custom select to show user names instead of UUIDs */}
                {(() => {
                  const selectedMember = teamData?.find((m) => m.id === resubmitAssignee);
                  const displayValue = selectedMember
                    ? `${selectedMember.full_name || selectedMember.email} (${selectedMember.role_name || 'Team Member'})`
                    : null;

                  return (
                    <Select value={resubmitAssignee} onValueChange={setResubmitAssignee}>
                      <SelectTrigger className="mt-1">
                        {displayValue ? (
                          <span>{displayValue}</span>
                        ) : (
                          <SelectValue placeholder={t('collaboration.resubmitDialog.selectReviewer')} />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        {teamData?.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            <span className="flex items-center gap-2">
                              <span>{member.full_name || member.email}</span>
                              <span className="text-gray-500 text-xs">({member.role_name || 'Team Member'})</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  );
                })()}
              </div>

              <div>
                <Label htmlFor="resubmit-note">{t('collaboration.resubmitDialog.whatChangedLabel')}</Label>
                <Textarea
                  id="resubmit-note"
                  value={resubmitNote}
                  onChange={(e) => setResubmitNote(e.target.value)}
                  placeholder={t('collaboration.resubmitDialog.whatChangedPlaceholder')}
                  rows={3}
                  className="mt-1"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowResubmitDialog(false)}>
                {t('buttons.cancel')}
              </Button>
              <Button
                onClick={handleResubmit}
                disabled={resubmitApproval.isPending || !resubmitAssignee}
                className="bg-brand-gold hover:bg-brand-gold/90"
              >
                {resubmitApproval.isPending ? t('collaboration.resubmitDialog.submitting') : t('collaboration.resubmitDialog.submitButton')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // If pending and NOT assigned to current user, show waiting status
  if (!isAssignedToMe) {
    return (
      <div className={cn(
        'px-4 py-3 rounded-lg border bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
        className
      )}>
        <div className="flex items-center gap-3">
          <Clock className="h-4 w-4 text-amber-600" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                {t('collaboration.approvalStatus.awaitingApproval')}
              </p>
              {currentRound > 1 && (
                <Badge variant="outline" className="text-xs">
                  {t('collaboration.approvalStatus.round', { number: currentRound })}
                </Badge>
              )}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
              {t('collaboration.approvalStatus.assignedTo', { name: approval.assignee_name || 'team member' })} &middot;{' '}
              {formatDistanceToNow(new Date(approval.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>
        <HistoryTimeline />
      </div>
    );
  }

  // If pending and assigned to current user, show action banner
  return (
    <>
      <div className={cn(
        'px-4 py-3 rounded-lg border bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
        className
      )}>
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-amber-600 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                {t('collaboration.approvalStatus.yourReviewRequired')}
              </p>
              {currentRound > 1 && (
                <Badge variant="outline" className="text-xs">
                  {t('collaboration.approvalStatus.round', { number: currentRound })}
                </Badge>
              )}
              {approval.priority === 'high' || approval.priority === 'urgent' ? (
                <Badge className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {t(`approvals.priority.${approval.priority}`)}
                </Badge>
              ) : null}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {t('collaboration.approvalStatus.from', { name: approval.requester_name || 'team member' })} &middot;{' '}
              {formatDistanceToNow(new Date(approval.created_at), { addSuffix: true })}
            </p>
            {approval.description && (
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 p-2 bg-white/50 dark:bg-gray-800/50 rounded border border-amber-100 dark:border-amber-900">
                "{approval.description}"
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 mt-3">
              <Button
                size="sm"
                className="bg-brand-success hover:bg-brand-success/90 text-white"
                onClick={() => openResolveDialog('approved')}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                {t('collaboration.approvalStatus.approveButton')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-brand-warning border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                onClick={() => openResolveDialog('changes_requested')}
              >
                <MessageSquare className="h-4 w-4 mr-1" />
                {t('collaboration.approvalStatus.requestChangesButton')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-brand-error border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                onClick={() => openResolveDialog('rejected')}
              >
                <XCircle className="h-4 w-4 mr-1" />
                {t('collaboration.approvalStatus.rejectButton')}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {t('collaboration.approvalStatus.reviewInstructions')}
            </p>
          </div>
        </div>
        <HistoryTimeline />
      </div>

      {/* Resolution Dialog */}
      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {resolveAction === 'approved' && <CheckCircle className="h-5 w-5 text-brand-success" />}
              {resolveAction === 'rejected' && <XCircle className="h-5 w-5 text-brand-error" />}
              {resolveAction === 'changes_requested' && <MessageSquare className="h-5 w-5 text-brand-warning" />}
              {resolveAction === 'approved' && t('collaboration.resolveDialog.approveTitle')}
              {resolveAction === 'rejected' && t('collaboration.resolveDialog.rejectTitle')}
              {resolveAction === 'changes_requested' && t('collaboration.resolveDialog.requestChangesTitle')}
            </DialogTitle>
            <DialogDescription>
              {resolveAction === 'approved' && t('collaboration.resolveDialog.approveDescription')}
              {resolveAction === 'rejected' && t('collaboration.resolveDialog.rejectDescription')}
              {resolveAction === 'changes_requested' && t('collaboration.resolveDialog.requestChangesDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="resolution-note">
              {resolveAction === 'approved' ? t('collaboration.resolveDialog.noteOptional') : t('collaboration.resolveDialog.feedbackRequired')}
            </Label>
            <Textarea
              id="resolution-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                resolveAction === 'approved'
                  ? t('collaboration.resolveDialog.approvePlaceholder')
                  : resolveAction === 'changes_requested'
                  ? t('collaboration.resolveDialog.requestChangesPlaceholder')
                  : t('collaboration.resolveDialog.rejectPlaceholder')
              }
              rows={3}
              className="mt-2"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResolveDialog(false)}>
              {t('buttons.cancel')}
            </Button>
            <Button
              onClick={handleResolve}
              disabled={resolveApproval.isPending || (resolveAction !== 'approved' && !note.trim())}
              className={cn(
                resolveAction === 'approved' && 'bg-brand-success hover:bg-brand-success/90',
                resolveAction === 'rejected' && 'bg-brand-error hover:bg-brand-error/90',
                resolveAction === 'changes_requested' && 'bg-brand-warning hover:bg-brand-warning/90'
              )}
            >
              {resolveApproval.isPending ? t('collaboration.resolveDialog.submitting') : (
                <>
                  {resolveAction === 'approved' && t('collaboration.approvalStatus.approveButton')}
                  {resolveAction === 'rejected' && t('collaboration.approvalStatus.rejectButton')}
                  {resolveAction === 'changes_requested' && t('collaboration.approvalStatus.requestChangesButton')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
