/**
 * CommentThread Component
 *
 * Threaded comments for resources (campaigns, outputs, etc.)
 * Supports @mentions, replies, and resolution.
 */

import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MessageSquare,
  Send,
  MoreVertical,
  Check,
  Trash,
  Reply,
  AtSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  useComments,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
  useTeamMembers,
  type Comment,
} from '@/hooks/data/useCollaboration';
import { useUserIdentity } from '@/hooks/data/useUserIdentity';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface CommentThreadProps {
  resourceType: string;
  resourceId: string;
  clientId?: string;
  className?: string;
  maxHeight?: string;
}

interface CommentItemProps {
  comment: Comment;
  resourceType: string;
  resourceId: string;
  currentUserId?: string;
  onReply: (parentId: string) => void;
  depth?: number;
  t: (key: string, options?: Record<string, unknown>) => string;
}

function CommentItem({
  comment,
  resourceType,
  resourceId,
  currentUserId,
  onReply,
  depth = 0,
  t,
}: CommentItemProps) {
  const updateComment = useUpdateComment();
  const deleteComment = useDeleteComment();

  const isOwner = comment.author_id === currentUserId;
  const initials = comment.author_name
    ? comment.author_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : comment.author_email?.charAt(0).toUpperCase() || '?';

  const handleResolve = () => {
    updateComment.mutate({
      id: comment.id,
      resourceType,
      resourceId,
      is_resolved: !comment.is_resolved,
    });
  };

  const handleDelete = () => {
    deleteComment.mutate({ id: comment.id, resourceType, resourceId });
  };

  return (
    <div className={cn('group', depth > 0 && 'ml-8 border-l-2 border-gray-100 dark:border-gray-800 pl-4')}>
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="text-xs bg-gradient-to-br from-slate-600 to-amber-600 text-white">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                {comment.author_name || comment.author_email}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
              </span>
              {comment.is_resolved && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {t('collaboration.comments.resolved')}
                </Badge>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onReply(comment.id)}>
                  <Reply className="h-4 w-4 mr-2" />
                  {t('collaboration.comments.reply')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleResolve}>
                  <Check className="h-4 w-4 mr-2" />
                  {comment.is_resolved ? t('collaboration.comments.unresolve') : t('collaboration.comments.markResolved')}
                </DropdownMenuItem>
                {isOwner && (
                  <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                    <Trash className="h-4 w-4 mr-2" />
                    {t('collaboration.comments.delete')}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <p
            className={cn(
              'text-sm text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap',
              comment.is_resolved && 'opacity-60'
            )}
          >
            {comment.content}
          </p>

          {/* Mentioned users */}
          {comment.mentioned_users && comment.mentioned_users.length > 0 && (
            <div className="flex items-center gap-1 mt-2">
              <AtSign className="h-3 w-3 text-gray-400" />
              <span className="text-xs text-gray-500">
                {t('collaboration.comments.mentioned', { count: comment.mentioned_users.length })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 space-y-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              resourceType={resourceType}
              resourceId={resourceId}
              currentUserId={currentUserId}
              onReply={onReply}
              depth={depth + 1}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MentionSelector({
  onSelect,
  clientId,
}: {
  onSelect: (userId: string, name: string) => void;
  clientId?: string;
}) {
  const { data: teamMembers } = useTeamMembers(clientId);

  return (
    <div className="max-h-48 overflow-y-auto">
      {teamMembers?.map((member) => (
        <button
          key={member.id}
          onClick={() => onSelect(member.id, member.full_name || member.email)}
          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 text-left text-sm"
        >
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-xs">
              {(member.full_name || member.email).charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span>{member.full_name || member.email}</span>
          <Badge variant="outline" className="ml-auto text-xs">
            {member.role_name.replace(/_/g, ' ')}
          </Badge>
        </button>
      ))}
    </div>
  );
}

export function CommentThread({
  resourceType,
  resourceId,
  clientId,
  className,
  maxHeight = '400px',
}: CommentThreadProps) {
  const { t } = useTranslation(['common']);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionedUsers, setMentionedUsers] = useState<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: identity } = useUserIdentity();
  const { data, isLoading } = useComments(resourceType, resourceId);
  const createComment = useCreateComment();

  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    await createComment.mutateAsync({
      resource_type: resourceType,
      resource_id: resourceId,
      content: newComment.trim(),
      parent_id: replyTo || undefined,
      mentioned_users: mentionedUsers.length > 0 ? mentionedUsers : undefined,
      client_id: clientId,
    });

    setNewComment('');
    setReplyTo(null);
    setMentionedUsers([]);
  };

  const handleMentionSelect = (userId: string, name: string) => {
    setMentionedUsers((prev) => [...prev, userId]);
    setNewComment((prev) => prev + `@${name} `);
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === '@') {
      setShowMentions(true);
    }
  };

  const handleReply = (parentId: string) => {
    setReplyTo(parentId);
    textareaRef.current?.focus();
  };

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        {[1, 2].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const comments = data?.comments || [];

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {comments.length > 0 ? t('collaboration.comments.titleWithCount', { count: data?.total }) : t('collaboration.comments.title')}
        </span>
      </div>

      {/* Comment List */}
      {comments.length > 0 ? (
        <div className="space-y-4 overflow-y-auto" style={{ maxHeight }}>
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              resourceType={resourceType}
              resourceId={resourceId}
              currentUserId={identity?.user.id}
              onReply={handleReply}
              t={t}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">{t('collaboration.comments.noComments')}</p>
          <p className="text-xs">{t('collaboration.comments.beFirstToComment')}</p>
        </div>
      )}

      {/* Reply indicator */}
      {replyTo && (
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-lg">
          <Reply className="h-3 w-3" />
          <span>{t('collaboration.comments.replyingToComment')}</span>
          <button
            onClick={() => setReplyTo(null)}
            className="ml-auto text-amber-600 hover:text-amber-700"
          >
            {t('collaboration.comments.cancelReply')}
          </button>
        </div>
      )}

      {/* New Comment Input */}
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="text-xs bg-gradient-to-br from-slate-600 to-amber-600 text-white">
            {identity?.user.full_name?.charAt(0).toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-2">
          <Popover open={showMentions} onOpenChange={setShowMentions}>
            <PopoverTrigger asChild>
              <div className="relative">
                <Textarea
                  ref={textareaRef}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t('collaboration.comments.inputPlaceholder')}
                  rows={2}
                  className="resize-none pr-10"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute right-1 bottom-1 h-7 w-7"
                  onClick={() => setShowMentions(true)}
                >
                  <AtSign className="h-4 w-4 text-gray-400" />
                </Button>
              </div>
            </PopoverTrigger>
            <PopoverContent align="start" className="p-0 w-64">
              <div className="p-2 border-b text-xs font-medium text-gray-500">
                {t('collaboration.comments.mentionSomeone')}
              </div>
              <MentionSelector onSelect={handleMentionSelect} clientId={clientId} />
            </PopoverContent>
          </Popover>

          <div className="flex items-center justify-between">
            {mentionedUsers.length > 0 && (
              <span className="text-xs text-gray-500">
                {t('collaboration.comments.mentioned', { count: mentionedUsers.length })}
              </span>
            )}
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!newComment.trim() || createComment.isPending}
              className="ml-auto gap-2"
            >
              <Send className="h-3 w-3" />
              {createComment.isPending ? t('collaboration.comments.sendingButton') : t('collaboration.comments.sendButton')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
