import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useUserIdentity } from './useUserIdentity';
import { toast } from 'sonner';

// Types matching database function output
export interface TeamMember {
  user_id: string;
  email: string;
  full_name: string;
  role_id: string;
  role_name: string;
  joined_at: string;
  last_active: string | null;
  // Client assignment fields (from migration 304)
  is_all_clients: boolean;
  client_count: number;
  client_names: string[];
  client_ids: string[];
}

export interface TeamInvitation {
  id: string;
  email: string;
  role_name: string;
  inviter_name: string;
  expires_at: string;
  created_at: string;
}

export interface TeamData {
  members: TeamMember[];
  pending_invitations: TeamInvitation[];
  total_members: number;
  total_pending: number;
}

/**
 * Database-First Hook: Fetch team members and pending invitations
 * Uses supabase.rpc('get_team_members_with_invitations') directly
 *
 * Query key includes orgId for cache isolation between organizations
 */
export function useTeamMembers() {
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useQuery<TeamData>({
    queryKey: ['team-members', orgId],
    queryFn: async (): Promise<TeamData> => {
      if (!orgId) throw new Error('Organization ID not available');

      const { data, error } = await supabase.rpc('get_team_members_with_invitations', {
        p_org_id: orgId
      });

      if (error) {
        console.error('[useTeamMembers] Error fetching team members:', error);
        throw new Error('Failed to fetch team members');
      }

      if (!data) {
        return {
          members: [],
          pending_invitations: [],
          total_members: 0,
          total_pending: 0
        };
      }

      // Database function returns JSONB with exact structure we need
      return data as TeamData;
    },
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000, // 2 minutes - team data changes occasionally
  });
}

/**
 * Database-First Hook: Revoke a team invitation
 * Uses supabase.rpc('revoke_team_invitation')
 */
export function useRevokeInvitation() {
  const queryClient = useQueryClient();
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;
  const userId = identity?.user?.id;

  return useMutation({
    mutationFn: async (invitationId: string) => {
      if (!userId) throw new Error('User not authenticated');

      const { data, error } = await supabase.rpc('revoke_team_invitation', {
        p_invitation_id: invitationId,
        p_user_id: userId
      });

      if (error) {
        console.error('[useRevokeInvitation] Error:', error);
        throw new Error(error.message || 'Failed to revoke invitation');
      }

      // Handle JSONB response
      const result = data as { success: boolean; message?: string; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to revoke invitation');
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members', orgId] });
      toast.success('Invitation revoked successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Database-First Hook: Update team member role
 * Uses supabase.rpc('update_team_member_role')
 */
export function useUpdateMemberRole() {
  const queryClient = useQueryClient();
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;
  const userId = identity?.user?.id;

  return useMutation({
    mutationFn: async ({ targetUserId, newRoleId }: { targetUserId: string; newRoleId: string }) => {
      if (!userId || !orgId) throw new Error('User not authenticated');

      const { data, error } = await supabase.rpc('update_team_member_role', {
        p_user_id: userId,
        p_target_user_id: targetUserId,
        p_new_role_id: newRoleId,
        p_org_id: orgId
      });

      if (error) {
        console.error('[useUpdateMemberRole] Error:', error);
        throw new Error(error.message || 'Failed to update role');
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['team-members', orgId] });
      // Also invalidate user context in case we changed our own role
      queryClient.invalidateQueries({ queryKey: ['user-context-enhanced'] });
      queryClient.invalidateQueries({ queryKey: ['user-identity'] });
      toast.success(`Role updated to ${data.new_role_name}`, {
        description: `${data.email}'s role has been changed from ${data.previous_role_name} to ${data.new_role_name}`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to update role', {
        description: error.message,
      });
    },
  });
}

/**
 * Database-First Hook: Remove team member
 * Uses supabase.rpc('remove_team_member')
 */
export function useRemoveMember() {
  const queryClient = useQueryClient();
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;
  const userId = identity?.user?.id;

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!userId || !orgId) throw new Error('User not authenticated');

      const { data, error } = await supabase.rpc('remove_team_member', {
        p_user_id: userId,
        p_target_user_id: targetUserId,
        p_org_id: orgId
      });

      if (error) {
        console.error('[useRemoveMember] Error:', error);
        throw new Error(error.message || 'Failed to remove member');
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['team-members', orgId] });
      toast.success('Member removed successfully', {
        description: `${data.full_name} (${data.email}) has been removed from your organization`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to remove member', {
        description: error.message,
      });
    },
  });
}

/**
 * Database-First Hook: Update team member client assignments
 * Uses supabase.rpc('assign_clients_to_user')
 */
export function useUpdateMemberClients() {
  const queryClient = useQueryClient();
  const { data: identity } = useUserIdentity();
  const orgId = identity?.organization?.id;

  return useMutation({
    mutationFn: async ({
      targetUserId,
      clientIds,
      allClients
    }: {
      targetUserId: string;
      clientIds: string[];
      allClients: boolean;
    }) => {
      const { data, error } = await supabase.rpc('assign_clients_to_user', {
        p_target_user_id: targetUserId,
        p_client_ids: allClients ? [] : clientIds,
        p_all_clients: allClients
      });

      if (error) {
        console.error('[useUpdateMemberClients] Error:', error);
        throw new Error(error.message || 'Failed to update client assignments');
      }

      return data as { success: boolean; user_id: string; assigned_count: number; all_clients: boolean };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['team-members', orgId] });
      const message = data.all_clients
        ? 'Access updated to all clients'
        : `Assigned to ${data.assigned_count} client${data.assigned_count !== 1 ? 's' : ''}`;
      toast.success('Client access updated', { description: message });
    },
    onError: (error: Error) => {
      toast.error('Failed to update client access', {
        description: error.message,
      });
    },
  });
}
