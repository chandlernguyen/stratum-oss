/**
 * Collaboration Hooks - Approvals, Comments, Tasks, and Notifications
 *
 * DATABASE-FIRST ARCHITECTURE: All operations use supabase.rpc() to call
 * PostgreSQL functions directly. No API layer for collaboration features.
 *
 * 🔒 SECURITY: RLS enforced via SECURITY DEFINER functions
 * ⚡ PERFORMANCE: Single database call per operation (no N+1 queries)
 * 🎯 CONSISTENCY: All business logic in database functions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useUserIdentity } from './useUserIdentity';
import { toast } from 'sonner';
import { useEffect } from 'react';

// ============================================================================
// Types - Matching database function returns
// ============================================================================

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'changes_requested';
export type ApprovalPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled';
export type TaskType = 'content_creation' | 'review' | 'analysis' | 'campaign_setup' | 'strategy' | 'other';
export type NotificationType =
  | 'approval_request' | 'approval_resolved' | 'approval_changes_requested'
  | 'comment' | 'mention' | 'comment_resolved'
  | 'task_assigned' | 'task_completed' | 'task_due_soon' | 'task_status_changed'
  | 'system';

// Approval Types
export interface ApprovalRequest {
  id: string;
  org_id: string;
  client_id?: string;
  resource_type: string;
  resource_id: string;
  status: ApprovalStatus;
  requested_by: string;
  assigned_to: string;
  title: string;
  description?: string;
  priority: ApprovalPriority;
  due_date?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  resolved_by?: string;
  resolution_note?: string;
  // Joined fields from database function
  requester_name?: string;
  assignee_name?: string;
  resolver_name?: string;
}

export interface CreateApprovalRequest {
  resource_type: string;
  resource_id: string;
  assigned_to: string;
  title: string;
  description?: string;
  priority?: ApprovalPriority;
  due_date?: string;
  client_id?: string;
}

export interface ResolveApprovalRequest {
  status: 'approved' | 'rejected' | 'changes_requested';
  resolution_note?: string;
}

// Comment Types
export interface Comment {
  id: string;
  org_id: string;
  client_id?: string;
  resource_type: string;
  resource_id: string;
  parent_id?: string;
  author_id: string;
  content: string;
  is_resolved: boolean;
  resolved_by?: string;
  resolved_at?: string;
  mentioned_users?: string[];
  created_at: string;
  updated_at: string;
  // Joined fields from database function
  author_name?: string;
  author_email?: string;
  replies?: Comment[];
}

export interface CreateComment {
  resource_type: string;
  resource_id: string;
  content: string;
  parent_id?: string;
  mentioned_users?: string[];
  client_id?: string;
}

export interface UpdateComment {
  content?: string;
  is_resolved?: boolean;
}

// Task Types
export interface Task {
  id: string;
  org_id: string;
  client_id?: string;
  title: string;
  description?: string;
  task_type: TaskType;
  status: TaskStatus;
  priority: ApprovalPriority;
  assigned_by: string;
  assigned_to: string;
  due_date?: string;
  related_resource_type?: string;
  related_resource_id?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  // Joined fields from database function
  assigner_name?: string;
  assignee_name?: string;
}

export interface CreateTask {
  title: string;
  description?: string;
  task_type?: TaskType;
  priority?: ApprovalPriority;
  assigned_to: string;
  due_date?: string;
  related_resource_type?: string;
  related_resource_id?: string;
  client_id?: string;
}

export interface UpdateTask {
  title?: string;
  description?: string;
  task_type?: TaskType;
  status?: TaskStatus;
  priority?: ApprovalPriority;
  assigned_to?: string;
  due_date?: string;
}

// Notification Types
export interface Notification {
  id: string;
  user_id: string;
  org_id: string;
  type: NotificationType;
  title: string;
  body?: string;
  resource_type?: string;
  resource_id?: string;
  action_url?: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationCount {
  unread_count: number;
  pending_approvals: number;
  pending_tasks: number;
}

// Team Member Type
export interface TeamMember {
  id: string;
  email: string;
  full_name?: string;
  role_name: string;
  client_id?: string;
}

// Approval History Type (for multi-round approval workflow)
export interface ApprovalHistoryItem {
  id: string;
  round_number: number;
  status: ApprovalStatus;
  requested_by: string;
  requester_name?: string;
  assigned_to: string;
  assignee_name?: string;
  resolved_by?: string;
  resolver_name?: string;
  resolution_note?: string;
  content_snapshot?: Record<string, unknown>;
  created_at: string;
  resolved_at?: string;
}

// ============================================================================
// Query Keys
// ============================================================================

export const collaborationKeys = {
  all: ['collaboration'] as const,
  approvals: () => [...collaborationKeys.all, 'approvals'] as const,
  approvalsList: (filters?: Record<string, unknown>) => [...collaborationKeys.approvals(), 'list', filters] as const,
  approval: (id: string) => [...collaborationKeys.approvals(), id] as const,
  approvalHistory: (resourceType: string, resourceId: string) =>
    [...collaborationKeys.approvals(), 'history', resourceType, resourceId] as const,
  approvedOutputs: (filters?: Record<string, unknown>) =>
    [...collaborationKeys.all, 'approved-outputs', filters] as const,
  comments: () => [...collaborationKeys.all, 'comments'] as const,
  commentsList: (resourceType: string, resourceId: string) =>
    [...collaborationKeys.comments(), 'list', resourceType, resourceId] as const,
  tasks: () => [...collaborationKeys.all, 'tasks'] as const,
  tasksList: (filters?: Record<string, unknown>) => [...collaborationKeys.tasks(), 'list', filters] as const,
  task: (id: string) => [...collaborationKeys.tasks(), id] as const,
  notifications: () => [...collaborationKeys.all, 'notifications'] as const,
  notificationsList: (filters?: Record<string, unknown>) => [...collaborationKeys.notifications(), 'list', filters] as const,
  notificationCount: () => [...collaborationKeys.notifications(), 'count'] as const,
  teamMembers: () => [...collaborationKeys.all, 'team-members'] as const,
};

// ============================================================================
// Approval Hooks (Database-First)
// ============================================================================

interface ApprovalListFilters {
  status?: ApprovalStatus;
  assigned_to_me?: boolean;
  requested_by_me?: boolean;
  resource_type?: string;
  resource_id?: string;
  client_id?: string;
  [key: string]: unknown;
}

export function useApprovals(filters?: ApprovalListFilters) {
  return useQuery({
    queryKey: collaborationKeys.approvalsList(filters),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_approval_requests', {
        p_status: filters?.status || null,
        p_assigned_to_me: filters?.assigned_to_me || false,
        p_requested_by_me: filters?.requested_by_me || false,
        p_resource_type: filters?.resource_type || null,
        p_resource_id: filters?.resource_id || null,
      });

      if (error) throw new Error(error.message);
      return data as { approvals: ApprovalRequest[]; total: number; pending_count: number };
    },
  });
}

export function useApproval(id: string) {
  return useQuery({
    queryKey: collaborationKeys.approval(id),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_approval_request', {
        p_approval_id: id,
      });

      if (error) throw new Error(error.message);
      return data as ApprovalRequest;
    },
    enabled: !!id,
  });
}

export function useCreateApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateApprovalRequest) => {
      const { data, error } = await supabase.rpc('create_approval_request', {
        p_resource_type: request.resource_type,
        p_resource_id: request.resource_id,
        p_assigned_to: request.assigned_to,
        p_title: request.title,
        p_description: request.description || null,
        p_priority: request.priority || 'normal',
        p_due_date: request.due_date || null,
        p_client_id: request.client_id || null,
      });

      if (error) throw new Error(error.message);
      return data as ApprovalRequest;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collaborationKeys.approvals() });
      toast.success('Approval request created');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create approval request');
    },
  });
}

export function useResolveApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...request }: ResolveApprovalRequest & { id: string }) => {
      const { data, error } = await supabase.rpc('resolve_approval_request', {
        p_approval_id: id,
        p_status: request.status,
        p_resolution_note: request.resolution_note || null,
      });

      if (error) throw new Error(error.message);
      return data as ApprovalRequest;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: collaborationKeys.approvals() });
      const statusText = data.status === 'approved' ? 'approved' :
                        data.status === 'rejected' ? 'rejected' : 'marked for changes';
      toast.success(`Request ${statusText}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to resolve approval');
    },
  });
}

/**
 * Hook to get approval status for a specific resource
 * Used by ApprovalStatusBanner to show inline approval UI
 */
export function useApprovalForResource(resourceType: string, resourceId: string) {
  const { data: identity } = useUserIdentity();
  const userId = identity?.user.id;

  return useQuery({
    queryKey: [...collaborationKeys.approvals(), 'resource', resourceType, resourceId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_approval_requests', {
        p_status: null,
        p_assigned_to_me: false,
        p_requested_by_me: false,
        p_resource_type: resourceType,
        p_resource_id: resourceId,
      });

      if (error) throw new Error(error.message);

      const result = data as { approvals: ApprovalRequest[] };
      const approval = result.approvals?.length > 0 ? result.approvals[0] : null;
      const isAssignedToMe = approval && userId ? approval.assigned_to === userId : false;
      const isRequestedByMe = approval && userId ? approval.requested_by === userId : false;

      return {
        approval,
        is_assigned_to_me: isAssignedToMe,
        is_requested_by_me: isRequestedByMe,
        has_approval: !!approval,
      };
    },
    enabled: !!resourceType && !!resourceId,
  });
}

/**
 * Hook to re-submit for approval after making changes (multi-round workflow)
 */
export function useResubmitApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      resourceId,
      assignedTo,
      title,
      description,
      priority,
    }: {
      resourceId: string;
      assignedTo: string;
      title?: string;
      description?: string;
      priority?: ApprovalPriority;
    }) => {
      const { data, error } = await supabase.rpc('resubmit_for_approval', {
        p_resource_id: resourceId,
        p_assigned_to: assignedTo,
        p_title: title || null,
        p_description: description || null,
        p_priority: priority || 'normal',
      });

      if (error) throw new Error(error.message);
      return data as string; // Returns new approval_id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collaborationKeys.approvals() });
      toast.success('Re-submitted for approval');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to re-submit for approval');
    },
  });
}

/**
 * Hook to get approval history for a resource (all rounds)
 */
export function useApprovalHistory(resourceType: string, resourceId: string) {
  return useQuery({
    queryKey: collaborationKeys.approvalHistory(resourceType, resourceId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_approval_history', {
        p_resource_type: resourceType,
        p_resource_id: resourceId,
      });

      if (error) throw new Error(error.message);
      const result = data as { history: ApprovalHistoryItem[] };
      return result.history || [];
    },
    enabled: !!resourceType && !!resourceId,
  });
}

/**
 * Hook to get approved outputs (source of truth)
 */
export function useApprovedOutputs(filters?: { clientId?: string; agentType?: string }) {
  return useQuery({
    queryKey: collaborationKeys.approvedOutputs(filters),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_approved_outputs', {
        p_client_id: filters?.clientId || null,
        p_agent_type: filters?.agentType || null,
        p_limit: 50,
        p_offset: 0,
      });

      if (error) throw new Error(error.message);
      return data as Array<{
        id: string;
        org_id: string;
        client_id?: string;
        agent_type: string;
        output_type: string;
        title: string;
        summary?: string;
        content: Record<string, unknown>;
        approved_at: string;
        approved_by: string;
        approver_name?: string;
        approval_round: number;
        created_at: string;
      }>;
    },
  });
}

// ============================================================================
// Comment Hooks (Database-First)
// ============================================================================

export function useComments(resourceType: string, resourceId: string) {
  return useQuery({
    queryKey: collaborationKeys.commentsList(resourceType, resourceId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_comments', {
        p_resource_type: resourceType,
        p_resource_id: resourceId,
      });

      if (error) throw new Error(error.message);
      return data as { comments: Comment[]; total: number };
    },
    enabled: !!resourceType && !!resourceId,
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (comment: CreateComment) => {
      // Note: p_client_id removed - database function determines org from auth.uid()
      const { data, error } = await supabase.rpc('create_comment', {
        p_resource_type: comment.resource_type,
        p_resource_id: comment.resource_id,
        p_content: comment.content,
        p_parent_id: comment.parent_id || null,
        p_mentioned_users: comment.mentioned_users || null,
      });

      if (error) throw new Error(error.message);
      return { ...data, resource_type: comment.resource_type, resource_id: comment.resource_id } as Comment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: collaborationKeys.commentsList(data.resource_type, data.resource_id),
      });
      toast.success('Comment added');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add comment');
    },
  });
}

export function useUpdateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, resourceType, resourceId, ...update }: UpdateComment & {
      id: string;
      resourceType: string;
      resourceId: string;
    }) => {
      const { data, error } = await supabase.rpc('update_comment', {
        p_comment_id: id,
        p_content: update.content || null,
        p_is_resolved: update.is_resolved ?? null,
      });

      if (error) throw new Error(error.message);
      return { ...data, resourceType, resourceId } as Comment & { resourceType: string; resourceId: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: collaborationKeys.commentsList(data.resourceType, data.resourceId),
      });
      toast.success(data.is_resolved ? 'Comment resolved' : 'Comment updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update comment');
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, resourceType, resourceId }: {
      id: string;
      resourceType: string;
      resourceId: string;
    }) => {
      const { error } = await supabase.rpc('delete_comment', {
        p_comment_id: id,
      });

      if (error) throw new Error(error.message);
      return { id, resourceType, resourceId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: collaborationKeys.commentsList(data.resourceType, data.resourceId),
      });
      toast.success('Comment deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete comment');
    },
  });
}

// ============================================================================
// Task Hooks (Database-First)
// ============================================================================

interface TaskListFilters {
  status?: TaskStatus;
  assigned_to_me?: boolean;
  assigned_by_me?: boolean;
  client_id?: string;
  [key: string]: unknown;
}

export function useTasks(filters?: TaskListFilters) {
  return useQuery({
    queryKey: collaborationKeys.tasksList(filters),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_tasks', {
        p_status: filters?.status || null,
        p_assigned_to_me: filters?.assigned_to_me || false,
        p_assigned_by_me: filters?.assigned_by_me || false,
      });

      if (error) throw new Error(error.message);
      return data as { tasks: Task[]; total: number; by_status: Record<string, number> };
    },
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: collaborationKeys.task(id),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_task', {
        p_task_id: id,
      });

      if (error) throw new Error(error.message);
      return data as Task;
    },
    enabled: !!id,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (task: CreateTask) => {
      const { data, error } = await supabase.rpc('create_task', {
        p_title: task.title,
        p_assigned_to: task.assigned_to,
        p_description: task.description || null,
        p_task_type: task.task_type || 'other',
        p_priority: task.priority || 'normal',
        p_due_date: task.due_date || null,
        p_related_resource_type: task.related_resource_type || null,
        p_related_resource_id: task.related_resource_id || null,
        p_client_id: task.client_id || null,
      });

      if (error) throw new Error(error.message);
      return data as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collaborationKeys.tasks() });
      toast.success('Task created');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create task');
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...update }: UpdateTask & { id: string }) => {
      const { data, error } = await supabase.rpc('update_task', {
        p_task_id: id,
        p_title: update.title || null,
        p_description: update.description || null,
        p_task_type: update.task_type || null,
        p_status: update.status || null,
        p_priority: update.priority || null,
        p_assigned_to: update.assigned_to || null,
        p_due_date: update.due_date || null,
      });

      if (error) throw new Error(error.message);
      return data as Task;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: collaborationKeys.tasks() });
      queryClient.invalidateQueries({ queryKey: collaborationKeys.task(data.id) });
      toast.success('Task updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update task');
    },
  });
}

// ============================================================================
// Notification Hooks (Database-First)
// ============================================================================

interface NotificationListFilters {
  unread_only?: boolean;
  type?: NotificationType;
  [key: string]: unknown;
}

export function useNotifications(filters?: NotificationListFilters) {
  return useQuery({
    queryKey: collaborationKeys.notificationsList(filters),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_notifications', {
        p_unread_only: filters?.unread_only || false,
        p_limit: 50,
      });

      if (error) throw new Error(error.message);
      return data as { notifications: Notification[]; total: number; unread_count: number };
    },
  });
}

export function useNotificationCount() {
  return useQuery({
    queryKey: collaborationKeys.notificationCount(),
    queryFn: async () => {
      // Use existing RPC functions for counts (functions use auth.uid() internally)
      const [unreadResult, approvalsResult, tasksResult] = await Promise.all([
        supabase.rpc('get_unread_notification_count'),
        supabase.rpc('get_pending_approvals_count'),
        supabase.rpc('get_pending_tasks_count'),
      ]);

      return {
        unread_count: unreadResult.data || 0,
        pending_approvals: approvalsResult.data || 0,
        pending_tasks: tasksResult.data || 0,
      } as NotificationCount;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationIds?: string[]) => {
      if (notificationIds && notificationIds.length > 0) {
        const { error } = await supabase.rpc('mark_notifications_read', {
          p_notification_ids: notificationIds,
        });
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.rpc('mark_all_notifications_read');
        if (error) throw new Error(error.message);
      }
      return notificationIds;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collaborationKeys.notifications() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to mark notifications as read');
    },
  });
}

// ============================================================================
// Team Members Hook (Database-First)
// ============================================================================

export function useTeamMembers(clientId?: string) {
  // For SME: returns all org members (clientId ignored)
  // For Agency: if clientId provided, filters to members with access to that client
  //             if no clientId, returns all org members
  return useQuery({
    queryKey: [...collaborationKeys.teamMembers(), clientId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_assignable_team_members', {
        p_client_id: clientId || null,
      });

      if (error) throw new Error(error.message);

      const result = data as { members: Array<{ id: string; full_name: string; email: string; role_name: string }> };
      return (result.members || []).map((m) => ({
        id: m.id,
        email: m.email,
        full_name: m.full_name,
        role_name: m.role_name || 'team_member',
      })) as TeamMember[];
    },
  });
}

// ============================================================================
// Real-time Subscription Hook
// ============================================================================

/**
 * Subscribe to real-time notification updates
 * Uses Supabase Realtime to push notifications immediately
 */
export function useNotificationSubscription() {
  const { data: identity } = useUserIdentity();
  const queryClient = useQueryClient();
  const userId = identity?.user.id;

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: collaborationKeys.notifications() });

          // Show toast for new notification
          const notification = payload.new as Notification;
          toast(notification.title, {
            description: notification.body,
            action: notification.action_url ? {
              label: 'View',
              onClick: () => window.location.href = notification.action_url!,
            } : undefined,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}

// ============================================================================
// Combined Hook for Header Badge
// ============================================================================

/**
 * Hook for notification bell in header
 * Combines count query with real-time subscription
 */
export function useNotificationBell() {
  const countQuery = useNotificationCount();
  useNotificationSubscription();

  return {
    unreadCount: countQuery.data?.unread_count ?? 0,
    pendingApprovals: countQuery.data?.pending_approvals ?? 0,
    pendingTasks: countQuery.data?.pending_tasks ?? 0,
    isLoading: countQuery.isLoading,
  };
}
